import type { Metadata } from 'next'
import { OnboardingChecklist } from './checklist'

export const metadata: Metadata = {
  title: 'Kurulum',
}

export default function OnboardingPage() {
  return <OnboardingChecklist />
}
