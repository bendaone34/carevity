// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

// Family portal users must only see a curated, column-limited view of their
// own relative (audit H2), must not be able to write into other threads or
// clinics or spoof a sender (H3), and lose access when deactivated (L1).

const ROOT = path.resolve(__dirname, '..', '..');
const SUPA = path.join(ROOT, 'supabase');

// Loose legacy files first (they predate the ordered folder), then migrations/
const files = [
  ...readdirSync(SUPA).filter((f) => f.endsWith('.sql') && f !== 'schema.sql').sort()
    .map((f) => path.join(SUPA, f)),
  ...readdirSync(path.join(SUPA, 'migrations')).filter((f) => f.endsWith('.sql')).sort()
    .map((f) => path.join(SUPA, 'migrations', f)),
];
const sql = files.map((f) => readFileSync(f, 'utf8')).join('\n');

/** Policies still in force after replaying CREATE/DROP POLICY in order. */
function activePolicies(): Map<string, string> {
  const active = new Map<string, string>();
  const re = /(create\s+policy\s+"([^"]+)"\s+on\s+(\w+)[\s\S]*?;)|(drop\s+policy\s+if\s+exists\s+"([^"]+)"\s+on\s+(\w+))/gi;
  for (const m of sql.matchAll(re)) {
    if (m[1]) active.set(`${m[3].toLowerCase()}.${m[2]}`, m[1]);
    else active.delete(`${m[6].toLowerCase()}.${m[5]}`);
  }
  return active;
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(n) ? [p] : [];
  });
}

describe('family portal access', () => {
  it('grants family users no direct SELECT on clinical tables', () => {
    const leaks = [...activePolicies()]
      .filter(([key, body]) =>
        /^(patients|daily_care_records|medications|incidents)\./.test(key) && /family_members/i.test(body))
      .map(([key]) => key);
    expect(leaks).toEqual([]);
  });

  it('serves family data through RPCs that omit internal columns', () => {
    const incidents = /create\s+or\s+replace\s+function\s+family_incidents[\s\S]*?\$\$([\s\S]*?)\$\$/i.exec(sql);
    expect(incidents, 'family_incidents() not found').not.toBeNull();
    expect(incidents![1]).not.toMatch(/internal_notes|witnesses|follow_up_notes|reported_by|immediate_action|\*/);
    expect(incidents![1]).toMatch(/fm\.status\s*=\s*'active'/);

    const notes = /create\s+or\s+replace\s+function\s+family_care_notes[\s\S]*?\$\$([\s\S]*?)\$\$/i.exec(sql);
    expect(notes, 'family_care_notes() not found').not.toBeNull();
    expect(notes![1]).toMatch(/family_visible/);
    expect(notes![1]).toMatch(/fm\.status\s*=\s*'active'/);
  });

  it('family pages never query clinical tables directly', () => {
    const hits = walk(path.join(ROOT, 'app', 'family')).flatMap((f) => {
      const src = readFileSync(f, 'utf8');
      return [...src.matchAll(/\.from\(\s*['"](patients|daily_care_records|medications|incidents)['"]/g)]
        .map((m) => `${path.relative(ROOT, f)}: ${m[1]}`);
    });
    expect(hits).toEqual([]);
  });

  it('stamps message thread, sender and read state server-side', () => {
    expect(sql).toMatch(/create\s+trigger\s+\w+\s+before\s+insert\s+on\s+family_messages/i);
    const fn = /create\s+or\s+replace\s+function\s+stamp_family_message[\s\S]*?\$\$([\s\S]*?)\$\$/i.exec(sql);
    expect(fn, 'stamp_family_message() not found').not.toBeNull();
    for (const field of ['clinic_id', 'patient_id', 'sender_id', 'sender_name', 'read_at']) {
      expect(fn![1]).toMatch(new RegExp(`NEW\\.${field}\\s*:=`, 'i'));
    }
  });

  it('messages cannot be edited (except marking read) or deleted by staff', () => {
    expect(sql).toMatch(/create\s+trigger\s+\w+\s+before\s+update\s+on\s+family_messages/i);
    const staffPolicies = [...activePolicies()].filter(([k]) => k.startsWith('family_messages.'));
    expect(staffPolicies.some(([, body]) => /for\s+(all|delete)\b/i.test(body))).toBe(false);
  });

  it('deactivated family members lose read access to messages and visits', () => {
    const active = activePolicies();
    const familyReads = [...active].filter(([k, body]) =>
      /^(family_messages|visit_requests)\./.test(k) && /for\s+select/i.test(body) && /family_members/i.test(body));
    expect(familyReads.length).toBeGreaterThan(0);
    for (const [, body] of familyReads) expect(body).toMatch(/status\s*=\s*'active'/i);
  });
});
