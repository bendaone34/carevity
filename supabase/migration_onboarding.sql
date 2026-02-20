ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_onboarded boolean NOT NULL DEFAULT false;

-- All existing profiles are already onboarded
UPDATE profiles SET is_onboarded = true;

-- Update trigger to explicitly set false for new invites (documents intent)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role, clinic_id, email, is_onboarded)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(new.raw_user_meta_data ->> 'role', 'carer'),
    NULLIF(new.raw_user_meta_data ->> 'clinic_id', '')::uuid,
    new.email,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;
