// Shared env loader for local scripts. Secrets live in .env.local (gitignored),
// never in source. Run scripts with: node --env-file=.env.local scripts/<name>.mjs
export function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing ${name}. Add it to .env.local and run with --env-file=.env.local`)
    process.exit(1)
  }
  return value
}
