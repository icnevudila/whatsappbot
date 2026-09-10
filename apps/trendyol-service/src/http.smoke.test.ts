import assert from 'node:assert/strict'
import { test } from 'node:test'
import { withTempServer } from '@wa/channel-runtime'
import { createApp } from './index.js'

test('trendyol-service HTTP smoke', async () => {
  const app = createApp()
  await withTempServer(app, async (base) => {
    assert.equal((await fetch(`${base}/ready`)).status, 200)
    const lookup = await fetch(`${base}/lookup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderId: 'TY-9' }),
    })
    assert.equal(lookup.status, 200)
    const body = (await lookup.json()) as { ok: boolean; mock?: boolean }
    assert.equal(body.ok, true)
    assert.equal(body.mock, true)
  })
})
