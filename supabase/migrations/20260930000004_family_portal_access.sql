-- ─────────────────────────────────────────────────────────────────────────────
-- Family portal access (audit findings H2, H3, L1)
--
-- H2  RLS is row-level, so the family SELECT policies on patients,
--     daily_care_records, medications and incidents exposed every column:
--     incidents.internal_notes, witnesses (often other residents),
--     reported_by, follow_up_notes; the full patient record. The portal UI
--     selected safe columns, but `select('*')` from devtools did not.
--     → Direct policies dropped. Family data is served by SECURITY DEFINER
--       RPCs with explicit column lists. The portal never used patients or
--       medications, so those grants are simply removed.
-- H3  The family message INSERT policy checked only family_member_id, so a
--     relative could post into another clinic's inbox (arbitrary clinic_id /
--     patient_id), pose as "Dr Patel" (sender_name) or pre-mark read_at.
--     Staff had FOR ALL, so they could edit or delete messages, or post as
--     the family.
--     → A trigger derives thread and sender from the family_members row and
--       the caller; messages are immutable apart from read_at.
--     Also: family visit inserts did not constrain status, so a relative
--     could insert an already-approved visit.
-- L1  Deactivated relatives kept read access to messages and visits.
-- Idempotent — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. Remove direct family access to clinical tables ──────────────────────
DROP POLICY IF EXISTS "family_view_own_patient"          ON patients;
DROP POLICY IF EXISTS "family_view_patient_care_records" ON daily_care_records;
DROP POLICY IF EXISTS "family_view_patient_medications"  ON medications;
DROP POLICY IF EXISTS "family_view_patient_incidents"    ON incidents;


-- ── 2. Curated read RPCs ───────────────────────────────────────────────────
-- Return nothing unless the caller is an active family member of the resident.

CREATE OR REPLACE FUNCTION family_care_notes(p_patient_id UUID, p_limit INT DEFAULT 90)
RETURNS TABLE (
  id          UUID,
  date        DATE,
  carer_name  TEXT,
  mood_score  INT,
  mood_notes  TEXT,
  activity    TEXT,
  notes       TEXT,
  meals       JSONB,
  created_at  TIMESTAMPTZ
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.id, d.date, d.carer_name, d.mood_score, d.mood_notes,
         d.activity, d.notes, d.meals, d.created_at
  FROM   daily_care_records d
  WHERE  d.patient_id = p_patient_id
    AND  d.family_visible
    AND  EXISTS (
           SELECT 1 FROM family_members fm
           WHERE  fm.user_id    = auth.uid()
             AND  fm.patient_id = p_patient_id
             AND  fm.clinic_id  = d.clinic_id
             AND  fm.status = 'active'
         )
  ORDER  BY d.date DESC, d.created_at DESC
  LIMIT  LEAST(GREATEST(COALESCE(p_limit, 90), 1), 366);
$$;

-- Low/medium severity only: critical incidents are communicated by phone.
-- Deliberately excludes internal_notes, witnesses, follow_up_notes,
-- reported_by and immediate_action.
CREATE OR REPLACE FUNCTION family_incidents(p_patient_id UUID)
RETURNS TABLE (
  id            UUID,
  date          DATE,
  time          TEXT,
  incident_type TEXT,
  severity      TEXT,
  description   TEXT,
  status        TEXT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id, i.date, i.time, i.incident_type, i.severity, i.description, i.status
  FROM   incidents i
  WHERE  i.patient_id = p_patient_id
    AND  i.severity IN ('low', 'medium')
    AND  EXISTS (
           SELECT 1 FROM family_members fm
           WHERE  fm.user_id    = auth.uid()
             AND  fm.patient_id = p_patient_id
             AND  fm.clinic_id  = i.clinic_id
             AND  fm.status = 'active'
         )
  ORDER  BY i.date DESC, i.time DESC;
$$;

REVOKE EXECUTE ON FUNCTION family_care_notes(UUID, INT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION family_incidents(UUID)       FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION family_care_notes(UUID, INT) TO authenticated;
GRANT  EXECUTE ON FUNCTION family_incidents(UUID)       TO authenticated;


-- ── 3. Messages: server-derived thread and sender ──────────────────────────
-- SECURITY INVOKER: the caller must be able to see the family_members row
-- (family: their own; staff: their clinic's), which is itself the check.
CREATE OR REPLACE FUNCTION stamp_family_message()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_member family_members%ROWTYPE;
  v_name   TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;  -- service role
  END IF;

  SELECT * INTO v_member FROM family_members WHERE id = NEW.family_member_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown message thread' USING ERRCODE = '42501';
  END IF;

  -- The thread always belongs to the family member's resident and clinic
  NEW.clinic_id  := v_member.clinic_id;
  NEW.patient_id := v_member.patient_id;
  NEW.sender_id  := auth.uid();
  NEW.read_at    := NULL;

  IF NEW.sender_type = 'family' THEN
    IF v_member.user_id IS DISTINCT FROM auth.uid() OR v_member.status <> 'active' THEN
      RAISE EXCEPTION 'You can only send messages in your own thread' USING ERRCODE = '42501';
    END IF;
    NEW.sender_name := v_member.name;
  ELSE
    SELECT COALESCE(NULLIF(full_name, ''), email) INTO v_name
    FROM   profiles WHERE id = auth.uid();
    NEW.sender_name := COALESCE(v_name, 'Care team');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_family_message_insert ON family_messages;
CREATE TRIGGER before_family_message_insert
  BEFORE INSERT ON family_messages
  FOR EACH ROW EXECUTE FUNCTION stamp_family_message();

-- Messages are a record of communication: only read_at may change
CREATE OR REPLACE FUNCTION family_message_only_read_at_changes()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (to_jsonb(NEW) - 'read_at') IS DISTINCT FROM (to_jsonb(OLD) - 'read_at') THEN
    RAISE EXCEPTION 'Messages cannot be edited' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_family_message_update ON family_messages;
CREATE TRIGGER before_family_message_update
  BEFORE UPDATE ON family_messages
  FOR EACH ROW EXECUTE FUNCTION family_message_only_read_at_changes();

-- Staff: read, send, mark read. No FOR ALL, no DELETE.
DROP POLICY IF EXISTS "clinic_staff_messages"          ON family_messages;
DROP POLICY IF EXISTS "clinic_staff_read_messages"     ON family_messages;
DROP POLICY IF EXISTS "clinic_staff_send_messages"     ON family_messages;
DROP POLICY IF EXISTS "clinic_staff_mark_messages_read" ON family_messages;

CREATE POLICY "clinic_staff_read_messages"
  ON family_messages FOR SELECT TO authenticated
  USING (clinic_id = get_my_clinic_id());

CREATE POLICY "clinic_staff_send_messages"
  ON family_messages FOR INSERT TO authenticated
  WITH CHECK (clinic_id = get_my_clinic_id() AND sender_type = 'staff');

CREATE POLICY "clinic_staff_mark_messages_read"
  ON family_messages FOR UPDATE TO authenticated
  USING      (clinic_id = get_my_clinic_id())
  WITH CHECK (clinic_id = get_my_clinic_id());

-- Family: own thread, active membership only
DROP POLICY IF EXISTS "family_read_own_messages"   ON family_messages;
DROP POLICY IF EXISTS "family_insert_own_messages" ON family_messages;

CREATE POLICY "family_read_own_messages"
  ON family_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE  fm.id      = family_messages.family_member_id
        AND  fm.user_id = auth.uid()
        AND  fm.status = 'active'
    )
  );

CREATE POLICY "family_insert_own_messages"
  ON family_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_type = 'family'
    AND EXISTS (
      SELECT 1 FROM family_members fm
      WHERE  fm.id         = family_messages.family_member_id
        AND  fm.user_id    = auth.uid()
        AND  fm.status = 'active'
        AND  fm.clinic_id  = family_messages.clinic_id
        AND  fm.patient_id = family_messages.patient_id
    )
  );


-- ── 4. Visit requests ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "family_view_own_visit_requests" ON visit_requests;
DROP POLICY IF EXISTS "family_insert_visit_requests"   ON visit_requests;

CREATE POLICY "family_view_own_visit_requests"
  ON visit_requests FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE  fm.id      = visit_requests.family_member_id
        AND  fm.user_id = auth.uid()
        AND  fm.status = 'active'
    )
  );

-- One membership row must match all three ids, and a request starts pending
CREATE POLICY "family_insert_visit_requests"
  ON visit_requests FOR INSERT TO authenticated
  WITH CHECK (
    status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND staff_notes IS NULL
    AND EXISTS (
      SELECT 1 FROM family_members fm
      WHERE  fm.id         = visit_requests.family_member_id
        AND  fm.user_id    = auth.uid()
        AND  fm.status = 'active'
        AND  fm.clinic_id  = visit_requests.clinic_id
        AND  fm.patient_id = visit_requests.patient_id
    )
  );


-- ── 5. Audit messages too (communication with families is evidence) ───────
DO $$
BEGIN
  IF to_regprocedure('audit_row_change()') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS audit_row_change ON family_messages;
    CREATE TRIGGER audit_row_change
      AFTER INSERT OR UPDATE OR DELETE ON family_messages
      FOR EACH ROW EXECUTE FUNCTION audit_row_change();
  END IF;
END;
$$;
