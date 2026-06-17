-- ============================================================
-- RBAC Migration
-- Tightens RLS so carers only see their assigned patients' data,
-- allows managers to manage assignments,
-- adds family_visible to daily_care_records,
-- and updates the family portal care note policy.
-- ============================================================

-- ── 1. family_visible on daily_care_records ──────────────────
ALTER TABLE daily_care_records
  ADD COLUMN IF NOT EXISTS family_visible BOOLEAN NOT NULL DEFAULT true;

-- ── 2. Carer-scoped SELECT on appointments ───────────────────
DROP POLICY IF EXISTS "Clinic members can read appointments" ON appointments;
CREATE POLICY "Role-scoped read appointments"
  ON appointments FOR SELECT TO authenticated
  USING (
    clinic_id = get_my_clinic_id() AND (
      get_my_role() IN ('admin', 'manager')
      OR EXISTS (
        SELECT 1 FROM staff_patient_assignments
        WHERE staff_id = auth.uid() AND patient_id = appointments.patient_id
      )
    )
  );

-- ── 3. Carer-scoped SELECT on medical_records ────────────────
DROP POLICY IF EXISTS "Clinic members can read medical_records" ON medical_records;
CREATE POLICY "Role-scoped read medical_records"
  ON medical_records FOR SELECT TO authenticated
  USING (
    clinic_id = get_my_clinic_id() AND (
      get_my_role() IN ('admin', 'manager')
      OR EXISTS (
        SELECT 1 FROM staff_patient_assignments
        WHERE staff_id = auth.uid() AND patient_id = medical_records.patient_id
      )
    )
  );

-- ── 4. Carer-scoped SELECT on care_plans ─────────────────────
DROP POLICY IF EXISTS "Clinic members can read care_plans" ON care_plans;
CREATE POLICY "Role-scoped read care_plans"
  ON care_plans FOR SELECT TO authenticated
  USING (
    clinic_id = get_my_clinic_id() AND (
      get_my_role() IN ('admin', 'manager')
      OR EXISTS (
        SELECT 1 FROM staff_patient_assignments
        WHERE staff_id = auth.uid() AND patient_id = care_plans.patient_id
      )
    )
  );

-- ── 5. Carer-scoped SELECT on care_plan_tasks (via care_plans)
DROP POLICY IF EXISTS "Clinic members can read care_plan_tasks" ON care_plan_tasks;
CREATE POLICY "Role-scoped read care_plan_tasks"
  ON care_plan_tasks FOR SELECT TO authenticated
  USING (
    clinic_id = get_my_clinic_id() AND (
      get_my_role() IN ('admin', 'manager')
      OR EXISTS (
        SELECT 1 FROM care_plans cp
        JOIN staff_patient_assignments spa ON spa.patient_id = cp.patient_id
        WHERE cp.id = care_plan_tasks.care_plan_id AND spa.staff_id = auth.uid()
      )
    )
  );

-- ── 6. Carer-scoped SELECT on daily_care_records ─────────────
DROP POLICY IF EXISTS "Clinic members can read daily_care_records" ON daily_care_records;
CREATE POLICY "Role-scoped read daily_care_records"
  ON daily_care_records FOR SELECT TO authenticated
  USING (
    clinic_id = get_my_clinic_id() AND (
      get_my_role() IN ('admin', 'manager')
      OR EXISTS (
        SELECT 1 FROM staff_patient_assignments
        WHERE staff_id = auth.uid() AND patient_id = daily_care_records.patient_id
      )
    )
  );

-- ── 7. Carer-scoped SELECT on medications ────────────────────
DROP POLICY IF EXISTS "Clinic members read medications" ON medications;
CREATE POLICY "Role-scoped read medications"
  ON medications FOR SELECT TO authenticated
  USING (
    clinic_id = get_my_clinic_id() AND (
      get_my_role() IN ('admin', 'manager')
      OR EXISTS (
        SELECT 1 FROM staff_patient_assignments
        WHERE staff_id = auth.uid() AND patient_id = medications.patient_id
      )
    )
  );

-- ── 8. Carer-scoped SELECT on medication_logs ────────────────
DROP POLICY IF EXISTS "Clinic members read medication_logs" ON medication_logs;
CREATE POLICY "Role-scoped read medication_logs"
  ON medication_logs FOR SELECT TO authenticated
  USING (
    clinic_id = get_my_clinic_id() AND (
      get_my_role() IN ('admin', 'manager')
      OR EXISTS (
        SELECT 1 FROM staff_patient_assignments
        WHERE staff_id = auth.uid() AND patient_id = medication_logs.patient_id
      )
    )
  );

-- ── 9. Allow managers to manage staff assignments ─────────────
DROP POLICY IF EXISTS "Admins can manage assignments" ON staff_patient_assignments;
CREATE POLICY "Admins managers manage assignments"
  ON staff_patient_assignments FOR ALL TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() IN ('admin', 'manager'))
  WITH CHECK (clinic_id = get_my_clinic_id() AND get_my_role() IN ('admin', 'manager'));

-- ── 10. Family portal: only see family_visible care records ───
DROP POLICY IF EXISTS "family_view_patient_care_records" ON daily_care_records;
CREATE POLICY "family_view_patient_care_records"
  ON daily_care_records FOR SELECT TO authenticated
  USING (
    family_visible = true
    AND patient_id IN (
      SELECT patient_id FROM family_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
