import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Notice, PageHeader, QuietLink, StatusPill } from '@/components/ui'
import { requireActiveOrg } from '@/lib/org'
import { CampaignLive, type CampaignView } from './campaign-live'
import { TargetFeed, type TargetView } from './target-feed'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  try {
    const { org, supabase } = await requireActiveOrg()
    const { data } = await supabase
      .from('campaigns')
      .select('name')
      .eq('id', id)
      .eq('org_id', org.id)
      .maybeSingle()
    return { title: data?.name ? `Kampanya · ${data.name}` : 'Kampanya' }
  } catch {
    return { title: 'Kampanya' }
  }
}

const FIELDS =
  'id, name, status, body, body_b, ab_percent, media_url, message_type, total_targets, sent_count, failed_count, skipped_count, stop_reason, min_delay_seconds, max_delay_seconds, daily_cap_per_account, started_at, completed_at, source_list_ids'

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ taslak?: string | string[]; zamanlandi?: string | string[]; uyari?: string | string[] }>
}) {
  const { id } = await params
  const qs = await searchParams
  const flash =
    (Array.isArray(qs.taslak) ? qs.taslak[0] : qs.taslak) === '1'
      ? ('taslak' as const)
      : (Array.isArray(qs.zamanlandi) ? qs.zamanlandi[0] : qs.zamanlandi) === '1'
        ? ('zamanlandi' as const)
        : (Array.isArray(qs.uyari) ? qs.uyari[0] : qs.uyari) === 'baslatilamadi'
          ? ('baslatilamadi' as const)
          : null
  const { org, supabase } = await requireActiveOrg()

  const [campaignResult, targetsResult, accountsResult, listsResult, allAccountsResult] =
    await Promise.all([
      supabase.from('campaigns').select(FIELDS).eq('id', id).eq('org_id', org.id).single(),
      supabase
        .from('campaign_targets')
        .select('id, phone_e164, status, error, sent_at, wa_message_id, updated_at')
        .eq('campaign_id', id)
        .eq('org_id', org.id)
        .order('id', { ascending: false })
        .limit(200),
      supabase
        .from('campaign_accounts')
        .select('account_id, accounts(id, label)')
        .eq('campaign_id', id)
        .eq('org_id', org.id),
      supabase
        .from('contact_lists')
        .select('id, name, contact_count')
        .eq('org_id', org.id)
        .neq('source', 'quick_send')
        .order('created_at', { ascending: false }),
      supabase
        .from('accounts')
        .select('id, label, status, is_locked')
        .eq('org_id', org.id)
        .order('created_at'),
    ])

  if (campaignResult.error || !campaignResult.data) notFound()

  const campaign = campaignResult.data as CampaignView
  const sourceListIds = campaign.source_list_ids ?? []

  const linkedListNames =
    sourceListIds.length > 0
      ? await supabase
          .from('contact_lists')
          .select('id, name')
          .eq('org_id', org.id)
          .in('id', sourceListIds)
      : { data: [] as { id: string; name: string }[] }

  const sourceLists = (linkedListNames.data ?? []).map((list) => ({
    id: list.id,
    name: list.name,
  }))

  const accounts = (accountsResult.data ?? [])
    .map((row) => {
      const nested = row.accounts as { id: string; label: string } | null
      if (!nested) return null
      return { id: nested.id, label: nested.label }
    })
    .filter((row): row is { id: string; label: string } => Boolean(row))

  const listOptions = (listsResult.data ?? []).map((list) => ({
    id: list.id,
    label: list.name,
    detail: `${list.contact_count} numara`,
  }))

  const accountOptions = (allAccountsResult.data ?? []).map((account) => {
    const selected = accounts.some((row) => row.id === account.id)
    return {
      id: account.id,
      label: account.label,
      detail: account.is_locked
        ? 'kilitli'
        : account.status === 'connected'
          ? 'bağlı'
          : 'bağlı değil',
      // Seçili hatlar kilitli olsa da formda kalsın; yeni eklenenler bağlı olmalı.
      disabled: selected ? false : account.is_locked || account.status !== 'connected',
    }
  })

  return (
    <>
      <PageHeader
        title={campaign.name}
        description="Canlı ilerleme, düzenleme, hatlar ve hedef numaralar. Gönderilmiş kayıtlar korunur."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={campaign.status} />
            <QuietLink href="/kampanyalar">← Kampanyalar</QuietLink>
            <QuietLink href="#paylasilanlar">Hedef numaralar</QuietLink>
          </div>
        }
      />

      <CampaignLive
        initial={campaign}
        sourceLists={sourceLists}
        accounts={accounts}
        listOptions={listOptions}
        accountOptions={accountOptions}
        orgId={org.id}
      />

      <div id="paylasilanlar" className="mt-2.5">
        <TargetFeed
          campaignId={id}
          initial={(targetsResult.data ?? []) as TargetView[]}
          campaignStatus={campaign.status}
        />
      </div>
    </>
  )
}
