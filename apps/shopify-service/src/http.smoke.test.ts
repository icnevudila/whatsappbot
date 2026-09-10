import assert from 'node:assert/strict'
import { test } from 'node:test'
import { withTempServer } from '@wa/channel-runtime'
import { createApp } from './index.js'

test('shopify-service HTTP smoke', async () => {
  const app = createApp()
  await withTempServer(app, async (base) => {
    const health = await fetch(`${base}/health`)
    assert.equal(health.status, 200)
    const healthBody = (await health.json()) as { role: string; mockMode: boolean }
    assert.equal(healthBody.role, 'commerce')
    assert.equal(healthBody.mockMode, true)

    const order = await fetch(`${base}/lookup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderId: 'ORD-SMOKE-1' }),
    })
    assert.equal(order.status, 200)
    const orderBody = (await order.json()) as { ok: boolean; mock?: boolean; data?: { orderId: string } }
    assert.equal(orderBody.ok, true)
    assert.equal(orderBody.mock, true)
    assert.equal(orderBody.data?.orderId, 'ORD-SMOKE-1')

    const stock = await fetch(`${base}/lookup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sku: 'SKU-SMOKE-1' }),
    })
    assert.equal(stock.status, 200)
    const stockBody = (await stock.json()) as { ok: boolean; data?: { sku: string } }
    assert.equal(stockBody.ok, true)
    assert.equal(stockBody.data?.sku, 'SKU-SMOKE-1')
  })
})
