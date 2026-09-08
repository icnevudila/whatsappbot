import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lookupOrder, lookupStock } from './adapter.js'

test('magento-service mock order and stock', async () => {
  const order = await lookupOrder('ORD-1')
  assert.equal(order.ok, true)
  assert.equal(order.mock, true)
  assert.equal(order.data?.orderId, 'ORD-1')

  const stock = await lookupStock('SKU-1')
  assert.equal(stock.ok, true)
  assert.equal(stock.mock, true)
  assert.equal(stock.data?.sku, 'SKU-1')
})
