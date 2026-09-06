import type { SupabaseClient } from '@supabase/supabase-js'
import type { AiKeyBag } from './config'

export type OrgAiKeyRow = {
  openai_api_key: string | null
  gemini_api_key: string | null
  cloudflare_account_id: string | null
  cloudflare_api_token: string | null
  openai_image_model: string | null
  openai_text_model: string | null
  gemini_image_model: string | null
  gemini_text_model: string | null
  preferred_image_provider: string | null
  preferred_text_provider: string | null
}

export type OrgAiKeyMasks = {
  openai: string | null
  gemini: string | null
  cloudflareAccountId: string | null
  cloudflareToken: string | null
}

export type OrgAiModelPrefs = {
  openaiImageModel: string
  openaiTextModel: string
  geminiImageModel: string
  geminiTextModel: string
  preferredImageProvider: string
  preferredTextProvider: string
}

const ORG_AI_SELECT =
  'openai_api_key, gemini_api_key, cloudflare_account_id, cloudflare_api_token, openai_image_model, openai_text_model, gemini_image_model, gemini_text_model, preferred_image_provider, preferred_text_provider'

export function maskSecret(value: string | null | undefined): string | null {
  const raw = value?.trim()
  if (!raw) return null
  if (raw.length <= 4) return '••••'
  return `••••${raw.slice(-4)}`
}

export function rowToBag(row: OrgAiKeyRow | null | undefined): AiKeyBag | null {
  if (!row) return null
  return {
    openaiApiKey: row.openai_api_key,
    geminiApiKey: row.gemini_api_key,
    cloudflareAccountId: row.cloudflare_account_id,
    cloudflareApiToken: row.cloudflare_api_token,
    openaiImageModel: row.openai_image_model,
    openaiTextModel: row.openai_text_model,
    geminiImageModel: row.gemini_image_model,
    geminiTextModel: row.gemini_text_model,
    preferredImageProvider: row.preferred_image_provider,
    preferredTextProvider: row.preferred_text_provider,
  }
}

export function rowToMasks(row: OrgAiKeyRow | null | undefined): OrgAiKeyMasks {
  return {
    openai: maskSecret(row?.openai_api_key),
    gemini: maskSecret(row?.gemini_api_key),
    cloudflareAccountId: maskSecret(row?.cloudflare_account_id),
    cloudflareToken: maskSecret(row?.cloudflare_api_token),
  }
}

export function rowToModelPrefs(row: OrgAiKeyRow | null | undefined): OrgAiModelPrefs {
  return {
    openaiImageModel: row?.openai_image_model?.trim() || 'dall-e-2',
    openaiTextModel: row?.openai_text_model?.trim() || 'gpt-4o-mini',
    geminiImageModel: row?.gemini_image_model?.trim() || 'gemini-3.1-flash-image-preview',
    geminiTextModel: row?.gemini_text_model?.trim() || 'gemini-2.5-flash',
    preferredImageProvider: row?.preferred_image_provider?.trim() || 'auto',
    preferredTextProvider: row?.preferred_text_provider?.trim() || 'auto',
  }
}

export async function loadOrgAiKeys(
  supabase: SupabaseClient,
  orgId: string,
): Promise<OrgAiKeyRow | null> {
  const { data } = await supabase
    .from('org_ai_keys' as never)
    .select(ORG_AI_SELECT as never)
    .eq('org_id' as never, orgId as never)
    .maybeSingle()

  return (data as OrgAiKeyRow | null) ?? null
}
