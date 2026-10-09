export const CREATIVE_FORMATS = [
  { id: 'wa', label: 'WhatsApp kampanya', format: 'square', aspect: '1:1', hint: 'Kare · sohbette net durur' },
  { id: 'ig', label: 'Instagram kare', format: 'square', aspect: '1:1', hint: '1:1 akış' },
  { id: 'story', label: 'Instagram story', format: 'story', aspect: '9:16', hint: 'Dikey hikâye' },
  { id: 'feed', label: 'Genel sosyal medya', format: 'feed', aspect: '4:5', hint: 'Dikey akış' },
  { id: 'banner', label: 'Yatay banner', format: 'banner', aspect: '16:9', hint: 'Kapak / banner' },
] as const

export const VIDEO_CREATIVE_FORMAT = {
  id: 'reels_video',
  label: 'Kampanya videosu',
  format: 'video',
  aspect: '9:16',
  hint: '10sn sinematik video (9:16)',
} as const

export type TemplateFamily =
  | 'CAMPAIGN_POSTER'
  | 'PRODUCT_SHOWCASE'
  | 'FOOD_OFFER_POSTER'
  | 'ELEGANT_RETAIL'
  | 'SAAS_PROMO_CARD'

export const TEMPLATE_FAMILIES: {
  id: TemplateFamily
  label: string
  tag?: string
  description: string
  hint: string
}[] = [
  {
    id: 'CAMPAIGN_POSTER',
    label: 'Kampanya Afişi',
    tag: 'Önerilen',
    description: 'Fiziksel ürünler için yüksek dönüşümlü, teklif ve indirim odaklı afiş.',
    hint: 'Dominant product, bold headline, offer/discount badge, price hierarchy, mobile-readable direct-response ad.',
  },
  {
    id: 'PRODUCT_SHOWCASE',
    label: 'Ürün Vitrini',
    description: 'Ürünün estetik detaylarını, malzeme dokusunu ve kalitesini öne çıkaran net vitrin.',
    hint: 'Clean breathing room, product visually dominant, restrained sales copy, pristine commercial staging.',
  },
  {
    id: 'FOOD_OFFER_POSTER',
    label: 'Yemek Fırsatı',
    description: 'Restoran ve gıda işletmeleri için iştah açıcı, menü ve fiyat vurgulu lezzet afişi.',
    hint: 'Appetizing culinary hero, delicious warm presentation, clear menu/pricing emphasis, strong sales call-to-action.',
  },
  {
    id: 'ELEGANT_RETAIL',
    label: 'Zarif Kampanya',
    description: 'Çiçekçilik, butik, hediye ve özel tasarım işletmeleri için estetik ve zarif sunum.',
    hint: 'Flowers/gifts/boutique commercial appeal, softer harmonious typography, graceful layout, sales-oriented yet refined.',
  },
  {
    id: 'SAAS_PROMO_CARD',
    label: 'Uygulama / SaaS Tanıtımı',
    description: 'Dijital ürünler, yazılım, web servisi veya mobil uygulama için modern arayüz kartı.',
    hint: 'Modern app/dashboard UI hero, clear benefit headline, trial/pricing details, sleek tech-commercial structure.',
  },
]

export const CREATIVE_STYLES = [
  { id: 'auto', label: 'Otomatik' },
  { id: 'modern', label: 'Modern' },
  { id: 'premium', label: 'Premium' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'energetic', label: 'Enerjik' },
  { id: 'fun', label: 'Eğlenceli' },
  { id: 'corporate', label: 'Kurumsal' },
  { id: 'luxury', label: 'Lüks' },
  { id: 'food', label: 'Yiyecek / iştah açıcı' },
] as const

export const TEXT_DENSITIES: {
  id: 'low' | 'balanced' | 'detailed'
  label: string
  description: string
}[] = [
  { id: 'low', label: 'Sade', description: 'Az metin, sadece ana başlık ve ürün.' },
  { id: 'balanced', label: 'Dengeli', description: 'Başlık, teklif ve fiyat; dengeli ve okunabilir.' },
  { id: 'detailed', label: 'Yoğun Kampanya', description: 'Başlık, indirim, fiyat ve teslimat/iletişim bilgisi.' },
]

export const BRIEF_CHIPS = [
  'İndirim kampanyası',
  'Yeni ürün',
  'Sezon kampanyası',
  'Özel gün',
  'Fiyat duyurusu',
  'Mağaza duyurusu',
] as const

export const VARIATION_PRESETS = [
  { id: 'similar', label: 'Benzer bir tasarım' },
  { id: 'minimal', label: 'Daha minimal' },
  { id: 'premium', label: 'Daha premium' },
  { id: 'bold', label: 'Daha dikkat çekici' },
  { id: 'layout', label: 'Farklı yerleşim' },
] as const

export const PRODUCT_FIELD_KEYS = [
  'name',
  'image',
  'description',
  'boxContents',
  'price',
  'promo',
] as const

export type ProductFieldKey = (typeof PRODUCT_FIELD_KEYS)[number]

export const PRODUCT_FIELD_LABELS: Record<ProductFieldKey, string> = {
  name: 'Ürün adı',
  image: 'Ürün görseli',
  description: 'Kısa açıklama',
  boxContents: 'Kutu içeriği',
  price: 'Fiyat',
  promo: 'Kampanya bilgisi',
}

export type CreativeSnapshotProduct = {
  id: string
  name: string
  description: string | null
  boxContents: string | null
  imageUrl: string | null
  price: string | null
  oldPrice: string | null
  promo: string | null
  extra: string | null
  include: Record<ProductFieldKey, boolean>
}

export type CreativeSnapshot = {
  companyName?: string | null
  companyAbout?: string | null
  brief: string
  style: string
  formatId: string
  aspect: '1:1' | '4:5' | '9:16' | '16:9'
  textDensity: 'low' | 'balanced' | 'detailed'
  useLogo: boolean
  labels: string[]
  cta: string | null
  address: string | null
  website: string | null
  dateRange: string | null
  customText: string | null
  phones: { id: string; label: string; phone: string }[]
  socials: { id: string; platform: string; label: string | null; url: string }[]
  brandKit: {
    id: string
    name: string
    tone: string | null
    colors: Record<string, string>
    fonts: Record<string, string>
    logoPath: string | null
  } | null
  products: CreativeSnapshotProduct[]
  baseCreativeId: string | null
  instruction?: string | null
  variationPreset?: string | null
  includeVideoOverlay?: boolean
  includeVideoLogo?: boolean
  includeVideoBanner?: boolean
  includeVideoCta?: boolean
  videoSpeech?: boolean
  subtitles?: boolean
  videoScenarioPrompt?: string | null
  videoScenarioTitle?: string | null
  customVoiceover?: string | null
  voiceoverScript?: string | null
  referenceImageUrls?: string[] | null
  templateFamily?: TemplateFamily | null
  sector?: string | null
  deliveryInfo?: string | null
  stockInfo?: string | null
  urgencyInfo?: string | null
  primaryBenefits?: string[] | null
  campaignMessage?: string | null
  customHeadline?: string | null
  customSupporting?: string | null
  objective?: string | null
  stylePreset?: string | null
}

export type CreativePayload = CreativeSnapshot & {
  generationRevision?: number
  videoSubmitIntent?: import('./video-submit-job').VideoSubmitIntent | null
  videoSubmissionUncertain?: boolean
  quickSendPrompt?: string
  quickSendIdentity?: string
  imageJob?: import('../ai/omnistudio-image-job').ImageJobReceipt | null
  imageOutputReceipt?: {
    orgId: string; creativeId: string; jobId: string | null; sha256: string; size: number;
    mimeType: string; width: number; height: number; decodedImage: boolean; storagePath: string;
    referenceReceipt: import('../ai/omnistudio-image-job').ImageReferenceReceipt | null;
      generation_sha256?: string | null;
    final_sha256?: string | null;
  }
  creativePlan?: any;
  customHeadline?: string | null;
  customSupporting?: string | null;
  heroProductId?: string | null;
  stylePreset?: string | null;
  objective?: string | null;
  artDirectionPlan?: any;
  art_direction_source?: 'AI_PRECOMPUTED' | 'DETERMINISTIC_FALLBACK' | 'STANDARD_NOT_REQUIRED' | null;
  submissionMetrics?: {
    submit_total_ms: number;
    auth_ms: number;
    idempotency_lookup_ms?: number;
    parallel_reads_ms: number;
    asset_validation_ms: number;
    creative_insert_ms: number;
    enqueue_ms: number;
    redirect_ready_ms: number;
    art_direction_source: string;
  } | null;
  qualityMode?: 'STANDARD' | 'DESIGNER';
  imageAttempt?: string
  imageSubmissionUncertain?: boolean
  imageSubmitIntent?: { requestId: string; gatewayUrl: string; startedAt: string } | null
  imageDirectIntent?: { requestId: string; provider: string; storagePath: string; startedAt: string } | null
  imageReconciliationRequired?: boolean
  imageTerminalFailure?: { kind: 'PROVIDER_FAILED'; jobId: string; gatewayUrl: string }
  title?: string
  requestKey?: string
  generatedPrompt?: string | null
  originalPrompt?: string | null
  provider?: string | null
  model?: string | null
  attempts?: string[] | null
  thumbnailUrl?: string | null
  cleanPublicUrl?: string | null
  cleanStoragePath?: string | null
  videoDuration?: number | null
  pendingVideoUrl?: string | null
  /** Flow'un asenkron video kuyruğu. Kayıt DB'de kaldığı için HTTP isteği bitse bile iş devam eder. */
  flowJob?: {
    id: string
    gatewayUrl: string
    queuedAt: string
    queuePosition?: number | null
    estimatedWaitSeconds?: number | null
    lastStatus?: string | null
    lastCheckedAt?: string | null
  } | null
  cost?: { provider?: string; model?: string; imageCount: number } | null
}

export function formatToAspect(format: string): CreativeSnapshot['aspect'] {
  if (format === 'story' || format === 'video') return '9:16'
  if (format === 'feed') return '4:5'
  if (format === 'banner') return '16:9'
  return '1:1'
}

export function titleFromBrief(brief: string): string {
  const clean = brief.replace(/\s+/g, ' ').trim()
  if (!clean) return 'Kampanya görseli'
  return clean.length > 180 ? clean.slice(0, 180) : clean
}
