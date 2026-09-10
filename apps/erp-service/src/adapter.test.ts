import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMockHttp, SAMPLE_CREDENTIALS } from '@wa/channel-runtime'
import { erpOrderUrl, getProvider, lookupOrder, lookupStock } from './adapter.js'

test('erp provider urls + mock', async () => {
  const provider = getProvider()
  assert.ok(provider)
  assert.match(erpOrderUrl('https://erp.example', 'SO-1', provider), /SO-1/)
  const order = await lookupOrder('SO-1')
  assert.equal(order.ok, true)
  assert.equal(order.mock, true)
  assert.equal(order.data?.provider, provider)
  assert.equal((await lookupStock('SKU')).ok, true)
})

test('erp LIVE order lookup with sample credentials against mock API', async () => {
  const provider = 'nebim'
  const mock = createMockHttp()
  mock.on('GET', '/api/orders/SO-LIVE', (req) => {
    assert.match(req.headers.authorization ?? '', new RegExp(SAMPLE_CREDENTIALS.genericBearer))
    return { json: { orderId: 'SO-LIVE', status: 'Open', provider } }
  })
  const { base, close } = await mock.listen()
  try {
    const result = await lookupOrder('SO-LIVE', {
      mockMode: false,
      liveEnabled: true,
      token: SAMPLE_CREDENTIALS.genericBearer,
      apiBase: base,
      provider,
    })
    assert.equal(result.ok, true)
    assert.equal(result.mock, false)
    assert.equal(mock.calls.length, 1)
  } finally {
    await close()
  }
})
