import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  AccentLink,
  Card,
  CardHeader,
  Notice,
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

  const { data: memberships } = await supabase
    .from('contact_list_members')
    .select('contact_id, contacts(id, phone_e164, name, wa_status, wa_checked_at)')
    .eq('list_id', id)
    .eq('org_id', org.id)
    .order('added_at', { ascending: false })
    .range(from, to)

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

  return (
    <>
      <QuietLink href="/kisiler">← Tüm kişiler & gruplar</QuietLink>

      <PageHeader
        title={list.name}
        description={`${list.contact_count} numara · gruptan çıkar / ad değiştir / sil`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ListActions listId={list.id} currentName={list.name} />
            <AccentLink href="/kisiler">Defterden ekle</AccentLink>
            <AccentLink href="/kampanyalar#yeni-kampanya">Kampanyada kullan</AccentLink>
          </div>
        }
      />

      <Notice tone="accent">
        Kişi eklemek için{' '}
        <Link href="/kisiler" className="font-semibold underline underline-offset-2">
          Kişiler
        </Link>
        ’e git → numaraları seç → bu grubu seç → “Gruba ekle”.
      </Notice>

      <Card className="mt-3">
        <CardHeader
          title="Gruptaki numaralar"
          subtitle={
            memberTotal === 0
              ? 'Henüz üye yok'
              : `Sayfa ${page}/${pages} · seçip gruptan çıkarabilirsin`
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
    </>
  )
}
