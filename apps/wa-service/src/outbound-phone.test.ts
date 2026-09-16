import assert from 'node:assert/strict'
import test from 'node:test'
import type { WAMessage } from '@whiskeysockets/baileys'

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres'
process.env.WORKER_ID = process.env.WORKER_ID || 'test-worker'

test('outbound phone: PN remoteJid returns direct recipient phone', async () => {
  const { resolveOutboundPhone } = await import('./outbound-sync.js')
  const msg: WAMessage = {
    key: {
      remoteJid: '905453651319@s.whatsapp.net',
      fromMe: true,
      id: 'MSG1',
      senderPn: '905428212205@s.whatsapp.net',
    },
    message: { conversation: 'test' },
  }
  const phone = await resolveOutboundPhone(msg)
  assert.equal(phone, '+905453651319')
})

test('outbound phone: LID with peerRecipientPn returns recipient phone, NOT senderPn', async () => {
  const { resolveOutboundPhone } = await import('./outbound-sync.js')
  const msg = {
    key: {
      remoteJid: '223424299401426@lid',
      fromMe: true,
      id: 'MSG2',
      senderPn: '905428212205@s.whatsapp.net',
      peerRecipientPn: '905303331773@s.whatsapp.net',
    },
    message: { conversation: 'test' },
  } as unknown as WAMessage

  const phone = await resolveOutboundPhone(msg)
  assert.equal(phone, '+905303331773')
})

test('outbound phone: LID with resolveLidPn mapping resolves properly', async () => {
  const { resolveOutboundPhone } = await import('./outbound-sync.js')
  const msg = {
    key: {
      remoteJid: '223424299401426@lid',
      fromMe: true,
      id: 'MSG3',
      senderPn: '905428212205@s.whatsapp.net',
    },
    message: { conversation: 'test' },
  } as unknown as WAMessage

  const phone = await resolveOutboundPhone(msg, async (lid) => {
    if (lid === '223424299401426@lid') return '905304542816@s.whatsapp.net'
    return null
  })
  assert.equal(phone, '+905304542816')
})
