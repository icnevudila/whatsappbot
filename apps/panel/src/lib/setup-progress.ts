import { cache } from 'react'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Soft checklist: bağlı hat + kişi grubu; marka / ilk gönderim rehberde.
 * Özet + /kurulum’da 3 adımlı kart; menüyü kilitlemez.
 */
export const SETUP_REQUIRED_KEYS = ['connected', 'contacts'] as const
export const SETUP_STEP_KEYS = ['connected', 'contacts', 'brand'] as const
export type SetupStepKey = (typeof SETUP_STEP_KEYS)[number]

export const getSetupProgress = cache(async (orgId: string) => {
  const supabase = await createSupabaseServerClient()

  const [
    { count: connectedCount },
    { count: contactCount },
    { count: brandCount },
    { count: outCount },
  ] = await Promise.all([
    supabase
      .from('accounts')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'connected'),
    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('brand_kits').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase
      .from('message_log')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('direction', 'out'),
  ])

  const steps = {
    brand: (brandCount ?? 0) > 0,
    contacts: (contactCount ?? 0) > 0,
    connected: (connectedCount ?? 0) > 0,
  }

  const counts = {
    connectedCount: connectedCount ?? 0,
    contactCount: contactCount ?? 0,
    brandCount: brandCount ?? 0,
    outCount: outCount ?? 0,
  }

  const requiredDone = SETUP_REQUIRED_KEYS.every((key) => steps[key])
  const doneCount = SETUP_REQUIRED_KEYS.filter((key) => steps[key]).length
  const allDone = requiredDone
  const nextStep = SETUP_REQUIRED_KEYS.find((key) => !steps[key]) ?? null

  return {
    steps,
    counts,
    doneCount,
    allDone,
    showSetup: !allDone,
    nextStep,
    /** İsteğe bağlı: hat+grup varken marka yoksa soft nudge. */
    suggestBrand: requiredDone && !steps.brand,
  }
})
