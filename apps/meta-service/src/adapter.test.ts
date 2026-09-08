import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseInbound, parseMetaWebhook, sendMessage, verifyWebhookChallenge } from './adapter.js'
import { env } from './env.js'

test('meta verify challenge', () => {
  const challenge = verifyWebhookChallenge('subscribe', env.verifyToken, '12345')
  assert.equal(challenge, '12345')
  assert.equal(verifyWebhookChallenge('subscribe', 'wrong', '12345'), null)
})

test('meta webhook messaging parse', () => {
  const events = parseMetaWebhook({
    object: 'instagram',
    entry: [
      {
        id: 'ig-1',
        messaging: [
          {
            sender: { id: 'user-1' },
            message: { mid: 'm-1', text: 'merhaba ig' },
            timestamp: Date.now(),
          },
        ],
      },
    ],
  })
  assert.equal(events.length, 1)
  assert.equal(events[0]?.channel, 'instagram')
  assert.equal(events[0]?.text, 'merhaba ig')
})

test('meta mock send', async () => {
  const result = await sendMessage({
    orgId: env.orgId,
    accountId: env.accountId,
    channel: 'facebook',
    threadId: 'user-1',
    text: 'yanit',
  })
  assert.equal(result.ok, true)
  if (result.ok) assert.match(result.externalMessageId, /^mock-/)
})

test('meta parseInbound simple', () => {
  const event = parseInbound({ text: 'selam', senderId: 'u1', channel: 'facebook' })
  assert.ok(event)
  assert.equal(event.channel, 'facebook')
})
