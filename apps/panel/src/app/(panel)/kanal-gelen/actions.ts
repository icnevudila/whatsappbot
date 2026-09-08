'use server'

import { revalidatePath } from 'next/cache'
import { isOrgAdminRole, requireActiveOrg } from '@/lib/org'

export type ReplyState = { error?: string; ok?: string } | null

const MESSAGING = new Set([
  'telegram',
  'instagram',
  'facebook',
  'rcs',
  'line',
  'wechat',
  'webchat',
])

const QNA = new Set(['crm', 'hubspot', 'zendesk'])

function jobForChannel(channel: string, threadId: string, text: string, accountId: string) {
  if (MESSAGING.has(channel)) {
    return {
      type: 'channel.send',
      payload: { threadId, text, accountId, source: 'panel_reply' },
      okMessage: 'Yanıt kuyruğa alındı; kanal worker gönderiyor.',
    }
  }
  if (QNA.has(channel)) {
    return {
      type: 'channel.qna.answer',
      payload: { question: text, threadId, accountId, source: 'panel_reply' },
      okMessage: 'Soru kuyruğa alındı; CRM worker yanıtlıyor.',
    }
  }
  // Commerce / marketplace / ERP → lookup (metin = sipariş no veya SKU)
  const looksLikeSku = /^[A-Za-z0-9_-]{2,64}$/.test(text) && !/\s/.test(text) && /[A-Za-z]/.test(text)
  return {
    type: 'channel.lookup',
    payload: looksLikeSku
      ? { sku: text, threadId, accountId, source: 'panel_reply' }
      : { orderId: text, threadId, accountId, source: 'panel_reply' },
    okMessage: 'Lookup kuyruğa alındı; kanal worker sorguluyor.',
  }
}

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

  const accountChannel = String((account as { channel?: string }).channel ?? channel)
  const job = jobForChannel(accountChannel, threadId, text, channelAccountId)

  const { error } = await supabase.from('channel_messages' as 'message_log').insert({
    org_id: org.id,
    channel_account_id: channelAccountId,
    channel: accountChannel,
    direction: 'outbound',
    external_thread_id: threadId,
    sender_id: 'panel',
    text,
    payload: { source: 'panel_reply', job_type: job.type },
  } as never)

  if (error) return { error: error.message }

  const { error: jobError } = await supabase.from('channel_jobs' as 'message_log').insert({
    org_id: org.id,
    channel_account_id: channelAccountId,
    channel: accountChannel,
    type: job.type,
    payload: job.payload,
  } as never)

  if (jobError) {
    revalidatePath('/kanal-gelen')
    return {
      error: `Mesaj kaydedildi ama kuyruk hatası: ${jobError.message}`,
    }
  }

  revalidatePath('/kanal-gelen')
  return { ok: job.okMessage }
}
