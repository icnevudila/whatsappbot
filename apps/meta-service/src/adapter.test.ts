import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMockHttp, SAMPLE_CREDENTIALS } from '@wa/channel-runtime'
import {
  metaSendUrl,
  parseInbound,
  parseMetaWebhook,
  sendMessage,
  verifyWebhookChallenge,
} from './adapter.js'

test('meta verify + postback parse', () => {
  assert.equal(
    verifyWebhookChallenge('subscribe', SAMPLE_CREDENTIALS.metaVerifyToken, '42', {
      verifyToken: SAMPLE_CREDENTIALS.metaVerifyToken,
    }),
    '42',
  )

  const events = parseMetaWebhook({
    object: 'page',
    entry: [
      {
        messaging: [
          {
            sender: { id: 'PSID1' },
            postback: { payload: 'GET_STARTED', title: 'Başla' },
            timestamp: Date.now(),
          },
        ],
      },
    ],
  })
  assert.equal(events[0]?.channel, 'facebook')
  assert.equal(events[0]?.text, 'GET_STARTED')
})

test('meta LIVE send with sample page token', async () => {
  const pageId = 'sample-page-id'
  const mock = createMockHttp()
  mock.on('POST', `/${pageId}/messages`, (req) => {
    assert.match(req.headers.authorization ?? '', new RegExp(SAMPLE_CREDENTIALS.metaPageToken))
    const body = JSON.parse(req.body) as { recipient: { id: string }; message: { text: string } }
    assert.equal(body.recipient.id, 'PSID1')
    assert.equal(body.message.text, 'merhaba')
    return { json: { message_id: 'mid.live.1' } }
  })
  const { base, close } = await mock.listen()
  try {
    assert.equal(metaSendUrl(base, pageId), `${base}/${pageId}/messages`)
    const result = await sendMessage(
      {
        orgId: 'o',
        accountId: 'a',
        channel: 'facebook',
        threadId: 'PSID1',
        text: 'merhaba',
      },
      {
        mockMode: false,
        liveEnabled: true,
        token: SAMPLE_CREDENTIALS.metaPageToken,
        apiBase: base,
        pageId,
      },
    )
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.equal(result.externalMessageId, 'mid.live.1')
      assert.equal(result.mock, false)
    }
  } finally {
    await close()
  }
})

test('meta parseInbound simple', () => {
  const event = parseInbound({ text: 'selam', senderId: 'u1', channel: 'instagram' })
  assert.ok(event)
  assert.equal(event.channel, 'instagram')
})
