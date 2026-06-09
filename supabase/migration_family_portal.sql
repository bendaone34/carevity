-- ============================================================
-- Family Portal Migration
-- Tables: family_members, family_messages
-- RLS policies for family access to existing tables
-- ============================================================

-- family_members: links a family user to a patient/resident
CREATE TABLE IF NOT EXISTS family_members (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id    UUID NOT NULL REFERENCES clinics(id)  ON DELETE CASCADE,
  patient_id   UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  relationship TEXT NOT NULL,
  email        TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','active','deactivated')),
  invited_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(patient_id, email)
);

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Clinic staff can fully manage family members for their clinic
CREATE POLICY "clinic_staff_manage_family_members"
  ON family_members FOR ALL TO authenticated
  USING (clinic_id = get_my_clinic_id())
  WITH CHECK (clinic_id = get_my_clinic_id());

-- Family members can view their own record (user_id matched after invite accepted)
CREATE POLICY "family_view_own_record"
  ON family_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- family_messages: threaded messages between family & staff
-- ============================================================
CREATE TABLE IF NOT EXISTS family_messages (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id        UUID NOT NULL REFERENCES clinics(id)        ON DELETE CASCADE,
  patient_id       UUID NOT NULL REFERENCES patients(id)       ON DELETE CASCADE,
  family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  sender_type      TEXT NOT NULL CHECK (sender_type IN ('family','staff')),
  sender_id        UUID REFERENCES auth.users(id),
  sender_name      TEXT NOT NULL,
  message          TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at          TIMESTAMPTZ
);

ALTER TABLE family_messages ENABLE ROW LEVEL SECURITY;

-- Clinic staff can manage all messages in their clinic
CREATE POLICY "clinic_staff_messages"
  ON family_messages FOR ALL TO authenticated
  USING (clinic_id = get_my_clinic_id())
  WITH CHECK (clinic_id = get_my_clinic_id());

-- Family members can read their own thread
CREATE POLICY "family_read_own_messages"
  ON family_messages FOR SELECT TO authenticated
  USING (
    family_member_id IN (
      SELECT id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- Family members can send messages in their own thread (active only)
CREATE POLICY "family_insert_own_messages"
  ON family_messages FOR INSERT TO authenticated
  WITH CHECK (
    family_member_id IN (
      SELECT id FROM family_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
    AND sender_type = 'family'
  );

-- ============================================================
-- Extend existing table RLS for family member read access
-- Each policy is additive (OR) with existing staff policies
-- ============================================================

-- Patients: family members can view only their relative's record
CREATE POLICY "family_view_own_patient"
  ON patients FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT patient_id FROM family_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Daily care records: family can read (app layer filters out clinical details)
CREATE POLICY "family_view_patient_care_records"
  ON daily_care_records FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT patient_id FROM family_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Medications: family can view active medication list (no admin logs)
CREATE POLICY "family_view_patient_medications"
  ON medications FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT patient_id FROM family_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Incidents: family can only see low/medium severity incidents for their relative
-- Critical incidents must be communicated by phone, not the portal
CREATE POLICY "family_view_patient_incidents"
  ON incidents FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT patient_id FROM family_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
    AND severity IN ('low','medium')
  );

-- ============================================================
-- visit_requests: family members request visits to their relative
-- ============================================================
CREATE TABLE IF NOT EXISTS visit_requests (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id        UUID NOT NULL REFERENCES clinics(id)        ON DELETE CASCADE,
  patient_id       UUID NOT NULL REFERENCES patients(id)       ON DELETE CASCADE,
  family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  requested_date   DATE NOT NULL,
  requested_time   TIME NOT NULL,
  visitor_count    INT  NOT NULL DEFAULT 1 CHECK (visitor_count BETWEEN 1 AND 20),
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','approved','declined')),
  staff_notes      TEXT,
  reviewed_by      UUID REFERENCES auth.users(id),
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE visit_requests ENABLE ROW LEVEL SECURITY;

-- Clinic staff can view and manage all visit requests for their clinic
CREATE POLICY "clinic_staff_manage_visit_requests"
  ON visit_requests FOR ALL TO authenticated
  USING (clinic_id = get_my_clinic_id())
  WITH CHECK (clinic_id = get_my_clinic_id());

-- Family members can insert requests (validates all fields against their family_members row)
CREATE POLICY "family_insert_visit_requests"
  ON visit_requests FOR INSERT TO authenticated
  WITH CHECK (
    family_member_id IN (
      SELECT id FROM family_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
    AND patient_id IN (
      SELECT patient_id FROM family_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
    AND clinic_id IN (
      SELECT clinic_id FROM family_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Family members can view their own visit requests
CREATE POLICY "family_view_own_visit_requests"
  ON visit_requests FOR SELECT TO authenticated
  USING (
    family_member_id IN (
      SELECT id FROM family_members
      WHERE user_id = auth.uid()
    )
  );
