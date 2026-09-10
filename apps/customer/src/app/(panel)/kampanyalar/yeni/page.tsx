import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { PageHeader, QuietLink } from '@/components/ui'
import { requireActiveOrg } from '@/lib/org'
import { CampaignWizard } from '../campaign-wizard'
import { loadCampaignWizardData } from '../wizard-data'
import { parseWizardStep } from '../campaign-wizard-types'

export const metadata: Metadata = { title: 'Yeni kampanya' }
export const dynamic = 'force-dynamic'

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ adim?: string | string[]; gorsel?: string | string[] }>
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
  const data = await loadCampaignWizardData(org.id)
  const initialStep = raw ? parseWizardStep(raw) : gorselRaw?.trim() ? 'icerik' : 'kampanya'

  return (
    <>
      <PageHeader
        title="Yeni kampanya"
        description="Adım adım hazırlayın, sonra taslak, plan veya gönderim seçin."
        action={<QuietLink href="/kampanyalar">← Kampanyalar</QuietLink>}
      />
      <Suspense>
        <CampaignWizard
          mode="create"
          orgId={org.id}
          initialStep={initialStep}
          initialMediaUrl={gorselRaw?.trim() || undefined}
          {...data}
        />
      </Suspense>
    </>
  )
}
