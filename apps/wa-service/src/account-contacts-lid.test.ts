import assert from 'node:assert/strict'
import test from 'node:test'

/**
 * Lightweight unit coverage for LID→PN phone extraction logic used by rehber import.
 * Mirrors pickPhoneJid / jid preference without DB.
 */
import { jidToE164 } from '@wa/shared'

type Raw = {
  id: string
  jid?: string | null
  lid?: string | null
}

function pickPhoneJid(c: Raw): string | null {
  for (const candidate of [c.jid, c.id]) {
    if (!candidate) continue
    if (candidate.includes('@g.us') || candidate.includes('@broadcast')) continue
    if (jidToE164(candidate)) return candidate
  }
  return null
}

test('LID id + PN jid → telefon jid tercih edilir', () => {
  const jid = pickPhoneJid({
    id: '123456789012345@lid',
    jid: '905551112233@s.whatsapp.net',
  })
  assert.equal(jid, '905551112233@s.whatsapp.net')
  assert.equal(jidToE164(jid!), '+905551112233')
})

test('yalnız LID id → telefon yok', () => {
  assert.equal(pickPhoneJid({ id: '123456789012345@lid' }), null)
})

test('klasik PN id → telefon', () => {
  const jid = pickPhoneJid({ id: '905551112233@s.whatsapp.net' })
  assert.equal(jidToE164(jid!), '+905551112233')
})
