'use server'

import { revalidatePath } from 'next/cache'
import { isOrgAdminRole, requireActiveOrg } from '@/lib/org'

export type SocialState = { error?: string; ok?: string } | null

const PLATFORMS = new Set([
  'instagram',
  'facebook',
  'tiktok',
  'youtube',
  'x',
  'linkedin',
  'website',
  'other',
])

function revalidateSocial() {
  revalidatePath('/ayarlar/sosyal')
}

function normalizeUrl(raw: string) {
  const value = raw.trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
}

async function requireCatalogAdmin() {
  const ctx = await requireActiveOrg()
  if (!isOrgAdminRole(ctx.org.role)) {
    throw new Error('Yalnızca sahip veya yönetici düzenleyebilir.')
  }
  return ctx
}

export async function saveSocialAccount(
  _previous: SocialState,
  formData: FormData,
): Promise<SocialState> {
  const id = String(formData.get('id') ?? '').trim()
  const platform = String(formData.get('platform') ?? '').trim()
  const label = String(formData.get('label') ?? '').trim().slice(0, 80) || null
  const url = normalizeUrl(String(formData.get('url') ?? ''))

  if (!PLATFORMS.has(platform)) return { error: 'Geçerli bir platform seçin.' }
  if (url.length < 8) return { error: 'Geçerli bir bağlantı yazın.' }

  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireCatalogAdmin())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const payload = {
    org_id: org.id,
    created_by: userId,
    platform,
    label,
    url: url.slice(0, 500),
  }

  const { error } = id
    ? await supabase
        .from('org_social_accounts')
        .update(payload)
        .eq('id', id)
        .eq('org_id', org.id)
    : await supabase.from('org_social_accounts').insert(payload)

  if (error) return { error: error.message }

  revalidateSocial()
  return { ok: id ? 'Hesap güncellendi.' : 'Hesap eklendi.' }
}

export async function deleteSocialAccount(id: string): Promise<{ error?: string }> {
  const trimmed = id.trim()
  if (!trimmed) return { error: 'Kayıt bulunamadı.' }

  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireCatalogAdmin())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const { error, count } = await supabase
    .from('org_social_accounts')
    .delete({ count: 'exact' })
    .eq('id', trimmed)
    .eq('org_id', org.id)

  if (error) return { error: error.message }
  if (count === 0) return { error: 'Kayıt bulunamadı.' }

  revalidateSocial()
  return {}
}
