'use server'

import { revalidatePath } from 'next/cache'
import { isOrgAdminRole, requireActiveOrg } from '@/lib/org'

export type ChannelActionState = { error?: string; ok?: string } | null

const ALLOWED_CHANNELS = new Set([
  'telegram',
  'instagram',
  'facebook',
  'rcs',
  'line',
  'wechat',
  'webchat',
  'shopify',
  'ikas',
  'woocommerce',
  'magento',
  'tsoft',
  'ticimax',
  'ideasoft',
  'proje',
  'trendyol',
  'hepsiburada',
  'erp',
  'sap',
  'oracle',
  'ifs',
  'nebim',
  'crm',
  'hubspot',
  'zendesk',
  'calendar',
])

function revalidateKanallar() {
  revalidatePath('/kanallar')
}

export async function connectChannelAccount(
  _previous: ChannelActionState,
  formData: FormData,
): Promise<ChannelActionState> {
  const channel = String(formData.get('channel') ?? '').trim()
  const label = String(formData.get('label') ?? '').trim()
  const externalAccountId = String(formData.get('external_account_id') ?? '').trim() || null
  const token = String(formData.get('token') ?? '').trim()
  const apiBase = String(formData.get('api_base') ?? '').trim()
  const pageId = String(formData.get('page_id') ?? '').trim()
  const channelSecret = String(formData.get('channel_secret') ?? '').trim()
  const verifyToken = String(formData.get('verify_token') ?? '').trim()
  const sellerId = String(formData.get('seller_id') ?? '').trim()
  const apiKey = String(formData.get('api_key') ?? '').trim()
  const apiSecret = String(formData.get('api_secret') ?? '').trim()

  if (!ALLOWED_CHANNELS.has(channel)) {
    return { error: 'Geçersiz kanal.' }
  }
  if (!label) return { error: 'Etiket gerekli.' }

  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum yok.' }
  }

  if (!isOrgAdminRole(org.role)) {
    return { error: 'Yalnızca yönetici bağlayabilir.' }
  }

  const credentials: Record<string, string> = {}
  if (token) {
    credentials.token = token
    credentials.access_token = token
    credentials.bot_token = token
  }
  if (apiBase) credentials.api_base = apiBase
  if (pageId) credentials.page_id = pageId
  if (channelSecret) credentials.channel_secret = channelSecret
  if (verifyToken) credentials.verify_token = verifyToken
  if (sellerId) credentials.seller_id = sellerId
  if (apiKey) credentials.api_key = apiKey
  if (apiSecret) credentials.api_secret = apiSecret

  const metadata: Record<string, string> = {}
  if (pageId) metadata.pageId = pageId
  if (apiBase) metadata.apiBase = apiBase

  const { error } = await supabase.from('channel_accounts' as 'accounts').insert({
    org_id: org.id,
    channel,
    label,
    external_account_id: externalAccountId,
    status: token || apiKey || channel === 'webchat' ? 'connected' : 'disconnected',
    credentials,
    metadata,
  } as never)

  if (error) return { error: error.message }

  revalidateKanallar()
  return { ok: `${label} bağlandı (${channel}).` }
}

export async function disconnectChannelAccount(accountId: string): Promise<ChannelActionState> {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum yok.' }
  }

  if (!isOrgAdminRole(org.role)) {
    return { error: 'Yalnızca yönetici kaldırabilir.' }
  }

  const { error } = await supabase
    .from('channel_accounts' as 'accounts')
    .delete()
    .eq('id', accountId)
    .eq('org_id', org.id)

  if (error) return { error: error.message }

  revalidateKanallar()
  return { ok: 'Bağlantı kaldırıldı.' }
}
