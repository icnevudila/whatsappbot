import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/ui'
import { Icon } from '@/components/icon'
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
    <div className="wb-wa-page">
      <PageHeader
        title="İçerik kütüphanesi"
        description="Kampanya görselleri üretin, revize edin, tekrar kullanın."
        action={
          <Link href="/icerik/yeni" className="wb-wa-text-btn">
            <Icon name="sparkles" className="size-4" />
            Görsel üret
          </Link>
        }
      />
      <LibraryBoard
        orgId={org.id}
        initial={first.items}
        initialHasMore={first.hasMore}
        canManage={isOrgAdminRole(org.role)}
      />
    </div>
  )
}
