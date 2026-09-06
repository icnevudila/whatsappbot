import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AccentLink, Card, CardHeader, EmptyState, Meter, Notice, PageHeader, StatusPill } from '@/components/ui'
import { hasTextProvider } from '@/lib/ai/text'
import { createT } from '@/lib/i18n'
import { getDictionary } from '@/lib/i18n/server'
import { requireActiveOrg } from '@/lib/org'
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

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ hazir?: string | string[] }>
}) {
  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireActiveOrg())
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') {
      redirect('/erisim-yok')
    }
    redirect('/giris')
  }

  const params = await searchParams
  const justReady = (Array.isArray(params.hazir) ? params.hazir[0] : params.hazir) === '1'

  const [campaignsResult, listsResult, accountsResult, brandResult, { messages }] =
    await Promise.all([
    supabase
      .from('campaigns')
      .select(
        'id, name, status, total_targets, sent_count, failed_count, skipped_count, stop_reason, created_at',
      )
      .eq('org_id', org.id)
      .order('created_at', { ascending: false }),
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
    // Marka adi varsa AI metnin basina koysun; kim oldugunu belirtmeyen
    // toplu mesaj sikayet oranini belirgin sekilde yukseltiyor.
    supabase.from('brand_kits').select('name').eq('org_id', org.id).limit(1).maybeSingle(),
    getDictionary(),
  ])

  const t = createT(messages)
  const campaigns = campaignsResult.data ?? []

  const listOptions = (listsResult.data ?? []).map((list) => ({
    id: list.id,
    label: list.name,
    detail: `${list.contact_count} numara`,
  }))

  const accountOptions = (accountsResult.data ?? []).map((account) => ({
    id: account.id,
    label: account.label,
    detail: account.is_locked
      ? 'kilitli'
      : account.status === 'connected'
        ? 'bağlı'
        : 'bağlı değil',
    // Bagli olmayan hesap secilirse kampanya bosa donuyor; en basta engelliyoruz.
    disabled: account.is_locked || account.status !== 'connected',
  }))

  const connectedCount = accountOptions.filter((a) => !a.disabled).length

  return (
    <>
      <PageHeader
        title={t('pages.kampanyalarTitle')}
        description={t('pages.kampanyalarDesc')}
        action={<AccentLink href="/hizli-gonderim">{t('nav.hizli')}</AccentLink>}
      />

      {justReady ? (
        <Notice tone="success">{t('pages.kampanyalarReady')}</Notice>
      ) : null}

      <div className={`grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_380px]${justReady ? ' mt-3' : ''}`}>
        <div className="order-2 lg:order-1">
          <Card>
            <CardHeader
              title="Geçmiş"
              subtitle={
                campaigns.length === 0
                  ? 'Henüz kayıt yok'
                  : `${campaigns.length} kampanya · tıklayınca paylaşılan numaralar`
              }
            />

            {campaigns.length === 0 ? (
              <EmptyState
                title="Henüz kampanya yok"
                description={
                  listOptions.length === 0
                    ? 'Önce Kişiler’de bir liste oluşturun, sonra buradan kampanya başlatın. Tek seferlik için Hızlı gönderim yeterli.'
                    : connectedCount === 0
                      ? 'Liste hazır; gönderim için en az bir bağlı WhatsApp hattı gerekir. Hesaplar’dan QR veya eşleştirme kodu alın.'
                      : 'Sağdaki formdan liste, mesaj ve hat seçerek oluşturun. Tek seferlik için Hızlı gönderim yeterli.'
                }
                action={
                  listOptions.length === 0 ? (
                    <AccentLink href="/kisiler">Kişilere git</AccentLink>
                  ) : connectedCount === 0 ? (
                    <AccentLink href="/hesaplar">Hesaplara git</AccentLink>
                  ) : (
                    <AccentLink href="/hizli-gonderim">Hızlı gönderime git</AccentLink>
                  )
                }
              />
            ) : (
              <ul className="divide-y divide-hairline">
                {campaigns.map((campaign) => {
                  const done =
                    campaign.sent_count + campaign.failed_count + campaign.skipped_count
                  const total = Math.max(0, campaign.total_targets)
                  const hint = statusHint(campaign.status)

                  return (
                    <li key={campaign.id}>
                      <Link
                        href={`/kampanyalar/${campaign.id}#paylasilanlar`}
                        className="block px-3.5 py-2.5 transition-colors hover:bg-surface-raised"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold">{campaign.name}</p>
                            {hint ? (
                              <p className="mt-0.5 text-[11px] text-ink-faint">{hint}</p>
                            ) : null}
                          </div>
                          <StatusPill status={campaign.status} />
                        </div>

                        <div className="mt-2 flex items-center gap-2.5">
                          <Meter
                            value={done}
                            max={Math.max(1, total)}
                            tone={meterTone(campaign.status, campaign.failed_count)}
                          />
                          <span className="shrink-0 tabular text-[11px] text-ink-faint">
                            {done}/{total || '—'}
                          </span>
                        </div>

                        <p className="mt-1.5 text-[11.5px] text-ink-muted tabular">
                          {campaign.sent_count} gönderildi
                          {campaign.skipped_count > 0
                            ? ` · ${campaign.skipped_count} atlandı`
                            : ''}
                          {campaign.failed_count > 0
                            ? ` · ${campaign.failed_count} başarısız`
                            : ''}
                          {total > 0 ? ` · ${total} hedef` : ''}
                          <span className="text-ink-faint"> · paylaşılanlar →</span>
                        </p>

                        {campaign.stop_reason ? (
                          <p
                            className="mt-1.5 line-clamp-2 border border-danger/25 bg-danger/8 px-2 py-1 text-[11.5px] text-danger"
                            title={campaign.stop_reason}
                          >
                            <span className="font-medium">Durdurma nedeni:</span>{' '}
                            {campaign.stop_reason}
                          </p>
                        ) : null}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="order-1 lg:order-2">
          <NewCampaignForm
            lists={listOptions}
            accounts={accountOptions}
            userId={userId}
            aiEnabled={hasTextProvider()}
            brandName={brandResult.data?.name ?? undefined}
          />
        </div>
      </div>
    </>
  )
}
