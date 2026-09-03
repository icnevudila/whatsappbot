import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, CardHeader } from '@/components/ui'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { CampaignLive, type CampaignView } from './campaign-live'

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

  const [campaignResult, logResult] = await Promise.all([
    supabase.from('campaigns').select(FIELDS).eq('id', id).single(),
    supabase
      .from('message_log')
      .select('id, phone_e164, status, error, created_at')
      .eq('campaign_id', id)
      .order('created_at', { ascending: false })
      .limit(25),
  ])

  if (campaignResult.error || !campaignResult.data) notFound()

  const logs = logResult.data ?? []

  return (
    <>
      <Link
        href="/kampanyalar"
        className="mb-4 inline-block text-[12.5px] text-ink-muted transition-colors hover:text-ink"
      >
        ← Kampanyalar
      </Link>

      <CampaignLive initial={campaignResult.data as CampaignView} />

      {logs.length > 0 ? (
        <div className="mt-4">
          <Card>
            <CardHeader title="Son gonderimler" subtitle="En yeni 25 kayit" />
            <ul className="divide-y divide-hairline">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex items-center justify-between gap-3 px-4 py-2"
                >
                  <span className="font-mono text-[12px] text-ink tabular">
                    {log.phone_e164}
                  </span>
                  <span className="text-[11.5px] text-ink-faint tabular">
                    {new Date(log.created_at).toLocaleTimeString('tr-TR')}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}
    </>
  )
}
