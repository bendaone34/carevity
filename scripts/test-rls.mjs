import { createClient } from '@supabase/supabase-js'

const URL  = 'https://hxgzckniqpilupboowek.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4Z3pja25pcXBpbHVwYm9vd2VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0OTc4MDUsImV4cCI6MjA4NzA3MzgwNX0.bsRzdxqv2HJRJSCfa7LdR3tAyBMJRogUwSvUsR90i5Q'

async function testUser(email, password, label) {
  const sb = createClient(URL, ANON)
  const { error } = await sb.auth.signInWithPassword({ email, password })
  if (error) { console.log(`${label}: sign-in failed — ${error.message}`); return }

  const { data: patients } = await sb.from('patients').select('first_name, last_name')
  const { data: profiles } = await sb.from('profiles').select('full_name, role').limit(10)
  const { data: incidents } = await sb.from('incidents').select('severity')
  const { data: medications } = await sb.from('medications').select('name').limit(5)

  console.log(`\n=== ${label} ===`)
  console.log(`  Patients (${patients?.length ?? 0}):`, patients?.map(p => `${p.first_name} ${p.last_name}`).join(', '))
  console.log(`  Staff   (${profiles?.length ?? 0}):`, profiles?.map(p => p.full_name).join(', '))
  console.log(`  Incidents (${incidents?.length ?? 0}):`, incidents?.map(i => i.severity).join(', '))
  console.log(`  Medications (${medications?.length ?? 0}):`, medications?.map(m => m.name).join(', '))
}

await testUser('sarah.mitchell@sunfieldcare.co.uk',  'Carevity2026!', 'Sarah — Sunfield Admin')
await testUser('david.clarke@riversidelodge.co.uk',  'Carevity2026!', 'David — Riverside Admin')
await testUser('lucy.adams@sunfieldcare.co.uk',      'Carevity2026!', 'Lucy  — Sunfield Carer')
await testUser('tom.hughes@riversidelodge.co.uk',    'Carevity2026!', 'Tom   — Riverside Carer')
