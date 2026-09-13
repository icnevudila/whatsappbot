import { redirect } from 'next/navigation'
import { AccentLink, PageHeader } from '@/components/ui'
import { requireActiveOrg, isOrgAdminRole } from '@/lib/org'
import { listLibraryCreatives } from './actions'
import { LibraryBoard } from './library-board'
import { LIBRARY_PAGE_SIZE } from './library-shared'

export const metadata = { title: 'İçerik kütüphanesi' }
export const dynamic = 'force-dynamic'

export default async function CreativeLibraryPage() {
  let org
  try {
    ;({ org } = await requireActiveOrg())
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') redirect('/erisim-yok')
    redirect('/giris')
  }

  const first = await listLibraryCreatives({
    sort: 'new',
    offset: 0,
    limit: LIBRARY_PAGE_SIZE,
  })

  return (
    <>
      <PageHeader
        title="İçerik kütüphanesi"
        description="Kampanya görselleri üretin, revize edin, tekrar kullanın."
        action={<AccentLink href="/icerik/yeni">Görsel üret</AccentLink>}
      />
      <LibraryBoard
        orgId={org.id}
        initial={first.items}
        initialHasMore={first.hasMore}
        canManage={isOrgAdminRole(org.role)}
      />
    </>
  )
}
