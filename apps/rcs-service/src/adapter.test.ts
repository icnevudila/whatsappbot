import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMockHttp, SAMPLE_CREDENTIALS } from '@wa/channel-runtime'
import { parseInbound, rcsAgentMessagePath, sendMessage } from './adapter.js'

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
    orgId: 'o',
    accountId: 'a',
    channel: 'rcs',
    threadId: '+905551112233',
    text: 'yanit',
  })
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.mock, true)
})

test('rcs LIVE path with sample credentials against mock API', async () => {
  const phone = '+905551112233'
  const mock = createMockHttp()
  mock.on('POST', rcsAgentMessagePath(phone), (req) => {
    assert.match(req.headers.authorization ?? '', new RegExp(SAMPLE_CREDENTIALS.genericBearer))
    const body = JSON.parse(req.body) as { contentMessage: { text: string } }
    assert.equal(body.contentMessage.text, 'canli rcs')
    return { json: { name: 'messages/1' } }
  })
  const { base, close } = await mock.listen()
  try {
    const result = await sendMessage(
      {
        orgId: 'o',
        accountId: 'a',
        channel: 'rcs',
        threadId: phone,
        text: 'canli rcs',
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
  } finally {
    await close()
  }
})
