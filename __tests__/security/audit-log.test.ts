// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';

// Audit trail must be complete (every clinical and access-control table),
// append-only (no role can edit or delete entries) and tamper-evident
// (hash chain). Audit finding C3. Checks supabase/migrations in order.

const DIR = path.resolve(__dirname, '..', '..', 'supabase', 'migrations');
const sql = readdirSync(DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(path.join(DIR, f), 'utf8'))
  .join('\n');

const REQUIRED_AUDITED_TABLES = [
  // clinical records
  'patients', 'medical_records', 'care_plans', 'care_plan_tasks', 'daily_care_records',
  'medications', 'medication_logs', 'incidents', 'wellbeing_alerts', 'alert_acknowledgements',
  // who can see what
  'profiles', 'staff_patient_assignments', 'family_members', 'clinics', 'clinic_join_links',
];

describe('audit_log', () => {
  it('exists with row level security enabled', () => {
    expect(sql).toMatch(/create\s+table\s+if\s+not\s+exists\s+audit_log\s*\(/i);
    expect(sql).toMatch(/alter\s+table\s+audit_log\s+enable\s+row\s+level\s+security/i);
  });

  it('can only be read through RLS — no insert, update or delete policies', () => {
    const policies = [...sql.matchAll(/create\s+policy\s+"[^"]+"\s+on\s+audit_log\s+for\s+(\w+)/gi)]
      .map((m) => m[1].toLowerCase());
    expect(policies).toEqual(['select']);
  });

  it('revokes write privileges from API roles', () => {
    expect(sql).toMatch(
      /revoke\s+insert\s*,\s*update\s*,\s*delete\s*,\s*truncate\s+on\s+audit_log\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i,
    );
  });

  it('blocks UPDATE, DELETE and TRUNCATE even for privileged roles', () => {
    expect(sql).toMatch(/create\s+trigger\s+\w+\s+before\s+update\s+or\s+delete\s+on\s+audit_log/i);
    expect(sql).toMatch(/create\s+trigger\s+\w+\s+before\s+truncate\s+on\s+audit_log/i);
  });

  it('chains entries by hash so tampering is detectable', () => {
    expect(sql).toMatch(/row_hash\s+text/i);
    expect(sql).toMatch(/prev_hash\s+text/i);
    expect(sql).toMatch(/create\s+or\s+replace\s+function\s+verify_audit_chain\s*\(/i);
  });

  it('audits every clinical and access-control table', () => {
    const list = /audited_tables\s+text\[\]\s*:=\s*array\[([\s\S]*?)\]/i.exec(sql);
    expect(list, 'audited_tables array not found').not.toBeNull();
    const audited = [...list![1].matchAll(/'(\w+)'/g)].map((m) => m[1]);
    expect(REQUIRED_AUDITED_TABLES.filter((t) => !audited.includes(t))).toEqual([]);
  });
});
