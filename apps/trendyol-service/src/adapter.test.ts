import assert from 'node:assert/strict'
import { test } from 'node:test'
import { answerProductQuestion, lookupOrder, lookupStock } from './adapter.js'

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
