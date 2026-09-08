import assert from 'node:assert/strict'
import { test } from 'node:test'
import { answerProductQuestion, lookupOrder, lookupStock } from './adapter.js'

test('hepsiburada mock flows', async () => {
  assert.equal((await lookupOrder('HB-1')).ok, true)
  assert.equal((await lookupStock('SKU-HB')).ok, true)
  const q = await answerProductQuestion('Q-HB', 'Kargo yarın')
  assert.equal(q.data?.answer, 'Kargo yarın')
})
