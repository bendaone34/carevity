// scripts/seed-tasks.mjs — Fix: insert care_plan_tasks only
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hxgzckniqpilupboowek.supabase.co';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4Z3pja25pcXBpbHVwYm9vd2VrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQ5NzgwNSwiZXhwIjoyMDg3MDczODA1fQ.B7_OIo_M0rSdnjRhuTISa8txFTsK_dWetI9BWm1GWQg';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  const clinicId = '0a41b361-6f7c-418f-965b-5c30ae826fa5'; // Sunrise Care Home

  // Fetch care plans with patient names
  const { data: carePlans } = await supabase
    .from('care_plans')
    .select('id, patient_id, patients(first_name, last_name)')
    .eq('clinic_id', clinicId);

  // Fetch patients to build name map
  const { data: patients } = await supabase
    .from('patients')
    .select('id, first_name, last_name')
    .eq('clinic_id', clinicId);

  const pid = {};
  for (const p of patients) pid[`${p.first_name} ${p.last_name}`] = p.id;

  const tasks = [];
  for (const cp of carePlans) {
    if (cp.patient_id === pid['Margaret Thompson']) {
      tasks.push(
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Complete wandering risk assessment', status: 'completed', due_date: '2026-01-15' },
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Install bed pressure sensor and door alarm', status: 'completed', due_date: '2026-01-20' },
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Schedule cognitive stimulation therapy sessions', status: 'in_progress', due_date: '2026-02-28' },
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Monthly family care conference', status: 'pending', due_date: '2026-03-01' },
      );
    } else if (cp.patient_id === pid['William Foster']) {
      tasks.push(
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Set up daily weight monitoring chart', status: 'completed', due_date: '2025-11-10' },
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Respiratory physiotherapy referral', status: 'completed', due_date: '2025-11-15' },
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Fluid restriction staff education session', status: 'in_progress', due_date: '2026-02-28' },
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Pulse oximeter procurement for room', status: 'completed', due_date: '2025-12-01' },
      );
    } else if (cp.patient_id === pid['Arthur Bennett']) {
      tasks.push(
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Physiotherapy assessment and schedule', status: 'completed', due_date: '2025-08-20' },
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Speech and language therapy referral', status: 'completed', due_date: '2025-08-25' },
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Occupational therapy home adaptation review', status: 'in_progress', due_date: '2026-02-25' },
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Social activities reintegration plan', status: 'pending', due_date: '2026-03-15' },
      );
    } else if (cp.patient_id === pid['Elsie Morgan']) {
      tasks.push(
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Blood glucose monitoring protocol in place', status: 'completed', due_date: '2025-02-15' },
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Dietitian assessment for diabetes meal plan', status: 'completed', due_date: '2025-03-01' },
        { care_plan_id: cp.id, clinic_id: clinicId, title: 'Review fluid intake targets and monitoring', status: 'in_progress', due_date: '2026-03-01' },
      );
    }
  }

  const { error } = await supabase.from('care_plan_tasks').insert(tasks);
  if (error) throw error;
  console.log(`✓ Inserted ${tasks.length} care plan tasks`);
  console.log('✅ Done!');
}

run().catch(err => {
  console.error('❌ Failed:', err.message ?? err);
  process.exit(1);
});
