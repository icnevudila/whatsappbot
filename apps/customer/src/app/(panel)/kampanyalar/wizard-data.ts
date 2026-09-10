import type { BrandKitOption } from '@/components/ai-image'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { e164ToMaskedTr } from '@/lib/onboarding'
import { hasImageProvider } from '@/lib/ai/image'
import { hasTextProvider } from '@/lib/ai/text'
import type { AccountOption, CreativeOption, ListOption } from './campaign-wizard-types'

export async function loadCampaignWizardData(orgId: string) {
  const supabase = await createSupabaseServerClient()
  const [listsResult, accountsResult, brandResult, creativesResult] = await Promise.all([
    supabase
      .from('contact_lists')
      .select('id, name, contact_count')
      .eq('org_id', orgId)
      .neq('source', 'quick_send')
      .order('created_at', { ascending: false }),
    supabase
      .from('accounts')
      .select('id, label, status, is_locked, phone_e164')
      .eq('org_id', orgId)
      .order('created_at'),
    supabase
      .from('brand_kits')
      .select('id, name, is_default, tone')
      .eq('org_id', orgId)
      .order('is_default', { ascending: false })
      .order('created_at'),
    supabase
      .from('creatives')
      .select('id, public_url')
      .eq('org_id', orgId)
      .eq('status', 'ready')
      .not('public_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(24),
  ])

  const lists: ListOption[] = (listsResult.data ?? []).map((list) => ({
    id: list.id,
    label: list.name,
    detail: `${Number(list.contact_count ?? 0).toLocaleString('tr-TR')} kişi`,
    contactCount: Number(list.contact_count ?? 0),
  }))

  const accounts: AccountOption[] = (accountsResult.data ?? []).map((account) => {
    const connected = account.status === 'connected' && !account.is_locked
    return {
      id: account.id,
      label: account.label,
      phone: e164ToMaskedTr(account.phone_e164) || account.phone_e164,
      connected,
      disabled: !connected,
      detail: account.is_locked ? 'Kilitli' : connected ? 'Bağlı' : 'Bağlı değil',
    }
  })

  const brandKits: BrandKitOption[] = (brandResult.data ?? []).map((kit) => ({
    id: kit.id,
    name: kit.name,
    isDefault: kit.is_default,
  }))
  const defaultKit =
    (brandResult.data ?? []).find((kit) => kit.is_default) ?? (brandResult.data ?? [])[0]

  const creatives: CreativeOption[] = (creativesResult.data ?? [])
    .filter((row) => row.public_url)
    .map((row) => ({ id: row.id, url: row.public_url as string }))

  return {
    lists,
    accounts,
    creatives,
    brandKits,
    brandName: defaultKit?.name ?? undefined,
    brandTone: defaultKit?.tone ?? undefined,
    aiEnabled: hasTextProvider(),
    imageAiEnabled: hasImageProvider(),
  }
}
