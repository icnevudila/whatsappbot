import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AccentLink, Card, HourlyBars, Notice, PageHeader } from '@/components/ui'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { EventFeed, type EventView } from './event-feed'
import { StatusBoard, type CampaignView, type LineView } from './status-board'

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
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/giris')

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: accounts },
    { data: campaigns },
    { data: events },
    { data: outLog },
    { count: pendingJobs },
    { data: oldestPending },
    { count: inboundToday },
  ] = await Promise.all([
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
      supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('jobs')
        .select('created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('message_log')
        .select('id', { count: 'exact', head: true })
        .eq('direction', 'in')
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    ])

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
        description="Hatlar, kapasite ve çalışan kampanyalar. Gönderim arka planda sürer; bu sayfa izleme içindir. Özet kartlarındaki değerler anlık güncellenir."
        action={
          <div className="flex flex-wrap gap-2">
            <AccentLink href="/gelenler">Gelenler</AccentLink>
            <AccentLink href="/hizli-gonderim">Hızlı gönderim</AccentLink>
          </div>
        }
      />

      <div className="flex flex-col gap-4">
        {queueStalled ? (
          <Notice tone="danger">
            Kuyrukta {pendingJobs} iş bekliyor ve ilerleme yok. WhatsApp bağlantı
            servisi kapalı veya yanıt vermiyor olabilir — gönderim ve eşleştirme
            kodu üretilmez. Hesaplar sayfasından hattı yeniden bağlayın; sorun
            sürerse destek ile iletişime geçin.
          </Notice>
        ) : null}

        {connectedCount === 0 && (accounts?.length ?? 0) > 0 ? (
          <Notice tone="warn">
            Bağlı hat yok. Kampanya ve hızlı gönderim çalışmaz.{' '}
            <a href="/hesaplar" className="font-medium underline underline-offset-2">
              Hesaplar
            </a>{' '}
            üzerinden QR veya telefon koduyla yeniden bağlayın.
          </Notice>
        ) : null}

        {(inboundToday ?? 0) > 0 ? (
          <Notice tone="accent">
            Bugün {inboundToday} gelen yanıt var.{' '}
            <a href="/gelenler" className="font-medium underline underline-offset-2">
              Gelenler
            </a>{' '}
            sayfasından sohbetleri ve kara listeye alma işlemini yönetin.
          </Notice>
        ) : null}

        <Card>
          <div className="space-y-3 px-4 py-3.5">
            <HourlyBars counts={hourlyCounts} />
            <p className="border-t border-hairline pt-3 text-[11.5px] leading-relaxed text-ink-faint">
              <span className="font-medium text-ink-muted">Bugünkü gönderim</span> =
              bağlı hatların bugün attığı / günlük tavanı.{' '}
              <span className="font-medium text-ink-muted">Dikkat gereken</span> =
              kilitli hat, yeni sohbet kilidi veya kota %80 üzeri.{' '}
              <span className="font-medium text-ink-muted">Yeni sohbet kotası</span> =
              WhatsApp’ın tanıdığı “ilk kez yazılan numara” bütçesi; dolunca yeni
              numaralara yazılamaz.
            </p>
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
