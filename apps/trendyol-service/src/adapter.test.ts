import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMockHttp, SAMPLE_CREDENTIALS } from '@wa/channel-runtime'
import {
  answerProductQuestion,
  lookupOrder,
  lookupStock,
  trendyolAuthHeader,
  trendyolOrdersPath,
  trendyolQnaAnswerPath,
} from './adapter.js'
import { loadTrendyolConfig } from './env.js'

test('trendyol mock order stock qna', async () => {
  const order = await lookupOrder('TY-1')
  assert.equal(order.ok, true)
  assert.equal(order.mock, true)

  const stock = await lookupStock('SKU-TY')
  assert.equal(stock.ok, true)

  const qna = await answerProductQuestion('Q-1', 'Evet stokta')
  assert.equal(qna.ok, true)
  assert.equal(qna.data?.answer, 'Evet stokta')
})

test('trendyol LIVE order lookup with Basic auth from sample credentials', async () => {
  const sellerId = SAMPLE_CREDENTIALS.trendyolSellerId
  const expectedAuth = trendyolAuthHeader(
    loadTrendyolConfig({
      token: SAMPLE_CREDENTIALS.trendyolKey,
      apiSecret: SAMPLE_CREDENTIALS.trendyolSecret,
    }),
  )
  const mock = createMockHttp()
  mock.on('GET', trendyolOrdersPath(sellerId), (req) => {
    assert.equal(req.headers.authorization, expectedAuth)
    assert.match(req.url, /orderNumber=TY-LIVE/)
    return { json: { content: [{ orderNumber: 'TY-LIVE', status: 'Created' }] } }
  })
  const { base, close } = await mock.listen()
  try {
    const result = await lookupOrder('TY-LIVE', {
      mockMode: false,
      liveEnabled: true,
      token: SAMPLE_CREDENTIALS.trendyolKey,
      apiSecret: SAMPLE_CREDENTIALS.trendyolSecret,
      sellerId,
      apiBase: base,
    })
    assert.equal(result.ok, true)
    assert.equal(result.mock, false)
    assert.equal(mock.calls.length, 1)
  } finally {
    await close()
  }
})

test('trendyol LIVE QnA answer with Basic auth from sample credentials', async () => {
  const sellerId = SAMPLE_CREDENTIALS.trendyolSellerId
  const expectedAuth = trendyolAuthHeader(
    loadTrendyolConfig({
      token: SAMPLE_CREDENTIALS.trendyolKey,
      apiSecret: SAMPLE_CREDENTIALS.trendyolSecret,
    }),
  )
  const mock = createMockHttp()
  mock.on('POST', trendyolQnaAnswerPath(sellerId, 'Q-LIVE'), (req) => {
    assert.equal(req.headers.authorization, expectedAuth)
    const body = JSON.parse(req.body) as { text: string }
    assert.equal(body.text, 'Evet stokta')
    return { json: { questionId: 'Q-LIVE' } }
  })
  const { base, close } = await mock.listen()
  try {
    const result = await answerProductQuestion('Q-LIVE', 'Evet stokta', {
      mockMode: false,
      liveEnabled: true,
      token: SAMPLE_CREDENTIALS.trendyolKey,
      apiSecret: SAMPLE_CREDENTIALS.trendyolSecret,
      sellerId,
      apiBase: base,
    })
    assert.equal(result.ok, true)
    assert.equal(result.mock, false)
    assert.equal(mock.calls.length, 1)
  } finally {
    await close()
  }
})
