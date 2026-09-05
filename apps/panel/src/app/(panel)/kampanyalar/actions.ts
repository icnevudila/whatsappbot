'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { enqueueJob } from '@/lib/jobs'
import { requireActiveOrg } from '@/lib/org'

export type CampaignState = { error: string } | null

export async function createCampaign(
  _previous: CampaignState,
  formData: FormData,
): Promise<CampaignState> {
  const name = String(formData.get('name') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()
  const mediaUrl = String(formData.get('media_url') ?? '').trim()
  const rawType = String(formData.get('message_type') ?? '').trim()
  const listIds = formData.getAll('lists').map(String).filter(Boolean)
  const accountIds = formData.getAll('accounts').map(String).filter(Boolean)

  const minDelay = Number(formData.get('min_delay') ?? 8)
  const maxDelay = Number(formData.get('max_delay') ?? 25)
  const dailyCap = Number(formData.get('daily_cap') ?? 100)
  const startMode = String(formData.get('start_mode') ?? 'now').trim()
  const scheduledRaw = String(formData.get('scheduled_at') ?? '').trim()

  const MEDIA_TYPES = new Set(['image', 'video', 'document'])
  let messageType: 'text' | 'image' | 'video' | 'document' = 'text'
  if (!mediaUrl) {
    messageType = 'text'
  } else if (MEDIA_TYPES.has(rawType)) {
    messageType = rawType as 'image' | 'video' | 'document'
  } else {
    // Tip gelmezse güvenli varsayılan: görsel (eski formlar / hızlı yollar).
    messageType = 'image'
  }

  if (!name) return { error: 'Kampanyaya bir ad verin.' }
  if (!body && !mediaUrl) return { error: 'Mesaj metni veya bir medya dosyası gerekli.' }
  if (messageType !== 'text' && !mediaUrl) {
    return { error: 'Görsel, video veya belge tipi için medya URL’si gerekli.' }
  }
  if (mediaUrl) {
    try {
      const url = new URL(mediaUrl)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return { error: 'Medya adresi http:// veya https:// ile başlamalı.' }
      }
    } catch {
      return { error: 'Medya adresi geçerli bir URL olmalı.' }
    }
  }
  if (listIds.length === 0) return { error: 'En az bir kişi listesi seçin.' }
  if (accountIds.length === 0) return { error: 'En az bir gönderen hesap seçin.' }
  if (minDelay > maxDelay) {
    return { error: 'En kısa bekleme, en uzun beklemeden büyük olamaz.' }
  }
  if (minDelay < 3) {
    // Sabit veya çok kısa aralık toplu gönderimi makine gibi gösteriyor.
    return { error: 'Güvenlik için en kısa bekleme 3 saniyeden az olamaz.' }
  }

  let scheduledAt: string | null = null
  if (startMode === 'schedule') {
    if (!scheduledRaw) return { error: 'Zamanlanmış başlangıç için tarih/saat seçin.' }
    const when = new Date(scheduledRaw)
    if (Number.isNaN(when.getTime())) return { error: 'Geçersiz zamanlama.' }
    if (when.getTime() < Date.now() + 60_000) {
      return { error: 'Zamanlama en az 1 dakika sonrası olmalı.' }
    }
    scheduledAt = when.toISOString()
  }

  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .insert({
      org_id: org.id,
      created_by: userId,
      name,
      body: body || null,
      media_url: mediaUrl || null,
      message_type: messageType,
      source_list_ids: listIds,
      min_delay_seconds: minDelay,
      max_delay_seconds: maxDelay,
      daily_cap_per_account: dailyCap,
      status: scheduledAt ? 'scheduled' : 'draft',
      scheduled_at: scheduledAt,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  const { error: linkError } = await supabase.from('campaign_accounts').insert(
    accountIds.map((accountId) => ({
      org_id: org.id,
      created_by: userId,
      campaign_id: campaign.id,
      account_id: accountId,
    })),
  )

  if (linkError) return { error: linkError.message }

  if (!scheduledAt) {
    const { error: jobError } = await enqueueJob({
      type: 'campaign.start',
      campaignId: campaign.id,
      priority: 10,
    })
    if (jobError) return { error: jobError }
  }

  revalidatePath('/kampanyalar')
  redirect(`/kampanyalar/${campaign.id}`)
}

async function control(
  campaignId: string,
  type: 'campaign.start' | 'campaign.pause' | 'campaign.resume' | 'campaign.stop',
): Promise<{ error?: string }> {
  const { error } = await enqueueJob({ type, campaignId, priority: 10 })
  if (error) return { error }

  revalidatePath(`/kampanyalar/${campaignId}`)
  revalidatePath('/kampanyalar')
  return {}
}

export async function startCampaign(campaignId: string) {
  return control(campaignId, 'campaign.start')
}

export async function pauseCampaign(campaignId: string) {
  return control(campaignId, 'campaign.pause')
}

export async function resumeCampaign(campaignId: string) {
  return control(campaignId, 'campaign.resume')
}

export async function stopCampaign(campaignId: string) {
  return control(campaignId, 'campaign.stop')
}
