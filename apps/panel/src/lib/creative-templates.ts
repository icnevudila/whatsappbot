/**
 * Kampanya gorseli sablonlari.
 *
 * Sunucuda next/og (satori + resvg) ile PNG'ye ceviriliyor, tarayicida ayni
 * degerlerle CSS onizlemesi ciziliyor. Olculer tek yerde durmali: onizleme ile
 * uretilen gorsel ayrilirsa kullanici gonderdikten sonra farkli bir sey gorur.
 */

export const FORMATS = {
  square: { width: 1080, height: 1080, label: 'Kare (1:1)' },
  feed: { width: 1080, height: 1350, label: 'Dikey (4:5)' },
  story: { width: 1080, height: 1920, label: 'Hikaye (9:16)' },
} as const

export type FormatKey = keyof typeof FORMATS

export const TEMPLATES = {
  bold: { label: 'Tam zemin', hint: 'Marka renginde dolu zemin, buyuk baslik' },
  split: { label: 'Bolunmus', hint: 'Solda renk blogu, sagda metin' },
  frame: { label: 'Cerceve', hint: 'Ince cerceve, ortalanmis metin' },
  photo: { label: 'AI arka plan', hint: 'Yapay zeka gorseli uzerine marka metni' },
} as const

export type TemplateKey = keyof typeof TEMPLATES

export type BrandColors = {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
}

export const DEFAULT_COLORS: BrandColors = {
  primary: '#111418',
  secondary: '#6a7076',
  accent: '#25d366',
  background: '#ffffff',
  text: '#111418',
}

export type CreativeInput = {
  template: TemplateKey
  format: FormatKey
  headline: string
  subline: string
  badge: string
  colors: BrandColors
  logoUrl: string | null
  /** 'photo' sablonunda arka plani ureten metin istemi. */
  backgroundPrompt?: string
  /** Onizlemede AI arka planini gostermek icin; uretimde sunucu kendi ceker. */
  backgroundUrl?: string | null
}

/**
 * Pollinations.ai: API anahtari, kayit ve kredi karti istemeyen tek gercek
 * ucretsiz gorsel ucu. Anonim kullanimda 15 saniyede bir istek siniri var,
 * bu da elle kreatif uretimi icin fazlasiyla yeterli (toplu is icin degil).
 *
 * Metni gorselin icine AI'a yazdirmiyoruz: uretilen yazi, ozellikle Turkce
 * karakterlerde bozuk cikiyor. AI yalnizca arka plani uretiyor, baslik ve
 * logo uzerine satori ile temiz sekilde biniyor.
 */
export function pollinationsUrl(
  prompt: string,
  width: number,
  height: number,
  seed: number,
): string {
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    seed: String(seed),
    model: 'flux',
    nologo: 'true',
  })

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`
}

/**
 * Baslik + marka renginden makul bir arka plan istemi kurar.
 *
 * Negatif kisim uzun ve tekrarli, cunku olcum sonucu boyle: yalnizca
 * "no text" yazildiginda model gorselin ortasina bozuk harfler koyuyor
 * (tabela, afis, urun etiketi gibi). Ustune kendi basligimizi bindirdigimiz
 * icin arka planda yazi benzeri hicbir sey istemiyoruz.
 */
export function suggestBackgroundPrompt(headline: string): string {
  const topic = headline.trim() || 'modern is dunyasi'
  return (
    `${topic}, professional advertising background photography, ` +
    'clean minimal composition, soft studio lighting, shallow depth of field, ' +
    'subject in upper half, empty uncluttered surface in lower half, ' +
    'no text, no words, no letters, no typography, no signage, no billboards, ' +
    'no posters, no labels, no logos, no watermark, no ui, no captions'
  )
}

/** Baslik uzunluguna gore punto: sabit punto uzun basliklari tasiriyor. */
export function headlineSize(text: string, width: number): number {
  const length = text.trim().length
  const base = width / 9
  if (length > 90) return base * 0.52
  if (length > 60) return base * 0.66
  if (length > 32) return base * 0.82
  return base
}
