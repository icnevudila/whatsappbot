import assert from 'node:assert/strict'
import { test } from 'node:test'
import { withTempServer } from '@wa/channel-runtime'
import { createApp } from './index.js'

test('tg-service HTTP smoke', async () => {
  const app = createApp()
  await withTempServer(app, async (base) => {
    const health = await fetch(`${base}/health`)
    assert.equal(health.status, 200)
    const healthBody = (await health.json()) as { mockMode: boolean; channel: string }
    assert.equal(healthBody.mockMode, true)
    assert.equal(healthBody.channel, 'telegram')

    const webhook = await fetch(`${base}/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: { chat: { id: 100 }, from: { id: 9 }, text: 'merhaba', message_id: 42 },
      }),
    })
    assert.equal(webhook.status, 200)
    const webhookBody = (await webhook.json()) as { ok: boolean; event: { text: string } }
    assert.equal(webhookBody.ok, true)
    assert.equal(webhookBody.event.text, 'merhaba')

    const send = await fetch(`${base}/send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ threadId: '100', text: 'yanit' }),
    })
    assert.equal(send.status, 200)
    const sendBody = (await send.json()) as { ok: boolean; mock?: boolean }
    assert.equal(sendBody.ok, true)
    assert.equal(sendBody.mock, true)
  })
})
