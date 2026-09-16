import { jidToE164 } from '@wa/shared'
import {
  isJidBroadcast,
  isJidGroup,
  isJidNewsletter,
  isLidUser,
  type WAMessage,
} from '@whiskeysockets/baileys'
import { one, query } from './db.js'
import { logger } from './logger.js'
import { extractBody } from './inbound.js'
import { rememberSentMessage } from './sent-messages.js'
import { statusFromAck } from './receipts.js'

/**
 * Giden (fromMe: true) mesajlarda alici karsi tarafin telefonunu bulur.
 * ONEMLI: key.senderPn gonderenin (bizim) numaramizdir, asla kullanilmaz!
 */
export async function resolveOutboundPhone(
  message: WAMessage,
  resolveLidPn?: (lidJid: string) => Promise<string | null>,
): Promise<string | null> {
  const key = message.key
  if (!key?.remoteJid) return null

  // 1. Normal telefon JID (@s.whatsapp.net)
  if (!isLidUser(key.remoteJid)) {
    return jidToE164(key.remoteJid)
  }

  // 2. LID durumunda Baileys alici ipuclari (peerRecipientPn / recipientPn)
  const anyKey = (key || {}) as Record<string, unknown>
  const anyMsg = (message || {}) as unknown as Record<string, unknown>
  const recipientHint =
    jidToE164(String(anyKey.peerRecipientPn ?? '')) ??
    jidToE164(String(anyKey.recipientPn ?? '')) ??
    jidToE164(String(anyMsg.peerRecipientPn ?? '')) ??
    jidToE164(String(anyMsg.recipientPn ?? '')) ??
    null
  if (recipientHint) return recipientHint

  // 3. Baileys LID -> PN bellek eslemesi
  if (resolveLidPn) {
    try {
      const mapped = await resolveLidPn(key.remoteJid)
      if (mapped) return jidToE164(mapped) ?? (mapped.startsWith('+') ? mapped : null)
    } catch {
      // mapping basarisiz olursa devam et
    }
  }

  // 4. Veritabaninda (account_contacts / message_log) bu LID icin kayitli telefon
  try {
    const contact = await one<{ phone_e164: string }>(
      `select phone_e164 from public.account_contacts
        where wa_jid = $1 and phone_e164 is not null limit 1`,
      [key.remoteJid],
    )
    if (contact?.phone_e164) return contact.phone_e164

    const prevLog = await one<{ phone_e164: string }>(
      `select phone_e164 from public.message_log
        where remote_jid = $1 and phone_e164 is not null limit 1`,
      [key.remoteJid],
    )
    if (prevLog?.phone_e164) return prevLog.phone_e164
  } catch {
    // db hatasinda devam et
  }

  return null
}

export async function syncPhoneOutboundMessages(options: {
  accountId: string
  orgId: string
  createdBy: string
  messages: WAMessage[]
  resolveLidPn?: (lidJid: string) => Promise<string | null>
}): Promise<void> {
  const { accountId, orgId, createdBy, messages, resolveLidPn } = options

  for (const message of messages) {
    const key = message.key
    if (!key?.fromMe || !key.remoteJid) continue
    if (isJidGroup(key.remoteJid) || isJidBroadcast(key.remoteJid) || isJidNewsletter(key.remoteJid)) {
      continue
    }

    const waMessageId = key.id ?? null
    if (!waMessageId) continue

    // Once wa.sent_messages'a yazalim (WhatsApp getMessage retry icin)
    void rememberSentMessage(accountId, message)

    try {
      // Mesaj zaten panelden/bottan gonderilip kaydedilmis mi kontrol et
      const existing = await one<{ id: string }>(
        `select id::text from public.message_log
          where account_id = $1 and wa_message_id = $2 and direction = 'out'
          limit 1`,
        [accountId, waMessageId],
      )
      if (existing) continue

      const { type, body } = extractBody(message)
      if (type === 'unknown' || type === 'other') {
        if (!body) continue
      }

      const phone = await resolveOutboundPhone(message, resolveLidPn)
      const rawStatus = statusFromAck(message.status)
      const status = rawStatus || 'sent'

      const inserted = await query<{ id: string; created_at: string }>(
        `insert into public.message_log
           (org_id, created_by, account_id, direction, remote_jid, phone_e164, message_type, body, wa_message_id, status)
         values ($1, $2, $3, 'out', $4, $5, $6, $7, $8, $9)
         on conflict (account_id, wa_message_id) where direction = 'out' and wa_message_id is not null and account_id is not null
         do update set status = excluded.status
         returning id::text, created_at`,
        [orgId, createdBy, accountId, key.remoteJid, phone, type, body, waMessageId, status],
      )

      const row = inserted[0]
      if (row) {
        logger.info(
          { accountId, waMessageId, phone, body: body?.slice(0, 30) },
          'Telefondan atilan mesaj message_log tablosuna islendi',
        )

        void import('./chat-cache.js')
          .then(({ rememberWaMessage }) =>
            rememberWaMessage({
              orgId,
              phone: phone ?? key.remoteJid,
              waMessageId: waMessageId ?? undefined,
              direction: 'out',
              body,
              messageType: type,
              accountId,
              status,
              createdAt: row.created_at,
            }),
          )
          .catch((err) => {
            logger.debug({ err, accountId }, 'chat-cache out senkron atlandi')
          })
      }
    } catch (error) {
      logger.warn({ err: error, accountId, waMessageId }, 'Telefondan atilan mesaj kaydedilemedi')
    }
  }
}
