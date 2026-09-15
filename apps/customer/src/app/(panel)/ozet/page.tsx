import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Card,
  CardHeader,
  Meter,
  QuietLink,
  StatusPill,
} from '@/components/ui'
import { requireActiveOrg } from '@/lib/org'
import { getSetupProgress } from '@/lib/setup-progress'
import { SetupGuideCard } from '../setup-banner'
import { ScheduledStatusPill } from '@/components/schedule-status'
import { formatRemainingTr, formatScheduleAt } from '@/lib/schedule-remaining'
import { HomeQuickActions } from './home-quick-actions'
import { HomeVolumePanel } from './home-volume-panel'

export const metadata: Metadata = { title: 'Ana sayfa' }
export const dynamic = 'force-dynamic'

const ISTANBUL = 'Europe/Istanbul'

function ymdIstanbul(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ISTANBUL,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function startOfIstanbulDay(ymd: string): Date {
  return new Date(`${ymd}T00:00:00+03:00`)
}

function shiftYmd(ymd: string, days: number): string {
  return ymdIstanbul(new Date(startOfIstanbulDay(ymd).getTime() + days * 86_400_000))
}

function dayLabel(ymd: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: ISTANBUL,
    weekday: 'short',
    day: 'numeric',
  }).format(startOfIstanbulDay(ymd))
}

export default async function CustomerHomePage() {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') {
      redirect('/erisim-yok')
    }
    redirect('/giris')
  }

  const today = ymdIstanbul(new Date())
  const since7 = startOfIstanbulDay(shiftYmd(today, -6)).toISOString()
  const sinceToday = startOfIstanbulDay(today).toISOString()

  const [setup, rest] = await Promise.all([
    getSetupProgress(org.id),
    Promise.all([
      supabase
        .from('contact_lists')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .neq('source', 'quick_send'),
      supabase
        .from('campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('status', 'running'),
      supabase
        .from('message_log')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('direction', 'out')
        .gte('created_at', sinceToday),
      supabase
        .from('message_log')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('direction', 'out')
        .gte('created_at', since7),
      supabase
        .from('message_log')
        .select('created_at, direction, status')
        .eq('org_id', org.id)
        .in('direction', ['in', 'out'])
        .gte('created_at', since7)
        .limit(8000),
      supabase
        .from('campaigns')
        .select('id, name, sent_count, failed_count, skipped_count, status, total_targets, scheduled_at')
        .eq('org_id', org.id)
        .order('updated_at', { ascending: false })
        .limit(5),
    ]),
  ])

  const [
    { count: lists },
    { count: campaignsRunning },
    { count: outToday },
    { count: out7d },
    { data: weekRows },
    { data: recentCampaigns },
  ] = rest

  const { connectedCount, contactCount } = setup.counts
  const hasLine = connectedCount > 0
  const hasPeople = (lists ?? 0) > 0 || contactCount > 0

  const dayKeys = Array.from({ length: 7 }, (_, i) => shiftYmd(today, i - 6))
  const buckets = new Map(dayKeys.map((day) => [day, { out: 0, inbound: 0, failed: 0 }]))
  const todayHours = Array.from({ length: 24 }, () => 0)
  const yesterdayHours = Array.from({ length: 24 }, () => 0)
  const yesterday = shiftYmd(today, -1)
  for (const row of weekRows ?? []) {
    const day = ymdIstanbul(new Date(row.created_at))
    const bucket = buckets.get(day)
    if (!bucket) continue
    if (row.direction === 'out') {
      bucket.out += 1
      if (row.status === 'failed' || row.status === 'skipped') bucket.failed += 1
      if (day === today || day === yesterday) {
        const hour = Number(
          new Intl.DateTimeFormat('en-GB', {
            timeZone: ISTANBUL,
            hour: '2-digit',
            hour12: false,
          }).format(new Date(row.created_at)),
        )
        if (Number.isFinite(hour) && hour >= 0 && hour < 24) {
          if (day === today) todayHours[hour] += 1
          else yesterdayHours[hour] += 1
        }
      }
    } else if (row.direction === 'in') {
      bucket.inbound += 1
    }
  }
  const weekDays = dayKeys.map((day) => ({
    day,
    label: dayLabel(day),
    out: buckets.get(day)?.out ?? 0,
    inbound: buckets.get(day)?.inbound ?? 0,
  }))

  return (
    <div className="wb-wa-page">
      <header className="wb-page-head">
        <div className="min-w-0 w-full">
          <h1 className="wb-page-title">{org.name}</h1>
          <p className="wb-page-desc">Günün özeti</p>
        </div>
      </header>

      <HomeQuickActions />

      {setup.showSetup ? (
        <div className="px-0 pt-1">
          <SetupGuideCard progress={setup} />
        </div>
      ) : null}

      <div className="wb-home-kpis">
        <Link href="/ayarlar/hatlar" className={`wb-home-kpi${hasLine ? ' is-ok' : ''}`}>
          <span className="wb-home-kpi-label">Hat</span>
          <span className="wb-home-kpi-value">{connectedCount.toLocaleString('tr-TR')}</span>
          <span className="wb-home-kpi-meta">{hasLine ? 'Bağlı' : 'QR ile bağla'}</span>
        </Link>
        <Link href="/kisiler" className="wb-home-kpi">
          <span className="wb-home-kpi-label">Kişiler</span>
          <span className="wb-home-kpi-value">{contactCount.toLocaleString('tr-TR')}</span>
          <span className="wb-home-kpi-meta">{(lists ?? 0).toLocaleString('tr-TR')} grup</span>
        </Link>
        <Link href="/mesajlar?tarih=bugun&sekme=giden" className="wb-home-kpi">
          <span className="wb-home-kpi-label">Bugün</span>
          <span className="wb-home-kpi-value">{(outToday ?? 0).toLocaleString('tr-TR')}</span>
          <span className="wb-home-kpi-meta">
            {(campaignsRunning ?? 0) > 0 ? `${campaignsRunning} aktif` : 'Giden'}
          </span>
        </Link>
        <Link href="/mesajlar?tarih=7gun&sekme=giden" className="wb-home-kpi">
          <span className="wb-home-kpi-label">7 gün</span>
          <span className="wb-home-kpi-value">{(out7d ?? 0).toLocaleString('tr-TR')}</span>
          <span className="wb-home-kpi-meta">Giden toplam</span>
        </Link>
      </div>

      <HomeVolumePanel
        weekDays={weekDays}
        todayHours={todayHours}
        yesterdayHours={yesterdayHours}
        todayKey={today}
        yesterdayKey={yesterday}
      />

      <Card>
        <CardHeader
          title="Son kampanyalar"
          subtitle={
            (campaignsRunning ?? 0) > 0
              ? `${campaignsRunning} çalışıyor`
              : 'Son gönderimleri izleyin'
          }
          action={<QuietLink href="/kampanyalar">Tümü</QuietLink>}
        />
        {(recentCampaigns ?? []).length === 0 ? (
          <div className="px-4 py-4">
            <p className="text-[14px] font-semibold text-[#111b21]">Henüz kampanya yok</p>
            <p className="mt-1 text-[13px] text-[#667781]">
              {!hasLine
                ? 'Önce bir hat bağlayın, sonra buradan gönderin.'
                : !hasPeople
                  ? 'Önce kişi grubu ekleyin, sonra buradan gönderin.'
                  : 'Yukarıdan Kampanya ile WhatsApp duyurusu gönderin.'}
            </p>
          </div>
        ) : (
          <ul className="wb-inbox-list wb-inbox-list--plain">
            {(recentCampaigns ?? []).map((c) => {
              const total = Math.max(0, c.total_targets ?? 0)
              const done = (c.sent_count ?? 0) + (c.failed_count ?? 0) + (c.skipped_count ?? 0)
              const scheduledAt = c.status === 'scheduled' ? c.scheduled_at : null
              return (
                <li key={c.id} className="wb-wa-group-item">
                  <Link href={`/kampanyalar/${c.id}`} className="wb-wa-row min-w-0 flex-1">
                    <span className="wb-wa-row-main">
                      <span className="wb-wa-row-top">
                        <span className="wb-wa-name">{c.name}</span>
                        {scheduledAt ? (
                          <ScheduledStatusPill at={scheduledAt} />
                        ) : (
                          <StatusPill status={c.status} />
                        )}
                      </span>
                      <span className="wb-wa-row-bottom">
                        <span className="wb-wa-preview">
                          {scheduledAt
                            ? `${formatScheduleAt(scheduledAt)} · ${formatRemainingTr(scheduledAt)}`
                            : `${(c.sent_count ?? 0).toLocaleString('tr-TR')}${
                                total > 0 ? ` / ${total.toLocaleString('tr-TR')}` : ''
                              }${
                                (c.failed_count ?? 0) > 0
                                  ? ` · ${c.failed_count.toLocaleString('tr-TR')} hata`
                                  : ''
                              }`}
                        </span>
                      </span>
                      {total > 0 && (c.status === 'running' || c.status === 'paused') ? (
                        <div className="mt-1.5 w-full max-w-[280px]">
                          <Meter
                            value={done}
                            max={total}
                            tone={
                              c.status === 'paused' || (c.failed_count ?? 0) > 0 ? 'warn' : 'accent'
                            }
                          />
                        </div>
                      ) : null}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
