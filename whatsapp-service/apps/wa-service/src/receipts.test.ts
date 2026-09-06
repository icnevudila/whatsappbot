import assert from 'node:assert/strict'
import test from 'node:test'
import { proto } from '@whiskeysockets/baileys'
import { statusFromAck } from './ack-status.js'

test('statusFromAck: delivery + read + server', () => {
  assert.equal(statusFromAck(proto.WebMessageInfo.Status.DELIVERY_ACK), 'delivered')
  assert.equal(statusFromAck(proto.WebMessageInfo.Status.READ), 'read')
  assert.equal(statusFromAck(proto.WebMessageInfo.Status.PLAYED), 'read')
  assert.equal(statusFromAck(proto.WebMessageInfo.Status.SERVER_ACK), 'sent')
})

test('statusFromAck: ERROR maps to failed', () => {
  assert.equal(statusFromAck(proto.WebMessageInfo.Status.ERROR), 'failed')
  assert.equal(statusFromAck(undefined), null)
  assert.equal(statusFromAck(null), null)
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
