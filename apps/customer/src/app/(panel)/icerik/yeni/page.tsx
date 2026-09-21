import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/ui'
import { Icon } from '@/components/icon'
import { requireActiveOrg } from '@/lib/org'
import { CreativeWizard as VideoCreativeWizard } from '../creative-wizard'
import { ImageCreativeWizard } from '../image-wizard'
import { loadCreativeWizardData } from '../wizard-data'

export const metadata: Metadata = { title: 'Kampanya içeriği oluştur' }
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

      {/* Video / Görsel Seçim Tabları */}
      <div className="mb-5 flex items-center gap-2 border-b border-[var(--color-hairline)] pb-3">
        <Link
          href="/icerik/yeni?format=video"
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
            isVideo
              ? 'bg-[#00a884] text-white shadow-sm ring-2 ring-[#00a884]/30'
              : 'bg-surface text-ink hover:bg-canvas border border-[var(--color-hairline)]'
          }`}
        >
          <Icon name="video" className="size-3.5" />
          <span>Kampanya Videosu (9:16 Reels)</span>
        </Link>
        <Link
          href="/icerik/yeni"
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
            !isVideo
              ? 'bg-[#00a884] text-white shadow-sm ring-2 ring-[#00a884]/30'
              : 'bg-surface text-ink hover:bg-canvas border border-[var(--color-hairline)]'
          }`}
        >
          <Icon name="image" className="size-3.5" />
          <span>Görsel Üret (Afiş & Kare)</span>
        </Link>
      </div>

      {isVideo ? (
        <VideoCreativeWizard data={data} initialFormat="reels_video" />
      ) : (
        <ImageCreativeWizard data={data} />
      )}
    </div>
  )
}
