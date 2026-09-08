import assert from 'node:assert/strict'
import { test } from 'node:test'
import { startVendorSandbox } from './vendor-sandbox.js'

test('vendor sandbox answers telegram sendMessage shape', async () => {
  const sandbox = await startVendorSandbox()
  try {
    const token = sandbox.credentials.telegramToken
    const res = await fetch(`${sandbox.base}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: 42, text: 'ping' }),
    })
    assert.equal(res.status, 200)
    const json = (await res.json()) as { ok: boolean; result: { message_id: number } }
    assert.equal(json.ok, true)
    assert.equal(json.result.message_id, 9001)
  } finally {
    await sandbox.close()
  }
})

test('vendor sandbox answers shopify graphql order shape', async () => {
  const sandbox = await startVendorSandbox()
  try {
    const res = await fetch(`${sandbox.base}/admin/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-shopify-access-token': sandbox.credentials.shopifyToken,
      },
      body: JSON.stringify({ query: 'query { orders { edges { node { id } } } }' }),
    })
    assert.equal(res.status, 200)
    const json = (await res.json()) as { data: { orders: { edges: unknown[] } } }
    assert.ok(json.data.orders.edges.length >= 1)
  } finally {
    await sandbox.close()
  }
})
