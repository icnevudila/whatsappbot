import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  AccentLink,
  Card,
  PageHeader,
  Pagination,
} from '@/components/ui'
import { requireActiveOrg } from '@/lib/org'
import {
  PAGE_SIZES,
  buildPageHref,
  clampPage,
  parsePage,
  rangeForPage,
  totalPages,
} from '@/lib/pagination'
import { ListActions } from '../list-actions'
import { MemberActions, type MemberRow } from './member-actions'
import { MembersPanelHeader } from './members-toolbar'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  try {
    const { org, supabase } = await requireActiveOrg()
    const { data } = await supabase
      .from('contact_lists')
      .select('name')
      .eq('id', id)
      .eq('org_id', org.id)
      .maybeSingle()
    return { title: data?.name ? `Grup · ${data.name}` : 'Grup' }
  } catch {
    return { title: 'Grup' }
  }
}

export default async function ContactListDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    sayfa?: string | string[]
    durum?: string | string[]
  }>
}) {
  const { id } = await params
  const query = await searchParams
  const { org, supabase } = await requireActiveOrg()

  const statusRaw = Array.isArray(query.durum) ? query.durum[0] : query.durum
  const statusFilter =
    statusRaw === 'var' || statusRaw === 'yok' || statusRaw === 'bekleyen' ? statusRaw : 'tum'

  const [listResult, validResult, invalidResult] = await Promise.all([
    supabase
      .from('contact_lists')
      .select('id, name, contact_count, created_at, source, description')
      .eq('id', id)
      .eq('org_id', org.id)
      .maybeSingle(),
    supabase
      .from('contact_list_members')
      .select('contact_id, contacts!inner(id)', { count: 'exact', head: true })
      .eq('list_id', id)
      .eq('org_id', org.id)
      .eq('contacts.wa_status', 'valid'),
    supabase
      .from('contact_list_members')
      .select('contact_id, contacts!inner(id)', { count: 'exact', head: true })
      .eq('list_id', id)
      .eq('org_id', org.id)
      .eq('contacts.wa_status', 'invalid'),
  ])

  const list = listResult.data
  if (!list || list.source === 'quick_send') notFound()

  const memberTotal = Math.max(0, list.contact_count ?? 0)
  const validCount = validResult.count ?? 0
  const invalidCount = invalidResult.count ?? 0
  const unknownCount = Math.max(0, memberTotal - (validCount + invalidCount))

  let matchTotal = memberTotal
  if (statusFilter === 'var') matchTotal = validCount
  else if (statusFilter === 'yok') matchTotal = invalidCount
  else if (statusFilter === 'bekleyen') matchTotal = unknownCount

  const pageSize = PAGE_SIZES.members
  const pages = totalPages(matchTotal, pageSize)
  const page = clampPage(parsePage(query.sayfa), pages)
  const { from, to } = rangeForPage(page, pageSize)

  let membersQuery = supabase
    .from('contact_list_members')
    .select(
      statusFilter === 'tum'
        ? 'contact_id, contacts(id, phone_e164, name, wa_status, wa_checked_at)'
        : 'contact_id, contacts!inner(id, phone_e164, name, wa_status, wa_checked_at)',
    )
    .eq('list_id', id)
    .eq('org_id', org.id)
    .order('added_at', { ascending: false })

  if (statusFilter === 'var') {
    membersQuery = membersQuery.eq('contacts.wa_status', 'valid')
  } else if (statusFilter === 'yok') {
    membersQuery = membersQuery.eq('contacts.wa_status', 'invalid')
  } else if (statusFilter === 'bekleyen') {
    membersQuery = membersQuery.not('contacts.wa_status', 'in', '("valid","invalid")')
  }

  const { data: memberships } = await membersQuery.range(from, to)

  const members: MemberRow[] = (memberships ?? [])
    .map((row) => {
      const contact = row.contacts as
        | {
            id: string
            phone_e164: string
            name: string | null
            wa_status: string
            wa_checked_at: string | null
          }
        | null
      if (!contact) return null
      return {
        contact_id: contact.id,
        phone_e164: contact.phone_e164,
        name: contact.name,
        wa_status: contact.wa_status,
        wa_checked_at: contact.wa_checked_at,
      }
    })
    .filter((row): row is MemberRow => row !== null)

  const hasVerification = validCount > 0 || invalidCount > 0
  const membersSubtitle =
    statusFilter !== 'tum'
      ? `${matchTotal} numara (${
          statusFilter === 'var'
            ? 'WhatsApp var'
            : statusFilter === 'yok'
              ? 'WhatsApp yok'
              : 'Doğrulanmamış'
        }) · Sayfa ${page}/${pages}`
      : memberTotal === 0
        ? 'Henüz yok'
        : `Sayfa ${page}/${pages}`

  return (
    <>
      <PageHeader
        title={list.name}
        description={
          hasVerification
            ? `${memberTotal} numara · ${validCount} WhatsApp'ta var · ${invalidCount} yok${
                unknownCount > 0 ? ` · ${unknownCount} doğrulanmamış` : ''
              }`
            : `${memberTotal} numara — WhatsApp kontrolü için menüden “WhatsApp doğrula”yı tıklayın`
        }
        backHref="/kisiler"
        backLabel="Gruplar"
        action={
          <div className="flex flex-wrap items-start justify-end gap-2">
            <ListActions compact listId={list.id} currentName={list.name} />
            <AccentLink href="/kampanyalar/yeni">Kampanya</AccentLink>
          </div>
        }
      />

      <Card className="mt-3">
        <MembersPanelHeader
          listId={list.id}
          statusFilter={statusFilter}
          memberTotal={memberTotal}
          validCount={validCount}
          invalidCount={invalidCount}
          unknownCount={unknownCount}
          subtitle={membersSubtitle}
        />

        <MemberActions listId={list.id} members={members} totalCount={matchTotal} />
        <Pagination
          page={page}
          totalPages={pages}
          label={
            statusFilter !== 'tum'
              ? `${matchTotal} numara (${
                  statusFilter === 'var'
                    ? 'WhatsApp var'
                    : statusFilter === 'yok'
                      ? 'WhatsApp yok'
                      : 'Doğrulanmamış'
                })`
              : `${memberTotal} numara`
          }
          hrefForPage={(p) =>
            buildPageHref(`/kisiler/${list.id}`, p, {
              durum: statusFilter !== 'tum' ? statusFilter : undefined,
            })
          }
        />
      </Card>
    </>
  )
}
