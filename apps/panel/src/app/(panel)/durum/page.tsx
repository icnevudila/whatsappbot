import Link from 'next/link'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AccentLink, Card, HourlyBars, Notice, PageHeader, QuietLink } from '@/components/ui'
import { requireActiveOrg } from '@/lib/org'
import { EventFeed, type EventView } from './event-feed'
import { StatusBoard, type CampaignView, type LineView } from './status-board'
import { CancelPendingButton } from './cancel-pending-button'
import { WorkerFleetCard } from './worker-fleet-card'

export const metadata: Metadata = { title: 'Durum' }

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
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch {
    redirect('/giris')
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: accounts },
    { data: campaigns },
    { data: events },
    { data: outLog },
    { count: pendingJobs },
    { data: oldestPending },
    { count: inboundToday },
    { data: fleetRaw },
  ] = await Promise.all([
      supabase
        .from('accounts')
        .select(
          'id, label, phone_e164, status, enabled, is_locked, lock_reason, daily_send_limit, sent_today, sent_today_on, warmup_started_at, new_chat_quota_total, new_chat_quota_used, reachout_locked_until',
        )
        .eq('org_id', org.id)
        .order('created_at'),
      supabase
        .from('campaigns')
        .select('id, name, status, total_targets, sent_count, failed_count, skipped_count')
        .eq('org_id', org.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('account_events')
        .select('id, account_id, level, event, detail, created_at')
        .eq('org_id', org.id)
        .order('id', { ascending: false })
        .limit(50),
      supabase
        .from('message_log')
        .select('created_at')
        .eq('org_id', org.id)
        .eq('direction', 'out')
        .gte('created_at', since),
      supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('status', 'pending'),
      supabase
        .from('jobs')
        .select('created_at')
        .eq('org_id', org.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('message_log')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('direction', 'in')
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      supabase.rpc('worker_fleet_status' as never),
    ])

  const fleet = (fleetRaw ?? { workers: [], leases: [] }) as {
    workers: {
      worker_id: string
      max_sessions: number
      tracked: number
      live: number
      db_pool_max: number
      seen_at: string
      alive: boolean
      meta?: { uptimeSeconds?: number; stale?: number } | null
    }[]
    leases: {
      account_id: string
      label: string | null
      phone_e164: string | null
      status: string
      holder_id: string | null
      lease_active: boolean
    }[]
  }
  const pendingAgeMs = oldestPending?.created_at
    ? Date.now() - new Date(oldestPending.created_at).getTime()
    : 0
  // 30 sn'den eski bekleyen is = servis muhtemelen kapali veya takili.
  const queueStalled = (pendingJobs ?? 0) > 0 && pendingAgeMs > 30_000
  const connectedCount = (accounts ?? []).filter((a) => a.status === 'connected').length

  // Olay akisinda hangi hattin olayi oldugunu gostermek icin ad esleme.
  const labels = Object.fromEntries(
    (accounts ?? []).map((account) => [account.id, account.label]),
  )

  const hourlyCounts = bucketLast24Hours((outLog ?? []).map((row) => row.created_at))

  return (
    <>
      <PageHeader
        title="Durum"
        description="Hatlar, günlük kapasite ve aktif kampanyalar. Gönderim arka planda sürer; bu sayfa izleme içindir."
        action={
          <div className="flex flex-wrap gap-2">
            <CancelPendingButton count={pendingJobs ?? 0} />
            <AccentLink href="/hesaplar">Hesaplar</AccentLink>
            <QuietLink href="/gelenler">Gelenler</QuietLink>
            <QuietLink href="/hizli-gonderim">Hızlı gönderim</QuietLink>
          </div>
        }
      />

      <div className="flex flex-col gap-4">
        {queueStalled ? (
          <Notice tone="danger">
            Kuyrukta {pendingJobs} iş bekliyor ve ilerleme yok. WhatsApp bağlantı
            servisi kapalı veya yanıt vermiyor olabilir — gönderim ve eşleştirme
            kodu üretilmez.{' '}
            <Link href="/hesaplar" className="font-medium underline underline-offset-2">
              Hesaplar
            </Link>{' '}
            üzerinden hattı yeniden bağlayın; sorun sürerse destek ile iletişime
            geçin.
          </Notice>
        ) : null}

        {connectedCount === 0 && (accounts?.length ?? 0) > 0 ? (
          <Notice tone="warn">
            Bağlı hat yok. Kampanya ve hızlı gönderim çalışmaz.{' '}
            <Link href="/hesaplar" className="font-medium underline underline-offset-2">
              Hesaplar
            </Link>{' '}
            sayfasından QR veya telefon koduyla yeniden bağlayın.
          </Notice>
        ) : null}

        {connectedCount === 0 && (accounts?.length ?? 0) === 0 ? (
          <Notice tone="warn">
            Henüz hat eklenmemiş. Gönderim için önce bir WhatsApp numarası
            bağlamanız gerekir.{' '}
            <Link href="/hesaplar" className="font-medium underline underline-offset-2">
              Hesaplara git
            </Link>
          </Notice>
        ) : null}

        {(inboundToday ?? 0) > 0 ? (
          <Notice tone="accent">
            Bugün {inboundToday} gelen yanıt var.{' '}
            <Link href="/gelenler" className="font-medium underline underline-offset-2">
              Gelenler
            </Link>{' '}
            sayfasından sohbetleri inceleyin; istenmeyen numaraları kara listeye
            alabilirsiniz.
          </Notice>
        ) : null}

        <WorkerFleetCard workers={fleet.workers ?? []} leases={fleet.leases ?? []} />

        <Card>
          <div className="space-y-3 px-4 py-3.5">
            <HourlyBars counts={hourlyCounts} />
            <p className="border-t border-hairline pt-3 text-[11.5px] leading-relaxed text-ink-faint">
              <span className="font-medium text-ink-muted">Bugünkü gönderim</span>
              {' '}
              bağlı hatların bugün attığı mesaj / günlük tavandır.{' '}
              <span className="font-medium text-ink-muted">Dikkat gereken</span>
              {' '}
              kilitli hat, yeni sohbet kilidi veya kota %80 üzeri anlamına gelir.{' '}
              <span className="font-medium text-ink-muted">Yeni sohbet kotası</span>
              {' '}
              WhatsApp’ın “ilk kez yazılan numara” bütçesidir; dolunca yeni
              numaralara yazılamaz.
            </p>
          </div>
        </Card>

        <StatusBoard
          initialLines={(accounts ?? []) as LineView[]}
          initialCampaigns={(campaigns ?? []) as CampaignView[]}
          orgId={org.id}
        />

        <EventFeed
          initial={(events ?? []) as EventView[]}
          labels={labels}
          orgId={org.id}
        />
      </div>
    </>
  )
}
