-- medications table
CREATE TABLE medications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id          UUID NOT NULL REFERENCES clinics(id)  ON DELETE CASCADE,
  patient_id         UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  dosage             TEXT NOT NULL,
  frequency          TEXT NOT NULL,
  route              TEXT NOT NULL DEFAULT 'oral',
  prescribing_doctor TEXT NOT NULL DEFAULT '',
  start_date         DATE NOT NULL,
  end_date           DATE,
  instructions       TEXT,
  status             TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'discontinued')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- medication_logs table
CREATE TABLE medication_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     UUID NOT NULL REFERENCES clinics(id)      ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES medications(id)  ON DELETE CASCADE,
  patient_id    UUID NOT NULL REFERENCES patients(id)     ON DELETE CASCADE,
  date          DATE NOT NULL,
  time          TEXT NOT NULL,
  given_by      TEXT NOT NULL,
  notes         TEXT,
  refused       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE medications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;

-- medications: all clinic members read; admin/manager write; admin delete
CREATE POLICY "Clinic members read medications"
  ON medications FOR SELECT TO authenticated
  USING (clinic_id = get_my_clinic_id());

CREATE POLICY "Admins managers insert medications"
  ON medications FOR INSERT TO authenticated
  WITH CHECK (clinic_id = get_my_clinic_id() AND get_my_role() IN ('admin','manager'));

CREATE POLICY "Admins managers update medications"
  ON medications FOR UPDATE TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() IN ('admin','manager'));

CREATE POLICY "Admins delete medications"
  ON medications FOR DELETE TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() = 'admin');

-- medication_logs: all clinic members read/insert/update; admin delete
CREATE POLICY "Clinic members read medication_logs"
  ON medication_logs FOR SELECT TO authenticated
  USING (clinic_id = get_my_clinic_id());

CREATE POLICY "Clinic members insert medication_logs"
  ON medication_logs FOR INSERT TO authenticated
  WITH CHECK (clinic_id = get_my_clinic_id());

CREATE POLICY "Clinic members update medication_logs"
  ON medication_logs FOR UPDATE TO authenticated
  USING (clinic_id = get_my_clinic_id());

CREATE POLICY "Admins delete medication_logs"
  ON medication_logs FOR DELETE TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() = 'admin');
