import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMockHttp, SAMPLE_CREDENTIALS } from '@wa/channel-runtime'
import { clearThreads, getThread, parseInbound, sendMessage, webchatSendPath } from './adapter.js'

test('webchat thread store mock path', async () => {
  clearThreads()
  const inbound = parseInbound({ text: 'merhaba', threadId: 's1', senderId: 'u1' })
  assert.ok(inbound)
  await sendMessage({
    orgId: 'o',
    accountId: 'a',
    channel: 'webchat',
    threadId: 's1',
    text: 'hosgeldin',
  })
  assert.equal(getThread('s1').length, 2)
  assert.equal(getThread('s1')[0]?.direction, 'inbound')
  assert.equal(getThread('s1')[1]?.direction, 'outbound')
})

test('webchat LIVE send path with sample credentials against mock API', async () => {
  clearThreads()
  const mock = createMockHttp()
  mock.on('POST', webchatSendPath(), (req) => {
    assert.match(req.headers.authorization ?? '', new RegExp(SAMPLE_CREDENTIALS.genericBearer))
    const body = JSON.parse(req.body) as { threadId: string; text: string }
    assert.equal(body.threadId, 's-live')
    assert.equal(body.text, 'canli webchat')
    return { json: { ok: true } }
  })
  const { base, close } = await mock.listen()
  try {
    const result = await sendMessage(
      {
        orgId: 'o',
        accountId: 'a',
        channel: 'webchat',
        threadId: 's-live',
        text: 'canli webchat',
      },
      {
        mockMode: false,
        liveEnabled: true,
        token: SAMPLE_CREDENTIALS.genericBearer,
        apiBase: base,
      },
    )
    assert.equal(result.ok, true)
    if (result.ok) assert.equal(result.mock, false)
    assert.equal(mock.calls.length, 1)
    assert.equal(getThread('s-live').length, 1)
    assert.equal(getThread('s-live')[0]?.direction, 'outbound')
  } finally {
    await close()
  }
})
