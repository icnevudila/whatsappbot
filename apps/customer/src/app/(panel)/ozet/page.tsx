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

export const metadata: Metadata = { title: 'Ana sayfa' }
export const dynamic = 'force-dynamic'

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

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const sinceToday = todayStart.toISOString()

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
        .from('campaigns')
        .select('id, name, sent_count, failed_count, skipped_count, status, total_targets')
        .eq('org_id', org.id)
        .order('updated_at', { ascending: false })
        .limit(5),
    ]),
  ])

  const [
    { count: lists },
    { count: campaignsRunning },
    { count: outToday },
    { data: recentCampaigns },
  ] = rest

  const { connectedCount, contactCount } = setup.counts
  const hasLine = connectedCount > 0
  const hasPeople = (lists ?? 0) > 0 || contactCount > 0
  const primaryHref = !hasLine ? '/ayarlar/hatlar' : !hasPeople ? '/kisiler' : '/kampanyalar/yeni'
  const primaryCta = !hasLine ? 'Hat bağla' : !hasPeople ? 'Kişi ekle' : 'Kampanya başlat'

  return (
    <>
      <PageHeader
        title={org.name}
        description="Hat, kişiler ve gönderim — üç adım."
        action={<AccentLink href={primaryHref}>{primaryCta}</AccentLink>}
      />

      {setup.showSetup ? <SetupGuideCard progress={setup} /> : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Link
          href="/ayarlar/hatlar"
          className="rounded-[var(--radius-card)] border border-hairline bg-surface p-4 shadow-[var(--shadow-card)] transition-colors hover:border-accent/35 hover:bg-accent-soft/40"
        >
          <p className="text-[12px] font-medium text-ink-muted">Hat</p>
          <p className="mt-1 text-[22px] font-semibold tabular tracking-[-0.03em]">{connectedCount}</p>
          <p className="mt-1 text-[12.5px] text-ink-faint">{hasLine ? 'Bağlı' : 'QR ile bağla'}</p>
        </Link>
        <Link
          href="/kisiler"
          className="rounded-[var(--radius-card)] border border-hairline bg-surface p-4 shadow-[var(--shadow-card)] transition-colors hover:border-accent/35 hover:bg-accent-soft/40"
        >
          <p className="text-[12px] font-medium text-ink-muted">Kişiler</p>
          <p className="mt-1 text-[22px] font-semibold tabular tracking-[-0.03em]">{contactCount}</p>
          <p className="mt-1 text-[12.5px] text-ink-faint">{lists ?? 0} grup</p>
        </Link>
        <Link
          href="/kampanyalar"
          className="rounded-[var(--radius-card)] border border-hairline bg-surface p-4 shadow-[var(--shadow-card)] transition-colors hover:border-accent/35 hover:bg-accent-soft/40"
        >
          <p className="text-[12px] font-medium text-ink-muted">Bugün giden</p>
          <p className="mt-1 text-[22px] font-semibold tabular tracking-[-0.03em]">{outToday ?? 0}</p>
          <p className="mt-1 text-[12.5px] text-ink-faint">
            {(campaignsRunning ?? 0) > 0 ? `${campaignsRunning} kampanya çalışıyor` : 'Kampanya yok'}
          </p>
        </Link>
      </div>

      <StatStrip
        items={[
          { label: 'Hat', value: connectedCount, href: '/ayarlar/hatlar', tone: hasLine ? 'ok' : 'default' },
          { label: 'Grup', value: lists ?? 0, href: '/kisiler' },
          { label: 'Bugün', value: outToday ?? 0, href: '/mesajlar' },
        ]}
      />

      <Card>
        <CardHeader
          title="Son kampanyalar"
          subtitle={(campaignsRunning ?? 0) > 0 ? `${campaignsRunning} çalışıyor` : 'Gönderimleri buradan izleyin'}
          action={<QuietLink href="/kampanyalar">Tümü</QuietLink>}
        />
        {(recentCampaigns ?? []).length === 0 ? (
          <div className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[14px] font-semibold text-ink">İlk kampanyanı oluştur</p>
              <p className="mt-1 max-w-md text-[13px] text-ink-muted">
                Müşterilerine WhatsApp üzerinden kampanya ve duyurular göndermeye başla.
              </p>
            </div>
            <AccentLink href="/kampanyalar/yeni">İlk Kampanyanı Oluştur</AccentLink>
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
                              c.status === 'paused' || (c.failed_count ?? 0) > 0 ? 'warn' : 'accent'
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
