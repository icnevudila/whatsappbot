import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ChannelJobRow } from '@wa/channel-worker-kit'
import { handleChannelJob } from './job-handlers.js'

test('handle channel.send with mock send', async () => {
  const job: ChannelJobRow = {
    id: '1',
    org_id: '00000000-0000-0000-0000-000000000001',
    channel_account_id: '00000000-0000-0000-0000-000000000002',
    channel: 'wechat',
    type: 'channel.send',
    payload: { threadId: 'wx-user', text: 'merhaba' },
    attempts: 1,
    max_attempts: 3,
  }

  const result = await handleChannelJob(job, null)
  assert.ok(result && typeof result === 'object')
  const r = result as { ok: boolean; mock?: boolean; externalMessageId?: string }
  assert.equal(r.ok, true)
  assert.equal(r.mock, true)
  assert.match(r.externalMessageId ?? '', /^mock-wechat-/)
})

test('handle channel.webhook.process parseInbound', async () => {
  const job: ChannelJobRow = {
    id: '2',
    org_id: '00000000-0000-0000-0000-000000000001',
    channel_account_id: '00000000-0000-0000-0000-000000000002',
    channel: 'wechat',
    type: 'channel.webhook.process',
    payload: {
      raw: {
        MsgType: 'text',
        FromUserName: 'wx-user',
        Content: 'selam',
        MsgId: '99',
      },
    },
    attempts: 1,
    max_attempts: 3,
  }

  const result = await handleChannelJob(job, null)
  const r = result as { ok: boolean; event: { text?: string; externalThreadId: string } }
  assert.equal(r.ok, true)
  assert.equal(r.event.text, 'selam')
  assert.equal(r.event.externalThreadId, 'wx-user')
})

test('handle unknown type → NonRetryableJobError', async () => {
  const job: ChannelJobRow = {
    id: '3',
    org_id: null,
    channel_account_id: null,
    channel: 'wechat',
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
