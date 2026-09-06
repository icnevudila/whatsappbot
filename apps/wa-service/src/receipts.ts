import { proto, type WAMessage } from '@whiskeysockets/baileys'
import { query } from './db.js'
import { logger } from './logger.js'

const log = logger.child({ scope: 'receipts' })

type OutboundStatus = 'sent' | 'delivered' | 'read'

function statusFromAck(status: number | null | undefined): OutboundStatus | null {
  if (status == null) return null
  if (
    status === proto.WebMessageInfo.Status.READ ||
    status === proto.WebMessageInfo.Status.PLAYED
  ) {
    return 'read'
  }
  if (status === proto.WebMessageInfo.Status.DELIVERY_ACK) return 'delivered'
  if (status === proto.WebMessageInfo.Status.SERVER_ACK) return 'sent'
  return null
}

async function advanceOutboundStatus(
  accountId: string,
  waMessageId: string,
  next: OutboundStatus,
): Promise<void> {
  const logRows = await query<{ id: string }>(
    `update public.message_log
        set status = $3
      where account_id = $1::uuid
        and wa_message_id = $2
        and direction = 'out'
        and (
          ($3 = 'delivered' and status in ('sent', 'pending'))
          or ($3 = 'read' and status in ('sent', 'delivered', 'pending'))
          or ($3 = 'sent' and status = 'pending')
        )
      returning id::text`,
    [accountId, waMessageId, next],
  )

  // Kampanya hedefleri: aynı WA id ile ilerlet (sent → delivered → read).
  if (next === 'delivered' || next === 'read') {
    await query(
      `update public.campaign_targets
          set status = $3,
              updated_at = now()
        where account_id = $1::uuid
          and wa_message_id = $2
          and (
            ($3 = 'delivered' and status = 'sent')
            or ($3 = 'read' and status in ('sent', 'delivered'))
          )`,
      [accountId, waMessageId, next],
    )
  }

  if (logRows.length > 0) {
    log.debug({ accountId, waMessageId, status: next }, 'Receipt islendi')
  }
}

/**
 * Baileys messages.update → message_log + campaign_targets status.
 * Yalnızca ilerleme: sent → delivered → read (geriye düşmez).
 *
 * Not: 1:1 teslim/okundu receipt'lerinde Baileys çoğu zaman
 * `key.fromMe = false` emit eder (attrs.recipient varken). Outbound
 * eşleşmesi `wa_message_id` + `direction = 'out'` ile yapılır; fromMe
 * şartı koyulmaz.
 */
export async function applyMessageReceipts(
  accountId: string,
  updates: Array<{ key: WAMessage['key']; update: Partial<WAMessage> }>,
): Promise<void> {
  for (const item of updates) {
    const id = item.key?.id
    if (!id) continue

    const next = statusFromAck(item.update.status)
    if (!next) continue

    try {
      await advanceOutboundStatus(accountId, id, next)
    } catch (error) {
      log.warn({ err: error, accountId, waMessageId: id }, 'Receipt yazilamadi')
    }
  }
}

/**
 * messages.upsert içinde fromMe mesajların status alanı da gelebilir
 * (özellikle yeniden bağlanma / append). Aynı ilerlemeyi uygula.
 */
export async function applyOutboundMessageStatuses(
  accountId: string,
  messages: WAMessage[],
): Promise<void> {
  for (const msg of messages) {
    const id = msg.key?.id
    if (!id || !msg.key?.fromMe) continue
    const next = statusFromAck(msg.status)
    if (!next || next === 'sent') continue

    try {
      await advanceOutboundStatus(accountId, id, next)
    } catch (error) {
      log.warn({ err: error, accountId, waMessageId: id }, 'Upsert status yazilamadi')
    }
  }
}

/**
 * Grup receipt event'i (message-receipt.update).
 * Tek kullanici okuduysa bile mesaji read/delivered ilerletir.
 */
export async function applyGroupReceipts(
  accountId: string,
  updates: Array<{
    key: WAMessage['key']
    receipt: { receiptTimestamp?: unknown; readTimestamp?: unknown }
  }>,
): Promise<void> {
  for (const item of updates) {
    const id = item.key?.id
    if (!id) continue

    const next: OutboundStatus | null = item.receipt.readTimestamp
      ? 'read'
      : item.receipt.receiptTimestamp
        ? 'delivered'
        : null
    if (!next) continue

    try {
      await advanceOutboundStatus(accountId, id, next)
    } catch (error) {
      log.warn({ err: error, accountId, waMessageId: id }, 'Grup receipt yazilamadi')
    }
  }
}
