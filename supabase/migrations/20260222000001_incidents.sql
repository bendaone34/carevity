CREATE TABLE incidents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id        UUID NOT NULL REFERENCES clinics(id)  ON DELETE CASCADE,
  patient_id       UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  reported_by      TEXT NOT NULL,
  reported_by_id   UUID NOT NULL REFERENCES auth.users(id),
  date             DATE NOT NULL,
  time             TEXT NOT NULL,
  incident_type    TEXT NOT NULL
                     CHECK (incident_type IN ('fall','medication_error','safeguarding','behavioural','accident','near_miss','other')),
  location         TEXT,
  description      TEXT NOT NULL,
  immediate_action TEXT NOT NULL,
  witnesses        TEXT,
  severity         TEXT NOT NULL DEFAULT 'low'
                     CHECK (severity IN ('low','medium','high','critical')),
  follow_up        BOOLEAN NOT NULL DEFAULT FALSE,
  follow_up_notes  TEXT,
  status           TEXT NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open','under_review','resolved')),
  internal_notes   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Admins/managers see all clinic incidents
CREATE POLICY "Admins managers read all incidents"
  ON incidents FOR SELECT TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() IN ('admin','manager'));

-- Carers see only incidents they reported
CREATE POLICY "Carers read own incidents"
  ON incidents FOR SELECT TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() = 'carer' AND reported_by_id = auth.uid());

-- All clinic members can log incidents
CREATE POLICY "Clinic members insert incidents"
  ON incidents FOR INSERT TO authenticated
  WITH CHECK (clinic_id = get_my_clinic_id());

-- Only admins/managers can update status/notes
CREATE POLICY "Admins managers update incidents"
  ON incidents FOR UPDATE TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() IN ('admin','manager'));

-- Admins only can delete
CREATE POLICY "Admins delete incidents"
  ON incidents FOR DELETE TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() = 'admin');
