'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { toE164, type Json } from '@wa/shared'
import { enqueueJob } from '@/lib/jobs'
import { isTrMobileMasked, STEP_TO_PROFILE, type OnboardingFlags } from '@/lib/onboarding'
import { requireActiveOrg } from '@/lib/org'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type OnboardState = {
  error?: string
  ok?: string
  next?: string
  accountId?: string
  jobId?: string
  importedCount?: number
  brand?: {
    name: string
    colors: Record<string, string>
    fonts: Record<string, string>
    tone: string
  }
} | null

async function requireUser() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Oturum bulunamadı.')
  return { supabase, user }
}

async function setProfileStep(userId: string, step: keyof typeof STEP_TO_PROFILE) {
  const supabase = await createSupabaseServerClient()
  await supabase
    .from('profiles')
    .update({ onboarding_step: STEP_TO_PROFILE[step] })
    .eq('id', userId)
}

async function mergeOrgOnboarding(orgId: string, patch: OnboardingFlags) {
  const { org, supabase } = await requireActiveOrg()
  if (org.id !== orgId) throw new Error('İşletme erişimi yok.')
  const { data } = await supabase
    .from('organizations')
    .select('onboarding')
    .eq('id', orgId)
    .maybeSingle()
  const current =
    data?.onboarding && typeof data.onboarding === 'object' && !Array.isArray(data.onboarding)
      ? (data.onboarding as OnboardingFlags)
      : {}
  const { error } = await supabase
    .from('organizations')
    .update({ onboarding: { ...current, ...patch } as Json })
    .eq('id', orgId)
  if (error) throw new Error(error.message)
}

export async function startWelcome(): Promise<OnboardState> {
  try {
    const { user, supabase } = await requireUser()
    const { data: membership } = await supabase
      .from('organization_members')
      .select('org_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
    const next = membership ? 'adres' : 'isletme'
    await setProfileStep(user.id, next)
    revalidatePath('/erisim-yok')
    return { ok: 'devam', next }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }
}

export async function saveBusinessName(
  _prev: OnboardState,
  formData: FormData,
): Promise<OnboardState> {
  const name = String(formData.get('name') ?? '').trim()
  if (name.length < 2) return { error: 'İşletme adı en az 2 karakter olmalı.' }
  if (name.length > 80) return { error: 'İşletme adı en fazla 80 karakter olabilir.' }

  try {
    const { user, supabase } = await requireUser()
    const { data: orgId, error } = await supabase.rpc('onboard_create_organization', {
      p_name: name,
    })
    if (error) {
      if (error.message.includes('org limit reached')) {
        return { error: 'En fazla 3 işletme sahibi olabilirsiniz.' }
      }
      return { error: error.message }
    }
    if (orgId) {
      await supabase.from('organizations').update({ name }).eq('id', orgId)
    }
    await setProfileStep(user.id, 'adres')
    revalidatePath('/erisim-yok')
    return { ok: 'kaydedildi', next: 'adres' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Kayıt başarısız.' }
  }
}

export async function saveAddress(
  _prev: OnboardState,
  formData: FormData,
): Promise<OnboardState> {
  const address = String(formData.get('address') ?? '').trim()
  if (address.length < 8) return { error: 'Açık adresi yazın (sokak, no, ilçe, il).' }
  if (address.length > 400) return { error: 'Adres en fazla 400 karakter olabilir.' }

  try {
    const { userId, org, supabase } = await requireActiveOrg()
    const { error } = await supabase.from('organizations').update({ address }).eq('id', org.id)
    if (error) return { error: error.message }
    await setProfileStep(userId, 'hat')
    revalidatePath('/erisim-yok')
    return { ok: 'kaydedildi', next: 'hat' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Adres kaydedilemedi.' }
  }
}

export async function startWhatsAppPairing(
  _prev: OnboardState,
  formData: FormData,
): Promise<OnboardState> {
  const masked = String(formData.get('phone') ?? '').trim()
  if (!isTrMobileMasked(masked)) {
    return { error: 'Numara 05XX XXX XX XX formatında olmalı.' }
  }
  const e164 = toE164(masked)
  if (!e164) return { error: 'Geçerli bir Türkiye cep numarası girin.' }

  try {
    const { userId, org, supabase } = await requireActiveOrg()
    const { error: orgError } = await supabase
      .from('organizations')
      .update({ phone_e164: e164 })
      .eq('id', org.id)
    if (orgError) return { error: orgError.message }

    const { data: existing } = await supabase
      .from('accounts')
      .select('id, status')
      .eq('org_id', org.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    let accountId = existing?.id
    if (!accountId) {
      const { data: created, error: createError } = await supabase
        .from('accounts')
        .insert({
          org_id: org.id,
          created_by: userId,
          label: org.name,
          phone_e164: e164,
        })
        .select('id')
        .single()
      if (createError) return { error: createError.message }
      accountId = created.id
    }

    if (existing?.status !== 'connected') {
      const { error: jobError } = await enqueueJob({
        type: 'account.request_pairing_code',
        accountId,
        priority: 10,
        payload: { phone_e164: e164 },
      })
      if (jobError) return { error: jobError }
    }

    await setProfileStep(userId, 'hat')
    revalidatePath('/erisim-yok')
    return { ok: 'kod', accountId, next: 'hat' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'WhatsApp bağlantısı başlatılamadı.' }
  }
}

export async function advanceAfterWhatsApp(): Promise<OnboardState> {
  try {
    const { userId, org, supabase } = await requireActiveOrg()
    const { data: account } = await supabase
      .from('accounts')
      .select('status')
      .eq('org_id', org.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (account?.status !== 'connected') {
      return { error: 'Önce WhatsApp hattını bağlayın.' }
    }
    await setProfileStep(userId, 'rehber')
    revalidatePath('/erisim-yok')
    return { ok: 'bagli', next: 'rehber' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Devam edilemedi.' }
  }
}

export async function skipContactsImport(): Promise<OnboardState> {
  try {
    const { userId, org } = await requireActiveOrg()
    await mergeOrgOnboarding(org.id, { skipped_contacts: true })
    await setProfileStep(userId, 'tanitim')
    revalidatePath('/erisim-yok')
    return { ok: 'atlandi', next: 'tanitim' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Atlanamadı.' }
  }
}

export async function startContactsImport(): Promise<OnboardState> {
  try {
    const { org, supabase } = await requireActiveOrg()
    const { data: account } = await supabase
      .from('accounts')
      .select('id, status')
      .eq('org_id', org.id)
      .eq('status', 'connected')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (!account) return { error: 'Bağlı bir WhatsApp hattı yok.' }

    const { id, error } = await enqueueJob({
      type: 'account.sync_contacts',
      accountId: account.id,
      priority: 30,
      payload: { list_name: 'Rehberim' },
    })
    if (error || !id) return { error: error ?? 'İş kuyruğa alınamadı.' }
    return { ok: 'cekiliyor', jobId: id }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Rehber alınamadı.' }
  }
}

export async function finishContactsImport(importedHint?: number): Promise<OnboardState> {
  try {
    const { userId, org, supabase } = await requireActiveOrg()
    const { data: list } = await supabase
      .from('contact_lists')
      .select('id, contact_count')
      .eq('org_id', org.id)
      .eq('name', 'Rehberim')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let memberCount = 0
    if (list?.id) {
      const { count } = await supabase
        .from('contact_list_members')
        .select('contact_id', { count: 'exact', head: true })
        .eq('list_id', list.id)
      memberCount = count ?? 0
    }

    const importedCount = Math.max(
      list?.contact_count ?? 0,
      memberCount,
      typeof importedHint === 'number' && Number.isFinite(importedHint) ? importedHint : 0,
    )

    await mergeOrgOnboarding(org.id, {
      contacts_imported: true,
      contacts_imported_count: importedCount,
    })
    await setProfileStep(userId, 'tanitim')
    revalidatePath('/erisim-yok')
    return { ok: 'alindi', importedCount }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Devam edilemedi.' }
  }
}

export async function saveAbout(
  _prev: OnboardState,
  formData: FormData,
): Promise<OnboardState> {
  const about = String(formData.get('about') ?? '').trim()
  if (about.length < 12) return { error: 'İşletmenizi bir-iki cümleyle tanıtın.' }
  if (about.length > 600) return { error: 'Tanıtım en fazla 600 karakter olabilir.' }

  try {
    const { userId, org, supabase } = await requireActiveOrg()
    const { error } = await supabase.from('organizations').update({ about }).eq('id', org.id)
    if (error) return { error: error.message }
    await setProfileStep(userId, 'marka')
    revalidatePath('/erisim-yok')
    return { ok: 'kaydedildi', next: 'marka' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Tanıtım kaydedilemedi.' }
  }
}

type BrandAnalysis = {
  name: string
  colors: Record<string, string>
  fonts: Record<string, string>
  tone: string
}

function hexOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : fallback
}

async function analyzeBrandWithOpenAI(input: {
  name: string
  about: string | null
  address: string | null
  imageBase64?: string
  mime?: string
}): Promise<BrandAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) throw new Error('OPENAI_API_KEY tanımlı değil.')

  const prompt = `Sen bir marka tasarımcısısın. Türkiye’de faaliyet gösteren bir işletme için WhatsApp kampanyalarında kullanılacak brand kit üret.
İşletme adı: ${input.name}
Adres: ${input.address || '—'}
Tanıtım: ${input.about || '—'}
${input.imageBase64 ? 'Görseli analiz et: logo veya örnek kampanya görseli. Renk paleti, font karakteri ve tasarım dilini görselden çıkar.' : 'Görsel yok. Ada ve tanıtıma göre tutarlı, özgün bir kit uydur.'}

Yalnızca JSON dön, markdown yok:
{"name":"kit adı","colors":{"primary":"#hex","secondary":"#hex","accent":"#hex","background":"#hex","text":"#hex"},"fonts":{"heading":"font adı","body":"font adı"},"tone":"Türkçe 2-4 cümle tasarım dili (renk, tipografi, ruh hali, kampanya görseli stili)"}`

  const content: Array<Record<string, unknown>> = [{ type: 'text', text: prompt }]
  if (input.imageBase64 && input.mime) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:${input.mime};base64,${input.imageBase64}` },
    })
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content }],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Marka analizi başarısız (${response.status}). ${body.slice(0, 180)}`)
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const raw = json.choices?.[0]?.message?.content
  if (!raw) throw new Error('Model boş yanıt verdi.')
  const parsed = JSON.parse(raw) as {
    name?: string
    colors?: Record<string, string>
    fonts?: Record<string, string>
    tone?: string
  }

  return {
    name: (parsed.name || `${input.name} kiti`).slice(0, 60),
    colors: {
      primary: hexOr(parsed.colors?.primary, '#111111'),
      secondary: hexOr(parsed.colors?.secondary, '#4b5563'),
      accent: hexOr(parsed.colors?.accent, '#2f5bff'),
      background: hexOr(parsed.colors?.background, '#ffffff'),
      text: hexOr(parsed.colors?.text, '#161925'),
    },
    fonts: {
      heading: String(parsed.fonts?.heading || 'Outfit').slice(0, 40),
      body: String(parsed.fonts?.body || 'Inter').slice(0, 40),
    },
    tone: String(parsed.tone || 'Sade, güvenilir ve net bir marka dili.').slice(0, 600),
  }
}

export async function saveBrandKitStep(formData: FormData): Promise<OnboardState> {
  try {
    const { userId, org, supabase } = await requireActiveOrg()
    const { data: existing } = await supabase
      .from('brand_kits')
      .select('id, name, colors, fonts, tone, logo_path')
      .eq('org_id', org.id)
      .eq('is_default', true)
      .maybeSingle()

    const { data: orgRow } = await supabase
      .from('organizations')
      .select('name, about, address, onboarding')
      .eq('id', org.id)
      .single()

    const flags =
      orgRow?.onboarding && typeof orgRow.onboarding === 'object' && !Array.isArray(orgRow.onboarding)
        ? (orgRow.onboarding as OnboardingFlags)
        : {}

    if (flags.brand_analyzed && existing?.tone) {
      const colors =
        existing.colors && typeof existing.colors === 'object'
          ? (existing.colors as Record<string, string>)
          : {}
      const fonts =
        existing.fonts && typeof existing.fonts === 'object'
          ? (existing.fonts as Record<string, string>)
          : {}
      return {
        ok: 'mevcut',
        brand: {
          name: existing.name,
          colors,
          fonts,
          tone: existing.tone,
        },
      }
    }

    const file = formData.get('asset')
    let imageBase64: string | undefined
    let mime: string | undefined
    let logoPath: string | null = existing?.logo_path ?? null

    if (file instanceof File && file.size > 0) {
      if (file.size > 5 * 1024 * 1024) return { error: 'Görsel en fazla 5 MB olabilir.' }
      const allowed = ['image/png', 'image/jpeg', 'image/webp']
      if (!allowed.includes(file.type)) return { error: 'PNG, JPG veya WEBP yükleyin.' }
      const buffer = Buffer.from(await file.arrayBuffer())
      imageBase64 = buffer.toString('base64')
      mime = file.type
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
      const path = `${userId}/onboarding/brand.${ext}`
      const { error: upError } = await supabase.storage.from('brand-assets').upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      })
      if (upError) return { error: upError.message }
      logoPath = path
    }

    const analysis = await analyzeBrandWithOpenAI({
      name: orgRow?.name ?? org.name,
      about: orgRow?.about ?? null,
      address: orgRow?.address ?? null,
      imageBase64,
      mime,
    })

    const payload = {
      org_id: org.id,
      created_by: userId,
      name: analysis.name,
      colors: analysis.colors,
      fonts: analysis.fonts,
      tone: analysis.tone,
      logo_path: logoPath,
      is_default: true,
    }

    const { error } = existing
      ? await supabase.from('brand_kits').update(payload).eq('id', existing.id).eq('org_id', org.id)
      : await supabase.from('brand_kits').insert(payload)
    if (error) return { error: error.message }

    await mergeOrgOnboarding(org.id, { brand_analyzed: true })
    await setProfileStep(userId, 'marka')
    revalidatePath('/erisim-yok')
    return { ok: 'analiz', brand: analysis }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Marka kiti oluşturulamadı.' }
  }
}

export async function completeOnboarding(): Promise<OnboardState> {
  try {
    const { userId, org, supabase } = await requireActiveOrg()
    const { data: kit } = await supabase
      .from('brand_kits')
      .select('id')
      .eq('org_id', org.id)
      .eq('is_default', true)
      .maybeSingle()
    if (!kit) return { error: 'Önce marka kitini oluşturun.' }

    await supabase
      .from('profiles')
      .update({
        onboarding_step: 'done',
        onboarded_at: new Date().toISOString(),
      })
      .eq('id', userId)

    revalidatePath('/', 'layout')
    redirect('/ozet')
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'digest' in error &&
      typeof (error as { digest?: string }).digest === 'string' &&
      (error as { digest: string }).digest.startsWith('NEXT_REDIRECT')
    ) {
      throw error
    }
    return { error: error instanceof Error ? error.message : 'Tamamlanamadı.' }
  }
}
