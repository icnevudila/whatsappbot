import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMockHttp, SAMPLE_CREDENTIALS } from '@wa/channel-runtime'
import { lookupOrder, lookupStock, tsoftOrderPath } from './adapter.js'

test('tsoft paths + mock', async () => {
  assert.match(tsoftOrderPath('99'), /OrderId=99/)
  const order = await lookupOrder('99')
  assert.equal(order.ok, true)
  assert.equal(order.mock, true)
  assert.equal((await lookupStock('SKU')).data?.Stok, 22)
})

test('tsoft LIVE order lookup with sample credentials against mock API', async () => {
  const mock = createMockHttp()
  mock.on('GET', '/RestApi/Order/GetOrderById', (req) => {
    assert.match(req.headers.authorization ?? '', new RegExp(SAMPLE_CREDENTIALS.genericBearer))
    assert.match(req.url, /OrderId=99/)
    return { json: { OrderId: 99, Durum: 'Hazirlaniyor', Toplam: 450 } }
  })
  const { base, close } = await mock.listen()
  try {
    const result = await lookupOrder('99', {
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
