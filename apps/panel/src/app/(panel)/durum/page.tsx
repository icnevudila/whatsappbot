import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AccentLink, Card, HourlyBars, PageHeader } from '@/components/ui'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { EventFeed, type EventView } from './event-feed'
import { StatusBoard, type CampaignView, type LineView } from './status-board'

export const metadata: Metadata = { title: 'Genel durum' }

/** Son 24 saati saat bucket'larina ayir; veri yoksa sessizce 0. */
function bucketLast24Hours(timestamps: string[]): number[] {
  const now = Date.now()
  const hourMs = 60 * 60 * 1000
  const counts = Array.from({ length: 24 }, () => 0)

  for (const stamp of timestamps) {
    const age = now - new Date(stamp).getTime()
    if (age < 0 || age >= 24 * hourMs) continue
    const bucket = 23 - Math.floor(age / hourMs)
    counts[bucket] += 1
  }

  return counts
}

export default async function StatusPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/giris')

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [{ data: accounts }, { data: campaigns }, { data: events }, { data: outLog }] =
    await Promise.all([
      supabase
        .from('accounts')
        .select(
          'id, label, phone_e164, status, enabled, is_locked, lock_reason, daily_send_limit, sent_today, sent_today_on, warmup_started_at, new_chat_quota_total, new_chat_quota_used, reachout_locked_until',
        )
        .order('created_at'),
      supabase
        .from('campaigns')
        .select('id, name, status, total_targets, sent_count, failed_count, skipped_count')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('account_events')
        .select('id, account_id, level, event, detail, created_at')
        .order('id', { ascending: false })
        .limit(50),
      supabase
        .from('message_log')
        .select('created_at')
        .eq('direction', 'out')
        .gte('created_at', since),
    ])

  // Olay akisinda hangi hattin olayi oldugunu gostermek icin ad esleme.
  const labels = Object.fromEntries(
    (accounts ?? []).map((account) => [account.id, account.label]),
  )

  const hourlyCounts = bucketLast24Hours((outLog ?? []).map((row) => row.created_at))

  return (
    <>
      <PageHeader
        title="Genel durum"
        description="Hatlarin, kapasitenin ve calisan kampanyalarin anlik hali. Servis arka planda calisiyor; bu sayfa yalnizca izleme icin."
        action={<AccentLink href="/hizli-gonderim">Hizli gonderim</AccentLink>}
      />

      <div className="flex flex-col gap-4">
        <Card>
          <div className="px-4 py-3.5">
            <HourlyBars counts={hourlyCounts} />
          </div>
        </Card>

        <StatusBoard
          initialLines={(accounts ?? []) as LineView[]}
          initialCampaigns={(campaigns ?? []) as CampaignView[]}
          userId={user.id}
        />

        <EventFeed
          initial={(events ?? []) as EventView[]}
          labels={labels}
          userId={user.id}
        />
      </div>
    </>
  )
}
