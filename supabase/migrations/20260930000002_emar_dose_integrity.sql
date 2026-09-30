-- ─────────────────────────────────────────────────────────────────────────────
-- eMAR dose integrity (audit findings C4, H6, M6)
--
--  * Dose times: medications get prescribed HH:MM dose_times, and each log
--    records the scheduled_time slot it covers. Previously one log per day
--    marked every dose as given, so the 2nd/3rd doses of a TDS medicine
--    were missed silently.
--  * Accountability: given_by was free text anyone could type. A trigger now
--    stamps given_by_id/given_by from the signed-in user, and the insert
--    policy requires it.
--  * Duplicates: the old UNIQUE(medication_id, patient_id, date, time) missed
--    double-taps across a minute boundary, yet blocked a refusal followed by
--    an administration in the same minute. Replaced by one administered dose
--    per slot plus an idempotency key per log attempt.
--  * Logs stay immutable: corrections are new rows.
-- Idempotent — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. Dose times and slots ────────────────────────────────────────────────
ALTER TABLE medications
  ADD COLUMN IF NOT EXISTS dose_times TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE medications DROP CONSTRAINT IF EXISTS medications_dose_times_format;
ALTER TABLE medications
  ADD CONSTRAINT medications_dose_times_format CHECK (
    cardinality(dose_times) = 0
    OR array_to_string(dose_times, ',') ~ '^([01][0-9]|2[0-3]):[0-5][0-9](,([01][0-9]|2[0-3]):[0-5][0-9])*$'
  );

ALTER TABLE medication_logs
  ADD COLUMN IF NOT EXISTS scheduled_time    TEXT,
  ADD COLUMN IF NOT EXISTS given_by_id       UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS client_request_id UUID;

ALTER TABLE medication_logs DROP CONSTRAINT IF EXISTS medication_logs_scheduled_time_format;
ALTER TABLE medication_logs
  ADD CONSTRAINT medication_logs_scheduled_time_format
  CHECK (scheduled_time IS NULL OR scheduled_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');


-- ── 2. Duplicate prevention ────────────────────────────────────────────────
ALTER TABLE medication_logs DROP CONSTRAINT IF EXISTS medication_logs_no_duplicate_dose;

-- A retried request (same key) cannot create a second row
CREATE UNIQUE INDEX IF NOT EXISTS medication_logs_client_request_id_key
  ON medication_logs (client_request_id);

-- At most one administered dose per scheduled slot. A refusal does not block
-- a later administration in the same slot. Legacy rows (no slot) are exempt.
CREATE UNIQUE INDEX IF NOT EXISTS medication_logs_one_given_per_slot
  ON medication_logs (medication_id, date, scheduled_time)
  WHERE NOT refused AND scheduled_time IS NOT NULL;


-- ── 3. Record who actually gave the dose ───────────────────────────────────
-- SECURITY INVOKER: reads the caller's own profile, visible under RLS.
CREATE OR REPLACE FUNCTION stamp_medication_log_author()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_name TEXT;
BEGIN
  -- Service-role contexts (seed scripts, server jobs) have no auth.uid() and
  -- already bypass RLS; keep what they supplied.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(full_name, ''), email) INTO v_name
  FROM   profiles WHERE id = auth.uid();

  NEW.given_by_id := auth.uid();
  NEW.given_by    := COALESCE(v_name, 'Unknown staff member');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_medication_log_insert ON medication_logs;
CREATE TRIGGER before_medication_log_insert
  BEFORE INSERT ON medication_logs
  FOR EACH ROW EXECUTE FUNCTION stamp_medication_log_author();


-- ── 4. Policies: attributable, consistent, immutable ───────────────────────
DROP POLICY IF EXISTS "Clinic members insert medication_logs" ON medication_logs;
CREATE POLICY "Clinic members insert medication_logs"
  ON medication_logs FOR INSERT TO authenticated
  WITH CHECK (
    clinic_id   = get_my_clinic_id()
    AND given_by_id = auth.uid()
    -- The medication must be an active prescription for this patient in this
    -- clinic. medications RLS also applies here, so carers can only log for
    -- residents whose medications they can see.
    AND EXISTS (
      SELECT 1 FROM medications m
      WHERE  m.id         = medication_logs.medication_id
        AND  m.patient_id = medication_logs.patient_id
        AND  m.clinic_id  = medication_logs.clinic_id
        AND  m.status     = 'active'
    )
  );

-- Logs are never edited; corrections are new rows
DROP POLICY IF EXISTS "Clinic members update medication_logs" ON medication_logs;
