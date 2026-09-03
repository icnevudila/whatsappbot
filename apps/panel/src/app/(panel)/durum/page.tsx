import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { EventFeed, type EventView } from './event-feed'
import { StatusBoard, type CampaignView, type LineView } from './status-board'

export const metadata: Metadata = { title: 'Genel durum' }

export default async function StatusPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/giris')

  const [{ data: accounts }, { data: campaigns }, { data: events }] = await Promise.all([
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
  ])

  // Olay akisinda hangi hattin olayi oldugunu gostermek icin ad esleme.
  const labels = Object.fromEntries(
    (accounts ?? []).map((account) => [account.id, account.label]),
  )

  return (
    <>
      <PageHeader
        title="Genel durum"
        description="Hatlarin, kapasitenin ve calisan kampanyalarin anlik hali. Servis arka planda calisiyor; bu sayfa yalnizca izleme icin."
        action={
          <Link
            href="/hizli-gonderim"
            className="inline-flex h-8 items-center rounded-md bg-accent px-3 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-dim"
          >
            Hizli gonderim
          </Link>
        }
      />

      <div className="flex flex-col gap-4">
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
