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
    label: 'Marka & Ürün Tanıtımı',
    description: 'Logo, marka renkleri ve bilgilerinizle özgün tanıtım. Referans görsel isteğe bağlı.',
    badge: 'Varsayılan',
    previewUrl: '/style-previews/brand-kit-introduction.png',
  },
  {
    id: 'SHOWSTOPPER_CAMPAIGN',
    label: 'Gösterişli Kampanya',
    description: 'Cesur kampanya tipografisi, dinamik ürün sunumu, teklif vurguları ve güçlü aksiyon alanları.',
    previewUrl: '/style-previews/brand-kit-campaign.png',
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
    direction = `Showstopper Grand Commercial Campaign (HIGH-END EDITORIAL & 3D ARCHITECTURAL POSTER):
- EDITORIAL CAMPAIGN POSTER ARCHITECTURE (Inspired by Apple, Stripe, and Veriburada):
  * Upper Canvas (~30-35%): Clean, spacious negative space (crisp white, soft ambient studio gradient, or deep brand tone) featuring the authentic brand logo, a commanding bold modern headline ending with a period (.), and exactly one clean supporting subhead value proposition.
  * Central Hero (~50%): High-concept 3D / architectural / cinematic environmental staging. The authentic product or software is the focal hero with magnificent depth, dramatic specular highlights, and natural contact shadows.
  * Lower Canvas (~15-20%): Conversion anchor featuring a sleek rounded pill CTA button with subtle gradient/glass shine and an arrow ([ Hemen Keşfet → ] or [ Ücretsiz Başlayın → ]), accompanied by the clean website domain at the bottom.
- DRAMATIC COMMERCIAL LIGHTING & DEPTH: Cinematic lighting, deep dimensional contrast, and rich brand palette accents. Controlled atmospheric lighting, mist, or subtle glowing communication arcs where commercially impactful.
- ZERO VISUAL CLUTTER: Strictly NO boxed 3-badge icon stacks, NO four-card feature grids, NO supermarket discount stickers, NO starburst badges, and NO coupon borders. Commercial power comes from architectural elegance, pristine negative space, and commanding typography.
- NEVER a plain, quiet, flat catalog photo, never a brick on a plain pallet, and never an ordinary phone on a desk. Must have the scale, energy, polish, and punch of a world-class advertising agency launch campaign.`
  } else if (mode === 'REAL_LIFE_CAMPAIGN') {
    direction = 'Authentic Real-Life Commercial: Trust and authentic human experience. A natural human subject realistically interacting with the product or software (e.g. business owner or founder managing WhatsApp campaigns on a mobile smartphone or tablet in an authentic cafe/store; agronomist or farmer using the agricultural equipment in an orchard or greenhouse; master mason or contractor checking brickwork on site with safety helmet). Natural ergonomic body posture, credible eye gaze, authentic hand interaction. Natural daylight, realistic depth, zero artificial stock photo feel. Clean editorial headline with period, single value subhead, sleek rounded CTA pill.'
  } else if (mode === 'PREMIUM_SHOWCASE') {
    direction = 'Premium Showcase Commercial: Prestige, quiet luxury, and high brand perception. Sophisticated minimalist composition, exquisite typography, refined material surfaces, architectural directional lighting, and generous negative space (breathing room). Elegant, readable CTA. Avoid placing every product on a generic stone or basalt plinth; adapt staging to the product: architectural magazine editorial quality for building materials, refined industrial macro craftsmanship for technical hardware, ultra-thin borderless glass slate in an architectural studio for software.'
  } else {
    // SMART_CAMPAIGN (default)
    direction = 'Smart Adaptive Commercial Campaign: Conversion and direct sales focused modern campaign poster. Clean negative space, pristine lighting, verified product/offering seamlessly integrated into an authentic environment or clean modern studio. Strong headline, verified benefit, distinct mobile-readable CTA button. For software, clean interface presentation with 1-2 verified workflow pills (original aspect ratio as a flat, front-facing panel or sleek tablet); for hardware, prominent product clarity and clear purchase action. No generic templates, no cluttered badges.'
  }

  return `${direction}
The explicit user design request takes precedence over this style direction. Brand color roles, canonical product/logo identity, and factual integrity are mandatory in every style.
STRICT COMMERCIAL CLAIM TRUTHFULNESS: Absolutely NEVER invent or include unverified claims: NO '3 gün içinde teslim', NO 'yüksek dönüşüm gücü', NO 'kesintisiz performans', NO 'kurumsal güvenlik altyapısı', NO unverified phone numbers or fake contact channels, NO unverified warranties, NO false discounts, and NO fabricated technical certifications (TSE/ISO). If a fact is not verified in the brand or product profile, omit it completely. Preserve supplied visible copy literally. Never print internal field names, JSON keys, style mode names, variation names, or prompt/scene direction notes on the artwork.`
}
