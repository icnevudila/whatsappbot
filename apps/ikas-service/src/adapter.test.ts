import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMockHttp, SAMPLE_CREDENTIALS } from '@wa/channel-runtime'
import { buildIkasOrderQuery, ikasGraphqlPath, lookupOrder, lookupStock } from './adapter.js'

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

test('ikas LIVE order lookup with sample credentials against mock GraphQL', async () => {
  const mock = createMockHttp()
  mock.on('POST', ikasGraphqlPath(), (req) => {
    assert.match(req.headers.authorization ?? '', new RegExp(SAMPLE_CREDENTIALS.genericBearer))
    const body = JSON.parse(req.body) as { variables: { id: string } }
    assert.equal(body.variables.id, 'ORD-LIVE')
    return {
      json: {
        data: {
          order: {
            id: 'ord-live',
            orderNumber: 'ORD-LIVE',
            status: 'processing',
            totalAmount: 250,
            currency: 'TRY',
          },
        },
      },
    }
  })
  const { base, close } = await mock.listen()
  try {
    const result = await lookupOrder('ORD-LIVE', {
      mockMode: false,
      liveEnabled: true,
      token: SAMPLE_CREDENTIALS.genericBearer,
      apiBase: base,
    })
    assert.equal(result.ok, true)
    assert.equal(result.mock, false)
    assert.equal(result.data?.orderNumber, 'ORD-LIVE')
    assert.equal(mock.calls.length, 1)
  } finally {
    await close()
  }
})
