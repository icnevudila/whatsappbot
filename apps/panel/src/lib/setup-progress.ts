import { cache } from 'react'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Zorunlu onboarding: marka + liste + bağlı hat + en az bir WA-doğrulanmış numara.
 * Bunlar tamamsa müşteri kampanya / gönderime hazırdır (ilk test mesajı şart değil).
 */
export const SETUP_STEP_KEYS = ['brand', 'contacts', 'connected', 'verified'] as const
export type SetupStepKey = (typeof SETUP_STEP_KEYS)[number]

export const getSetupProgress = cache(async (orgId: string) => {
  const supabase = await createSupabaseServerClient()

  const [
    { count: connectedCount },
    { count: contactCount },
    { count: brandCount },
    { count: validWa },
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
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('wa_status', 'valid'),
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
    verified: (validWa ?? 0) > 0,
  }

  const counts = {
    connectedCount: connectedCount ?? 0,
    contactCount: contactCount ?? 0,
    brandCount: brandCount ?? 0,
    validWa: validWa ?? 0,
    outCount: outCount ?? 0,
  }

  const doneCount = SETUP_STEP_KEYS.filter((key) => steps[key]).length
  const allDone = doneCount === SETUP_STEP_KEYS.length
  const nextStep = SETUP_STEP_KEYS.find((key) => !steps[key]) ?? null

  return { steps, counts, doneCount, allDone, showSetup: !allDone, nextStep }
})

/** Onboarding sırasında erişilebilir paneller (gate allowlist). */
export function isOnboardingAllowedPath(pathname: string): boolean {
  if (pathname === '/kurulum') return true
  if (pathname === '/marka-kiti') return true
  if (pathname === '/hesaplar') return true
  if (pathname === '/kisiler' || pathname.startsWith('/kisiler/')) return true
  if (pathname === '/ayarlar' || pathname.startsWith('/ayarlar/')) return true
  if (pathname === '/yardim') return true
  return false
}
