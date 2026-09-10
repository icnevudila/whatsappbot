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

test('shopify LIVE order lookup with sample credentials against mock GraphQL', async () => {
  const mock = createMockHttp()
  mock.on('POST', shopifyGraphqlPath(), (req) => {
    assert.equal(req.headers['x-shopify-access-token'], SAMPLE_CREDENTIALS.shopifyToken)
    const body = JSON.parse(req.body) as { query: string; variables: { query: string } }
    assert.match(body.query, /orders\(/)
    assert.equal(body.variables.query, 'name:1001')
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
                  displayFulfillmentStatus: 'UNFULFILLED',
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
    assert.equal(shopifyGraphqlUrl(base), `${base}${shopifyGraphqlPath()}`)
    const result = await lookupOrder('1001', {
      mockMode: false,
      liveEnabled: true,
      token: SAMPLE_CREDENTIALS.shopifyToken,
      apiBase: base,
    })
    assert.equal(result.ok, true)
    assert.equal(result.mock, false)
    assert.equal(mock.calls.length, 1)
  } finally {
    await close()
  }
})

test('shopify LIVE stock lookup with sample credentials against mock GraphQL', async () => {
  const mock = createMockHttp()
  mock.on('POST', shopifyGraphqlPath(), (req) => {
    assert.equal(req.headers['x-shopify-access-token'], SAMPLE_CREDENTIALS.shopifyToken)
    const body = JSON.parse(req.body) as { variables: { query: string } }
    assert.equal(body.variables.query, 'sku:SKU-LIVE')
    return {
      json: {
        data: {
          productVariants: {
            edges: [{ node: { sku: 'SKU-LIVE', inventoryQuantity: 7, title: 'Live variant' } }],
          },
        },
      },
    }
  })
  const { base, close } = await mock.listen()
  try {
    const result = await lookupStock('SKU-LIVE', {
      mockMode: false,
      liveEnabled: true,
      token: SAMPLE_CREDENTIALS.shopifyToken,
      apiBase: base,
    })
    assert.equal(result.ok, true)
    assert.equal(result.mock, false)
    assert.equal(mock.calls.length, 1)
  } finally {
    await close()
  }
})
