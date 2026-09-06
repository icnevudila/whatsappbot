import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireActiveOrg } from '@/lib/org'
import { getSetupProgress } from '@/lib/setup-progress'
import { OnboardingWizard } from './onboarding-wizard'

export const metadata: Metadata = { title: 'Kurulum' }
export const dynamic = 'force-dynamic'

/**
 * Zorunlu onboarding wizard.
 * Layout gate tamamlanmadan diğer panellere izin vermez.
 */
export default async function SetupPage() {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  try {
    ;({ org } = await requireActiveOrg())
  } catch {
    redirect('/giris')
  }

  const progress = await getSetupProgress(org.id)

  if (progress.allDone) {
    redirect('/kampanyalar?hazir=1')
  }

  return <OnboardingWizard progress={progress} />
}
