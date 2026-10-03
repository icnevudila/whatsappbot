export type MediaType = 'IMAGE' | 'VIDEO'

export type CampaignObjective =
  | 'PRODUCT_INTRO'
  | 'SALES_OFFER'
  | 'NEW_PRODUCT'
  | 'BRAND_AWARENESS'
  | 'CAMPAIGN'

export const CAMPAIGN_OBJECTIVES: { id: CampaignObjective; label: string; description: string }[] = [
  { id: 'PRODUCT_INTRO', label: 'Ürün Tanıtımı', description: 'Ürünün temel özellikleri, malzeme kalitesi ve kullanım faydası' },
  { id: 'SALES_OFFER', label: 'Satış & Fırsat', description: 'Dönemsel indirim, özel fiyat veya toptan avantaj odaklı duyuru' },
  { id: 'NEW_PRODUCT', label: 'Yeni Ürün Duyurusu', description: 'Pazara yeni çıkan inovasyon veya yeni sezon lansmanı' },
  { id: 'BRAND_AWARENESS', label: 'Marka Prestiji', description: 'Kurumsal güç, üretim kapasitesi ve sektördeki güvenilir duruş' },
  { id: 'CAMPAIGN', label: 'Dönemsel Kampanya', description: 'Sezonluk veya sınırlı süreli özel kampanya kurgusu' },
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
    label: 'Akıllı Seçim (Otomatik)',
    tag: 'Önerilen',
    description: 'Yapay zeka ürünün sektörüne ve hedef kitleye en uygun ticari dili belirler.',
    imageStyleHint: 'Balanced commercial advertising lighting, pristine product staging, high visual appeal.',
    videoFormatHint: 'AUTO',
  },
  {
    id: 'PRODUCT_HERO',
    label: 'Ürün Vitrini (Hero)',
    description: 'Sadece ürüne odaklanır; malzeme dokusu, renkler ve detaylar ön plandadır.',
    imageStyleHint: 'Ultra-clean commercial studio product photography, pristine reflections, 35mm macro sharpness.',
    videoFormatHint: 'FAST_SALES',
  },
  {
    id: 'REAL_USAGE',
    label: 'Saha & Gerçek Kullanım',
    description: 'Ürünün gerçek hayatta doğal ortamında kullanım anını ve işlevini gösterir.',
    imageStyleHint: 'Authentic commercial in-context product usage, realistic environment, natural lighting.',
    videoFormatHint: 'PRODUCT_USAGE',
  },
  {
    id: 'PREMIUM',
    label: 'Kurumsal & Prestij',
    description: 'Tesis, mimari estetik veya seçkin stüdyoda ağırbaşlı marka duruşu.',
    imageStyleHint: 'High-end luxury commercial lighting, architectural depth, elegant restrained palette.',
    videoFormatHint: 'PREMIUM',
  },
  {
    id: 'DYNAMIC_OFFER',
    label: 'Dinamik & Fırsat Odaklı',
    description: 'Hızlı tempolu, dikkat çekici ve doğrudan dönüşüm sağlayan kampanya dili.',
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
  { id: 'SQUARE_1_1', label: 'Kare 1:1', aspect: '1:1', width: 1080, height: 1080, hint: 'WhatsApp kataloğu, Instagram gönderisi' },
  { id: 'STORY_9_16', label: 'Story / Reels 9:16', aspect: '9:16', width: 1080, height: 1920, hint: 'WhatsApp Durum, Instagram Story' },
  { id: 'PORTRAIT_4_5', label: 'Dikey Post 4:5', aspect: '4:5', width: 1080, height: 1350, hint: 'Sosyal medya akışında en geniş dikey afiş' },
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
  { id: 'STORY_9_16', label: 'Reels / Durum 9:16', aspect: '9:16', width: 720, height: 1280, durationSeconds: 8, hint: '9:16 Dikey sinematik reels reklamı (~8 sn)' },
]

export type CreativePlanV2 = {
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
