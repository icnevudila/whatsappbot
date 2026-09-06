/**
 * Yapay zeka saglayicilarinin ortak yapilandirmasi.
 *
 * Platform env anahtarlari varsayilan; org_ai_keys tablosu varsa onlar once gelir.
 * Hicbir anahtar zorunlu degil — yapilandirilmayan saglayici atlanir.
 */

import {
  GEMINI_IMAGE_MODELS,
  GEMINI_TEXT_MODELS,
  OPENAI_IMAGE_MODELS,
  OPENAI_TEXT_MODELS,
  isAllowedModel,
  type ImageProviderChoice,
  type TextProviderChoice,
} from './models'

export type AiProviderId = 'gemini' | 'openai' | 'cloudflare' | 'pollinations'

/** Org kaydından gelen anahtarlar + model tercihleri (env üzerine yazar). */
export type AiKeyBag = {
  openaiApiKey?: string | null
  geminiApiKey?: string | null
  cloudflareAccountId?: string | null
  cloudflareApiToken?: string | null
  openaiImageModel?: string | null
  openaiTextModel?: string | null
  geminiImageModel?: string | null
  geminiTextModel?: string | null
  preferredImageProvider?: ImageProviderChoice | string | null
  preferredTextProvider?: TextProviderChoice | string | null
}

export type ResolvedAiConfig = {
  gemini: { apiKey: string; imageModel: string; textModel: string }
  openai: { apiKey: string; imageModel: string; textModel: string; baseUrl: string }
  cloudflare: { accountId: string; apiToken: string; imageModel: string }
}

const DEFAULT_OPENAI_IMAGE = 'dall-e-2'
const DEFAULT_OPENAI_TEXT = 'gpt-4o-mini'
const DEFAULT_GEMINI_IMAGE = 'gemini-3.1-flash-image-preview'
const DEFAULT_GEMINI_TEXT = 'gemini-2.5-flash'

function pickModel(
  preferred: string | null | undefined,
  envValue: string | undefined,
  allowed: { value: string }[],
  fallback: string,
): string {
  if (preferred && isAllowedModel(allowed, preferred)) return preferred
  if (envValue && isAllowedModel(allowed, envValue)) return envValue
  return fallback
}

export function resolveAiConfig(bag?: AiKeyBag | null): ResolvedAiConfig {
  return {
    gemini: {
      apiKey: (bag?.geminiApiKey?.trim() || process.env.GEMINI_API_KEY || '').trim(),
      imageModel: pickModel(
        bag?.geminiImageModel,
        process.env.GEMINI_IMAGE_MODEL,
        GEMINI_IMAGE_MODELS,
        DEFAULT_GEMINI_IMAGE,
      ),
      textModel: pickModel(
        bag?.geminiTextModel,
        process.env.GEMINI_TEXT_MODEL,
        GEMINI_TEXT_MODELS,
        DEFAULT_GEMINI_TEXT,
      ),
    },
    openai: {
      apiKey: (bag?.openaiApiKey?.trim() || process.env.OPENAI_API_KEY || '').trim(),
      imageModel: pickModel(
        bag?.openaiImageModel,
        process.env.OPENAI_IMAGE_MODEL,
        OPENAI_IMAGE_MODELS,
        DEFAULT_OPENAI_IMAGE,
      ),
      textModel: pickModel(
        bag?.openaiTextModel,
        process.env.OPENAI_TEXT_MODEL,
        OPENAI_TEXT_MODELS,
        DEFAULT_OPENAI_TEXT,
      ),
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

/** Env-only (geriye uyumluluk). */
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

const DEFAULT_IMAGE_ORDER = readOrder(process.env.AI_IMAGE_PROVIDERS, [
  'gemini',
  'openai',
  'cloudflare',
  'pollinations',
])

const DEFAULT_TEXT_ORDER = readOrder(process.env.AI_TEXT_PROVIDERS, ['gemini', 'openai'])

/** Tercih edilen sağlayıcıyı sıranın başına alır. */
export function resolveImageProviderOrder(bag?: AiKeyBag | null): AiProviderId[] {
  const preferred = String(bag?.preferredImageProvider ?? 'auto').trim().toLowerCase()
  if (!preferred || preferred === 'auto') return DEFAULT_IMAGE_ORDER
  if (!(['gemini', 'openai', 'cloudflare', 'pollinations'] as string[]).includes(preferred)) {
    return DEFAULT_IMAGE_ORDER
  }
  const id = preferred as AiProviderId
  return [id, ...DEFAULT_IMAGE_ORDER.filter((item) => item !== id)]
}

export function resolveTextProviderOrder(bag?: AiKeyBag | null): AiProviderId[] {
  const preferred = String(bag?.preferredTextProvider ?? 'auto').trim().toLowerCase()
  if (!preferred || preferred === 'auto') return DEFAULT_TEXT_ORDER
  if (!(['gemini', 'openai'] as string[]).includes(preferred)) return DEFAULT_TEXT_ORDER
  const id = preferred as AiProviderId
  return [id, ...DEFAULT_TEXT_ORDER.filter((item) => item !== id)]
}

/** @deprecated Tercihli sıra için resolveImageProviderOrder kullanın. */
export const imageProviderOrder = DEFAULT_IMAGE_ORDER
/** @deprecated Tercihli sıra için resolveTextProviderOrder kullanın. */
export const textProviderOrder = DEFAULT_TEXT_ORDER

export const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS ?? 45_000)
