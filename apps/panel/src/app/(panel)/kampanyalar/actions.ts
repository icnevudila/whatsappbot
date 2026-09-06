'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { enqueueJob } from '@/lib/jobs'
import { requireActiveOrg } from '@/lib/org'
import {
  validateAbSettings,
  validateCampaignSettings,
  validateMediaUrl,
  validateSchedule,
} from '@/lib/campaign-validation'

export type CampaignState = { error?: string; ok?: string } | null

export async function createCampaign(
  _previous: CampaignState,
  formData: FormData,
): Promise<CampaignState> {
  const name = String(formData.get('name') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()
  const bodyB = String(formData.get('body_b') ?? '').trim()
  const mediaUrl = String(formData.get('media_url') ?? '').trim()
  const listIds = [...new Set(formData.getAll('lists').map(String).filter(Boolean))]
  const accountIds = [...new Set(formData.getAll('accounts').map(String).filter(Boolean))]
  const startMode = String(formData.get('start_mode') ?? 'now').trim() || 'now'
  const scheduledAtRaw = String(formData.get('scheduled_at') ?? '').trim()

  const minDelay = Number(formData.get('min_delay') ?? 8)
  const maxDelay = Number(formData.get('max_delay') ?? 25)
  const dailyCap = Number(formData.get('daily_cap') ?? 100)
  const abPercentRaw = formData.get('ab_percent')
  const abPercent = abPercentRaw === null || abPercentRaw === '' ? 0 : Number(abPercentRaw)

  const validationError =
    validateCampaignSettings(minDelay, maxDelay, dailyCap) ||
    validateMediaUrl(mediaUrl) ||
    validateAbSettings(abPercent, bodyB) ||
    validateSchedule(startMode, scheduledAtRaw)
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
  if (lists.error || accounts.error || lists.data?.length !== listIds.length || accounts.data?.length !== accountIds.length) {
    return { error: 'Seçilen listeleri ve gönderime açık hatları kontrol edin.' }
  }

  const schedule = startMode === 'schedule'
  const scheduledAt = schedule ? new Date(scheduledAtRaw).toISOString() : null

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .insert({
      org_id: org.id,
      created_by: userId,
      name,
      body: body || null,
      body_b: abPercent > 0 ? bodyB || null : null,
      ab_percent: abPercent > 0 ? abPercent : 0,
      media_url: mediaUrl || null,
      message_type: mediaUrl ? 'image' : 'text',
      source_list_ids: listIds,
      min_delay_seconds: minDelay,
      max_delay_seconds: maxDelay,
      daily_cap_per_account: dailyCap,
      scheduled_at: scheduledAt,
      status: schedule ? 'scheduled' : 'draft',
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
    await supabase.from('campaigns').delete().eq('id', campaign.id).eq('org_id', org.id).eq('status', schedule ? 'scheduled' : 'draft')
    return { error: 'Gönderen hatlar bağlanamadı. Tekrar deneyin.' }
  }

  if (schedule) {
    revalidatePath('/kampanyalar')
    redirect(`/kampanyalar/${campaign.id}?zamanlandi=1`)
  }

  // Taslak: job yok; detay sayfasından "Gönderimi başlat".
  if (startMode === 'draft') {
    revalidatePath('/kampanyalar')
    redirect(`/kampanyalar/${campaign.id}?taslak=1`)
  }

  // Hemen baslat.
  const { error: jobError } = await enqueueJob({
    type: 'campaign.start',
    campaignId: campaign.id,
    priority: 10,
  })
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

const EDITABLE_STATUSES = new Set(['draft', 'paused', 'scheduled', 'running', 'stopped'])

function sameIdSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((id) => set.has(id))
}

/**
 * Kampanya düzenleme.
 * - Mesaj/hız: kalan kuyruk gönderim anında yeni değeri kullanır (gönderilmişlere dokunulmaz).
 * - Liste/hat: yalnız draft|paused|scheduled|stopped; running’de önce Duraklat gerekir.
 * - Liste değişince refresh_targets: yeni numaralar eklenir, listeden çıkan queued skip edilir.
 */
export async function updateCampaign(
  _previous: CampaignState,
  formData: FormData,
): Promise<CampaignState> {
  const campaignId = String(formData.get('campaign_id') ?? '').trim()
  if (!campaignId) return { error: 'Kampanya bulunamadı.' }

  const name = String(formData.get('name') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()
  const bodyB = String(formData.get('body_b') ?? '').trim()
  const mediaUrl = String(formData.get('media_url') ?? '').trim()
  const listIds = [...new Set(formData.getAll('lists').map(String).filter(Boolean))]
  const accountIds = [...new Set(formData.getAll('accounts').map(String).filter(Boolean))]
  const minDelay = Number(formData.get('min_delay') ?? 8)
  const maxDelay = Number(formData.get('max_delay') ?? 25)
  const dailyCap = Number(formData.get('daily_cap') ?? 100)
  const abPercentRaw = formData.get('ab_percent')
  const abPercent = abPercentRaw === null || abPercentRaw === '' ? 0 : Number(abPercentRaw)
  const cancelRemaining = String(formData.get('cancel_remaining') ?? '') === '1'
  const resumeAfter = String(formData.get('resume_after') ?? '') === '1'

  const validationError =
    validateCampaignSettings(minDelay, maxDelay, dailyCap) ||
    validateMediaUrl(mediaUrl) ||
    validateAbSettings(abPercent, bodyB)
  if (validationError) return { error: validationError }
  if (!name) return { error: 'Kampanyaya bir ad verin.' }
  if (name.length > 160 || body.length > 4096) {
    return { error: 'Kampanya adı 160, mesaj 4096 karakteri aşamaz.' }
  }
  if (!body && !mediaUrl) return { error: 'Mesaj metni veya bir görsel gerekli.' }
  if (listIds.length === 0) return { error: 'En az bir kişi listesi seçin.' }
  if (accountIds.length === 0) return { error: 'En az bir gönderen hesap seçin.' }

  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const { data: existing, error: loadError } = await supabase
    .from('campaigns')
    .select('id, status, source_list_ids')
    .eq('id', campaignId)
    .eq('org_id', org.id)
    .maybeSingle()

  if (loadError || !existing) return { error: 'Kampanya bulunamadı.' }
  if (!EDITABLE_STATUSES.has(existing.status)) {
    return { error: 'Bu durumda kampanya düzenlenemez (tamamlanmış).' }
  }

  const { data: linkedAccounts } = await supabase
    .from('campaign_accounts')
    .select('account_id')
    .eq('campaign_id', campaignId)
    .eq('org_id', org.id)

  const prevListIds = (existing.source_list_ids as string[] | null) ?? []
  const prevAccountIds = (linkedAccounts ?? []).map((row) => row.account_id)
  const listsChanged = !sameIdSet(prevListIds, listIds)
  const accountsChanged = !sameIdSet(prevAccountIds, accountIds)

  if (existing.status === 'running' && (listsChanged || accountsChanged || cancelRemaining)) {
    return {
      error:
        'Çalışırken liste / hat değişmez veya kuyruk iptal edilemez. Önce Duraklat’a basın.',
    }
  }

  const [lists, accounts] = await Promise.all([
    supabase.from('contact_lists').select('id').eq('org_id', org.id).in('id', listIds),
    supabase.from('accounts').select('id, enabled, is_locked').eq('org_id', org.id).in('id', accountIds),
  ])
  if (lists.error || accounts.error || lists.data?.length !== listIds.length) {
    return { error: 'Seçilen listeleri kontrol edin.' }
  }
  if (!accounts.data || accounts.data.length !== accountIds.length) {
    return { error: 'Seçilen hatları kontrol edin.' }
  }
  const newlyAdded = accountIds.filter((id) => !prevAccountIds.includes(id))
  const badNew = (accounts.data ?? []).filter(
    (row) => newlyAdded.includes(row.id) && (!row.enabled || row.is_locked),
  )
  if (badNew.length > 0) {
    return { error: 'Yeni eklenen hatlar bağlı ve kilitli olmamalı.' }
  }

  const { error: updateError } = await supabase
    .from('campaigns')
    .update({
      name,
      body: body || null,
      body_b: abPercent > 0 ? bodyB || null : null,
      ab_percent: abPercent > 0 ? abPercent : 0,
      media_url: mediaUrl || null,
      message_type: mediaUrl ? 'image' : 'text',
      source_list_ids: listIds,
      min_delay_seconds: minDelay,
      max_delay_seconds: maxDelay,
      daily_cap_per_account: dailyCap,
    })
    .eq('id', campaignId)
    .eq('org_id', org.id)

  if (updateError) return { error: updateError.message }

  if (accountsChanged && existing.status !== 'running') {
    await supabase
      .from('campaign_accounts')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('org_id', org.id)

    const { error: linkError } = await supabase.from('campaign_accounts').insert(
      accountIds.map((accountId) => ({
        org_id: org.id,
        created_by: userId,
        campaign_id: campaignId,
        account_id: accountId,
      })),
    )
    if (linkError) return { error: 'Gönderen hatlar güncellenemedi.' }
  }

  const needsRefresh = listsChanged || cancelRemaining

  if (needsRefresh) {
    const { error: jobError } = await enqueueJob({
      type: 'campaign.refresh_targets',
      campaignId,
      priority: 10,
      payload: { cancel_remaining: cancelRemaining },
    })
    if (jobError) return { error: jobError }
  }

  if (resumeAfter && (existing.status === 'paused' || existing.status === 'stopped')) {
    const { error: resumeError } = await enqueueJob({
      type: existing.status === 'stopped' ? 'campaign.start' : 'campaign.resume',
      campaignId,
      priority: 10,
    })
    if (resumeError) return { error: resumeError }
  }

  revalidatePath(`/kampanyalar/${campaignId}`)
  revalidatePath('/kampanyalar')
  return { ok: 'Kampanya kaydedildi.' }
}

/** Kaynak kampanyayı yeni draft olarak çoğaltır (hedefler/job kopyalanmaz). */
export async function duplicateCampaign(
  campaignId: string,
): Promise<{ error?: string; id?: string }> {
  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const { data: source, error: loadError } = await supabase
    .from('campaigns')
    .select(
      'name, body, body_b, ab_percent, media_url, message_type, source_list_ids, min_delay_seconds, max_delay_seconds, daily_cap_per_account',
    )
    .eq('id', campaignId)
    .eq('org_id', org.id)
    .maybeSingle()

  if (loadError || !source) return { error: 'Kampanya bulunamadı.' }

  const { data: sourceAccounts } = await supabase
    .from('campaign_accounts')
    .select('account_id')
    .eq('campaign_id', campaignId)
    .eq('org_id', org.id)

  const baseName = source.name.replace(/\s*\(kopya(?:\s+\d+)?\)\s*$/i, '').trim() || source.name
  const copyName = `${baseName} (kopya)`.slice(0, 160)

  const { data: created, error: insertError } = await supabase
    .from('campaigns')
    .insert({
      org_id: org.id,
      created_by: userId,
      name: copyName,
      body: source.body,
      body_b: source.body_b,
      ab_percent: source.ab_percent ?? 0,
      media_url: source.media_url,
      message_type: source.message_type,
      source_list_ids: source.source_list_ids ?? [],
      min_delay_seconds: source.min_delay_seconds,
      max_delay_seconds: source.max_delay_seconds,
      daily_cap_per_account: source.daily_cap_per_account,
      status: 'draft',
    })
    .select('id')
    .single()

  if (insertError || !created) return { error: insertError?.message ?? 'Kopya oluşturulamadı.' }

  const accountIds = (sourceAccounts ?? []).map((row) => row.account_id)
  if (accountIds.length > 0) {
    const { error: linkError } = await supabase.from('campaign_accounts').insert(
      accountIds.map((accountId) => ({
        org_id: org.id,
        created_by: userId,
        campaign_id: created.id,
        account_id: accountId,
      })),
    )
    if (linkError) {
      await supabase.from('campaigns').delete().eq('id', created.id).eq('org_id', org.id)
      return { error: 'Kopya hatları bağlanamadı.' }
    }
  }

  revalidatePath('/kampanyalar')
  revalidatePath(`/kampanyalar/${created.id}`)
  return { id: created.id }
}
