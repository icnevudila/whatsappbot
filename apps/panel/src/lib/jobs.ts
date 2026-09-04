import type { JobPayloadMap, JobType } from '@wa/shared'
import { requireActiveOrg } from '@/lib/org'

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
  try {
    const { userId, org, supabase } = await requireActiveOrg()

    const { error } = await supabase.from('jobs').insert({
      org_id: org.id,
      created_by: userId,
      type: options.type,
      payload: (options.payload ?? {}) as never,
      account_id: options.accountId ?? null,
      campaign_id: options.campaignId ?? null,
      priority: options.priority ?? 100,
    })

    return { error: error?.message ?? null }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }
}
