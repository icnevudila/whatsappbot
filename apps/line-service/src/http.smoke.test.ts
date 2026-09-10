import assert from 'node:assert/strict'
import { test } from 'node:test'
import { withTempServer } from '@wa/channel-runtime'
import { createApp } from './index.js'

test('line-service HTTP smoke', async () => {
  const app = createApp()
  await withTempServer(app, async (base) => {
    assert.equal((await fetch(`${base}/health`)).status, 200)
    const webhook = await fetch(`${base}/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        events: [
          {
            type: 'message',
            replyToken: 'r',
            source: { userId: 'U1' },
            message: { type: 'text', id: '1', text: 'selam' },
          },
        ],
      }),
    })
    assert.equal(webhook.status, 200)
    const send = await fetch(`${base}/send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ threadId: 'U1', text: 'cevap' }),
    })
    assert.equal(send.status, 200)
  })
})
