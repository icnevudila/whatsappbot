/**
 * Ayarlar ekranındaki model katalogları.
 * Maliyetler yaklaşık USD (OpenAI/Gemini list fiyatı, 2026); UI ipucu içindir.
 */

export type ModelOption = {
  value: string
  label: string
  /** Kısa maliyet / not — seçenek yanında gösterilir */
  cost: string
}

export const OPENAI_IMAGE_MODELS: ModelOption[] = [
  {
    value: 'dall-e-2',
    label: 'DALL·E 2',
    cost: '~$0.02 / görsel · en ucuz',
  },
  {
    value: 'dall-e-3',
    label: 'DALL·E 3',
    cost: '~$0.04–0.08 / görsel',
  },
  {
    value: 'gpt-image-1',
    label: 'GPT Image 1',
    cost: '~$0.04–0.08 / görsel',
  },
  {
    value: 'gpt-image-1.5',
    label: 'GPT Image 1.5',
    cost: '~$0.10–0.20 / görsel · pahalı',
  },
]

export const OPENAI_TEXT_MODELS: ModelOption[] = [
  {
    value: 'gpt-4o-mini',
    label: 'GPT-4o mini',
    cost: 'çok ucuz · önerilen',
  },
  {
    value: 'gpt-4.1-mini',
    label: 'GPT-4.1 mini',
    cost: 'ucuz',
  },
  {
    value: 'gpt-4o',
    label: 'GPT-4o',
    cost: 'orta maliyet',
  },
]

export const GEMINI_IMAGE_MODELS: ModelOption[] = [
  {
    value: 'gemini-2.5-flash-image',
    label: 'Gemini 2.5 Flash Image',
    cost: 'ücretsiz kota / düşük',
  },
  {
    value: 'gemini-3.1-flash-image-preview',
    label: 'Gemini 3.1 Flash Image',
    cost: 'ücretsiz kota / düşük · varsayılan',
  },
]

export const GEMINI_TEXT_MODELS: ModelOption[] = [
  {
    value: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash Lite',
    cost: 'en ucuz',
  },
  {
    value: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    cost: 'ucuz · önerilen',
  },
  {
    value: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    cost: 'ucuz',
  },
]

export type ImageProviderChoice = 'auto' | 'gemini' | 'openai' | 'cloudflare' | 'pollinations'
export type TextProviderChoice = 'auto' | 'gemini' | 'openai'

export const IMAGE_PROVIDER_CHOICES: {
  value: ImageProviderChoice
  label: string
  cost: string
}[] = [
  {
    value: 'auto',
    label: 'Otomatik sıra',
    cost: 'Gemini → OpenAI → Cloudflare → Pollinations',
  },
  {
    value: 'gemini',
    label: 'Önce Gemini',
    cost: 'genelde en ucuz ücretli',
  },
  {
    value: 'openai',
    label: 'Önce OpenAI',
    cost: 'kaliteli ama pahalı olabilir',
  },
  {
    value: 'cloudflare',
    label: 'Önce Cloudflare FLUX',
    cost: 'Workers AI kotası',
  },
  {
    value: 'pollinations',
    label: 'Önce Pollinations',
    cost: 'ücretsiz · kalite değişken',
  },
]

export const TEXT_PROVIDER_CHOICES: {
  value: TextProviderChoice
  label: string
  cost: string
}[] = [
  {
    value: 'auto',
    label: 'Otomatik sıra',
    cost: 'Gemini → OpenAI',
  },
  {
    value: 'gemini',
    label: 'Önce Gemini',
    cost: 'ucuz',
  },
  {
    value: 'openai',
    label: 'Önce OpenAI',
    cost: '4o-mini ile ucuz tutulabilir',
  },
]

export function isAllowedModel(
  options: { value: string }[],
  value: string | null | undefined,
): boolean {
  if (!value) return false
  return options.some((option) => option.value === value)
}
