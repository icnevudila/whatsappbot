import { proto, type WAMessage } from '@whiskeysockets/baileys'
import { statusFromAck, type OutboundStatus } from './ack-status.js'
import { reconcileCampaignCounts } from './campaign-counts.js'
import { query } from './db.js'
import { logger } from './logger.js'

export { statusFromAck } from './ack-status.js'

const log = logger.child({ scope: 'receipts' })

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
          or ($3 = 'failed' and status in ('pending', 'sent', 'delivered'))
        )
      returning id::text`,
    [accountId, waMessageId, next],
  )

  // Kampanya hedefleri: aynı WA id ile ilerlet (sent → delivered → read) veya failed.
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
  } else if (next === 'failed') {
    // Campaign tamamlanmissa runner tick'i gelmez; failed sonrasi sayaclari burada dogrula.
    const failedTargets = await query<{ campaign_id: string }>(
      `update public.campaign_targets
          set status = 'failed',
              error = coalesce(nullif(error, ''), 'WhatsApp gonderim hatasi (ERROR ack)'),
              updated_at = now()
        where account_id = $1::uuid
          and wa_message_id = $2
          and status in ('sending', 'sent', 'delivered')
        returning campaign_id::text`,
      [accountId, waMessageId],
    )
    const seen = new Set<string>()
    for (const row of failedTargets) {
      if (seen.has(row.campaign_id)) continue
      seen.add(row.campaign_id)
      await reconcileCampaignCounts(row.campaign_id)
    }
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
