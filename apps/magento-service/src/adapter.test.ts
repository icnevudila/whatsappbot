import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMockHttp, SAMPLE_CREDENTIALS } from '@wa/channel-runtime'
import { lookupOrder, lookupStock, magentoOrderPath, magentoStockPath } from './adapter.js'

test('magento paths + mock', async () => {
  assert.equal(magentoOrderPath('12'), '/rest/V1/orders/12')
  assert.equal(magentoStockPath('SKU'), '/rest/V1/stockItems/SKU')
  const order = await lookupOrder('12')
  assert.equal(order.ok, true)
  assert.equal(order.mock, true)
  assert.ok(Array.isArray(order.data?.items))
  assert.equal((await lookupStock('SKU')).ok, true)
})

test('magento LIVE order lookup with sample credentials against mock API', async () => {
  const mock = createMockHttp()
  mock.on('GET', magentoOrderPath('12'), (req) => {
    assert.match(req.headers.authorization ?? '', new RegExp(SAMPLE_CREDENTIALS.genericBearer))
    return { json: { entity_id: 12, status: 'processing', grand_total: 320 } }
  })
  const { base, close } = await mock.listen()
  try {
    const result = await lookupOrder('12', {
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
