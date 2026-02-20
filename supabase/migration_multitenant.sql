-- Multi-tenancy migration
-- Run this in the Supabase SQL Editor

-- 1. Clinics table
create table if not exists clinics (
  id         uuid        not null default gen_random_uuid() primary key,
  name       text        not null,
  owner_id   uuid        not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 2. Add clinic_id to existing tables
alter table profiles        add column if not exists clinic_id uuid references clinics(id) on delete set null;
alter table patients        add column if not exists clinic_id uuid references clinics(id) on delete cascade;
alter table appointments    add column if not exists clinic_id uuid references clinics(id) on delete cascade;
alter table medical_records add column if not exists clinic_id uuid references clinics(id) on delete cascade;

-- 3. Enable RLS on clinics
alter table clinics enable row level security;

-- 4. Helper function — returns current user's clinic_id from profiles
create or replace function get_my_clinic_id()
returns uuid
language sql security definer stable
as $$
  select clinic_id from profiles where id = auth.uid();
$$;

-- 5. RLS: clinics — only clinic members can read; only owner can update/delete
create policy "Authenticated users can create clinic"
  on clinics for insert to authenticated
  with check (owner_id = auth.uid());

create policy "Members can read their clinic"
  on clinics for select to authenticated
  using (id = get_my_clinic_id());

create policy "Owner can update clinic"
  on clinics for update to authenticated
  using (owner_id = auth.uid());

-- 6. Drop old open RLS policies and replace with clinic-scoped ones

-- Patients
drop policy if exists "Authenticated users can read patients" on patients;
drop policy if exists "Authenticated users can insert patients" on patients;
drop policy if exists "Authenticated users can update patients" on patients;
drop policy if exists "Authenticated users can delete patients" on patients;

create policy "Clinic members can read patients"
  on patients for select to authenticated using (clinic_id = get_my_clinic_id());
create policy "Clinic members can insert patients"
  on patients for insert to authenticated with check (clinic_id = get_my_clinic_id());
create policy "Clinic members can update patients"
  on patients for update to authenticated using (clinic_id = get_my_clinic_id());
create policy "Clinic members can delete patients"
  on patients for delete to authenticated using (clinic_id = get_my_clinic_id());

-- Appointments
drop policy if exists "Authenticated users can read appointments" on appointments;
drop policy if exists "Authenticated users can insert appointments" on appointments;
drop policy if exists "Authenticated users can update appointments" on appointments;
drop policy if exists "Authenticated users can delete appointments" on appointments;

create policy "Clinic members can read appointments"
  on appointments for select to authenticated using (clinic_id = get_my_clinic_id());
create policy "Clinic members can insert appointments"
  on appointments for insert to authenticated with check (clinic_id = get_my_clinic_id());
create policy "Clinic members can update appointments"
  on appointments for update to authenticated using (clinic_id = get_my_clinic_id());
create policy "Clinic members can delete appointments"
  on appointments for delete to authenticated using (clinic_id = get_my_clinic_id());

-- Medical records
drop policy if exists "Authenticated users can read medical_records" on medical_records;
drop policy if exists "Authenticated users can insert medical_records" on medical_records;
drop policy if exists "Authenticated users can update medical_records" on medical_records;
drop policy if exists "Authenticated users can delete medical_records" on medical_records;

create policy "Clinic members can read medical_records"
  on medical_records for select to authenticated using (clinic_id = get_my_clinic_id());
create policy "Clinic members can insert medical_records"
  on medical_records for insert to authenticated with check (clinic_id = get_my_clinic_id());
create policy "Clinic members can update medical_records"
  on medical_records for update to authenticated using (clinic_id = get_my_clinic_id());
create policy "Clinic members can delete medical_records"
  on medical_records for delete to authenticated using (clinic_id = get_my_clinic_id());
