'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isOrgAdminRole, requireActiveOrg } from '@/lib/org'
import { DEFAULT_COLORS } from '@/lib/creative-templates'
import { readImageFile } from '../upload-image'

export type BrandKitState = { error?: string; ok?: string } | null

function revalidateBrand(id?: string) {
  revalidatePath('/ayarlar/marka')
  if (id) revalidatePath(`/ayarlar/marka/${id}`)
}

function readColor(formData: FormData, key: string, fallback: string) {
  const value = String(formData.get(key) ?? '').trim()
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : fallback
}

async function requireBrandAdmin() {
  const ctx = await requireActiveOrg()
  if (!isOrgAdminRole(ctx.org.role)) {
    throw new Error('Marka kitini yalnızca sahip veya yönetici yönetebilir.')
  }
  return ctx
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
  const file = formData.get('logo')
  if (file instanceof File && file.size > 0) {
    const parsed = await readImageFile(file)
    if ('error' in parsed && parsed.error) return { error: parsed.error }
    if (!('buffer' in parsed)) return { error: 'Görsel okunamadı.' }
    const path = `${org.id}/kits/${kitId}/logo.${parsed.ext}`
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
