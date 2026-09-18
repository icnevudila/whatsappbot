import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui'
import { requireActiveOrg } from '@/lib/org'
import { CreativeWizard } from '../creative-wizard'
import { loadCreativeWizardData } from '../wizard-data'

export const metadata: Metadata = { title: 'Kampanya görseli oluştur' }
export const dynamic = 'force-dynamic'

export default async function NewCreativePage() {
  try {
    await requireActiveOrg()
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') redirect('/erisim-yok')
    redirect('/giris')
  }

  const data = await loadCreativeWizardData()

  return (
    <div className="wb-wa-page">
      <PageHeader
        title="Kampanya görseli oluştur"
        description="Marka, ürün ve iletişim bilgilerinizle üretin. İşlem arka planda sürer."
        backHref="/icerik"
        backLabel="Kütüphane"
      />
      <CreativeWizard data={data} />
    </div>
  )
}
