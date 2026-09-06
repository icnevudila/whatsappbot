import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AccentLink, Card, CardHeader, PageHeader, Pagination, QuietLink, Stat } from '@/components/ui'
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
    return { title: data?.name ? `Liste · ${data.name}` : 'Liste' }
  } catch {
    return { title: 'Liste' }
  }
}

export default async function ContactListDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ sayfa?: string | string[] }>
}) {
  const { id } = await params
  const query = await searchParams
  const { org, supabase } = await requireActiveOrg()

  const { data: list } = await supabase
    .from('contact_lists')
    .select('id, name, contact_count, created_at, source, description')
    .eq('id', id)
    .eq('org_id', org.id)
    .maybeSingle()

  if (!list || list.source === 'quick_send') notFound()

  const pageSize = PAGE_SIZES.members
  const memberTotal = Math.max(0, list.contact_count ?? 0)
  const pages = totalPages(memberTotal, pageSize)
  const page = clampPage(parsePage(query.sayfa), pages)
  const { from, to } = rangeForPage(page, pageSize)

  const [{ data: memberships }, { data: statusRows }] = await Promise.all([
    supabase
      .from('contact_list_members')
      .select('contact_id, contacts(id, phone_e164, name, wa_status, wa_checked_at)')
      .eq('list_id', id)
      .eq('org_id', org.id)
      .order('added_at', { ascending: false })
      .range(from, to),
    supabase
      .from('contact_list_members')
      .select('contacts(wa_status)')
      .eq('list_id', id)
      .eq('org_id', org.id),
  ])

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

  let valid = 0
  let invalid = 0
  for (const row of statusRows ?? []) {
    const status = (row.contacts as { wa_status?: string } | null)?.wa_status
    if (status === 'valid') valid += 1
    else if (status === 'invalid') invalid += 1
  }
  const pending = Math.max(0, memberTotal - valid - invalid)

  return (
    <>
      <QuietLink href="/kisiler">← Kişiler</QuietLink>

      <PageHeader
        title={list.name}
        description={`${list.contact_count} numara · ${new Date(list.created_at).toLocaleString('tr-TR')}${list.description ? ` · ${list.description}` : ''}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ListActions listId={list.id} />
            <AccentLink href="/kampanyalar">Kampanyada kullan</AccentLink>
          </div>
        }
      />

      <div className="mb-2.5 grid grid-cols-3 gap-2.5">
        <Card>
          <div className="p-3.5">
            <Stat label="WhatsApp’ta kayıtlı" value={valid} tone="accent" />
          </div>
        </Card>
        <Card>
          <div className="p-3.5">
            <Stat label="WhatsApp’ta yok" value={invalid} tone="muted" />
          </div>
        </Card>
        <Card>
          <div className="p-3.5">
            <Stat label="Bekliyor" value={pending} tone="muted" />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Numaralar"
          subtitle={
            memberTotal === 0
              ? 'Doğrulama bağlı hat ister. Kara listeye eklenen numaralara gönderim yapılmaz.'
              : `Sayfa ${page}/${pages} · doğrulama bağlı hat ister`
          }
        />
        <MemberActions listId={list.id} members={members} totalCount={memberTotal} />
        <Pagination
          page={page}
          totalPages={pages}
          label={`${memberTotal} numara`}
          hrefForPage={(p) => buildPageHref(`/kisiler/${list.id}`, p)}
        />
      </Card>

      <p className="mt-3 text-[11.5px] text-ink-faint">
        <Link href="/kara-liste" className="underline underline-offset-2">
          Kara liste
        </Link>
        ’ye toplu ekleme de yapabilirsiniz.
      </p>
    </>
  )
}
