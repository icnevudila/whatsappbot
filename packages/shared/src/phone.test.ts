import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  e164ToJid,
  extractPhoneFromCells,
  jidToE164,
  parsePhoneList,
  parsePhoneRows,
  toE164,
} from './phone.js'

test('toE164 TR national', () => {
  assert.equal(toE164('0532 123 45 67'), '+905321234567')
  assert.equal(toE164('5321234567'), '+905321234567')
})

test('toE164 already e164', () => {
  assert.equal(toE164('+905321234567'), '+905321234567')
})

test('toE164 rejects garbage', () => {
  assert.equal(toE164('abc'), null)
  assert.equal(toE164(''), null)
})

test('jid roundtrip', () => {
  const jid = e164ToJid('+905321234567')
  assert.equal(jid, '905321234567@s.whatsapp.net')
  assert.equal(jidToE164(jid), '+905321234567')
})

test('extractPhoneFromCells finds phone in any column', () => {
  const row = extractPhoneFromCells(['Ali Veli', 'İstanbul', '0532 111 22 33'])
  assert.ok(row)
  assert.equal(row!.phone_e164, '+905321112233')
  assert.equal(row!.name, 'Ali Veli')
})

test('parsePhoneRows with header phone column', () => {
  const result = parsePhoneRows(
    [
      ['Ad', 'Telefon', 'Şehir'],
      ['Ayşe', '5321234567', 'Ankara'],
      ['Boş', 'not-a-phone', 'İzmir'],
      ['Ayşe tekrar', '5321234567', 'Ankara'],
    ],
    { hasHeader: true },
  )
  assert.equal(result.valid.length, 1)
  assert.equal(result.valid[0]!.phone_e164, '+905321234567')
  assert.equal(result.duplicates, 1)
  assert.equal(result.invalid.length, 1)
})

test('parsePhoneList scans full line when first cell is name', () => {
  const result = parsePhoneList('Dönerci Ali; 0532 999 88 77; Kadıköy')
  assert.equal(result.valid.length, 1)
  assert.equal(result.valid[0]!.phone_e164, '+905329998877')
})
