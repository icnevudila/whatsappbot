import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  PageHeader,
  Pagination,
} from '@/components/ui'
import { Icon } from '@/components/icon'
import { requireActiveOrg } from '@/lib/org'
import {
  PAGE_SIZES,
  buildPageHref,
  clampPage,
  parsePage,
  rangeForPage,
  totalPages,
} from '@/lib/pagination'
import { type MemberRow } from './member-actions'
import { MembersPanel } from './members-toolbar'

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

  let pageDescription = `${memberTotal} kişi`
  if (memberTotal === 0) pageDescription = 'Henüz üye yok'
  else if (!hasVerification) pageDescription = `${memberTotal} kişi`
  else if (unknownCount > 0) {
    const parts = [`${memberTotal} kişi`]
    if (validCount > 0) parts.push(`${validCount} var`)
    if (invalidCount > 0) parts.push(`${invalidCount} yok`)
    parts.push(`${unknownCount} bekliyor`)
    pageDescription = parts.join(' · ')
  } else if (invalidCount === 0) {
    pageDescription = `${memberTotal} kişi WhatsApp’ta`
  } else if (validCount === 0) {
    pageDescription = `${memberTotal} kişi WhatsApp’ta yok`
  } else {
    pageDescription = `${validCount} var · ${invalidCount} yok`
  }

  return (
    <div className="wb-wa-page">
      <PageHeader
        title={list.name}
        description={pageDescription}
        backHref="/kisiler"
        backLabel="Gruplar"
        action={
          <Link href="/kampanyalar/yeni" className="wb-wa-text-btn">
            <Icon name="plus" className="size-4" />
            Yeni Kampanya
          </Link>
        }
      />

      <Card>
        <MembersPanel
          listId={list.id}
          listName={list.name}
          members={members}
          totalCount={matchTotal}
          statusFilter={statusFilter}
          memberTotal={memberTotal}
          validCount={validCount}
          invalidCount={invalidCount}
          unknownCount={unknownCount}
          subtitle={membersSubtitle}
        />
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
    </div>
  )
}
