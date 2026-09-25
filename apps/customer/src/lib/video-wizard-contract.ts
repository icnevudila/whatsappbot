export const VIDEO_ENGINE_MODE = 'SIMPLE_V5_HYBRID' as const
export const VIDEO_REQUESTED_PROVIDER = 'AUTO' as const
export const VIDEO_ASPECT_RATIO = '9:16' as const
export const VIDEO_DURATION_SECONDS = 8 as const
export const VIDEO_LANGUAGE = 'tr-TR' as const
export const VIDEO_SUBTITLE_MODE = 'off' as const
export const MAX_SPOKEN_WORDS = 18

export type ReferenceRole = 'reference' | 'packaging' | 'environment' | 'presenter' | 'style'

export type ProductFidelityContract = {
  must_preserve: string[]
  surface_rules: string[]
  forbidden_mutations: string[]
  safe_camera_rules: string[]
  allowed_actions: string[]
}

export type WizardPreflightInput = {
  quotaUsed: number
  quotaLimit: number
  hasLogo: boolean
  hasProduct: boolean
  promotionType: string
  productId?: string | null
  spokenText: string
  verifiedClaims: string[]
  offer?: string
  offerVerified: boolean
  adFormat: string
  fidelityContract: ProductFidelityContract
  referenceCount: number
  referenceRoleCount: number
}

export type WizardPreflightIssue = {
  code: string
  severity: 'error' | 'warning'
  message: string
}

const compact = (value: string) => value.replace(/\s+/g, ' ').trim()

export function parseFactLines(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/\r?\n/)
        .map(compact)
        .filter(Boolean),
    ),
  )
}

export function countWords(value: string): number {
  return compact(value).split(/\s+/).filter(Boolean).length
}

function clampWords(value: string, maxWords = MAX_SPOKEN_WORDS): string {
  const words = compact(value).split(/\s+/).filter(Boolean)
  if (words.length <= maxWords) return words.join(' ')
  return `${words.slice(0, maxWords).join(' ').replace(/[,:;.!?]+$/, '')}.`
}

export function buildSafeSpokenLine(input: {
  brandName: string
  productName: string
  adFormat: string
  verifiedClaims?: string[]
  offer?: string
  offerVerified?: boolean
}): string {
  const brand = compact(input.brandName) || 'İşletme'
  const product = compact(input.productName) || 'seçili ürün'
  const claim = compact(input.verifiedClaims?.[0] || '')

  const candidates: Record<string, string> = {
    FAST_SALES: claim
      ? `${product}: ${claim}. Detaylar için ${brand} ile iletişime geçin.`
      : `${product} ürününü yakından inceleyin. Detaylar için ${brand} ile iletişime geçin.`,
    PRODUCT_USAGE: `${product}, gerçek kullanım ortamında referans biçimi korunarak gösteriliyor.`,
    PROBLEM_SOLUTION: claim
      ? `${product}, gerçek kullanımda ${claim}. ${brand} ile ayrıntıları inceleyin.`
      : `${product} gerçek kullanım adımıyla gösteriliyor. ${brand} ile ayrıntıları inceleyin.`,
    SOCIAL_UGC: `${product} ürününü gerçek ortamında, referansına sadık biçimde birlikte inceliyoruz.`,
    PREMIUM: `${product}, gerçek malzemesi ve formu korunarak sade bir sinematik kadrajda.`,
    OFFER: input.offerVerified && input.offer
      ? `${product} için ${compact(input.offer)}. Ayrıntılar ${brand} kanalında.`
      : `${product} için doğrulanmış kampanya ayrıntılarını ${brand} kanalında inceleyin.`,
  }

  return clampWords(candidates[input.adFormat] || `${brand}, ${product} ürününü gerçek çalışma ortamında referansına sadık biçimde gösteriyor.`)
}

export function defaultFidelityContract(brandName: string, productName: string): ProductFidelityContract {
  const key = `${brandName} ${productName}`.toLocaleLowerCase('tr-TR')
  const isAyvazogluBrick = (key.includes('ayvazoğlu') || key.includes('ayvazoglu')) && key.includes('tuğla')

  if (isAyvazogluBrick) {
    return {
      must_preserve: [
        'Doğal terracotta ürün rengi',
        'Üst yüzdeki gerçek boşluk düzeni ve ürün geometrisi',
        'Oluklu fakat kapalı yan yüzeyler',
      ],
      surface_rules: ['Yan yüzeyler kanonik ürün fotoğrafındaki gibi dolu ve oluklu kalmalı'],
      forbidden_mutations: [
        'Yan yüzeylerde yeni delik veya perforasyon üretme',
        'Ürünün rengini, oranını ya da boşluk sayısını değiştirme',
        'Ürün üstüne yapay yazı, logo veya etiket ekleme',
      ],
      safe_camera_rules: ['Sabit veya yumuşak 3/4 açı kullan', 'Tam 360 derece ve aşırı dönüş kullanma'],
      allowed_actions: ['Tek ürün hero çekimi', 'Elde kısa taşıma', 'Duvar örme bağlamında kontrollü yerleştirme'],
    }
  }

  return {
    must_preserve: ['Kanonik görseldeki geometri, renk, oran ve görünür ambalaj detayları'],
    surface_rules: ['Görünür yüzeyler kanonik ürün fotoğrafıyla eşleşmeli'],
    forbidden_mutations: ['Yeni parça, delik, düğme, logo, etiket veya yazı üretme'],
    safe_camera_rules: ['Ürün formunu okunur tutan sabit veya yumuşak 3/4 açı kullan'],
    allowed_actions: ['Tek ürün hero çekimi', 'Referansla uyumlu doğal kullanım adımı'],
  }
}

export function validateWizardPreflight(input: WizardPreflightInput): WizardPreflightIssue[] {
  const issues: WizardPreflightIssue[] = []
  const wordCount = countWords(input.spokenText)

  if (input.quotaUsed >= input.quotaLimit) {
    issues.push({
      code: 'QUOTA_EXCEEDED',
      severity: 'error',
      message: `Aylık video kotası dolu (${input.quotaUsed}/${input.quotaLimit}). Yeni üretim başlatılamaz.`,
    })
  }
  if (!input.hasLogo) {
    issues.push({ code: 'LOGO_REQUIRED', severity: 'error', message: 'Kanonik kurumsal logo eksik.' })
  }
  if (input.promotionType !== 'general_brand' && !input.hasProduct) {
    issues.push({ code: 'PRODUCT_ASSET_REQUIRED', severity: 'error', message: 'Kanonik ürün görseli eksik.' })
  }
  if (input.promotionType === 'existing_product' && !input.productId) {
    issues.push({ code: 'CATALOG_PRODUCT_REQUIRED', severity: 'error', message: 'Katalog ürün kimliği kilitlenemedi.' })
  }
  if (wordCount === 0 || wordCount > MAX_SPOKEN_WORDS) {
    issues.push({
      code: 'SPEECH_LENGTH_INVALID',
      severity: 'error',
      message: `Onaylı Türkçe seslendirme 1–${MAX_SPOKEN_WORDS} kelime olmalı; şu an ${wordCount}.`,
    })
  }
  if ((input.adFormat === 'OFFER' || input.adFormat === 'OFFER_DRIVEN') && (!input.offer || !input.offerVerified)) {
    issues.push({
      code: 'VERIFIED_OFFER_REQUIRED',
      severity: 'error',
      message: 'Kampanya formatı için teklif metni ve “doğrulandı” onayı gerekli.',
    })
  }
  if (!input.fidelityContract.must_preserve.length || !input.fidelityContract.forbidden_mutations.length) {
    issues.push({
      code: 'FIDELITY_CONTRACT_INCOMPLETE',
      severity: 'error',
      message: 'Ürünün korunacak özellikleri ve yasak mutasyonları tanımlanmalı.',
    })
  }
  if (input.referenceCount !== input.referenceRoleCount) {
    issues.push({
      code: 'REFERENCE_ROLE_MISSING',
      severity: 'error',
      message: 'Her ek görsele bir kullanım rolü atanmalı.',
    })
  }
  if (!input.verifiedClaims.length) {
    issues.push({
      code: 'NO_VERIFIED_CLAIMS',
      severity: 'warning',
      message: 'Doğrulanmış ürün iddiası yok; video yalnızca nötr ürün kimliği ve görünür gerçekleri kullanacak.',
    })
  }
  if ((input.adFormat === 'SOCIAL_UGC' || input.adFormat === 'UGC_TESTIMONIAL') && input.referenceCount === 0) {
    issues.push({
      code: 'UGC_REFERENCE_RECOMMENDED',
      severity: 'warning',
      message: 'Samimi anlatım için sunucu veya kullanım ortamı referansı eklemek sonucu güçlendirir.',
    })
  }

  return issues
}
