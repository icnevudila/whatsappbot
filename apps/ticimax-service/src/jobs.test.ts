import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ChannelJobRow } from '@wa/channel-worker-kit'
import { handleChannelJob } from './job-handlers.js'

test('handle channel.lookup order with mock', async () => {
  const job: ChannelJobRow = {
    id: '1',
    org_id: '00000000-0000-0000-0000-000000000001',
    channel_account_id: '00000000-0000-0000-0000-000000000002',
    channel: 'ticimax',
    type: 'channel.lookup',
    payload: { orderId: 'ORD-1' },
    attempts: 1,
    max_attempts: 3,
  }

  const result = await handleChannelJob(job, null)
  assert.ok(result && typeof result === 'object')
  const r = result as { ok: boolean; mock?: boolean }
  assert.equal(r.ok, true)
  assert.equal(r.mock, true)
})

test('handle channel.lookup sku with mock', async () => {
  const job: ChannelJobRow = {
    id: '2',
    org_id: '00000000-0000-0000-0000-000000000001',
    channel_account_id: '00000000-0000-0000-0000-000000000002',
    channel: 'ticimax',
    type: 'channel.lookup',
    payload: { sku: 'SKU-1' },
    attempts: 1,
    max_attempts: 3,
  }

  const result = await handleChannelJob(job, null)
  const r = result as { ok: boolean; mock?: boolean }
  assert.equal(r.ok, true)
  assert.equal(r.mock, true)
})

test('handle unknown type → NonRetryableJobError', async () => {
  const job: ChannelJobRow = {
    id: '99',
    org_id: null,
    channel_account_id: null,
    channel: 'ticimax',
    type: 'channel.send',
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
