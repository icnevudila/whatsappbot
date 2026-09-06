/**
 * Sentetik Excel ölçek testi: 1k / 10k satır parse süresi ve geçerli oranı.
 * `npm --prefix packages/shared test` ile birlikte çalışır.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { IMPORT_CHUNK_SIZE, parsePhoneRows } from './phone.js'

/** Benzersiz geçerli TR mobil numaraları + karışık sütunlar + ara sıra çöp. */
function syntheticRows(n: number): unknown[][] {
  const rows: unknown[][] = [['isim', 'şehir', 'telefon', 'not']]
  for (let i = 0; i < n; i += 1) {
    const seven = String(i).padStart(7, '0')
    if (i % 47 === 0) {
      rows.push(['Çöp', 'İstanbul', 'abc', 'yok'])
      continue
    }
    if (i % 3 === 0) {
      rows.push([`Kişi ${i}`, 'Ankara', `0532${seven}`, ''])
    } else if (i % 3 === 1) {
      rows.push([`+90533${seven}`, `Ad ${i}`, 'İzmir'])
    } else {
      rows.push([
        '',
        `İsim ${i}`,
        'Bursa',
        `532 ${seven.slice(0, 3)} ${seven.slice(3, 5)} ${seven.slice(5)}`,
      ])
    }
  }
  return rows
}

function runScale(label: string, n: number) {
  const rows = syntheticRows(n)
  const t0 = performance.now()
  const parsed = parsePhoneRows(rows, { hasHeader: true })
  const ms = performance.now() - t0
  const chunks = Math.ceil(parsed.valid.length / IMPORT_CHUNK_SIZE)

  console.log(
    `[scale ${label}] rows=${n} valid=${parsed.valid.length} invalid=${parsed.invalid.length} dup=${parsed.duplicates} ms=${ms.toFixed(0)} chunks@${IMPORT_CHUNK_SIZE}=${chunks}`,
  )

  assert.ok(parsed.valid.length > n * 0.9, 'çoğu satır geçerli olmalı')
  assert.ok(parsed.duplicates === 0, 'sentetik set tekrarsız olmalı')
  assert.ok(ms < 15_000, `${label} 15s altında parse edilmeli`)
  return parsed
}

test('scale 1k synthetic excel rows', () => {
  runScale('1k', 1_000)
})

test('scale 10k synthetic excel rows', () => {
  runScale('10k', 10_000)
})
