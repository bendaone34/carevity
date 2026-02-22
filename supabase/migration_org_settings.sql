-- Multi-tenancy enhancement: add metadata columns to clinics table
-- Run this in Supabase Dashboard → SQL editor

ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS address          TEXT,
  ADD COLUMN IF NOT EXISTS phone            TEXT,
  ADD COLUMN IF NOT EXISTS email            TEXT,
  ADD COLUMN IF NOT EXISTS logo_url         TEXT,
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'starter'
    CHECK (subscription_tier IN ('starter','professional','enterprise')),
  ADD COLUMN IF NOT EXISTS is_active        BOOLEAN NOT NULL DEFAULT TRUE;

-- Allow clinic admins (not just owner) to update clinic details
DROP POLICY IF EXISTS "Owner can update clinic" ON clinics;

CREATE POLICY "Owner or admin can update clinic"
  ON clinics FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR (id = get_my_clinic_id() AND get_my_role() = 'admin')
  );
