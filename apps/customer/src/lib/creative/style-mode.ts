export type CreativeStyleMode =
  | 'SMART_CAMPAIGN'
  | 'SHOWSTOPPER_CAMPAIGN'
  | 'REAL_LIFE_CAMPAIGN'
  | 'PREMIUM_SHOWCASE'

export interface StyleModeExample {
  sector: string
  company: string
  image: string
  highlight: string
}

export interface StyleModeItem {
  id: CreativeStyleMode
  label: string
  description: string
  badge?: string
  heroPreview: string
  characteristics: string[]
  examples: StyleModeExample[]
}

export const STYLE_MODES: readonly StyleModeItem[] = [
  {
    id: 'SMART_CAMPAIGN',
    label: 'Akıllı Kampanya',
    description: 'AI marka ve sektöre en uygun reklam hiyerarşisini otomatik seçer.',
    badge: 'Varsayılan',
    heroPreview: '/style-previews/mesajify_smart.png',
    characteristics: [
      'Dengeli ticari reklam hiyerarşisi',
      'Net okunabilir başlık, alt metin ve CTA butonu',
      'Marka kimlik renkleri ve ürün odaklı kompozisyon',
    ],
    examples: [
      {
        sector: 'Yazılım & SaaS',
        company: 'Mesajify',
        image: '/style-previews/mesajify_smart.png',
        highlight: 'MacBook Pro, sol menülü web paneli ve net yeşil CTA',
      },
      {
        sector: 'Tarım & Ekipman',
        company: 'Bofe Tarım',
        image: '/style-previews/bofe_smart.png',
        highlight: 'Bahçe koruma vaadi, 16L şarjlı pompa ve marka paleti',
      },
      {
        sector: 'İnşaat & Yapı',
        company: 'Ayvazoğlu İnşaat',
        image: '/style-previews/ayvazoglu_smart.png',
        highlight: '3 günde teslimat garantisi, klinker tuğla ve toptan teklif',
      },
    ],
  },
  {
    id: 'SHOWSTOPPER_CAMPAIGN',
    label: 'Gösterişli Kampanya',
    description: 'Büyük kabartmalı başlık, zengin katmanlar, ürün odağı ve dikkat çekici CTA.',
    heroPreview: '/style-previews/mesajify_showstopper.png',
    characteristics: [
      'Geniş açılı ve yüksek kontrastlı ticari lansman afişi',
      'Büyük ve çarpıcı reklam tipografisi',
      'Yüksek dönüşüm odaklı teklif ve kampanya vurgusu',
    ],
    examples: [
      {
        sector: 'Yazılım & SaaS',
        company: 'Mesajify',
        image: '/style-previews/mesajify_showstopper.png',
        highlight: 'Büyük ve cesur tipografi, güçlü yeşil CTA ve ofis enerjisi',
      },
      {
        sector: 'Tarım & Ekipman',
        company: 'Bofe Tarım',
        image: '/style-previews/bofe_showstopper.png',
        highlight: 'Sezon indirimi afişi, yüksek basınç ve sağlam gövde vurgusu',
      },
      {
        sector: 'İnşaat & Yapı',
        company: 'Ayvazoğlu İnşaat',
        image: '/style-previews/ayvazoglu_showstopper.png',
        highlight: 'Fabrikadan doğrudan şantiyeye teslimat ve güçlü tuğla afişi',
      },
    ],
  },
  {
    id: 'REAL_LIFE_CAMPAIGN',
    label: 'Gerçek Kullanım',
    description: 'İşletme sahibi veya saha uzmanı ile ürünün gerçek kullanım anı.',
    heroPreview: '/style-previews/mesajify_real_life.png',
    characteristics: [
      'Doğal çalışma ortamında gerçek profesyonel kullanım',
      'Ürünü ve paneli kullanan güler yüzlü ekip veya saha uzmanı',
      'Yapaylıktan uzak, güven veren gerçekçi ortam aydınlatması',
    ],
    examples: [
      {
        sector: 'Yazılım & SaaS',
        company: 'Mesajify',
        image: '/style-previews/mesajify_real_life.png',
        highlight: 'Masada birlikte paneli inceleyen profesyonel iş ortakları',
      },
      {
        sector: 'Tarım & Ekipman',
        company: 'Bofe Tarım',
        image: '/style-previews/bofe_real_life.png',
        highlight: 'Tarlada ve bahçede doğal çiftçi kullanımı ve ergonomik duruş',
      },
      {
        sector: 'İnşaat & Yapı',
        company: 'Ayvazoğlu İnşaat',
        image: '/style-previews/ayvazoglu_real_life.png',
        highlight: 'Şantiyede mimar ve mühendis kontrolünde kaliteli tuğla uygulaması',
      },
    ],
  },
  {
    id: 'PREMIUM_SHOWCASE',
    label: 'Premium Vitrin',
    description: 'Sinematik ışık, derinlik ve prestijli yüzeylerde minimalist ürün sunumu.',
    heroPreview: '/style-previews/mesajify_premium.png',
    characteristics: [
      'Sinematik stüdyo veya zarif ofis ışığı',
      'Minimalist, ferah ve prestijli kurumsal B2B estetiği',
      'Gereksiz rozet veya çıkartmalardan arındırılmış temiz odak',
    ],
    examples: [
      {
        sector: 'Yazılım & SaaS',
        company: 'Mesajify',
        image: '/style-previews/mesajify_premium.png',
        highlight: 'Zarif Space Gray MacBook Pro, doğal ışık ve minimalist çalışma masası',
      },
      {
        sector: 'Tarım & Ekipman',
        company: 'Bofe Tarım',
        image: '/style-previews/bofe_premium.png',
        highlight: 'Stüdyo aydınlatması altında prestijli podyumda Bofe 16L vitrini',
      },
      {
        sector: 'İnşaat & Yapı',
        company: 'Ayvazoğlu İnşaat',
        image: '/style-previews/ayvazoglu_premium.png',
        highlight: 'Sıcak mimari gün batımı, dokusal tuğla bloğu ve kurumsal logo tabelası',
      },
    ],
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
    direction = 'Showstopper Grand Commercial Campaign: Commanding readable advertising typography, a strong asymmetric hierarchy and purposeful high-contrast poster composition. Dimensional treatment is optional and must serve the offering and explicit user direction. If verified pricing or an offer is supplied, make it legible without inventing extra badges. Use the canonical logo once as brand identification, not as a repeated oversized background prop. Do not add floating glass badges, neon beams, decorative icon ribbons or device perspectives by default. Impact comes from a clear message, disciplined spacing and confident composition.'
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
