CREATE TABLE shifts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID NOT NULL REFERENCES clinics(id)  ON DELETE CASCADE,
  staff_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  start_time  TEXT NOT NULL,
  end_time    TEXT NOT NULL,
  shift_type  TEXT NOT NULL CHECK (shift_type IN ('morning','afternoon','night')),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shift_residents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id   UUID NOT NULL REFERENCES shifts(id)   ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id  UUID NOT NULL REFERENCES clinics(id)  ON DELETE CASCADE,
  UNIQUE(shift_id, patient_id)
);

ALTER TABLE shifts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_residents ENABLE ROW LEVEL SECURITY;

-- shifts: admins/managers see all; carers see only their own
CREATE POLICY "Admins managers read shifts"
  ON shifts FOR SELECT TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() IN ('admin','manager'));

CREATE POLICY "Carers read own shifts"
  ON shifts FOR SELECT TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() = 'carer' AND staff_id = auth.uid());

CREATE POLICY "Admins managers insert shifts"
  ON shifts FOR INSERT TO authenticated
  WITH CHECK (clinic_id = get_my_clinic_id() AND get_my_role() IN ('admin','manager'));

CREATE POLICY "Admins managers update shifts"
  ON shifts FOR UPDATE TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() IN ('admin','manager'));

CREATE POLICY "Admins managers delete shifts"
  ON shifts FOR DELETE TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() IN ('admin','manager'));

-- shift_residents: all org members can read; only admin/manager write
CREATE POLICY "Clinic members read shift_residents"
  ON shift_residents FOR SELECT TO authenticated
  USING (clinic_id = get_my_clinic_id());

CREATE POLICY "Admins managers insert shift_residents"
  ON shift_residents FOR INSERT TO authenticated
  WITH CHECK (clinic_id = get_my_clinic_id() AND get_my_role() IN ('admin','manager'));

CREATE POLICY "Admins managers delete shift_residents"
  ON shift_residents FOR DELETE TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() IN ('admin','manager'));
