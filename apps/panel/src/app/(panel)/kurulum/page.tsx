import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireActiveOrg } from '@/lib/org'
import { getSetupProgress } from '@/lib/setup-progress'
import { OnboardingWizard } from './onboarding-wizard'

export const metadata: Metadata = { title: 'Kurulum' }
export const dynamic = 'force-dynamic'

/**
 * Opsiyonel hızlı kurulum wizard’ı. Menüyü kilitlemez.
 */
export default async function SetupPage() {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let isPlatformAdmin = false
  try {
    ;({ org, isPlatformAdmin } = await requireActiveOrg())
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') {
      redirect('/erisim-yok')
    }
    redirect('/giris')
  }

  if (isPlatformAdmin) {
    redirect('/admin')
  }

  const progress = await getSetupProgress(org.id)

  if (progress.allDone) {
    redirect('/kampanyalar?hazir=1')
  }

  return <OnboardingWizard progress={progress} orgId={org.id} orgName={org.name} />
}
