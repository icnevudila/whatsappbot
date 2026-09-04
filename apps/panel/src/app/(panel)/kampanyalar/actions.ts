'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { enqueueJob } from '@/lib/jobs'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type CampaignState = { error: string } | null

export async function createCampaign(
  _previous: CampaignState,
  formData: FormData,
): Promise<CampaignState> {
  const name = String(formData.get('name') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()
  const mediaUrl = String(formData.get('media_url') ?? '').trim()
  const listIds = formData.getAll('lists').map(String).filter(Boolean)
  const accountIds = formData.getAll('accounts').map(String).filter(Boolean)

  const minDelay = Number(formData.get('min_delay') ?? 8)
  const maxDelay = Number(formData.get('max_delay') ?? 25)
  const dailyCap = Number(formData.get('daily_cap') ?? 100)

  if (!name) return { error: 'Kampanyaya bir ad verin.' }
  if (!body && !mediaUrl) return { error: 'Mesaj metni veya bir gorsel gerekli.' }
  if (listIds.length === 0) return { error: 'En az bir kisi listesi secin.' }
  if (accountIds.length === 0) return { error: 'En az bir gonderen hesap secin.' }
  if (minDelay > maxDelay) {
    return { error: 'En kisa bekleme, en uzun beklemeden buyuk olamaz.' }
  }
  if (minDelay < 3) {
    // Sabit veya cok kisa aralik toplu gonderimi makine gibi gosteriyor.
    return { error: 'Guvenlik icin en kisa bekleme 3 saniyeden az olamaz.' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum bulunamadi.' }

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .insert({
      owner_id: user.id,
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
      owner_id: user.id,
      campaign_id: campaign.id,
      account_id: accountId,
    })),
  )

  if (linkError) return { error: linkError.message }

  // Hizli gonderim ile ayni zihin modeli: olustur = hemen baslat.
  const { error: jobError } = await enqueueJob({
    type: 'campaign.start',
    campaignId: campaign.id,
    priority: 10,
  })
  if (jobError) return { error: jobError }

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
