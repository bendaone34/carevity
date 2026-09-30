// @vitest-environment node
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

// Scans every file git would commit (tracked + untracked-but-not-ignored) for
// credentials. Regression guard for the service_role key that was committed in
// scripts/seed*.mjs — secrets must come from the environment, never source.

const ROOT = path.resolve(__dirname, '..', '..');

const BINARY_EXT = /\.(png|jpe?g|gif|webp|ico|svg|woff2?|ttf|eot|pdf|zip)$/i;
const SKIP = new Set(['package-lock.json']);

const PATTERNS: { name: string; re: RegExp }[] = [
  // Any Supabase/HS256 JWT (anon and service_role keys both look like this)
  { name: 'JWT', re: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: 'Supabase secret key', re: /sb_secret_[A-Za-z0-9_-]{10,}/ },
  { name: 'Google API key', re: /AIza[0-9A-Za-z_-]{35}/ },
  { name: 'Anthropic API key', re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  // Postgres URL with an inline password (user:pass@host)
  { name: 'Postgres URL with password', re: /postgres(?:ql)?:\/\/[^\s:/@]+:[^\s@]+@/ },
  // Hardcoded password constants (a PASSWORD const assigned a string literal)
  { name: 'Hardcoded password', re: /\bPASSWORD\s*=\s*['"][^'"]{6,}['"]/ },
];

function committableFiles(): string[] {
  const out = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard'],
    { cwd: ROOT, encoding: 'utf8' },
  );
  return out
    .split('\n')
    .filter(Boolean)
    .filter((f) => !BINARY_EXT.test(f) && !SKIP.has(path.basename(f)));
}

export function findSecrets(files: string[], read: (f: string) => string) {
  const hits: string[] = [];
  for (const file of files) {
    let text: string;
    try {
      text = read(file);
    } catch {
      continue; // deleted in working tree
    }
    text.split('\n').forEach((line, i) => {
      for (const { name, re } of PATTERNS) {
        if (re.test(line)) hits.push(`${file}:${i + 1} — ${name}`);
      }
    });
  }
  return hits;
}

describe('no hardcoded secrets', () => {
  it('detects a JWT and a hardcoded password (sanity check of the scanner)', () => {
    const fake = {
      'a.mjs': `const KEY = '${'eyJ' + 'x'.repeat(12)}.${'eyJ' + 'y'.repeat(12)}.${'z'.repeat(12)}'`,
      'b.mjs': `const PASSWORD = '${'Secret' + '123!'}'`,
      'c.mjs': `const key = process.env.SUPABASE_SERVICE_ROLE_KEY`,
    };
    const hits = findSecrets(Object.keys(fake), (f) => fake[f as keyof typeof fake]);
    expect(hits).toEqual(['a.mjs:1 — JWT', 'b.mjs:1 — Hardcoded password']);
  });

  it('no committable file contains a credential', () => {
    const hits = findSecrets(committableFiles(), (f) => readFileSync(path.join(ROOT, f), 'utf8'));
    expect(hits, `Move these to environment variables:\n${hits.join('\n')}`).toEqual([]);
  });
});
