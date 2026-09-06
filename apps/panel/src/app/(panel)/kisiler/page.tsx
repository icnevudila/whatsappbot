import type { Metadata } from 'next'
import Link from 'next/link'
import {
  AccentLink,
  Card,
  CardHeader,
  EmptyState,
  Notice,
  PageHeader,
  Pagination,
} from '@/components/ui'
import { redirect } from 'next/navigation'
import { createT } from '@/lib/i18n'
import { getDictionary } from '@/lib/i18n/server'
import { CONTACT_EMAIL, contactMailto } from '@/lib/contact'
import { requireActiveOrg } from '@/lib/org'
import {
  PAGE_SIZES,
  buildPageHref,
  clampPage,
  parsePage,
  rangeForPage,
  totalPages,
} from '@/lib/pagination'
import { ContactsBoard } from './contacts-board'
import { CreateGroupForm } from './create-group-form'
import { ImportForm } from './import-form'
import { ListActions } from './list-actions'

export const metadata: Metadata = { title: 'Kişiler' }
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ sayfa?: string | string[] }>
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
  const pageSize = PAGE_SIZES.members
  const requestedPage = parsePage(params.sayfa)

  const [totalResult, waCountResult, listsResult, { messages }] = await Promise.all([
    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
    supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('source', 'whatsapp'),
    supabase
      .from('contact_lists')
      .select('id, name, contact_count, created_at, source')
      .eq('org_id', org.id)
      .neq('source', 'quick_send')
      .order('created_at', { ascending: false }),
    getDictionary(),
  ])

  const total = totalResult.count ?? 0
  const whatsappCount = waCountResult.count ?? 0
  const lists = listsResult.data ?? []
  const listTotal = lists.length
  const t = createT(messages)

  const pages = totalPages(total, pageSize)
  const page = clampPage(requestedPage, pages)
  const { from, to } = rangeForPage(page, pageSize)

  const { data: contactRows } = await supabase
    .from('contacts')
    .select('id, phone_e164, name, source, wa_status')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })
    .range(from, to)

  const contacts = contactRows ?? []
  const groups = lists.map((list) => ({ id: list.id, name: list.name }))

  return (
    <>
      <PageHeader
        title={t('pages.kisilerTitle')}
        description="Defterdeki tüm numaralar ve kampanya grupları. Seç → gruba ekle / çıkar / sil."
        action={<AccentLink href="/kampanyalar#yeni-kampanya">Kampanya oluştur</AccentLink>}
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <Card>
          <CardHeader
            title="Tüm kişiler"
            subtitle={`${total} numara · sayfa ${page}/${pages}`}
          />
          <ContactsBoard
            contacts={contacts}
            groups={groups}
            whatsappCount={whatsappCount}
          />
          <Pagination
            page={page}
            totalPages={pages}
            label={`${total} kişi`}
            hrefForPage={(p) => buildPageHref('/kisiler', p)}
          />
        </Card>

        <div className="space-y-3" id="gruplar">
          <Card>
            <CardHeader
              title="Gruplar"
              subtitle={
                listTotal === 0
                  ? 'Kampanyada seçeceğin numaralar'
                  : `${listTotal} grup · düzenlemek için tıkla`
              }
            />
            {listTotal === 0 ? (
              <EmptyState
                tone="people"
                title="Henüz grup yok"
                description="Aşağıdan boş grup aç veya Excel ile oluştur."
              />
            ) : (
              <ul className="divide-y divide-hairline">
                {lists.map((list) => (
                  <li key={list.id} className="px-3.5 py-2.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Link
                        href={`/kisiler/${list.id}`}
                        className="min-w-0 flex-1 transition-colors hover:text-accent"
                      >
                        <p className="truncate text-[13.5px] font-semibold text-ink">
                          {list.name}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-ink-muted tabular">
                          {list.contact_count} numara · düzenle / çıkar / sil
                        </p>
                      </Link>
                      <ListActions listId={list.id} compact />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Yeni grup" subtitle="Boş aç veya Excel ile doldur" />
            <div className="space-y-3 p-3.5">
              <CreateGroupForm />
              <div className="border-t border-hairline pt-3">
                <ImportForm embedded />
              </div>
            </div>
          </Card>

          <Notice tone="accent">
            Hazır mahalle listesi / scrape için{' '}
            <a
              href={contactMailto('Kişi grubu talebi')}
              className="font-semibold underline underline-offset-2"
            >
              {CONTACT_EMAIL}
            </a>
          </Notice>
        </div>
      </div>
    </>
  )
}
