import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMockHttp, SAMPLE_CREDENTIALS } from '@wa/channel-runtime'
import {
  answerProductQuestion,
  hepsiburadaOrderPath,
  hepsiburadaQnaAnswerPath,
  lookupOrder,
  lookupStock,
} from './adapter.js'

test('hepsiburada mock flows', async () => {
  assert.equal((await lookupOrder('HB-1')).ok, true)
  assert.equal((await lookupOrder('HB-1')).mock, true)
  assert.equal((await lookupStock('SKU-HB')).ok, true)
  const q = await answerProductQuestion('Q-HB', 'Kargo yarın')
  assert.equal(q.data?.answer, 'Kargo yarın')
})

test('hepsiburada LIVE order lookup with sample credentials against mock API', async () => {
  const mock = createMockHttp()
  mock.on('GET', hepsiburadaOrderPath('HB-LIVE'), (req) => {
    assert.match(req.headers.authorization ?? '', new RegExp(SAMPLE_CREDENTIALS.genericBearer))
    return { json: { orderId: 'HB-LIVE', status: 'Open' } }
  })
  const { base, close } = await mock.listen()
  try {
    const result = await lookupOrder('HB-LIVE', {
      mockMode: false,
      liveEnabled: true,
      token: SAMPLE_CREDENTIALS.genericBearer,
      apiBase: base,
    })
    assert.equal(result.ok, true)
    assert.equal(result.mock, false)
    assert.equal(mock.calls.length, 1)
  } finally {
    await close()
  }
})

test('hepsiburada LIVE QnA answer with sample credentials against mock API', async () => {
  const mock = createMockHttp()
  mock.on('POST', hepsiburadaQnaAnswerPath('Q-LIVE'), (req) => {
    assert.match(req.headers.authorization ?? '', new RegExp(SAMPLE_CREDENTIALS.genericBearer))
    const body = JSON.parse(req.body) as { text: string }
    assert.equal(body.text, 'Kargo yarın')
    return { json: { questionId: 'Q-LIVE' } }
  })
  const { base, close } = await mock.listen()
  try {
    const result = await answerProductQuestion('Q-LIVE', 'Kargo yarın', {
      mockMode: false,
      liveEnabled: true,
      token: SAMPLE_CREDENTIALS.genericBearer,
      apiBase: base,
    })
    assert.equal(result.ok, true)
    assert.equal(result.mock, false)
    assert.equal(mock.calls.length, 1)
  } finally {
    await close()
  }
})
