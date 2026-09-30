// Run with: node --env-file=.env.local scripts/test-rls.mjs
import { createClient } from '@supabase/supabase-js'
import { requireEnv } from './env.mjs'

const URL      = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
const ANON     = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
const SEED_PWD = requireEnv('SEED_USER_PASSWORD')

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

await testUser('sarah.mitchell@sunfieldcare.co.uk',  SEED_PWD, 'Sarah — Sunfield Admin')
await testUser('david.clarke@riversidelodge.co.uk',  SEED_PWD, 'David — Riverside Admin')
await testUser('lucy.adams@sunfieldcare.co.uk',      SEED_PWD, 'Lucy  — Sunfield Carer')
await testUser('tom.hughes@riversidelodge.co.uk',    SEED_PWD, 'Tom   — Riverside Carer')
