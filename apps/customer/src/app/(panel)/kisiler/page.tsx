import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Pagination,
} from '@/components/ui'
import { redirect } from 'next/navigation'
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
import { contactSearchOrFilter, sanitizeContactSearch } from './contact-search'
import { ContactsBoard, type ContactRow } from './contacts-board'
import { ListActions } from './list-actions'
import { NewGroupButton } from './new-group-form'
import { AddPersonButton } from './add-person-modal'
import { ListRequestButton } from './list-request-modal'
import { RehberSyncButton } from './rehber-sync-modal'
import { VerifyAllButton, ContactsHeaderMenu } from './verify-all-button'
import { getSetupProgress } from '@/lib/setup-progress'
import { SetupBanner } from '../setup-banner'

export const metadata: Metadata = { title: 'Kişiler' }
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function SegmentLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      className={`rounded-[5px] px-3 py-1.5 text-[12.5px] font-semibold ${
        active ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted'
      }`}
    >
      {children}
    </Link>
  )
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{
    sayfa?: string | string[]
    gorunum?: string | string[]
    ara?: string | string[]
    durum?: string | string[]
  }>
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
  const viewRaw = Array.isArray(params.gorunum) ? params.gorunum[0] : params.gorunum
  const view = viewRaw === 'defter' ? 'defter' : 'gruplar'
  const statusRaw = Array.isArray(params.durum) ? params.durum[0] : params.durum
  const statusFilter = statusRaw === 'var' || statusRaw === 'yok' || statusRaw === 'bekleyen' ? statusRaw : 'tum'
  const searchQuery = sanitizeContactSearch(
    Array.isArray(params.ara) ? params.ara[0] ?? '' : params.ara ?? '',
  )
  const searchOr = view === 'defter' ? contactSearchOrFilter(searchQuery) : null
  const pageSize = PAGE_SIZES.members
  const requestedPage = parsePage(params.sayfa)

  const [totalResult, waValidResult, waInvalidResult, waCountResult, listsResult, accountsResult, setup, { messages }] =
    await Promise.all([
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
    supabase
      .from('contact_lists')
      .select('id, name, contact_count, created_at, source')
      .eq('org_id', org.id)
      .neq('source', 'quick_send')
      .order('created_at', { ascending: false }),
    supabase
      .from('accounts')
      .select('id, label, phone_e164, status')
      .eq('org_id', org.id)
      .order('created_at', { ascending: true }),
    getSetupProgress(org.id),
    getDictionary(),
  ])

  const total = totalResult.count ?? 0
  const validCount = waValidResult.count ?? 0
  const invalidCount = waInvalidResult.count ?? 0
  const unknownCount = Math.max(0, total - (validCount + invalidCount))
  const whatsappCount = waCountResult.count ?? 0
  const lists = listsResult.data ?? []
  const rehberAccounts = accountsResult.data ?? []
  const listTotal = lists.length
  const t = createT(messages)

  let matchTotal = total
  if (view === 'defter') {
    if (searchOr || statusFilter !== 'tum') {
      let countQ = supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
      if (searchOr) countQ = countQ.or(searchOr)
      if (statusFilter === 'var') countQ = countQ.eq('wa_status', 'valid')
      else if (statusFilter === 'yok') countQ = countQ.eq('wa_status', 'invalid')
      else if (statusFilter === 'bekleyen') countQ = countQ.not('wa_status', 'in', '("valid","invalid")')
      const { count: matchCount } = await countQ
      matchTotal = matchCount ?? 0
    }
  }

  const pages = totalPages(matchTotal, pageSize)
  const page = clampPage(requestedPage, pages)
  const { from, to } = rangeForPage(page, pageSize)

  let contacts: ContactRow[] = []

  if (view === 'defter') {
    let q = supabase
      .from('contacts')
      .select('id, phone_e164, name, source, wa_status')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })
    if (searchOr) q = q.or(searchOr)
    if (statusFilter === 'var') q = q.eq('wa_status', 'valid')
    else if (statusFilter === 'yok') q = q.eq('wa_status', 'invalid')
    else if (statusFilter === 'bekleyen') q = q.not('wa_status', 'in', '("valid","invalid")')
    const { data } = await q.range(from, to)
    contacts = data ?? []
  }

  const groups = lists.map((list) => ({ id: list.id, name: list.name }))

  return (
    <>
      <PageHeader
        title={t('pages.kisilerTitle')}
        description={`${listTotal} grup · ${total} numara`}
      />

      <SetupBanner progress={setup} />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border border-hairline bg-canvas p-0.5">
          <SegmentLink href="/kisiler" active={view === 'gruplar'}>
            Gruplar
          </SegmentLink>
          <SegmentLink href="/kisiler?gorunum=defter" active={view === 'defter'}>
            Kişiler
          </SegmentLink>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <ListRequestButton />
          <AddPersonButton groups={lists.map((list) => ({ id: list.id, name: list.name }))} />
          <NewGroupButton />
        </div>
      </div>

      <div className="space-y-3">
      {view === 'gruplar' ? (
        <>
        <Card>
          <CardHeader
            title="Kampanya grupları"
            subtitle={listTotal === 0 ? 'Önce grup oluştur' : `${listTotal} grup`}
          />
          {listTotal === 0 ? (
            <EmptyState
              tone="people"
              title="Grup yok"
              description="+ Grup ile Excel yükleyin veya boş açın."
            />
          ) : (
            <ul className="divide-y divide-hairline">
              {lists.map((list) => (
                <li key={list.id} className="px-3.5 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/kisiler/${list.id}`}
                      className="min-w-0 flex-1 transition-colors hover:text-accent"
                    >
                      <p className="truncate text-[13.5px] font-semibold text-ink">
                        {list.name}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-ink-muted tabular">
                        {list.contact_count} numara
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
          <CardHeader
            title="WhatsApp rehberi"
            subtitle="Bağlı hattan kişi ve sohbet numaralarını çekin"
          />
          <div className="space-y-3 px-3.5 py-3">
            <p className="text-[13px] leading-relaxed text-ink-muted">
              WhatsApp rehberini içeri aktar.
            </p>
            <RehberSyncButton accounts={rehberAccounts} className="w-full sm:w-auto" />
          </div>
        </Card>
        </>
      ) : (
        <Card>
          <CardHeader
            title="Kişiler"
            subtitle={
              searchQuery
                ? `“${searchQuery}” · ${matchTotal} sonuç / ${total} numara`
                : `${total} numara · ${validCount} WhatsApp'ta var · ${invalidCount} yok`
            }
            action={
              <div className="flex shrink-0 items-center gap-1">
                {total > 0 ? (
                  <VerifyAllButton
                    total={total}
                    validCount={validCount}
                    invalidCount={invalidCount}
                    unknownCount={unknownCount}
                    currentStatus={statusFilter}
                    searchQuery={searchQuery}
                  />
                ) : null}
                <ContactsHeaderMenu disabled={total === 0} whatsappCount={whatsappCount} />
              </div>
            }
          />
          <ContactsBoard
            contacts={contacts}
            groups={groups}
            searchQuery={searchQuery}
          />
          <Pagination
            page={page}
            totalPages={pages}
            label={
              statusFilter !== 'tum'
                ? `${matchTotal} kişi (${statusFilter === 'var' ? 'WhatsApp var' : statusFilter === 'yok' ? 'WhatsApp yok' : 'Doğrulanmamış'})`
                : searchQuery
                  ? `${matchTotal} sonuç`
                  : `${total} kişi`
            }
            hrefForPage={(p) =>
              buildPageHref('/kisiler', p, {
                gorunum: 'defter',
                ara: searchQuery || undefined,
                durum: statusFilter !== 'tum' ? statusFilter : undefined,
              })
            }
          />
        </Card>
      )}
      </div>
    </>
  )
}
