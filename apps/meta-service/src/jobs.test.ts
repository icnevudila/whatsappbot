import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ChannelJobRow } from '@wa/channel-worker-kit'
import { handleChannelJob } from './job-handlers.js'

test('handle channel.send with mock send', async () => {
  const job: ChannelJobRow = {
    id: '1',
    org_id: '00000000-0000-0000-0000-000000000001',
    channel_account_id: '00000000-0000-0000-0000-000000000002',
    channel: 'instagram',
    type: 'channel.send',
    payload: { threadId: 'ig-user-1', text: 'merhaba' },
    attempts: 1,
    max_attempts: 3,
  }

  const result = await handleChannelJob(job, null)
  assert.ok(result && typeof result === 'object')
  const r = result as { ok: boolean; mock?: boolean; externalMessageId?: string }
  assert.equal(r.ok, true)
  assert.equal(r.mock, true)
  assert.match(r.externalMessageId ?? '', /^mock-instagram-/)
})

test('handle channel.webhook.process parseMetaWebhook', async () => {
  const job: ChannelJobRow = {
    id: '2',
    org_id: '00000000-0000-0000-0000-000000000001',
    channel_account_id: '00000000-0000-0000-0000-000000000002',
    channel: 'instagram',
    type: 'channel.webhook.process',
    payload: {
      raw: {
        object: 'instagram',
        entry: [
          {
            messaging: [
              {
                sender: { id: 'ig-user-1' },
                recipient: { id: 'page-1' },
                message: { mid: 'm1', text: 'selam' },
              },
            ],
          },
        ],
      },
    },
    attempts: 1,
    max_attempts: 3,
  }

  const result = await handleChannelJob(job, null)
  const r = result as { ok: boolean; events: Array<{ text?: string; externalThreadId: string }> }
  assert.equal(r.ok, true)
  assert.equal(r.events[0]?.text, 'selam')
  assert.equal(r.events[0]?.externalThreadId, 'ig-user-1')
})

test('handle unknown type → NonRetryableJobError', async () => {
  const job: ChannelJobRow = {
    id: '3',
    org_id: null,
    channel_account_id: null,
    channel: 'instagram',
    type: 'channel.lookup',
    payload: {},
    attempts: 1,
    max_attempts: 3,
  }

  await assert.rejects(
    () => handleChannelJob(job, null),
    (err: unknown) =>
      err instanceof Error && err.name === 'NonRetryableJobError' && /Bilinmeyen/.test(err.message),
  )
})
