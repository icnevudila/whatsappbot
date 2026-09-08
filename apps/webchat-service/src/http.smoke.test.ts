import assert from 'node:assert/strict'
import { test } from 'node:test'
import { withTempServer } from '@wa/channel-runtime'
import { createApp } from './index.js'
import { getThread, webchatStore } from './adapter.js'

test('webchat-service HTTP smoke', async () => {
  webchatStore.clear()
  const app = createApp()
  await withTempServer(app, async (base) => {
    assert.equal((await fetch(`${base}/health`)).status, 200)
    const webhook = await fetch(`${base}/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'merhaba', threadId: 'w1', senderId: 'u' }),
    })
    assert.equal(webhook.status, 200)
    await fetch(`${base}/send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ threadId: 'w1', text: 'alo' }),
    })
    assert.ok(getThread('w1').length >= 1)
  })
})
