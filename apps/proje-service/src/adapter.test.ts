import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMockHttp, SAMPLE_CREDENTIALS } from '@wa/channel-runtime'
import { lookupOrder, lookupStock, projeOrderPath } from './adapter.js'

test('proje-service mock order and stock', async () => {
  const order = await lookupOrder('ORD-1')
  assert.equal(order.ok, true)
  assert.equal(order.mock, true)
  assert.equal(order.data?.orderId, 'ORD-1')

  const stock = await lookupStock('SKU-1')
  assert.equal(stock.ok, true)
  assert.equal(stock.mock, true)
  assert.equal(stock.data?.sku, 'SKU-1')
})

test('proje LIVE order lookup with sample credentials against mock API', async () => {
  const mock = createMockHttp()
  mock.on('GET', projeOrderPath('ORD-LIVE'), (req) => {
    assert.match(req.headers.authorization ?? '', new RegExp(SAMPLE_CREDENTIALS.genericBearer))
    return { json: { orderId: 'ORD-LIVE', status: 'processing', total: 199.9 } }
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
    assert.equal(mock.calls.length, 1)
  } finally {
    await close()
  }
})
