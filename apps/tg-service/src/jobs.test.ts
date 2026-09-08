import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ChannelJobRow } from '@wa/channel-worker-kit'
import { handleChannelJob } from './job-handlers.js'

test('handle channel.send with mock send', async () => {
  const job: ChannelJobRow = {
    id: '1',
    org_id: '00000000-0000-0000-0000-000000000001',
    channel_account_id: '00000000-0000-0000-0000-000000000002',
    channel: 'telegram',
    type: 'channel.send',
    payload: { threadId: '100', text: 'merhaba' },
    attempts: 1,
    max_attempts: 3,
  }

  const result = await handleChannelJob(job, null)
  assert.ok(result && typeof result === 'object')
  const r = result as { ok: boolean; mock?: boolean; externalMessageId?: string }
  assert.equal(r.ok, true)
  assert.equal(r.mock, true)
  assert.match(r.externalMessageId ?? '', /^mock-telegram-/)
})

test('handle channel.webhook.process parseInbound', async () => {
  const job: ChannelJobRow = {
    id: '2',
    org_id: '00000000-0000-0000-0000-000000000001',
    channel_account_id: '00000000-0000-0000-0000-000000000002',
    channel: 'telegram',
    type: 'channel.webhook.process',
    payload: {
      raw: {
        message: { chat: { id: 55 }, from: { id: 7 }, text: 'selam', message_id: 9 },
      },
    },
    attempts: 1,
    max_attempts: 3,
  }

  const result = await handleChannelJob(job, null)
  const r = result as { ok: boolean; event: { text?: string; externalThreadId: string } }
  assert.equal(r.ok, true)
  assert.equal(r.event.text, 'selam')
  assert.equal(r.event.externalThreadId, '55')
})

test('handle unknown type → NonRetryableJobError', async () => {
  const job: ChannelJobRow = {
    id: '3',
    org_id: null,
    channel_account_id: null,
    channel: 'telegram',
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
