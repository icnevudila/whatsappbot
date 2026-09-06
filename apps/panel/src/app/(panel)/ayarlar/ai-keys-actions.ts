'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveOrg, isOrgAdminRole } from '@/lib/org'
import {
  GEMINI_IMAGE_MODELS,
  GEMINI_TEXT_MODELS,
  IMAGE_PROVIDER_CHOICES,
  OPENAI_IMAGE_MODELS,
  OPENAI_TEXT_MODELS,
  TEXT_PROVIDER_CHOICES,
  isAllowedModel,
} from '@/lib/ai/models'

export type AiKeysState = { error?: string; ok?: string } | null

function readOptionalKey(formData: FormData, name: string): string | undefined {
  const raw = String(formData.get(name) ?? '')
  // Boş = değiştirme; __clear__ = sil
  if (raw === '__clear__') return ''
  if (!raw.trim()) return undefined
  return raw.trim()
}

function readChoice(
  formData: FormData,
  name: string,
  allowed: { value: string }[],
  fallback: string,
): string {
  const raw = String(formData.get(name) ?? '').trim()
  if (isAllowedModel(allowed, raw)) return raw
  return fallback
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

  const openaiImageModel = readChoice(
    formData,
    'openai_image_model',
    OPENAI_IMAGE_MODELS,
    'dall-e-2',
  )
  const openaiTextModel = readChoice(
    formData,
    'openai_text_model',
    OPENAI_TEXT_MODELS,
    'gpt-4o-mini',
  )
  const geminiImageModel = readChoice(
    formData,
    'gemini_image_model',
    GEMINI_IMAGE_MODELS,
    'gemini-3.1-flash-image-preview',
  )
  const geminiTextModel = readChoice(
    formData,
    'gemini_text_model',
    GEMINI_TEXT_MODELS,
    'gemini-2.5-flash',
  )
  const preferredImageProvider = readChoice(
    formData,
    'preferred_image_provider',
    IMAGE_PROVIDER_CHOICES,
    'auto',
  )
  const preferredTextProvider = readChoice(
    formData,
    'preferred_text_provider',
    TEXT_PROVIDER_CHOICES,
    'auto',
  )

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
    openai_image_model: openaiImageModel,
    openai_text_model: openaiTextModel,
    gemini_image_model: geminiImageModel,
    gemini_text_model: geminiTextModel,
    preferred_image_provider: preferredImageProvider,
    preferred_text_provider: preferredTextProvider,
  }

  const { error } = await supabase.from('org_ai_keys' as never).upsert(next as never, {
    onConflict: 'org_id',
  })
  if (error) return { error: error.message }

  revalidatePath('/ayarlar')
  revalidatePath('/hizli-gonderim')
  revalidatePath('/kampanyalar')
  revalidatePath('/marka-kiti')

  return { ok: 'Yapay zeka ayarları kaydedildi.' }
}
