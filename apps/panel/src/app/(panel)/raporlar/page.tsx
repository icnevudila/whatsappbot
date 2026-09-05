import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AccentLink,
  Card,
  CardHeader,
  EmptyState,
  FilterChip,
  PageHeader,
  QuietLink,
  Stat,
  StatusPill,
  Toolbar,
} from '@/components/ui'
import { requireActiveOrg } from '@/lib/org'
import {
  DailyVolumeChart,
  DonutChart,
  FunnelSteps,
  QuotaMeter,
  RankBars,
} from '@/components/charts'
import { loadReportBundle, parseRange, RANGE_OPTIONS } from './data'

export const metadata: Metadata = { title: 'Raporlar' }
export const dynamic = 'force-dynamic'

function formatRate(rate: number | null): string {
  if (rate == null) return '—'
  return `%${rate}`
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ gun?: string | string[] }>
}) {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch {
    redirect('/giris')
  }

  const params = await searchParams
  const range = parseRange(params.gun)
  const report = await loadReportBundle(supabase, org.id, range, org.monthly_message_quota)

  const rangeLabel = RANGE_OPTIONS.find((o) => o.key === range)?.label ?? '30 gün'

  return (
    <>
      <PageHeader
        title="Raporlar"
        description={`${rangeLabel} gönderim, teslim, hat ve defter özeti. CSV ile kampanya dışa aktarımı.`}
        action={
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/raporlar/csv"
              className="inline-flex h-8 items-center justify-center rounded-[var(--radius-sm)] bg-accent px-3 text-[13px] font-medium text-accent-ink shadow-sm hover:bg-accent-dim"
            >
              CSV indir
            </a>
            <QuietLink href="/kampanyalar">Kampanyalar</QuietLink>
          </div>
        }
      />

      <Toolbar className="mb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {RANGE_OPTIONS.map((opt) => (
            <FilterChip key={opt.key} href={`/raporlar?gun=${opt.key}`} active={range === opt.key}>
              {opt.label}
            </FilterChip>
          ))}
        </div>
      </Toolbar>

      {report.sampled ? (
        <p className="mb-3 text-[11.5px] text-ink-faint">
          Günlük grafik ve hata dağılımı son 8.000 kayıt üzerinden örneklenir; üstteki KPI’lar tam
          sayıdır.
        </p>
      ) : null}

      <div className="mb-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <div className="p-3.5">
            <Stat
              label="Giden"
              value={report.kpis.out}
              tone="accent"
              detail={`${rangeLabel} · tüm durumlar`}
            />
          </div>
        </Card>
        <Card>
          <div className="p-3.5">
            <Stat
              label="Teslim oranı"
              value={formatRate(report.kpis.deliveryRate)}
              tone="muted"
              detail={`${report.kpis.delivered} teslim`}
            />
          </div>
        </Card>
        <Card>
          <div className="p-3.5">
            <Stat
              label="Okunma oranı"
              value={formatRate(report.kpis.readRate)}
              tone="muted"
              detail={`${report.kpis.read} okundu`}
            />
          </div>
        </Card>
        <Card>
          <div className="p-3.5">
            <Stat
              label="Başarısız"
              value={report.kpis.failed}
              tone={report.kpis.failed > 0 ? 'danger' : 'muted'}
              detail={formatRate(report.kpis.failRate)}
            />
          </div>
        </Card>
        <Card>
          <div className="p-3.5">
            <Stat
              label="Gelen"
              value={report.kpis.inbound}
              tone="muted"
              detail="Yanıt / inbox"
            />
          </div>
        </Card>
      </div>

      <div className="mb-3 grid gap-2.5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Günlük hacim" subtitle="Giden + gelen; kırmızı fail katmanı" />
          <div className="px-3.5 pb-3.5">
            <DailyVolumeChart days={report.daily} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Teslim hunisi" subtitle="Giden → teslim → okundu" />
          <div className="px-3.5 pb-3.5">
            <FunnelSteps steps={report.funnel} />
          </div>
        </Card>
      </div>

      <div className="mb-3 grid gap-2.5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Kampanya durumları" subtitle="Son kampanyalar" />
          <div className="px-3.5 pb-3.5">
            <DonutChart
              empty="Henüz kampanya yok."
              segments={report.campaignStatus.map((s, i) => ({
                label: s.label,
                value: s.value,
                tone: (['accent', 'ok', 'muted', 'warn', 'danger', 'soft'] as const)[i % 6],
              }))}
              center={
                <>
                  <p className="tabular text-[18px] font-extrabold leading-none text-ink">
                    {report.campaigns.length}
                  </p>
                  <p className="mt-1 text-[10.5px] text-ink-faint">kampanya</p>
                </>
              }
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Defter sağlığı" subtitle="WhatsApp kayıt durumu" />
          <div className="px-3.5 pb-3.5">
            <DonutChart
              empty="Defterde numara yok."
              segments={[
                { label: 'Var (✓)', value: report.contacts.valid, tone: 'ok' },
                { label: 'Yok (×)', value: report.contacts.invalid, tone: 'danger' },
                { label: 'Bekliyor', value: report.contacts.unknown, tone: 'muted' },
              ]}
              center={
                <>
                  <p className="tabular text-[18px] font-extrabold leading-none text-ink">
                    {report.contacts.total}
                  </p>
                  <p className="mt-1 text-[10.5px] text-ink-faint">numara</p>
                </>
              }
            />
            <div className="mt-3">
              <QuietLink href="/kisiler">Kişilere git</QuietLink>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Kota & hatlar" subtitle="Bu ay / hat durumu" />
          <div className="space-y-4 px-3.5 pb-3.5">
            <QuotaMeter
              used={report.quota.monthSent}
              limit={report.quota.monthlyLimit}
              label="Aylık gönderim kotası"
            />
            <DonutChart
              empty="Hat eklenmemiş."
              segments={report.accountStatus.map((s) => ({
                label: s.label,
                value: s.value,
                tone:
                  s.key === 'connected'
                    ? 'ok'
                    : s.key === 'banned'
                      ? 'danger'
                      : s.key === 'connecting' || s.key === 'qr'
                        ? 'warn'
                        : 'muted',
              }))}
              center={
                <>
                  <p className="tabular text-[18px] font-extrabold leading-none text-ink">
                    {report.accounts.length}
                  </p>
                  <p className="mt-1 text-[10.5px] text-ink-faint">hat</p>
                </>
              }
            />
          </div>
        </Card>
      </div>

      <div className="mb-3 grid gap-2.5 lg:grid-cols-2">
        <Card>
          <CardHeader title="En çok gönderen kampanyalar" subtitle="Gönderim sayısına göre" />
          <div className="px-3.5 pb-3.5">
            <RankBars
              empty="Kampanya gönderimi yok."
              items={report.topCampaigns.map((c) => ({
                label: c.name,
                value: c.sent,
                detail:
                  c.successRate != null
                    ? `· %${c.successRate} başarı · ${c.failed} fail`
                    : `· ${c.failed} fail`,
                href: `/kampanyalar/${c.id}`,
              }))}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Hat başına giden" subtitle={`${rangeLabel} · örneklem`} />
          <div className="px-3.5 pb-3.5">
            <RankBars
              empty="Bu dönemde hat üzerinden giden yok."
              items={[...report.accounts]
                .sort((a, b) => b.periodOut - a.periodOut)
                .map((a) => ({
                  label: a.label,
                  value: a.periodOut,
                  detail: `bugün ${a.sentToday}/${a.dailyLimit}`,
                  href: '/hesaplar',
                }))}
            />
          </div>
        </Card>
      </div>

      <div className="mb-3 grid gap-2.5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Başarısız nedenler" subtitle="Örneklemdeki fail mesajları" />
          <div className="px-3.5 pb-3.5">
            <RankBars
              empty="Bu dönemde başarısız gönderim yok — iyi."
              items={report.errorTop.map((e) => ({
                label: e.label,
                value: e.value,
              }))}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="En büyük listeler" subtitle="Defter listeleri" />
          <div className="px-3.5 pb-3.5">
            <RankBars
              empty="Liste yok. Kişiler’den ekleyin."
              valueSuffix=" no"
              items={report.topLists.map((l) => ({
                label: l.name,
                value: l.count,
                href: `/kisiler/${l.id}`,
              }))}
            />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Kampanya tablosu" subtitle="En fazla 40 kayıt · CSV ile tam dışa aktarım" />
        {report.campaigns.length === 0 ? (
          <EmptyState
            title="Henüz kampanya yok"
            description="İlk toplu gönderimi oluşturunca buraya düşer. Hızlı gönderim de kampanya olarak görünür."
            action={<AccentLink href="/kampanyalar">Kampanyalara git</AccentLink>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-hairline text-[11.5px] text-ink-muted">
                  <th className="px-3.5 py-2 font-medium">Ad</th>
                  <th className="px-3.5 py-2 font-medium">Durum</th>
                  <th className="px-3.5 py-2 font-medium">Hedef</th>
                  <th className="px-3.5 py-2 font-medium">Gönderilen</th>
                  <th className="px-3.5 py-2 font-medium">Fail / Skip</th>
                  <th className="px-3.5 py-2 font-medium">Başarı</th>
                </tr>
              </thead>
              <tbody>
                {report.campaigns.map((c) => {
                  const denom = c.sent_count + c.failed_count
                  const rate =
                    denom > 0
                      ? Math.round((c.sent_count / denom) * 1000) / 10
                      : c.total_targets > 0
                        ? Math.round((c.sent_count / c.total_targets) * 1000) / 10
                        : null
                  return (
                    <tr key={c.id} className="border-b border-hairline last:border-0">
                      <td className="px-3.5 py-2">
                        <Link
                          href={`/kampanyalar/${c.id}`}
                          className="font-medium text-ink underline-offset-2 hover:text-accent hover:underline"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-3.5 py-2">
                        <StatusPill status={c.status} />
                      </td>
                      <td className="px-3.5 py-2 tabular">{c.total_targets}</td>
                      <td className="px-3.5 py-2 tabular">{c.sent_count}</td>
                      <td className="px-3.5 py-2 tabular text-ink-muted">
                        {c.failed_count}/{c.skipped_count}
                      </td>
                      <td className="px-3.5 py-2 tabular text-ink-muted">
                        {rate == null ? '—' : `%${rate}`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
