import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  AccentLink,
  Card,
  CardHeader,
  PageHeader,
  Pagination,
  QuietLink,
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
import { AddToGroupForm } from './add-to-group-form'
import { MemberActions, type MemberRow } from './member-actions'

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

  return (
    <>
      <QuietLink href="/kisiler">← Gruplar</QuietLink>

      <PageHeader
        title={list.name}
        description={
          hasVerification
            ? `${memberTotal} numara · ${validCount} WhatsApp'ta var · ${invalidCount} yok${
                unknownCount > 0 ? ` · ${unknownCount} doğrulanmamış` : ''
              }`
            : `${memberTotal} numara — WhatsApp kontrolü için sağdaki “WhatsApp doğrula”yı tıklayın`
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ListActions listId={list.id} currentName={list.name} />
            <AccentLink href="/kisiler?gorunum=defter">Defter</AccentLink>
            <AccentLink href="/kampanyalar/yeni">Kampanya</AccentLink>
          </div>
        }
      />

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.85fr)]">
        <Card>
          <CardHeader
            title="Üyeler"
            subtitle={
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
            }
          />

          <div className="border-b border-hairline px-3.5 py-2 bg-canvas/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-ink">WhatsApp Durumu:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                <Link
                  href={`/kisiler/${list.id}`}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium transition-colors ${
                    statusFilter === 'tum'
                      ? 'bg-ink text-canvas font-bold'
                      : 'border border-hairline bg-surface text-ink-muted hover:text-ink'
                  }`}
                >
                  Tümü ({memberTotal})
                </Link>
                <Link
                  href={`/kisiler/${list.id}?durum=var`}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium transition-colors ${
                    statusFilter === 'var'
                      ? 'border border-ok bg-ok text-white font-bold'
                      : 'border border-ok/35 bg-ok-soft text-ok hover:bg-ok/15'
                  }`}
                  title="WhatsApp hesabı olan numaralar"
                >
                  <span aria-hidden>✓</span>
                  <span>WhatsApp'ta Var ({validCount})</span>
                </Link>
                <Link
                  href={`/kisiler/${list.id}?durum=yok`}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium transition-colors ${
                    statusFilter === 'yok'
                      ? 'border border-danger bg-danger text-white font-bold'
                      : 'border border-danger/35 bg-danger/10 text-danger hover:bg-danger/20'
                  }`}
                  title="WhatsApp hesabı olmayan numaralar"
                >
                  <span aria-hidden>×</span>
                  <span>WhatsApp'ta Yok ({invalidCount})</span>
                </Link>
                {unknownCount > 0 ? (
                  <Link
                    href={`/kisiler/${list.id}?durum=bekleyen`}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium transition-colors ${
                      statusFilter === 'bekleyen'
                        ? 'bg-ink-muted text-canvas font-bold'
                        : 'border border-hairline bg-surface text-ink-muted hover:text-ink'
                    }`}
                    title="Henüz kontrol edilmemiş numaralar"
                  >
                    <span aria-hidden>?</span>
                    <span>Doğrulanmamış ({unknownCount})</span>
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

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

        <Card>
          <CardHeader title="Numara ekle" subtitle="Excel veya yapıştır" />
          <AddToGroupForm listId={list.id} />
        </Card>
      </div>
    </>
  )
}
