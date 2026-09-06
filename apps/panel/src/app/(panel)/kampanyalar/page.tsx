import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AccentLink,
  CardHeader,
  EmptyState,
  Meter,
  Notice,
  PageHeader,
  Pagination,
  SplitPane,
  StatusPill,
} from '@/components/ui'
import { hasImageProvider } from '@/lib/ai/image'
import { hasTextProvider } from '@/lib/ai/text'
import { loadOrgAiKeys, rowToBag } from '@/lib/ai/org-keys'
import { createT } from '@/lib/i18n'
import { getDictionary } from '@/lib/i18n/server'
import { requireActiveOrg } from '@/lib/org'
import {
  PAGE_SIZES,
  buildPageHref,
  clampPage,
  parsePage,
  rangeForPage,
  totalPages,
} from '@/lib/pagination'
import { NewCampaignForm } from './new-campaign-form'

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
      return 'Canlı gönderim'
    case 'paused':
      return 'Duraklatıldı'
    case 'completed':
      return 'Bitti'
    case 'stopped':
      return 'Durduruldu'
    case 'failed':
      return 'Hata ile bitti'
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
  searchParams: Promise<{ hazir?: string | string[]; sayfa?: string | string[] }>
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

  const [campaignsCountResult, listsResult, accountsResult, brandResult, aiKeyRow, { messages }] =
    await Promise.all([
      supabase
        .from('campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id),
      supabase
        .from('contact_lists')
        .select('id, name, contact_count')
        .eq('org_id', org.id)
        .neq('source', 'quick_send')
        .order('created_at', { ascending: false }),
      supabase
        .from('accounts')
        .select('id, label, status, is_locked')
        .eq('org_id', org.id)
        .order('created_at'),
      supabase
        .from('brand_kits')
        .select('id, name, is_default')
        .eq('org_id', org.id)
        .order('is_default', { ascending: false })
        .order('created_at'),
      loadOrgAiKeys(supabase, org.id),
      getDictionary(),
    ])

  const campaignTotal = campaignsCountResult.count ?? 0
  const pages = totalPages(campaignTotal, pageSize)
  const page = clampPage(requestedPage, pages)
  const { from, to } = rangeForPage(page, pageSize)

  const { data: campaignRows } = await supabase
    .from('campaigns')
    .select(
      'id, name, status, total_targets, sent_count, failed_count, skipped_count, stop_reason, created_at',
    )
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })
    .range(from, to)

  const t = createT(messages)
  const aiBag = rowToBag(aiKeyRow)
  const campaigns = campaignRows ?? []

  const listOptions = (listsResult.data ?? []).map((list) => ({
    id: list.id,
    label: list.name,
    detail: `${list.contact_count} numara`,
  }))

  const brandKits = (brandResult.data ?? []).map((kit) => ({
    id: kit.id,
    name: kit.name,
    isDefault: kit.is_default,
  }))
  const brandName =
    brandKits.find((kit) => kit.isDefault)?.name ?? brandKits[0]?.name ?? undefined

  const accountOptions = (accountsResult.data ?? []).map((account) => ({
    id: account.id,
    label: account.label,
    detail: account.is_locked
      ? 'kilitli'
      : account.status === 'connected'
        ? 'bağlı'
        : 'bağlı değil',
    disabled: account.is_locked || account.status !== 'connected',
  }))

  const connectedCount = accountOptions.filter((a) => !a.disabled).length
  const hazirQs = justReady ? '1' : undefined

  return (
    <>
      <PageHeader
        title={t('pages.kampanyalarTitle')}
        description={t('pages.kampanyalarDesc')}
        action={<AccentLink href="/hizli-gonderim">{t('nav.hizli')}</AccentLink>}
      />

      {justReady ? <Notice tone="success">{t('pages.kampanyalarReady')}</Notice> : null}

      <div className={justReady ? 'mt-2.5' : undefined}>
      <SplitPane
        variant="form"
        list={
          <div className="flex min-h-0 flex-col">
            <CardHeader
              title="Geçmiş"
              subtitle={
                campaignTotal === 0
                  ? 'Henüz kayıt yok'
                  : `${campaignTotal} kampanya · sayfa ${page}/${pages}`
              }
            />
            {campaignTotal === 0 ? (
              <EmptyState
                tone="campaign"
                title="Henüz kampanya yok"
                description={
                  listOptions.length === 0
                    ? 'Önce Kişiler’de bir liste oluşturun, sonra buradan kampanya başlatın.'
                    : connectedCount === 0
                      ? 'Liste hazır; en az bir bağlı hat gerekir.'
                      : 'Sağdaki formdan oluşturun. Tek seferlik için Hızlı gönderim yeterli.'
                }
                action={
                  listOptions.length === 0 ? (
                    <AccentLink href="/kisiler">Kişilere git</AccentLink>
                  ) : connectedCount === 0 ? (
                    <AccentLink href="/hesaplar">Hesaplara git</AccentLink>
                  ) : (
                    <AccentLink href="#yeni-kampanya">Kampanya oluştur</AccentLink>
                  )
                }
              />
            ) : (
              <>
              <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
                {campaigns.map((campaign, index) => {
                  const done =
                    campaign.sent_count + campaign.failed_count + campaign.skipped_count
                  const total = Math.max(0, campaign.total_targets)
                  const hint = statusHint(campaign.status)

                  return (
                    <li
                      key={campaign.id}
                      className="wb-row-enter"
                      style={{ animationDelay: `${Math.min(index, 12) * 28}ms` }}
                    >
                      <Link
                        href={`/kampanyalar/${campaign.id}#paylasilanlar`}
                        className={`wb-card-lift wb-list-row block rounded-[var(--radius-sm)] border px-3 py-2.5 ${campaignShell(campaign.status)}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-[13.5px] font-bold tracking-[-0.02em] text-ink">
                            {campaign.name}
                          </p>
                          <StatusPill status={campaign.status} />
                        </div>
                        {hint ? (
                          <p className="mt-0.5 text-[11px] text-ink-muted">{hint}</p>
                        ) : null}
                        <div className="mt-2 flex items-center gap-2">
                          <Meter
                            value={done}
                            max={Math.max(1, total)}
                            tone={meterTone(campaign.status, campaign.failed_count)}
                          />
                          <span className="shrink-0 tabular text-[11px] font-medium text-ink-muted">
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
                hrefForPage={(p) =>
                  buildPageHref('/kampanyalar', p, { hazir: hazirQs })
                }
              />
              </>
            )}
          </div>
        }
        detail={
          <NewCampaignForm
            lists={listOptions}
            accounts={accountOptions}
            orgId={org.id}
            aiEnabled={hasTextProvider(aiBag)}
            imageAiEnabled={hasImageProvider(aiBag)}
            brandName={brandName}
            brandKits={brandKits}
          />
        }
      />
      </div>
    </>
  )
}
