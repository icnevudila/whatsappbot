import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { PageHeader, QuietLink } from '@/components/ui'
import { requireActiveOrg } from '@/lib/org'
import { CampaignWizard } from '../../campaign-wizard'
import { loadCampaignWizardData } from '../../wizard-data'
import { parseWizardStep } from '../../campaign-wizard-types'

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
    return { title: data?.name ? `Düzenle · ${data.name}` : 'Kampanyayı düzenle' }
  } catch {
    return { title: 'Kampanyayı düzenle' }
  }
}

export default async function EditCampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ adim?: string | string[] }>
}) {
  const { id } = await params
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') redirect('/erisim-yok')
    redirect('/giris')
  }

  const qs = await searchParams
  const raw = Array.isArray(qs.adim) ? qs.adim[0] : qs.adim

  const [campaignResult, accountsResult, data] = await Promise.all([
    supabase
      .from('campaigns')
      .select(
        'id, name, status, body, body_b, ab_percent, media_url, message_type, source_list_ids, min_delay_seconds, max_delay_seconds, daily_cap_per_account, scheduled_at',
      )
      .eq('id', id)
      .eq('org_id', org.id)
      .maybeSingle(),
    supabase
      .from('campaign_accounts')
      .select('account_id')
      .eq('campaign_id', id)
      .eq('org_id', org.id),
    loadCampaignWizardData(org.id),
  ])

  if (!campaignResult.data) notFound()
  const campaign = campaignResult.data

  return (
    <>
      <PageHeader
        title="Kampanyayı düzenle"
        description={campaign.name}
        action={<QuietLink href={`/kampanyalar/${id}`}>← Detay</QuietLink>}
      />
      <Suspense>
        <CampaignWizard
          mode="edit"
          orgId={org.id}
          initialStep={parseWizardStep(raw)}
          campaign={{
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            body: campaign.body,
            media_url: campaign.media_url,
            message_type: campaign.message_type,
            source_list_ids: campaign.source_list_ids ?? [],
            account_ids: (accountsResult.data ?? []).map((row) => row.account_id),
            min_delay_seconds: campaign.min_delay_seconds,
            max_delay_seconds: campaign.max_delay_seconds,
            daily_cap_per_account: campaign.daily_cap_per_account,
            body_b: campaign.body_b,
            ab_percent: campaign.ab_percent,
            scheduled_at: campaign.scheduled_at,
          }}
          {...data}
        />
      </Suspense>
    </>
  )
}
