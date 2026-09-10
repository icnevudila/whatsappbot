import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMockHttp, SAMPLE_CREDENTIALS } from '@wa/channel-runtime'
import { lookupOrder, lookupStock, parseWooAuthHeader, wooOrderPath } from './adapter.js'

test('woo auth header', () => {
  assert.match(parseWooAuthHeader('ck:cs'), /^Basic /)
  assert.equal(parseWooAuthHeader('plain-token'), 'Bearer plain-token')
  assert.equal(
    parseWooAuthHeader(SAMPLE_CREDENTIALS.wooKeySecret),
    `Basic ${Buffer.from(SAMPLE_CREDENTIALS.wooKeySecret).toString('base64')}`,
  )
})

test('woo mock order stock', async () => {
  const order = await lookupOrder('55')
  assert.equal(order.ok, true)
  assert.equal(order.mock, true)
  assert.equal(order.data?.billing && (order.data.billing as { email: string }).email, 'musteri@ornek.com')
  assert.equal((await lookupStock('SKU')).ok, true)
})

test('woo LIVE order lookup with sample credentials against mock API', async () => {
  const mock = createMockHttp()
  mock.on('GET', wooOrderPath('1'), (req) => {
    assert.equal(req.headers.authorization, parseWooAuthHeader(SAMPLE_CREDENTIALS.wooKeySecret))
    return {
      json: {
        id: 1,
        status: 'processing',
        total: '249.00',
        currency: 'TRY',
        billing: { email: 'live@ornek.com' },
      },
    }
  })
  const { base, close } = await mock.listen()
  try {
    const result = await lookupOrder('1', {
      mockMode: false,
      liveEnabled: true,
      token: SAMPLE_CREDENTIALS.wooKeySecret,
      apiBase: base,
    })
    assert.equal(result.ok, true)
    assert.equal(result.mock, false)
    assert.equal((result.data as { billing?: { email: string } })?.billing?.email, 'live@ornek.com')
    assert.equal(mock.calls.length, 1)
  } finally {
    await close()
  }
})
