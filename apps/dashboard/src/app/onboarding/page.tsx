import type { Metadata } from 'next'
import { OnboardingChecklist } from './checklist'

export const metadata: Metadata = {
  title: 'Kurulum',
  description:
    'Markanızı kaydedin, listenizi yükleyin, WhatsApp hattınızı bağlayın ve ilk mesajınızı gönderin.',
}

export default function OnboardingPage() {
  return <OnboardingChecklist />
}
