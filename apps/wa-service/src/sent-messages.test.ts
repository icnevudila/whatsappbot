import assert from 'node:assert/strict'
import test from 'node:test'
import { deserializeSentMessage, serializeSentMessage } from './sent-message-codec.js'

test('sent message codec preserves binary fields for Baileys getMessage', () => {
  const original = {
    imageMessage: {
      caption: 'Merhaba',
      mediaKey: Buffer.from([1, 2, 3, 4]),
      fileSha256: Uint8Array.from([5, 6, 7, 8]),
    },
  }

  const stored = JSON.parse(serializeSentMessage(original))
  const restored = deserializeSentMessage(stored)

  assert.equal(restored?.imageMessage?.caption, 'Merhaba')
  assert.deepEqual(
    Buffer.from(restored?.imageMessage?.mediaKey as Uint8Array),
    Buffer.from([1, 2, 3, 4]),
  )
  assert.deepEqual(
    Buffer.from(restored?.imageMessage?.fileSha256 as Uint8Array),
    Buffer.from([5, 6, 7, 8]),
  )
})
