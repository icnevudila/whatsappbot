'use server'

import { revalidatePath } from 'next/cache'
import { isOrgAdminRole, requireActiveOrg } from '@/lib/org'

export type ReplyState = { error?: string; ok?: string } | null

export async function replyChannelMessage(
  _prev: ReplyState,
  formData: FormData,
): Promise<ReplyState> {
  const channelAccountId = String(formData.get('channel_account_id') ?? '').trim()
  const threadId = String(formData.get('thread_id') ?? '').trim()
  const channel = String(formData.get('channel') ?? '').trim()
  const text = String(formData.get('text') ?? '').trim()

  if (!channelAccountId || !threadId || !text || !channel) {
    return { error: 'Eksik alan.' }
  }

  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch {
    return { error: 'Oturum yok.' }
  }

  if (!isOrgAdminRole(org.role)) return { error: 'Yetki yok.' }

  const { data: account } = await supabase
    .from('channel_accounts' as 'accounts')
    .select('id, credentials, channel')
    .eq('id', channelAccountId)
    .eq('org_id', org.id)
    .maybeSingle()

  if (!account) return { error: 'Kanal hesabı bulunamadı.' }

  const { error } = await supabase.from('channel_messages' as 'message_log').insert({
    org_id: org.id,
    channel_account_id: channelAccountId,
    channel,
    direction: 'outbound',
    external_thread_id: threadId,
    sender_id: 'panel',
    text,
    payload: { source: 'panel_reply' },
  } as never)

  if (error) return { error: error.message }

  revalidatePath('/kanal-gelen')
  return { ok: 'Yanıt kaydedildi (worker canlı gönderimi sonraki adım).' }
}
