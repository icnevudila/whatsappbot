import { redirect } from 'next/navigation'

/** Müşteri paneli onboarding-first: kök yol kuruluma yönlendirir. */
export default function HomePage() {
  redirect('/onboarding')
}
