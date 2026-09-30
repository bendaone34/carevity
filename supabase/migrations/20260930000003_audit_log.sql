-- ─────────────────────────────────────────────────────────────────────────────
-- Audit trail (audit finding C3)
--
-- Before this there was no audit trail: a care note, incident or medication
-- could be edited or deleted with no record of what it said before or who
-- changed it. CQC Regulation 17 expects records that are contemporaneous and
-- attributable; UK GDPR accountability expects changes to be traceable.
--
-- Design:
--   * Complete   — one generic AFTER trigger on every clinical and
--                  access-control table records INSERT/UPDATE/DELETE with the
--                  full before/after row, the changed fields and the actor.
--   * Append-only — API roles have no write privileges and no write policies;
--                  a trigger rejects UPDATE/DELETE/TRUNCATE for every role,
--                  including service_role.
--   * Tamper-evident — entries form a per-clinic hash chain;
--                  verify_audit_chain() reports the first broken entry.
--                  A superuser can still drop the triggers (DDL), which a
--                  chain alone cannot prevent — ship periodic chain-head
--                  hashes off-site if stronger guarantees are needed.
--   * No FKs     — entries outlive deleted records and clinics.
--
-- Reads (who viewed what) are not captured: Postgres has no SELECT triggers.
-- Idempotent — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. Table ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id             BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  chain_key      UUID        NOT NULL,   -- clinic_id, or the nil UUID for rows with no clinic
  chain_seq      BIGINT      NOT NULL,
  clinic_id      UUID,
  patient_id     UUID,
  table_name     TEXT        NOT NULL,
  row_id         UUID,
  action         TEXT        NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  actor_id       UUID,                   -- null = system (trigger, job, service role)
  actor_name     TEXT,                   -- name at the time, survives staff deletion
  old_data       JSONB,
  new_data       JSONB,
  changed_fields TEXT[],
  at             TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  prev_hash      TEXT,
  row_hash       TEXT        NOT NULL,
  UNIQUE (chain_key, chain_seq)
);

CREATE INDEX IF NOT EXISTS audit_log_clinic_at         ON audit_log (clinic_id, at DESC);
CREATE INDEX IF NOT EXISTS audit_log_clinic_patient_at ON audit_log (clinic_id, patient_id, at DESC);
CREATE INDEX IF NOT EXISTS audit_log_row               ON audit_log (table_name, row_id);


-- ── 2. Read access: admins and managers of the clinic only ─────────────────
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins managers read audit log" ON audit_log;
CREATE POLICY "Admins managers read audit log"
  ON audit_log FOR SELECT TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() IN ('admin', 'manager'));

-- Entries are written only by the audit trigger (SECURITY DEFINER)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON audit_log FROM PUBLIC, anon, authenticated;


-- ── 3. Hash chain ──────────────────────────────────────────────────────────
-- jsonb::text is canonical (keys sorted, whitespace normalised), and the
-- timestamp is hashed as epoch microseconds so session TimeZone can't change it.
CREATE OR REPLACE FUNCTION audit_entry_hash(p_prev TEXT, e audit_log)
RETURNS TEXT LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT encode(sha256(convert_to(concat_ws('|',
    COALESCE(p_prev, ''),
    e.chain_key, e.chain_seq,
    COALESCE(e.clinic_id::text, ''), COALESCE(e.patient_id::text, ''),
    e.table_name, COALESCE(e.row_id::text, ''), e.action,
    COALESCE(e.actor_id::text, ''), COALESCE(e.actor_name, ''),
    COALESCE(e.old_data::text, ''), COALESCE(e.new_data::text, ''),
    COALESCE(array_to_string(e.changed_fields, ','), ''),
    (EXTRACT(EPOCH FROM e.at) * 1000000)::BIGINT
  ), 'UTF8')), 'hex');
$$;

CREATE OR REPLACE FUNCTION audit_log_chain()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_seq  BIGINT;
  v_hash TEXT;
BEGIN
  NEW.chain_key := COALESCE(NEW.clinic_id, '00000000-0000-0000-0000-000000000000'::uuid);
  NEW.at        := clock_timestamp();

  -- Serialise appends per clinic; held until commit so the next writer sees
  -- this row as the chain head.
  PERFORM pg_advisory_xact_lock(hashtextextended('audit_log:' || NEW.chain_key::text, 0));

  SELECT chain_seq, row_hash INTO v_seq, v_hash
  FROM   audit_log
  WHERE  chain_key = NEW.chain_key
  ORDER  BY chain_seq DESC
  LIMIT  1;

  NEW.chain_seq := COALESCE(v_seq, 0) + 1;
  NEW.prev_hash := v_hash;
  NEW.row_hash  := audit_entry_hash(NEW.prev_hash, NEW);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_log_chain ON audit_log;
CREATE TRIGGER audit_log_chain
  BEFORE INSERT ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_chain();

-- Returns the chain_seq of the first entry that fails verification, or NULL
-- if the chain is intact. Runs with the caller's RLS, so admins and managers
-- can verify their own clinic only.
CREATE OR REPLACE FUNCTION verify_audit_chain(p_clinic_id UUID)
RETURNS BIGINT LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  r          audit_log%ROWTYPE;
  v_prev     TEXT   := NULL;
  v_expected BIGINT := 1;
BEGIN
  FOR r IN SELECT * FROM audit_log WHERE chain_key = p_clinic_id ORDER BY chain_seq LOOP
    IF r.chain_seq <> v_expected                     -- entry removed
       OR r.prev_hash IS DISTINCT FROM v_prev        -- chain re-linked
       OR r.row_hash <> audit_entry_hash(r.prev_hash, r) THEN  -- content altered
      RETURN r.chain_seq;
    END IF;
    v_prev     := r.row_hash;
    v_expected := v_expected + 1;
  END LOOP;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION verify_audit_chain(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION verify_audit_chain(UUID) TO authenticated;


-- ── 4. Append-only for every role ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION audit_log_immutable()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only (% blocked)', TG_OP USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS audit_log_no_update_delete ON audit_log;
CREATE TRIGGER audit_log_no_update_delete
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

DROP TRIGGER IF EXISTS audit_log_no_truncate ON audit_log;
CREATE TRIGGER audit_log_no_truncate
  BEFORE TRUNCATE ON audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_immutable();


-- ── 5. Generic row-change trigger ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION audit_row_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old        JSONB;
  v_new        JSONB;
  v_rec        JSONB;
  v_changed    TEXT[];
  v_clinic     UUID;
  v_patient    UUID;
  v_actor      UUID := auth.uid();
  v_actor_name TEXT;
BEGIN
  IF TG_OP <> 'INSERT' THEN v_old := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN v_new := to_jsonb(NEW); END IF;
  v_rec := COALESCE(v_new, v_old);

  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(n.key ORDER BY n.key) INTO v_changed
    FROM   jsonb_each(v_new) n
    WHERE  n.value IS DISTINCT FROM v_old -> n.key;
    IF v_changed IS NULL THEN
      RETURN NULL;  -- no-op update, nothing to record
    END IF;
  END IF;

  v_clinic := CASE WHEN TG_TABLE_NAME = 'clinics'
                   THEN (v_rec ->> 'id')::uuid
                   ELSE (v_rec ->> 'clinic_id')::uuid END;

  v_patient := CASE WHEN TG_TABLE_NAME = 'patients'
                    THEN (v_rec ->> 'id')::uuid
                    ELSE (v_rec ->> 'patient_id')::uuid END;
  -- Tables that reach the resident through a parent row
  IF v_patient IS NULL AND TG_TABLE_NAME = 'care_plan_tasks' THEN
    SELECT patient_id INTO v_patient FROM care_plans WHERE id = (v_rec ->> 'care_plan_id')::uuid;
  ELSIF v_patient IS NULL AND TG_TABLE_NAME = 'alert_acknowledgements' THEN
    SELECT patient_id INTO v_patient FROM wellbeing_alerts WHERE id = (v_rec ->> 'alert_id')::uuid;
  END IF;

  -- Alerts are raised by the threshold trigger, not by the carer whose
  -- note happened to fire it.
  IF TG_TABLE_NAME = 'wellbeing_alerts' AND TG_OP = 'INSERT' THEN
    v_actor := NULL;
  END IF;

  IF v_actor IS NOT NULL THEN
    SELECT COALESCE(NULLIF(full_name, ''), email) INTO v_actor_name
    FROM   profiles WHERE id = v_actor;
  END IF;

  INSERT INTO audit_log (clinic_id, patient_id, table_name, row_id, action,
                         actor_id, actor_name, old_data, new_data, changed_fields,
                         chain_key, chain_seq, row_hash)
  VALUES (v_clinic, v_patient, TG_TABLE_NAME, (v_rec ->> 'id')::uuid, TG_OP,
          v_actor, v_actor_name, v_old, v_new, v_changed,
          -- placeholders; set by audit_log_chain
          '00000000-0000-0000-0000-000000000000', 0, '');

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION audit_row_change() FROM PUBLIC, anon, authenticated;


-- ── 6. Attach to every clinical and access-control table ───────────────────
DO $$
DECLARE
  audited_tables TEXT[] := ARRAY[
    -- clinical records
    'patients', 'medical_records', 'care_plans', 'care_plan_tasks',
    'daily_care_records', 'medications', 'medication_logs', 'incidents',
    'wellbeing_alerts', 'alert_acknowledgements', 'appointments',
    -- who can see what
    'profiles', 'staff_patient_assignments', 'family_members', 'clinics',
    'clinic_join_links', 'visit_requests'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY audited_tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE WARNING 'audit: table % does not exist, skipped', t;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS audit_row_change ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER audit_row_change AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION audit_row_change()', t);
  END LOOP;
END;
$$;
