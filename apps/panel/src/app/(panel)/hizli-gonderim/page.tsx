import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AccentLink, Card, CardHeader, EmptyState, PageHeader, QuietLink, StatusPill } from '@/components/ui'
import { hasTextProvider } from '@/lib/ai/text'
import { remainingToday } from '@/lib/capacity'
import { createT } from '@/lib/i18n'
import { getDictionary } from '@/lib/i18n/server'
import { requireActiveOrg } from '@/lib/org'
import { QuickSendForm, type SenderOption } from './quick-send-form'

export const metadata: Metadata = { title: 'Hızlı gönderim' }

export default async function QuickSendPage({
  searchParams,
}: {
  searchParams: Promise<{ media?: string | string[]; tel?: string | string[] }>
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
  const mediaParam = params.media
  const initialMediaUrl = Array.isArray(mediaParam) ? mediaParam[0] ?? '' : mediaParam ?? ''
  const telParam = params.tel
  const initialNumbers = Array.isArray(telParam)
    ? telParam.filter(Boolean).join('\n')
    : telParam
      ? telParam.split(',').map((p) => p.trim()).filter(Boolean).join('\n')
      : ''

  const [{ data: accounts }, brandResult, recentResult, { messages }] = await Promise.all([
    supabase
      .from('accounts')
      .select(
        'id, label, phone_e164, daily_send_limit, sent_today, sent_today_on, warmup_started_at, new_chat_quota_total, new_chat_quota_used',
      )
      .eq('org_id', org.id)
      .eq('status', 'connected')
      .eq('enabled', true)
      .eq('is_locked', false)
      .order('created_at'),
    supabase.from('brand_kits').select('name').eq('org_id', org.id).limit(1).maybeSingle(),
    supabase
      .from('campaigns')
      .select('id, name, status, total_targets, sent_count, created_at')
      .eq('org_id', org.id)
      .or('name.like.Hızlı gönderim%,name.like.Hizli gonderim%')
      .order('created_at', { ascending: false })
      .limit(8),
    getDictionary(),
  ])

  const t = createT(messages)
  const senders: SenderOption[] = (accounts ?? []).map((account) => ({
    id: account.id,
    label: account.label,
    phone: account.phone_e164,
    remainingToday: remainingToday(account),
  }))

  const recent = recentResult.data ?? []

  return (
    <>
      <PageHeader
        title={t('pages.hizliTitle')}
        description="Numaraları yapıştırıp hemen gönderin. Liste oluşturmaz; takip Kampanyalar’da. Tekrar için Kişiler’e liste ekleyin."
        action={
          <div className="flex flex-wrap gap-2">
            <AccentLink href="/kampanyalar">{t('nav.kampanyalar')}</AccentLink>
            <QuietLink href="/kisiler">{t('nav.kisiler')}</QuietLink>
          </div>
        }
      />

      {senders.length === 0 ? (
        <Card>
          <EmptyState
            title="Önce bir hat bağlayın"
            description="En az bir bağlı WhatsApp hattı gerekir. Hesaplar’dan QR okutun veya telefonla eşleştirme kodu alın."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <AccentLink href="/hesaplar">Hesaplara git</AccentLink>
                <QuietLink href="/durum">Durumu kontrol et</QuietLink>
              </div>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <QuickSendForm
            senders={senders}
            userId={userId}
            aiEnabled={hasTextProvider()}
            brandName={brandResult.data?.name ?? undefined}
            initialMediaUrl={initialMediaUrl}
            initialNumbers={initialNumbers}
          />

          <aside className="space-y-2.5">
            <Card>
              <div className="p-3.5">
                <h2 className="text-[13px] font-semibold text-ink">Ne zaman ne kullanılır?</h2>
                <ul className="mt-2 space-y-2 text-[12px] leading-relaxed text-ink-muted">
                  <li>
                    <span className="font-medium text-ink">Hızlı gönderim</span> — tek seferlik;
                    numarayı yapıştırıp gönderin. Sonuç Kampanyalar’da görünür.
                  </li>
                  <li>
                    <span className="font-medium text-ink">Kişiler</span> — tekrar kullanılacak
                    listeler (bölge, müşteri grubu).{' '}
                    <Link
                      href="/kisiler"
                      className="font-medium text-accent underline underline-offset-2"
                    >
                      Liste ekle
                    </Link>
                  </li>
                  <li>
                    <span className="font-medium text-ink">Kampanyalar</span> — listeden seçip
                    planlı veya çok hatlı gönderim.{' '}
                    <Link
                      href="/kampanyalar"
                      className="font-medium text-accent underline underline-offset-2"
                    >
                      Kampanya oluştur
                    </Link>
                  </li>
                </ul>
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Son hızlı gönderimler"
                subtitle="Detay, hatalar ve numara satırları için kampanya sayfasını açın."
              />
              {recent.length === 0 ? (
                <EmptyState
                  title="Henüz gönderim yok"
                  description="İlk hızlı gönderiminiz burada listelenir. Detay Kampanyalar’da."
                  action={<QuietLink href="/kampanyalar">Kampanyalara bak</QuietLink>}
                />
              ) : (
                <ul className="divide-y divide-hairline">
                  {recent.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/kampanyalar/${item.id}`}
                        className="flex flex-col gap-1 px-3.5 py-2.5 transition-colors hover:bg-surface-raised"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-[12.5px] text-ink">{item.name}</span>
                          <StatusPill status={item.status} />
                        </span>
                        <span className="tabular text-[11px] text-ink-faint">
                          {item.sent_count}/{item.total_targets} gitti ·{' '}
                          {new Date(item.created_at).toLocaleString('tr-TR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </aside>
        </div>
      )}
    </>
  )
}
