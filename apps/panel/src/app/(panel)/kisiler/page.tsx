import type { Metadata } from 'next'
import Link from 'next/link'
import {
  AccentLink,
  Card,
  CardHeader,
  EmptyState,
  Meter,
  Notice,
  PageHeader,
  Pagination,
  QuietLink,
  Stat,
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
import { ImportForm } from './import-form'
import { ListActions } from './list-actions'
import { VerifyAllButton } from './verify-all-button'
import { WaCheckForm } from './wa-check-form'

export const metadata: Metadata = { title: 'Kişiler' }
export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Tab = 'kisiler' | 'gruplar'

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ sayfa?: string | string[]; sekme?: string | string[] }>
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
  const rawTab = Array.isArray(params.sekme) ? params.sekme[0] : params.sekme
  const tab: Tab = rawTab === 'gruplar' ? 'gruplar' : 'kisiler'

  const pageSize = tab === 'gruplar' ? PAGE_SIZES.lists : PAGE_SIZES.members
  const requestedPage = parsePage(params.sayfa)

  const [
    listsCountResult,
    totalResult,
    validResult,
    invalidResult,
    waCountResult,
    { messages },
  ] = await Promise.all([
    supabase
      .from('contact_lists')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .neq('source', 'quick_send'),
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
    supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('source', 'whatsapp'),
    getDictionary(),
  ])

  const listTotal = listsCountResult.count ?? 0
  const total = totalResult.count ?? 0
  const valid = validResult.count ?? 0
  const invalid = invalidResult.count ?? 0
  const whatsappCount = waCountResult.count ?? 0
  const pendingCheck = Math.max(0, total - valid - invalid)

  const t = createT(messages)

  const pages =
    tab === 'gruplar'
      ? totalPages(listTotal, pageSize)
      : totalPages(total, pageSize)
  const page = clampPage(requestedPage, pages)
  const { from, to } = rangeForPage(page, pageSize)

  const [{ data: listRows }, { data: contactRows }, { data: allGroups }] =
    await Promise.all([
      tab === 'gruplar'
        ? supabase
            .from('contact_lists')
            .select('id, name, contact_count, created_at, source')
            .eq('org_id', org.id)
            .neq('source', 'quick_send')
            .order('created_at', { ascending: false })
            .range(from, to)
        : Promise.resolve({ data: [] as { id: string; name: string; contact_count: number; created_at: string; source: string | null }[] }),
      tab === 'kisiler'
        ? supabase
            .from('contacts')
            .select('id, phone_e164, name, source, wa_status')
            .eq('org_id', org.id)
            .order('created_at', { ascending: false })
            .range(from, to)
        : Promise.resolve({ data: [] as { id: string; phone_e164: string; name: string | null; source: string | null; wa_status: string | null }[] }),
      supabase
        .from('contact_lists')
        .select('id, name')
        .eq('org_id', org.id)
        .neq('source', 'quick_send')
        .order('name'),
    ])

  const lists = listRows ?? []
  const contacts = contactRows ?? []
  const groups = allGroups ?? []

  const tabHref = (next: Tab) =>
    next === 'kisiler' ? '/kisiler' : '/kisiler?sekme=gruplar'

  return (
    <>
      <PageHeader
        title={t('pages.kisilerTitle')}
        description="Numaraları yönet, gruplara ayır, kampanyada seç."
        action={<AccentLink href="/hizli-gonderim">{t('nav.hizli')}</AccentLink>}
      />

      <div className="mb-2.5 flex gap-1 rounded-md border border-hairline bg-surface p-1">
        <TabLink href={tabHref('kisiler')} active={tab === 'kisiler'} label={`Kişiler (${total})`} />
        <TabLink
          href={tabHref('gruplar')}
          active={tab === 'gruplar'}
          label={`Gruplar (${listTotal})`}
        />
      </div>

      {tab === 'kisiler' ? (
        <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_300px]">
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
          <div className="space-y-2.5">
            <Card>
              <CardHeader
                title="Hazır numara grubu"
                subtitle="Scrape / mahalle araması için bize yazın."
              />
              <div className="space-y-2 p-3.5">
                <Notice tone="warn">
                  Ücretli liste işleri anlaşmaya göre açılır — Excel’i kendiniz de
                  yükleyebilirsiniz.
                </Notice>
                <a
                  href={contactMailto('Kişi grubu / arama talebi')}
                  className="inline-flex text-[13px] font-semibold text-accent underline-offset-2 hover:underline"
                >
                  {CONTACT_EMAIL}
                </a>
              </div>
            </Card>
            {total > 0 ? (
              <Card>
                <CardHeader
                  title="WhatsApp kontrolü"
                  subtitle="✓ kayıtlı · × yok · ? bekliyor"
                />
                <div className="space-y-2.5 p-3.5">
                  <Meter value={valid} max={Math.max(1, total)} />
                  <dl className="grid grid-cols-3 gap-2">
                    <Stat label="✓" value={valid} tone="accent" />
                    <Stat label="×" value={invalid} tone="danger" />
                    <Stat label="?" value={pendingCheck} tone="muted" />
                  </dl>
                  <VerifyAllButton />
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <CardHeader
              title="Gruplar"
              subtitle={
                listTotal === 0
                  ? 'Kampanyada seçeceğiniz numaralar'
                  : `${listTotal} grup · sayfa ${page}/${pages}`
              }
            />
            {listTotal === 0 ? (
              <EmptyState
                tone="people"
                title="Henüz grup yok"
                description="Sağdan Excel veya numara yapıştırarak grup oluşturun."
                action={<AccentLink href="#liste-olustur">Grup oluştur</AccentLink>}
              />
            ) : (
              <>
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
                          <p className="truncate text-[13px] font-medium">{list.name}</p>
                          <p className="mt-0.5 text-[11.5px] text-ink-muted tabular">
                            {list.contact_count} numara ·{' '}
                            {new Date(list.created_at).toLocaleDateString('tr-TR')}
                          </p>
                        </Link>
                        <ListActions listId={list.id} />
                      </div>
                    </li>
                  ))}
                </ul>
                <Pagination
                  page={page}
                  totalPages={pages}
                  label={`${listTotal} grup`}
                  hrefForPage={(p) =>
                    buildPageHref('/kisiler', p, { sekme: 'gruplar' })
                  }
                />
              </>
            )}
          </Card>

          <div className="space-y-2.5" id="liste-olustur">
            <WaCheckForm />
            <ImportForm />
            <QuietLink href="/kampanyalar">Kampanyaya git →</QuietLink>
          </div>
        </div>
      )}
    </>
  )
}

function TabLink({
  href,
  active,
  label,
}: {
  href: string
  active: boolean
  label: string
}) {
  return (
    <Link
      href={href}
      className={`flex-1 rounded-sm px-3 py-2 text-center text-[13px] font-semibold transition-colors ${
        active
          ? 'bg-accent text-white'
          : 'text-ink-muted hover:bg-surface-raised hover:text-ink'
      }`}
    >
      {label}
    </Link>
  )
}
