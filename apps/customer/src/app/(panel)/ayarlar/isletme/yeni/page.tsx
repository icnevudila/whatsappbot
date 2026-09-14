import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { clampStep, parseStep, type OnboardingStep } from '@/lib/onboarding'
import { loadActiveOrgOnboardingSnapshot } from '@/lib/onboarding-state'
import { listUserOrgs, requireActiveOrg } from '@/lib/org'
import { OnboardingWizard } from '@/app/erisim-yok/onboarding-wizard'

export const metadata: Metadata = { title: 'Yeni işletme' }
export const dynamic = 'force-dynamic'

export default async function AdditionalOrgPage({
  searchParams,
}: {
  searchParams: Promise<{ adim?: string | string[] }>
}) {
  let userId: string
  try {
    ;({ userId } = await requireActiveOrg())
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') {
      redirect('/erisim-yok')
    }
    redirect('/giris')
  }

  const params = await searchParams
  const raw = Array.isArray(params.adim) ? params.adim[0] : params.adim
  let requested = parseStep(raw)
  if (requested === 'hosgeldin') requested = 'isletme'

  const orgs = await listUserOrgs()
  const ownedCount = orgs.filter((item) => item.role === 'owner').length
  const { supabase } = await requireActiveOrg()
  const { data: profile } = await supabase
    .from('profiles')
    .select('orgs_quota, email')
    .eq('id', userId)
    .maybeSingle()
  const quota = profile?.orgs_quota ?? 3
  const canCreate = ownedCount < quota

  const step: OnboardingStep = requested ?? 'isletme'
  if (step === 'isletme' && !canCreate) {
    redirect('/ayarlar/isletme')
  }

  if (!raw || raw !== step) {
    redirect(`/ayarlar/isletme/yeni?adim=${step}`)
  }

  const snapshot =
    step === 'isletme'
      ? {
          userId,
          email: profile?.email ?? '',
          complete: false,
          furthest: 'isletme' as OnboardingStep,
          org: null,
          account: null,
          brand: null,
          accountConnected: false,
        }
      : await loadActiveOrgOnboardingSnapshot()

  if (!snapshot) redirect('/giris')

  const furthest = step === 'isletme' ? 'isletme' : snapshot.furthest
  const clamped = step === 'isletme' ? 'isletme' : clampStep(step, furthest)
  if (clamped !== step) {
    redirect(`/ayarlar/isletme/yeni?adim=${clamped}`)
  }

  return (
    <OnboardingWizard
      snapshot={snapshot}
      step={step}
      mode="additional"
      basePath="/ayarlar/isletme/yeni"
    />
  )
}
