export type CreativeStyleMode =
  | 'SMART_CAMPAIGN'
  | 'SHOWSTOPPER_CAMPAIGN'
  | 'REAL_LIFE_CAMPAIGN'
  | 'PREMIUM_SHOWCASE'

export interface StyleModeItem {
  id: CreativeStyleMode
  label: string
  description: string
  badge?: string
  previewUrl: string
}

export const STYLE_MODES: readonly StyleModeItem[] = [
  {
    id: 'SMART_CAMPAIGN',
    label: 'Akıllı Kampanya',
    description: 'AI marka ve sektöre en uygun reklam hiyerarşisini otomatik seçer.',
    badge: 'Varsayılan',
    previewUrl: 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/creatives/public-assets/style-previews/chatgpt_ref_01_akilli_kampanya.png',
  },
  {
    id: 'SHOWSTOPPER_CAMPAIGN',
    label: 'Gösterişli Kampanya',
    description: 'Büyük kabartmalı başlık, zengin katmanlar, ürün odağı ve dikkat çekici CTA.',
    previewUrl: 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/creatives/public-assets/style-previews/chatgpt_ref_02_gosterisli_vitrin.png',
  },
  {
    id: 'REAL_LIFE_CAMPAIGN',
    label: 'Gerçek Kullanım',
    description: 'İşletme sahibi veya saha uzmanı ile ürünün gerçek kullanım anı.',
    previewUrl: 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/creatives/public-assets/style-previews/chatgpt_ref_03_gercek_kullanim.png',
  },
  {
    id: 'PREMIUM_SHOWCASE',
    label: 'Premium Vitrin',
    description: 'Sinematik ışık, derinlik ve prestijli yüzeylerde minimalist ürün sunumu.',
    previewUrl: 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/creatives/public-assets/style-previews/chatgpt_ref_04_premium_vitrin.png',
  },
] as const

export function normalizeStyleMode(value: unknown): CreativeStyleMode {
  if (value === 'SHOWSTOPPER_CAMPAIGN' || value === 'grand_campaign' || value === 'showy' || value === 'bold_spectacle') {
    return 'SHOWSTOPPER_CAMPAIGN'
  }
  if (value === 'REAL_LIFE_CAMPAIGN' || value === 'real_life' || value === 'human' || value === 'in_use') {
    return 'REAL_LIFE_CAMPAIGN'
  }
  if (value === 'PREMIUM_SHOWCASE' || value === 'professional' || value === 'balanced_modern' || value === 'minimal' || value === 'showcase') {
    return 'PREMIUM_SHOWCASE'
  }
  // Default is SMART_CAMPAIGN (Akıllı Kampanya — Varsayılan)
  return 'SMART_CAMPAIGN'
}

export function styleModeDirective(value: unknown): string {
  const mode = normalizeStyleMode(value)
  let direction = ''

  if (mode === 'SHOWSTOPPER_CAMPAIGN') {
    direction = `Showstopper Grand Commercial Campaign (FIRST-CLASS, HIGH-ENERGY ADVERTISING BILLBOARD):
- CREATIVE RESET & BOLD ASYMMETRIC COMPOSITION: Do NOT replicate, reuse or decorate an ordinary product catalog photo or simple layout. Completely redesign the visual architecture from scratch with a bold asymmetric composition, heroic camera perspective, dynamic graphic depth layers, and high-energy commercial impact.
- GIANT ADVERTISING TYPOGRAPHY: Massive, confident commercial headline hierarchy that commands immediate attention and stops social media scrolling.
- MONUMENTAL PRODUCT HERO PRESENTATION: The product or service is presented with grand, heroic scale, dynamic angle, and monumental depth (occupying 60-70% visual share).
- DRAMATIC COMMERCIAL LIGHTING & DEPTH: Cinematic lighting, deep dimensional contrast, and rich brand palette accents. Controlled atmospheric lighting, mist, or dynamic rays where commercially impactful.
- DOMINANT PRIMARY CTA: One massive, high-contrast primary call-to-action button that strongly anchors the conversion focus.
- 2–4 SUBSTANTIAL, HIGHLY LEGIBLE ACTION CARDS: Meaningful, large, easy-to-read commercial action areas or workflow capability cards embedded as visible design elements of the composition (NOT tiny icon badges).
  * Mesajify: [Excel Yükle], [Hedef Kitle Seç], [Kampanya Oluştur], [Hemen Gönder] as bold, clearly readable SaaS action cards.
  * Bofe: [16L Geniş Depo], [Şarjlı Lityum Akü], [Ayarlanabilir Pirinç Nozül] as substantial agricultural capability cards.
  * Ayvazoğlu: [Toptan Fiyat Teklifi], [Mimari Katalog İste], [Şantiye Adrese Tedarik] as high-impact architectural service areas.
- NEVER a plain, quiet, minimalist catalog photo, never a brick on a plain pallet, and never an ordinary phone on a desk. Must have the scale, energy, polish, and punch of a world-class advertising agency launch campaign.`
  } else if (mode === 'REAL_LIFE_CAMPAIGN') {
    direction = 'Authentic Real-Life Commercial: Trust and authentic human experience. A natural human subject realistically interacting with the product or software (e.g. business owner or founder managing WhatsApp campaigns on a mobile smartphone or tablet in an authentic cafe/store; agronomist or farmer using the agricultural equipment in an orchard or greenhouse; master mason or contractor checking brickwork on site with safety helmet). Natural ergonomic body posture, credible eye gaze, authentic hand interaction. Natural daylight, realistic depth, zero artificial stock photo feel.'
  } else if (mode === 'PREMIUM_SHOWCASE') {
    direction = 'Premium Showcase Commercial: Prestige, quiet luxury, and high brand perception. Sophisticated minimalist composition, exquisite typography, refined material surfaces, architectural directional lighting, and generous negative space (breathing room). Elegant, readable CTA. Avoid placing every product on a generic stone or basalt plinth; adapt staging to the product: architectural magazine editorial quality for building materials, refined industrial macro craftsmanship for technical hardware, ultra-thin borderless glass slate in an architectural studio for software.'
  } else {
    // SMART_CAMPAIGN (default)
    direction = 'Smart Adaptive Commercial Campaign: Conversion and direct sales focused. Clean, highly readable, benefit-driven product presentation. Strong headline, verified benefit, distinct mobile-readable CTA button. For software, clean interface presentation with 1-2 verified workflow pills (original aspect ratio as a flat, front-facing panel or sleek tablet); for hardware, prominent product clarity and clear purchase action. No generic templates, no cluttered badges.'
  }

  return `${direction}
The explicit user design request takes precedence over this style direction. Brand color roles, canonical product/logo identity, and factual integrity are mandatory in every style.
STRICT COMMERCIAL CLAIM TRUTHFULNESS: Absolutely NEVER invent or include unverified claims: NO '3 gün içinde teslim', NO 'yüksek dönüşüm gücü', NO 'kesintisiz performans', NO 'kurumsal güvenlik altyapısı', NO unverified phone numbers or fake contact channels, NO unverified warranties, NO false discounts, and NO fabricated technical certifications (TSE/ISO). If a fact is not verified in the brand or product profile, omit it completely. Preserve supplied visible copy literally. Never print internal field names, JSON keys, style mode names, variation names, or prompt/scene direction notes on the artwork.`
}
