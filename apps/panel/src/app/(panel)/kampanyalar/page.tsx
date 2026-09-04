import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AccentLink, Card, CardHeader, EmptyState, Meter, PageHeader, StatusPill } from '@/components/ui'
import { hasTextProvider } from '@/lib/ai/text'
import { requireActiveOrg } from '@/lib/org'
import { NewCampaignForm } from './new-campaign-form'

export const dynamic = 'force-dynamic'

export default async function CampaignsPage() {
  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireActiveOrg())
  } catch {
    redirect('/giris')
  }

  const [campaignsResult, listsResult, accountsResult, brandResult] = await Promise.all([
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
  ])

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

  return (
    <>
      <PageHeader
        title="Kampanyalar"
        description="Listeden seçip gönderin. Oluşturunca hemen başlar; duraklatabilir veya durdurabilirsiniz. Canlı ilerleme ve numara satırları kampanya detayında."
        action={<AccentLink href="/hizli-gonderim">Hızlı gönderim</AccentLink>}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="order-2 lg:order-1">
        <Card>
          <CardHeader title="Geçmiş" subtitle={`${campaigns.length} kampanya`} />

          {campaigns.length === 0 ? (
            <EmptyState
              title="Henüz kampanya yok"
              description="Sağdaki formu doldurun: liste + mesaj + hat seçimi. Tek seferlik için numaraları yapıştırmak yeterliyse Hızlı gönderim daha hızlıdır."
              action={<AccentLink href="/hizli-gonderim">Hızlı gönderime git</AccentLink>}
            />
          ) : (
            <ul className="divide-y divide-hairline">
              {campaigns.map((campaign) => {
                const done =
                  campaign.sent_count + campaign.failed_count + campaign.skipped_count

                return (
                  <li key={campaign.id}>
                    <Link
                      href={`/kampanyalar/${campaign.id}`}
                      className="block px-4 py-3 transition-colors hover:bg-surface-raised"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate text-[13px] font-medium">
                          {campaign.name}
                        </p>
                        <StatusPill status={campaign.status} />
                      </div>

                      <div className="mt-2">
                        <Meter
                          value={done}
                          max={Math.max(1, campaign.total_targets)}
                          tone={campaign.status === 'stopped' ? 'danger' : 'accent'}
                        />
                      </div>

                      <p className="mt-1.5 text-[11.5px] text-ink-muted tabular">
                        {campaign.sent_count} gönderildi
                        {campaign.skipped_count > 0
                          ? ` · ${campaign.skipped_count} atlandı`
                          : ''}
                        {campaign.failed_count > 0
                          ? ` · ${campaign.failed_count} başarısız`
                          : ''}
                        {campaign.total_targets > 0 ? ` · ${campaign.total_targets} hedef` : ''}
                      </p>

                      {campaign.stop_reason ? (
                        <p className="mt-1 text-[11.5px] text-danger">
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
