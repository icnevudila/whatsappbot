'use server'

import { revalidatePath } from 'next/cache'
import { isOrgAdminRole, requireActiveOrg } from '@/lib/org'
import { DEFAULT_COLORS } from '@/lib/creative-templates'

export type BrandKitState = { error?: string; ok?: string } | null

function readColor(formData: FormData, key: string, fallback: string): string {
  const value = String(formData.get(key) ?? '').trim()
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : fallback
}

export async function saveBrandKit(
  _previous: BrandKitState,
  formData: FormData,
): Promise<BrandKitState> {
  const name = String(formData.get('name') ?? '').trim() || 'Varsayılan'
  const logoUrl = String(formData.get('logo_url') ?? '').trim()

  const colors = {
    primary: readColor(formData, 'primary', DEFAULT_COLORS.primary),
    secondary: readColor(formData, 'secondary', DEFAULT_COLORS.secondary),
    accent: readColor(formData, 'accent', DEFAULT_COLORS.accent),
    background: readColor(formData, 'background', DEFAULT_COLORS.background),
    text: readColor(formData, 'text', DEFAULT_COLORS.text),
  }

  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  if (!isOrgAdminRole(org.role)) {
    return { error: 'Marka kitini yalnızca sahip veya yönetici kaydedebilir.' }
  }

  const { data: existing } = await supabase
    .from('brand_kits')
    .select('id')
    .eq('org_id', org.id)
    .eq('is_default', true)
    .maybeSingle()

  // logo_path'te tam public URL tutuluyor: gorsel ureteci satori ile
  // calisiyor ve logoyu HTTP uzerinden cekiyor, imzali URL her renderda
  // yenilenmesi gereken bir adim daha eklerdi.
  const payload = {
    org_id: org.id,
    created_by: userId,
    name,
    colors,
    logo_path: logoUrl || null,
    tone: String(formData.get('tone') ?? '').trim().slice(0, 160) || null,
    is_default: true,
  }

  const { error } = existing
    ? await supabase
        .from('brand_kits')
        .update(payload)
        .eq('id', existing.id)
        .eq('org_id', org.id)
    : await supabase.from('brand_kits').insert(payload)

  if (error) return { error: error.message }

  revalidatePath('/marka-kiti')
  revalidatePath('/kurulum')
  revalidatePath('/ozet')
  return { ok: 'Marka kiti kaydedildi.' }
}

export async function deleteCreative(id: string): Promise<{ error?: string }> {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  if (!isOrgAdminRole(org.role)) {
    return { error: 'Görseli yalnızca sahip veya yönetici silebilir.' }
  }

  const { data: creative } = await supabase
    .from('creatives')
    .select('storage_path')
    .eq('id', id)
    .eq('org_id', org.id)
    .maybeSingle()

  if (creative?.storage_path) {
    await supabase.storage.from('creatives').remove([creative.storage_path])
  }

  const { error } = await supabase
    .from('creatives')
    .delete()
    .eq('id', id)
    .eq('org_id', org.id)
  if (error) return { error: error.message }

  revalidatePath('/marka-kiti')
  return {}
}
