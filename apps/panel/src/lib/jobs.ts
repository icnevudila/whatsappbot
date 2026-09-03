import type { JobPayloadMap, JobType } from '@wa/shared'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Panel WhatsApp servisine dogrudan konusmuyor.
 * Her komut jobs tablosuna bir satir olarak yazilir, servis onu claim_jobs ile
 * alir. Boylece panel Vercel'de kisa omurlu kalabilir ve servis VPS'te 7/24
 * calisir; ikisi arasinda acik bir baglanti tutmak gerekmez.
 */
export async function enqueueJob<T extends JobType>(options: {
  type: T
  payload?: JobPayloadMap[T]
  accountId?: string
  campaignId?: string
  priority?: number
}): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Oturum bulunamadi.' }

  const { error } = await supabase.from('jobs').insert({
    owner_id: user.id,
    type: options.type,
    payload: (options.payload ?? {}) as never,
    account_id: options.accountId ?? null,
    campaign_id: options.campaignId ?? null,
    priority: options.priority ?? 100,
  })

  return { error: error?.message ?? null }
}
