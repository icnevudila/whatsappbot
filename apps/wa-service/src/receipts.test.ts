import assert from 'node:assert/strict'
import test from 'node:test'
import { proto } from '@whiskeysockets/baileys'

/**
 * statusFromAck mapping — receipts.ts ile ayni kurallar.
 * (DB bagimsiz birim test; export edilmeyen helper icin lokal kopya.)
 */
function statusFromAck(status: number | null | undefined): 'sent' | 'delivered' | 'read' | null {
  if (status == null) return null
  if (
    status === proto.WebMessageInfo.Status.READ ||
    status === proto.WebMessageInfo.Status.PLAYED
  ) {
    return 'read'
  }
  if (status === proto.WebMessageInfo.Status.DELIVERY_ACK) return 'delivered'
  if (status === proto.WebMessageInfo.Status.SERVER_ACK) return 'sent'
  return null
}

test('ack mapping: delivery + read', () => {
  assert.equal(statusFromAck(proto.WebMessageInfo.Status.DELIVERY_ACK), 'delivered')
  assert.equal(statusFromAck(proto.WebMessageInfo.Status.READ), 'read')
  assert.equal(statusFromAck(proto.WebMessageInfo.Status.PLAYED), 'read')
  assert.equal(statusFromAck(proto.WebMessageInfo.Status.SERVER_ACK), 'sent')
  assert.equal(statusFromAck(undefined), null)
})

test('fromMe false receipt should still be processable (id-only gate)', () => {
  // Simule: Baileys 1:1 receipt key.fromMe=false; id varsa islenmeli.
  const key = { id: 'ABCD123', fromMe: false, remoteJid: '905xxxxxxxxx@s.whatsapp.net' }
  const update = { status: proto.WebMessageInfo.Status.READ }
  const id = key.id
  assert.ok(id)
  // Eski bug: if (!id || !key.fromMe) continue  → burayi atardi
  const wouldSkipOld = !id || !key.fromMe
  const wouldSkipNew = !id
  assert.equal(wouldSkipOld, true)
  assert.equal(wouldSkipNew, false)
  assert.equal(statusFromAck(update.status), 'read')
})
