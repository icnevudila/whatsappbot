'use server'

import { toE164, type MessageType } from '@wa/shared'
import { enqueueJob } from '@/lib/jobs'
import { requireActiveOrg } from '@/lib/org'

export type ReplyState = { error?: string; ok?: string; jobId?: string } | null

/** Gelenler paneli — kara liste + bağlı hat kontrolleriyle job sonucu izlenebilir yanıt. */
export async function replyToConversation(
  _previous: ReplyState,
  formData: FormData,
): Promise<ReplyState> {
  const rawTarget = String(formData.get('phone') ?? '').trim()
  const recipientJid = String(formData.get('recipient_jid') ?? '').trim()
  const accountId = String(formData.get('account_id') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()
  const mediaUrl = String(formData.get('media_url') ?? '').trim() || undefined
  const mediaName = String(formData.get('media_name') ?? '').trim() || undefined
  const messageType = (String(formData.get('message_type') ?? '').trim() as MessageType) || undefined

  if (!rawTarget || !accountId) {
    return { error: 'Yanıt için geçerli bir alıcı ve bağlı hat gerekli.' }
  }
  if (!body && !mediaUrl) {
    return { error: 'Mesaj metni veya gönderilecek bir dosya/görsel yazmalısınız.' }
  }
  if (body && body.length > 4096) {
    return { error: 'Yanıtınız 1–4096 karakter arasında olmalı.' }
  }

  const isLid = rawTarget.endsWith('@lid')
  const phone = isLid ? null : toE164(rawTarget)
  if (!isLid && !phone) {
    return { error: 'Geçerli bir telefon numarası bulunamadı.' }
  }

  try {
    const { org, supabase } = await requireActiveOrg()

    const accountPromise = supabase
      .from('accounts')
      .select('id, status, enabled, is_locked')
      .eq('id', accountId)
      .eq('org_id', org.id)
      .maybeSingle()

    const blacklistPromise = phone
      ? supabase
          .from('blacklist')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', org.id)
          .eq('phone_e164', phone)
      : Promise.resolve({ count: 0 })

    let messageCountQuery = supabase
      .from('message_log')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('account_id', accountId)

    messageCountQuery = phone
      ? messageCountQuery.eq('phone_e164', phone)
      : messageCountQuery.eq('remote_jid', rawTarget)

    const [{ data: account, error }, { count: blocked }, { count: messages }] = await Promise.all([
      accountPromise,
      blacklistPromise,
      messageCountQuery,
    ])

    if (error || !account || account.status !== 'connected' || !account.enabled || account.is_locked) {
      return {
        error:
          'Bu hat şu anda gönderime hazır değil. WhatsApp hatları ekranından bağlantıyı kontrol edin.',
      }
    }
    if (blocked === null || messages === null) {
      return { error: 'Konuşma bilgileri kontrol edilemedi. Tekrar deneyin.' }
    }
    if (blocked > 0) return { error: 'Bu numara İstemeyenler’de. Yanıt gönderilemez.' }
    if (messages === 0) return { error: 'Bu hatta ait konuşma bulunamadı.' }

    const queued = await enqueueJob({
      type: 'message.send',
      accountId,
      payload: {
        phone_e164: phone ?? '',
        recipient_jid: isLid ? rawTarget : (recipientJid.endsWith('@lid') ? recipientJid : undefined),
        body: body || undefined,
        media_url: mediaUrl,
        media_name: mediaName,
        message_type: messageType,
      },
      priority: 5,
    })
    if (queued.error || !queued.id) return { error: queued.error ?? 'Yanıt sıraya alınamadı.' }
    return { jobId: queued.id }
  } catch {
    return { error: 'Yanıt hazırlanamadı. Bağlantınızı kontrol edip tekrar deneyin.' }
  }
}
