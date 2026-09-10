export const CREATIVE_FORMATS = [
  { id: 'wa', label: 'WhatsApp kampanya', format: 'square', aspect: '1:1', hint: 'Kare · sohbette net durur' },
  { id: 'ig', label: 'Instagram kare', format: 'square', aspect: '1:1', hint: '1:1 akış' },
  { id: 'story', label: 'Instagram story', format: 'story', aspect: '9:16', hint: 'Dikey hikâye' },
  { id: 'feed', label: 'Genel sosyal medya', format: 'feed', aspect: '4:5', hint: 'Dikey akış' },
  { id: 'banner', label: 'Yatay banner', format: 'banner', aspect: '16:9', hint: 'Kapak / banner' },
] as const

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

export const TEXT_DENSITIES = [
  { id: 'low', label: 'Az' },
  { id: 'balanced', label: 'Dengeli' },
  { id: 'detailed', label: 'Detaylı' },
] as const

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
}

export type CreativePayload = CreativeSnapshot & {
  title?: string
  requestKey?: string
  generatedPrompt?: string | null
  originalPrompt?: string | null
  provider?: string | null
  model?: string | null
  attempts?: string[] | null
  cost?: { provider?: string; model?: string; imageCount: number } | null
}

export function formatToAspect(format: string): CreativeSnapshot['aspect'] {
  if (format === 'story') return '9:16'
  if (format === 'feed') return '4:5'
  if (format === 'banner') return '16:9'
  return '1:1'
}

export function titleFromBrief(brief: string): string {
  const clean = brief.replace(/\s+/g, ' ').trim()
  if (!clean) return 'Kampanya görseli'
  return clean.length > 180 ? clean.slice(0, 180) : clean
}
