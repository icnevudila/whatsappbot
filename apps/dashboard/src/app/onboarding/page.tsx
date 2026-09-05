import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireActiveOrg } from '@/lib/org'
import { publicEnv } from '@/lib/env'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { OnboardingChecklist } from './checklist'

export const metadata: Metadata = {
  title: 'Kurulum',
  description: 'Marka, liste, WhatsApp hattı ve ilk mesaj — beş adımda hazır.',
}

export default async function OnboardingPage() {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  try {
    ;({ org } = await requireActiveOrg())
  } catch {
    redirect('/giris')
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_step, onboarded_at')
    .eq('id', user!.id)
    .maybeSingle()

  return (
    <OnboardingChecklist
      initialStep={profile?.onboarding_step ?? 'welcome'}
      orgId={org.id}
      panelUrl={publicEnv.panelUrl}
    />
  )
}
