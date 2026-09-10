import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { PageHeader, QuietLink } from '@/components/ui'
import { isOrgAdminRole, requireActiveOrg } from '@/lib/org'
import { CreativeDetail, type DetailCreative, type VersionRow } from '../detail-view'
import type { CreativePayload } from '@/lib/creative/types'

export const metadata: Metadata = { title: 'Görsel' }
export const dynamic = 'force-dynamic'

export default async function CreativeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ revize?: string | string[] }>
}) {
  const { id } = await params
  const query = await searchParams
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') redirect('/erisim-yok')
    redirect('/giris')
  }

  const { data: row } = await supabase
    .from('creatives')
    .select(
      'id, title, public_url, status, source, generation_type, created_at, error, parent_id, format, payload, brand_kits(name)',
    )
    .eq('org_id', org.id)
    .eq('id', id)
    .maybeSingle()

  if (!row) notFound()

  const kit = row.brand_kits as { name: string } | { name: string }[] | null
  const brandName = Array.isArray(kit) ? kit[0]?.name : kit?.name
  const payload = row.payload as CreativePayload
  const storedTitle = row.title?.trim() || ''
  const briefTitle = payload?.brief?.replace(/\s+/g, ' ').trim() || ''
  const displayTitle =
    storedTitle.endsWith('…') && briefTitle.length > storedTitle.length - 1
      ? briefTitle.slice(0, 180)
      : storedTitle || briefTitle || 'Kampanya görseli'
  const provider =
    payload && typeof payload === 'object' && 'provider' in payload
      ? String(payload.provider ?? '')
      : ''

  const creative: DetailCreative = {
    id: row.id,
    title: displayTitle,
    publicUrl: row.public_url,
    status: row.status,
    source: row.source,
    generationType: row.generation_type,
    createdAt: row.created_at,
    error: row.error,
    parentId: row.parent_id,
    brandName: brandName ?? null,
    format: row.format,
    provider: provider || null,
    brief: payload?.brief ?? payload?.instruction ?? null,
  }

  let rootId = row.id
  let cursor = row.parent_id
  for (let i = 0; i < 12 && cursor; i += 1) {
    const { data: parent } = await supabase
      .from('creatives')
      .select('id, parent_id')
      .eq('org_id', org.id)
      .eq('id', cursor)
      .maybeSingle()
    if (!parent) break
    rootId = parent.id
    cursor = parent.parent_id
  }

  const familyMap = new Map<
    string,
    {
      id: string
      title: string | null
      status: string
      generationType: string
      createdAt: string
      publicUrl: string | null
    }
  >()
  let frontier = [rootId]
  for (let depth = 0; depth < 8 && frontier.length > 0; depth += 1) {
    const { data: batch } = await supabase
      .from('creatives')
      .select('id, title, status, generation_type, created_at, public_url, parent_id')
      .eq('org_id', org.id)
      .or(`id.in.(${frontier.join(',')}),parent_id.in.(${frontier.join(',')})`)
    const next: string[] = []
    for (const item of batch ?? []) {
      if (familyMap.has(item.id)) continue
      familyMap.set(item.id, {
        id: item.id,
        title: item.title,
        status: item.status,
        generationType: item.generation_type,
        createdAt: item.created_at,
        publicUrl: item.public_url,
      })
      next.push(item.id)
    }
    frontier = next
  }

  const versions: VersionRow[] = [...familyMap.values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )

  const revizeRaw = query.revize
  const openRevise = revizeRaw === '1' || (Array.isArray(revizeRaw) && revizeRaw[0] === '1')

  return (
    <div className="filo-fade-in mx-auto w-full max-w-3xl space-y-3">
      <PageHeader
        title={displayTitle}
        description="Revize edin, varyasyon alın veya kampanyada kullanın."
        action={<QuietLink href="/icerik">← Kütüphane</QuietLink>}
      />
      <CreativeDetail
        orgId={org.id}
        creative={creative}
        versions={versions}
        canManage={isOrgAdminRole(org.role)}
        openRevise={openRevise}
      />
    </div>
  )
}
