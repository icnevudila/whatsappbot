import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AccentLink,
  Card,
  CardHeader,
  PageHeader,
  QuietLink,
  Stat,
} from '@/components/ui'
import {
  DailyVolumeChart,
  DonutChart,
  FunnelSteps,
  HourlyDualChart,
  QuotaMeter,
  RankBars,
} from '@/components/charts'
import { createT } from '@/lib/i18n'
import { getDictionary } from '@/lib/i18n/server'
import { requireActiveOrg } from '@/lib/org'
import { getSetupProgress } from '@/lib/setup-progress'
import { SetupBanner } from '../setup-banner'

export const metadata: Metadata = { title: 'Özet' }
export const dynamic = 'force-dynamic'

function dayKey(iso: string): string {
  const d = new Date(iso)
  return localDayKey(d)
}

function localDayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function bucketTodayHours(timestamps: string[]): number[] {
  const counts = Array.from({ length: 24 }, () => 0)
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  for (const stamp of timestamps) {
    const d = new Date(stamp)
    if (d < start) continue
    counts[d.getHours()] += 1
  }
  return counts
}

export default async function PanelHomePage() {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch {
    redirect('/giris')
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const sinceToday = todayStart.toISOString()

  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 6)
  const sinceWeek = weekStart.toISOString()

  const monthStart = new Date(todayStart)
  monthStart.setDate(1)

  const [setup, dict, rest] = await Promise.all([
    getSetupProgress(org.id),
    getDictionary(),
    Promise.all([
      supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
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
        .eq('direction', 'in')
        .gte('created_at', sinceToday),
      supabase.from('blacklist').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
      supabase
        .from('message_log')
        .select('created_at, direction, status')
        .eq('org_id', org.id)
        .gte('created_at', sinceToday)
        .order('created_at', { ascending: false })
        .limit(4_000),
      supabase
        .from('message_log')
        .select('created_at, direction, status')
        .eq('org_id', org.id)
        .gte('created_at', sinceWeek)
        .order('created_at', { ascending: false })
        .limit(6_000),
      supabase
        .from('accounts')
        .select('id, label, status, sent_today, daily_send_limit')
        .eq('org_id', org.id)
        .order('created_at'),
      supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('wa_status', 'invalid'),
      supabase
        .from('message_log')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('direction', 'out')
        .eq('status', 'failed')
        .gte('created_at', sinceToday),
      supabase
        .from('message_log')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('direction', 'out')
        .in('status', ['delivered', 'read'])
        .gte('created_at', sinceToday),
      supabase
        .from('message_log')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('direction', 'out')
        .eq('status', 'read')
        .gte('created_at', sinceToday),
      supabase
        .from('message_log')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('direction', 'out')
        .in('status', ['sent', 'delivered', 'read'])
        .gte('created_at', monthStart.toISOString()),
      supabase
        .from('campaigns')
        .select('id, name, sent_count, failed_count, status')
        .eq('org_id', org.id)
        .order('updated_at', { ascending: false })
        .limit(5),
    ]),
  ])

  const [
    { count: accountsTotal },
    { count: lists },
    { count: campaignsRunning },
    { count: outToday },
    { count: inToday },
    { count: blacklist },
    { data: todayLogs },
    { data: weekLogs },
    { data: accounts },
    { count: invalidWa },
    { count: failedToday },
    { count: deliveredToday },
    { count: readToday },
    { count: monthSent },
    { data: recentCampaigns },
  ] = rest

  const t = createT(dict.messages)
  const { connectedCount, contactCount, validWa } = setup.counts
  const ready = setup.allDone
  const unknownWa = Math.max(0, contactCount - validWa - (invalidWa ?? 0))

  const todayOutStamps = (todayLogs ?? [])
    .filter((r) => r.direction === 'out')
    .map((r) => r.created_at)
  const todayInStamps = (todayLogs ?? [])
    .filter((r) => r.direction === 'in')
    .map((r) => r.created_at)

  const hourlyOut = bucketTodayHours(todayOutStamps)
  const hourlyIn = bucketTodayHours(todayInStamps)

  const weekKeys: string[] = []
  const weekCursor = new Date(weekStart)
  for (let i = 0; i < 7; i += 1) {
    weekKeys.push(localDayKey(weekCursor))
    weekCursor.setDate(weekCursor.getDate() + 1)
  }
  const weekMap = new Map(weekKeys.map((k) => [k, { out: 0, inbound: 0, failed: 0 }]))
  for (const row of weekLogs ?? []) {
    const key = dayKey(row.created_at)
    const bucket = weekMap.get(key)
    if (!bucket) continue
    if (row.direction === 'in') {
      bucket.inbound += 1
    } else {
      bucket.out += 1
      if (row.status === 'failed') bucket.failed += 1
    }
  }
  const weekDays = weekKeys.map((key) => {
    const b = weekMap.get(key) ?? { out: 0, inbound: 0, failed: 0 }
    const [, m, d] = key.split('-')
    return { day: key, label: `${d}.${m}`, ...b }
  })

  const accountStatusMap = new Map<string, number>()
  for (const a of accounts ?? []) {
    accountStatusMap.set(a.status, (accountStatusMap.get(a.status) ?? 0) + 1)
  }
  const accountStatusLabel: Record<string, string> = {
    connected: t('ozet.statusConnected'),
    connecting: t('ozet.statusConnecting'),
    qr: t('ozet.statusQr'),
    disconnected: t('ozet.statusDisconnected'),
    logged_out: t('ozet.statusLoggedOut'),
    banned: t('ozet.statusBanned'),
  }

  const accountBars = [...(accounts ?? [])]
    .sort((a, b) => b.sent_today - a.sent_today)
    .map((a) => ({
      label: a.label,
      value: a.sent_today,
      detail: `/ ${a.daily_send_limit}`,
      href: '/hesaplar',
    }))

  const shortcuts = [
    {
      href: '/hizli-gonderim',
      title: t('ozet.scQuick'),
      body: t('ozet.scQuickBody'),
    },
    {
      href: '/kampanyalar',
      title: t('ozet.scCamp'),
      body: t('ozet.scCampBody'),
    },
    {
      href: '/gelenler',
      title: t('ozet.scIn'),
      body: t('ozet.scInBody'),
    },
    {
      href: '/raporlar',
      title: t('ozet.scReports'),
      body: t('ozet.scReportsBody'),
    },
  ]

  return (
    <>
      <PageHeader
        title={t('pages.ozetTitle')}
        description={t('pages.ozetDesc', { org: org.name })}
        action={
          ready ? (
            <AccentLink href="/hizli-gonderim">{t('pages.sendMessage')}</AccentLink>
          ) : (
            <AccentLink href="/kurulum">{t('pages.finishSetup')}</AccentLink>
          )
        }
      />

      <SetupBanner progress={setup} />

      <div className="mb-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <Card lift>
          <div className="p-3.5">
            <Stat
              label={t('ozet.connectedLine')}
              value={connectedCount}
              tone={connectedCount > 0 ? 'accent' : 'muted'}
              meter={{
                value: connectedCount,
                max: Math.max(1, accountsTotal ?? 0),
                tone: connectedCount > 0 ? 'accent' : 'warn',
              }}
              detail={t('ozet.lineCount', {
                connected: connectedCount,
                total: accountsTotal ?? 0,
              })}
            />
            <Link
              href="/hesaplar"
              className="mt-2 inline-block text-[12px] font-medium text-accent underline-offset-2 hover:underline"
            >
              {t('ozet.accountsLink')}
            </Link>
          </div>
        </Card>
        <Card lift>
          <div className="p-3.5">
            <Stat
              label={t('ozet.contacts')}
              value={contactCount}
              tone="muted"
              meter={{
                value: validWa,
                max: Math.max(1, contactCount),
                tone: 'accent',
              }}
              detail={t('ozet.waRegistered', { valid: validWa, lists: lists ?? 0 })}
            />
            <Link
              href="/kisiler"
              className="mt-2 inline-block text-[12px] font-medium text-accent underline-offset-2 hover:underline"
            >
              {t('ozet.contactsLink')}
            </Link>
          </div>
        </Card>
        <Card lift>
          <div className="p-3.5">
            <Stat
              label={t('ozet.outToday')}
              value={outToday ?? 0}
              tone="accent"
              detail={
                (failedToday ?? 0) > 0
                  ? t('ozet.failCount', { count: failedToday ?? 0 })
                  : t('ozet.failNone')
              }
            />
            <Link
              href="/gidenler"
              className="mt-2 inline-block text-[12px] font-medium text-accent underline-offset-2 hover:underline"
            >
              {t('ozet.outLink')}
            </Link>
          </div>
        </Card>
        <Card lift>
          <div className="p-3.5">
            <Stat
              label={t('ozet.inToday')}
              value={inToday ?? 0}
              tone="muted"
              detail={t('ozet.inbox')}
            />
            <Link
              href="/gelenler"
              className="mt-2 inline-block text-[12px] font-medium text-accent underline-offset-2 hover:underline"
            >
              {t('ozet.inLink')}
            </Link>
          </div>
        </Card>
      </div>

      <div className="mb-3 grid gap-2.5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title={t('ozet.weekTitle')} subtitle={t('ozet.weekSub')} />
          <div className="px-3.5 pb-3.5">
            <DailyVolumeChart days={weekDays} dense />
            <div className="mt-3">
              <QuietLink href="/raporlar?gun=7">{t('ozet.openReports')}</QuietLink>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title={t('ozet.funnelTitle')} subtitle={t('ozet.funnelSub')} />
          <div className="px-3.5 pb-3.5">
            <FunnelSteps
              steps={[
                { label: t('reports.outbound'), value: outToday ?? 0, tone: 'accent' },
                { label: t('ozet.delivered'), value: deliveredToday ?? 0, tone: 'ok' },
                { label: t('ozet.read'), value: readToday ?? 0, tone: 'muted' },
                { label: t('reports.failed'), value: failedToday ?? 0, tone: 'danger' },
              ]}
            />
          </div>
        </Card>
      </div>

      <div className="mb-3 grid gap-2.5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title={t('ozet.hourlyTitle')} subtitle={t('ozet.hourlySub')} />
          <div className="px-3.5 pb-3.5">
            <HourlyDualChart outbound={hourlyOut} inbound={hourlyIn} />
          </div>
        </Card>

        <Card>
          <CardHeader title={t('ozet.bookTitle')} subtitle={t('ozet.bookSub')} />
          <div className="px-3.5 pb-3.5">
            <DonutChart
              empty={t('ozet.bookEmpty')}
              segments={[
                { label: t('ozet.waYes'), value: validWa, tone: 'ok' },
                { label: t('ozet.waNo'), value: invalidWa ?? 0, tone: 'danger' },
                { label: t('ozet.waPending'), value: unknownWa, tone: 'muted' },
              ]}
              center={
                <>
                  <p className="tabular text-[18px] font-extrabold leading-none text-ink">
                    {contactCount}
                  </p>
                  <p className="mt-1 text-[10.5px] text-ink-faint">{t('ozet.numbers')}</p>
                </>
              }
            />
          </div>
        </Card>
      </div>

      <div className="mb-3 grid gap-2.5 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('ozet.linesTitle')} subtitle={t('ozet.linesSub')} />
          <div className="space-y-4 px-3.5 pb-3.5">
            <QuotaMeter
              used={monthSent ?? 0}
              limit={org.monthly_message_quota}
              label={t('ozet.monthlyQuota')}
            />
            <DonutChart
              empty={t('ozet.linesEmpty')}
              segments={[...(accountStatusMap.entries())].map(([key, value]) => ({
                label: accountStatusLabel[key] ?? key,
                value,
                tone:
                  key === 'connected'
                    ? ('ok' as const)
                    : key === 'banned'
                      ? ('danger' as const)
                      : key === 'connecting' || key === 'qr'
                        ? ('warn' as const)
                        : ('muted' as const),
              }))}
              center={
                <>
                  <p className="tabular text-[18px] font-extrabold leading-none text-ink">
                    {connectedCount}
                  </p>
                  <p className="mt-1 text-[10.5px] text-ink-faint">{t('ozet.connectedShort')}</p>
                </>
              }
            />
          </div>
        </Card>

        <Card>
          <CardHeader title={t('ozet.lineQuotaTitle')} subtitle={t('ozet.lineQuotaSub')} />
          <div className="px-3.5 pb-3.5">
            <RankBars empty={t('ozet.noLines')} items={accountBars} />
          </div>
        </Card>
      </div>

      <div className="mb-3 grid gap-2.5 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('ozet.statusTitle')} subtitle={t('ozet.statusSub')} />
          <div className="space-y-3 p-3.5 text-[12.5px] text-ink-muted">
            <div className="flex items-center justify-between gap-2">
              <span>{t('ozet.runningCampaigns')}</span>
              <span className="tabular font-semibold text-ink">{campaignsRunning ?? 0}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>{t('ozet.blacklist')}</span>
              <span className="tabular font-semibold text-ink">{blacklist ?? 0}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>{t('ozet.lineTotal')}</span>
              <span className="tabular font-semibold text-ink">
                {connectedCount} / {accountsTotal ?? 0}
              </span>
            </div>
            {(recentCampaigns ?? []).length > 0 ? (
              <ul className="space-y-1.5 border-t border-hairline pt-2.5">
                {(recentCampaigns ?? []).slice(0, 3).map((c) => (
                  <li key={c.id} className="flex justify-between gap-2 text-[12px]">
                    <Link
                      href={`/kampanyalar/${c.id}`}
                      className="min-w-0 truncate text-ink underline-offset-2 hover:text-accent hover:underline"
                    >
                      {c.name}
                    </Link>
                    <span className="shrink-0 tabular text-ink-faint">
                      {c.sent_count}·{c.failed_count}f
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-1">
              <AccentLink href="/durum">{t('ozet.statusPanel')}</AccentLink>
              <QuietLink href="/kampanyalar">{t('nav.kampanyalar')}</QuietLink>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title={t('ozet.shortcutsTitle')} subtitle={t('ozet.shortcutsSub')} />
          <ul className="divide-y divide-hairline">
            {shortcuts.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block px-3.5 py-2.5 transition-colors hover:bg-surface-raised"
                >
                  <p className="text-[13px] font-semibold text-ink">{item.title}</p>
                  <p className="mt-0.5 text-[12px] text-ink-muted">{item.body}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
