'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { enqueueJob } from '@/lib/jobs'
import { requireActiveOrg } from '@/lib/org'
import { validateCampaignSettings, validateMediaUrl } from '@/lib/campaign-validation'

export type CampaignState = { error: string } | null

export async function createCampaign(
  _previous: CampaignState,
  formData: FormData,
): Promise<CampaignState> {
  const name = String(formData.get('name') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()
  const mediaUrl = String(formData.get('media_url') ?? '').trim()
  const listIds = [...new Set(formData.getAll('lists').map(String).filter(Boolean))]
  const accountIds = [...new Set(formData.getAll('accounts').map(String).filter(Boolean))]

  const minDelay = Number(formData.get('min_delay') ?? 8)
  const maxDelay = Number(formData.get('max_delay') ?? 25)
  const dailyCap = Number(formData.get('daily_cap') ?? 100)
  const validationError = validateCampaignSettings(minDelay, maxDelay, dailyCap) || validateMediaUrl(mediaUrl)
  if (validationError) return { error: validationError }
  if (name.length > 160 || body.length > 4096) return { error: 'Kampanya adı 160, mesaj 4096 karakteri aşamaz.' }

  if (!name) return { error: 'Kampanyaya bir ad verin.' }
  if (!body && !mediaUrl) return { error: 'Mesaj metni veya bir gorsel gerekli.' }
  if (listIds.length === 0) return { error: 'En az bir kişi listesi seçin.' }
  if (accountIds.length === 0) return { error: 'En az bir gönderen hesap seçin.' }
  if (minDelay > maxDelay) {
    return { error: 'En kisa bekleme, en uzun beklemeden buyuk olamaz.' }
  }
  if (minDelay < 3) {
    // Sabit veya cok kisa aralik toplu gonderimi makine gibi gosteriyor.
    return { error: 'Guvenlik icin en kisa bekleme 3 saniyeden az olamaz.' }
  }

  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadi.' }
  }

  const [lists, accounts] = await Promise.all([
    supabase.from('contact_lists').select('id').eq('org_id', org.id).in('id', listIds),
    supabase.from('accounts').select('id').eq('org_id', org.id).in('id', accountIds).eq('enabled', true).eq('is_locked', false),
  ])
  if (lists.error || accounts.error || lists.data?.length !== listIds.length || accounts.data?.length !== accountIds.length) return { error: 'Seçilen listeleri ve gönderime açık hatları kontrol edin.' }

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .insert({
      org_id: org.id,
      created_by: userId,
      name,
      body: body || null,
      media_url: mediaUrl || null,
      message_type: mediaUrl ? 'image' : 'text',
      source_list_ids: listIds,
      min_delay_seconds: minDelay,
      max_delay_seconds: maxDelay,
      daily_cap_per_account: dailyCap,
      status: 'draft',
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

  if (linkError) {
    await supabase.from('campaigns').delete().eq('id', campaign.id).eq('org_id', org.id).eq('status', 'draft')
    return { error: 'Gönderen hatlar bağlanamadı. Tekrar deneyin.' }
  }

  // Hizli gonderim ile ayni zihin modeli: olustur = hemen baslat.
  const { error: jobError } = await enqueueJob({
    type: 'campaign.start',
    campaignId: campaign.id,
    priority: 10,
  })
  // Preserve a reviewable draft if queueing fails, rather than creating a duplicate on resubmit.
  if (jobError) {
    revalidatePath('/kampanyalar')
    redirect(`/kampanyalar/${campaign.id}?uyari=baslatilamadi`)
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
