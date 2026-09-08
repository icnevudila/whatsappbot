import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lookupOrder, lookupStock, magentoOrderPath, magentoStockPath } from './adapter.js'

test('magento paths + mock', async () => {
  assert.equal(magentoOrderPath('12'), '/rest/V1/orders/12')
  assert.equal(magentoStockPath('SKU'), '/rest/V1/stockItems/SKU')
  const order = await lookupOrder('12')
  assert.equal(order.ok, true)
  assert.ok(Array.isArray(order.data?.items))
  assert.equal((await lookupStock('SKU')).ok, true)
})
