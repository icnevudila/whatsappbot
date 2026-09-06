import { isJidGroup, isLidUser, type WAMessage } from '@whiskeysockets/baileys'
import { jidToE164 } from '@wa/shared'
import { query } from './db.js'
import { logger } from './logger.js'
import {
  emitOrgWebhook,
  findMatchingAutoReply,
  recentOutboundExists,
} from './org-hooks.js'
import { isOptOutMessage } from './opt-out.js'

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
 * LID (@lid) rakamlari telefon degildir. Once senderPn / participantPn,
 * sonra PN remoteJid, son olarak opsiyonel mapping resolver.
 */
export async function resolveInboundPhone(
  message: WAMessage,
  resolveLidPn?: (lidJid: string) => Promise<string | null>,
): Promise<string | null> {
  const key = message.key
  if (!key?.remoteJid) return null

  const fromPnHint =
    jidToE164(key.senderPn ?? '') ??
    jidToE164(key.participantPn ?? '') ??
    null
  if (fromPnHint) return fromPnHint

  if (!isLidUser(key.remoteJid)) {
    return jidToE164(key.remoteJid)
  }

  if (resolveLidPn) {
    try {
      const mapped = await resolveLidPn(key.remoteJid)
      if (mapped) return jidToE164(mapped) ?? (mapped.startsWith('+') ? mapped : null)
    } catch {
      // Mapping yoksa phone null kalir; Gelenler "Yeni" sekmesine duser.
    }
  }

  return null
}

/**
 * Gelen mesajlari message_log'a yazar; panel Gelenler sayfasinda izlenir.
 * Cift kayit: partial unique index + select guard.
 */
export async function persistInboundMessage(options: {
  orgId: string
  createdBy: string
  accountId: string
  message: WAMessage
  resolveLidPn?: (lidJid: string) => Promise<string | null>
}): Promise<void> {
  const { orgId, createdBy, accountId, message, resolveLidPn } = options
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

  const phone = await resolveInboundPhone(message, resolveLidPn)

  try {
    await query(
      `insert into public.message_log
         (org_id, created_by, account_id, direction, remote_jid, phone_e164, message_type, body, wa_message_id, status)
       values ($1, $2, $3, 'in', $4, $5, $6, $7, $8, 'delivered')`,
      [orgId, createdBy, accountId, key.remoteJid, phone, type, body, waMessageId],
    )
  } catch (error) {
    // Yarıs: ayni wa_message_id baska worker/event ile yazildi.
    const code = (error as { code?: string } | null)?.code
    if (code === '23505') return
    throw error
  }

  // Opt-out: yalnizca gercek telefon biliniyorsa kara listeye al.
  if (phone && body && isOptOutMessage(body)) {
    await query(
      `insert into public.blacklist (org_id, created_by, phone_e164, reason)
       values ($1, $2, $3, $4)
       on conflict (org_id, phone_e164) do update
         set reason = coalesce(excluded.reason, public.blacklist.reason)`,
      [orgId, createdBy, phone, `Otomatik: gelen yanıt — ${body.slice(0, 80)}`],
    )
    logger.info({ accountId, phone }, 'Opt-out: kara listeye eklendi')
  }

  void emitOrgWebhook(orgId, 'message.inbound', {
    account_id: accountId,
    phone_e164: phone,
    message_type: type,
    body: body?.slice(0, 500) ?? null,
    wa_message_id: waMessageId,
  })

  // Otomatik yanit: job kuyruguna message.send
  if (phone && !isOptOutMessage(body)) {
    try {
      const rule = await findMatchingAutoReply(orgId, body)
      if (rule) {
        const cooling = await recentOutboundExists(orgId, phone, rule.cooldown_seconds)
        if (!cooling) {
          await query(
            `insert into public.jobs
               (org_id, created_by, account_id, type, payload, priority, status)
             values ($1, $2, $3, 'message.send', $4::jsonb, 50, 'pending')`,
            [
              orgId,
              createdBy,
              accountId,
              JSON.stringify({
                phone_e164: phone,
                body: rule.reply_body,
                message_type: 'text',
              }),
            ],
          )
          logger.info({ accountId, phone, ruleId: rule.id }, 'Auto-reply kuyruga alindi')
        }
      }
    } catch (error) {
      logger.warn({ err: error, accountId }, 'Auto-reply basarisiz')
    }
  }
}
