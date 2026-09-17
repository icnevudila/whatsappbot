import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Meter,
  Notice,
  PageHeader,
  Pagination,
  StatusPill,
} from '@/components/ui'
import { Icon } from '@/components/icon'
import { ScheduledStatusPill } from '@/components/schedule-status'
import { formatRelativePast, formatRemainingTr, formatScheduleAt } from '@/lib/schedule-remaining'
import { requireActiveOrg } from '@/lib/org'
import {
  PAGE_SIZES,
  buildPageHref,
  clampPage,
  parsePage,
  rangeForPage,
  totalPages,
} from '@/lib/pagination'
import { CampaignPreviewButton } from './campaign-preview'

export const metadata: Metadata = { title: 'Kampanyalar' }
export const dynamic = 'force-dynamic'

function meterTone(
  status: string,
  failedCount: number,
): 'accent' | 'warn' | 'danger' {
  if (status === 'stopped' || status === 'failed') return 'danger'
  if (failedCount > 0) return 'warn'
  if (status === 'completed') return 'accent'
  return 'accent'
}

function statusDot(status: string): string {
  switch (status) {
    case 'running':
      return '#00a884'
    case 'completed':
      return '#25d366'
    case 'failed':
    case 'stopped':
      return '#e53935'
    case 'paused':
    case 'scheduled':
      return '#f5c26b'
    case 'draft':
    default:
      return '#8696a0'
  }
}

function campaignWhen(campaign: {
  status: string
  created_at: string
  updated_at: string | null
  scheduled_at: string | null
}): { primary: string; secondary: string | null } {
  if (campaign.status === 'scheduled' && campaign.scheduled_at) {
    const remaining = formatRemainingTr(campaign.scheduled_at)
    const when = formatScheduleAt(campaign.scheduled_at)
    return {
      primary: remaining ? remaining : 'Planlandı',
      secondary: when || null,
    }
  }
  if (campaign.status === 'running') {
    return { primary: 'Gönderiliyor', secondary: null }
  }
  if (campaign.status === 'paused') {
    return { primary: 'Duraklatıldı', secondary: formatRelativePast(campaign.updated_at || campaign.created_at) || null }
  }
  if (campaign.status === 'draft') {
    const ago = formatRelativePast(campaign.created_at)
    return { primary: ago ? `${ago} oluşturuldu` : 'Taslak', secondary: null }
  }
  const stamp = campaign.updated_at || campaign.created_at
  const ago = formatRelativePast(stamp)
  if (campaign.status === 'completed') {
    return { primary: ago ? `${ago} tamamlandı` : 'Tamamlandı', secondary: null }
  }
  if (campaign.status === 'stopped') {
    return { primary: ago ? `${ago} iptal edildi` : 'İptal edildi', secondary: null }
  }
  if (campaign.status === 'failed') {
    return { primary: ago ? `${ago} hata aldı` : 'Hata oluştu', secondary: null }
  }
  return { primary: ago || '', secondary: null }
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
      'id, name, status, body, media_url, total_targets, sent_count, failed_count, skipped_count, created_at, updated_at, scheduled_at',
    )
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })
    .range(from, to)

  const campaigns = campaignRows ?? []
  const listCount = listsResult.count ?? 0
  const connectedCount = connectedResult.count ?? 0
  const hazirQs = justReady ? '1' : undefined

  const emptyHint =
    listCount === 0
      ? 'Önce bir kişi grubu ekleyin, sonra buradan gönderin.'
      : connectedCount === 0
        ? 'Önce bir hat bağlayın, sonra buradan gönderin.'
        : 'Mesaj yazın, grup ve hat seçin, gönderin.'

  return (
    <div className="wb-wa-page">
      <PageHeader
        title="Kampanyalar"
        description="Müşterilerinize WhatsApp’tan duyuru ve kampanya gönderin."
      />

      {justReady ? <Notice tone="success">Kampanya hazır.</Notice> : null}

      <section className="wb-camp-actions" aria-label="Hızlı işlemler">
        <Link href="/kampanyalar/yeni" className="wb-camp-action is-primary">
          <span className="wb-camp-action-icon" aria-hidden>
            <Icon name="campaign" className="size-5" />
          </span>
          <span className="wb-camp-action-copy">
            <span className="wb-camp-action-title">Yeni kampanya</span>
            <span className="wb-camp-action-desc">
              {campaignTotal === 0
                ? 'Mesaj yazın, grup ve hat seçin'
                : emptyHint}
            </span>
          </span>
        </Link>
        <Link href="/icerik" className="wb-camp-action">
          <span className="wb-camp-action-icon" aria-hidden>
            <Icon name="image" className="size-5" />
          </span>
          <span className="wb-camp-action-copy">
            <span className="wb-camp-action-title">İçerik kütüphanesi</span>
            <span className="wb-camp-action-desc">Görselleri yönetin ve kullanın</span>
          </span>
        </Link>
      </section>

      <div className="space-y-2 px-0">
        {campaignTotal === 0 ? null : (
          <ul className="wb-inbox-list">
            {campaigns.map((campaign, index) => {
              const done = campaign.sent_count + campaign.failed_count + campaign.skipped_count
              const total = Math.max(0, campaign.total_targets)
              const scheduledAt = campaign.status === 'scheduled' ? campaign.scheduled_at : null
              const when = campaignWhen(campaign)
              const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0
              return (
                <li
                  key={campaign.id}
                  className="wb-row-enter"
                  style={{ animationDelay: `${Math.min(index, 12) * 28}ms` }}
                >
                  <div className="wb-camp-row">
                    <Link href={`/kampanyalar/${campaign.id}`} className="wb-camp-row-body">
                      <span
                        className="wb-camp-dot"
                        style={{ background: statusDot(campaign.status) }}
                        aria-hidden
                      />
                      <span className="wb-camp-main">
                        <span className="wb-camp-name">{campaign.name}</span>
                        <span className="wb-camp-meta">
                          <span>{when.primary}</span>
                          {when.secondary ? <span>· {when.secondary}</span> : null}
                          {campaign.failed_count > 0 ? (
                            <span className="wb-camp-fail">{campaign.failed_count} hata</span>
                          ) : null}
                        </span>
                        <span className="wb-camp-progress">
                          <Meter
                            value={done}
                            max={Math.max(1, total)}
                            tone={meterTone(campaign.status, campaign.failed_count)}
                          />
                          <span className="wb-camp-count">
                            {done}/{total || '—'}
                            {total > 0 ? ` · %${pct}` : ''}
                          </span>
                        </span>
                      </span>
                    </Link>
                    <span className="wb-camp-top-end">
                      {scheduledAt ? (
                        <ScheduledStatusPill at={scheduledAt} />
                      ) : (
                        <StatusPill status={campaign.status} />
                      )}
                      <CampaignPreviewButton
                        name={campaign.name}
                        body={campaign.body}
                        mediaUrl={campaign.media_url}
                      />
                    </span>
                    <Link
                      href={`/kampanyalar/${campaign.id}`}
                      className="wb-wa-set-chevron"
                      tabIndex={-1}
                      aria-hidden
                    >
                      ›
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {campaignTotal === 0 ? null : (
          <Pagination
            page={page}
            totalPages={pages}
            label={`${campaignTotal} kayıt`}
            hrefForPage={(p) => buildPageHref('/kampanyalar', p, { hazir: hazirQs })}
          />
        )}
      </div>
    </div>
  )
}
