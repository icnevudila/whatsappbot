import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { test } from 'node:test'
import { createMockHttp, SAMPLE_CREDENTIALS } from '@wa/channel-runtime'
import { parseInbound, sendMessage, verifyLineSignature } from './adapter.js'

test('line signature hmac', () => {
  const body = '{"events":[]}'
  const secret = SAMPLE_CREDENTIALS.lineChannelSecret
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
  assert.equal(event.text, 'merhaba')
  const result = await sendMessage({
    orgId: 'o',
    accountId: 'a',
    channel: 'line',
    threadId: 'U1',
    text: 'yanit',
    metadata: { replyToken: 'r1' },
  })
  assert.equal(result.ok, true)
})

test('line LIVE reply with sample channel token', async () => {
  const mock = createMockHttp()
  mock.on('POST', '/v2/bot/message/reply', (req) => {
    assert.equal(req.headers.authorization, `Bearer ${SAMPLE_CREDENTIALS.lineChannelToken}`)
    const body = JSON.parse(req.body) as { replyToken: string; messages: Array<{ text: string }> }
    assert.equal(body.replyToken, 'r-live')
    assert.equal(body.messages[0]?.text, 'canli')
    return { status: 200, json: {} }
  })
  const { base, close } = await mock.listen()
  try {
    const result = await sendMessage(
      {
        orgId: 'o',
        accountId: 'a',
        channel: 'line',
        threadId: 'U1',
        text: 'canli',
        metadata: { replyToken: 'r-live' },
      },
      {
        mockMode: false,
        liveEnabled: true,
        token: SAMPLE_CREDENTIALS.lineChannelToken,
        apiBase: base,
      },
    )
    assert.equal(result.ok, true)
    assert.equal(result.mock, false)
  } finally {
    await close()
  }
})
