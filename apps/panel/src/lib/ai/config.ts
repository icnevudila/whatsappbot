/**
 * Yapay zeka saglayicilarinin ortak yapilandirmasi.
 *
 * Tasarim karari: anahtarlar yalnizca sunucu tarafinda okunuyor ve hicbiri
 * zorunlu degil. Anahtar yoksa o saglayici sessizce atlaniyor, akis bir
 * sonrakine gecip en sonunda anahtarsiz calisan Pollinations'a dusuyor.
 * Boylece proje anahtar girilmeden de calisir durumda kaliyor; ChatGPT veya
 * Gemini anahtari eklendigi an kod degisikligi olmadan devreye giriyor.
 */

export type AiProviderId = 'gemini' | 'openai' | 'cloudflare' | 'pollinations'

/**
 * Model adlari cevre degiskeniyle degistirilebilir cunku saglayicilar model
 * kimliklerini siksik degistiriyor ve eskilerini kapatiyor. Ornegin
 * gemini-2.5-flash-image 2 Ekim 2026'da kapatiliyor; varsayilani guncel
 * onerilen surumde tutup gerektiginde env ile geri almak, kodu her seferinde
 * degistirmekten iyi.
 */
export const aiConfig = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    imageModel: process.env.GEMINI_IMAGE_MODEL ?? 'gemini-3.1-flash-image-preview',
    textModel: process.env.GEMINI_TEXT_MODEL ?? 'gemini-2.5-flash',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    imageModel: process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1.5',
    textModel: process.env.OPENAI_TEXT_MODEL ?? 'gpt-4o-mini',
    baseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
  },
  cloudflare: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? '',
    apiToken: process.env.CLOUDFLARE_API_TOKEN ?? '',
    imageModel:
      process.env.CLOUDFLARE_IMAGE_MODEL ?? '@cf/black-forest-labs/flux-1-schnell',
  },
} as const

/** Saglayici sirasi. Ilk basarili olan kazanir. */
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

/** Her istekte tekrar denenmemesi gereken ust sinir. */
export const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS ?? 45_000)
