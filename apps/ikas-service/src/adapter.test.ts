import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildIkasOrderQuery, lookupOrder, lookupStock } from './adapter.js'

test('buildIkasOrderQuery shape', () => {
  const q = buildIkasOrderQuery('ORD-99')
  assert.match(q.query, /order\(id: \$id\)/)
  assert.equal(q.variables.id, 'ORD-99')
})

test('ikas-service mock order and stock', async () => {
  const order = await lookupOrder('ORD-1')
  assert.equal(order.ok, true)
  assert.equal(order.mock, true)
  assert.equal(order.data?.orderId, 'ORD-1')
  assert.equal(order.data?.customerEmail, 'ikas-mock@example.com')
  assert.ok(Array.isArray(order.data?.lineItems))

  const stock = await lookupStock('SKU-1')
  assert.equal(stock.ok, true)
  assert.equal(stock.mock, true)
  assert.equal(stock.data?.sku, 'SKU-1')
})
