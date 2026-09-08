import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buildShopifyOrderQuery,
  buildShopifyStockQuery,
  lookupOrder,
  lookupStock,
  shopifyGraphqlUrl,
} from './adapter.js'

test('shopify query builders', () => {
  assert.match(buildShopifyOrderQuery('1001'), /orders\(/)
  assert.match(buildShopifyOrderQuery('gid://shopify/Order/1'), /order\(id/)
  assert.match(buildShopifyStockQuery(), /productVariants/)
  assert.equal(
    shopifyGraphqlUrl('https://demo.myshopify.com/'),
    'https://demo.myshopify.com/admin/api/2024-10/graphql.json',
  )
})

test('shopify mock order and stock rich', async () => {
  const order = await lookupOrder('ORD-1')
  assert.equal(order.ok, true)
  assert.equal(order.mock, true)
  assert.ok(Array.isArray(order.data?.lineItems))
  const stock = await lookupStock('SKU-1')
  assert.equal(stock.data?.available, 12)
})
