import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clearThreads, getThread, parseInbound, sendMessage } from './adapter.js'
import { env } from './env.js'

test('webchat thread store', async () => {
  clearThreads()
  const inbound = parseInbound({ text: 'merhaba', threadId: 's1', senderId: 'u1' })
  assert.ok(inbound)
  await sendMessage({
    orgId: env.orgId,
    accountId: env.accountId,
    channel: 'webchat',
    threadId: 's1',
    text: 'hosgeldin',
  })
  assert.equal(getThread('s1').length, 2)
  assert.equal(getThread('s1')[0]?.direction, 'inbound')
  assert.equal(getThread('s1')[1]?.direction, 'outbound')
})
