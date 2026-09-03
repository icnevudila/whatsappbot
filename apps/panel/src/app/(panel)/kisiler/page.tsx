import { Card, CardHeader, EmptyState, Meter, PageHeader } from '@/components/ui'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ImportForm } from './import-form'
import { ListActions } from './list-actions'

export const dynamic = 'force-dynamic'

export default async function ContactsPage() {
  const supabase = await createSupabaseServerClient()

  const [listsResult, totalResult, validResult, invalidResult] = await Promise.all([
    supabase
      .from('contact_lists')
      .select('id, name, contact_count, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('contacts').select('id', { count: 'exact', head: true }),
    supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('wa_status', 'valid'),
    supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('wa_status', 'invalid'),
  ])

  const lists = listsResult.data ?? []
  const total = totalResult.count ?? 0
  const valid = validResult.count ?? 0
  const invalid = invalidResult.count ?? 0
  const pendingCheck = Math.max(0, total - valid - invalid)

  return (
    <>
      <PageHeader
        title="Kisiler"
        description="Numaralar E.164 bicimine cevrilir ve gonderim oncesi WhatsApp'ta kayitli olup olmadiklari kontrol edilir."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Listeler"
              subtitle={`${lists.length} liste · ${total} tekil numara`}
            />

            {lists.length === 0 ? (
              <EmptyState
                title="Henuz liste yok"
                description="Sag taraftaki formdan numaralarinizi yapistirarak ilk listenizi olusturun."
              />
            ) : (
              <ul className="divide-y divide-hairline">
                {lists.map((list) => (
                  <li
                    key={list.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">{list.name}</p>
                      <p className="mt-0.5 text-[11.5px] text-ink-muted tabular">
                        {list.contact_count} numara ·{' '}
                        {new Date(list.created_at).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <ListActions listId={list.id} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {total > 0 ? (
            <Card>
              <CardHeader
                title="WhatsApp dogrulama durumu"
                subtitle="Gonderim yalnizca dogrulanmis numaralara yapilir."
              />
              <div className="space-y-3 p-4">
                <div>
                  <div className="mb-1.5 flex items-baseline justify-between text-[11.5px]">
                    <span className="text-ink-muted">Dogrulanmis</span>
                    <span className="text-ink tabular">
                      {valid} / {total}
                    </span>
                  </div>
                  <Meter value={valid} max={total} />
                </div>

                <dl className="grid grid-cols-3 gap-3 border-t border-hairline pt-3">
                  <Stat label="Gecerli" value={valid} tone="text-accent" />
                  <Stat label="WhatsApp'ta yok" value={invalid} tone="text-danger" />
                  <Stat label="Bekliyor" value={pendingCheck} tone="text-ink-muted" />
                </dl>

                {pendingCheck > 0 ? (
                  <p className="text-[11.5px] text-ink-faint">
                    Dogrulama icin bagli bir WhatsApp hesabi gerekiyor. Hesap bagliysa
                    kontrol arka planda ilerler.
                  </p>
                ) : null}
              </div>
            </Card>
          ) : null}
        </div>

        <ImportForm />
      </div>
    </>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <dd className={`text-[17px] font-semibold tabular ${tone}`}>{value}</dd>
      <dt className="text-[11.5px] text-ink-muted">{label}</dt>
    </div>
  )
}
