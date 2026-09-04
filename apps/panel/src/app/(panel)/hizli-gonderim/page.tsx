import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AccentLink, EmptyState, PageHeader } from '@/components/ui'
import { hasTextProvider } from '@/lib/ai/text'
import { remainingToday } from '@/lib/capacity'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { QuickSendForm, type SenderOption } from './quick-send-form'

export const metadata: Metadata = { title: 'Hizli gonderim' }

export default async function QuickSendPage({
  searchParams,
}: {
  searchParams: Promise<{ media?: string | string[] }>
}) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/giris')

  const params = await searchParams
  const mediaParam = params.media
  const initialMediaUrl = Array.isArray(mediaParam) ? mediaParam[0] ?? '' : mediaParam ?? ''

  const [{ data: accounts }, brandResult, recentResult] = await Promise.all([
    supabase
      .from('accounts')
      .select(
        'id, label, phone_e164, daily_send_limit, sent_today, sent_today_on, warmup_started_at, new_chat_quota_total, new_chat_quota_used',
      )
      .eq('status', 'connected')
      .eq('enabled', true)
      .eq('is_locked', false)
      .order('created_at'),
    supabase.from('brand_kits').select('name').limit(1).maybeSingle(),
    supabase
      .from('campaigns')
      .select('id, name, status, total_targets, sent_count, created_at')
      .like('name', 'Hizli gonderim%')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

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
        title="Hizli gonderim"
        description="Numaralari yapistirip hemen gonderin. Bu ekran liste olusturmaz; takip Kampanyalar'da olur. Tekrar kullanacaginiz numaralar icin Kisiler'e liste ekleyin."
      />

      {senders.length === 0 ? (
        <div className="rounded-[10px] border border-hairline bg-surface">
          <EmptyState
            title="Once bir hat baglayin"
            description="Hizli gonderim icin en az bir bagli WhatsApp hatti gerekiyor. Hesaplar sekmesinden QR okutun veya telefon numarasiyla eslestirme kodu alin."
            action={<AccentLink href="/hesaplar">Hesaplara git</AccentLink>}
          />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <QuickSendForm
            senders={senders}
            userId={user.id}
            aiEnabled={hasTextProvider()}
            brandName={brandResult.data?.name ?? undefined}
            initialMediaUrl={initialMediaUrl}
          />

          <aside className="space-y-4">
            <div className="rounded-[10px] border border-hairline bg-surface p-4">
              <h2 className="text-[13px] font-medium">Ne zaman ne kullanilir?</h2>
              <ul className="mt-3 space-y-2.5 text-[12px] leading-relaxed text-ink-muted">
                <li>
                  <span className="font-medium text-ink">Hizli gonderim</span> — tek sefer,
                  yapistir ve gonder. Sonuc Kampanyalar'da.
                </li>
                <li>
                  <span className="font-medium text-ink">Kisiler</span> — tekrar
                  kullanilacak listeler (bolge, musteri grubu).
                </li>
                <li>
                  <span className="font-medium text-ink">Kampanyalar</span> — listeden secip
                  planli / cok hatli gonderim.
                </li>
              </ul>
            </div>

            <div className="rounded-[10px] border border-hairline bg-surface">
              <div className="border-b border-hairline px-4 py-3">
                <h2 className="text-[13px] font-medium">Son hizli gonderimler</h2>
                <p className="mt-0.5 text-[11.5px] text-ink-faint">
                  Detay ve numaralar icin kampanya sayfasina gidin.
                </p>
              </div>
              {recent.length === 0 ? (
                <p className="px-4 py-6 text-[12px] text-ink-faint">Henuz gonderim yok.</p>
              ) : (
                <ul className="divide-y divide-hairline">
                  {recent.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/kampanyalar/${item.id}`}
                        className="flex flex-col gap-0.5 px-4 py-3 transition-colors hover:bg-surface-raised"
                      >
                        <span className="truncate text-[12.5px] text-ink">{item.name}</span>
                        <span className="tabular text-[11px] text-ink-faint">
                          {item.sent_count}/{item.total_targets} gitti · {item.status} ·{' '}
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
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
