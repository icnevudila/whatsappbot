import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMockHttp, SAMPLE_CREDENTIALS } from '@wa/channel-runtime'
import { parseInbound, sendMessage, wechatSendPath } from './adapter.js'

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
    orgId: 'o',
    accountId: 'a',
    channel: 'wechat',
    threadId: 'wx-user',
    text: 'yanit',
  })
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.mock, true)
})

test('wechat LIVE path with sample credentials against mock API', async () => {
  const mock = createMockHttp()
  mock.on('POST', wechatSendPath(), (req) => {
    assert.match(req.headers.authorization ?? '', new RegExp(SAMPLE_CREDENTIALS.genericBearer))
    const body = JSON.parse(req.body) as { touser: string; text: { content: string } }
    assert.equal(body.touser, 'wx-user')
    assert.equal(body.text.content, 'canli yanit')
    return { json: { msgid: 'wx-live-1' } }
  })
  const { base, close } = await mock.listen()
  try {
    const result = await sendMessage(
      {
        orgId: 'o',
        accountId: 'a',
        channel: 'wechat',
        threadId: 'wx-user',
        text: 'canli yanit',
      },
      {
        mockMode: false,
        liveEnabled: true,
        token: SAMPLE_CREDENTIALS.genericBearer,
        apiBase: base,
      },
    )
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.equal(result.externalMessageId, 'wx-live-1')
      assert.equal(result.mock, false)
    }
    assert.equal(mock.calls.length, 1)
  } finally {
    await close()
  }
})
