import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
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

const FILTER_STATUSES = {
  devam: ['running', 'paused'],
  bekleyen: ['draft', 'scheduled'],
  tamamlanan: ['completed', 'stopped', 'failed'],
} as const

function parseCampaignFilter(raw: string | string[] | undefined) {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value === 'tum' || value === 'bekleyen' || value === 'tamamlanan') return value
  return 'devam' as const
}

function meterTone(
  status: string,
  failedCount: number,
): 'accent' | 'warn' | 'danger' {
  if (status === 'stopped' || status === 'failed') return 'danger'
  if (failedCount > 0) return 'warn'
  if (status === 'completed') return 'accent'
  return 'accent'
}

function campaignDotClass(status: string) {
  if (status === 'running') return 'wb-camp-dot is-running'
  if (status === 'completed') return 'wb-camp-dot is-done'
  if (status === 'failed' || status === 'stopped') return 'wb-camp-dot is-error'
  return 'wb-camp-dot is-waiting'
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

function SegmentLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: ReactNode
}) {
  return (
    <Link href={href} className={`wb-wa-chip${active ? ' is-active' : ''}`}>
      {children}
    </Link>
  )
}

function campaignFilterHref(
  filter: 'tum' | 'devam' | 'bekleyen' | 'tamamlanan',
  hazir?: string,
) {
  return buildPageHref('/kampanyalar', 1, {
    hazir,
    durum: filter,
  })
}

function emptyFilterMessage(filter: 'tum' | 'devam' | 'bekleyen' | 'tamamlanan') {
  if (filter === 'devam') return 'Devam eden kampanya yok.'
  if (filter === 'bekleyen') return 'Bekleyen kampanya yok.'
  if (filter === 'tamamlanan') return 'Tamamlanan kampanya yok.'
  return 'Henüz kampanya yok.'
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{
    hazir?: string | string[]
    sayfa?: string | string[]
    durum?: string | string[]
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
  const filter = parseCampaignFilter(params.durum)
  const statusIn = filter === 'tum' ? null : FILTER_STATUSES[filter]
  const pageSize = PAGE_SIZES.campaigns
  const requestedPage = parsePage(params.sayfa)
  const hazirQs = justReady ? '1' : undefined

  const campaignsCountQuery = supabase
    .from('campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', org.id)
  const filteredCountQuery = statusIn
    ? supabase
        .from('campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .in('status', [...statusIn])
    : null

  const [allCountResult, filteredCountResult, listsResult, connectedResult] = await Promise.all([
    campaignsCountQuery,
    filteredCountQuery,
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

  const allTotal = allCountResult.count ?? 0
  const campaignTotal = statusIn ? filteredCountResult?.count ?? 0 : allTotal
  const pages = totalPages(campaignTotal, pageSize)
  const page = clampPage(requestedPage, pages)
  const { from, to } = rangeForPage(page, pageSize)

  let campaignsQuery = supabase
    .from('campaigns')
    .select(
      'id, name, status, body, media_url, total_targets, sent_count, failed_count, skipped_count, created_at, updated_at, scheduled_at',
    )
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })
    .range(from, to)
  if (statusIn) campaignsQuery = campaignsQuery.in('status', [...statusIn])

  const { data: campaignRows } = await campaignsQuery
  const campaigns = campaignRows ?? []

  const completedIds = campaigns.filter((campaign) => campaign.status === 'completed').map((campaign) => campaign.id)
  const readByCampaign: Record<string, number> = {}
  if (completedIds.length > 0) {
    const readResults = await Promise.all(
      completedIds.map(async (id) => {
        const { count } = await supabase
          .from('campaign_targets')
          .select('id', { count: 'exact', head: true })
          .eq('campaign_id', id)
          .eq('org_id', org.id)
          .eq('status', 'read')
        return [id, count ?? 0] as const
      }),
    )
    for (const [id, count] of readResults) readByCampaign[id] = count
  }

  const listCount = listsResult.count ?? 0
  const connectedCount = connectedResult.count ?? 0

  const emptyHint =
    listCount === 0
      ? 'Önce kişi grubu ekle'
      : connectedCount === 0
        ? 'Önce hat bağla'
        : 'Mesaj, grup ve hat seç'

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
              {allTotal === 0
                ? 'Mesaj, grup ve hat seç'
                : emptyHint}
            </span>
          </span>
        </Link>
        <Link href="/icerik" className="wb-camp-action">
          <span className="wb-camp-action-icon" aria-hidden>
            <Icon name="image" className="size-5" />
          </span>
          <span className="wb-camp-action-copy">
            <span className="wb-camp-action-title">İçerik</span>
            <span className="wb-camp-action-desc">Görsel ve video üret</span>
          </span>
        </Link>
      </section>

      {allTotal > 0 ? (
        <div className="wb-wa-toolbar">
          <div className="wb-wa-seg">
            <SegmentLink href={campaignFilterHref('devam', hazirQs)} active={filter === 'devam'}>
              Devam eden
            </SegmentLink>
            <SegmentLink href={campaignFilterHref('bekleyen', hazirQs)} active={filter === 'bekleyen'}>
              Bekleyen
            </SegmentLink>
            <SegmentLink href={campaignFilterHref('tamamlanan', hazirQs)} active={filter === 'tamamlanan'}>
              Tamamlanan
            </SegmentLink>
            <SegmentLink href={campaignFilterHref('tum', hazirQs)} active={filter === 'tum'}>
              Tümü
            </SegmentLink>
          </div>
        </div>
      ) : null}

      <div className="space-y-2 px-0">
        {allTotal === 0 ? null : campaignTotal === 0 ? (
          <p className="px-4 py-8 text-center text-[13.5px] text-[#667781]">
            {emptyFilterMessage(filter)}
          </p>
        ) : (
          <ul className="wb-inbox-list">
            {campaigns.map((campaign, index) => {
              const done = campaign.sent_count + campaign.failed_count + campaign.skipped_count
              const total = Math.max(0, campaign.total_targets)
              const scheduledAt = campaign.status === 'scheduled' ? campaign.scheduled_at : null
              const when = campaignWhen(campaign)
              const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0
              const readCount = readByCampaign[campaign.id] ?? 0
              return (
                <li
                  key={campaign.id}
                  className="wb-row-enter"
                  style={{ animationDelay: `${Math.min(index, 12) * 28}ms` }}
                >
                  <div className="wb-camp-row">
                    <Link href={`/kampanyalar/${campaign.id}`} className="wb-camp-row-body">
                      <span
                        className={campaignDotClass(campaign.status)}
                        aria-hidden
                      />
                      <span className="wb-camp-main">
                        <span className="wb-camp-name">{campaign.name}</span>
                        <span className="wb-camp-meta">
                          <span>{when.primary}</span>
                          {campaign.status === 'completed' ? (
                            <span>
                              {campaign.sent_count.toLocaleString('tr-TR')} kişiye gönderildi - {readCount.toLocaleString('tr-TR')} kişi okudu
                            </span>
                          ) : null}
                          {when.secondary ? <span>· {when.secondary}</span> : null}
                          {campaign.failed_count > 0 ? (
                            <span className="wb-camp-fail">{campaign.failed_count} hata</span>
                          ) : null}
                        </span>
                        {campaign.status === 'running' ? (
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
                        ) : null}
                      </span>
                    </Link>
                    <span className="wb-camp-top-end">
                      <CampaignPreviewButton
                        name={campaign.name}
                        body={campaign.body}
                        mediaUrl={campaign.media_url}
                      />
                      {scheduledAt ? (
                        <ScheduledStatusPill at={scheduledAt} />
                      ) : (
                        <StatusPill status={campaign.status} />
                      )}
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
            hrefForPage={(p) =>
              buildPageHref('/kampanyalar', p, {
                hazir: hazirQs,
                durum: filter,
              })
            }
          />
        )}
      </div>
    </div>
  )
}
