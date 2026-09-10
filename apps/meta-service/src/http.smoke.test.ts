import assert from 'node:assert/strict'
import { test } from 'node:test'
import { withTempServer } from '@wa/channel-runtime'
import { createApp } from './index.js'

test('meta-service HTTP smoke', async () => {
  const app = createApp()
  await withTempServer(app, async (base) => {
    const health = await fetch(`${base}/health`)
    assert.equal(health.status, 200)

    const webhook = await fetch(`${base}/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        object: 'instagram',
        entry: [
          {
            messaging: [
              {
                sender: { id: 'ig-user-1' },
                recipient: { id: 'page-1' },
                message: { mid: 'm1', text: 'merhaba' },
              },
            ],
          },
        ],
      }),
    })
    assert.equal(webhook.status, 200)
    const webhookBody = (await webhook.json()) as { ok: boolean; events: Array<{ text?: string }> }
    assert.equal(webhookBody.ok, true)
    assert.ok(webhookBody.events.length >= 1)

    const send = await fetch(`${base}/send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ threadId: 'ig-user-1', text: 'yanit' }),
    })
    assert.equal(send.status, 200)

    const verify = await fetch(
      `${base}/webhook?hub.mode=subscribe&hub.verify_token=dev-verify&hub.challenge=challenge-123`,
    )
    assert.equal(verify.status, 200)
    assert.equal(await verify.text(), 'challenge-123')
  })
})
