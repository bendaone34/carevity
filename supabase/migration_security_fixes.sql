-- ============================================================
-- Security fixes migration
-- Apply after all existing migrations.
-- ============================================================

-- ─── 1. Profiles RLS: prevent self-role / self-clinic escalation ─────────────
-- The old single policy allowed any user to set their own role and clinic_id.
-- Replace with two policies:
--   a) self-update: users may edit their own non-sensitive fields only
--   b) admin-update: admins may update any profile within their clinic

DROP POLICY IF EXISTS "Users can update profiles"       ON profiles;
DROP POLICY IF EXISTS "Users can update own profile"    ON profiles;
DROP POLICY IF EXISTS "Admins can update clinic profiles" ON profiles;

-- Self-update: role and clinic_id are frozen unless the caller is an admin
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role      = (SELECT p.role      FROM profiles p WHERE p.id = auth.uid())
    AND (clinic_id IS NOT DISTINCT FROM
         (SELECT p.clinic_id FROM profiles p WHERE p.id = auth.uid()))
  );

-- Admin-update: admins may change any profile field within their own clinic
CREATE POLICY "Admins can update clinic profiles"
  ON profiles FOR UPDATE TO authenticated
  USING  (get_my_role() = 'admin' AND clinic_id = get_my_clinic_id())
  WITH CHECK (get_my_role() = 'admin' AND clinic_id = get_my_clinic_id());


-- ─── 2. handle_new_user: trust only app_metadata for role/clinic_id ──────────
-- app_metadata is writable only via the service-role key.
-- user_metadata is writable by the authenticated user themselves.
-- The invite API route must set role/clinic_id in app_metadata (see route fix).
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role, clinic_id, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(new.raw_app_meta_data  ->> 'role',      'carer'),
    NULLIF(  new.raw_app_meta_data  ->> 'clinic_id', '')::uuid,
    new.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;


-- ─── 3. family_members RLS: carers cannot create/update/delete ───────────────
DROP POLICY IF EXISTS "clinic_staff_manage_family_members" ON family_members;
DROP POLICY IF EXISTS "clinic_carers_read_family_members"  ON family_members;
DROP POLICY IF EXISTS "clinic_managers_manage_family_members" ON family_members;

-- Carers: read-only access to family members within their clinic
CREATE POLICY "clinic_carers_read_family_members"
  ON family_members FOR SELECT TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() = 'carer');

-- Admins/managers: full management of family members within their clinic
CREATE POLICY "clinic_managers_manage_family_members"
  ON family_members FOR ALL TO authenticated
  USING  (clinic_id = get_my_clinic_id() AND get_my_role() IN ('admin', 'manager'))
  WITH CHECK (clinic_id = get_my_clinic_id() AND get_my_role() IN ('admin', 'manager'));


-- ─── 4. medication_logs: remove UPDATE policy (logs are immutable after insert) ─
-- Corrections must be new rows (with a corrects_id reference if needed).
DROP POLICY IF EXISTS "Clinic members update medication_logs" ON medication_logs;


-- ─── 5. Duplicate-dose prevention: unique constraint on medication_logs ───────
-- Prevents a double-tap on the "Log Administration" button from creating two rows.
ALTER TABLE medication_logs
  DROP CONSTRAINT IF EXISTS medication_logs_no_duplicate_dose;

ALTER TABLE medication_logs
  ADD CONSTRAINT medication_logs_no_duplicate_dose
  UNIQUE (medication_id, patient_id, date, time);


-- ─── 6. SECURITY DEFINER helpers: add SET search_path to prevent search_path attacks ─
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_my_clinic_id()
RETURNS uuid
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT clinic_id FROM profiles WHERE id = auth.uid();
$$;


-- ─── 7. Ensure family portal always gates on family_visible ─────────────────
-- Recreate the family care-records SELECT policy idempotently with the gate.
DROP POLICY IF EXISTS "family_view_patient_care_records" ON daily_care_records;

CREATE POLICY "family_view_patient_care_records"
  ON daily_care_records FOR SELECT TO authenticated
  USING (
    family_visible = TRUE
    AND patient_id IN (
      SELECT fm.patient_id
      FROM family_members fm
      WHERE fm.user_id = auth.uid()
        AND fm.status  = 'active'
    )
  );
