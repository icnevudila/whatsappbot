import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui'
import { requireActiveOrg } from '@/lib/org'
import { CreativeStudioV2 } from '../creative-studio-v2'
import { loadCreativeWizardData } from '../wizard-data'

export const metadata: Metadata = { title: 'Creative Studio — Kampanya İçeriği Oluştur' }
export const dynamic = 'force-dynamic'

export default async function NewCreativePage({
  searchParams,
}: {
  searchParams?: Promise<{ format?: string; mode?: string; derived_from?: string; job_id?: string }>
}) {
  try {
    await requireActiveOrg()
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') redirect('/erisim-yok')
    redirect('/giris')
  }

  const resolvedParams = searchParams ? await searchParams : {}
  const isVideo =
    resolvedParams.format === 'video' ||
    resolvedParams.mode === 'video' ||
    resolvedParams.format === 'reels_video'

  const data = await loadCreativeWizardData()

  return (
    <div className="wb-wa-page">
      <PageHeader
        title="Creative Studio"
        description="Markanız ve ürünleriniz için tek tıkla profesyonel afiş, sosyal medya postu veya sinematik video üretin."
        backHref="/icerik"
      />

      <CreativeStudioV2
        key={`${data.org.id}.${isVideo ? 'video' : 'image'}.${resolvedParams.job_id || 'new'}.${resolvedParams.derived_from || ''}`}
        data={data}
        initialMediaType={isVideo ? 'VIDEO' : 'IMAGE'}
        initialDerivedCreativeId={resolvedParams.derived_from || null}
        initialJobId={resolvedParams.job_id || null}
      />
    </div>
  )
}

