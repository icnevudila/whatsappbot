import type { PersistClient } from '@wa/channel-runtime'
import { persistChannelEvent } from '@wa/channel-runtime'
import {
  NonRetryableJobError,
  type ChannelJobRow,
  type DbHelpers,
} from '@wa/channel-worker-kit'
import { parseInbound, sendMessage } from './adapter.js'
import { loadChannelAccount, tokenFromCredentials } from './accounts.js'
import { env, loadTgConfig } from './env.js'

export function createPgPersistClient(db: DbHelpers): PersistClient {
  return {
    from(table: string) {
      return {
        async insert(row: Record<string, unknown>) {
          try {
            if (table === 'channel_messages') {
              await db.query(
                `insert into public.channel_messages
                   (org_id, channel_account_id, channel, direction, external_thread_id,
                    external_message_id, sender_id, text, payload, occurred_at)
                 values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::timestamptz)`,
                [
                  row.org_id,
                  row.channel_account_id,
                  row.channel,
                  row.direction,
                  row.external_thread_id,
                  row.external_message_id ?? null,
                  row.sender_id ?? null,
                  row.text ?? null,
                  JSON.stringify(row.payload ?? {}),
                  row.occurred_at ?? new Date().toISOString(),
                ],
              )
            } else if (table === 'channel_webhook_events') {
              await db.query(
                `insert into public.channel_webhook_events (channel, delivery_id, payload)
                 values ($1, $2, $3::jsonb)`,
                [row.channel, row.delivery_id ?? null, JSON.stringify(row.payload ?? {})],
              )
            } else {
              return { error: { message: `unsupported table: ${table}` } }
            }
            return { error: null }
          } catch (error) {
            return {
              error: { message: error instanceof Error ? error.message : String(error) },
            }
          }
        },
      }
    },
  }
}

export async function handleChannelJob(
  job: ChannelJobRow,
  db: DbHelpers | null,
): Promise<unknown> {
  switch (job.type) {
    case 'channel.send':
      return handleSend(job)
    case 'channel.webhook.process':
      return handleWebhookProcess(job, db)
    default:
      throw new NonRetryableJobError(`Bilinmeyen is tipi: ${job.type}`)
  }
}

async function handleSend(job: ChannelJobRow): Promise<unknown> {
  const payload = job.payload
  const threadId = String(payload.threadId ?? payload.thread_id ?? '')
  const text = typeof payload.text === 'string' ? payload.text : ''
  if (!threadId || !text) {
    throw new NonRetryableJobError('channel.send: threadId ve text zorunlu')
  }

  const accountId = job.channel_account_id ?? String(payload.accountId ?? env.accountId)
  const account = await loadChannelAccount(accountId)
  const credToken = account ? tokenFromCredentials(account.credentials) : ''
  const token =
    (typeof payload.token === 'string' && payload.token) ||
    credToken ||
    env.token

  const orgId = job.org_id ?? account?.org_id ?? env.orgId
  const result = await sendMessage(
    {
      orgId,
      accountId,
      channel: 'telegram',
      threadId,
      text,
      metadata: typeof payload.metadata === 'object' && payload.metadata
        ? (payload.metadata as Record<string, unknown>)
        : undefined,
    },
    loadTgConfig({
      token,
      mockMode: env.mockMode && !token,
      liveEnabled: Boolean(token) && (env.liveEnabled || !env.mockMode),
      orgId,
      accountId,
    }),
  )

  if (!result.ok) {
    throw new Error(result.error || 'telegram_send_failed')
  }
  return result
}

async function handleWebhookProcess(job: ChannelJobRow, db: DbHelpers | null): Promise<unknown> {
  const raw = job.payload.raw ?? job.payload.body ?? job.payload
  const accountId = job.channel_account_id ?? String(job.payload.accountId ?? env.accountId)
  const account = await loadChannelAccount(accountId)
  const orgId = job.org_id ?? account?.org_id ?? env.orgId

  const event = parseInbound(raw, {
    orgId,
    accountId,
  })
  if (!event) {
    throw new NonRetryableJobError('channel.webhook.process: invalid_event')
  }

  const client = db ? createPgPersistClient(db) : null
  const persisted = await persistChannelEvent(client, event, accountId)
  if (!persisted.ok) {
    throw new Error(persisted.error ?? 'persist_failed')
  }
  return { ok: true, event }
}

export async function enqueueChannelJob(
  db: DbHelpers,
  input: {
    orgId: string | null
    channelAccountId: string | null
    channel: string
    type: string
    payload: Record<string, unknown>
  },
): Promise<string> {
  const rows = await db.query<{ id: string }>(
    `insert into public.channel_jobs
       (org_id, channel_account_id, channel, type, payload)
     values ($1::uuid, $2::uuid, $3, $4, $5::jsonb)
     returning id::text`,
    [
      input.orgId,
      input.channelAccountId,
      input.channel,
      input.type,
      JSON.stringify(input.payload),
    ],
  )
  const id = rows[0]?.id
  if (!id) throw new Error('enqueue failed')
  return id
}
