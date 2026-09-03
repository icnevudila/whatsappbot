'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
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
  const name = String(formData.get('name') ?? '').trim() || 'Varsayilan'
  const logoUrl = String(formData.get('logo_url') ?? '').trim()

  const colors = {
    primary: readColor(formData, 'primary', DEFAULT_COLORS.primary),
    secondary: readColor(formData, 'secondary', DEFAULT_COLORS.secondary),
    accent: readColor(formData, 'accent', DEFAULT_COLORS.accent),
    background: readColor(formData, 'background', DEFAULT_COLORS.background),
    text: readColor(formData, 'text', DEFAULT_COLORS.text),
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum bulunamadi.' }

  const { data: existing } = await supabase
    .from('brand_kits')
    .select('id')
    .eq('is_default', true)
    .maybeSingle()

  // logo_path'te tam public URL tutuluyor: gorsel ureteci satori ile
  // calisiyor ve logoyu HTTP uzerinden cekiyor, imzali URL her renderda
  // yenilenmesi gereken bir adim daha eklerdi.
  const payload = {
    owner_id: user.id,
    name,
    colors,
    logo_path: logoUrl || null,
    is_default: true,
  }

  const { error } = existing
    ? await supabase.from('brand_kits').update(payload).eq('id', existing.id)
    : await supabase.from('brand_kits').insert(payload)

  if (error) return { error: error.message }

  revalidatePath('/marka-kiti')
  return { ok: 'Marka kiti kaydedildi.' }
}

export async function deleteCreative(id: string): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()

  const { data: creative } = await supabase
    .from('creatives')
    .select('storage_path')
    .eq('id', id)
    .maybeSingle()

  if (creative?.storage_path) {
    await supabase.storage.from('creatives').remove([creative.storage_path])
  }

  const { error } = await supabase.from('creatives').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/marka-kiti')
  return {}
}
