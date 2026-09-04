import { isJidGroup, type WAMessage } from '@whiskeysockets/baileys'
import { jidToE164 } from '@wa/shared'
import { query } from './db.js'
import { logger } from './logger.js'

const OPT_OUT =
  /\b(dur|yazma|yazmayın|yazmayin|çıkar|cikar|çıkarın|cikarin|stop|unsubscribe|iptal)\b/i

function extractBody(message: WAMessage): { type: string; body: string | null } {
  const content = message.message
  if (!content) return { type: 'unknown', body: null }

  if (content.conversation) return { type: 'text', body: content.conversation }
  if (content.extendedTextMessage?.text) {
    return { type: 'text', body: content.extendedTextMessage.text }
  }
  if (content.imageMessage) {
    return { type: 'image', body: content.imageMessage.caption ?? null }
  }
  if (content.videoMessage) {
    return { type: 'video', body: content.videoMessage.caption ?? null }
  }
  if (content.documentMessage) {
    return {
      type: 'document',
      body: content.documentMessage.caption ?? content.documentMessage.fileName ?? null,
    }
  }
  if (content.audioMessage) return { type: 'audio', body: null }
  if (content.stickerMessage) return { type: 'sticker', body: null }
  if (content.buttonsResponseMessage?.selectedDisplayText) {
    return { type: 'text', body: content.buttonsResponseMessage.selectedDisplayText }
  }
  if (content.listResponseMessage?.title) {
    return { type: 'text', body: content.listResponseMessage.title }
  }

  return { type: 'other', body: null }
}

/**
 * Gelen mesajlari message_log'a yazar; panel Gelenler sayfasinda izlenir.
 * Cift kayit: ayni wa_message_id hesabinda bir kez tutulur.
 */
export async function persistInboundMessage(options: {
  ownerId: string
  accountId: string
  message: WAMessage
}): Promise<void> {
  const { ownerId, accountId, message } = options
  const key = message.key
  if (!key?.remoteJid || key.fromMe) return
  if (isJidGroup(key.remoteJid)) return

  const waMessageId = key.id ?? null
  if (waMessageId) {
    const existing = await query<{ id: string }>(
      `select id::text from public.message_log
        where account_id = $1 and wa_message_id = $2 and direction = 'in'
        limit 1`,
      [accountId, waMessageId],
    )
    if (existing.length > 0) return
  }

  const { type, body } = extractBody(message)
  // Bos protokol / bildirim paketlerini yazmiyoruz.
  if (type === 'unknown' || type === 'other') {
    if (!body) return
  }

  const phone = jidToE164(key.remoteJid)

  await query(
    `insert into public.message_log
       (owner_id, account_id, direction, remote_jid, phone_e164, message_type, body, wa_message_id, status)
     values ($1, $2, 'in', $3, $4, $5, $6, $7, 'delivered')`,
    [ownerId, accountId, key.remoteJid, phone, type, body, waMessageId],
  )

  // Opt-out: gelen metin cikma istegi gibiyse kara listeye al.
  if (phone && body && OPT_OUT.test(body)) {
    await query(
      `insert into public.blacklist (owner_id, phone_e164, reason)
       values ($1, $2, $3)
       on conflict (owner_id, phone_e164) do update
         set reason = coalesce(excluded.reason, public.blacklist.reason)`,
      [ownerId, phone, `Otomatik: gelen yanıt — ${body.slice(0, 80)}`],
    )
    logger.info({ accountId, phone }, 'Opt-out: kara listeye eklendi')
  }
}
