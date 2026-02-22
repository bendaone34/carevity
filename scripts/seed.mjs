// scripts/seed.mjs — Run with: node scripts/seed.mjs
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hxgzckniqpilupboowek.supabase.co';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4Z3pja25pcXBpbHVwYm9vd2VrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQ5NzgwNSwiZXhwIjoyMDg3MDczODA1fQ.B7_OIo_M0rSdnjRhuTISa8txFTsK_dWetI9BWm1GWQg';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString().split('T')[0];
}
function daysAhead(n) {
  return new Date(Date.now() + n * 86400000).toISOString().split('T')[0];
}

async function seed() {
  const today      = daysAgo(0);
  const yesterday  = daysAgo(1);
  const twoDaysAgo = daysAgo(2);
  const oneWeekAgo = daysAgo(7);
  const twoWeeksAgo = daysAgo(14);
  const oneMonthAgo = daysAgo(30);
  const twoMonthsAgo = daysAgo(60);
  const tomorrow   = daysAhead(1);
  const nextWeek   = daysAhead(7);

  console.log('🌱 Starting seed...\n');

  // ── 1. Auth users ──────────────────────────────────────────────────────────
  const { data: { users }, error: usersErr } = await supabase.auth.admin.listUsers();
  if (usersErr) throw usersErr;

  const bennyUser    = users.find(u => u.email === 'benny102811@gmail.com');
  const benedictUser = users.find(u => u.email === 'benedict2811@gmail.com');
  if (!bennyUser || !benedictUser) throw new Error('Could not find both auth users');
  console.log(`✓ Auth users found`);

  // ── 2. Clinic ──────────────────────────────────────────────────────────────
  const { data: clinic, error: clinicErr } = await supabase
    .from('clinics')
    .insert({ name: 'Sunrise Care Home', owner_id: bennyUser.id })
    .select()
    .single();
  if (clinicErr) throw clinicErr;
  const clinicId = clinic.id;
  console.log(`✓ Clinic created: "${clinic.name}" (${clinicId})`);

  // ── 3. Profiles ────────────────────────────────────────────────────────────
  const { error: profilesErr } = await supabase.from('profiles').upsert([
    {
      id: bennyUser.id,
      clinic_id: clinicId,
      email: bennyUser.email,
      full_name: 'Ben Adams',
      role: 'admin',
      is_onboarded: true,
      job_title: 'Care Home Manager',
      phone: '07700 900001',
    },
    {
      id: benedictUser.id,
      clinic_id: clinicId,
      email: benedictUser.email,
      full_name: 'Benedict Clarke',
      role: 'carer',
      is_onboarded: true,
      job_title: 'Senior Carer',
      phone: '07700 900002',
    },
  ], { onConflict: 'id' });
  if (profilesErr) throw profilesErr;
  console.log(`✓ Profiles upserted`);

  // ── 4. Auth metadata ───────────────────────────────────────────────────────
  await Promise.all([
    supabase.auth.admin.updateUserById(bennyUser.id, {
      user_metadata: { full_name: 'Ben Adams', clinic_id: clinicId, clinic_name: 'Sunrise Care Home', role: 'admin' },
    }),
    supabase.auth.admin.updateUserById(benedictUser.id, {
      user_metadata: { full_name: 'Benedict Clarke', clinic_id: clinicId, clinic_name: 'Sunrise Care Home', role: 'carer' },
    }),
  ]);
  console.log(`✓ Auth metadata updated`);

  // ── 5. Patients ────────────────────────────────────────────────────────────
  const { data: patients, error: patientsErr } = await supabase
    .from('patients')
    .insert([
      {
        clinic_id: clinicId,
        first_name: 'Margaret', last_name: 'Thompson',
        email: 'margaret.t@email.com', phone: '07700 900123',
        date_of_birth: '1938-06-14', gender: 'female',
        address: '12 Oak Lane, Bristol, BS1 2AB', blood_type: 'A+',
        allergies: ['Penicillin'],
        medical_conditions: ['Dementia', 'Hypertension'],
        emergency_contact_name: 'Robert Thompson',
        emergency_contact_phone: '07700 900456',
        emergency_contact_relationship: 'Son',
      },
      {
        clinic_id: clinicId,
        first_name: 'George', last_name: 'Harrison',
        email: 'george.h@email.com', phone: '07700 900234',
        date_of_birth: '1942-03-22', gender: 'male',
        address: '8 Elm Street, Bristol, BS2 3CD', blood_type: 'O+',
        allergies: ['Sulfa drugs', 'Latex'],
        medical_conditions: ["Parkinson's Disease", 'Type 2 Diabetes'],
        emergency_contact_name: 'Patricia Harrison',
        emergency_contact_phone: '07700 900567',
        emergency_contact_relationship: 'Daughter',
      },
      {
        clinic_id: clinicId,
        first_name: 'Dorothy', last_name: 'Clarke',
        email: 'dorothy.c@email.com', phone: '07700 900345',
        date_of_birth: '1935-11-30', gender: 'female',
        address: '24 Maple Drive, Bristol, BS3 4EF', blood_type: 'B-',
        allergies: [],
        medical_conditions: ['Osteoporosis', 'Arthritis', 'Atrial Fibrillation'],
        emergency_contact_name: 'James Clarke',
        emergency_contact_phone: '07700 900678',
        emergency_contact_relationship: 'Husband',
      },
      {
        clinic_id: clinicId,
        first_name: 'William', last_name: 'Foster',
        email: 'william.f@email.com', phone: '07700 900456',
        date_of_birth: '1940-09-05', gender: 'male',
        address: '3 Pine Road, Bristol, BS4 5GH', blood_type: 'AB+',
        allergies: ['Aspirin'],
        medical_conditions: ['COPD', 'Heart Failure'],
        emergency_contact_name: 'Susan Foster',
        emergency_contact_phone: '07700 900789',
        emergency_contact_relationship: 'Wife',
      },
      {
        clinic_id: clinicId,
        first_name: 'Elsie', last_name: 'Morgan',
        email: 'elsie.m@email.com', phone: '07700 900567',
        date_of_birth: '1933-04-18', gender: 'female',
        address: '17 Birch Close, Bristol, BS5 6IJ', blood_type: 'O-',
        allergies: ['Codeine'],
        medical_conditions: ['Vascular Dementia', 'Hypertension', 'Type 2 Diabetes'],
        emergency_contact_name: 'David Morgan',
        emergency_contact_phone: '07700 900890',
        emergency_contact_relationship: 'Son',
      },
      {
        clinic_id: clinicId,
        first_name: 'Arthur', last_name: 'Bennett',
        email: 'arthur.b@email.com', phone: '07700 900678',
        date_of_birth: '1945-07-28', gender: 'male',
        address: '5 Cedar Way, Bristol, BS6 7KL', blood_type: 'A-',
        allergies: [],
        medical_conditions: ['Stroke (post-recovery)', 'Hypertension'],
        emergency_contact_name: 'Helen Bennett',
        emergency_contact_phone: '07700 900901',
        emergency_contact_relationship: 'Daughter',
      },
      {
        clinic_id: clinicId,
        first_name: 'Violet', last_name: 'Hughes',
        email: 'violet.h@email.com', phone: '07700 900789',
        date_of_birth: '1937-12-09', gender: 'female',
        address: '9 Willow Crescent, Bristol, BS7 8MN', blood_type: 'B+',
        allergies: ['NSAIDs'],
        medical_conditions: ["Alzheimer's Disease", 'Osteoporosis'],
        emergency_contact_name: 'Thomas Hughes',
        emergency_contact_phone: '07700 900012',
        emergency_contact_relationship: 'Son',
      },
      {
        clinic_id: clinicId,
        first_name: 'Frederick', last_name: 'Lawson',
        email: 'frederick.l@email.com', phone: '07700 900890',
        date_of_birth: '1943-01-15', gender: 'male',
        address: '31 Ash Avenue, Bristol, BS8 9OP', blood_type: 'O+',
        allergies: ['Morphine'],
        medical_conditions: ['Chronic Kidney Disease', 'Anaemia'],
        emergency_contact_name: 'Catherine Lawson',
        emergency_contact_phone: '07700 900123',
        emergency_contact_relationship: 'Wife',
      },
    ])
    .select();
  if (patientsErr) throw patientsErr;

  // Build name → id map
  const pid = {};
  for (const p of patients) pid[`${p.first_name} ${p.last_name}`] = p.id;
  console.log(`✓ Created ${patients.length} patients`);

  // ── 6. Assign patients to Benedict (carer) ─────────────────────────────────
  const { error: assignErr } = await supabase.from('staff_patient_assignments').insert([
    { staff_id: benedictUser.id, patient_id: pid['Margaret Thompson'], clinic_id: clinicId },
    { staff_id: benedictUser.id, patient_id: pid['George Harrison'],   clinic_id: clinicId },
    { staff_id: benedictUser.id, patient_id: pid['Dorothy Clarke'],    clinic_id: clinicId },
    { staff_id: benedictUser.id, patient_id: pid['William Foster'],    clinic_id: clinicId },
    { staff_id: benedictUser.id, patient_id: pid['Elsie Morgan'],      clinic_id: clinicId },
    { staff_id: benedictUser.id, patient_id: pid['Arthur Bennett'],    clinic_id: clinicId },
    { staff_id: benedictUser.id, patient_id: pid['Violet Hughes'],     clinic_id: clinicId },
    { staff_id: benedictUser.id, patient_id: pid['Frederick Lawson'],  clinic_id: clinicId },
  ]);
  if (assignErr) throw assignErr;
  console.log(`✓ Assigned all patients to carer`);

  // ── 7. Appointments ────────────────────────────────────────────────────────
  const { data: appointments, error: apptErr } = await supabase
    .from('appointments')
    .insert([
      { clinic_id: clinicId, patient_id: pid['Margaret Thompson'], doctor_name: 'Dr. Sarah Patel',   date: today,        time: '09:00', type: 'checkup',      status: 'scheduled',   notes: 'Quarterly dementia review' },
      { clinic_id: clinicId, patient_id: pid['George Harrison'],   doctor_name: 'Dr. James Wilson',   date: today,        time: '10:30', type: 'follow-up',    status: 'in-progress', notes: "Parkinson's medication adjustment review" },
      { clinic_id: clinicId, patient_id: pid['Dorothy Clarke'],    doctor_name: 'Dr. Sarah Patel',   date: today,        time: '14:00', type: 'consultation', status: 'scheduled',   notes: 'Bone density review and anticoagulation check' },
      { clinic_id: clinicId, patient_id: pid['William Foster'],    doctor_name: 'Dr. Michael Brown',  date: today,        time: '15:30', type: 'checkup',      status: 'scheduled',   notes: 'Heart function and fluid balance monitoring' },
      { clinic_id: clinicId, patient_id: pid['Elsie Morgan'],      doctor_name: 'Dr. James Wilson',   date: yesterday,    time: '11:00', type: 'follow-up',    status: 'completed',   notes: 'Diabetes HbA1c results review' },
      { clinic_id: clinicId, patient_id: pid['Arthur Bennett'],    doctor_name: 'Dr. Sarah Patel',   date: yesterday,    time: '14:30', type: 'checkup',      status: 'completed',   notes: 'Post-stroke rehabilitation assessment' },
      { clinic_id: clinicId, patient_id: pid['Frederick Lawson'],  doctor_name: 'Dr. Michael Brown',  date: twoDaysAgo,   time: '09:30', type: 'consultation', status: 'completed',   notes: 'Kidney function and anaemia results' },
      { clinic_id: clinicId, patient_id: pid['Violet Hughes'],     doctor_name: 'Dr. Sarah Patel',   date: tomorrow,     time: '10:00', type: 'checkup',      status: 'scheduled',   notes: "Alzheimer's monthly assessment" },
      { clinic_id: clinicId, patient_id: pid['Margaret Thompson'], doctor_name: 'Dr. James Wilson',   date: tomorrow,     time: '14:30', type: 'consultation', status: 'scheduled' },
      { clinic_id: clinicId, patient_id: pid['George Harrison'],   doctor_name: 'Dr. Michael Brown',  date: nextWeek,     time: '09:00', type: 'follow-up',    status: 'scheduled',   notes: 'Tremor and mobility assessment' },
      { clinic_id: clinicId, patient_id: pid['Dorothy Clarke'],    doctor_name: 'Dr. Sarah Patel',   date: twoWeeksAgo,  time: '11:00', type: 'checkup',      status: 'completed' },
      { clinic_id: clinicId, patient_id: pid['William Foster'],    doctor_name: 'Dr. Michael Brown',  date: oneMonthAgo,  time: '15:00', type: 'emergency',    status: 'completed',   notes: 'Acute breathing difficulty episode' },
      { clinic_id: clinicId, patient_id: pid['Elsie Morgan'],      doctor_name: 'Dr. James Wilson',   date: twoMonthsAgo, time: '10:00', type: 'checkup',      status: 'completed',   notes: 'Routine diabetes review' },
      { clinic_id: clinicId, patient_id: pid['Frederick Lawson'],  doctor_name: 'Dr. Michael Brown',  date: oneWeekAgo,   time: '13:00', type: 'follow-up',    status: 'completed',   notes: 'Haematology follow-up' },
    ])
    .select();
  if (apptErr) throw apptErr;
  console.log(`✓ Created ${appointments.length} appointments`);

  // ── 8. Medical Records ─────────────────────────────────────────────────────
  const { data: records, error: recordsErr } = await supabase
    .from('medical_records')
    .insert([
      {
        clinic_id: clinicId, patient_id: pid['Margaret Thompson'],
        date: twoWeeksAgo, doctor_name: 'Dr. Sarah Patel',
        diagnosis: 'Moderate Alzheimer-type Dementia – progressing stage',
        treatment: 'Continued Donepezil, increased social stimulation programme, wandering risk assessment completed',
        prescriptions: ['Donepezil 10mg daily', 'Amlodipine 5mg daily'],
        notes: 'Family updated. Wandering protocol in place. Next review in 3 months.',
        vitals: { bloodPressure: '138/84', heartRate: 74, temperature: 36.8, weight: 58 },
      },
      {
        clinic_id: clinicId, patient_id: pid['George Harrison'],
        date: yesterday, doctor_name: 'Dr. James Wilson',
        diagnosis: "Parkinson's Disease – stable with medication adjustment",
        treatment: 'Levodopa dosage increased. Physiotherapy referral for gait training.',
        prescriptions: ['Levodopa/Carbidopa 100/25mg three times daily', 'Ropinirole 2mg daily'],
        notes: 'Good response to physiotherapy. Family to monitor for dyskinesia.',
        vitals: { bloodPressure: '128/78', heartRate: 68, temperature: 36.6, weight: 72 },
      },
      {
        clinic_id: clinicId, patient_id: pid['Dorothy Clarke'],
        date: twoWeeksAgo, doctor_name: 'Dr. Sarah Patel',
        diagnosis: 'Atrial Fibrillation – rate controlled; Osteoporosis – stable',
        treatment: 'Warfarin therapy continued. Calcium and Vitamin D supplementation. Fall prevention programme.',
        prescriptions: ['Warfarin 3mg daily', 'Bisoprolol 2.5mg daily', 'Calcium/Vitamin D 500mg/400IU daily'],
        notes: 'INR 2.4 – within therapeutic range. Bone density scan booked.',
        vitals: { bloodPressure: '132/80', heartRate: 72, temperature: 36.5, weight: 63 },
      },
      {
        clinic_id: clinicId, patient_id: pid['William Foster'],
        date: oneMonthAgo, doctor_name: 'Dr. Michael Brown',
        diagnosis: 'COPD – moderate exacerbation; Chronic Heart Failure – compensated',
        treatment: 'Prednisolone 5-day course. Salbutamol and Tiotropium continued. Fluid restriction 1.5L/day.',
        prescriptions: ['Salbutamol inhaler 100mcg PRN', 'Tiotropium 18mcg daily', 'Furosemide 40mg daily'],
        notes: 'O2 sats 94% on air at discharge. Monitor for further exacerbations.',
        vitals: { bloodPressure: '144/88', heartRate: 88, temperature: 37.2, weight: 81 },
      },
      {
        clinic_id: clinicId, patient_id: pid['Elsie Morgan'],
        date: twoWeeksAgo, doctor_name: 'Dr. James Wilson',
        diagnosis: 'Type 2 Diabetes – suboptimally controlled (HbA1c 58 mmol/mol)',
        treatment: 'Metformin dose increased. Dietary review arranged. Blood glucose monitoring twice daily.',
        prescriptions: ['Metformin 1000mg twice daily', 'Gliclazide 80mg daily', 'Ramipril 5mg daily'],
        notes: 'Weight increased 2kg. Dietitian referral made.',
        vitals: { bloodPressure: '148/92', heartRate: 82, temperature: 36.7, weight: 76 },
      },
      {
        clinic_id: clinicId, patient_id: pid['Arthur Bennett'],
        date: yesterday, doctor_name: 'Dr. Sarah Patel',
        diagnosis: 'Post-ischaemic stroke – improving neurological function',
        treatment: 'Clopidogrel and Atorvastatin continued. Speech therapy ongoing. OT assessment completed.',
        prescriptions: ['Clopidogrel 75mg daily', 'Atorvastatin 40mg daily', 'Ramipril 2.5mg daily'],
        notes: 'Left-sided weakness improving. Independent with walking frame. Speech significantly improved.',
        vitals: { bloodPressure: '130/78', heartRate: 70, temperature: 36.4, weight: 68 },
      },
      {
        clinic_id: clinicId, patient_id: pid['Violet Hughes'],
        date: twoWeeksAgo, doctor_name: 'Dr. Sarah Patel',
        diagnosis: "Alzheimer's Disease – moderate stage with behavioural symptoms",
        treatment: 'Memantine initiated. Structured daily routine reinforced. Carer support plan reviewed.',
        prescriptions: ['Memantine 10mg daily', 'Rivastigmine 6mg twice daily'],
        notes: 'Increased agitation in evenings. Low-stimulation bedtime routine recommended.',
        vitals: { bloodPressure: '126/76', heartRate: 76, temperature: 36.6, weight: 55 },
      },
      {
        clinic_id: clinicId, patient_id: pid['Frederick Lawson'],
        date: twoDaysAgo, doctor_name: 'Dr. Michael Brown',
        diagnosis: 'Chronic Kidney Disease Stage 3b – stable; Iron-deficiency Anaemia',
        treatment: 'Ferrous sulphate supplementation. Protein-restricted diet. Monthly eGFR monitoring.',
        prescriptions: ['Ferrous Sulphate 200mg twice daily', 'Erythropoietin 4000IU weekly injection'],
        notes: 'eGFR 32. Haemoglobin improving. No dialysis indicated at present.',
        vitals: { bloodPressure: '142/86', heartRate: 78, temperature: 36.5, weight: 74 },
      },
    ])
    .select();
  if (recordsErr) throw recordsErr;
  console.log(`✓ Created ${records.length} medical records`);

  // ── 9. Medications ─────────────────────────────────────────────────────────
  const { data: medications, error: medsErr } = await supabase
    .from('medications')
    .insert([
      { clinic_id: clinicId, patient_id: pid['Margaret Thompson'], name: 'Donepezil',           dosage: '10mg',     frequency: 'Once daily',        route: 'oral',    prescribing_doctor: 'Dr. Sarah Patel',  start_date: '2025-06-01', status: 'active' },
      { clinic_id: clinicId, patient_id: pid['Margaret Thompson'], name: 'Amlodipine',          dosage: '5mg',      frequency: 'Once daily',        route: 'oral',    prescribing_doctor: 'Dr. Sarah Patel',  start_date: '2024-01-15', status: 'active', instructions: 'Take in the morning' },
      { clinic_id: clinicId, patient_id: pid['George Harrison'],   name: 'Levodopa/Carbidopa',  dosage: '100/25mg', frequency: 'Three times daily', route: 'oral',    prescribing_doctor: 'Dr. James Wilson',  start_date: '2024-03-01', status: 'active', instructions: 'Take 30 minutes before meals' },
      { clinic_id: clinicId, patient_id: pid['George Harrison'],   name: 'Ropinirole',          dosage: '2mg',      frequency: 'Once daily',        route: 'oral',    prescribing_doctor: 'Dr. James Wilson',  start_date: '2025-09-01', status: 'active', instructions: 'Take with food to reduce nausea' },
      { clinic_id: clinicId, patient_id: pid['Dorothy Clarke'],    name: 'Warfarin',            dosage: '3mg',      frequency: 'Once daily',        route: 'oral',    prescribing_doctor: 'Dr. Sarah Patel',  start_date: '2024-05-10', status: 'active', instructions: 'INR monitoring required weekly' },
      { clinic_id: clinicId, patient_id: pid['Dorothy Clarke'],    name: 'Bisoprolol',          dosage: '2.5mg',    frequency: 'Once daily',        route: 'oral',    prescribing_doctor: 'Dr. Sarah Patel',  start_date: '2024-05-10', status: 'active' },
      { clinic_id: clinicId, patient_id: pid['William Foster'],    name: 'Salbutamol',          dosage: '100mcg',   frequency: 'As needed (PRN)',   route: 'inhaled', prescribing_doctor: 'Dr. Michael Brown', start_date: '2023-11-01', status: 'active', instructions: 'Max 4 puffs per dose. Use spacer device.' },
      { clinic_id: clinicId, patient_id: pid['William Foster'],    name: 'Furosemide',          dosage: '40mg',     frequency: 'Once daily',        route: 'oral',    prescribing_doctor: 'Dr. Michael Brown', start_date: '2024-02-01', status: 'active', instructions: 'Take in the morning. Monitor fluid balance daily.' },
      { clinic_id: clinicId, patient_id: pid['Elsie Morgan'],      name: 'Metformin',           dosage: '1000mg',   frequency: 'Twice daily',       route: 'oral',    prescribing_doctor: 'Dr. James Wilson',  start_date: '2025-01-15', status: 'active', instructions: 'Take with food' },
      { clinic_id: clinicId, patient_id: pid['Elsie Morgan'],      name: 'Gliclazide',          dosage: '80mg',     frequency: 'Once daily',        route: 'oral',    prescribing_doctor: 'Dr. James Wilson',  start_date: '2025-01-15', status: 'active', instructions: 'Take with breakfast' },
      { clinic_id: clinicId, patient_id: pid['Arthur Bennett'],    name: 'Clopidogrel',         dosage: '75mg',     frequency: 'Once daily',        route: 'oral',    prescribing_doctor: 'Dr. Sarah Patel',  start_date: '2025-08-01', status: 'active' },
      { clinic_id: clinicId, patient_id: pid['Arthur Bennett'],    name: 'Atorvastatin',        dosage: '40mg',     frequency: 'Once daily at night', route: 'oral', prescribing_doctor: 'Dr. Sarah Patel',  start_date: '2025-08-01', status: 'active' },
      { clinic_id: clinicId, patient_id: pid['Violet Hughes'],     name: 'Memantine',           dosage: '10mg',     frequency: 'Twice daily',       route: 'oral',    prescribing_doctor: 'Dr. Sarah Patel',  start_date: '2025-11-01', status: 'active', instructions: 'Administer with water. Mix with food if patient refuses.' },
      { clinic_id: clinicId, patient_id: pid['Violet Hughes'],     name: 'Rivastigmine',        dosage: '6mg',      frequency: 'Twice daily',       route: 'oral',    prescribing_doctor: 'Dr. Sarah Patel',  start_date: '2025-05-01', status: 'active', instructions: 'Take with morning and evening meals' },
      { clinic_id: clinicId, patient_id: pid['Frederick Lawson'],  name: 'Ferrous Sulphate',    dosage: '200mg',    frequency: 'Twice daily',       route: 'oral',    prescribing_doctor: 'Dr. Michael Brown', start_date: '2025-12-01', status: 'active', instructions: 'Take on empty stomach if tolerated. May cause constipation.' },
    ])
    .select();
  if (medsErr) throw medsErr;
  console.log(`✓ Created ${medications.length} medications`);

  // ── 10. Medication Logs ────────────────────────────────────────────────────
  const m = {};
  for (const med of medications) {
    if (!m[med.patient_id]) m[med.patient_id] = [];
    m[med.patient_id].push(med);
  }

  const { data: medLogs, error: medLogsErr } = await supabase
    .from('medication_logs')
    .insert([
      // Yesterday – fully documented
      { clinic_id: clinicId, medication_id: medications[0].id,  patient_id: pid['Margaret Thompson'], date: yesterday, time: '08:00', given_by: 'Benedict Clarke', notes: 'Taken without difficulty', refused: false },
      { clinic_id: clinicId, medication_id: medications[1].id,  patient_id: pid['Margaret Thompson'], date: yesterday, time: '08:05', given_by: 'Benedict Clarke', refused: false },
      { clinic_id: clinicId, medication_id: medications[2].id,  patient_id: pid['George Harrison'],   date: yesterday, time: '07:30', given_by: 'Benedict Clarke', notes: 'Morning dose given before breakfast', refused: false },
      { clinic_id: clinicId, medication_id: medications[3].id,  patient_id: pid['George Harrison'],   date: yesterday, time: '07:35', given_by: 'Benedict Clarke', refused: false },
      { clinic_id: clinicId, medication_id: medications[4].id,  patient_id: pid['Dorothy Clarke'],    date: yesterday, time: '08:15', given_by: 'Benedict Clarke', refused: false },
      { clinic_id: clinicId, medication_id: medications[5].id,  patient_id: pid['Dorothy Clarke'],    date: yesterday, time: '08:20', given_by: 'Benedict Clarke', refused: false },
      { clinic_id: clinicId, medication_id: medications[7].id,  patient_id: pid['William Foster'],    date: yesterday, time: '07:45', given_by: 'Benedict Clarke', notes: 'Fluid intake monitored post-administration', refused: false },
      { clinic_id: clinicId, medication_id: medications[8].id,  patient_id: pid['Elsie Morgan'],      date: yesterday, time: '08:00', given_by: 'Benedict Clarke', notes: 'Taken with breakfast', refused: false },
      { clinic_id: clinicId, medication_id: medications[9].id,  patient_id: pid['Elsie Morgan'],      date: yesterday, time: '08:05', given_by: 'Benedict Clarke', refused: false },
      { clinic_id: clinicId, medication_id: medications[10].id, patient_id: pid['Arthur Bennett'],    date: yesterday, time: '08:10', given_by: 'Benedict Clarke', refused: false },
      { clinic_id: clinicId, medication_id: medications[12].id, patient_id: pid['Violet Hughes'],     date: yesterday, time: '08:30', given_by: 'Benedict Clarke', notes: 'Mixed with yoghurt as per care plan', refused: false },
      { clinic_id: clinicId, medication_id: medications[14].id, patient_id: pid['Frederick Lawson'],  date: yesterday, time: '08:00', given_by: 'Benedict Clarke', refused: false },
      // Today – only some logged (rest pending, will show in notification alerts)
      { clinic_id: clinicId, medication_id: medications[0].id,  patient_id: pid['Margaret Thompson'], date: today, time: '08:00', given_by: 'Benedict Clarke', refused: false },
      { clinic_id: clinicId, medication_id: medications[2].id,  patient_id: pid['George Harrison'],   date: today, time: '07:30', given_by: 'Benedict Clarke', notes: 'Morning dose', refused: false },
      { clinic_id: clinicId, medication_id: medications[10].id, patient_id: pid['Arthur Bennett'],    date: today, time: '08:10', given_by: 'Benedict Clarke', refused: false },
      // One refusal
      { clinic_id: clinicId, medication_id: medications[13].id, patient_id: pid['Violet Hughes'],     date: today, time: '08:30', given_by: 'Benedict Clarke', notes: 'Patient refused – spat out medication. Second attempt unsuccessful. GP informed.', refused: true },
    ])
    .select();
  if (medLogsErr) throw medLogsErr;
  console.log(`✓ Created ${medLogs.length} medication logs`);

  // ── 11. Incidents ──────────────────────────────────────────────────────────
  const { data: incidents, error: incidentsErr } = await supabase
    .from('incidents')
    .insert([
      {
        clinic_id: clinicId, patient_id: pid['Margaret Thompson'],
        reported_by: 'Benedict Clarke', reported_by_id: benedictUser.id,
        date: today, time: '06:45',
        incident_type: 'fall', location: 'Room 4 – Bathroom',
        description: 'Resident found on bathroom floor at 06:45. She had attempted to get up independently during the night. No head injury observed. Superficial bruising to left hip.',
        immediate_action: 'Resident assisted back to bed. Full body assessment performed. GP contacted and on-call doctor notified. Family called at 07:15.',
        witnesses: 'Night carer Priya Shah',
        severity: 'critical', follow_up: true,
        follow_up_notes: 'X-ray required to rule out hip fracture. Bed rails and pressure mat to be fitted. Hip padding assessment.',
        status: 'open',
      },
      {
        clinic_id: clinicId, patient_id: pid['William Foster'],
        reported_by: 'Benedict Clarke', reported_by_id: benedictUser.id,
        date: yesterday, time: '14:20',
        incident_type: 'medication_error', location: 'Room 8 – Bedroom',
        description: 'Morning Furosemide dose was administered twice due to a handover miscommunication between the day and night shift.',
        immediate_action: 'GP informed immediately. Fluid balance monitoring increased to hourly. Blood pressure checks every 2 hours. No adverse effects observed within 6 hours.',
        witnesses: '',
        severity: 'high', follow_up: true,
        follow_up_notes: 'Medication administration protocol to be reviewed at next team meeting. Double-sign-off system to be implemented.',
        status: 'under_review',
        internal_notes: 'Pharmacist consulted. No lasting harm but medication protocol needs urgent review. Scheduled for team debrief 2026-02-25.',
      },
      {
        clinic_id: clinicId, patient_id: pid['Violet Hughes'],
        reported_by: 'Ben Adams', reported_by_id: bennyUser.id,
        date: oneMonthAgo, time: '19:15',
        incident_type: 'safeguarding', location: 'Main Corridor',
        description: 'Resident found wandering in corridor at 19:15. She appeared confused and distressed, was unable to identify herself or return to her room unassisted.',
        immediate_action: 'Resident safely escorted back to room. Reassured and settled with familiar music. Family notified. Safeguarding protocol initiated as per policy.',
        witnesses: '',
        severity: 'medium', follow_up: true,
        follow_up_notes: 'Door sensor and GPS bracelet to be fitted. Evening check schedule increased to every 30 minutes.',
        status: 'resolved',
        internal_notes: 'All actions completed. Door sensor installed 2026-01-28. GPS bracelet fitted 2026-01-30. Family satisfied with response and updated measures.',
      },
      {
        clinic_id: clinicId, patient_id: pid['Elsie Morgan'],
        reported_by: 'Ben Adams', reported_by_id: bennyUser.id,
        date: twoWeeksAgo, time: '10:30',
        incident_type: 'behavioural', location: 'Day Room',
        description: 'Resident became verbally aggressive with another resident during a group activity. No physical contact made. Both residents were distressed briefly.',
        immediate_action: 'Resident was calmly redirected to her room. De-escalation techniques used successfully. Both residents settled within 20 minutes.',
        witnesses: 'Activity coordinator Jane Park',
        severity: 'low', follow_up: false,
        status: 'resolved',
        internal_notes: 'Reviewed by manager. Seating arrangement in day room adjusted to reduce triggers. No further incidents since.',
      },
      {
        clinic_id: clinicId, patient_id: pid['George Harrison'],
        reported_by: 'Benedict Clarke', reported_by_id: benedictUser.id,
        date: oneWeekAgo, time: '11:00',
        incident_type: 'near_miss', location: 'Dining Room',
        description: 'Resident nearly choked on a piece of food during lunch. Quick intervention by carer prevented a serious incident.',
        immediate_action: 'Back blows administered. Resident recovered fully within 2 minutes. SALT referral made for swallowing assessment.',
        witnesses: 'Carer Maria Santos',
        severity: 'medium', follow_up: true,
        follow_up_notes: 'SALT assessment booked for next week. Soft diet to be trialled pending assessment. All staff reminded of choking protocol.',
        status: 'under_review',
        internal_notes: 'SALT appointment confirmed 2026-02-28. Diet texture to be reassessed.',
      },
    ])
    .select();
  if (incidentsErr) throw incidentsErr;
  console.log(`✓ Created ${incidents.length} incidents (1 critical open)`);

  // ── 12. Care Plans ─────────────────────────────────────────────────────────
  const { data: carePlans, error: cpErr } = await supabase
    .from('care_plans')
    .insert([
      {
        clinic_id: clinicId, patient_id: pid['Margaret Thompson'],
        title: 'Dementia Care & Safety Plan',
        description: "Comprehensive care plan addressing Margaret's safety, cognitive stimulation, and daily living needs.",
        goals: ['Maintain daily orientation and reduce anxiety episodes', 'Prevent falls and ensure safe mobility', 'Support family engagement in care'],
        carer_name: 'Benedict Clarke',
        status: 'active', start_date: '2026-01-01',
        notes: 'Review monthly. Liaise with family weekly.',
      },
      {
        clinic_id: clinicId, patient_id: pid['William Foster'],
        title: 'COPD & Heart Failure Management Plan',
        description: "Structured plan to manage William's complex respiratory and cardiac conditions and prevent acute episodes.",
        goals: ['Maintain oxygen saturation above 92%', 'Monitor and manage fluid retention', 'Prevent COPD exacerbations through early intervention'],
        carer_name: 'Ben Adams',
        status: 'active', start_date: '2025-11-01',
        notes: 'Daily weight monitoring. Alert GP if weight increases >2kg in 3 days.',
      },
      {
        clinic_id: clinicId, patient_id: pid['Arthur Bennett'],
        title: 'Post-Stroke Rehabilitation Plan',
        description: "Recovery and rehabilitation plan following Arthur's ischaemic stroke in July 2025.",
        goals: ['Restore independent mobility with walking frame', 'Improve speech and communication', 'Regain independence in personal care'],
        carer_name: 'Benedict Clarke',
        status: 'active', start_date: '2025-08-15',
        notes: 'Physiotherapy Tues & Thurs. Speech therapy Mon & Wed.',
      },
      {
        clinic_id: clinicId, patient_id: pid['Elsie Morgan'],
        title: 'Diabetes & Vascular Dementia Care Plan',
        description: "Plan to manage Elsie's diabetes safely alongside cognitive decline.",
        goals: ['Maintain blood glucose between 6–10 mmol/L', 'Ensure adequate fluid and nutritional intake', 'Reduce risk of hypoglycaemic episodes'],
        carer_name: 'Ben Adams',
        status: 'active', start_date: '2025-02-01',
        notes: 'Blood glucose before breakfast and before evening meal.',
      },
    ])
    .select();
  if (cpErr) throw cpErr;
  console.log(`✓ Created ${carePlans.length} care plans`);

  // Care plan tasks
  const tasks = [];
  for (const cp of carePlans) {
    if (cp.patient_id === pid['Margaret Thompson']) {
      tasks.push(
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Complete wandering risk assessment', status: 'completed', due_date: '2026-01-15' },
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Install bed pressure sensor and door alarm', status: 'completed', due_date: '2026-01-20' },
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Schedule cognitive stimulation therapy sessions', status: 'in-progress', due_date: '2026-02-28' },
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Monthly family care conference', status: 'pending', due_date: '2026-03-01' },
      );
    } else if (cp.patient_id === pid['William Foster']) {
      tasks.push(
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Set up daily weight monitoring chart', status: 'completed', due_date: '2025-11-10' },
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Respiratory physiotherapy referral', status: 'completed', due_date: '2025-11-15' },
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Fluid restriction staff education session', status: 'in-progress', due_date: '2026-02-28' },
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Pulse oximeter procurement for room', status: 'completed', due_date: '2025-12-01' },
      );
    } else if (cp.patient_id === pid['Arthur Bennett']) {
      tasks.push(
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Physiotherapy assessment and schedule', status: 'completed', due_date: '2025-08-20' },
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Speech and language therapy referral', status: 'completed', due_date: '2025-08-25' },
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Occupational therapy home adaptation review', status: 'in-progress', due_date: '2026-02-25' },
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Social activities reintegration plan', status: 'pending', due_date: '2026-03-15' },
      );
    } else if (cp.patient_id === pid['Elsie Morgan']) {
      tasks.push(
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Blood glucose monitoring protocol in place', status: 'completed', due_date: '2025-02-15' },
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Dietitian assessment for diabetes meal plan', status: 'completed', due_date: '2025-03-01' },
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Review fluid intake targets and monitoring', status: 'in-progress', due_date: '2026-03-01' },
      );
    }
  }
  const { error: tasksErr } = await supabase.from('care_plan_tasks').insert(tasks);
  if (tasksErr) throw tasksErr;
  console.log(`✓ Created ${tasks.length} care plan tasks`);

  // ── 13. Daily Care Records ─────────────────────────────────────────────────
  const { data: dailyCare, error: dailyCareErr } = await supabase
    .from('daily_care_records')
    .insert([
      {
        clinic_id: clinicId, patient_id: pid['Margaret Thompson'],
        date: today, carer_name: 'Benedict Clarke',
        meals: { breakfast: { eaten: true, notes: 'Ate porridge well' }, lunch: { eaten: false, notes: 'Refused lunch – distressed after morning incident' }, dinner: { eaten: true, notes: '' }, snacks: 'Biscuits at 15:00', fluids_ml: 950 },
        personal_care: { bathing: true, grooming: true, dressing: true, oral_care: true, notes: 'Required prompting for all tasks' },
        mood_score: 2, mood_notes: 'Agitated in the morning following fall. Settled with music therapy by 10am. Family visit improved mood.',
        activity: 'Music therapy group session, 1:1 reminiscence activity with carer',
        incidents: 'See incident report: fall in bathroom at 06:45',
        notes: 'Busy day. Fall incident this morning. Son visited 14:00–16:00.',
      },
      {
        clinic_id: clinicId, patient_id: pid['George Harrison'],
        date: today, carer_name: 'Benedict Clarke',
        meals: { breakfast: { eaten: true, notes: '' }, lunch: { eaten: true, notes: 'Good appetite' }, dinner: { eaten: false, notes: '' }, snacks: '', fluids_ml: 1200 },
        personal_care: { bathing: false, grooming: true, dressing: true, oral_care: true, notes: 'Bath scheduled for tomorrow' },
        mood_score: 4, mood_notes: 'Good mood, participated well in activities',
        activity: 'Morning exercise group, newspaper reading in lounge',
        incidents: '',
        notes: 'Tremor noticeably worse today. Physio informed and appointment brought forward.',
      },
      {
        clinic_id: clinicId, patient_id: pid['Dorothy Clarke'],
        date: today, carer_name: 'Ben Adams',
        meals: { breakfast: { eaten: true, notes: '' }, lunch: { eaten: true, notes: '' }, dinner: { eaten: true, notes: 'Enjoyed roast dinner' }, snacks: 'Tea and cake at afternoon social', fluids_ml: 1400 },
        personal_care: { bathing: true, grooming: true, dressing: true, oral_care: true, notes: '' },
        mood_score: 5, mood_notes: 'Bright and very sociable today',
        activity: 'Afternoon social club, craft activity, 20-minute walk in garden',
        incidents: '',
        notes: 'Good day overall. No concerns.',
      },
      {
        clinic_id: clinicId, patient_id: pid['William Foster'],
        date: today, carer_name: 'Ben Adams',
        meals: { breakfast: { eaten: true, notes: 'Half portion only' }, lunch: { eaten: true, notes: '' }, dinner: { eaten: false, notes: 'Too tired to eat at dinner' }, snacks: '', fluids_ml: 1500 },
        personal_care: { bathing: false, grooming: true, dressing: true, oral_care: true, notes: 'Bath declined – too breathless on exertion' },
        mood_score: 3, mood_notes: 'Quiet and tired, not distressed',
        activity: 'Reading in room, TV',
        incidents: '',
        notes: 'Weight 81.2kg (up 0.2kg from yesterday). O2 sats 93%. GP informed and monitoring.',
      },
      {
        clinic_id: clinicId, patient_id: pid['Margaret Thompson'],
        date: yesterday, carer_name: 'Benedict Clarke',
        meals: { breakfast: { eaten: true, notes: 'Full breakfast' }, lunch: { eaten: true, notes: '' }, dinner: { eaten: true, notes: '' }, snacks: 'Fruit and biscuits', fluids_ml: 1100 },
        personal_care: { bathing: true, grooming: true, dressing: true, oral_care: true, notes: 'Bath day – went well with gentle reassurance' },
        mood_score: 4, mood_notes: 'Generally settled. Brief confusion episode 15:30 – resolved within 10 minutes.',
        activity: 'Gardening group, walking in garden with carer',
        incidents: '',
        notes: 'Good day. Son called in the evening.',
      },
      {
        clinic_id: clinicId, patient_id: pid['Elsie Morgan'],
        date: yesterday, carer_name: 'Ben Adams',
        meals: { breakfast: { eaten: false, notes: 'Refused breakfast' }, lunch: { eaten: true, notes: '' }, dinner: { eaten: true, notes: 'Good appetite at dinner' }, snacks: 'Hot chocolate at 20:00', fluids_ml: 800 },
        personal_care: { bathing: false, grooming: true, dressing: true, oral_care: false, notes: 'Refused oral care – will try again at next opportunity' },
        mood_score: 2, mood_notes: 'Low mood and irritable throughout the day. No identifiable cause.',
        activity: 'Watched TV in room, brief garden visit at 16:00',
        incidents: '',
        notes: 'Fluids below target (min 1000ml). Blood glucose 9.8 mmol/L before dinner. Will monitor closely.',
      },
      {
        clinic_id: clinicId, patient_id: pid['Violet Hughes'],
        date: yesterday, carer_name: 'Benedict Clarke',
        meals: { breakfast: { eaten: true, notes: '' }, lunch: { eaten: false, notes: 'Refused lunch – confused about meal time' }, dinner: { eaten: true, notes: 'Ate well with encouragement' }, snacks: 'Banana 15:30', fluids_ml: 900 },
        personal_care: { bathing: false, grooming: true, dressing: true, oral_care: true, notes: '' },
        mood_score: 3, mood_notes: 'Variable mood. Confused at times but settled in evening.',
        activity: 'Music in room, short walk in corridor',
        incidents: '',
        notes: 'Evening agitation noted. Low-stimulation routine followed. Settled by 20:30.',
      },
      {
        clinic_id: clinicId, patient_id: pid['Frederick Lawson'],
        date: yesterday, carer_name: 'Ben Adams',
        meals: { breakfast: { eaten: true, notes: '' }, lunch: { eaten: true, notes: '' }, dinner: { eaten: true, notes: '' }, snacks: '', fluids_ml: 1300 },
        personal_care: { bathing: true, grooming: true, dressing: true, oral_care: true, notes: 'Shower day – independent with supervision' },
        mood_score: 4, mood_notes: 'Cheerful. Chatted about family.',
        activity: 'Reading, TV sports programme, crossword',
        incidents: '',
        notes: 'Good fluid intake. Urine output normal. No oedema noted.',
      },
    ])
    .select();
  if (dailyCareErr) throw dailyCareErr;
  console.log(`✓ Created ${dailyCare.length} daily care records`);

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n✅ Seed complete!\n');
  console.log(`   Clinic:              Sunrise Care Home (${clinicId})`);
  console.log(`   Patients:            ${patients.length}`);
  console.log(`   Appointments:        ${appointments.length}`);
  console.log(`   Medical Records:     ${records.length}`);
  console.log(`   Medications:         ${medications.length}`);
  console.log(`   Medication Logs:     ${medLogs.length} (includes 1 refusal)`);
  console.log(`   Incidents:           ${incidents.length} (1 critical open, 1 high under review)`);
  console.log(`   Care Plans:          ${carePlans.length} (with ${tasks.length} tasks)`);
  console.log(`   Daily Care Records:  ${dailyCare.length}`);
  console.log('\n   Login: benny102811@gmail.com → admin');
  console.log('   Login: benedict2811@gmail.com → carer');
}

seed().catch(err => {
  console.error('\n❌ Seed failed:', err.message ?? err);
  process.exit(1);
});
