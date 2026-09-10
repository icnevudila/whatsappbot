import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AccentLink, PageHeader } from '@/components/ui'
import { requireActiveOrg, isOrgAdminRole } from '@/lib/org'
import { LibraryBoard, type LibraryItem } from './library-board'

export const metadata: Metadata = { title: 'İçerik kütüphanesi' }
export const dynamic = 'force-dynamic'

export default async function CreativeLibraryPage() {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') redirect('/erisim-yok')
    redirect('/giris')
  }

  const { data } = await supabase
    .from('creatives')
    .select(
      'id, title, public_url, status, source, generation_type, created_at, error, parent_id, brand_kits(name)',
    )
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })
    .limit(80)

  const initial: LibraryItem[] = (data ?? []).map((row) => {
    const kit = row.brand_kits as { name: string } | { name: string }[] | null
    const brandName = Array.isArray(kit) ? kit[0]?.name : kit?.name
    return {
      id: row.id,
      title: row.title,
      publicUrl: row.public_url,
      status: row.status,
      source: row.source,
      generationType: row.generation_type,
      brandName: brandName ?? null,
      createdAt: row.created_at,
      error: row.error,
      parentId: row.parent_id,
    }
  })

  return (
    <>
      <PageHeader
        title="İçerik kütüphanesi"
        description="Kampanya görselleri üretin, revize edin, tekrar kullanın."
        action={<AccentLink href="/icerik/yeni">✨ Kampanya görseli oluştur</AccentLink>}
      />
      <LibraryBoard orgId={org.id} initial={initial} canManage={isOrgAdminRole(org.role)} />
    </>
  )
}
