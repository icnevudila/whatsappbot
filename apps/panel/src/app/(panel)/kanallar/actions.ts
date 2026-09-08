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
  'sap',
  'oracle',
  'ifs',
  'nebim',
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
  if (token) credentials.token = token
  if (apiBase) credentials.api_base = apiBase

  const { error } = await supabase.from('channel_accounts' as 'accounts').insert({
    org_id: org.id,
    channel,
    label,
    external_account_id: externalAccountId,
    status: token || channel === 'webchat' ? 'connected' : 'disconnected',
    credentials,
    metadata: {},
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
