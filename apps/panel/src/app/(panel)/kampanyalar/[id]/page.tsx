import Link from 'next/link'
import { notFound } from 'next/navigation'
import { QuietLink } from '@/components/ui'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { CampaignLive, type CampaignView } from './campaign-live'
import { TargetFeed, type TargetView } from './target-feed'

export const dynamic = 'force-dynamic'

const FIELDS =
  'id, name, status, body, media_url, total_targets, sent_count, failed_count, skipped_count, stop_reason, min_delay_seconds, max_delay_seconds, daily_cap_per_account, started_at, completed_at'

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const [campaignResult, targetsResult] = await Promise.all([
    supabase.from('campaigns').select(FIELDS).eq('id', id).single(),
    supabase
      .from('campaign_targets')
      .select('id, phone_e164, status, error, sent_at, wa_message_id, updated_at')
      .eq('campaign_id', id)
      .order('id', { ascending: false })
      .limit(200),
  ])

  if (campaignResult.error || !campaignResult.data) notFound()

  return (
    <>
      <QuietLink href="/kampanyalar" className="mb-4 inline-block">
        ← Kampanyalar
      </QuietLink>

      <CampaignLive initial={campaignResult.data as CampaignView} />

      <div className="mt-4">
        <TargetFeed
          campaignId={id}
          initial={(targetsResult.data ?? []) as TargetView[]}
        />
      </div>
    </>
  )
}
