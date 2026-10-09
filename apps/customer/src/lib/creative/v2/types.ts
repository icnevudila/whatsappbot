export type MediaType = 'IMAGE' | 'VIDEO'

export type CampaignObjective =
  | 'PRODUCT_INTRO'
  | 'SALES_OFFER'
  | 'NEW_PRODUCT'
  | 'BRAND_AWARENESS'
  | 'CAMPAIGN'

export const CAMPAIGN_OBJECTIVES: { id: CampaignObjective; label: string; description: string }[] = [
  { id: 'PRODUCT_INTRO', label: 'Ürünü Tanıt', description: 'Ürününüzün özelliklerini ve kalitesini doğrudan gösterin.' },
  { id: 'SALES_OFFER', label: 'Satış Yap', description: 'Özel fiyat ve teklifle müşteriyi hemen satın almaya yönlendirin.' },
  { id: 'CAMPAIGN', label: 'Kampanya Duyur', description: 'Dönemsel indirim veya sınırlı süreli avantaj paylaşın.' },
  { id: 'BRAND_AWARENESS', label: 'Markanı Tanıt', description: 'İşletmenizin kurumsal gücünü ve güvenilirliğini vurgulayın.' },
  { id: 'NEW_PRODUCT', label: 'Yeni Ürün', description: 'Menünüze veya vitrininize yeni eklenen ürünü tanıtın.' },
]

export type CreativeStylePreset =
  | 'AUTO'
  | 'PRODUCT_HERO'
  | 'REAL_USAGE'
  | 'PREMIUM'
  | 'DYNAMIC_OFFER'

export const CREATIVE_STYLE_PRESETS: {
  id: CreativeStylePreset
  label: string
  tag?: string
  description: string
  imageStyleHint: string
  videoFormatHint: string
}[] = [
  {
    id: 'AUTO',
    label: 'Bana En Uygununu Seç',
    tag: 'Önerilen',
    description: 'Yapay zeka ürününüze en uygun reklam düzenini otomatik seçer.',
    imageStyleHint: 'Balanced commercial advertising lighting, pristine product staging, high visual appeal.',
    videoFormatHint: 'AUTO',
  },
  {
    id: 'PRODUCT_HERO',
    label: 'Modern ve Temiz',
    description: 'Ürünü net ışık ve canlı detaylarla sahnenin ana odak noktası yapar.',
    imageStyleHint: 'Ultra-clean commercial studio product photography, pristine reflections, 35mm macro sharpness.',
    videoFormatHint: 'FAST_SALES',
  },
  {
    id: 'REAL_USAGE',
    label: 'Sıcak ve Samimi',
    description: 'Ürünün doğal ortamında kullanım anını ve sahadaki faydasını gösterir.',
    imageStyleHint: 'Authentic commercial in-context product usage, realistic environment, natural lighting.',
    videoFormatHint: 'PRODUCT_USAGE',
  },
  {
    id: 'PREMIUM',
    label: 'Şık ve Premium',
    description: 'Ağırbaşlı ışık ve seçkin tasarım ile güçlü bir marka duruşu sağlar.',
    imageStyleHint: 'High-end luxury commercial lighting, architectural depth, elegant restrained palette.',
    videoFormatHint: 'PREMIUM',
  },
  {
    id: 'DYNAMIC_OFFER',
    label: 'Çarpıcı ve Dikkat Çekici',
    description: 'Fiyatı ve teklifi öne çıkararak hızlı geri dönüş hedefler.',
    imageStyleHint: 'Dynamic high-contrast commercial layout, punchy lighting, bold focal subject.',
    videoFormatHint: 'FAST_SALES',
  },
]

export type ImageFormatV2 = 'SQUARE_1_1' | 'STORY_9_16' | 'PORTRAIT_4_5'

export const IMAGE_FORMATS_V2: {
  id: ImageFormatV2
  label: string
  aspect: '1:1' | '9:16' | '4:5'
  width: number
  height: number
  hint: string
}[] = [
  { id: 'SQUARE_1_1', label: 'WhatsApp Kare Reklam', aspect: '1:1', width: 1080, height: 1080, hint: 'Kare 1:1 · WhatsApp ve Instagram kare gönderi' },
  { id: 'STORY_9_16', label: 'Instagram Hikâyesi', aspect: '9:16', width: 1080, height: 1920, hint: 'Dikey 9:16 · WhatsApp Durum için de uygun' },
  { id: 'PORTRAIT_4_5', label: 'Instagram Gönderisi', aspect: '4:5', width: 1080, height: 1350, hint: 'Dikey akış 4:5' },
]

export type VideoFormatV2 = 'STORY_9_16'

export const VIDEO_FORMATS_V2: {
  id: VideoFormatV2
  label: string
  aspect: '9:16'
  width: number
  height: number
  durationSeconds: number
  hint: string
}[] = [
  { id: 'STORY_9_16', label: 'Dikey Reklam Videosu', aspect: '9:16', width: 720, height: 1280, durationSeconds: 8, hint: '8 saniye çekim + 2 saniye marka kapanışı = 10 saniye final' },
]

export type CreativePlanV2 = {
  source?: 'AI' | 'DETERMINISTIC_FALLBACK'
  objective: CampaignObjective
  creative_style: CreativeStylePreset
  scene: {
    environment: string
    human_presence: 'none' | 'actor' | 'hands_only'
    subject: string
    product_interaction: string
    composition: string
    lighting: string
    camera_feel: string
    background: string
  }
  copy: {
    headline: string
    supporting_line: string
    cta: string
    price_tag?: string
    discount_badge?: string
  }
  layout: {
    text_safe_zone: 'top_third' | 'bottom_third' | 'side_margin'
    logo_position: 'top_left' | 'top_right' | 'top_center'
    product_safe_zone: 'center' | 'bottom_two_thirds'
  }
  negative_constraints: string[]
  voiceover_text?: string
}

export type StructuredCampaignCopy = {
  price?: string | null
  oldPrice?: string | null
  offer?: string | null
  dateRange?: string | null
  cta?: string | null
}
