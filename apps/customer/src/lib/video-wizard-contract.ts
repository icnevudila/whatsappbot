export const VIDEO_ENGINE_MODE = 'SIMPLE_V5_HYBRID' as const
export const VIDEO_REQUESTED_PROVIDER = 'AUTO' as const
export const VIDEO_ASPECT_RATIO = '9:16' as const
export const VIDEO_DURATION_SECONDS = 8 as const
export const VIDEO_LANGUAGE = 'tr-TR' as const
export const VIDEO_SUBTITLE_MODE = 'auto' as const
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
  creativeNote?: string
  productDescription?: string
}): string {
  const brand = compact(input.brandName) || 'İşletmemiz'
  const product = compact(input.productName) || 'ürünümüz'
  const claim = compact(input.verifiedClaims?.[0] || '')
  const note = compact(input.creativeNote || '')
  const desc = compact(input.productDescription || '')
  const fmt = input.adFormat || 'FAST_SALES'

  const searchScope = `${brand} ${product} ${desc} ${note}`.toLocaleLowerCase('tr-TR')
  const isBrick = searchScope.includes('tuğla') || searchScope.includes('tugla') || searchScope.includes('klinker') || searchScope.includes('inşaat') || searchScope.includes('ayvazoğlu') || searchScope.includes('ayvazoglu')
  const isSprayer = searchScope.includes('pompa') || searchScope.includes('ilaçlama') || searchScope.includes('bofe') || searchScope.includes('bahçe') || searchScope.includes('tarım')

  if (isBrick) {
    if (fmt === 'PRODUCT_USAGE') {
      const brickUsagePool = [
        `Harçla kusursuz kenetlenen sağlam bloklar. İşin ustası sahada her zaman ${brand} tuğlayı seçer.`,
        `Hızlı örülen dayanıklı duvarlar, tavizsiz klinker kalitesi. Ustalara sahada hız kazandıran ${brand}.`,
        `Ustanın elinde sağlamlığa dönüşen kusursuz işçilik. ${brand} tuğla ile yapılar güvende.`,
      ]
      if (note) {
        return clampWords(`Harçla kusursuz kenetlenen sağlam bloklar. ${note}. ${brand} ile sağlam yapılar.`)
      }
      return clampWords(brickUsagePool[Math.floor(Math.random() * brickUsagePool.length)])
    }
    if (fmt === 'PREMIUM') {
      return clampWords(`Yüksek üretim standartları ve geleceğe taşınan güven. ${brand} ile sağlam yarınlar inşa ediyoruz.`)
    }
    const brickHeroPool = [
      `Kusursuz form ve zamana meydan okuyan dayanıklılık. ${brand} tuğla ile sağlamlığın temeli inşaatta başlar.`,
      `Tek eksenli dikey delik yapısı ve klinker dayanıklılığı. ${brand} ile yapılarınız daima güvende.`,
      `Üstün klinker kalitesi ve milimetrik form. ${brand}, sağlam projelerin vazgeçilmez tercihi.`,
    ]
    if (note) {
      return clampWords(`Kusursuz form ve tavizsiz klinker dayanıklılığı. ${note}. ${brand} güvencesiyle.`)
    }
    return clampWords(brickHeroPool[Math.floor(Math.random() * brickHeroPool.length)])
  }

  if (isSprayer) {
    if (fmt === 'PRODUCT_USAGE') {
      const sprayUsagePool = [
        `Sırtta ağırlık yapmayan ergonomik depo ve güçlü püskürtme. ${brand} şarjlı pompa ile ilaçlama artık yormuyor.`,
        `Bahçede saatlerce kesintisiz çalışma. Sahada işini bilen profesyonellerin tercihi her zaman ${brand}.`,
        `Homojen basınç ve pratik ilaçlama. Usta ellerde yüksek verim sunan ${brand} kalitesi.`,
      ]
      if (note) {
        return clampWords(`Sırtta ağırlık yapmayan ergonomik depo. ${note}. ${brand} ile pratik ilaçlama.`)
      }
      return clampWords(sprayUsagePool[Math.floor(Math.random() * sprayUsagePool.length)])
    }
    const sprayHeroPool = [
      `Hafif gövde, homojen basınç ve kesintisiz püskürtme. ${brand} ile bahçenizde profesyonel ilaçlama kolaylığı.`,
      `Yüksek verimli akü ve tavizsiz dayanıklılık. ${brand} ilaçlama pompası ile işiniz kolaylaşsın.`,
      `Kusursuz gövde yapısı ve tavizsiz malzeme kalitesi. ${brand} ile bahçenizde tam verim.`,
    ]
    if (note) {
      return clampWords(`Hafif gövde, homojen basınç ve kesintisiz püskürtme. ${note}. ${brand} kalitesiyle.`)
    }
    return clampWords(sprayHeroPool[Math.floor(Math.random() * sprayHeroPool.length)])
  }

  // General Products
  if (fmt === 'PRODUCT_USAGE') {
    const generalUsagePool = [
      note ? `Sahada maksimum verim ve pratik kullanım. ${note}. ${brand} kalitesi her zaman yanınızda.` : `Sahada hız, uygulamada ustalık. İşini bilen profesyoneller her zaman ${brand} ${product} tercih eder.`,
      `İşinizi hafifleten pratik kullanım ve yüksek verim. ${brand} ${product} ile sahada fark yaratın.`,
      `Ustalara özel pratiklik ve tavizsiz sağlamlık. ${product}, ${brand} güvencesiyle daima yanınızda.`,
    ]
    return clampWords(generalUsagePool[Math.floor(Math.random() * generalUsagePool.length)])
  }

  if (fmt === 'PREMIUM') {
    return clampWords(note ? `Yüksek standartlar ve kurumsal güven. ${note}. ${brand} kalitesiyle.` : `Yüksek üretim standartları ve geleceğe taşınan vizyon. ${product}, ${brand} kurumsal prestijiyle.`)
  }

  // FAST_SALES / AUTO
  const generalHeroPool = [
    note ? `Kusursuz kalite ve tavizsiz işçilik. ${note}. ${brand} ${product} güvencesiyle.` : `Kusursuz detaylar ve tavizsiz malzeme kalitesi. ${brand} ${product} ile aradığınız üstün performans.`,
    `Zamana meydan okuyan sağlamlık ve kusursuz form. ${product}, ${brand} kalitesiyle yanınızda.`,
    `Üstün kalite standartları ve güvenilir performans. ${product} ile sağlam adımlarla ilerleyin.`,
  ]
  return clampWords(generalHeroPool[Math.floor(Math.random() * generalHeroPool.length)])
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
