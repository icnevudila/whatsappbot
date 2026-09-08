import assert from 'node:assert/strict'
import { test } from 'node:test'
import { erpOrderUrl, lookupOrder, lookupStock, provider } from './adapter.js'

test('erp provider urls + mock', async () => {
  assert.ok(provider)
  assert.match(erpOrderUrl('https://erp.example', 'SO-1'), /SO-1/)
  const order = await lookupOrder('SO-1')
  assert.equal(order.ok, true)
  assert.equal(order.data?.provider, provider)
  assert.equal((await lookupStock('SKU')).ok, true)
})
