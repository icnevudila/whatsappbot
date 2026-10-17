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
    direction = 'Showstopper Grand Commercial Campaign: Powerful advertising idea, bold composition, and dramatic, sector-tailored product storytelling. Impact stems from confident typographic hierarchy, authentic material realism, and purposeful contrast—NOT from repetitive neon glow, excessive lens flare, dark floating cards, or plastic 3D clichés. Depending on the product and sector, employ compelling creative treatments: Cinematic Product Hero (monumental scale, dramatic commercial studio lighting), Bold Editorial (commanding headlines, asymmetric high-impact layout), Premium Material Depth (tangible textures, natural studio shadows, realistic surfaces), or Dynamic Commercial Energy. The primary CTA must remain prominent, visible, and high-converting. Up to 1-2 authentic supporting action chips or benefit indicators may be layered if supported by the product context, but must never clutter or overshadow the hero offering. Logo and product identity remain strictly faithful to references.'
  } else if (mode === 'REAL_LIFE_CAMPAIGN') {
    direction = 'Authentic Real-Life Commercial: A natural, authentic human subject interacting realistically with the product or software service in an authentic real-world environment (e.g. female or male business owner managing customer orders on mobile/laptop in a cafe or store for SaaS; agronomist or farmer using the agricultural equipment in an orchard or greenhouse; architect or contractor reviewing plans on a modern build site). The person must look natural, credible, and professionally engaged. The authentic product or software interface must remain distinct and physically accurate, not obscured. Balanced advertising composition with clean mobile-readable headline and CTA.'
  } else if (mode === 'PREMIUM_SHOWCASE') {
    direction = 'Premium Showcase Commercial: Clean Professional B2B Commercial Visual: Sophisticated minimalist composition, elegant typography, generous breathing room, and authoritative prestige without aggressive neon or excessive badge clutter. Depending on the brand and sector, adapt staging dynamically: high-end showroom, authentic precision production facility, sculpted studio surface, refined product macro detail, or pristine architectural setting. Avoid forcing every product onto a stone plinth. Balanced natural daylight or cinematic directional lighting with authentic realism. Hero product or interface positioned with prestige on an elegant surface.'
  } else {
    // SMART_CAMPAIGN (default)
    direction = 'Smart Adaptive Commercial Campaign: Tailor the composition to the supplied brand and offering. Create impact through a clear focal point, readable typography, purposeful contrast and generous breathing room. For software, preserve the authentic interface at its original aspect ratio as a flat, front-facing panel; hardware is optional and secondary. Do not invent message bubbles, notification cards, usage metrics or features. Avoid generic neon aura, decorative glass cards and oversized devices. Use one clear CTA and a natural business context only when it serves the message.'
  }

  return `${direction}\nThe explicit user design request takes precedence over this style direction. Brand color roles, canonical product/logo identity, and factual integrity are mandatory in every style. Never invent unverified commercial claims, free trials, certifications (TSE/ISO), percentage gains, or false pricing unless explicitly verified. Preserve supplied visible copy literally. Never print internal field names, JSON keys, style mode names, variation names, or prompt/scene direction notes on the artwork.`
}
