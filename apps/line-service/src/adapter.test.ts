import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { test } from 'node:test'
import { parseInbound, sendMessage, verifyLineSignature } from './adapter.js'
import { env } from './env.js'

test('line signature hmac', () => {
  const body = '{"events":[]}'
  const secret = 'secret'
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64')
  assert.equal(verifyLineSignature(body, sig, secret), true)
  assert.equal(verifyLineSignature(body, 'nope', secret), false)
})

test('line parse webhook + mock send', async () => {
  const event = parseInbound({
    events: [
      {
        type: 'message',
        replyToken: 'r1',
        source: { userId: 'U1' },
        message: { type: 'text', id: 'm1', text: 'merhaba' },
      },
    ],
  })
  assert.ok(event)
  assert.equal(event.channel, 'line')
  assert.equal(event.text, 'merhaba')
  assert.equal(event.externalThreadId, 'U1')

  const result = await sendMessage({
    orgId: env.orgId,
    accountId: env.accountId,
    channel: 'line',
    threadId: 'U1',
    text: 'yanit',
    metadata: { replyToken: 'r1' },
  })
  assert.equal(result.ok, true)
})
