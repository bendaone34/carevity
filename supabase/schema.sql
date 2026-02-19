-- ============================================================
-- Carevity Database Schema
-- Run this in your Supabase project: SQL Editor → New Query
-- ============================================================


-- ============================================================
-- PROFILES
-- Extends auth.users with role and display name.
-- A row is created automatically whenever a user signs up.
-- ============================================================

create table if not exists profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  full_name  text,
  role       text check (role in ('admin', 'doctor', 'nurse', 'receptionist')) not null default 'doctor',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user is created
create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- ============================================================
-- PATIENTS
-- ============================================================

create table if not exists patients (
  id                              uuid        not null default gen_random_uuid() primary key,
  first_name                      text        not null,
  last_name                       text        not null,
  email                           text,
  phone                           text,
  date_of_birth                   date,
  gender                          text        check (gender in ('male', 'female', 'other')),
  address                         text,
  blood_type                      text,
  allergies                       text[]      not null default '{}',
  medical_conditions              text[]      not null default '{}',
  emergency_contact_name          text,
  emergency_contact_phone         text,
  emergency_contact_relationship  text,
  avatar_url                      text,
  created_at                      timestamptz not null default now()
);


-- ============================================================
-- APPOINTMENTS
-- ============================================================

create table if not exists appointments (
  id          uuid        not null default gen_random_uuid() primary key,
  patient_id  uuid        not null references patients(id) on delete cascade,
  doctor_name text        not null,
  date        date        not null,
  time        text        not null,   -- stored as "HH:MM" e.g. "09:00"
  type        text        not null check (type in ('checkup', 'consultation', 'follow-up', 'emergency')),
  status      text        not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'in-progress')),
  notes       text,
  created_at  timestamptz not null default now()
);


-- ============================================================
-- MEDICAL RECORDS
-- vitals stored as JSONB: { bloodPressure, heartRate, temperature, weight }
-- ============================================================

create table if not exists medical_records (
  id            uuid        not null default gen_random_uuid() primary key,
  patient_id    uuid        not null references patients(id) on delete cascade,
  date          date        not null,
  diagnosis     text        not null,
  treatment     text,
  prescriptions text[]      not null default '{}',
  doctor_name   text        not null,
  notes         text,
  vitals        jsonb,
  created_at    timestamptz not null default now()
);


-- ============================================================
-- ROW LEVEL SECURITY
-- All authenticated staff can read and write all records.
-- Unauthenticated requests are blocked.
-- ============================================================

alter table profiles       enable row level security;
alter table patients       enable row level security;
alter table appointments   enable row level security;
alter table medical_records enable row level security;

-- Profiles: users can read all, but only update their own
create policy "Authenticated users can read profiles"
  on profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id);

-- Patients: full access for authenticated users
create policy "Authenticated users can read patients"
  on patients for select to authenticated using (true);

create policy "Authenticated users can insert patients"
  on patients for insert to authenticated with check (true);

create policy "Authenticated users can update patients"
  on patients for update to authenticated using (true);

create policy "Authenticated users can delete patients"
  on patients for delete to authenticated using (true);

-- Appointments: full access for authenticated users
create policy "Authenticated users can read appointments"
  on appointments for select to authenticated using (true);

create policy "Authenticated users can insert appointments"
  on appointments for insert to authenticated with check (true);

create policy "Authenticated users can update appointments"
  on appointments for update to authenticated using (true);

create policy "Authenticated users can delete appointments"
  on appointments for delete to authenticated using (true);

-- Medical records: full access for authenticated users
create policy "Authenticated users can read medical_records"
  on medical_records for select to authenticated using (true);

create policy "Authenticated users can insert medical_records"
  on medical_records for insert to authenticated with check (true);

create policy "Authenticated users can update medical_records"
  on medical_records for update to authenticated using (true);

create policy "Authenticated users can delete medical_records"
  on medical_records for delete to authenticated using (true);
