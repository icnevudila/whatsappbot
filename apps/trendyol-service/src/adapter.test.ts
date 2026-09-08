import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMockHttp, SAMPLE_CREDENTIALS } from '@wa/channel-runtime'
import {
  answerProductQuestion,
  lookupOrder,
  lookupStock,
  trendyolAnswerPath,
  trendyolAuthHeader,
  trendyolOrdersPath,
} from './adapter.js'

test('trendyol mock order stock qna', async () => {
  assert.equal((await lookupOrder('TY-1')).ok, true)
  assert.equal((await lookupStock('SKU-TY')).ok, true)
  const qna = await answerProductQuestion('Q-1', 'Evet stokta')
  assert.equal(qna.data?.answer, 'Evet stokta')
})

test('trendyol LIVE order + Q&A with sample Basic auth', async () => {
  const sellerId = SAMPLE_CREDENTIALS.trendyolSellerId
  const mock = createMockHttp()
  const expectedAuth = trendyolAuthHeader(
    SAMPLE_CREDENTIALS.trendyolKey,
    SAMPLE_CREDENTIALS.trendyolSecret,
  )

  mock.on('GET', trendyolOrdersPath(sellerId, 'TY-99').split('?')[0]!, (req) => {
    // pathname won't include query in our mock key - register with full pathname from URL
    assert.equal(req.headers.authorization, expectedAuth)
    return { json: { content: [{ orderNumber: 'TY-99', status: 'Created' }] } }
  })

  // createMockHttp matches pathname only — register exact path without query
  mock.on('GET', `/integration/order/sellers/${sellerId}/orders`, (req) => {
    assert.equal(req.headers.authorization, expectedAuth)
    assert.match(req.url, /orderNumber=TY-99/)
    return { json: { content: [{ orderNumber: 'TY-99', status: 'Created' }] } }
  })

  mock.on('POST', trendyolAnswerPath(sellerId, 'Q-9'), (req) => {
    assert.equal(req.headers.authorization, expectedAuth)
    const body = JSON.parse(req.body) as { text: string }
    assert.equal(body.text, 'Kargo yarın')
    return { status: 200, json: { success: true } }
  })

  const { base, close } = await mock.listen()
  try {
    const order = await lookupOrder('TY-99', {
      mockMode: false,
      liveEnabled: true,
      apiKey: SAMPLE_CREDENTIALS.trendyolKey,
      apiSecret: SAMPLE_CREDENTIALS.trendyolSecret,
      sellerId,
      apiBase: base,
    })
    assert.equal(order.ok, true)
    assert.equal(order.mock, false)

    const qna = await answerProductQuestion('Q-9', 'Kargo yarın', {
      mockMode: false,
      liveEnabled: true,
      apiKey: SAMPLE_CREDENTIALS.trendyolKey,
      apiSecret: SAMPLE_CREDENTIALS.trendyolSecret,
      sellerId,
      apiBase: base,
    })
    assert.equal(qna.ok, true)
    assert.equal(qna.mock, false)
    assert.ok(mock.calls.length >= 2)
  } finally {
    await close()
  }
})
