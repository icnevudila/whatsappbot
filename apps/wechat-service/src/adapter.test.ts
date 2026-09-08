import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseInbound, sendMessage } from './adapter.js'
import { CHANNEL, env } from './env.js'

test('wechat-service parseInbound + mock send', async () => {
  const event = parseInbound({ text: 'merhaba', chatId: '100', senderId: '9', messageId: 'm1' })
  assert.ok(event)
  assert.equal(event.text, 'merhaba')
  assert.equal(event.externalThreadId, '100')
  const primary = Array.isArray(CHANNEL) ? CHANNEL[0] : CHANNEL
  assert.equal(event.channel, primary)

  const result = await sendMessage({
    orgId: env.orgId,
    accountId: env.accountId,
    channel: primary,
    threadId: '100',
    text: 'yanit',
  })
  assert.equal(result.ok, true)
  if (result.ok) assert.match(result.externalMessageId, /^mock-/)
})
