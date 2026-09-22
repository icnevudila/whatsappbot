import { CREATIVE_FORMATS, VIDEO_CREATIVE_FORMAT, type ProductFieldKey } from '@/lib/creative/types'

export type LibraryOption = {
  id: string
  title: string | null
  publicUrl: string | null
  status: string
  createdAt: string
}

export type BrandKitCard = {
  id: string
  name: string
  tone: string | null
  colors: Record<string, string>
  fonts: Record<string, string>
  samplePreview: string | null
  isDefault: boolean
}

export type ProductCard = {
  id: string
  name: string
  description: string | null
  boxContents: string | null
  images: { id: string; url: string }[]
}

export type PhoneOption = {
  id: string
  label: string
  phone: string
}

export type SocialOption = {
  id: string
  platform: string
  label: string | null
  url: string
}

export type OrgBits = {
  id: string
  name: string
  address: string | null
  about: string | null
  websiteHint: string | null
  logoPreview: string | null
  monthlyVideoQuota?: number
  monthlyVideoUsed?: number
}

export type WizardBootstrap = {
  org: OrgBits
  kits: BrandKitCard[]
  products: ProductCard[]
  phones: PhoneOption[]
  socials: SocialOption[]
  library: LibraryOption[]
  imageAiEnabled: boolean
  canManage: boolean
  suggestedVideoChips?: Array<{ label: string; text: string }>
}

export function formatFromId(formatId: string): (typeof CREATIVE_FORMATS)[number] | typeof VIDEO_CREATIVE_FORMAT {
  if (formatId === 'reels_video') return VIDEO_CREATIVE_FORMAT
  return CREATIVE_FORMATS.find((row) => row.id === formatId) ?? CREATIVE_FORMATS[0]
}

export const DEFAULT_INCLUDE: Record<ProductFieldKey, boolean> = {
  name: true,
  image: true,
  description: true,
  boxContents: true,
  price: true,
  promo: true,
}

export function emptyProductInclude(): Record<ProductFieldKey, boolean> {
  return { ...DEFAULT_INCLUDE }
}

export type VideoWizardStep = 'what' | 'campaign' | 'draft' | 'summary'

export type PromotionType = 'existing_product' | 'existing_service' | 'general_brand' | 'new_offering'

export type UserStylePreference =
  | 'AUTO'
  | 'FAST_SALES'
  | 'PRODUCT_USAGE'
  | 'PROBLEM_SOLUTION'
  | 'SOCIAL_UGC'
  | 'PREMIUM'
  | 'OFFER'

export type AdFormatType =
  | UserStylePreference
  | 'PERFORMANCE_DEMO'
  | 'PRODUCT_HERO'
  | 'BRAND_CINEMATIC'
  | 'UGC_TESTIMONIAL'
  | 'OFFER_DRIVEN'

export const USER_STYLE_OPTIONS: { id: UserStylePreference; label: string; tag?: string; desc: string }[] = [
  { id: 'AUTO', label: 'Otomatik — Önerilen', tag: 'Önerilen', desc: 'Sektör ve ürün yapınıza göre en uygun reklam kurgusunu yapay zeka belirler.' },
  { id: 'FAST_SALES', label: 'Hızlı ve satış odaklı', desc: 'Doğrudan faydaya odaklanan, dinamik tempolu ve net çağrılı reklam.' },
  { id: 'PRODUCT_USAGE', label: 'Ürün kullanımını göster', desc: 'Ürünün detaylarını, işlevini ve fiziksel performansını öne çıkaran kurgu.' },
  { id: 'PROBLEM_SOLUTION', label: 'Sorun → Çözüm', desc: 'Hedef kitlenin yaşadığı bir problemi tespit edip ürünü kesin çözüm olarak sunar.' },
  { id: 'PREMIUM', label: 'Premium / Sinematik', desc: 'Yüksek prestij, kurumsal güven ve sinematik görsel atmosfer.' },
  { id: 'SOCIAL_UGC', label: 'Samimi / Konuşan kişi', desc: 'Kullanıcı deneyimi havasında, doğal ve güven veren samimi anlatım.' },
  { id: 'OFFER', label: 'Kampanya odaklı', desc: 'Özel fiyat, indirim veya sınırlı süreli fırsatı merkeze alan duyuru.' },
]

export const AD_FORMAT_OPTIONS = USER_STYLE_OPTIONS

export type SpeechTimelineItem = {
  start_sec: number
  end_sec: number
  exact_text: string
  speaker: string
  delivery_style?: string
  corresponding_visual_beat?: string
}

export type CreativeRevision = {
  id: string
  status: 'DRAFT' | 'USER_EDITED' | 'APPROVED' | 'LOCKED_FOR_GENERATION'
  creative_idea: string
  selected_ad_format: AdFormatType
  speech_timeline: SpeechTimelineItem[]
  veo_prompt_draft?: string
}

export type JobUserViewModel = {
  job_id: string
  org_id: string
  state: 'PENDING' | 'QUEUED' | 'GENERATING' | 'COMPLETED' | 'FAILED'
  display_state:
    | 'REKLAM_TASLAGI_HAZIRLANIYOR'
    | 'SIRAYA_ALINDI'
    | 'GORSELLER_BAGLANIYOR'
    | 'VIDEO_OLUSTURULUYOR'
    | 'KALITE_KONTROLU'
    | 'MARKA_DUZENLEMELERI'
    | 'HAZIR'
    | 'BASARISIZ'
  display_title: string
  display_message: string
  stage_index: number
  queue_ahead_count?: number | null
  eta_display_text?: string | null
  can_cancel: boolean
  can_leave_page: boolean
  output_id?: string | null
  playback_url?: string | null
  failure_user_message?: string | null
}
