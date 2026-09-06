import assert from 'node:assert/strict'
import test from 'node:test'
import { jidToE164 } from '@wa/shared'
import { isOptOutMessage } from './opt-out.js'

/**
 * resolveInboundPhone kurallarinin DB'siz kopyasi (inbound.ts ile ayni oncelik).
 * LID icin senderPn / participantPn / mapping; aksi halde remoteJid.
 */
function resolvePhoneHints(input: {
  remoteJid?: string
  senderPn?: string
  participantPn?: string
  lidMapped?: string | null
}): string | null {
  const fromPnHint =
    jidToE164(input.senderPn ?? '') ?? jidToE164(input.participantPn ?? '') ?? null
  if (fromPnHint) return fromPnHint

  const remote = input.remoteJid ?? ''
  if (remote.endsWith('@lid')) {
    if (input.lidMapped) {
      return jidToE164(input.lidMapped) ?? (input.lidMapped.startsWith('+') ? input.lidMapped : null)
    }
    return null
  }

  return jidToE164(remote)
}

test('inbound phone: PN remoteJid', () => {
  assert.equal(resolvePhoneHints({ remoteJid: '905453651319@s.whatsapp.net' }), '+905453651319')
})

test('inbound phone: LID uses senderPn hint', () => {
  assert.equal(
    resolvePhoneHints({
      remoteJid: '123456789012345@lid',
      senderPn: '905344272751@s.whatsapp.net',
    }),
    '+905344272751',
  )
})

test('inbound phone: LID without mapping stays null', () => {
  assert.equal(resolvePhoneHints({ remoteJid: '123456789012345@lid' }), null)
})

test('opt-out keywords match TR/EN including Unicode boundaries', () => {
  assert.equal(isOptOutMessage('Lütfen dur yazma'), true)
  assert.equal(isOptOutMessage('STOP please'), true)
  assert.equal(isOptOutMessage('beni çıkar'), true)
  assert.equal(isOptOutMessage('beni çıkarın'), true)
  assert.equal(isOptOutMessage('iptal'), true)
  assert.equal(isOptOutMessage('merhaba nasılsın'), false)
  assert.equal(isOptOutMessage('durum nedir'), false)
})
