import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildChannelEvent } from '@wa/channels'
import { persistChannelEvent, persistWebhookRaw } from './persist.js'

test('persistChannelEvent no-op without client', async () => {
  const event = buildChannelEvent({
    channel: 'telegram',
    orgId: 'o',
    accountId: 'a',
    direction: 'inbound',
    externalThreadId: '1',
    senderId: '1',
    text: 'x',
  })
  const r = await persistChannelEvent(null, event)
  assert.equal(r.ok, true)
})

test('persistChannelEvent inserts when client present', async () => {
  const inserted: Record<string, unknown>[] = []
  const client = {
    from: (_table: string) => ({
      insert: async (row: Record<string, unknown>) => {
        inserted.push(row)
        return { error: null }
      },
    }),
  }
  const event = buildChannelEvent({
    channel: 'telegram',
    orgId: 'o',
    accountId: 'a',
    direction: 'inbound',
    externalThreadId: '1',
    senderId: '1',
    text: 'x',
  })
  const r = await persistChannelEvent(client, event, 'acc-uuid')
  assert.equal(r.ok, true)
  assert.equal(inserted[0]?.channel, 'telegram')
  assert.equal(inserted[0]?.channel_account_id, 'acc-uuid')
})

test('persistWebhookRaw inserts', async () => {
  const inserted: Record<string, unknown>[] = []
  const client = {
    from: (_table: string) => ({
      insert: async (row: Record<string, unknown>) => {
        inserted.push(row)
        return { error: null }
      },
    }),
  }
  await persistWebhookRaw(client, 'meta', { hello: 1 }, 'd1')
  assert.equal(inserted[0]?.channel, 'meta')
  assert.equal(inserted[0]?.delivery_id, 'd1')
})
