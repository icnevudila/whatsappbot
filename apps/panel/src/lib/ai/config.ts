/**
 * Yapay zeka saglayicilarinin ortak yapilandirmasi.
 *
 * Platform env anahtarlari varsayilan; org_ai_keys tablosu varsa onlar once gelir.
 * Hicbir anahtar zorunlu degil — yapilandirilmayan saglayici atlanir.
 */

export type AiProviderId = 'gemini' | 'openai' | 'cloudflare' | 'pollinations'

/** Org kaydından gelen anahtarlar (env üzerine yazar). */
export type AiKeyBag = {
  openaiApiKey?: string | null
  geminiApiKey?: string | null
  cloudflareAccountId?: string | null
  cloudflareApiToken?: string | null
}

export type ResolvedAiConfig = {
  gemini: { apiKey: string; imageModel: string; textModel: string }
  openai: { apiKey: string; imageModel: string; textModel: string; baseUrl: string }
  cloudflare: { accountId: string; apiToken: string; imageModel: string }
}

export function resolveAiConfig(bag?: AiKeyBag | null): ResolvedAiConfig {
  return {
    gemini: {
      apiKey: (bag?.geminiApiKey?.trim() || process.env.GEMINI_API_KEY || '').trim(),
      imageModel: process.env.GEMINI_IMAGE_MODEL ?? 'gemini-3.1-flash-image-preview',
      textModel: process.env.GEMINI_TEXT_MODEL ?? 'gemini-2.5-flash',
    },
    openai: {
      apiKey: (bag?.openaiApiKey?.trim() || process.env.OPENAI_API_KEY || '').trim(),
      imageModel: process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1.5',
      textModel: process.env.OPENAI_TEXT_MODEL ?? 'gpt-4o-mini',
      baseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
    },
    cloudflare: {
      accountId: (
        bag?.cloudflareAccountId?.trim() ||
        process.env.CLOUDFLARE_ACCOUNT_ID ||
        ''
      ).trim(),
      apiToken: (
        bag?.cloudflareApiToken?.trim() ||
        process.env.CLOUDFLARE_API_TOKEN ||
        ''
      ).trim(),
      imageModel:
        process.env.CLOUDFLARE_IMAGE_MODEL ?? '@cf/black-forest-labs/flux-1-schnell',
    },
  }
}

/** Env-only (geriye uyumluluk / ayarlar özeti). */
export const aiConfig = resolveAiConfig()

function readOrder(raw: string | undefined, fallback: AiProviderId[]): AiProviderId[] {
  if (!raw) return fallback

  const known = new Set<string>(['gemini', 'openai', 'cloudflare', 'pollinations'])
  const parsed = raw
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter((part): part is AiProviderId => known.has(part))

  return parsed.length > 0 ? parsed : fallback
}

export const imageProviderOrder = readOrder(process.env.AI_IMAGE_PROVIDERS, [
  'gemini',
  'openai',
  'cloudflare',
  'pollinations',
])

export const textProviderOrder = readOrder(process.env.AI_TEXT_PROVIDERS, [
  'gemini',
  'openai',
])

export const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS ?? 45_000)
