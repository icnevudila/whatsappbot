import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Card,
  CardHeader,
  CreateCta,
  Meter,
  QuietLink,
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
  const primaryCta = !hasLine
    ? { title: 'Hat bağla', description: 'WhatsApp hattını bağla, gönderim açılsın.', icon: 'phone' as const }
    : !hasPeople
      ? { title: 'Kişi ekle', description: 'Kampanya için önce bir grup veya kişi ekleyin.', icon: 'people' as const }
      : { title: 'Yeni kampanya', description: 'Mesaj yazın, grup ve hat seçin, gönderin.', icon: 'plus' as const }

  const kpiClass =
    'min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-surface p-2.5 shadow-[var(--shadow-card)] transition-colors hover:border-accent/35 hover:bg-accent-soft/40 sm:p-4'

  return (
    <>
      <header className="wb-page-head">
        <div className="min-w-0 w-full sm:w-auto sm:flex-1">
          <h1 className="wb-page-title">{org.name}</h1>
          <p className="wb-page-desc">Günün özeti</p>
        </div>
      </header>

      <div className="mb-3">
        <CreateCta
          href={primaryHref}
          title={primaryCta.title}
          description={primaryCta.description}
          icon={primaryCta.icon}
        />
      </div>

      {setup.showSetup ? <SetupGuideCard progress={setup} /> : null}

      <div className="mb-3 grid grid-cols-3 gap-2 sm:mb-4 sm:gap-3">
        <Link href="/ayarlar/hatlar" className={kpiClass}>
          <p className="truncate text-[11px] font-medium text-ink-muted sm:text-[12px]">Hat</p>
          <p
            className={`mt-1 text-[17px] font-semibold tabular tracking-[-0.03em] sm:text-[22px] ${
              hasLine ? 'text-ok-dim' : 'text-ink'
            }`}
          >
            {connectedCount.toLocaleString('tr-TR')}
          </p>
          <p className="mt-1 truncate text-[11px] text-ink-faint sm:text-[12.5px]">
            {hasLine ? 'Bağlı' : 'QR ile bağla'}
          </p>
        </Link>
        <Link href="/kisiler" className={kpiClass}>
          <p className="truncate text-[11px] font-medium text-ink-muted sm:text-[12px]">Kişiler</p>
          <p className="mt-1 text-[17px] font-semibold tabular tracking-[-0.03em] text-ink sm:text-[22px]">
            {contactCount.toLocaleString('tr-TR')}
          </p>
          <p className="mt-1 truncate text-[11px] text-ink-faint sm:text-[12.5px]">
            {(lists ?? 0).toLocaleString('tr-TR')} grup
          </p>
        </Link>
        <Link href="/kampanyalar" className={kpiClass}>
          <p className="truncate text-[11px] font-medium text-ink-muted sm:text-[12px]">
            <span className="sm:hidden">Bugün</span>
            <span className="hidden sm:inline">Bugün giden</span>
          </p>
          <p className="mt-1 text-[17px] font-semibold tabular tracking-[-0.03em] text-ink sm:text-[22px]">
            {(outToday ?? 0).toLocaleString('tr-TR')}
          </p>
          <p className="mt-1 truncate text-[11px] text-ink-faint sm:text-[12.5px]">
            {(campaignsRunning ?? 0) > 0
              ? `${campaignsRunning} aktif`
              : 'Aktif yok'}
          </p>
        </Link>
      </div>

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
            <p className="text-[14px] font-semibold text-ink">Henüz kampanya yok</p>
            <p className="mt-1 text-[13px] text-ink-muted">
              {!hasLine
                ? 'Önce bir hat bağlayın, sonra buradan gönderin.'
                : !hasPeople
                  ? 'Önce kişi grubu ekleyin, sonra buradan gönderin.'
                  : 'Yukarıdan yeni kampanya ile WhatsApp duyurusu gönderin.'}
            </p>
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
                    className="wb-list-row flex items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-3.5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-ink">
                        {c.name}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] text-ink-faint tabular">
                        {(c.sent_count ?? 0).toLocaleString('tr-TR')}
                        {total > 0 ? ` / ${total.toLocaleString('tr-TR')}` : ''}
                        {(c.failed_count ?? 0) > 0
                          ? ` · ${c.failed_count.toLocaleString('tr-TR')} hata`
                          : ''}
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
