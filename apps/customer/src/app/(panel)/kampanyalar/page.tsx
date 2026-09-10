import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AccentLink,
  EmptyState,
  Meter,
  Notice,
  PageHeader,
  Pagination,
  StatusPill,
} from '@/components/ui'
import { requireActiveOrg } from '@/lib/org'
import {
  PAGE_SIZES,
  buildPageHref,
  clampPage,
  parsePage,
  rangeForPage,
  totalPages,
} from '@/lib/pagination'

export const metadata: Metadata = { title: 'Kampanyalar' }
export const dynamic = 'force-dynamic'

function meterTone(
  status: string,
  failedCount: number,
): 'accent' | 'warn' | 'danger' {
  if (status === 'stopped' || status === 'failed') return 'danger'
  if (failedCount > 0) return 'warn'
  return 'accent'
}

function statusHint(status: string): string | null {
  switch (status) {
    case 'draft':
      return 'Henüz başlamadı'
    case 'scheduled':
      return 'Zamanı bekliyor'
    case 'running':
      return 'Gönderiliyor'
    case 'paused':
      return 'Duraklatıldı'
    case 'completed':
      return 'Bitti'
    case 'stopped':
      return 'İptal edildi'
    case 'failed':
      return 'Hata oluştu'
    default:
      return null
  }
}

function campaignShell(status: string): string {
  switch (status) {
    case 'running':
      return 'border-accent/30 bg-accent-soft/70 shadow-[inset_3px_0_0_var(--color-accent)]'
    case 'completed':
      return 'border-ok/30 bg-ok-soft/50 shadow-[inset_3px_0_0_var(--color-ok)]'
    case 'failed':
    case 'stopped':
      return 'border-danger/30 bg-[#fff5f4] shadow-[inset_3px_0_0_var(--color-danger)]'
    case 'paused':
    case 'scheduled':
      return 'border-warn/30 bg-[#fff8e8] shadow-[inset_3px_0_0_var(--color-warn)]'
    case 'draft':
    default:
      return 'border-hairline bg-surface-raised/60 shadow-[inset_3px_0_0_var(--color-hairline-strong)]'
  }
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{
    hazir?: string | string[]
    sayfa?: string | string[]
  }>
}) {
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

  const params = await searchParams
  const justReady = (Array.isArray(params.hazir) ? params.hazir[0] : params.hazir) === '1'
  const pageSize = PAGE_SIZES.campaigns
  const requestedPage = parsePage(params.sayfa)

  const [campaignsCountResult, listsResult, connectedResult] = await Promise.all([
    supabase
      .from('campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id),
    supabase
      .from('contact_lists')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .neq('source', 'quick_send'),
    supabase
      .from('accounts')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('status', 'connected')
      .eq('enabled', true)
      .eq('is_locked', false),
  ])

  const campaignTotal = campaignsCountResult.count ?? 0
  const pages = totalPages(campaignTotal, pageSize)
  const page = clampPage(requestedPage, pages)
  const { from, to } = rangeForPage(page, pageSize)

  const { data: campaignRows } = await supabase
    .from('campaigns')
    .select(
      'id, name, status, total_targets, sent_count, failed_count, skipped_count, created_at',
    )
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })
    .range(from, to)

  const campaigns = campaignRows ?? []
  const listCount = listsResult.count ?? 0
  const connectedCount = connectedResult.count ?? 0
  const hazirQs = justReady ? '1' : undefined

  const emptyAction =
    listCount === 0 ? (
      <AccentLink href="/kisiler">Önce kişi grubu ekle</AccentLink>
    ) : connectedCount === 0 ? (
      <AccentLink href="/ayarlar/hatlar">Önce hat bağla</AccentLink>
    ) : (
      <AccentLink href="/kampanyalar/yeni">İlk Kampanyanı Oluştur</AccentLink>
    )

  return (
    <>
      <PageHeader
        title="Kampanyalar"
        description="Müşterilerinize WhatsApp’tan duyuru ve kampanya gönderin."
        action={<AccentLink href="/kampanyalar/yeni">Yeni kampanya</AccentLink>}
      />

      {justReady ? <Notice tone="success">Kampanya hazır.</Notice> : null}

      {campaignTotal === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-hairline bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            tone="campaign"
            title="İlk kampanyanı oluştur"
            description="Müşterilerine WhatsApp üzerinden kampanya ve duyurular göndermeye başla."
            action={emptyAction}
          />
        </div>
      ) : (
        <div className="rounded-[var(--radius-card)] border border-hairline bg-surface shadow-[var(--shadow-card)]">
          <ul className="divide-y divide-hairline">
            {campaigns.map((campaign, index) => {
              const done = campaign.sent_count + campaign.failed_count + campaign.skipped_count
              const total = Math.max(0, campaign.total_targets)
              const hint = statusHint(campaign.status)
              return (
                <li
                  key={campaign.id}
                  className="wb-row-enter"
                  style={{ animationDelay: `${Math.min(index, 12) * 28}ms` }}
                >
                  <Link
                    href={`/kampanyalar/${campaign.id}`}
                    className={`wb-card-lift wb-list-row block px-4 py-3 ${campaignShell(campaign.status)}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-[14px] font-bold tracking-[-0.02em] text-ink">
                        {campaign.name}
                      </p>
                      <StatusPill status={campaign.status} />
                    </div>
                    {hint ? <p className="mt-0.5 text-[12px] text-ink-muted">{hint}</p> : null}
                    <div className="mt-2 flex items-center gap-2">
                      <Meter
                        value={done}
                        max={Math.max(1, total)}
                        tone={meterTone(campaign.status, campaign.failed_count)}
                      />
                      <span className="shrink-0 tabular text-[11.5px] font-medium text-ink-muted">
                        {done}/{total || '—'}
                      </span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
          <Pagination
            page={page}
            totalPages={pages}
            label={`${campaignTotal} kayıt`}
            hrefForPage={(p) => buildPageHref('/kampanyalar', p, { hazir: hazirQs })}
          />
        </div>
      )}
    </>
  )
}
