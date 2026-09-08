import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AccentLink,
  Card,
  CardHeader,
  Meter,
  PageHeader,
  QuietLink,
  StatStrip,
  StatusPill,
} from '@/components/ui'
import { requireActiveOrg } from '@/lib/org'
import { getSetupProgress } from '@/lib/setup-progress'
import { SetupGuideCard } from '../setup-banner'

export const metadata: Metadata = { title: 'Özet' }
export const dynamic = 'force-dynamic'

export default async function PanelHomePage() {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  let isPlatformAdmin = false
  try {
    ;({ org, supabase, isPlatformAdmin } = await requireActiveOrg())
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') {
      redirect('/erisim-yok')
    }
    redirect('/giris')
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const sinceToday = todayStart.toISOString()
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

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
        .eq('direction', 'in')
        .gte('created_at', sinceToday),
      supabase
        .from('campaigns')
        .select('id, name, sent_count, failed_count, skipped_count, status, total_targets')
        .eq('org_id', org.id)
        .order('updated_at', { ascending: false })
        .limit(5),
      supabase
        .from('message_log')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('direction', 'out')
        .gte('created_at', since7d),
    ]),
  ])

  const [
    { count: lists },
    { count: campaignsRunning },
    { count: outToday },
    { count: inToday },
    { data: recentCampaigns },
    { count: out7d },
  ] = rest

  const { connectedCount, contactCount } = setup.counts
  const hasLine = connectedCount > 0
  const primaryHref = !hasLine
    ? '/hesaplar'
    : (lists ?? 0) === 0 && contactCount === 0
      ? '/kisiler'
      : '/kampanyalar#yeni-kampanya'
  const primaryCta = !hasLine
    ? 'Hat bağla'
    : (lists ?? 0) === 0 && contactCount === 0
      ? 'Grup ekle'
      : 'Kampanya'

  return (
    <>
      <PageHeader
        title={org.name}
        description={`${connectedCount} hat · ${contactCount} kişi · bugün ${(outToday ?? 0) + (inToday ?? 0)} mesaj`}
        action={<AccentLink href={primaryHref}>{primaryCta}</AccentLink>}
      />

      {isPlatformAdmin ? null : <SetupGuideCard progress={setup} />}

      <StatStrip
        items={[
          {
            label: 'Hat',
            value: connectedCount,
            href: '/hesaplar',
            tone: hasLine ? 'ok' : 'default',
          },
          {
            label: 'Grup',
            value: lists ?? 0,
            href: '/kisiler',
          },
          {
            label: 'Bugün',
            value: (outToday ?? 0) + (inToday ?? 0),
            href: '/mesajlar',
          },
          {
            label: '7 gün giden',
            value: out7d ?? 0,
            href: '/raporlar?gun=7',
          },
        ]}
      />

      <Card>
        <CardHeader
          title="Kampanyalar"
          subtitle={(campaignsRunning ?? 0) > 0 ? `${campaignsRunning} çalışıyor` : 'Son kayıtlar'}
          action={<QuietLink href="/kampanyalar">Tümü</QuietLink>}
        />
        {(recentCampaigns ?? []).length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 text-[13px] text-ink-muted">
            <span>Henüz kampanya yok.</span>
            <AccentLink href="/kampanyalar#yeni-kampanya">Oluştur</AccentLink>
          </div>
        ) : (
          <ul className="divide-y divide-hairline">
            {(recentCampaigns ?? []).map((c, index) => {
              const total = Math.max(0, c.total_targets ?? 0)
              const done = (c.sent_count ?? 0) + (c.failed_count ?? 0) + (c.skipped_count ?? 0)
              return (
                <li
                  key={c.id}
                  className="wb-row-enter"
                  style={{ animationDelay: `${Math.min(index, 8) * 28}ms` }}
                >
                  <Link
                    href={`/kampanyalar/${c.id}`}
                    className="wb-list-row flex items-center justify-between gap-3 px-3.5 py-2.5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-ink">
                        {c.name}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] text-ink-faint tabular">
                        {c.sent_count}
                        {total > 0 ? ` / ${total}` : ''}
                        {(c.failed_count ?? 0) > 0 ? ` · ${c.failed_count} hata` : ''}
                      </span>
                      {total > 0 && (c.status === 'running' || c.status === 'paused') ? (
                        <div className="mt-1.5 max-w-[220px]">
                          <Meter
                            value={done}
                            max={total}
                            tone={
                              c.status === 'paused' || (c.failed_count ?? 0) > 0
                                ? 'warn'
                                : 'accent'
                            }
                          />
                        </div>
                      ) : null}
                    </span>
                    <StatusPill status={c.status} />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </>
  )
}
