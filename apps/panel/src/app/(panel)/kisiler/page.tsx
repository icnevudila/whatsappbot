import type { Metadata } from 'next'
import Link from 'next/link'
import { AccentLink, Card, CardHeader, EmptyState, Meter, PageHeader, QuietLink, Stat } from '@/components/ui'
import { redirect } from 'next/navigation'
import { createT } from '@/lib/i18n'
import { getDictionary } from '@/lib/i18n/server'
import { requireActiveOrg } from '@/lib/org'
import { DiscoverForm } from './discover-form'
import { ImportForm } from './import-form'
import { ListActions } from './list-actions'
import { ScrapeForm } from './scrape-form'
import { VerifyAllButton } from './verify-all-button'
import { WaCheckForm } from './wa-check-form'

export const metadata: Metadata = { title: 'Kişiler' }
export const dynamic = 'force-dynamic'
/** Web tarayıcı sunucu aksiyonu için Vercel süre limiti */
export const maxDuration = 60

export default async function ContactsPage() {
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

  const [listsResult, totalResult, validResult, invalidResult, { messages }] = await Promise.all([
    supabase
      .from('contact_lists')
      .select('id, name, contact_count, created_at, source')
      .eq('org_id', org.id)
      .neq('source', 'quick_send')
      .order('created_at', { ascending: false }),
    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
    supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('wa_status', 'valid'),
    supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('wa_status', 'invalid'),
    getDictionary(),
  ])

  const t = createT(messages)
  const lists = listsResult.data ?? []
  const total = totalResult.count ?? 0
  const valid = validResult.count ?? 0
  const invalid = invalidResult.count ?? 0
  const pendingCheck = Math.max(0, total - valid - invalid)

  return (
    <>
      <PageHeader
        title={t('pages.kisilerTitle')}
        description={t('pages.kisilerDesc')}
        action={<AccentLink href="/hizli-gonderim">{t('nav.hizli')}</AccentLink>}
      />

      <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="order-2 space-y-2.5 lg:order-1">
          <Card>
            <CardHeader
              title="Listeler"
              subtitle={`${lists.length} liste · ${total} tekil numara`}
            />

            {lists.length === 0 ? (
              <EmptyState
                tone="people"
                title="Henüz liste yok"
                description="Kampanyalarda tekrar kullanacağınız numaraları formdan liste olarak ekleyin. Tek seferlik için Hızlı gönderim yeterli."
                action={
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <AccentLink href="#liste-olustur">Liste oluştur</AccentLink>
                    <QuietLink href="/hizli-gonderim">Hızlı gönderim</QuietLink>
                  </div>
                }
              />
            ) : (
              <ul className="wb-list-scroll divide-y divide-hairline">
                {lists.map((list, index) => (
                  <li
                    key={list.id}
                    className="wb-list-row wb-row-enter"
                    style={{ animationDelay: `${Math.min(index, 12) * 28}ms` }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5">
                      <Link
                        href={`/kisiler/${list.id}`}
                        className="min-w-0 flex-1 transition-colors hover:text-accent"
                      >
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[13px] font-medium">{list.name}</p>
                          <SourceChip source={list.source} />
                        </div>
                        <p className="mt-0.5 text-[11.5px] text-ink-muted tabular">
                          {list.contact_count} numara ·{' '}
                          {new Date(list.created_at).toLocaleDateString('tr-TR')}
                          {' · '}
                          <span className="text-ink-faint">detay</span>
                        </p>
                      </Link>
                      <ListActions listId={list.id} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {total > 0 ? (
            <Card>
              <CardHeader
                title="WhatsApp doğrulama durumu"
                subtitle="Defter geneli: ✓ var · × yok · ? bekliyor. Kayıtsız numaraya mesaj denemez."
              />
              <div className="space-y-2.5 p-3.5">
                <div>
                  <div className="mb-1.5 flex items-baseline justify-between text-[11.5px]">
                    <span className="text-ink-muted">Doğrulanmış</span>
                    <span className="text-ink tabular">
                      {valid} / {total}
                    </span>
                  </div>
                  <Meter value={valid} max={total} />
                </div>

                <dl className="grid grid-cols-3 gap-2.5 border-t border-hairline pt-2.5">
                  <Stat label="✓ Var" value={valid} tone="accent" />
                  <Stat label="× Yok" value={invalid} tone="danger" />
                  <Stat label="? Bekliyor" value={pendingCheck} tone="muted" />
                </dl>

                <VerifyAllButton />
              </div>
            </Card>
          ) : null}
        </div>

        <div className="order-1 space-y-2.5 lg:order-2" id="liste-olustur">
          <WaCheckForm />
          <DiscoverForm />
          <ScrapeForm />
          <ImportForm />
        </div>
      </div>
    </>
  )
}

function SourceChip({ source }: { source: string | null }) {
  const meta =
    source === 'scraper'
      ? { label: 'web', className: 'border-accent/30 bg-accent-soft text-accent-dim' }
      : source === 'maps'
        ? { label: 'yerel', className: 'border-ok/30 bg-ok-soft text-ok-dim' }
        : { label: 'csv', className: 'border-hairline bg-surface-raised text-ink-muted' }

  return (
    <span
      className={`inline-flex shrink-0 rounded-sm border px-1.5 py-px text-[10.5px] font-semibold uppercase tracking-wide ${meta.className}`}
    >
      {meta.label}
    </span>
  )
}
