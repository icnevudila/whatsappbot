export type CreativeStyleMode =
  | 'SMART_CAMPAIGN'
  | 'SHOWSTOPPER_CAMPAIGN'
  | 'REAL_LIFE_CAMPAIGN'
  | 'PREMIUM_SHOWCASE'

export const STYLE_MODES = [
  {
    id: 'SMART_CAMPAIGN',
    label: 'Akıllı Kampanya',
    description: 'AI marka ve sektöre en uygun reklam hiyerarşisini otomatik seçer.',
    badge: 'Varsayılan',
  },
  {
    id: 'SHOWSTOPPER_CAMPAIGN',
    label: 'Gösterişli Kampanya',
    description: 'Büyük 3D/kabartmalı başlık, zengin katmanlar, ürün odağı ve dikkat çekici CTA.',
  },
  {
    id: 'REAL_LIFE_CAMPAIGN',
    label: 'Gerçek Kullanım',
    description: 'İşletme sahibi veya saha uzmanı ile ürünün gerçek kullanım anı.',
  },
  {
    id: 'PREMIUM_SHOWCASE',
    label: 'Premium Vitrin',
    description: 'Sinematik ışık, derinlik ve prestijli yüzeylerde minimalist ürün sunumu.',
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
    direction = 'Showstopper Grand Commercial Campaign: Commanding bold advertising typography with dimensional 3D or sculpted title presence, rich multi-layered commercial poster staging with deep background atmosphere and cinematic lighting contrast. Make verified promotional pricing, offer details or discount percentages unmistakably prominent. Include tasteful floating glass badges, glowing dimensional icon accents, or feature ribbons where applicable. Cohesive multi-product or multi-angle layout when relevant. Never produce flat clipart or supermarket coupon chaos; richness comes from dimensional typography, spatial depth, and high-impact commercial polish.'
  } else if (mode === 'REAL_LIFE_CAMPAIGN') {
    direction = 'Authentic Real-Life Commercial: A natural, authentic human subject interacting realistically with the product or software service in an authentic real-world environment (e.g. female or male business owner managing customer orders on mobile/laptop in a cafe or store for SaaS; agronomist or farmer using the agricultural equipment in an orchard or greenhouse; architect or contractor reviewing plans on a modern build site). The person must look natural, credible, and professionally engaged. The authentic product or software interface must remain distinct and physically accurate, not obscured. Balanced advertising composition with clean mobile-readable headline and CTA.'
  } else if (mode === 'PREMIUM_SHOWCASE') {
    direction = 'Premium Showcase Commercial: Clean Professional B2B Commercial Visual: Natural daylight or cinematic studio directional lighting, sophisticated minimalist composition, elegant typography, generous breathing room, trustworthy B2B corporate aesthetic without aggressive neon or excessive badge clutter. Balanced lighting with authentic workplace realism. Hero product or interface positioned with prestige on an elegant surface.'
  } else {
    // SMART_CAMPAIGN (default)
    direction = 'Smart Adaptive Commercial Campaign: Tailor the composition to the supplied brand and offering. Create impact through a clear focal point, readable typography, purposeful contrast and generous breathing room. For software, preserve the authentic interface at its original aspect ratio as a flat, front-facing panel; hardware is optional and secondary. Do not invent message bubbles, notification cards, usage metrics or features. Avoid generic neon aura, decorative glass cards and oversized devices. Use one clear CTA and a natural business context only when it serves the message.'
  }

  return `${direction}\nThe explicit user design request takes precedence over this style direction. Brand color roles, canonical product/logo identity and factual integrity are mandatory in every style. Preserve supplied visible copy literally. Never print internal field names, JSON keys, style mode names, variation names, or prompt/scene direction notes on the artwork.`
}
