// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

// Tenant membership (profiles.role / profiles.clinic_id) and clinic creation
// must only change through SECURITY DEFINER RPCs or service-role API routes.
// Browser code writing them directly relies on RLS allowing self-escalation —
// audit finding H1: `update profiles set clinic_id = <victim>, role = 'admin'`.

const ROOT = path.resolve(__dirname, '..', '..');
const CLIENT_DIRS = ['app', 'components', 'lib', 'hooks'];
// Server routes using the service-role client after their own checks
const SERVER_ONLY = path.join('app', 'api');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) return walk(p);
    return /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

export function findPrivilegedWrites(file: string, src: string): string[] {
  const hits: string[] = [];
  // .from('profiles') ... .update({ ...role|clinic_id... })  within one statement
  for (const m of src.matchAll(/\.from\(\s*['"]profiles['"]\s*\)([\s\S]{0,200}?)\.update\(\s*\{([\s\S]*?)\}\s*\)/g)) {
    if (/\b(role|clinic_id)\s*:/.test(m[2])) hits.push(`${file}: updates profiles.role/clinic_id`);
  }
  if (/\.from\(\s*['"]clinics['"]\s*\)\s*\.insert\(/.test(src)) hits.push(`${file}: inserts into clinics`);
  return hits;
}

function latestFunctionBody(name: string): string | null {
  const dir = path.join(ROOT, 'supabase', 'migrations');
  let body: string | null = null;
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    const sql = readFileSync(path.join(dir, f), 'utf8');
    const re = new RegExp(`create\\s+(?:or\\s+replace\\s+)?function\\s+(?:public\\.)?${name}\\s*\\([\\s\\S]*?\\bas\\s+\\$\\$([\\s\\S]*?)\\$\\$`, 'gi');
    for (const m of sql.matchAll(re)) body = m[1];
  }
  return body;
}

describe('tenant membership writes', () => {
  it('flags a client-side role/clinic_id update and a clinics insert (checker sanity)', () => {
    const bad = `await supabase.from('profiles')\n  .update({ clinic_id: id, role: 'admin' })\n  .eq('id', uid);\n` +
                `await supabase.from('clinics').insert({ name });`;
    const ok  = `await supabase.from('profiles').update({ full_name: n, phone: p }).eq('id', uid);`;
    expect(findPrivilegedWrites('x.tsx', bad)).toEqual([
      'x.tsx: updates profiles.role/clinic_id',
      'x.tsx: inserts into clinics',
    ]);
    expect(findPrivilegedWrites('y.tsx', ok)).toEqual([]);
  });

  it('no browser/server-component code writes role or clinic_id or creates clinics directly', () => {
    const files = CLIENT_DIRS.flatMap((d) => walk(path.join(ROOT, d)))
      .filter((f) => !path.relative(ROOT, f).startsWith(SERVER_ONLY));
    const hits = files.flatMap((f) =>
      findPrivilegedWrites(path.relative(ROOT, f), readFileSync(f, 'utf8')),
    );
    expect(hits, hits.join('\n')).toEqual([]);
  });

  it('handle_new_user takes role and clinic_id only from app_metadata', () => {
    const body = latestFunctionBody('handle_new_user');
    expect(body, 'handle_new_user must be defined in supabase/migrations').not.toBeNull();
    // raw_user_meta_data is writable by the user at signUp()
    expect(body).not.toMatch(/raw_user_meta_data\s*->>\s*'(role|clinic_id)'/);
    expect(body).toMatch(/raw_app_meta_data\s*->>\s*'role'/);
  });
});
