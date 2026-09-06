import type { SupabaseClient } from '@supabase/supabase-js'
import type { AiKeyBag } from './config'

export type OrgAiKeyRow = {
  openai_api_key: string | null
  gemini_api_key: string | null
  cloudflare_account_id: string | null
  cloudflare_api_token: string | null
}

export type OrgAiKeyMasks = {
  openai: string | null
  gemini: string | null
  cloudflareAccountId: string | null
  cloudflareToken: string | null
}

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

export async function loadOrgAiKeys(
  supabase: SupabaseClient,
  orgId: string,
): Promise<OrgAiKeyRow | null> {
  const { data } = await supabase
    .from('org_ai_keys' as never)
    .select(
      'openai_api_key, gemini_api_key, cloudflare_account_id, cloudflare_api_token' as never,
    )
    .eq('org_id' as never, orgId as never)
    .maybeSingle()

  return (data as OrgAiKeyRow | null) ?? null
}
