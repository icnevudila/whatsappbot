import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const kitRoot = resolve(here, '..')
const manifest = JSON.parse(readFileSync(join(kitRoot, 'schema/manifest.json'), 'utf8'))
const migrationsDir = resolve(kitRoot, manifest.sourceRoot)

const missing = []
for (const file of manifest.files) {
  const path = join(migrationsDir, file)
  if (!existsSync(path)) missing.push(file)
}

if (missing.length) {
  console.error('Eksik migration dosyalari:')
  for (const f of missing) console.error(' -', f)
  process.exit(1)
}

console.log(`OK: ${manifest.files.length} worker migration mevcut (${migrationsDir})`)
