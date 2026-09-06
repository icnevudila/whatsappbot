'use server'

import { toE164 } from '@wa/shared'
import { enqueueJob } from '@/lib/jobs'
import { requireActiveOrg } from '@/lib/org'

export type ReplyState = { error?: string; ok?: string; jobId?: string } | null

/** Gelenler paneli — kara liste + bağlı hat kontrolleriyle job sonucu izlenebilir yanıt. */
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
