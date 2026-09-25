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
      ? `${product}: ${claim}. Hemen bilgi ve sipariş için ${brand}.`
      : `${product} kalitesiyle tanışın. Bilgi ve sipariş için ${brand}.`,
    PRODUCT_USAGE: claim
      ? `${product}, ${claim}. İşinizi kolaylaştıran sağlam ve pratik çözüm.`
      : `${product}, yüksek performansı ve kalıcı dayanıklılığıyla yanınızda.`,
    PROBLEM_SOLUTION: claim
      ? `Sağlam ve güvenilir çözümler için ${product}: ${claim}.`
      : `Aradığınız kalite ve kalıcı dayanıklılık: ${product} ile ${brand} güvencesi.`,
    SOCIAL_UGC: claim
      ? `Gerçek kaliteyi keşfedin: ${product}, ${claim}.`
      : `Projelerinizde fark yaratan güvenilir çözüm: ${product} ile tanışın.`,
    PREMIUM: claim
      ? `Kusursuz kalite ve güven: ${product}. ${claim}.`
      : `Kusursuz işçilik ve kalıcı dayanıklılık. ${product}, ${brand} güvencesiyle.`,
    OFFER: input.offerVerified && input.offer
      ? `${product} için özel fırsat: ${compact(input.offer)}. Detaylar ${brand}'de.`
      : `${product} için avantajlı fırsatlar ve cazip fiyatlar ${brand}'de.`,
    OFFER_DRIVEN: input.offerVerified && input.offer
      ? `${product} için özel fırsat: ${compact(input.offer)}. Detaylar ${brand}'de.`
      : `${product} için avantajlı fırsatlar ve cazip fiyatlar ${brand}'de.`,
  }

  const defaultCandidate = claim
    ? `${product}, ${claim}. Sağlam ve güvenilir çözüm ${brand}'de.`
    : `${product}, sağlam yapılar ve kaliteli çözümler için ${brand} güvencesiyle.`

  return clampWords(candidates[input.adFormat] || defaultCandidate)
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
      message: `Aylık video kotanız dolu (${input.quotaUsed}/${input.quotaLimit}). Yeni üretim başlatılamaz.`,
    })
  }
  if (!input.hasLogo) {
    issues.push({ code: 'LOGO_REQUIRED', severity: 'error', message: 'Kurumsal logonuz eksik. Lütfen logonuzu ekleyin.' })
  }
  if (input.promotionType !== 'general_brand' && !input.hasProduct) {
    issues.push({ code: 'PRODUCT_ASSET_REQUIRED', severity: 'error', message: 'Ürün görseli seçilmedi. Lütfen ürün görseli belirleyin.' })
  }
  if (input.promotionType === 'existing_product' && !input.productId) {
    issues.push({ code: 'CATALOG_PRODUCT_REQUIRED', severity: 'error', message: 'Lütfen katalogdan bir ürün seçin.' })
  }
  if (wordCount === 0 || wordCount > MAX_SPOKEN_WORDS) {
    issues.push({
      code: 'SPEECH_LENGTH_INVALID',
      severity: 'error',
      message: `Seslendirme metni 1–${MAX_SPOKEN_WORDS} kelime arasında olmalıdır (Şu an: ${wordCount} kelime).`,
    })
  }
  if ((input.adFormat === 'OFFER' || input.adFormat === 'OFFER_DRIVEN') && (!input.offer || !input.offerVerified)) {
    issues.push({
      code: 'VERIFIED_OFFER_REQUIRED',
      severity: 'error',
      message: 'Kampanya formatı için teklif metni girilmeli ve doğrulanmalıdır.',
    })
  }
  if (!input.fidelityContract.must_preserve.length || !input.fidelityContract.forbidden_mutations.length) {
    issues.push({
      code: 'FIDELITY_CONTRACT_INCOMPLETE',
      severity: 'error',
      message: 'Ürünün korunacak temel özellikleri tanımlanmalıdır.',
    })
  }
  if (input.referenceCount !== input.referenceRoleCount) {
    issues.push({
      code: 'REFERENCE_ROLE_MISSING',
      severity: 'error',
      message: 'Eklenen her görsel için bir kullanım türü seçilmelidir.',
    })
  }
  if (!input.verifiedClaims.length) {
    issues.push({
      code: 'NO_VERIFIED_CLAIMS',
      severity: 'warning',
      message: 'Ek ürün özelliği belirtilmedi; tanıtımda temel ürün ve marka bilgileri kullanılacaktır.',
    })
  }
  if ((input.adFormat === 'SOCIAL_UGC' || input.adFormat === 'UGC_TESTIMONIAL') && input.referenceCount === 0) {
    issues.push({
      code: 'UGC_REFERENCE_RECOMMENDED',
      severity: 'warning',
      message: 'Samimi deneyim formatı için sunucu veya kullanım ortamı görseli eklemeniz tavsiye edilir.',
    })
  }

  return issues
}
