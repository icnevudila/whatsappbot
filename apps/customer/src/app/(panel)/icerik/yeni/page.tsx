import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui'
import { requireActiveOrg } from '@/lib/org'
import { CreativeWizard } from '../creative-wizard'
import { loadCreativeWizardData } from '../wizard-data'

export const metadata: Metadata = { title: 'Kampanya görseli oluştur' }
export const dynamic = 'force-dynamic'

export default async function NewCreativePage({
  searchParams,
}: {
  searchParams?: Promise<{ format?: string; mode?: string }>
}) {
  try {
    await requireActiveOrg()
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') redirect('/erisim-yok')
    redirect('/giris')
  }

  const resolvedParams = searchParams ? await searchParams : {}
  const isVideo = resolvedParams.format === 'video' || resolvedParams.mode === 'video' || resolvedParams.format === 'reels_video'

  const data = await loadCreativeWizardData()

  return (
    <div className="wb-wa-page">
      <PageHeader
        title={isVideo ? 'Kampanya videosu oluştur' : 'Kampanya görseli oluştur'}
        description={
          isVideo
            ? 'İşletmeniz ve ürünleriniz için 9:16 sinematik dikey reels reklam videosu üretin. İşlem arka planda sürer.'
            : 'Marka, ürün ve iletişim bilgilerinizle üretin. İşlem arka planda sürer.'
        }
        backHref="/icerik"
      />
      <CreativeWizard data={data} initialFormat={isVideo ? 'reels_video' : undefined} />
    </div>
  )
}
