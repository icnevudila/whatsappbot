import { proto, type WAMessage } from '@whiskeysockets/baileys'
import { query } from './db.js'
import { logger } from './logger.js'

const log = logger.child({ scope: 'receipts' })

/**
 * Baileys messages.update → message_log + campaign_targets status.
 * Yalnızca ilerleme: sent → delivered → read (geriye düşmez).
 */
export async function applyMessageReceipts(
  accountId: string,
  updates: Array<{ key: WAMessage['key']; update: Partial<WAMessage> }>,
): Promise<void> {
  for (const item of updates) {
    const id = item.key?.id
    if (!id || !item.key?.fromMe) continue

    const status = item.update.status
    if (status == null) continue

    const next =
      status === proto.WebMessageInfo.Status.READ ||
      status === proto.WebMessageInfo.Status.PLAYED
        ? 'read'
        : status === proto.WebMessageInfo.Status.DELIVERY_ACK
          ? 'delivered'
          : status === proto.WebMessageInfo.Status.SERVER_ACK
            ? 'sent'
            : null

    if (!next) continue

    try {
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
        [accountId, id, next],
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
          [accountId, id, next],
        )
      }

      if (logRows.length > 0) {
        log.debug({ accountId, waMessageId: id, status: next }, 'Receipt islendi')
      }
    } catch (error) {
      log.warn({ err: error, accountId, waMessageId: id }, 'Receipt yazilamadi')
    }
  }
}
