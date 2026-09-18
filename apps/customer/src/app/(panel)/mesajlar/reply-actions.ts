'use server'

import { toE164, type MessageType } from '@wa/shared'
import { enqueueJob } from '@/lib/jobs'
import { requireActiveOrg } from '@/lib/org'
import { syncChatMessage } from '@/lib/chat-store'

export type ReplyState = { error?: string; ok?: string; jobId?: string } | null

/** Gelenler paneli — kara liste + bağlı hat kontrolleriyle job sonucu izlenebilir yanıt. */
export async function replyToConversation(
  _previous: ReplyState,
  formData: FormData,
): Promise<ReplyState> {
  const phone = toE164(String(formData.get('phone') ?? ''))
  const accountId = String(formData.get('account_id') ?? '')
  const body = String(formData.get('body') ?? '').trim()
  const mediaUrl = String(formData.get('media_url') ?? '').trim() || undefined
  const mediaName = String(formData.get('media_name') ?? '').trim() || undefined
  const messageType = (String(formData.get('message_type') ?? '').trim() as MessageType) || (mediaUrl ? (mediaName?.toLowerCase().endsWith('.pdf') ? 'document' : 'image') : 'text')

  if (!phone || !accountId) return { error: 'Yanıt için geçerli bir numara ve bağlı hat gerekli.' }
  if (!body && !mediaUrl) {
    return { error: 'Mesaj metni veya gönderilecek bir dosya/görsel yazmalısınız.' }
  }
  if (body && body.length > 4096) return { error: 'Yanıtınız 1–4096 karakter arasında olmalı.' }

  try {
    const { org, supabase } = await requireActiveOrg()
    const [{ data: account, error }, { count: blocked }, { count: messages }] = await Promise.all([
      supabase
        .from('accounts')
        .select('id, status, enabled, is_locked, phone_e164')
        .eq('id', accountId)
        .eq('org_id', org.id)
        .maybeSingle(),
      supabase
        .from('blacklist')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('phone_e164', phone),
      supabase
        .from('message_log')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('account_id', accountId)
        .eq('phone_e164', phone)
        .eq('direction', 'in'),
    ])

    if (error || !account || account.status !== 'connected' || !account.enabled || account.is_locked) {
      return {
        error:
          'Bu hat şu anda gönderime hazır değil. WhatsApp hatları ekranından bağlantıyı kontrol edin.',
      }
    }
    const ownPhone = toE164(String(account.phone_e164 ?? ''))
    const toSelf = Boolean(ownPhone && ownPhone === phone)

    if (blocked === null || (!toSelf && messages === null)) {
      return { error: 'Konuşma bilgileri kontrol edilemedi. Tekrar deneyin.' }
    }
    if (blocked > 0) return { error: 'Bu numara İstemeyenler’de. Yanıt gönderilemez.' }
    // Kendi hattından kendi numarasına test: gelen konuşma şart değil.
    if (!toSelf && messages === 0) return { error: 'Bu hatta ait konuşma bulunamadı.' }

    const queued = await enqueueJob({
      type: 'message.send',
      accountId,
      payload: {
        phone_e164: phone,
        body: body || undefined,
        media_url: mediaUrl,
        media_name: mediaName,
        message_type: messageType,
      },
      priority: 5,
    })
    if (queued.error || !queued.id) return { error: queued.error ?? 'Yanıt sıraya alınamadı.' }
    const clientKey = String(formData.get('client_key') ?? '').trim() || `local-${queued.id}`
    void syncChatMessage(org.id, phone, {
      id: 0,
      clientKey,
      account_id: accountId,
      direction: 'out',
      phone_e164: phone,
      remote_jid: null,
      message_type: messageType,
      body: body || (messageType === 'document' ? (mediaName || 'Belge (PDF)') : messageType === 'image' ? 'Fotoğraf' : '(ek)'),
      media_url: mediaUrl ?? null,
      status: 'pending',
      created_at: new Date().toISOString(),
      campaign_id: null,
    })
    return { jobId: queued.id }
  } catch {
    return { error: 'Yanıt hazırlanamadı. Bağlantınızı kontrol edip tekrar deneyin.' }
  }
}
