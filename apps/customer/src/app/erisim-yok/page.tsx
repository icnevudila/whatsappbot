import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import {
  clampStep,
  parseStep,
  type OnboardingStep,
} from '@/lib/onboarding'
import { loadOnboardingSnapshot } from '@/lib/onboarding-state'
import { OnboardingWizard } from './onboarding-wizard'

export const metadata: Metadata = {
  title: 'Kurulum',
  description: 'WhatsApp satış sisteminizi birkaç dakikada hazırlayın.',
}

export const dynamic = 'force-dynamic'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ adim?: string | string[] }>
}) {
  const snapshot = await loadOnboardingSnapshot()
  if (!snapshot) redirect('/giris')
  if (snapshot.complete) redirect('/ozet')

  const params = await searchParams
  const raw = Array.isArray(params.adim) ? params.adim[0] : params.adim
  const requested = parseStep(raw)
  const step: OnboardingStep = requested
    ? clampStep(requested, snapshot.furthest)
    : snapshot.furthest

  if (!raw || requested !== step) {
    redirect(`/erisim-yok?adim=${step}`)
  }

  return <OnboardingWizard snapshot={snapshot} step={step} />
}
