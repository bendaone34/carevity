-- Care Plans migration
-- Run this in the Supabase SQL Editor

-- 1. care_plans table
create table if not exists care_plans (
  id          uuid        not null default gen_random_uuid() primary key,
  clinic_id   uuid        not null references clinics(id) on delete cascade,
  patient_id  uuid        not null references patients(id) on delete cascade,
  title       text        not null,
  description text,
  goals       text[]      not null default '{}',
  carer_name  text        not null,
  status      text        not null default 'pending' check (status in ('active', 'completed', 'pending')),
  start_date  date,
  end_date    date,
  notes       text,
  created_at  timestamptz not null default now()
);

-- 2. care_plan_tasks table
create table if not exists care_plan_tasks (
  id           uuid        not null default gen_random_uuid() primary key,
  care_plan_id uuid        not null references care_plans(id) on delete cascade,
  clinic_id    uuid        not null references clinics(id) on delete cascade,
  title        text        not null,
  description  text,
  status       text        not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  due_date     date,
  created_at   timestamptz not null default now()
);

-- 3. Enable RLS
alter table care_plans      enable row level security;
alter table care_plan_tasks enable row level security;

-- 4. RLS policies: care_plans
create policy "Clinic members can read care_plans"
  on care_plans for select to authenticated using (clinic_id = get_my_clinic_id());
create policy "Clinic members can insert care_plans"
  on care_plans for insert to authenticated with check (clinic_id = get_my_clinic_id());
create policy "Clinic members can update care_plans"
  on care_plans for update to authenticated using (clinic_id = get_my_clinic_id());
create policy "Clinic members can delete care_plans"
  on care_plans for delete to authenticated using (clinic_id = get_my_clinic_id());

-- 5. RLS policies: care_plan_tasks
create policy "Clinic members can read care_plan_tasks"
  on care_plan_tasks for select to authenticated using (clinic_id = get_my_clinic_id());
create policy "Clinic members can insert care_plan_tasks"
  on care_plan_tasks for insert to authenticated with check (clinic_id = get_my_clinic_id());
create policy "Clinic members can update care_plan_tasks"
  on care_plan_tasks for update to authenticated using (clinic_id = get_my_clinic_id());
create policy "Clinic members can delete care_plan_tasks"
  on care_plan_tasks for delete to authenticated using (clinic_id = get_my_clinic_id());
