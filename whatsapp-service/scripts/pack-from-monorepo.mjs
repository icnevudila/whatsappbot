/**
 * Monorepo kaynaklarından taşınabilir `whatsapp-service/` paketini üretir.
 *
 * Repo kökünden:
 *   node whatsapp-service/scripts/pack-from-monorepo.mjs
 *
 * Kopyalananlar:
 *   apps/wa-service  → whatsapp-service/apps/wa-service
 *   packages/shared  → whatsapp-service/packages/shared
 *   SQL demeti       → whatsapp-service/schema/
 *   worker-contract  → whatsapp-service/docs/
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const here = dirname(fileURLToPath(import.meta.url))
const packRoot = resolve(here, '..')
const repoRoot = resolve(packRoot, '..')

const SKIP = new Set([
  'node_modules',
  '.env',
  'dist',
  '.turbo',
  'coverage',
  '.DS_Store',
])

function shouldSkip(src) {
  const base = src.split(/[/\\]/).pop()
  if (!base) return false
  if (SKIP.has(base)) return true
  if (base.endsWith('.log')) return true
  return false
}

function mirror(fromRel, toRel) {
  const from = join(repoRoot, fromRel)
  const to = join(packRoot, toRel)
  if (!existsSync(from)) {
    console.error('Kaynak yok:', from)
    process.exit(1)
  }
  rmSync(to, { recursive: true, force: true })
  mkdirSync(dirname(to), { recursive: true })
  cpSync(from, to, {
    recursive: true,
    filter: (src) => !shouldSkip(src),
  })
  console.log(`✓ ${fromRel} → ${toRel}`)
}

console.log('Paketleniyor →', packRoot)

mirror('apps/wa-service', 'apps/wa-service')
mirror('packages/shared', 'packages/shared')

// Servis Dockerfile'ı monorepo yollarına bağlı; pakette kendi Dockerfile kullanılır.
rmSync(join(packRoot, 'apps/wa-service/Dockerfile'), { force: true })

// Schema demeti
const bundleScript = join(repoRoot, 'packages/wa-worker-kit/scripts/bundle-sql.mjs')
const schemaOut = join(packRoot, 'schema/worker-schema.bundle.sql')
mkdirSync(join(packRoot, 'schema'), { recursive: true })
const bundled = spawnSync(process.execPath, [bundleScript, '--out', schemaOut], {
  cwd: repoRoot,
  encoding: 'utf8',
})
if (bundled.status !== 0) {
  console.error(bundled.stdout)
  console.error(bundled.stderr)
  process.exit(bundled.status ?? 1)
}
console.log('✓ schema/worker-schema.bundle.sql')

cpSync(
  join(repoRoot, 'packages/wa-worker-kit/schema/standalone-auth-stub.sql'),
  join(packRoot, 'schema/standalone-auth-stub.sql'),
)
cpSync(
  join(repoRoot, 'packages/wa-worker-kit/schema/manifest.json'),
  join(packRoot, 'schema/manifest.json'),
)
console.log('✓ schema stubs + manifest')

cpSync(
  join(repoRoot, 'docs/worker-contract.md'),
  join(packRoot, 'docs/worker-contract.md'),
)
if (existsSync(join(repoRoot, 'docs/autoscale.md'))) {
  cpSync(join(repoRoot, 'docs/autoscale.md'), join(packRoot, 'docs/autoscale.md'))
}
console.log('✓ docs')

// .env.example servis köküne de koy
cpSync(
  join(packRoot, 'apps/wa-service/.env.example'),
  join(packRoot, '.env.example'),
)

const stamp = {
  generatedAt: new Date().toISOString(),
  sourceRepo: 'whatsapp (Filo)',
  sources: {
    service: 'apps/wa-service',
    shared: 'packages/shared',
    schema: 'packages/wa-worker-kit + supabase/migrations',
  },
}
writeFileSync(join(packRoot, 'PACK_MANIFEST.json'), JSON.stringify(stamp, null, 2) + '\n')
console.log('✓ PACK_MANIFEST.json')
console.log('\nHazır. Bu klasörü başka projeye kopyalayabilir veya docker compose ile çalıştırabilirsiniz.')
console.log('  cd whatsapp-service && cp .env.example .env && docker compose up -d --build')
