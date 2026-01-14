import { loadEnvConfig } from '@next/env'
import { spawnSync } from 'node:child_process'

// Phase 4 Stage 2: Next.js app is relocated to apps/plumbers, but we keep .env.local
// at the repo root. Next only auto-loads env files from the project directory.
// We load env from the repo root, then invoke next against apps/plumbers.

const repoRoot = process.cwd()
loadEnvConfig(repoRoot)

const cmd = process.argv[2]
if (!cmd) {
  console.error('Usage: node tools/run-next.mjs <dev|build|start> [...args]')
  process.exit(1)
}

const args = [cmd, 'apps/plumbers', ...process.argv.slice(3)]

const result = spawnSync('next', args, {
  stdio: 'inherit',
  env: process.env,
  cwd: repoRoot,
  shell: process.platform === 'win32',
})

process.exit(result.status ?? 1)
