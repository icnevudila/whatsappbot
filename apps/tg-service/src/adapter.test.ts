import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseInbound, sendMessage } from './adapter.js'
import { env } from './env.js'

test('tg parse Telegram update shape', () => {
  const event = parseInbound({
    update_id: 1,
    message: {
      message_id: 77,
      text: 'merhaba',
      chat: { id: 100 },
      from: { id: 9 },
    },
  })
  assert.ok(event)
  assert.equal(event.channel, 'telegram')
  assert.equal(event.text, 'merhaba')
  assert.equal(event.externalThreadId, '100')
  assert.equal(event.externalMessageId, '77')
})

test('tg mock send', async () => {
  const result = await sendMessage({
    orgId: env.orgId,
    accountId: env.accountId,
    channel: 'telegram',
    threadId: '100',
    text: 'yanit',
  })
  assert.equal(result.ok, true)
  if (result.ok) assert.match(result.externalMessageId, /^mock-telegram-/)
})
