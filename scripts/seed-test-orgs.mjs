// scripts/seed-test-orgs.mjs
// Seeds two fully isolated organisations for multi-tenancy testing.
// Run with: node scripts/seed-test-orgs.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hxgzckniqpilupboowek.supabase.co'
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4Z3pja25pcXBpbHVwYm9vd2VrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQ5NzgwNSwiZXhwIjoyMDg3MDczODA1fQ.B7_OIo_M0rSdnjRhuTISa8txFTsK_dWetI9BWm1GWQg'
const PASSWORD     = 'Carevity2026!'

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// 2026-02-16 → 2026-02-22
const DATES = Array.from({ length: 7 }, (_, i) => {
  const d = new Date('2026-02-22')
  d.setDate(d.getDate() - (6 - i))
  return d.toISOString().split('T')[0]
})

// ─── helpers ────────────────────────────────────────────────────────────────

function die(res, ctx) {
  if (res.error) throw new Error(`[${ctx}] ${res.error.message}`)
  return res.data
}

async function createUser(email, name, clinicId = null, clinicName = null) {
  const meta = {
    full_name: name,
    needs_onboarding: false,
    ...(clinicId ? { clinic_id: clinicId, clinic_name: clinicName, clinic_is_active: true } : {}),
  }
  const res = await sb.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true, user_metadata: meta,
  })
  return die(res, `createUser ${email}`).user
}

async function patchUserClinic(uid, clinicId, clinicName) {
  die(
    await sb.auth.admin.updateUserById(uid, {
      user_metadata: { clinic_id: clinicId, clinic_name: clinicName, clinic_is_active: true, needs_onboarding: false },
    }),
    `patchUser ${uid}`,
  )
}

async function profile(uid, name, email, clinicId, role, jobTitle, phone) {
  die(
    await sb.from('profiles').upsert({
      id: uid, full_name: name, email, clinic_id: clinicId,
      role, job_title: jobTitle, phone, is_onboarded: true,
    }),
    `profile ${email}`,
  )
}

async function ins(table, data, ctx) {
  return die(await sb.from(table).insert(data).select().single(), ctx || table)
}

async function batch(table, rows, ctx) {
  if (!rows.length) return []
  return die(await sb.from(table).insert(rows).select(), ctx || table)
}

// Returns the log times for a medication based on its frequency string
function medTimes(freq) {
  const f = freq.toLowerCase()
  if (f.includes('three times') || (freq.includes('1pm') && freq.includes('6pm')))
    return ['08:00', '13:00', '18:00']
  if (f.includes('twice')) return ['08:00', '18:00']
  if (f.includes('bedtime') || f.includes('night')) return ['21:00']
  if (f.includes('as required')) return ['10:00'] // simplified PRN — one log per day
  return ['08:00']
}

// ─── main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Seeding multi-tenancy test data…\n')

  // ===========================================================================
  // ORG 1 — SUNFIELD CARE HOME
  // ===========================================================================
  console.log('── Sunfield Care Home ─────────────────────────────────────────')

  // Admin user created first (no clinic_id yet — chicken-and-egg)
  const sarah = await createUser('sarah.mitchell@sunfieldcare.co.uk', 'Sarah Mitchell')

  const sunfield = die(
    await sb.from('clinics').insert({
      name: 'Sunfield Care Home',
      owner_id: sarah.id,
      address: '15 Meadow Lane, Birmingham, B12 9TP',
      phone: '0121 456 7890',
      email: 'admin@sunfieldcare.co.uk',
      subscription_tier: 'professional',
      is_active: true,
    }).select().single(),
    'sunfield clinic',
  )
  const S = sunfield.id

  await patchUserClinic(sarah.id, S, 'Sunfield Care Home')
  await profile(sarah.id, 'Sarah Mitchell', 'sarah.mitchell@sunfieldcare.co.uk', S, 'admin',   'Care Home Manager',       '07700 900001')
  console.log('  ✓ Sarah Mitchell  (admin)')

  const james = await createUser('james.turner@sunfieldcare.co.uk', 'James Turner', S, 'Sunfield Care Home')
  await profile(james.id, 'James Turner', 'james.turner@sunfieldcare.co.uk', S, 'manager', 'Senior Care Coordinator',  '07700 900002')
  console.log('  ✓ James Turner    (manager)')

  const lucy = await createUser('lucy.adams@sunfieldcare.co.uk', 'Lucy Adams', S, 'Sunfield Care Home')
  await profile(lucy.id, 'Lucy Adams', 'lucy.adams@sunfieldcare.co.uk', S, 'carer', 'Senior Care Assistant', '07700 900003')
  console.log('  ✓ Lucy Adams      (carer)')

  // ── Patients ────────────────────────────────────────────────────────────────
  const sfPts = await batch('patients', [
    {
      clinic_id: S, first_name: 'Margaret', last_name: 'Wilson',
      email: 'margaret.wilson@nextofkin.co.uk', phone: '01214500001',
      date_of_birth: '1942-03-15', gender: 'female',
      address: 'Room 7, Sunfield Care Home, 15 Meadow Lane, Birmingham',
      blood_type: 'A+', allergies: ['Penicillin'],
      medical_conditions: ["Alzheimer's Disease", 'Type 2 Diabetes'],
      emergency_contact_name: 'Robert Wilson', emergency_contact_phone: '07811 111001',
      emergency_contact_relationship: 'Son',
    },
    {
      clinic_id: S, first_name: 'Albert', last_name: 'Thompson',
      email: 'albert.thompson@nextofkin.co.uk', phone: '01214500002',
      date_of_birth: '1947-08-22', gender: 'male',
      address: 'Room 12, Sunfield Care Home, 15 Meadow Lane, Birmingham',
      blood_type: 'O+', allergies: ['Sulfonamides'],
      medical_conditions: ['COPD', 'Congestive Heart Failure'],
      emergency_contact_name: 'Patricia Thompson', emergency_contact_phone: '07811 111002',
      emergency_contact_relationship: 'Wife',
    },
    {
      clinic_id: S, first_name: 'Dorothy', last_name: 'Jenkins',
      email: 'dorothy.jenkins@nextofkin.co.uk', phone: '01214500003',
      date_of_birth: '1935-01-07', gender: 'female',
      address: 'Room 3, Sunfield Care Home, 15 Meadow Lane, Birmingham',
      blood_type: 'B+', allergies: [],
      medical_conditions: ['Vascular Dementia', 'Osteoporosis', 'High Falls Risk'],
      emergency_contact_name: 'Carol Jenkins', emergency_contact_phone: '07811 111003',
      emergency_contact_relationship: 'Daughter',
    },
    {
      clinic_id: S, first_name: 'Harold', last_name: 'Simmons',
      email: 'harold.simmons@nextofkin.co.uk', phone: '01214500004',
      date_of_birth: '1949-11-03', gender: 'male',
      address: 'Room 9, Sunfield Care Home, 15 Meadow Lane, Birmingham',
      blood_type: 'AB-', allergies: ['Aspirin'],
      medical_conditions: ["Parkinson's Disease", 'Hypertension'],
      emergency_contact_name: 'Anne Simmons', emergency_contact_phone: '07811 111004',
      emergency_contact_relationship: 'Daughter',
    },
    {
      clinic_id: S, first_name: 'Evelyn', last_name: 'Clarke',
      email: 'evelyn.clarke@nextofkin.co.uk', phone: '01214500005',
      date_of_birth: '1938-06-19', gender: 'female',
      address: 'Room 15, Sunfield Care Home, 15 Meadow Lane, Birmingham',
      blood_type: 'O-', allergies: ['Latex'],
      medical_conditions: ['Ischaemic Stroke (2024)', 'Depression', 'Left-sided Weakness'],
      emergency_contact_name: 'Michael Clarke', emergency_contact_phone: '07811 111005',
      emergency_contact_relationship: 'Husband',
    },
  ], 'sf patients')
  console.log(`  ✓ ${sfPts.length} patients`)

  const [margaret, albert, dorothy, harold, evelyn] = sfPts

  // Assign all Sunfield patients to Lucy
  await batch('staff_patient_assignments',
    sfPts.map(p => ({ clinic_id: S, staff_id: lucy.id, patient_id: p.id })),
    'sf assignments',
  )

  // ── Care plans ──────────────────────────────────────────────────────────────
  const sfPlans = await batch('care_plans', [
    {
      clinic_id: S, patient_id: margaret.id,
      title: 'Dementia & Diabetes Management Plan',
      description: 'Holistic care plan addressing cognitive decline and blood glucose management.',
      goals: ['Maintain a safe environment', 'Monitor blood glucose before each meal', 'Encourage social engagement daily', 'Prevent falls and wandering'],
      carer_name: 'Lucy Adams', status: 'active', start_date: '2026-01-10',
      notes: "Margaret responds well to familiar music and reminiscence activities. Confusion peaks in late afternoon (sundowning). Family visit every Sunday afternoon.",
    },
    {
      clinic_id: S, patient_id: albert.id,
      title: 'Respiratory & Cardiac Care Plan',
      description: 'Care plan focusing on respiratory function, cardiac monitoring, and breathlessness management.',
      goals: ['Monitor O2 saturation morning and evening', 'Manage breathlessness during activity', 'Low-sodium diet adherence', 'Daily weight monitoring — alert GP if >2kg gain in 24h'],
      carer_name: 'Lucy Adams', status: 'active', start_date: '2026-01-15',
      notes: 'Albert uses supplemental oxygen at night (2L/min). Avoid strenuous activity. Notify GP immediately if O2 sat drops below 92%.',
    },
    {
      clinic_id: S, patient_id: dorothy.id,
      title: 'Dementia & Falls Prevention Plan',
      description: 'Person-centred dementia care with structured falls prevention interventions.',
      goals: ['Prevent falls — hourly observations', 'Maintain continence with regular toileting schedule', 'Encourage nutrition and hydration', 'Promote dignity and independence in personal care'],
      carer_name: 'Lucy Adams', status: 'active', start_date: '2026-01-08',
      notes: 'Dorothy is at HIGH RISK of falls. Bed and chair sensor alarms in place. Requires 2-person assist for all transfers. DOLS authorisation in place. Wandering risk — ensure all exit doors secured.',
    },
    {
      clinic_id: S, patient_id: harold.id,
      title: "Parkinson's Disease Management Plan",
      description: "Structured care to manage Parkinson's symptoms and maintain quality of life.",
      goals: ['Parkinson\'s medication administered strictly on time — NEVER delay', 'Physiotherapy exercises twice daily', 'Monitor swallowing ability', 'Blood pressure management'],
      carer_name: 'Lucy Adams', status: 'active', start_date: '2026-01-20',
      notes: "CRITICAL: Harold's Co-careldopa must be given at 8am, 1pm, and 6pm precisely. Even 30-minute delays can cause severe deterioration. Refer to SLT immediately if any swallowing concerns arise. Tremors are worse in the morning.",
    },
    {
      clinic_id: S, patient_id: evelyn.id,
      title: 'Post-Stroke Recovery & Emotional Wellbeing Plan',
      description: 'Rehabilitation-focused care plan supporting stroke recovery and emotional health.',
      goals: ['Physiotherapy 3× per week', 'Maintain and improve left-side mobility', 'Monthly depression screening (PHQ-9)', 'Encourage social activities to reduce isolation'],
      carer_name: 'Lucy Adams', status: 'active', start_date: '2026-01-25',
      notes: 'Evelyn has left-sided weakness following ischaemic stroke in November 2024. Physiotherapist visits Tuesdays and Thursdays. Monitor closely for signs of low mood.',
    },
  ], 'sf care plans')

  await batch('care_plan_tasks', [
    // Margaret
    { care_plan_id: sfPlans[0].id, clinic_id: S, title: 'Blood glucose check before each meal', status: 'in_progress' },
    { care_plan_id: sfPlans[0].id, clinic_id: S, title: 'Ensure Metformin administered with food', status: 'in_progress' },
    { care_plan_id: sfPlans[0].id, clinic_id: S, title: 'Engage in 30-min reminiscence activity daily', status: 'in_progress' },
    // Albert
    { care_plan_id: sfPlans[1].id, clinic_id: S, title: 'Record O2 saturation morning and evening', status: 'in_progress' },
    { care_plan_id: sfPlans[1].id, clinic_id: S, title: 'Low-sodium meal plan — dietitian review', status: 'completed' },
    { care_plan_id: sfPlans[1].id, clinic_id: S, title: 'Liaise with respiratory nurse for quarterly review', status: 'pending' },
    // Dorothy
    { care_plan_id: sfPlans[2].id, clinic_id: S, title: 'Hourly observation during all waking hours', status: 'in_progress' },
    { care_plan_id: sfPlans[2].id, clinic_id: S, title: 'Continence assessment and toileting plan', status: 'completed' },
    { care_plan_id: sfPlans[2].id, clinic_id: S, title: 'Monthly falls risk score review', status: 'in_progress' },
    // Harold
    { care_plan_id: sfPlans[3].id, clinic_id: S, title: "Administer Parkinson's medication strictly on schedule", status: 'in_progress' },
    { care_plan_id: sfPlans[3].id, clinic_id: S, title: 'Physiotherapy exercises twice daily', status: 'in_progress' },
    { care_plan_id: sfPlans[3].id, clinic_id: S, title: 'Swallowing assessment referral to SLT', status: 'completed' },
    // Evelyn
    { care_plan_id: sfPlans[4].id, clinic_id: S, title: 'Attend physiotherapy session Tuesday & Thursday', status: 'in_progress' },
    { care_plan_id: sfPlans[4].id, clinic_id: S, title: 'Monthly depression screen using PHQ-9', status: 'in_progress' },
    { care_plan_id: sfPlans[4].id, clinic_id: S, title: 'Occupational therapy — room environment review', status: 'pending' },
  ], 'sf tasks')
  console.log('  ✓ Care plans & tasks')

  // ── Daily care records (7 days × 5 patients) ─────────────────────────────
  // Per-patient daily variation: [eat0..eat6], [mood0..mood6], [activities], [bath], [pcNotes], [fluids]
  const sfVariation = {
    [margaret.id]: {
      eat:   [0.7, 0.5, 0.8, 0.3, 0.6, 0.7, 0.4],
      mood:  [3, 2, 4, 2, 3, 3, 2],
      act:   ['Reminiscence therapy group', 'TV lounge — soap operas', 'Garden walk with Lucy', 'Arts and crafts session', 'Music therapy', 'Family visit — son Robert', 'Rest day in room'],
      bath:  [true, true, false, true, true, true, false],
      pcN:   ['', '', 'Refused bathing — bed wash given instead', '', '', '', 'Declined bathing today'],
      fl:    [900, 750, 1100, 600, 950, 1000, 700],
    },
    [albert.id]: {
      eat:   [0.9, 0.8, 0.9, 0.85, 0.7, 0.9, 0.8],
      mood:  [4, 3, 4, 3, 3, 4, 4],
      act:   ['Seated exercises with physio', 'Reading — local newspaper', 'Card games with residents', 'Radio listening in lounge', 'Seated exercises', 'Newspaper and crossword', 'Dominoes in lounge'],
      bath:  [true, true, true, true, false, true, true],
      pcN:   ['', '', '', '', 'Breathless during bathing — adapted to bed wash', '', ''],
      fl:    [1200, 1100, 1300, 1100, 900, 1200, 1100],
    },
    [dorothy.id]: {
      eat:   [0.5, 0.3, 0.6, 0.2, 0.5, 0.4, 0.3],
      mood:  [2, 1, 3, 1, 2, 2, 1],
      act:   ['Sensory stimulation activity', 'Rest in room — agitated', 'Music session (calming effect noted)', 'TV lounge — 1:1 support', 'Short garden walk', 'Rest day', 'Sensory box activity'],
      bath:  [false, false, true, false, true, false, false],
      pcN:   ['Refused bathing — distressed, bed wash given', 'Refused all personal care initially, managed with gentle persuasion', '', 'Refused bathing — very distressed', '', 'Declined all personal care — agitated', 'Partial personal care accepted with encouragement'],
      fl:    [600, 500, 800, 450, 700, 600, 500],
    },
    [harold.id]: {
      eat:   [0.7, 0.8, 0.7, 0.75, 0.6, 0.8, 0.7],
      mood:  [3, 3, 3, 4, 3, 4, 3],
      act:   ['Seated stretching exercises', 'Reading with magnifier', 'Physiotherapy session', 'Card games — adapted grip cards', 'Seated exercises', 'Physiotherapy session', 'Radio listening'],
      bath:  [true, true, true, true, true, true, true],
      pcN:   ['Tremors noted during dressing — allowed extra time', '', '', '', 'Significant morning tremors — required full assistance with dressing', '', ''],
      fl:    [1000, 1100, 950, 1000, 900, 1100, 1000],
    },
    [evelyn.id]: {
      eat:   [0.8, 0.9, 0.8, 0.7, 0.85, 0.8, 0.9],
      mood:  [3, 4, 3, 2, 4, 3, 4],
      act:   ['Physiotherapy — upper limb exercises', 'Art therapy group', 'Physiotherapy session', 'Low mood — stayed in room, 1:1 support', 'Physiotherapy — walking practice corridor', 'Social lounge — chatting with residents', 'Family video call — husband Michael'],
      bath:  [true, true, true, true, true, true, true],
      pcN:   ['Left-arm support needed for dressing', '', 'Left-arm support needed', 'Low mood — gentle encouragement required for all care', '', '', ''],
      fl:    [1100, 1200, 1100, 900, 1200, 1100, 1200],
    },
  }

  const moodLabel = ['Very distressed and confused', 'Low mood, withdrawn', 'Settled and cooperative', 'Good mood, engaged well', 'Excellent — very sociable and content']

  const sfRecords = []
  for (const [pid, v] of Object.entries(sfVariation)) {
    for (let d = 0; d < 7; d++) {
      const eat = v.eat[d]
      sfRecords.push({
        clinic_id: S, patient_id: pid, date: DATES[d], carer_name: 'Lucy Adams',
        recorded_at: `${17 + (d % 3)}:${d % 2 === 0 ? '00' : '30'}:00`,
        meals: {
          breakfast: { eaten: eat >= 0.6, notes: eat >= 0.6 ? 'Good appetite at breakfast' : 'Poor appetite — minimal intake' },
          lunch:     { eaten: eat >= 0.4, notes: eat >= 0.75 ? 'Finished lunch well' : eat >= 0.4 ? 'Ate approximately half' : 'Refused lunch' },
          dinner:    { eaten: eat >= 0.5, notes: eat >= 0.5 ? '' : 'Declined dinner' },
          snacks: eat >= 0.5 ? 'Tea and biscuits at 3pm' : 'Declined snacks',
          fluids_ml: v.fl[d],
        },
        personal_care: {
          bathing: v.bath[d], grooming: true, dressing: true,
          oral_care: eat >= 0.4, notes: v.pcN[d],
        },
        mood_score: v.mood[d],
        mood_notes: moodLabel[v.mood[d] - 1],
        activity: v.act[d],
        incidents: '', notes: '',
      })
    }
  }
  await batch('daily_care_records', sfRecords, 'sf daily records')
  console.log('  ✓ Daily care records (7 days × 5 patients)')

  // ── Medications (Margaret, Albert, Harold) ───────────────────────────────
  const sfMeds = await batch('medications', [
    // Margaret — Alzheimer's + Type 2 Diabetes
    { clinic_id: S, patient_id: margaret.id, name: 'Donepezil (Aricept)', dosage: '10mg', frequency: 'Once daily at bedtime', route: 'Oral', prescribing_doctor: 'Dr R. Patel', start_date: '2025-06-01', status: 'active', instructions: 'Give with water at bedtime. Monitor for nausea and GI disturbance.' },
    { clinic_id: S, patient_id: margaret.id, name: 'Metformin', dosage: '500mg', frequency: 'Twice daily with meals', route: 'Oral', prescribing_doctor: 'Dr R. Patel', start_date: '2024-03-15', status: 'active', instructions: 'Must be given with food to minimise GI side effects. Monitor blood glucose before each dose.' },
    // Albert — COPD + Congestive Heart Failure
    { clinic_id: S, patient_id: albert.id, name: 'Salbutamol Inhaler', dosage: '100mcg (2 puffs)', frequency: 'As required, max 4× daily', route: 'Inhaled', prescribing_doctor: 'Dr K. Singh', start_date: '2023-09-10', status: 'active', instructions: 'Shake well before each use. Check inhaler technique monthly. Document when used and reason.' },
    { clinic_id: S, patient_id: albert.id, name: 'Furosemide', dosage: '40mg', frequency: 'Once daily in the morning', route: 'Oral', prescribing_doctor: 'Dr K. Singh', start_date: '2024-11-20', status: 'active', instructions: 'Give in the morning to avoid nocturia. Weigh daily — report >2kg gain in 24h to GP immediately.' },
    { clinic_id: S, patient_id: albert.id, name: 'Bisoprolol', dosage: '5mg', frequency: 'Once daily in the morning', route: 'Oral', prescribing_doctor: 'Dr K. Singh', start_date: '2024-11-20', status: 'active', instructions: 'Do not stop suddenly. Check pulse before administering — hold and contact GP if <50bpm.' },
    // Harold — Parkinson's + Hypertension
    { clinic_id: S, patient_id: harold.id, name: 'Co-careldopa (Sinemet 25/100)', dosage: '25mg/100mg', frequency: 'Three times daily — 8am, 1pm, 6pm', route: 'Oral', prescribing_doctor: 'Dr L. Barnes', start_date: '2023-04-01', status: 'active', instructions: "CRITICAL: Must be given ON TIME. Even 30-minute delays cause significant deterioration. Do not give with high-protein meals. Document exact time of administration." },
    { clinic_id: S, patient_id: harold.id, name: 'Ropinirole', dosage: '2mg', frequency: 'Twice daily with meals', route: 'Oral', prescribing_doctor: 'Dr L. Barnes', start_date: '2024-01-15', status: 'active', instructions: 'Give with or after food. Monitor for excessive daytime sleepiness. Do not stop suddenly.' },
    { clinic_id: S, patient_id: harold.id, name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily in the morning', route: 'Oral', prescribing_doctor: 'Dr L. Barnes', start_date: '2024-05-01', status: 'active', instructions: 'Check blood pressure before administering. Hold and contact GP if systolic <90mmHg.' },
  ], 'sf medications')
  console.log('  ✓ Medications')

  const sfMedLogs = []
  for (const med of sfMeds) {
    for (const date of DATES) {
      for (const time of medTimes(med.frequency)) {
        sfMedLogs.push({
          clinic_id: S, medication_id: med.id, patient_id: med.patient_id,
          date, time, given_by: 'Lucy Adams', refused: false, notes: '',
        })
      }
    }
  }
  await batch('medication_logs', sfMedLogs, 'sf med logs')
  console.log('  ✓ Medication logs')

  // ── Incidents ────────────────────────────────────────────────────────────
  await batch('incidents', [
    {
      clinic_id: S, patient_id: dorothy.id,
      reported_by: 'Lucy Adams', reported_by_id: lucy.id,
      date: '2026-02-18', time: '14:30',
      incident_type: 'fall',
      location: 'Main corridor outside Room 3',
      description: 'Dorothy was found on the floor in the corridor near her room at approximately 14:30. She had attempted to mobilise independently without calling for assistance. No loss of consciousness was observed. Alert on approach.',
      immediate_action: 'Assisted Dorothy to a safe position. Full head-to-toe body check performed — no visible injuries. Vital signs checked and within normal limits. GP informed by telephone. Family (Carol Jenkins) notified. Enhanced observation level commenced. Incident form completed.',
      witnesses: 'James Turner (observed from nurses station)',
      severity: 'medium', follow_up: true,
      follow_up_notes: "GP reviewed Dorothy the following day — no fractures identified. Falls risk assessment updated from 'high' to 'very high'. Bed sensor repositioned. DOLS conditions reviewed with local authority. Referral to falls clinic made.",
      status: 'resolved',
      internal_notes: 'Third fall this month. MDT meeting requested. Occupational therapy referral for full room assessment. Family updated at care review meeting.',
    },
    {
      clinic_id: S, patient_id: albert.id,
      reported_by: 'Sarah Mitchell', reported_by_id: sarah.id,
      date: '2026-02-21', time: '11:15',
      incident_type: 'safeguarding',
      location: "Albert's room — Room 12",
      description: "Albert's wife Patricia raised serious concerns during her visit that Albert had unexplained bruising on his left forearm and appeared fearful in the presence of a specific member of staff. Albert was unable to provide a clear account due to cognitive impairment. Patricia was distressed and requested a formal safeguarding investigation.",
      immediate_action: "Immediate safeguarding referral made to local authority designated officer (LADO). Named member of staff removed from direct care duties pending investigation — not named in this record. Safeguarding lead (Sarah Mitchell) notified immediately. CQC notification submitted. Body map completed by senior nurse. All care records for past 30 days secured and preserved. Patricia provided with safeguarding information leaflet.",
      witnesses: 'Patricia Thompson (wife of Albert)',
      severity: 'critical', follow_up: true,
      follow_up_notes: 'Local authority safeguarding investigation ongoing. Visit from safeguarding officer booked for 2026-02-24. Legal team notified. Board of directors informed. Staff member suspended pending outcome.',
      status: 'under_review',
      internal_notes: 'Refer to safeguarding policy Section 4.2. Do not discuss with uninvolved staff. Preserve all CCTV footage from 2026-02-14 to present.',
    },
  ], 'sf incidents')
  console.log('  ✓ Incidents (1 × medium, 1 × critical)')

  // ===========================================================================
  // ORG 2 — RIVERSIDE LODGE
  // ===========================================================================
  console.log('\n── Riverside Lodge ────────────────────────────────────────────')

  const david = await createUser('david.clarke@riversidelodge.co.uk', 'David Clarke')

  const riverside = die(
    await sb.from('clinics').insert({
      name: 'Riverside Lodge',
      owner_id: david.id,
      address: '42 River View, Bristol, BS1 4HX',
      phone: '0117 923 4567',
      email: 'admin@riversidelodge.co.uk',
      subscription_tier: 'starter',
      is_active: true,
    }).select().single(),
    'riverside clinic',
  )
  const R = riverside.id

  await patchUserClinic(david.id, R, 'Riverside Lodge')
  await profile(david.id, 'David Clarke', 'david.clarke@riversidelodge.co.uk', R, 'admin',   'Care Home Director', '07700 900004')
  console.log('  ✓ David Clarke    (admin)')

  const emma = await createUser('emma.watson@riversidelodge.co.uk', 'Emma Watson', R, 'Riverside Lodge')
  await profile(emma.id, 'Emma Watson', 'emma.watson@riversidelodge.co.uk', R, 'manager', 'Deputy Manager',      '07700 900005')
  console.log('  ✓ Emma Watson     (manager)')

  const tom = await createUser('tom.hughes@riversidelodge.co.uk', 'Tom Hughes', R, 'Riverside Lodge')
  await profile(tom.id, 'Tom Hughes', 'tom.hughes@riversidelodge.co.uk', R, 'carer', 'Care Assistant',       '07700 900006')
  console.log('  ✓ Tom Hughes      (carer)')

  // ── Patients ────────────────────────────────────────────────────────────────
  const rlPts = await batch('patients', [
    {
      clinic_id: R, first_name: 'Reginald', last_name: 'Patel',
      email: 'reginald.patel@nextofkin.co.uk', phone: '01179500001',
      date_of_birth: '1944-04-28', gender: 'male',
      address: 'Room 4, Riverside Lodge, 42 River View, Bristol',
      blood_type: 'B+', allergies: ['Metformin (GI intolerance)'],
      medical_conditions: ['Vascular Dementia', 'Type 2 Diabetes', 'Atrial Fibrillation'],
      emergency_contact_name: 'Priya Patel', emergency_contact_phone: '07822 222001',
      emergency_contact_relationship: 'Daughter',
    },
    {
      clinic_id: R, first_name: 'Beatrice', last_name: 'Morton',
      email: 'beatrice.morton@nextofkin.co.uk', phone: '01179500002',
      date_of_birth: '1948-09-14', gender: 'female',
      address: 'Room 8, Riverside Lodge, 42 River View, Bristol',
      blood_type: 'A-', allergies: ['NSAIDs'],
      medical_conditions: ['COPD', 'Rheumatoid Arthritis'],
      emergency_contact_name: 'George Morton', emergency_contact_phone: '07822 222002',
      emergency_contact_relationship: 'Son',
    },
    {
      clinic_id: R, first_name: 'Stanley', last_name: 'Hughes',
      email: 'stanley.hughes@nextofkin.co.uk', phone: '01179500003',
      date_of_birth: '1936-12-05', gender: 'male',
      address: 'Room 2, Riverside Lodge, 42 River View, Bristol',
      blood_type: 'O+', allergies: [],
      medical_conditions: ['Congestive Heart Failure', 'Chronic Kidney Disease Stage 3', 'High Falls Risk'],
      emergency_contact_name: 'Ruth Hughes', emergency_contact_phone: '07822 222003',
      emergency_contact_relationship: 'Wife',
    },
    {
      clinic_id: R, first_name: 'Gladys', last_name: 'Foster',
      email: 'gladys.foster@nextofkin.co.uk', phone: '01179500004',
      date_of_birth: '1941-07-31', gender: 'female',
      address: 'Room 11, Riverside Lodge, 42 River View, Bristol',
      blood_type: 'AB+', allergies: ['Codeine'],
      medical_conditions: ["Alzheimer's Disease", 'Recurrent Urinary Tract Infections', 'Urinary Incontinence'],
      emergency_contact_name: 'Dennis Foster', emergency_contact_phone: '07822 222004',
      emergency_contact_relationship: 'Husband',
    },
    {
      clinic_id: R, first_name: 'Arthur', last_name: 'Blackwood',
      email: 'arthur.blackwood@nextofkin.co.uk', phone: '01179500005',
      date_of_birth: '1952-02-17', gender: 'male',
      address: 'Room 6, Riverside Lodge, 42 River View, Bristol',
      blood_type: 'A+', allergies: ['Erythromycin'],
      medical_conditions: ["Parkinson's Disease", 'Dysphagia', 'Anxiety Disorder'],
      emergency_contact_name: 'Susan Blackwood', emergency_contact_phone: '07822 222005',
      emergency_contact_relationship: 'Wife',
    },
  ], 'rl patients')
  console.log(`  ✓ ${rlPts.length} patients`)

  const [reginald, beatrice, stanley, gladys, arthur] = rlPts

  await batch('staff_patient_assignments',
    rlPts.map(p => ({ clinic_id: R, staff_id: tom.id, patient_id: p.id })),
    'rl assignments',
  )

  // ── Care plans ──────────────────────────────────────────────────────────────
  const rlPlans = await batch('care_plans', [
    {
      clinic_id: R, patient_id: reginald.id,
      title: 'Vascular Dementia & Diabetes Care Plan',
      description: 'Person-centred care addressing dementia progression and glycaemic management.',
      goals: ['Blood glucose monitoring before breakfast and dinner', 'Safe mobility with walking frame', 'Ensure daily LMWH injection site rotation', 'Manage AF — monitor for palpitations'],
      carer_name: 'Tom Hughes', status: 'active', start_date: '2026-01-05',
      notes: 'Reginald is generally cooperative and enjoys cricket on TV. Prefers male carers for personal care. Family (Priya) visits fortnightly on Saturdays. On daily Enoxaparin — document site.',
    },
    {
      clinic_id: R, patient_id: beatrice.id,
      title: 'COPD & Rheumatoid Arthritis Management Plan',
      description: 'Integrated care plan for respiratory and musculoskeletal conditions.',
      goals: ['Maintain respiratory function', 'Effective pain management', 'Prevent hospital readmission', 'Maintain independence with adapted aids'],
      carer_name: 'Tom Hughes', status: 'active', start_date: '2026-01-12',
      notes: 'Beatrice is very independent — becomes distressed if rushed. Uses adapted grip aids for cutlery and dressing. Heated pad for joint pain (document use). Never give NSAIDs — documented allergy.',
    },
    {
      clinic_id: R, patient_id: stanley.id,
      title: 'Heart Failure & Falls Prevention Plan',
      description: 'Close cardiac monitoring with enhanced falls prevention strategies.',
      goals: ['Daily weight and fluid balance monitoring', 'Prevent falls — 2-person assist for transfers', 'Monitor renal function (U&E every 3 months)', 'Fluid restriction 1.5L/day — document all intake'],
      carer_name: 'Tom Hughes', status: 'active', start_date: '2026-01-09',
      notes: 'Stanley is 89 and very frail. FLUID RESTRICTION: maximum 1.5L per day — document every millilitre. Falls sensor mat at bedside. 2-person assist for all transfers. Contact GP if weight increases >2kg in 24h.',
    },
    {
      clinic_id: R, patient_id: gladys.id,
      title: "Alzheimer's & Continence Care Plan",
      description: 'Dementia-centred care with focus on continence management and UTI prevention.',
      goals: ['2-hourly toileting routine — document', 'UTI prevention — minimum 1.5L fluid intake daily', 'Encourage nutrition', 'Maintain skin integrity — daily pressure area checks'],
      carer_name: 'Tom Hughes', status: 'active', start_date: '2026-01-18',
      notes: 'Gladys is at high risk of UTIs. Target minimum 1.5L fluid daily. Weekly urinalysis — log results and report any concerns immediately. Respond to ANY sign of infection: confusion, agitation, odour, pyrexia.',
    },
    {
      clinic_id: R, patient_id: arthur.id,
      title: "Parkinson's & Dysphagia Management Plan",
      description: "Specialist care for Parkinson's with swallowing difficulties and anxiety.",
      goals: ['All food and fluid IDDSI Level 5 texture modified', "Parkinson's medication strictly on time", 'Anxiety management — therapeutic listening daily', 'Monthly SALT swallowing assessment'],
      carer_name: 'Tom Hughes', status: 'active', start_date: '2026-01-22',
      notes: "CRITICAL: Arthur is on IDDSI Level 5 (minced and moist) diet. ALL meals must be texture modified. Thickened fluids — nectar consistency (IDDSI Level 2). SALT review monthly. Parkinson's medication must be on time. Calm, patient approach essential — anxiety can worsen swallowing.",
    },
  ], 'rl care plans')

  await batch('care_plan_tasks', [
    // Reginald
    { care_plan_id: rlPlans[0].id, clinic_id: R, title: 'Blood glucose check before breakfast and dinner', status: 'in_progress' },
    { care_plan_id: rlPlans[0].id, clinic_id: R, title: 'Daily Enoxaparin injection — document site rotation', status: 'in_progress' },
    { care_plan_id: rlPlans[0].id, clinic_id: R, title: 'Dietitian review — diabetes meal plan', status: 'completed' },
    // Beatrice
    { care_plan_id: rlPlans[1].id, clinic_id: R, title: 'Physiotherapy for joint mobility 2× weekly', status: 'in_progress' },
    { care_plan_id: rlPlans[1].id, clinic_id: R, title: 'Pain assessment every shift using pain scale', status: 'in_progress' },
    { care_plan_id: rlPlans[1].id, clinic_id: R, title: 'Spirometry monitoring — monthly', status: 'pending' },
    // Stanley
    { care_plan_id: rlPlans[2].id, clinic_id: R, title: 'Weigh Stanley every morning before breakfast', status: 'in_progress' },
    { care_plan_id: rlPlans[2].id, clinic_id: R, title: 'Record all fluid intake on fluid chart — every shift', status: 'in_progress' },
    { care_plan_id: rlPlans[2].id, clinic_id: R, title: 'U&E bloods every 3 months — next due March 2026', status: 'pending' },
    // Gladys
    { care_plan_id: rlPlans[3].id, clinic_id: R, title: '2-hourly toileting and continence record', status: 'in_progress' },
    { care_plan_id: rlPlans[3].id, clinic_id: R, title: 'Weekly urinalysis — log results in care notes', status: 'in_progress' },
    { care_plan_id: rlPlans[3].id, clinic_id: R, title: 'Daily skin integrity check — pressure areas', status: 'in_progress' },
    // Arthur
    { care_plan_id: rlPlans[4].id, clinic_id: R, title: 'All meals to be IDDSI Level 5 — texture modified', status: 'in_progress' },
    { care_plan_id: rlPlans[4].id, clinic_id: R, title: 'Monthly SALT swallowing assessment', status: 'pending' },
    { care_plan_id: rlPlans[4].id, clinic_id: R, title: 'Daily therapeutic listening — 1× per shift', status: 'in_progress' },
  ], 'rl tasks')
  console.log('  ✓ Care plans & tasks')

  // ── Daily care records ───────────────────────────────────────────────────
  const rlVariation = {
    [reginald.id]: {
      eat:  [0.8, 0.7, 0.8, 0.85, 0.7, 0.8, 0.75],
      mood: [3, 3, 4, 3, 3, 4, 3],
      act:  ['Cricket on TV — very engaged', 'Seated exercises in room', 'Family video call — Priya', 'TV lounge with other residents', 'Walking frame exercise in corridor', 'Newspaper reading', 'Seated exercises'],
      bath: [true, true, true, false, true, true, true],
      pcN:  ['', '', '', 'Declined bath — bed wash accepted', '', '', ''],
      fl:   [1100, 1000, 1200, 950, 1000, 1100, 1000],
    },
    [beatrice.id]: {
      eat:  [0.85, 0.9, 0.8, 0.75, 0.85, 0.9, 0.8],
      mood: [4, 4, 3, 4, 4, 5, 4],
      act:  ['Morning garden walk', 'Knitting group in lounge', 'Physiotherapy — joint mobility', 'Reading in room', 'Raised garden bed activity', 'Singing group', 'Physiotherapy session'],
      bath: [true, true, true, true, true, true, true],
      pcN:  ['Adapted grip aids used for dressing — arthritis', '', '', 'Joints stiff this morning — extra time for dressing', '', '', ''],
      fl:   [1200, 1300, 1100, 1000, 1200, 1300, 1100],
    },
    [stanley.id]: {
      eat:  [0.6, 0.5, 0.65, 0.55, 0.6, 0.65, 0.6],
      mood: [3, 2, 3, 3, 2, 3, 3],
      act:  ['Rest — conserving energy', 'Seated card games', 'Radio — jazz music', 'Rest day', 'Seated exercises with physio', 'Radio listening in room', 'Dominoes in lounge'],
      bath: [false, true, false, true, false, true, false],
      pcN:  ['Breathless during bathing — bed wash given', '', 'Oedematous legs — bed wash given, legs elevated', '', 'Breathless on exertion — bed wash given', '', 'Breathless — bed wash given'],
      fl:   [1300, 1200, 1400, 1100, 1350, 1300, 1250], // documented — restricted 1.5L
    },
    [gladys.id]: {
      eat:  [0.55, 0.4, 0.6, 0.3, 0.5, 0.55, 0.4],
      mood: [2, 2, 3, 1, 2, 3, 2],
      act:  ['Flower arranging — sensory activity', 'Music from 1950s on radio', 'TV lounge — Coronation Street', 'Agitated — 1:1 support in room', 'Short garden walk with Tom', 'Music activity group', 'Reminiscence group'],
      bath: [true, false, true, false, true, true, false],
      pcN:  ['', 'Refused personal care — very agitated', '', 'Extremely distressed — minimal care only, dignity maintained', '', '', 'Declined bathing — persuaded to accept bed wash'],
      fl:   [1600, 1400, 1700, 1200, 1500, 1600, 1400],
    },
    [arthur.id]: {
      eat:  [0.7, 0.75, 0.7, 0.65, 0.75, 0.7, 0.75],
      mood: [3, 3, 4, 2, 3, 4, 3],
      act:  ['Classical music — relaxation', "Physiotherapy — Parkinson's exercises", 'Art therapy (calming activity)', 'Anxious — therapeutic 1:1 with Tom', 'Physiotherapy session', 'Nature documentary on TV', 'Music listening in room'],
      bath: [true, true, true, true, true, true, true],
      pcN:  ['All fluids given at nectar consistency', '', '', 'Very anxious during personal care — reassurance and extra time given', '', '', ''],
      fl:   [900, 950, 900, 800, 950, 900, 950],
    },
  }

  const rlRecords = []
  for (const [pid, v] of Object.entries(rlVariation)) {
    for (let d = 0; d < 7; d++) {
      const eat = v.eat[d]
      rlRecords.push({
        clinic_id: R, patient_id: pid, date: DATES[d], carer_name: 'Tom Hughes',
        recorded_at: `${18 + (d % 3)}:${d % 2 === 0 ? '00' : '15'}:00`,
        meals: {
          breakfast: { eaten: eat >= 0.55, notes: eat >= 0.7 ? 'Good appetite at breakfast' : eat >= 0.55 ? 'Moderate intake at breakfast' : 'Poor appetite — minimal intake' },
          lunch:     { eaten: eat >= 0.4,  notes: eat >= 0.75 ? 'Finished lunch well' : eat >= 0.4 ? 'Ate approximately half' : 'Refused lunch' },
          dinner:    { eaten: eat >= 0.5,  notes: eat >= 0.5 ? '' : 'Declined dinner' },
          snacks: eat >= 0.6 ? 'Biscuits and tea at 3pm' : 'Light snack offered',
          fluids_ml: v.fl[d],
        },
        personal_care: {
          bathing: v.bath[d], grooming: true, dressing: true,
          oral_care: eat >= 0.4, notes: v.pcN[d],
        },
        mood_score: v.mood[d],
        mood_notes: moodLabel[v.mood[d] - 1],
        activity: v.act[d],
        incidents: '', notes: '',
      })
    }
  }
  await batch('daily_care_records', rlRecords, 'rl daily records')
  console.log('  ✓ Daily care records (7 days × 5 patients)')

  // ── Medications (Reginald, Stanley, Gladys) ──────────────────────────────
  const rlMeds = await batch('medications', [
    // Reginald — T2DM (Metformin intolerant) + AF
    { clinic_id: R, patient_id: reginald.id, name: 'Gliclazide MR', dosage: '60mg', frequency: 'Once daily with breakfast', route: 'Oral', prescribing_doctor: 'Dr H. Ahmed', start_date: '2025-03-20', status: 'active', instructions: 'Give with breakfast. Monitor for hypoglycaemia — ensure Reginald has eaten before administering. Do NOT give Metformin — documented GI intolerance.' },
    { clinic_id: R, patient_id: reginald.id, name: 'Rivaroxaban (Xarelto)', dosage: '20mg', frequency: 'Once daily with evening meal', route: 'Oral', prescribing_doctor: 'Dr H. Ahmed', start_date: '2024-09-01', status: 'active', instructions: 'MUST be given with food to ensure adequate absorption. Given for AF — do not miss doses. Monitor for unusual bleeding or bruising.' },
    { clinic_id: R, patient_id: reginald.id, name: 'Enoxaparin (Clexane)', dosage: '40mg', frequency: 'Once daily subcutaneous injection', route: 'Subcutaneous', prescribing_doctor: 'Dr H. Ahmed', start_date: '2026-01-10', status: 'active', instructions: 'Rotate injection sites — abdomen preferred. Document injection site used each day. Monitor for bruising at injection sites.' },
    // Stanley — Heart Failure + CKD
    { clinic_id: R, patient_id: stanley.id, name: 'Digoxin', dosage: '125mcg', frequency: 'Once daily in the morning', route: 'Oral', prescribing_doctor: 'Dr F. Okonkwo', start_date: '2024-06-15', status: 'active', instructions: 'Check apical pulse for 1 full minute before administering. HOLD if pulse <60bpm and contact GP. Monitor for toxicity signs: nausea, vomiting, visual disturbance. Serum levels 6-monthly.' },
    { clinic_id: R, patient_id: stanley.id, name: 'Spironolactone', dosage: '25mg', frequency: 'Once daily in the morning', route: 'Oral', prescribing_doctor: 'Dr F. Okonkwo', start_date: '2024-06-15', status: 'active', instructions: 'Monitor potassium levels — avoid excess potassium-rich foods. U&E monitoring every 3 months. Report any signs of hyperkalaemia.' },
    { clinic_id: R, patient_id: stanley.id, name: 'Ramipril', dosage: '2.5mg', frequency: 'Once daily in the morning', route: 'Oral', prescribing_doctor: 'Dr F. Okonkwo', start_date: '2024-06-15', status: 'active', instructions: 'Monitor blood pressure and renal function. Hold and contact GP if systolic BP <100mmHg. Check U&E 1 week after any dose change.' },
    // Gladys — Alzheimer's + Recurrent UTIs
    { clinic_id: R, patient_id: gladys.id, name: 'Donepezil', dosage: '5mg', frequency: 'Once daily at bedtime', route: 'Oral', prescribing_doctor: 'Dr S. Mehta', start_date: '2025-08-01', status: 'active', instructions: 'Give at bedtime. May cause vivid dreams initially — document if reported. Monitor for GI side effects.' },
    { clinic_id: R, patient_id: gladys.id, name: 'Trimethoprim', dosage: '100mg', frequency: 'Once daily at bedtime (prophylactic)', route: 'Oral', prescribing_doctor: 'Dr S. Mehta', start_date: '2025-11-01', status: 'active', instructions: 'Prophylactic dose for recurrent UTIs. Give at bedtime. Monitor urinalysis weekly. Ensure adequate hydration — minimum 1.5L daily.' },
  ], 'rl medications')
  console.log('  ✓ Medications')

  const rlMedLogs = []
  for (const med of rlMeds) {
    for (let d = 0; d < DATES.length; d++) {
      const date = DATES[d]
      for (const time of medTimes(med.frequency)) {
        const notes = med.route === 'Subcutaneous'
          ? `Injection site: abdomen ${d % 2 === 0 ? 'left' : 'right'} side`
          : ''
        rlMedLogs.push({
          clinic_id: R, medication_id: med.id, patient_id: med.patient_id,
          date, time, given_by: 'Tom Hughes', refused: false, notes,
        })
      }
    }
  }
  await batch('medication_logs', rlMedLogs, 'rl med logs')
  console.log('  ✓ Medication logs')

  // ── Incidents ────────────────────────────────────────────────────────────
  await batch('incidents', [
    {
      clinic_id: R, patient_id: beatrice.id,
      reported_by: 'Tom Hughes', reported_by_id: tom.id,
      date: '2026-02-20', time: '09:45',
      incident_type: 'near_miss',
      location: "Beatrice's en-suite bathroom — Room 8",
      description: "Tom entered the bathroom to assist Beatrice with her morning routine and noticed the floor was wet from an earlier shower that had not been fully dried. Beatrice was already walking towards the bathroom unaware of the wet floor hazard. Tom intervened before Beatrice reached the wet area. No injury occurred.",
      immediate_action: 'Floor dried immediately with absorbent mat. Beatrice assisted safely to the bathroom and morning routine completed. Non-slip mat repositioned correctly. Incident reported verbally to Emma Watson (manager on duty). Bathroom inspected and confirmed safe. Reminder issued at handover.',
      witnesses: 'None — Tom Hughes only',
      severity: 'low', follow_up: false, follow_up_notes: '',
      status: 'resolved',
      internal_notes: 'Non-slip mats to be checked as part of daily environmental safety checks. Add to next team meeting agenda.',
    },
  ], 'rl incidents')
  console.log('  ✓ Incidents (1 × low)')

  // ===========================================================================
  // SUMMARY OUTPUT
  // ===========================================================================
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                     ✅  SEEDING COMPLETE                          ║
╠═══════════════════════════════════════════════════════════════════╣
║  SUNFIELD CARE HOME                                               ║
║  ─────────────────────────────────────────────────────────────   ║
║  Clinic ID: ${S}  ║
║                                                                   ║
║  Sarah Mitchell  (Admin)                                          ║
║    sarah.mitchell@sunfieldcare.co.uk                             ║
║  James Turner    (Manager)                                        ║
║    james.turner@sunfieldcare.co.uk                               ║
║  Lucy Adams      (Carer)                                          ║
║    lucy.adams@sunfieldcare.co.uk                                 ║
╠═══════════════════════════════════════════════════════════════════╣
║  RIVERSIDE LODGE                                                  ║
║  ─────────────────────────────────────────────────────────────   ║
║  Clinic ID: ${R}  ║
║                                                                   ║
║  David Clarke    (Admin)                                          ║
║    david.clarke@riversidelodge.co.uk                             ║
║  Emma Watson     (Manager)                                        ║
║    emma.watson@riversidelodge.co.uk                              ║
║  Tom Hughes      (Carer)                                          ║
║    tom.hughes@riversidelodge.co.uk                               ║
╠═══════════════════════════════════════════════════════════════════╣
║  Password (all accounts): ${PASSWORD}                    ║
╚═══════════════════════════════════════════════════════════════════╝
`)
  console.log(`SUNFIELD_CLINIC_ID=${S}`)
  console.log(`RIVERSIDE_CLINIC_ID=${R}`)
}

main().catch(err => {
  console.error('\n❌ Seed failed:', err.message)
  process.exit(1)
})
