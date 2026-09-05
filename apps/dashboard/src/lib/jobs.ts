import type { JobPayloadMap, JobType } from '@wa/shared'
import { requireActiveOrg } from '@/lib/org'

export async function enqueueJob<T extends JobType>(options: {
  type: T
  payload?: JobPayloadMap[T]
  accountId?: string
  campaignId?: string
  priority?: number
}): Promise<{ id: string | null; error: string | null }> {
  try {
    const { userId, org, supabase } = await requireActiveOrg()

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        org_id: org.id,
        created_by: userId,
        type: options.type,
        payload: (options.payload ?? {}) as never,
        account_id: options.accountId ?? null,
        campaign_id: options.campaignId ?? null,
        priority: options.priority ?? 100,
      })
      .select('id')
      .single()

    return { id: data?.id != null ? String(data.id) : null, error: error?.message ?? null }
  } catch (error) {
    return { id: null, error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }
}
