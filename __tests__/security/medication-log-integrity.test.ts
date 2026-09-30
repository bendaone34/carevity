// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';

// Medication administration records must identify who gave the dose and must
// not be editable after the fact (audit findings H6 / C3). Checks the final
// state of supabase/migrations applied in order.

const DIR = path.resolve(__dirname, '..', '..', 'supabase', 'migrations');
const sql = readdirSync(DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(path.join(DIR, f), 'utf8'))
  .join('\n');

function lastPolicy(table: string, cmd: string): string | null {
  const re = new RegExp(`create\\s+policy\\s+"[^"]+"\\s+on\\s+${table}\\s+for\\s+${cmd}\\b[\\s\\S]*?;`, 'gi');
  const all = sql.match(re);
  return all ? all[all.length - 1] : null;
}

describe('medication_logs integrity', () => {
  it('insert policy requires the administering user to be the signed-in user', () => {
    const policy = lastPolicy('medication_logs', 'insert');
    expect(policy).toMatch(/given_by_id\s*=\s*auth\.uid\(\)/i);
  });

  it('insert policy requires the medication to belong to that patient and clinic', () => {
    const policy = lastPolicy('medication_logs', 'insert');
    expect(policy).toMatch(/from\s+medications\s+m[\s\S]*m\.patient_id\s*=\s*medication_logs\.patient_id/i);
  });

  it('logs cannot be updated (corrections are new rows)', () => {
    const lastCreate = sql.search(/create\s+policy\s+"[^"]+"\s+on\s+medication_logs\s+for\s+update/gi);
    const drops = [...sql.matchAll(/drop\s+policy\s+if\s+exists\s+"Clinic members update medication_logs"/gi)];
    expect(drops.length).toBeGreaterThan(0);
    expect(drops[drops.length - 1].index!).toBeGreaterThan(lastCreate);
  });

  it('allows only one administered dose per scheduled slot', () => {
    expect(sql).toMatch(
      /create\s+unique\s+index[\s\S]*?on\s+medication_logs\s*\(\s*medication_id\s*,\s*date\s*,\s*scheduled_time\s*\)\s*where\s+not\s+refused/i,
    );
  });

  it('dedupes retried requests with an idempotency key', () => {
    expect(sql).toMatch(/create\s+unique\s+index[\s\S]*?on\s+medication_logs\s*\(\s*client_request_id\s*\)/i);
  });
});
