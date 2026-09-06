import assert from 'node:assert/strict'
import { test } from 'node:test'
import { e164ToJid, jidToE164, toE164 } from './phone.js'

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
