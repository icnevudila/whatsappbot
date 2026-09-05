'use server'

import { parsePhoneList } from '@wa/shared'
import { enqueueJob } from '@/lib/jobs'
import { requireActiveOrg } from '@/lib/org'
import { publicEnv } from '@/lib/env'

export type StepState = {
  error?: string
  ok?: string
  listId?: string
  accountId?: string
  validCount?: number
  invalidCount?: number
  panelUrl?: string
} | null

const CHUNK = 500
const DEFAULT_COLORS = {
  primary: '#2f5bff',
  secondary: '#646b7c',
  accent: '#2f5bff',
  background: '#ffffff',
  text: '#161925',
}

async function setOnboardingStep(step: string, done = false) {
  const { userId, supabase } = await requireActiveOrg()
  await supabase
    .from('profiles')
    .update({
      onboarding_step: step,
      ...(done ? { onboarded_at: new Date().toISOString() } : {}),
    })
    .eq('id', userId)
}

export async function saveBrandStep(
  _prev: StepState,
  formData: FormData,
): Promise<StepState> {
  const name = String(formData.get('brandName') ?? '').trim()
  const tagline = String(formData.get('brandTagline') ?? '').trim()
  if (!name) return { error: 'Marka adı gerekli.' }

  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const { data: existing } = await supabase
    .from('brand_kits')
    .select('id')
    .eq('org_id', org.id)
    .eq('is_default', true)
    .maybeSingle()

  const payload = {
    org_id: org.id,
    created_by: userId,
    name,
    colors: DEFAULT_COLORS,
    logo_path: null as string | null,
    is_default: true,
    // tagline için description yoksa name yeterli; company profiline de yaz.
  }

  const { error } = existing
    ? await supabase.from('brand_kits').update(payload).eq('id', existing.id)
    : await supabase.from('brand_kits').insert(payload)

  if (error) return { error: error.message }

  if (tagline) {
    await supabase.from('profiles').update({ company: tagline }).eq('id', userId)
  }

  await setOnboardingStep('liste')
  return { ok: 'Marka kaydedildi.' }
}

export async function saveListStep(
  _prev: StepState,
  formData: FormData,
): Promise<StepState> {
  const raw = String(formData.get('numbers') ?? '')
  const parsed = parsePhoneList(raw)
  if (parsed.valid.length === 0) {
    return { error: 'Geçerli en az bir numara girin.' }
  }

  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const stamp = new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date())

  const { data: list, error: listError } = await supabase
    .from('contact_lists')
    .insert({
      org_id: org.id,
      created_by: userId,
      name: `Kurulum listesi · ${stamp}`,
      source: 'manual',
      description: 'Onboarding ile oluşturuldu.',
    })
    .select('id')
    .single()

  if (listError) return { error: listError.message }

  let linked = 0
  for (let index = 0; index < parsed.valid.length; index += CHUNK) {
    const chunk = parsed.valid.slice(index, index + CHUNK)
    const { error: contactError } = await supabase.from('contacts').upsert(
      chunk.map((row) => ({
        org_id: org.id,
        created_by: userId,
        phone_e164: row.phone_e164,
        name: row.name,
        source: 'manual' as const,
      })),
      { onConflict: 'org_id,phone_e164', ignoreDuplicates: true },
    )
    if (contactError) return { error: contactError.message }

    const phones = chunk.map((row) => row.phone_e164)
    const { data: resolved, error: resolveError } = await supabase
      .from('contacts')
      .select('id')
      .eq('org_id', org.id)
      .in('phone_e164', phones)
    if (resolveError) return { error: resolveError.message }

    const contactIds = (resolved ?? []).map((c) => c.id)
    const { error: memberError } = await supabase.from('contact_list_members').upsert(
      contactIds.map((contactId) => ({
        org_id: org.id,
        created_by: userId,
        list_id: list.id,
        contact_id: contactId,
      })),
      { onConflict: 'list_id,contact_id', ignoreDuplicates: true },
    )
    if (memberError) return { error: memberError.message }
    linked += contactIds.length
  }

  await supabase.from('contact_lists').update({ contact_count: linked }).eq('id', list.id)
  await setOnboardingStep('wa-hat')
  return { ok: `${linked} numara eklendi.`, listId: list.id }
}

export async function skipListStep(): Promise<StepState> {
  await setOnboardingStep('wa-hat')
  return { ok: 'Liste atlandı.' }
}

export async function startWaConnect(
  _prev: StepState,
  formData: FormData,
): Promise<StepState> {
  const label = String(formData.get('label') ?? '').trim() || 'Ana hat'

  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const { data: existing } = await supabase
    .from('accounts')
    .select('id, status')
    .eq('org_id', org.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existing?.status === 'connected') {
    await setOnboardingStep('wa-kontrol')
    return { ok: 'Hat zaten bağlı.', accountId: existing.id }
  }

  let accountId = existing?.id
  if (!accountId) {
    const { count } = await supabase
      .from('accounts')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
    if ((count ?? 0) >= org.accounts_quota) {
      return { error: `Hat kotası dolu (${count}/${org.accounts_quota}).` }
    }
    const { data: account, error } = await supabase
      .from('accounts')
      .insert({ org_id: org.id, created_by: userId, label })
      .select('id')
      .single()
    if (error) return { error: error.message }
    accountId = account.id
  }

  const { error: jobError } = await enqueueJob({
    type: 'account.connect',
    accountId,
    priority: 10,
  })
  if (jobError) return { error: jobError }

  await setOnboardingStep('wa-hat')
  return { ok: 'QR hazırlanıyor.', accountId }
}

export async function skipWaHatStep(): Promise<StepState> {
  await setOnboardingStep('wa-kontrol')
  return { ok: 'Hat adımı atlandı.' }
}

export async function markWaConnected(): Promise<StepState> {
  await setOnboardingStep('wa-kontrol')
  return { ok: 'Hat bağlandı.' }
}

export async function verifyOnboardingList(
  _prev: StepState,
  formData: FormData,
): Promise<StepState> {
  const listId = String(formData.get('listId') ?? '').trim()

  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const { data: live } = await supabase
    .from('accounts')
    .select('id')
    .eq('org_id', org.id)
    .eq('status', 'connected')
    .limit(1)
    .maybeSingle()

  if (!live) {
    return { error: 'Kontrol için bağlı bir WhatsApp hattı gerekli.' }
  }

  let targetListId = listId
  if (!targetListId) {
    const { data: latest } = await supabase
      .from('contact_lists')
      .select('id')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    targetListId = latest?.id ?? ''
  }

  if (!targetListId) {
    return { error: 'Doğrulanacak liste yok. Önce numara ekleyin veya adımı atlayın.' }
  }

  const { error: jobError } = await enqueueJob({
    type: 'contacts.verify',
    payload: { list_id: targetListId },
    accountId: live.id,
    priority: 20,
  })
  if (jobError) return { error: jobError }

  // Worker async: sabit 2.5s'e güvenme. Kısa poll ile wa_status güncellenmesini izle.
  let validCount = 0
  let invalidCount = 0
  for (let attempt = 0; attempt < 8; attempt++) {
    await new Promise((r) => setTimeout(r, 400))
    const [{ count: valid }, { count: invalid }, { count: pending }] = await Promise.all([
      supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('wa_status', 'valid'),
      supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('wa_status', 'invalid'),
      supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('type', 'contacts.verify')
        .in('status', ['pending', 'claimed', 'running']),
    ])
    validCount = valid ?? 0
    invalidCount = invalid ?? 0
    if ((validCount > 0 || invalidCount > 0) && (pending ?? 0) === 0) break
    if (attempt >= 3 && (validCount > 0 || invalidCount > 0)) break
  }

  await setOnboardingStep('ilk-mesaj')
  return {
    ok: 'Doğrulama kuyruğa alındı.',
    listId: targetListId,
    validCount,
    invalidCount,
  }
}

export async function skipVerifyStep(): Promise<StepState> {
  await setOnboardingStep('ilk-mesaj')
  return { ok: 'Doğrulama atlandı.' }
}

export async function firstSendStep(
  _prev: StepState,
  formData: FormData,
): Promise<StepState> {
  const body = String(formData.get('message') ?? '').trim()
  const raw = String(formData.get('numbers') ?? '')
  if (!body) return { error: 'Mesaj metni gerekli.' }

  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('org_id', org.id)
    .eq('status', 'connected')
    .limit(1)
    .maybeSingle()

  if (!account) {
    return { error: 'Gönderim için bağlı bir hat gerekli.' }
  }

  const parsed = parsePhoneList(raw)
  if (parsed.valid.length === 0) {
    // Listeden son listeyi kullan.
    const { data: list } = await supabase
      .from('contact_lists')
      .select('id')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!list) {
      return {
        error:
          'Gönderilecek numara yok. Önceki adımda liste atlandıysa bu ekranda en az bir numara yapıştırın veya panele geçip listeden devam edin.',
      }
    }

    const stamp = new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date())
    const campaignName = `İlk mesaj · ${stamp}`

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        org_id: org.id,
        created_by: userId,
        name: campaignName,
        body,
        media_url: null,
        message_type: 'text',
        source_list_ids: [list.id],
        min_delay_seconds: 8,
        max_delay_seconds: 25,
        daily_cap_per_account: 250,
        status: 'draft',
      })
      .select('id')
      .single()

    if (campaignError) return { error: campaignError.message }

    await supabase.from('campaign_accounts').insert({
      org_id: org.id,
      created_by: userId,
      campaign_id: campaign.id,
      account_id: account.id,
    })

    const { error: jobError } = await enqueueJob({
      type: 'campaign.start',
      campaignId: campaign.id,
      priority: 10,
    })
    if (jobError) return { error: jobError }

    await setOnboardingStep('done', true)
    return {
      ok: 'Kampanya başlatıldı.',
      panelUrl: `${publicEnv.panelUrl}/kampanyalar/${campaign.id}`,
    }
  }

  // Hızlı gönderim kalıbı (geçerli yapıştırma varsa).
  const stamp = new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date())
  const campaignName = `İlk mesaj · ${stamp}`

  const { data: list, error: listError } = await supabase
    .from('contact_lists')
    .insert({
      org_id: org.id,
      created_by: userId,
      name: campaignName,
      source: 'quick_send',
      description: 'Onboarding ilk mesaj',
    })
    .select('id')
    .single()
  if (listError) return { error: listError.message }

  const phones = parsed.valid.map((r) => r.phone_e164)
  await supabase.from('contacts').upsert(
    parsed.valid.map((row) => ({
      org_id: org.id,
      created_by: userId,
      phone_e164: row.phone_e164,
      name: row.name,
      source: 'manual' as const,
    })),
    { onConflict: 'org_id,phone_e164', ignoreDuplicates: true },
  )
  const { data: resolved } = await supabase
    .from('contacts')
    .select('id')
    .eq('org_id', org.id)
    .in('phone_e164', phones)

  await supabase.from('contact_list_members').upsert(
    (resolved ?? []).map((c) => ({
      org_id: org.id,
      created_by: userId,
      list_id: list.id,
      contact_id: c.id,
    })),
    { onConflict: 'list_id,contact_id', ignoreDuplicates: true },
  )
  await supabase
    .from('contact_lists')
    .update({ contact_count: resolved?.length ?? 0 })
    .eq('id', list.id)

  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .insert({
      org_id: org.id,
      created_by: userId,
      name: campaignName,
      body,
      media_url: null,
      message_type: 'text',
      source_list_ids: [list.id],
      min_delay_seconds: 8,
      max_delay_seconds: 25,
      daily_cap_per_account: 250,
      status: 'draft',
    })
    .select('id')
    .single()
  if (campaignError) return { error: campaignError.message }

  await supabase.from('campaign_accounts').insert({
    org_id: org.id,
    created_by: userId,
    campaign_id: campaign.id,
    account_id: account.id,
  })

  const { error: jobError } = await enqueueJob({
    type: 'campaign.start',
    campaignId: campaign.id,
    priority: 10,
  })
  if (jobError) return { error: jobError }

  await setOnboardingStep('done', true)
  return {
    ok: 'İlk mesaj gönderimi başlatıldı.',
    panelUrl: `${publicEnv.panelUrl}/kampanyalar/${campaign.id}`,
  }
}

export async function finishToPanel(): Promise<StepState> {
  await setOnboardingStep('done', true)
  return { panelUrl: `${publicEnv.panelUrl}/ozet` }
}
