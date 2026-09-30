// @vitest-environment node
import { readdirSync, readFileSync } from 'fs';
import path from 'path';

// SECURITY DEFINER functions run with the owner's rights and bypass RLS.
// Postgres grants EXECUTE to PUBLIC by default and Supabase exposes public
// functions over /rest/v1/rpc, so every such function must:
//   1. pin search_path (prevents search_path hijacking), and
//   2. unless it's a trigger function or an RLS helper that policies need,
//      have EXECUTE revoked from PUBLIC, anon and authenticated.
// Regression guard for audit finding C2 (callable alert functions leaked
// patient data across tenants).

const MIGRATIONS = path.resolve(__dirname, '..', '..', 'supabase', 'migrations');

// Helpers called inside RLS policies — the caller needs EXECUTE on these.
const CALLABLE_BY_DESIGN = new Set(['get_my_role', 'get_my_clinic_id']);
const REQUIRED_REVOKES = ['public', 'anon', 'authenticated'];

interface FnState {
  file: string;
  returnsTrigger: boolean;
  securityDefiner: boolean;
  pinnedSearchPath: boolean;
  revokedFrom: Set<string>;
}

const CREATE_FN =
  /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?(\w+)\s*\([^)]*\)\s*returns\s+(\w+)([\s\S]*?)\bas\s+\$\$/gi;
const REVOKE_FN =
  /revoke\s+(?:all|execute)(?:\s+privileges)?\s+on\s+function\s+(?:public\.)?(\w+)\s*\([^)]*\)\s+from\s+([^;]+);/gi;

export function analyse(files: { name: string; sql: string }[]) {
  const fns = new Map<string, FnState>();
  for (const { name, sql } of files) {
    // Apply statements in file order so a later REVOKE covers an earlier CREATE.
    const events: { at: number; apply: () => void }[] = [];
    for (const m of sql.matchAll(CREATE_FN)) {
      const [, fn, returns, header] = m;
      events.push({
        at: m.index!,
        apply: () => {
          const prev = fns.get(fn.toLowerCase());
          fns.set(fn.toLowerCase(), {
            file: name,
            returnsTrigger: returns.toLowerCase() === 'trigger',
            securityDefiner: /security\s+definer/i.test(header),
            pinnedSearchPath: /set\s+search_path/i.test(header),
            // CREATE OR REPLACE keeps existing grants/revokes
            revokedFrom: prev?.revokedFrom ?? new Set(),
          });
        },
      });
    }
    for (const m of sql.matchAll(REVOKE_FN)) {
      const [, fn, roles] = m;
      events.push({
        at: m.index!,
        apply: () => {
          const state = fns.get(fn.toLowerCase());
          if (!state) return;
          roles.split(',').forEach((r) => state.revokedFrom.add(r.trim().toLowerCase()));
        },
      });
    }
    events.sort((a, b) => a.at - b.at).forEach((e) => e.apply());
  }

  const problems: string[] = [];
  for (const [fn, s] of fns) {
    if (!s.securityDefiner) continue;
    if (!s.pinnedSearchPath) problems.push(`${fn} (${s.file}): SECURITY DEFINER without SET search_path`);
    if (s.returnsTrigger || CALLABLE_BY_DESIGN.has(fn)) continue;
    const missing = REQUIRED_REVOKES.filter((r) => !s.revokedFrom.has(r));
    if (missing.length) problems.push(`${fn} (${s.file}): EXECUTE not revoked from ${missing.join(', ')}`);
  }
  return problems;
}

describe('SECURITY DEFINER functions', () => {
  it('flags an unpinned, unrevoked function and accepts a locked-down one (checker sanity)', () => {
    const open = `CREATE FUNCTION leak(p UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN END; $$;`;
    const locked = `CREATE OR REPLACE FUNCTION leak(p UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN END; $$;
      REVOKE EXECUTE ON FUNCTION leak(UUID) FROM PUBLIC, anon, authenticated;`;
    const trigger = `CREATE FUNCTION trg() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN RETURN NEW; END; $$;`;

    expect(analyse([{ name: '1.sql', sql: open }])).toEqual([
      'leak (1.sql): SECURITY DEFINER without SET search_path',
      'leak (1.sql): EXECUTE not revoked from public, anon, authenticated',
    ]);
    expect(analyse([{ name: '1.sql', sql: open }, { name: '2.sql', sql: locked }])).toEqual([]);
    expect(analyse([{ name: '1.sql', sql: trigger }])).toEqual([]);
  });

  it('every SECURITY DEFINER function in supabase/migrations is locked down', () => {
    const files = readdirSync(MIGRATIONS)
      .filter((f) => f.endsWith('.sql'))
      .sort()
      .map((name) => ({ name, sql: readFileSync(path.join(MIGRATIONS, name), 'utf8') }));
    const problems = analyse(files);
    expect(problems, problems.join('\n')).toEqual([]);
  });
});
