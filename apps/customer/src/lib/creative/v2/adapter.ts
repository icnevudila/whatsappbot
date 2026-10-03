import {
  type CampaignObjective,
  type CreativeStylePreset,
  type ImageFormatV2,
  type MediaType,
  type StructuredCampaignCopy,
} from './types'

export type UnifiedCreativeDraftV2 = {
  version: 2
  requestKey: string
  mediaType: MediaType
  heroProductId: string
  objective: CampaignObjective
  stylePreset: CreativeStylePreset
  campaignDetail: string
  campaignCopy: StructuredCampaignCopy
  formatId: ImageFormatV2 | 'STORY_9_16'
  // Derived source pre-attached if initiated from Content Library
  derivedFromCreativeId?: string | null
  // Advanced overrides (optional)
  advanced: {
    brandKitId?: string | null
    environmentPreset?: string | null
    motionStyle?: string | null
    subtitles?: boolean
    outro?: boolean
  }
  // Confirmed user-facing copy / voiceover
  customHeadline?: string | null
  customSupporting?: string | null
  customVoiceover?: string | null
}

export function mapLegacyStyleToPreset(legacyStyle?: string | null): CreativeStylePreset {
  if (!legacyStyle) return 'AUTO'
  const s = legacyStyle.toUpperCase().trim()
  if (['PRODUCT_HERO', 'FAST_SALES', 'MINIMAL', 'MODERN', 'CLEAN'].includes(s)) return 'PRODUCT_HERO'
  if (['REAL_USAGE', 'PRODUCT_USAGE', 'SOCIAL_UGC', 'FOOD', 'PROBLEM_SOLUTION'].includes(s)) return 'REAL_USAGE'
  if (['PREMIUM', 'LUXURY', 'CORPORATE', 'ELEGANT'].includes(s)) return 'PREMIUM'
  if (['DYNAMIC_OFFER', 'OFFER', 'OFFER_DRIVEN', 'ENERGETIC', 'FAST'].includes(s)) return 'DYNAMIC_OFFER'
  return 'AUTO'
}

export function mapPresetToLegacyVideoFormat(preset: CreativeStylePreset): string {
  switch (preset) {
    case 'PRODUCT_HERO':
      return 'FAST_SALES'
    case 'REAL_USAGE':
      return 'PRODUCT_USAGE'
    case 'PREMIUM':
      return 'PREMIUM'
    case 'DYNAMIC_OFFER':
      return 'AUTO'
    case 'AUTO':
    default:
      return 'AUTO'
  }
}

export function mapLegacyFormatToV2(legacyFormatId?: string | null): ImageFormatV2 {
  if (!legacyFormatId) return 'SQUARE_1_1'
  const f = legacyFormatId.toLowerCase().trim()
  if (f === 'story' || f === 'reels_video') return 'STORY_9_16'
  if (f === 'portrait' || f === '4:5') return 'PORTRAIT_4_5'
  return 'SQUARE_1_1'
}

export function mapPresetToVideoMotionStyle(preset: CreativeStylePreset): string {
  switch (preset) {
    case 'PRODUCT_HERO':
      return 'dynamic_camera'
    case 'REAL_USAGE':
      return 'real_usage'
    case 'PREMIUM':
      return 'slow_cinematic'
    case 'DYNAMIC_OFFER':
      return 'energetic'
    case 'AUTO':
    default:
      return 'balanced'
  }
}

export interface V2SubmissionInput {
  mediaType: MediaType
  heroProductId?: string | null
  logoUrl?: string | null
  objective?: CampaignObjective | null
  stylePreset?: CreativeStylePreset | null
  format?: string | null
  voiceoverText?: string | null
  voiceoverLanguage?: string | null
}

export interface V2ValidationResult {
  valid: boolean
  error?: string
  expected_reference_count?: number
}

export function validateV2Submission(input: V2SubmissionInput): V2ValidationResult {
  if (!input.logoUrl) {
    return {
      valid: false,
      error: 'Marka logosu zorunludur. Devam etmek için Marka Kiti veya Ayarlar üzerinden bir logo yükleyin.',
    }
  }

  if (!input.heroProductId) {
    return {
      valid: false,
      error: 'Ürün seçimi zorunludur. Lütfen kampanya için tek bir ana ürün seçin.',
    }
  }

  if (input.mediaType === 'VIDEO') {
    if (!input.voiceoverText || !input.voiceoverText.trim()) {
      return {
        valid: false,
        error: 'Video üretimi için Türkçe seslendirme metni zorunludur.',
      }
    }
    if (input.voiceoverLanguage && input.voiceoverLanguage !== 'tr-TR') {
      return {
        valid: false,
        error: 'Seslendirme dili tr-TR olmak zorundadır.',
      }
    }
  }

  return {
    valid: true,
    expected_reference_count: 2, // 1 canonical logo + 1 hero product
  }
}

export function adaptLegacyDraftToV2(
  raw: Record<string, unknown>,
  availableProductIds: string[] = [],
): UnifiedCreativeDraftV2 {
  const isVideo =
    raw.formatId === 'reels_video' ||
    raw.format === 'video' ||
    raw.format === 'reels_video' ||
    raw.mediaType === 'VIDEO' ||
    Boolean(raw.speechTimeline) ||
    Boolean(raw.speech_timeline)

  // Single Hero Product Resolution:
  let heroProductId = ''
  if (typeof raw.heroProductId === 'string' && raw.heroProductId) {
    heroProductId = raw.heroProductId
  } else if (Array.isArray(raw.productIds) && raw.productIds.length > 0) {
    // Pick the first valid registered product
    const valid = raw.productIds.map(String).find((id) => availableProductIds.includes(id))
    heroProductId = valid || String(raw.productIds[0] || '')
  } else if (Array.isArray(raw.product_ids) && raw.product_ids.length > 0) {
    const valid = raw.product_ids.map(String).find((id) => availableProductIds.includes(id))
    heroProductId = valid || String(raw.product_ids[0] || '')
  } else if (typeof raw.productId === 'string' && raw.productId) {
    heroProductId = raw.productId
  }

  // Objective mapping
  let objective: CampaignObjective = 'PRODUCT_INTRO'
  const rawObj = String(raw.objective || raw.adFormat || raw.campaign_objective || '').toUpperCase()
  if (rawObj.includes('OFFER') || rawObj.includes('SALES')) {
    objective = 'SALES_OFFER'
  } else if (rawObj.includes('NEW') || rawObj.includes('LAUNCH') || rawObj.includes('YENI')) {
    objective = 'NEW_PRODUCT'
  } else if (rawObj.includes('PREMIUM') || rawObj.includes('BRAND') || rawObj.includes('MARKA')) {
    objective = 'BRAND_AWARENESS'
  }

  const stylePreset = mapLegacyStyleToPreset(
    (raw.stylePreset as string) || (raw.adFormat as string) || (raw.style as string) || (raw.visual_style as string),
  )

  const legacyExtras = (raw.productExtras as Record<string, any>) || {}
  const firstExtra = heroProductId ? legacyExtras[heroProductId] || {} : {}

  const campaignCopy: StructuredCampaignCopy = {
    price: (raw.price as string) || firstExtra.price || null,
    oldPrice: (raw.oldPrice as string) || firstExtra.oldPrice || null,
    offer: (raw.offer as string) || firstExtra.promo || (raw.offerDetails as string) || null,
    dateRange: (raw.dateRange as string) || null,
    cta: (raw.cta as string) || null,
  }

  const rawFormat = (raw.formatId || raw.format) as string

  return {
    version: 2,
    requestKey: (raw.requestKey as string) || crypto.randomUUID(),
    mediaType: isVideo ? 'VIDEO' : 'IMAGE',
    heroProductId,
    objective,
    stylePreset,
    campaignDetail: (raw.campaignDetail as string) || (raw.creativeNote as string) || (raw.brief as string) || (raw.notes as string) || '',
    campaignCopy,
    formatId: isVideo ? 'STORY_9_16' : mapLegacyFormatToV2(rawFormat),
    derivedFromCreativeId: (raw.baseCreativeId as string) || null,
    advanced: {
      brandKitId: (raw.brandKitId as string) || null,
      environmentPreset: (raw.environmentPreset as string) || 'auto',
      motionStyle: (raw.motionStyle as string) || 'real_usage',
      subtitles: raw.subtitles !== false && raw.subtitles !== 'off',
      outro: raw.outro !== false && raw.outro !== 'off',
    },
    customHeadline: (raw.customHeadline as string) || (raw.headline as string) || null,
    customSupporting: (raw.customSupporting as string) || null,
    customVoiceover: (raw.customVoiceover as string) || (raw.approved_spoken_line as string) || null,
  }
}

