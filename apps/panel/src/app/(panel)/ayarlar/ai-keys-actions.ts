'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveOrg, isOrgAdminRole } from '@/lib/org'

export type AiKeysState = { error?: string; ok?: string } | null

function readOptionalKey(formData: FormData, name: string): string | undefined {
  const raw = String(formData.get(name) ?? '')
  // Boş = değiştirme; __clear__ = sil
  if (raw === '__clear__') return ''
  if (!raw.trim()) return undefined
  return raw.trim()
}

export async function saveOrgAiKeys(
  _previous: AiKeysState,
  formData: FormData,
): Promise<AiKeysState> {
  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireActiveOrg())
  } catch {
    return { error: 'Oturum bulunamadı.' }
  }

  if (!isOrgAdminRole(org.role)) {
    return { error: 'Yalnızca sahip veya yönetici AI anahtarı kaydedebilir.' }
  }

  const openai = readOptionalKey(formData, 'openai_api_key')
  const gemini = readOptionalKey(formData, 'gemini_api_key')
  const cfAccount = readOptionalKey(formData, 'cloudflare_account_id')
  const cfToken = readOptionalKey(formData, 'cloudflare_api_token')

  const { data: existing } = await supabase
    .from('org_ai_keys' as never)
    .select(
      'openai_api_key, gemini_api_key, cloudflare_account_id, cloudflare_api_token' as never,
    )
    .eq('org_id' as never, org.id as never)
    .maybeSingle()

  const prev = existing as {
    openai_api_key: string | null
    gemini_api_key: string | null
    cloudflare_account_id: string | null
    cloudflare_api_token: string | null
  } | null

  const next = {
    org_id: org.id,
    updated_by: userId,
    openai_api_key: openai !== undefined ? openai || null : (prev?.openai_api_key ?? null),
    gemini_api_key: gemini !== undefined ? gemini || null : (prev?.gemini_api_key ?? null),
    cloudflare_account_id:
      cfAccount !== undefined ? cfAccount || null : (prev?.cloudflare_account_id ?? null),
    cloudflare_api_token:
      cfToken !== undefined ? cfToken || null : (prev?.cloudflare_api_token ?? null),
  }

  const { error } = await supabase.from('org_ai_keys' as never).upsert(next as never, {
    onConflict: 'org_id',
  })
  if (error) return { error: error.message }

  revalidatePath('/ayarlar')
  revalidatePath('/hizli-gonderim')
  revalidatePath('/kampanyalar')
  revalidatePath('/marka-kiti')

  return { ok: 'Yapay zeka anahtarları kaydedildi.' }
}
