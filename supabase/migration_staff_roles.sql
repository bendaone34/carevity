-- Staff & Role Management migration
-- SAFE: sets existing users to admin before changing constraints

-- ─── 1. Add new columns to profiles ────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email     text,
  ADD COLUMN IF NOT EXISTS phone     text,
  ADD COLUMN IF NOT EXISTS job_title text;

-- ─── 2. Migrate existing role values BEFORE changing the constraint ─────────
-- Set clinic owners to admin
UPDATE profiles SET role = 'admin'
  WHERE id IN (SELECT owner_id FROM clinics);

-- Set any remaining profiles that have old role values to manager
UPDATE profiles SET role = 'manager'
  WHERE role NOT IN ('admin', 'manager', 'carer');

-- ─── 3. Replace role constraint ─────────────────────────────────────────────
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'manager', 'carer'));

-- ─── 4. get_my_role() helper ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- ─── 5. Update handle_new_user to capture role + clinic_id + email ──────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role, clinic_id, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(new.raw_user_meta_data ->> 'role', 'carer'),
    NULLIF(new.raw_user_meta_data ->> 'clinic_id', '')::uuid,
    new.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- ─── 6. staff_patient_assignments table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_patient_assignments (
  staff_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id)   ON DELETE CASCADE,
  clinic_id  uuid NOT NULL REFERENCES clinics(id)    ON DELETE CASCADE,
  PRIMARY KEY (staff_id, patient_id)
);

ALTER TABLE staff_patient_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members can read assignments"
  ON staff_patient_assignments FOR SELECT TO authenticated
  USING (clinic_id = get_my_clinic_id());

CREATE POLICY "Admins can manage assignments"
  ON staff_patient_assignments FOR ALL TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() = 'admin')
  WITH CHECK (clinic_id = get_my_clinic_id() AND get_my_role() = 'admin');

-- ─── 7. Update profiles RLS ─────────────────────────────────────────────────
-- Replace open "any authenticated" policy with clinic-scoped
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON profiles;
CREATE POLICY "Clinic members can read profiles"
  ON profiles FOR SELECT TO authenticated
  USING (clinic_id = get_my_clinic_id() OR id = auth.uid());

-- Allow admins to update any profile in their clinic
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update profiles"
  ON profiles FOR UPDATE TO authenticated
  USING  (auth.uid() = id OR get_my_role() = 'admin')
  WITH CHECK (auth.uid() = id OR get_my_role() = 'admin');

-- ─── 8. Role-aware patients SELECT ──────────────────────────────────────────
-- Admins/managers see all clinic patients; carers see only assigned ones
DROP POLICY IF EXISTS "Clinic members can read patients" ON patients;
CREATE POLICY "Clinic members can read patients"
  ON patients FOR SELECT TO authenticated
  USING (
    clinic_id = get_my_clinic_id() AND (
      get_my_role() IN ('admin', 'manager')
      OR EXISTS (
        SELECT 1 FROM staff_patient_assignments
        WHERE staff_id = auth.uid() AND patient_id = patients.id
      )
    )
  );

-- ─── 9. Admin-only DELETE on all tables ─────────────────────────────────────
DROP POLICY IF EXISTS "Clinic members can delete patients" ON patients;
CREATE POLICY "Admins can delete patients"
  ON patients FOR DELETE TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() = 'admin');

DROP POLICY IF EXISTS "Clinic members can delete appointments" ON appointments;
CREATE POLICY "Admins can delete appointments"
  ON appointments FOR DELETE TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() = 'admin');

DROP POLICY IF EXISTS "Clinic members can delete medical_records" ON medical_records;
CREATE POLICY "Admins can delete medical_records"
  ON medical_records FOR DELETE TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() = 'admin');

DROP POLICY IF EXISTS "Clinic members can delete care_plans" ON care_plans;
CREATE POLICY "Admins can delete care_plans"
  ON care_plans FOR DELETE TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() = 'admin');

DROP POLICY IF EXISTS "Clinic members can delete care_plan_tasks" ON care_plan_tasks;
CREATE POLICY "Admins can delete care_plan_tasks"
  ON care_plan_tasks FOR DELETE TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() = 'admin');

DROP POLICY IF EXISTS "Clinic members can delete daily_care_records" ON daily_care_records;
CREATE POLICY "Admins can delete daily_care_records"
  ON daily_care_records FOR DELETE TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() = 'admin');
