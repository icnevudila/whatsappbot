'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isOrgAdminRole, requireActiveOrg } from '@/lib/org'
import { DEFAULT_COLORS } from '@/lib/creative-templates'
import { readImageFile } from '../upload-image'

export type BrandKitState = { error?: string; ok?: string; kitId?: string } | null

function revalidateBrand(id?: string) {
  revalidatePath('/ayarlar/marka')
  if (id) revalidatePath(`/ayarlar/marka/${id}`)
}

function readColor(formData: FormData, key: string, fallback: string) {
  const value = String(formData.get(key) ?? '').trim()
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : fallback
}

function hexOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : fallback
}

async function requireBrandAdmin() {
  const ctx = await requireActiveOrg()
  if (!isOrgAdminRole(ctx.org.role)) {
    throw new Error('Marka kitini yalnızca sahip veya yönetici yönetebilir.')
  }
  return ctx
}

async function analyzeBrandWithOpenAI(input: {
  name: string
  about: string | null
  imageBase64?: string
  mime?: string
}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) throw new Error('OPENAI_API_KEY tanımlı değil.')

  const prompt = `Sen bir marka tasarımcısısın. Türkiye’de faaliyet gösteren bir işletme için WhatsApp kampanyalarında kullanılacak brand kit üret.
İşletme / kit bağlamı: ${input.name}
Açıklama: ${input.about || '—'}
${input.imageBase64 ? 'Görseli analiz et: örnek kampanya veya marka görseli. Renk paleti, font karakteri ve tasarım dilini görselden çıkar. Bu işletme logosu değil, stil referansıdır.' : 'Görsel yok. Ada ve açıklamaya göre tutarlı, özgün bir kit uydur.'}

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
      accent: hexOr(parsed.colors?.accent, '#00a884'),
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

export async function saveBrandKit(
  _previous: BrandKitState,
  formData: FormData,
): Promise<BrandKitState> {
  const id = String(formData.get('id') ?? '').trim()
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'Kit adı yazın.' }

  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireBrandAdmin())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const kitId = id || crypto.randomUUID()
  const isDefault = String(formData.get('is_default') ?? '') === 'on'

  const { data: existing } = id
    ? await supabase
        .from('brand_kits')
        .select('id, logo_path, fonts')
        .eq('id', id)
        .eq('org_id', org.id)
        .maybeSingle()
    : { data: null }

  if (id && !existing) return { error: 'Marka kiti bulunamadı.' }

  let logoPath = existing?.logo_path ?? null
  const file = formData.get('sample') ?? formData.get('logo')
  if (file instanceof File && file.size > 0) {
    const parsed = await readImageFile(file)
    if ('error' in parsed && parsed.error) return { error: parsed.error }
    if (!('buffer' in parsed)) return { error: 'Görsel okunamadı.' }
    const path = `${org.id}/kits/${kitId}/sample.${parsed.ext}`
    const { error: upError } = await supabase.storage.from('brand-assets').upload(path, parsed.buffer, {
      contentType: parsed.mime,
      upsert: true,
    })
    if (upError) return { error: upError.message }
    if (existing?.logo_path && existing.logo_path !== path && !existing.logo_path.startsWith('http')) {
      await supabase.storage.from('brand-assets').remove([existing.logo_path])
    }
    logoPath = path
  }

  const colors = {
    primary: readColor(formData, 'primary', DEFAULT_COLORS.primary),
    secondary: readColor(formData, 'secondary', DEFAULT_COLORS.secondary),
    accent: readColor(formData, 'accent', DEFAULT_COLORS.accent),
    background: readColor(formData, 'background', DEFAULT_COLORS.background),
    text: readColor(formData, 'text', DEFAULT_COLORS.text),
  }

  const fonts =
    existing?.fonts && typeof existing.fonts === 'object'
      ? existing.fonts
      : { heading: 'Outfit', body: 'Inter' }

  if (isDefault) {
    await supabase
      .from('brand_kits')
      .update({ is_default: false })
      .eq('org_id', org.id)
      .eq('is_default', true)
  }

  const payload = {
    org_id: org.id,
    created_by: userId,
    name: name.slice(0, 80),
    colors,
    fonts,
    tone: String(formData.get('tone') ?? '').trim().slice(0, 600) || null,
    logo_path: logoPath,
    is_default: isDefault,
  }

  const { error } = existing
    ? await supabase.from('brand_kits').update(payload).eq('id', kitId).eq('org_id', org.id)
    : await supabase.from('brand_kits').insert({ ...payload, id: kitId })

  if (error) return { error: error.message }

  revalidateBrand(kitId)
  if (!id) redirect(`/ayarlar/marka/${kitId}`)
  return { ok: 'Marka kiti kaydedildi.' }
}

export async function deleteBrandKit(id: string): Promise<{ error?: string }> {
  const trimmed = id.trim()
  if (!trimmed) return { error: 'Kayıt bulunamadı.' }

  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireBrandAdmin())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const { data: kit } = await supabase
    .from('brand_kits')
    .select('id, logo_path')
    .eq('id', trimmed)
    .eq('org_id', org.id)
    .maybeSingle()

  if (!kit) return { error: 'Marka kiti bulunamadı.' }

  if (kit.logo_path && !kit.logo_path.startsWith('http')) {
    await supabase.storage.from('brand-assets').remove([kit.logo_path])
  }

  const { error } = await supabase
    .from('brand_kits')
    .delete()
    .eq('id', trimmed)
    .eq('org_id', org.id)

  if (error) return { error: error.message }

  revalidateBrand()
  return {}
}

export async function saveOrgLogo(formData: FormData): Promise<BrandKitState> {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireBrandAdmin())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const file = formData.get('logo')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Logo dosyası seçin.' }
  }

  const parsed = await readImageFile(file)
  if ('error' in parsed && parsed.error) return { error: parsed.error }
  if (!('buffer' in parsed)) return { error: 'Görsel okunamadı.' }

  const { data: current } = await supabase
    .from('organizations')
    .select('logo_path')
    .eq('id', org.id)
    .maybeSingle()

  const path = `${org.id}/org-logo.${parsed.ext}`
  const { error: upError } = await supabase.storage.from('brand-assets').upload(path, parsed.buffer, {
    contentType: parsed.mime,
    upsert: true,
  })
  if (upError) return { error: upError.message }

  const { error } = await supabase.from('organizations').update({ logo_path: path }).eq('id', org.id)
  if (error) return { error: error.message }

  if (
    current?.logo_path &&
    current.logo_path !== path &&
    !current.logo_path.startsWith('http')
  ) {
    await supabase.storage.from('brand-assets').remove([current.logo_path])
  }

  revalidateBrand()
  return { ok: 'İşletme logosu kaydedildi.' }
}

export async function removeOrgLogo(): Promise<BrandKitState> {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireBrandAdmin())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const { data: current } = await supabase
    .from('organizations')
    .select('logo_path')
    .eq('id', org.id)
    .maybeSingle()

  const { error } = await supabase.from('organizations').update({ logo_path: null }).eq('id', org.id)
  if (error) return { error: error.message }

  if (current?.logo_path && !current.logo_path.startsWith('http')) {
    await supabase.storage.from('brand-assets').remove([current.logo_path])
  }

  revalidateBrand()
  return { ok: 'Logo kaldırıldı.' }
}

export async function createBrandKitWithAi(formData: FormData): Promise<BrandKitState> {
  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireBrandAdmin())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const about = String(formData.get('about') ?? '').trim().slice(0, 800) || null
  const nameHint = String(formData.get('name') ?? '').trim() || org.name
  const file = formData.get('asset')

  let imageBase64: string | undefined
  let mime: string | undefined
  let logoPath: string | null = null
  const kitId = crypto.randomUUID()

  if (file instanceof File && file.size > 0) {
    const parsed = await readImageFile(file)
    if ('error' in parsed && parsed.error) return { error: parsed.error }
    if (!('buffer' in parsed)) return { error: 'Görsel okunamadı.' }
    imageBase64 = parsed.buffer.toString('base64')
    mime = parsed.mime
    const path = `${org.id}/kits/${kitId}/sample.${parsed.ext}`
    const { error: upError } = await supabase.storage.from('brand-assets').upload(path, parsed.buffer, {
      contentType: parsed.mime,
      upsert: true,
    })
    if (upError) return { error: upError.message }
    logoPath = path
  }

  if (!imageBase64 && !about) {
    return { error: 'AI için görsel yükleyin veya kısa bir açıklama yazın.' }
  }

  try {
    const analysis = await analyzeBrandWithOpenAI({
      name: nameHint,
      about,
      imageBase64,
      mime,
    })

    const { count } = await supabase
      .from('brand_kits')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)

    const isDefault = (count ?? 0) === 0

    const { error } = await supabase.from('brand_kits').insert({
      id: kitId,
      org_id: org.id,
      created_by: userId,
      name: analysis.name,
      colors: analysis.colors,
      fonts: analysis.fonts,
      tone: analysis.tone,
      logo_path: logoPath,
      is_default: isDefault,
    })

    if (error) return { error: error.message }

    revalidateBrand(kitId)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Marka kiti oluşturulamadı.' }
  }

  redirect(`/ayarlar/marka/${kitId}`)
}

export async function duplicateBrandKit(id: string): Promise<{ error?: string; kitId?: string }> {
  const trimmed = id.trim()
  if (!trimmed) return { error: 'Kayıt bulunamadı.' }

  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireBrandAdmin())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const { data: kit } = await supabase
    .from('brand_kits')
    .select('name, colors, fonts, tone, logo_path')
    .eq('id', trimmed)
    .eq('org_id', org.id)
    .maybeSingle()

  if (!kit) return { error: 'Marka kiti bulunamadı.' }

  const kitId = crypto.randomUUID()
  let logoPath = kit.logo_path ?? null

  if (logoPath && !logoPath.startsWith('http')) {
    const { data: blob, error: dlError } = await supabase.storage.from('brand-assets').download(logoPath)
    if (!dlError && blob) {
      const buffer = Buffer.from(await blob.arrayBuffer())
      const ext = logoPath.split('.').pop() || 'png'
      const path = `${org.id}/kits/${kitId}/logo.${ext}`
      const contentType =
        ext === 'webp' ? 'image/webp' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png'
      const { error: upError } = await supabase.storage.from('brand-assets').upload(path, buffer, {
        contentType,
        upsert: true,
      })
      if (!upError) logoPath = path
    }
  }

  const baseName = kit.name.replace(/\s+Kopya$/i, '').trim() || kit.name
  const { error } = await supabase.from('brand_kits').insert({
    id: kitId,
    org_id: org.id,
    created_by: userId,
    name: `${baseName} Kopya`.slice(0, 80),
    colors: kit.colors,
    fonts: kit.fonts,
    tone: kit.tone,
    logo_path: logoPath,
    is_default: false,
  })

  if (error) return { error: error.message }

  revalidateBrand(kitId)
  return { kitId }
}

