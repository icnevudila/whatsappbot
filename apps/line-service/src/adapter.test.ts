import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { test } from 'node:test'
import { createMockHttp, SAMPLE_CREDENTIALS } from '@wa/channel-runtime'
import { lineSendPath, lineSendUrl, parseInbound, sendMessage, verifyLineSignature } from './adapter.js'

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
    orgId: 'o',
    accountId: 'a',
    channel: 'line',
    threadId: 'U1',
    text: 'yanit',
    metadata: { replyToken: 'r1' },
  })
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.mock, true)
})

test('line LIVE reply path with sample credentials', async () => {
  const mock = createMockHttp()
  mock.on('POST', lineSendPath('r-live'), (req) => {
    assert.match(req.headers.authorization ?? '', new RegExp(SAMPLE_CREDENTIALS.lineChannelToken))
    const body = JSON.parse(req.body) as { replyToken: string; messages: Array<{ text: string }> }
    assert.equal(body.replyToken, 'r-live')
    assert.equal(body.messages[0]?.text, 'canli yanit')
    return { json: {} }
  })
  const { base, close } = await mock.listen()
  try {
    assert.equal(lineSendUrl(base, 'r-live'), `${base}/v2/bot/message/reply`)
    const result = await sendMessage(
      {
        orgId: 'o',
        accountId: 'a',
        channel: 'line',
        threadId: 'U1',
        text: 'canli yanit',
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
    if (result.ok) assert.equal(result.mock, false)
    assert.equal(mock.calls.length, 1)
  } finally {
    await close()
  }
})

test('line LIVE push path with sample credentials', async () => {
  const mock = createMockHttp()
  mock.on('POST', lineSendPath(), (req) => {
    assert.match(req.headers.authorization ?? '', new RegExp(SAMPLE_CREDENTIALS.lineChannelToken))
    const body = JSON.parse(req.body) as { to: string; messages: Array<{ text: string }> }
    assert.equal(body.to, 'U-push')
    assert.equal(body.messages[0]?.text, 'push mesaj')
    return { json: {} }
  })
  const { base, close } = await mock.listen()
  try {
    const result = await sendMessage(
      {
        orgId: 'o',
        accountId: 'a',
        channel: 'line',
        threadId: 'U-push',
        text: 'push mesaj',
      },
      {
        mockMode: false,
        liveEnabled: true,
        token: SAMPLE_CREDENTIALS.lineChannelToken,
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
