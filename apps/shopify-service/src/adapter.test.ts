import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMockHttp, SAMPLE_CREDENTIALS } from '@wa/channel-runtime'
import {
  buildShopifyOrderQuery,
  buildShopifyStockQuery,
  lookupOrder,
  lookupStock,
  shopifyGraphqlPath,
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

test('shopify LIVE GraphQL with sample admin token', async () => {
  const mock = createMockHttp()
  mock.on('POST', shopifyGraphqlPath(), (req) => {
    assert.equal(req.headers['x-shopify-access-token'], SAMPLE_CREDENTIALS.shopifyToken)
    const body = JSON.parse(req.body) as { query: string; variables: { query?: string } }
    assert.match(body.query, /orders|order/)
    return {
      json: {
        data: {
          orders: {
            edges: [
              {
                node: {
                  id: 'gid://shopify/Order/1',
                  name: '#1001',
                  displayFinancialStatus: 'PAID',
                  totalPriceSet: { shopMoney: { amount: '199.90', currencyCode: 'TRY' } },
                },
              },
            ],
          },
        },
      },
    }
  })
  const { base, close } = await mock.listen()
  try {
    const result = await lookupOrder('#1001', {
      mockMode: false,
      liveEnabled: true,
      token: SAMPLE_CREDENTIALS.shopifyToken,
      shop: base,
    })
    assert.equal(result.ok, true)
    assert.equal(result.mock, false)
    assert.ok(result.data)
    assert.equal(mock.calls.length, 1)
  } finally {
    await close()
  }
})
