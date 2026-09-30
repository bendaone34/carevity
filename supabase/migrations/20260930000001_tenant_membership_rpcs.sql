-- ─────────────────────────────────────────────────────────────────────────────
-- Tenant membership hardening (audit finding H1)
--
-- The repo contains two conflicting histories and the live state could not be
-- verified:
--   * migration_staff_roles.sql let any user UPDATE their own profile with no
--     column restriction → `set clinic_id = <victim>, role = 'admin'`.
--   * migration_onboarding.sql's handle_new_user read role/clinic_id from
--     user-writable raw_user_meta_data → signUp({data:{role:'admin',
--     clinic_id:<victim>}}) made you an admin of any clinic.
--   * The app's setup and join flows still wrote role/clinic_id directly, and
--     the join link was the bare clinic UUID, valid forever.
--
-- This migration forces the safe end state regardless of which version is
-- live, and moves every membership change into SECURITY DEFINER RPCs:
--   create_clinic()     — new organisation, caller becomes its admin
--   create_join_link()  — admin issues an expiring, use-capped invite token
--   accept_join_link()  — caller joins as a carer if the token is valid
-- Idempotent — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. profiles UPDATE policies ────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update profiles"          ON profiles;
DROP POLICY IF EXISTS "Users can update own profile"       ON profiles;
DROP POLICY IF EXISTS "Admins can update clinic profiles"  ON profiles;

-- Self-update: any field except role and clinic_id.
-- get_my_role()/get_my_clinic_id() read the pre-update row (statement snapshot).
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role IS NOT DISTINCT FROM get_my_role()
    AND clinic_id IS NOT DISTINCT FROM get_my_clinic_id()
  );

-- Admins manage profiles within their own clinic only (cannot move anyone out)
CREATE POLICY "Admins can update clinic profiles"
  ON profiles FOR UPDATE TO authenticated
  USING      (get_my_role() = 'admin' AND clinic_id = get_my_clinic_id())
  WITH CHECK (get_my_role() = 'admin' AND clinic_id = get_my_clinic_id());


-- ── 2. handle_new_user: privileged fields from app_metadata only ───────────
-- app_metadata is writable only with the service-role key (staff invite route).
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role, clinic_id, email, is_onboarded)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(new.raw_app_meta_data  ->> 'role',      'carer'),
    NULLIF(  new.raw_app_meta_data  ->> 'clinic_id', '')::uuid,
    new.email,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC, anon, authenticated;


-- ── 3. Clinics are created only through create_clinic() ────────────────────
DROP POLICY IF EXISTS "Authenticated users can create clinic" ON clinics;

CREATE OR REPLACE FUNCTION create_clinic(
  p_name    TEXT,
  p_address TEXT DEFAULT NULL,
  p_phone   TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_clinic UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF COALESCE(TRIM(p_name), '') = '' THEN
    RAISE EXCEPTION 'Organisation name is required' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND clinic_id IS NOT NULL) THEN
    RAISE EXCEPTION 'You already belong to an organisation' USING ERRCODE = '42501';
  END IF;

  INSERT INTO clinics (name, owner_id, address, phone)
  VALUES (TRIM(p_name), v_uid, NULLIF(TRIM(p_address), ''), NULLIF(TRIM(p_phone), ''))
  RETURNING id INTO v_clinic;

  UPDATE profiles
  SET    clinic_id = v_clinic, role = 'admin', is_onboarded = true
  WHERE  id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_clinic;
END;
$$;


-- ── 4. Expiring, use-capped invite links (replace the bare clinic UUID) ─────
CREATE TABLE IF NOT EXISTS clinic_join_links (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL UNIQUE,   -- sha256 of the token; the token itself is never stored
  created_by  UUID        NOT NULL REFERENCES auth.users(id),
  expires_at  TIMESTAMPTZ NOT NULL,
  max_uses    INT         NOT NULL CHECK (max_uses BETWEEN 1 AND 100),
  uses        INT         NOT NULL DEFAULT 0,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE clinic_join_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read join links"   ON clinic_join_links;
DROP POLICY IF EXISTS "Admins revoke join links" ON clinic_join_links;

CREATE POLICY "Admins read join links"
  ON clinic_join_links FOR SELECT TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() = 'admin');

-- Admins revoke by setting revoked_at; inserts go through create_join_link()
CREATE POLICY "Admins revoke join links"
  ON clinic_join_links FOR UPDATE TO authenticated
  USING      (clinic_id = get_my_clinic_id() AND get_my_role() = 'admin')
  WITH CHECK (clinic_id = get_my_clinic_id() AND get_my_role() = 'admin');

CREATE OR REPLACE FUNCTION create_join_link(
  p_max_uses   INT DEFAULT 10,
  p_valid_days INT DEFAULT 7
) RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_clinic UUID := get_my_clinic_id();
  v_token  TEXT;
BEGIN
  IF v_clinic IS NULL OR get_my_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only admins can create invite links' USING ERRCODE = '42501';
  END IF;
  IF p_max_uses NOT BETWEEN 1 AND 100 OR p_valid_days NOT BETWEEN 1 AND 30 THEN
    RAISE EXCEPTION 'Invite links allow 1-100 uses and 1-30 days' USING ERRCODE = '22023';
  END IF;

  -- Two v4 UUIDs from the strong RNG: ~244 bits, hex only (URL-safe)
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  INSERT INTO clinic_join_links (clinic_id, token_hash, created_by, expires_at, max_uses)
  VALUES (
    v_clinic,
    encode(sha256(convert_to(v_token, 'UTF8')), 'hex'),
    auth.uid(),
    NOW() + make_interval(days => p_valid_days),
    p_max_uses
  );

  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION accept_join_link(p_token TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_link   UUID;
  v_clinic UUID;
  v_name   TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND clinic_id IS NOT NULL) THEN
    RAISE EXCEPTION 'You already belong to an organisation' USING ERRCODE = '42501';
  END IF;

  SELECT l.id, l.clinic_id, c.name
  INTO   v_link, v_clinic, v_name
  FROM   clinic_join_links l
  JOIN   clinics c ON c.id = l.clinic_id
  WHERE  l.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    AND  l.revoked_at IS NULL
    AND  l.expires_at > NOW()
    AND  l.uses < l.max_uses
    AND  c.is_active
  FOR UPDATE OF l;   -- serialise concurrent accepts so max_uses holds

  IF v_link IS NULL THEN
    RAISE EXCEPTION 'Invite link is invalid or has expired' USING ERRCODE = '22023';
  END IF;

  UPDATE clinic_join_links SET uses = uses + 1 WHERE id = v_link;

  UPDATE profiles
  SET    clinic_id = v_clinic, role = 'carer', is_onboarded = false
  WHERE  id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object('clinic_id', v_clinic, 'clinic_name', v_name);
END;
$$;

-- Signed-in users call these RPCs; nobody else may.
REVOKE EXECUTE ON FUNCTION create_clinic(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION create_join_link(INT, INT)      FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION accept_join_link(TEXT)          FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION create_clinic(TEXT, TEXT, TEXT) TO authenticated;
GRANT  EXECUTE ON FUNCTION create_join_link(INT, INT)      TO authenticated;
GRANT  EXECUTE ON FUNCTION accept_join_link(TEXT)          TO authenticated;
