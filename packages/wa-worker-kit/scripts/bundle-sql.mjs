/**
 * Worker SQL demetini tek dosyaya yazar (harici VT'ye elle/psql ile uygulamak icin).
 * Kullanim (repo kokunden):
 *   node packages/wa-worker-kit/scripts/bundle-sql.mjs
 *   node packages/wa-worker-kit/scripts/bundle-sql.mjs --out /tmp/worker-schema.sql
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const kitRoot = resolve(here, '..')
const manifest = JSON.parse(readFileSync(join(kitRoot, 'schema/manifest.json'), 'utf8'))
const migrationsDir = resolve(kitRoot, manifest.sourceRoot)

const outArg = process.argv.findIndex((a) => a === '--out')
const outPath =
  outArg >= 0 && process.argv[outArg + 1]
    ? resolve(process.argv[outArg + 1])
    : join(kitRoot, 'dist/worker-schema.bundle.sql')

const parts = [
  `-- Filo wa-worker-kit schema bundle`,
  `-- Generated: ${new Date().toISOString()}`,
  `-- Files: ${manifest.files.length}`,
  ``,
]

for (const file of manifest.files) {
  const path = join(migrationsDir, file)
  if (!existsSync(path)) {
    console.error('Eksik:', file)
    process.exit(1)
  }
  parts.push(`-- ========== ${file} ==========`)
  parts.push(readFileSync(path, 'utf8').trimEnd())
  parts.push('')
}

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, parts.join('\n') + '\n', 'utf8')
console.log(`Yazildi: ${outPath}`)
