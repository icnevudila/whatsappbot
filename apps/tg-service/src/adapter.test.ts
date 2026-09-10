import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMockHttp, SAMPLE_CREDENTIALS } from '@wa/channel-runtime'
import { parseInbound, sendMessage, telegramSendUrl } from './adapter.js'

test('tg parse message + callback_query', () => {
  const msg = parseInbound({
    update_id: 1,
    message: {
      message_id: 77,
      text: 'merhaba',
      chat: { id: 100 },
      from: { id: 9 },
    },
  })
  assert.ok(msg)
  assert.equal(msg.text, 'merhaba')
  assert.equal(msg.externalThreadId, '100')

  const cb = parseInbound({
    callback_query: {
      id: 'cb1',
      data: 'btn:ok',
      from: { id: 9 },
      message: { chat: { id: 100 }, message_id: 1 },
    },
  })
  assert.ok(cb)
  assert.equal(cb.text, 'btn:ok')
  assert.equal(cb.externalMessageId, 'cb:cb1')
})

test('tg mock send (default)', async () => {
  const result = await sendMessage({
    orgId: 'o',
    accountId: 'a',
    channel: 'telegram',
    threadId: '100',
    text: 'yanit',
  })
  assert.equal(result.ok, true)
  if (result.ok) assert.match(result.externalMessageId, /^mock-telegram-/)
})

test('tg LIVE path with sample credentials against mock Telegram API', async () => {
  const mock = createMockHttp()
  mock.on('POST', `/bot${SAMPLE_CREDENTIALS.telegramToken}/sendMessage`, (req) => {
    const body = JSON.parse(req.body) as { chat_id: number; text: string }
    assert.equal(body.chat_id, 100)
    assert.equal(body.text, 'canli yanit')
    return { json: { ok: true, result: { message_id: 555 } } }
  })
  const { base, close } = await mock.listen()
  try {
    assert.equal(
      telegramSendUrl(base, SAMPLE_CREDENTIALS.telegramToken),
      `${base}/bot${SAMPLE_CREDENTIALS.telegramToken}/sendMessage`,
    )
    const result = await sendMessage(
      {
        orgId: 'o',
        accountId: 'a',
        channel: 'telegram',
        threadId: '100',
        text: 'canli yanit',
      },
      {
        mockMode: false,
        liveEnabled: true,
        token: SAMPLE_CREDENTIALS.telegramToken,
        apiBase: base,
      },
    )
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.equal(result.externalMessageId, '555')
      assert.equal(result.mock, false)
    }
    assert.equal(mock.calls.length, 1)
  } finally {
    await close()
  }
})

test('tg LIVE path surfaces API errors', async () => {
  const mock = createMockHttp()
  mock.on('POST', `/bot${SAMPLE_CREDENTIALS.telegramToken}/sendMessage`, {
    status: 400,
    json: { ok: false, description: 'Bad Request: chat not found' },
  })
  const { base, close } = await mock.listen()
  try {
    const result = await sendMessage(
      {
        orgId: 'o',
        accountId: 'a',
        channel: 'telegram',
        threadId: '999',
        text: 'x',
      },
      {
        mockMode: false,
        liveEnabled: true,
        token: SAMPLE_CREDENTIALS.telegramToken,
        apiBase: base,
      },
    )
    assert.equal(result.ok, false)
    if (!result.ok) assert.match(result.error, /chat not found|http_400/)
  } finally {
    await close()
  }
})
