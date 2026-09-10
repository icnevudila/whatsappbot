import type { ChannelEvent } from '@wa/channels'

export type PersistClient = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
  }
}

/** Supabase/Postgres client varsa channel_messages'a yazar; yoksa no-op. */
export async function persistChannelEvent(
  client: PersistClient | null | undefined,
  event: ChannelEvent,
  channelAccountId?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!client || !channelAccountId) return { ok: true }

  const { error } = await client.from('channel_messages').insert({
    org_id: event.orgId,
    channel_account_id: channelAccountId,
    channel: event.channel,
    direction: event.direction,
    external_thread_id: event.externalThreadId,
    external_message_id: event.externalMessageId ?? null,
    sender_id: event.senderId,
    text: event.text ?? null,
    payload: event.payload ?? {},
    occurred_at: event.occurredAt,
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function persistWebhookRaw(
  client: PersistClient | null | undefined,
  channel: string,
  payload: unknown,
  deliveryId?: string,
): Promise<void> {
  if (!client) return
  await client.from('channel_webhook_events').insert({
    channel,
    delivery_id: deliveryId ?? null,
    payload: payload ?? {},
  })
}
