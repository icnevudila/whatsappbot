import { cache } from 'react'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Panel kurulum checklist ile aynı kriterler.
 * showSetup / kurulum sayfası bu sayımlara dayanır.
 * orgId bazında istek icinde tek sefer.
 */
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
    firstOut: (outCount ?? 0) > 0,
  }

  const counts = {
    connectedCount: connectedCount ?? 0,
    contactCount: contactCount ?? 0,
    brandCount: brandCount ?? 0,
    validWa: validWa ?? 0,
    outCount: outCount ?? 0,
  }

  const doneCount = Object.values(steps).filter(Boolean).length
  const allDone = doneCount === Object.keys(steps).length

  return { steps, counts, doneCount, allDone, showSetup: !allDone }
})
