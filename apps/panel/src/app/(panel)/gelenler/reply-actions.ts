'use server'

import { revalidatePath } from 'next/cache'
import { enqueueJob } from '@/lib/jobs'
import { requireActiveOrg } from '@/lib/org'

export type ReplyState = { error?: string; ok?: string } | null

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
