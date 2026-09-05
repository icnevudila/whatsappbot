'use server'

import { revalidatePath } from 'next/cache'
import { toE164 } from '@wa/shared'
import { enqueueJob } from '@/lib/jobs'
import { requireActiveOrg } from '@/lib/org'

export type ReplyState = { error?: string; ok?: string; jobId?: string } | null

/** Polish gelenler paneli — basit kuyruk yanıtı. */
export async function replyToInbox(
  _prev: ReplyState,
  formData: FormData,
): Promise<ReplyState> {
  const phone = String(formData.get('phone_e164') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()
  const accountId = String(formData.get('account_id') ?? '').trim()

  if (!phone.startsWith('+')) return { error: 'Geçerli E.164 numara gerekli.' }
  if (!body) return { error: 'Mesaj boş olamaz.' }
  if (!accountId) return { error: 'Gönderen hat seçilmedi (hesap bilinmiyor).' }

  try {
    await requireActiveOrg()
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum yok.' }
  }

  const { error } = await enqueueJob({
    type: 'message.send',
    accountId,
    payload: { phone_e164: phone, body, message_type: 'text' },
    priority: 20,
  })

  if (error) return { error }

  revalidatePath('/gelenler')
  return { ok: 'Yanıt kuyruğa alındı.' }
}

/** Ürün gelenler paneli — job sonucu izlenebilir yanıt. */
export async function replyToConversation(
  _previous: ReplyState,
  formData: FormData,
): Promise<ReplyState> {
  const phone = toE164(String(formData.get('phone') ?? ''))
  const accountId = String(formData.get('account_id') ?? '')
  const body = String(formData.get('body') ?? '').trim()
  if (!phone || !accountId) return { error: 'Yanıt için geçerli bir numara ve bağlı hat gerekli.' }
  if (!body || body.length > 4096) return { error: 'Yanıtınız 1–4096 karakter arasında olmalı.' }

  try {
    const { org, supabase } = await requireActiveOrg()
    const [{ data: account, error }, { count: blocked }, { count: messages }] = await Promise.all([
      supabase
        .from('accounts')
        .select('id, status, enabled, is_locked')
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
    if (blocked === null || messages === null) {
      return { error: 'Konuşma bilgileri kontrol edilemedi. Tekrar deneyin.' }
    }
    if (blocked > 0) return { error: 'Bu numara kara listede. Yanıt gönderilemez.' }
    if (messages === 0) return { error: 'Bu hatta ait konuşma bulunamadı.' }

    const queued = await enqueueJob({
      type: 'message.send',
      accountId,
      payload: { phone_e164: phone, body },
      priority: 5,
    })
    if (queued.error || !queued.id) return { error: queued.error ?? 'Yanıt sıraya alınamadı.' }
    return { jobId: queued.id }
  } catch {
    return { error: 'Yanıt hazırlanamadı. Bağlantınızı kontrol edip tekrar deneyin.' }
  }
}
