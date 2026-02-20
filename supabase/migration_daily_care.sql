-- Daily Care Records migration

create table if not exists daily_care_records (
  id            uuid        not null default gen_random_uuid() primary key,
  clinic_id     uuid        not null references clinics(id) on delete cascade,
  patient_id    uuid        not null references patients(id) on delete cascade,
  date          date        not null,
  carer_name    text        not null,
  recorded_at   time,
  -- Meal & fluid intake as JSONB
  -- { breakfast: {eaten, notes}, lunch: {eaten, notes}, dinner: {eaten, notes}, snacks, fluids_ml }
  meals         jsonb       not null default '{}',
  -- Personal care as JSONB
  -- { bathing, grooming, dressing, oral_care, notes }
  personal_care jsonb       not null default '{}',
  mood_score    int         check (mood_score between 1 and 5),
  mood_notes    text,
  activity      text,
  incidents     text,
  notes         text,
  created_at    timestamptz not null default now()
);

alter table daily_care_records enable row level security;

create policy "Clinic members can read daily_care_records"
  on daily_care_records for select to authenticated using (clinic_id = get_my_clinic_id());
create policy "Clinic members can insert daily_care_records"
  on daily_care_records for insert to authenticated with check (clinic_id = get_my_clinic_id());
create policy "Clinic members can update daily_care_records"
  on daily_care_records for update to authenticated using (clinic_id = get_my_clinic_id());
create policy "Clinic members can delete daily_care_records"
  on daily_care_records for delete to authenticated using (clinic_id = get_my_clinic_id());
