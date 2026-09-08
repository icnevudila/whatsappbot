import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMockHttp, SAMPLE_CREDENTIALS } from '@wa/channel-runtime'
import { lookupOrder, lookupStock, parseWooAuthHeader } from './adapter.js'

test('woo auth header', () => {
  assert.match(parseWooAuthHeader('ck:cs'), /^Basic /)
  assert.equal(parseWooAuthHeader('plain-token'), 'Bearer plain-token')
})

test('woo mock order stock', async () => {
  const order = await lookupOrder('55')
  assert.equal(order.ok, true)
  assert.equal((order.data?.billing as { email: string }).email, 'musteri@ornek.com')
  assert.equal((await lookupStock('SKU')).ok, true)
})

test('woo LIVE order with sample ck:cs credentials', async () => {
  const mock = createMockHttp()
  const auth = parseWooAuthHeader(SAMPLE_CREDENTIALS.wooKeySecret)
  mock.on('GET', '/wp-json/wc/v3/orders/55', (req) => {
    assert.equal(req.headers.authorization, auth)
    return { json: { id: 55, status: 'completed', total: '100.00' } }
  })
  const { base, close } = await mock.listen()
  try {
    const result = await lookupOrder('55', {
      mockMode: false,
      liveEnabled: true,
      token: SAMPLE_CREDENTIALS.wooKeySecret,
      apiBase: base,
    })
    assert.equal(result.ok, true)
    assert.equal(result.mock, false)
    assert.equal(result.data?.id, 55)
  } finally {
    await close()
  }
})
