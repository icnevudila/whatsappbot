import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { PageHeader } from '@/components/ui'
import { requireActiveOrg } from '@/lib/org'
import { CampaignWizard } from '../campaign-wizard'
import { loadCampaignCreativeHandoff, loadCampaignWizardData } from '../wizard-data'
import { Notice } from '@/components/ui'
import { parseWizardStep } from '../campaign-wizard-types'

export const metadata: Metadata = { title: 'Yeni kampanya' }
export const dynamic = 'force-dynamic'

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ adim?: string | string[]; gorsel?: string | string[]; creative_id?: string | string[] }>
}) {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  try {
    ;({ org } = await requireActiveOrg())
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') redirect('/erisim-yok')
    redirect('/giris')
  }

  const params = await searchParams
  const raw = Array.isArray(params.adim) ? params.adim[0] : params.adim
  const gorselRaw = Array.isArray(params.gorsel) ? params.gorsel[0] : params.gorsel
  const creativeId = Array.isArray(params.creative_id) ? params.creative_id[0] : params.creative_id
  const handoff = creativeId ? await loadCampaignCreativeHandoff(org.id, creativeId) : null
  if (creativeId && !handoff) return <Notice tone="danger">İçerik bulunamadı veya kampanyada kullanıma hazır değil. Kütüphaneden doğrulanmış bir içerik seçin.</Notice>
  const data = await loadCampaignWizardData(org.id)
  const initialStep = raw ? parseWizardStep(raw) : handoff ? 'mesaj' : gorselRaw?.trim() ? 'gorsel' : 'kampanya'

  return (
    <div className="wb-wa-page">
      <PageHeader
        title="Yeni kampanya"
        description="Adım adım hazırlayın, sonra taslak, plan veya gönderim seçin."
        backHref="/kampanyalar"
        backLabel="Kampanyalar"
      />
      <Suspense>
        <CampaignWizard
          mode="create"
          orgId={org.id}
          initialStep={initialStep}
          initialMediaUrl={gorselRaw?.trim() || undefined}
          initialCreative={handoff || undefined}
          {...data}
        />
      </Suspense>
    </div>
  )
}
