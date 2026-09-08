import type { PersistClient } from '@wa/channel-runtime'
import type { DbHelpers } from './db.js'

/** channel_messages / channel_webhook_events için ortak PersistClient. */
export function createChannelPersistClient(db: DbHelpers): PersistClient {
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
