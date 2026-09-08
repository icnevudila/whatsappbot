import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseInbound, sendMessage } from './adapter.js'
import { env } from './env.js'

test('wechat text message parse + mock send', async () => {
  const event = parseInbound({
    MsgType: 'text',
    FromUserName: 'wx-user',
    Content: 'merhaba',
    MsgId: '99',
  })
  assert.ok(event)
  assert.equal(event.channel, 'wechat')
  assert.equal(event.text, 'merhaba')
  const result = await sendMessage({
    orgId: env.orgId,
    accountId: env.accountId,
    channel: 'wechat',
    threadId: 'wx-user',
    text: 'yanit',
  })
  assert.equal(result.ok, true)
})
