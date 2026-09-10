import type { JobPayloadMap, JobType } from '@wa/shared'
import { requireActiveOrg } from '@/lib/org'

/** Kota / askı kapısı — gönderim ve kampanya başlat/devam. */
const SEND_GATED = new Set<JobType>([
  'message.send',
  'campaign.start',
  'campaign.resume',
])

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
}): Promise<{ id: string | null; error: string | null }> {
  try {
    const { userId, org, supabase } = await requireActiveOrg()

    if (org.suspended_at) {
      return {
        id: null,
        error: 'İşletme askıda. Gönderim ve kampanya işlemleri kapalı.',
      }
    }

    if (SEND_GATED.has(options.type)) {
      const { data: gate, error: gateError } = await supabase.rpc('org_send_gate_member', {
        p_org_id: org.id,
      })
      if (gateError) {
        return { id: null, error: gateError.message }
      }
      const gateObj = gate as { ok?: boolean; reason?: string; used?: number; quota?: number } | null
      if (gateObj && gateObj.ok === false) {
        if (gateObj.reason === 'suspended') {
          return { id: null, error: 'İşletme askıda. Gönderim kapalı.' }
        }
        if (gateObj.reason === 'monthly_quota') {
          return {
            id: null,
            error: `Aylık mesaj kotası doldu (${gateObj.used ?? '?'}/${gateObj.quota ?? '?'}). Planı yükseltin.`,
          }
        }
        return { id: null, error: 'Gönderim şu an kapalı.' }
      }
    }

    for (const [table, id] of [
      ['accounts', options.accountId],
      ['campaigns', options.campaignId],
    ] as const) {
      if (!id) continue
      const { data: resource, error } = await supabase
        .from(table)
        .select('id')
        .eq('id', id)
        .eq('org_id', org.id)
        .maybeSingle()
      if (error || !resource) {
        return { id: null, error: 'İşlem bu çalışma alanına ait bir kayıt için yapılmalı.' }
      }
    }

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
