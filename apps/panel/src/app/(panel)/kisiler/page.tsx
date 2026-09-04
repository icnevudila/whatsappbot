import { AccentLink, Card, CardHeader, EmptyState, Meter, PageHeader, Stat } from '@/components/ui'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ImportForm } from './import-form'
import { ListActions } from './list-actions'

export const dynamic = 'force-dynamic'

export default async function ContactsPage() {
  const supabase = await createSupabaseServerClient()

  const [listsResult, totalResult, validResult, invalidResult] = await Promise.all([
    supabase
      .from('contact_lists')
      .select('id, name, contact_count, created_at, source')
      .neq('source', 'quick_send')
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
        title="Kişiler"
        description="Tekrar kullanılacak numaraları listeler halinde tutun. Tek seferlik gönderimler için Hızlı gönderim kullanın — o gönderimler burada liste oluşturmaz."
        action={<AccentLink href="/hizli-gonderim">Hızlı gönderim</AccentLink>}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="order-2 space-y-4 lg:order-1">
          <Card>
            <CardHeader
              title="Listeler"
              subtitle={`${lists.length} liste · ${total} tekil numara defteri`}
            />

            {lists.length === 0 ? (
              <EmptyState
                title="Henüz liste yok"
                description="Kampanyalarda tekrar kullanacağınız numaraları sağdaki (mobilde üstteki) formdan ekleyin. Tek seferlik mesaj için Hızlı gönderim yeterli."
                action={<AccentLink href="/hizli-gonderim">Hızlı gönderime git</AccentLink>}
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
                title="WhatsApp doğrulama durumu"
                subtitle="Gönderim yalnızca doğrulanmış veya gönderim anında kontrol edilen numaralara yapılır. Kayıtsız numaraya denemek kısıt riskini artırır."
              />
              <div className="space-y-3 p-4">
                <div>
                  <div className="mb-1.5 flex items-baseline justify-between text-[11.5px]">
                    <span className="text-ink-muted">Doğrulanmış</span>
                    <span className="text-ink tabular">
                      {valid} / {total}
                    </span>
                  </div>
                  <Meter value={valid} max={total} />
                </div>

                <dl className="grid grid-cols-3 gap-3 border-t border-hairline pt-3">
                  <Stat label="Geçerli" value={valid} tone="accent" />
                  <Stat label="WhatsApp’ta yok" value={invalid} tone="danger" />
                  <Stat label="Bekliyor" value={pendingCheck} tone="muted" />
                </dl>

                {pendingCheck > 0 ? (
                  <p className="text-[11.5px] text-ink-faint">
                    Doğrulama için bağlı bir WhatsApp hattı gerekir. Hat bağlıysa
                    kontrol arka planda ilerler; büyük listelerde birkaç dakika
                    sürebilir.
                  </p>
                ) : null}
              </div>
            </Card>
          ) : null}
        </div>

        <div className="order-1 lg:order-2" id="liste-olustur">
          <ImportForm />
        </div>
      </div>
    </>
  )
}
