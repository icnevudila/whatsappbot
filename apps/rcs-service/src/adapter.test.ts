import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseInbound, sendMessage } from './adapter.js'
import { env } from './env.js'

test('rcs parse + mock send', async () => {
  const event = parseInbound({
    senderPhoneNumber: '+905551112233',
    text: 'merhaba rcs',
    messageId: 'rcs-1',
  })
  assert.ok(event)
  assert.equal(event.channel, 'rcs')
  assert.equal(event.externalThreadId, '+905551112233')
  const result = await sendMessage({
    orgId: env.orgId,
    accountId: env.accountId,
    channel: 'rcs',
    threadId: '+905551112233',
    text: 'yanit',
  })
  assert.equal(result.ok, true)
})
