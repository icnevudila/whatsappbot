import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader, QuietLink, StatusPill } from '@/components/ui'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { CampaignLive, type CampaignView } from './campaign-live'
import { TargetFeed, type TargetView } from './target-feed'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.from('campaigns').select('name').eq('id', id).maybeSingle()
  return { title: data?.name ? `Kampanya · ${data.name}` : 'Kampanya' }
}

const FIELDS =
  'id, name, status, body, media_url, message_type, total_targets, sent_count, failed_count, skipped_count, stop_reason, min_delay_seconds, max_delay_seconds, daily_cap_per_account, started_at, completed_at, source_list_ids'

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const [campaignResult, targetsResult, accountsResult] = await Promise.all([
    supabase.from('campaigns').select(FIELDS).eq('id', id).single(),
    supabase
      .from('campaign_targets')
      .select('id, phone_e164, status, error, sent_at, wa_message_id, updated_at')
      .eq('campaign_id', id)
      .order('id', { ascending: false })
      .limit(200),
    supabase
      .from('campaign_accounts')
      .select('account_id, accounts(id, label)')
      .eq('campaign_id', id),
  ])

  if (campaignResult.error || !campaignResult.data) notFound()

  const campaign = campaignResult.data as CampaignView & { source_list_ids: string[] }
  const sourceListIds = campaign.source_list_ids ?? []

  const listsResult =
    sourceListIds.length > 0
      ? await supabase.from('contact_lists').select('id, name').in('id', sourceListIds)
      : { data: [] as { id: string; name: string }[] }

  const sourceLists = (listsResult.data ?? []).map((list) => ({
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

  return (
    <>
      <PageHeader
        title={campaign.name}
        description="Canlı ilerleme, hatlar ve hedef numaralar."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={campaign.status} />
            <QuietLink href="/kampanyalar">← Kampanyalar</QuietLink>
            <QuietLink href="#paylasilanlar">Hedef numaralar</QuietLink>
          </div>
        }
      />

      <CampaignLive initial={campaign} sourceLists={sourceLists} accounts={accounts} />

      <div className="mt-4" id="paylasilanlar">
        <TargetFeed
          campaignId={id}
          initial={(targetsResult.data ?? []) as TargetView[]}
          campaignStatus={campaign.status}
        />
      </div>
    </>
  )
}
