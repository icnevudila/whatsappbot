/**
 * MESAJIFY CREATIVE STUDIO — COMMERCIAL POSTER GRAMMAR V1
 *
 * Implements layout-hierarchy constraints and spatial reading paths for commercial posters.
 * IMPORTANT:
 * - COMMERCIAL_GRAMMAR controls layout hierarchy only.
 * - BRAND_KIT controls visual identity (palette, typography, logo, tone) and ALWAYS has higher priority than layout grammar.
 * - ZERO hardcoded company names: Automatic routing uses generic product/sector/category/brief signals.
 * - ZERO invented claims: Only explicit user input and verified facts are permitted.
 */

export type CommercialGrammarId =
  | 'PRODUCT_SALES_POSTER'
  | 'PREMIUM_PRODUCT_HERO'
  | 'RETAIL_BROCHURE'
  | 'MATERIAL_COMMERCE'
  | 'DIGITAL_PRODUCT_HERO'
  | 'FOOD_COMMERCE'

export interface CommercialGrammarDefinition {
  id: CommercialGrammarId
  name: string
  bestFor: string
  layoutHierarchy: {
    spatialReadingPath: string
    heroProductArea: string
    headlineScaleAndPosition: string
    offerBlockStructure: string
    ctaPlacement: string
    benefitCalloutsRule: string
    informationDensity: 'minimal' | 'focused' | 'dense_commercial'
  }
  compositionDirectives: string[]
  negativeLayoutRules: string[]
}

export const COMMERCIAL_POSTER_GRAMMARS: Record<CommercialGrammarId, CommercialGrammarDefinition> = {
  PRODUCT_SALES_POSTER: {
    id: 'PRODUCT_SALES_POSTER',
    name: 'Ürün Satış Afişi (Product Sales Poster)',
    bestFor: 'Tarımsal ekipmanlar, elektronik, paketli mallar, otomotiv parçaları, fiziksel perakende',
    layoutHierarchy: {
      spatialReadingPath: 'Vertical 4-Zone: [1. Brand Header] -> [2. Dominant Hero Product] -> [3. Headline & Offer Capsule] -> [4. Primary CTA Button]',
      heroProductArea: '45-65% visual importance. Undisputed commercial hero in razor-sharp focus.',
      headlineScaleAndPosition: 'Ultra-bold high-impact commercial headline, high contrast against background, mobile-readable.',
      offerBlockStructure: 'Sleek rounded pill badge or structural price box in brand accent color. Exact verified price/discount only.',
      ctaPlacement: 'Full-width or prominent centered pill button at bottom with directional arrow.',
      benefitCalloutsRule: '2-4 concise, factual benefit points with clean minimal icons (only verified specs).',
      informationDensity: 'focused',
    },
    compositionDirectives: [
      'POSTER GRAMMAR: PRODUCT_SALES_POSTER (Commercial sales hierarchy)',
      '- Hero product occupies 45-65% canvas area with crisp contact shadows and ambient occlusion.',
      '- Product is NEVER visually buried or overshadowed by people, nature, or background scenery.',
      '- Clear commercial reading path: Brand identity at top -> Hero product center -> Bold headline & price tag -> Clear CTA button.',
      '- Strict layout discipline: Generous padding, high contrast against backdrop, zero unverified badges.',
    ],
    negativeLayoutRules: [
      'no lifestyle-dominated framing where background or person overpowers the product',
      'no tiny product in distant background',
      'no human model stealing focus from the hero product',
      'no random floating geometric shapes or 3D spheres',
    ],
  },

  PREMIUM_PRODUCT_HERO: {
    id: 'PREMIUM_PRODUCT_HERO',
    name: 'Seçkin Ürün Vitrini (Premium Product Hero)',
    bestFor: 'Lüks ürünler, kozmetik, mobilya, seçkin mimari ürünler, mücevher, parfüm',
    layoutHierarchy: {
      spatialReadingPath: 'Centered Swiss / Editorial: [1. Minimal Brand Mark] -> [2. Sculptural Hero Product on Pedestal] -> [3. Restrained Headline] -> [4. Elegant Accent CTA]',
      heroProductArea: '50-65% visual area. Masterful directional lighting revealing tactile craftsmanship.',
      headlineScaleAndPosition: 'Refined, elegant typography with generous kerning and ample premium negative space.',
      offerBlockStructure: 'Minimal, understated price/offer text or slender hairline accent line. No loud supermarket badges.',
      ctaPlacement: 'Sleek, refined pill or underline CTA button maintaining luxurious breathing room.',
      benefitCalloutsRule: 'Maximum 1-2 subtle craftsmanship or material notes.',
      informationDensity: 'minimal',
    },
    compositionDirectives: [
      'POSTER GRAMMAR: PREMIUM_PRODUCT_HERO (Luxury restraint & material perfection)',
      '- Product is the sculptural hero staged in pristine architectural/studio space with premium whitespace.',
      '- Lighting physics: Controlled specular highlights, rich authentic shadows, subtle edge rim light.',
      '- Restrained typography hierarchy: Headline + single concise supporting line + clean CTA. Zero clutter.',
      '- No loud promotional stickers, no supermarket starbursts, no unnecessary badge clutter.',
    ],
    negativeLayoutRules: [
      'no supermarket flyer graphics',
      'no tacky promotional stickers',
      'no cheap discount badges',
      'no cluttering with excessive badges',
    ],
  },

  RETAIL_BROCHURE: {
    id: 'RETAIL_BROCHURE',
    name: 'Perakende & Fırsat Kataloğu (Retail Brochure)',
    bestFor: 'Kampanyalı satışlar, toptan alım, çoklu ürün teklifleri, perakende fırsatları',
    layoutHierarchy: {
      spatialReadingPath: 'Dynamic Retail Grid: [1. Brand & Campaign Header] -> [2. Hero Product Display] -> [3. Prominent Price Lockup] -> [4. Tiered Value Strip] -> [5. High-Action CTA]',
      heroProductArea: '40-50% canvas area. Clear commercial display with high contrast.',
      headlineScaleAndPosition: 'Heavy condensed display headline delivering immediate promotional urgency.',
      offerBlockStructure: 'Prominent price lockup: Current price large & bold, optional crossed-out old price, clear discount tag.',
      ctaPlacement: 'High-visibility contrasting action button with urgent commercial clarity.',
      benefitCalloutsRule: 'Structured horizontal value bar with 2-3 quick delivery/warranty/order facts.',
      informationDensity: 'dense_commercial',
    },
    compositionDirectives: [
      'POSTER GRAMMAR: RETAIL_BROCHURE (High-conversion retail clarity)',
      '- Hero product remains completely recognizable and central; price hierarchy is crystal clear.',
      '- High-contrast offer block: Clear numeric price, percentage savings tag if verified.',
      '- Highly readable on mobile screens (at 300-400px width), avoiding micro-text confusion.',
      '- Organized modern Swiss grid structure: NEVER degenerate into messy supermarket junk mail.',
    ],
    negativeLayoutRules: [
      'no cluttered junk mail look',
      'no comic speech bubbles',
      'no overlapping unreadable text',
      'no blurry compression artifacts',
    ],
  },

  MATERIAL_COMMERCE: {
    id: 'MATERIAL_COMMERCE',
    name: 'Yapı & Malzeme Ticareti (Material Commerce)',
    bestFor: 'Tuğla, klinker, çimento, seramik, mermer, çelik, yalıtım, endüstriyel yapı malzemeleri',
    layoutHierarchy: {
      spatialReadingPath: 'Architectural Monolith: [1. Structural Brand Header] -> [2. Dominant Material Specimen on Plinth] -> [3. Architectural Headline & Specs] -> [4. Catalog / Quote CTA]',
      heroProductArea: '45-55% visual area. Authentic tactile texture (grooves, pores, grain) clearly visible.',
      headlineScaleAndPosition: 'Architectural Grotesk or clean geometric sans-serif, structural alignment.',
      offerBlockStructure: 'Technical spec pill or unit price tag (e.g. 480 TL/m² • Proje İndirimi).',
      ctaPlacement: 'Authoritative rectangular-rounded pill button (e.g. Kataloğu İndir, Fiyat Teklifi Al).',
      benefitCalloutsRule: 'Factual technical specifications (e.g. dona dayanıklı, UV korumalı, klinker kil).',
      informationDensity: 'focused',
    },
    compositionDirectives: [
      'POSTER GRAMMAR: MATERIAL_COMMERCE (Architectural solidity & material texture)',
      '- Hero building material unit/block is prominently grounded on an authentic architectural plinth.',
      '- Raking architectural lighting revealing authentic surface depth, perforation cavities, and material grain.',
      '- Supporting context: Contemporary construction site or completed architectural facade kept softly in background.',
      '- Corporate authority: Disciplined layout, structural stability, clear engineering pride.',
    ],
    negativeLayoutRules: [
      'no worker dominating over the material',
      'no tiny material prop placed on a distant table',
      'no crooked or melting bricks',
      'no cartoon miniature 3D houses',
    ],
  },

  DIGITAL_PRODUCT_HERO: {
    id: 'DIGITAL_PRODUCT_HERO',
    name: 'Dijital Ürün & Arayüz (Digital Product Hero)',
    bestFor: 'SaaS, bulut yazılımları, mobil uygulamalar, yönetim panelleri, online platformlar',
    layoutHierarchy: {
      spatialReadingPath: 'Modern Tech Grid: [1. Tech Brand Header] -> [2. Real Dashboard/Screen Staging] -> [3. Punchy Value Proposition Headline] -> [4. Metric Pill Cards] -> [5. Action CTA]',
      heroProductArea: '45-60% canvas area. The REAL software interface on phone/laptop/tablet is the undisputed hero.',
      headlineScaleAndPosition: 'Clean, bold modern tech sans-serif (Inter / SF Pro feel) with razor-sharp kerning.',
      offerBlockStructure: 'Sleek dark-mode capsule badge (e.g. 14 Gün Ücretsiz Deneyin or 690 TL/ay).',
      ctaPlacement: 'Vibrant glowing accent pill button with action arrow (e.g. Ücretsiz Başla →).',
      benefitCalloutsRule: 'Floating frosted glass telemetry cards displaying 1-2 authentic interface metrics.',
      informationDensity: 'focused',
    },
    compositionDirectives: [
      'POSTER GRAMMAR: DIGITAL_PRODUCT_HERO (Real interface clarity & SaaS modernism)',
      '- The REAL software interface displayed on a sleek modern device is the hero subject, NOT generic abstract art.',
      '- Glassmorphism & lighting: Dark graphite background, subtle screen glow, clean frosted glass metric cards.',
      '- Never let generic neon geometric laser grids overpower the software UI.',
      '- Clear, actionable value proposition and high-visibility CTA for instant conversion.',
    ],
    negativeLayoutRules: [
      'no abstract geometric neon art replacing the software UI',
      'no 1990s green Matrix binary code cascades',
      'no cartoon robot mascots with blinking antenna',
      'no generic meaningless floating gear icons',
    ],
  },

  FOOD_COMMERCE: {
    id: 'FOOD_COMMERCE',
    name: 'Gıda & Lezzet Vitrini (Food Commerce)',
    bestFor: 'Döner, kebap, burger, pizza, pide, restoran, kafe, fırın, paketli lezzetler, menü kampanyaları',
    layoutHierarchy: {
      spatialReadingPath: 'Appetizing Gastronomy Layout: [1. Warm Brand Header] -> [2. Mouth-Watering Dominant Food Hero] -> [3. Flavor Headline & Verified Deal] -> [4. Direct Order CTA]',
      heroProductArea: '50-65% visual dominance. Freshly prepared, sizzling, appetizing food texture in extreme close/macro focus.',
      headlineScaleAndPosition: 'Warm, bold, friendly commercial display typography evoking fresh culinary craft.',
      offerBlockStructure: 'Clear, mouth-watering menu deal tag (e.g. 2 Dürüm + Ayran = 320 TL or Özel Menü İndirimi).',
      ctaPlacement: 'High-contrast, appetizing pill button: "Sipariş Ver →", "Menüyü İncele →", "Hemen Gelsin →".',
      benefitCalloutsRule: 'Maximum 1-2 fresh culinary highlights (e.g. Taze Lavaş, Özel Sos, Odun Ateşinde).',
      informationDensity: 'focused',
    },
    compositionDirectives: [
      'POSTER GRAMMAR: FOOD_COMMERCE (Irresistible culinary desire & menu deal)',
      '- FOOD IS THE ABSOLUTE PRIMARY HERO: Juicy grilled meat, fresh herbs, toasted crust, rich sauce glisten.',
      '- Macro food texture clarity: Glistening vapor/steam, crisp charred edges, appetizing sauce droplets.',
      '- Staged on an authentic rustic slate, butcher cutting board, or clean restaurant table.',
      '- CHEF / INTERIOR ARE NEVER THE MAIN SUBJECT: Food must dominate >50% of the creative.',
      '- Offer and price are immediately readable, driving instant hunger and click-to-order impulse.',
    ],
    negativeLayoutRules: [
      'no chef or human model dominating the creative instead of the food',
      'no restaurant dining room or empty tables dominating over the meal',
      'no plastic or artificial-looking fake food props',
      'no unappetizing cold or grey food colors',
      'no cartoon food characters or clip-art vegetables',
    ],
  },
}

/**
 * Generic Automatic Routing:
 * Infers the ideal Commercial Poster Grammar based purely on product, category,
 * sector, description, and objective.
 *
 * CRITICAL CONTRACT:
 * - NO company-name conditions.
 * - Never branch on 'Bofe', 'Ayvazoğlu', 'Mesajify', or any specific business name.
 */
export function inferCommercialGrammar(params: {
  productName: string
  productDescription?: string | null
  category?: string | null
  sectorId?: string | null
  objective?: string | null
  stylePreset?: string | null
}): CommercialGrammarDefinition {
  const text = [
    params.productName,
    params.productDescription || '',
    params.category || '',
    params.sectorId || '',
    params.objective || '',
  ]
    .join(' ')
    .toLowerCase()

  const matchesKeyword = (kw: string) => {
    if (kw.length <= 3) {
      const regex = new RegExp(`(^|[^a-z0-9ğüşıöç])${kw}([^a-z0-9ğüşıöç]|$)`, 'i')
      return regex.test(text)
    }
    return text.includes(kw)
  }

  // 1. Food & Culinary (exclude furniture like 'yemek masası')
  const isFurniture = ['mobilya', 'yemek masası', 'sandalye', 'koltuk', 'dolap', 'sehpa'].some((kw) => text.includes(kw))
  const foodKeywords = [
    'döner', 'kebap', 'dürüm', 'burger', 'pizza', 'pide', 'lahmacun',
    'köfte', 'tavuk', 'et', 'yemek', 'tatlı', 'pasta', 'fırın', 'kahvaltı',
    'kahve', 'menü', 'restoran', 'lokanta', 'cafe', 'kafe', 'lezzet', 'gıda',
    'sos', 'ayran', 'patates', 'ızgara', 'öğün', 'porsiyon'
  ]
  if (!isFurniture && foodKeywords.some(matchesKeyword)) {
    return COMMERCIAL_POSTER_GRAMMARS.FOOD_COMMERCE
  }

  // 2. Construction & Building Materials
  const materialKeywords = [
    'tuğla', 'klinker', 'çimento', 'seramik', 'fayans', 'mermer', 'taş',
    'harç', 'yalıtım', 'izolasyon', 'cephe', 'kaplama', 'profil', 'çelik',
    'beton', 'inşaat', 'yapı malzemesi', 'çatı', 'kiremit', 'parke', 'granit'
  ]
  if (materialKeywords.some(matchesKeyword)) {
    return COMMERCIAL_POSTER_GRAMMARS.MATERIAL_COMMERCE
  }

  // 3. SaaS, Software & Digital Interface
  const digitalKeywords = [
    'saas', 'yazılım', 'api', 'bulut', 'cloud', 'crm', 'panel', 'dashboard',
    'otomasyon', 'entegrasyon', 'uygulama', 'app', 'web', 'platform',
    'veri', 'data', 'yapay zeka', 'bot', 'whatsapp api', 'dijital'
  ]
  if (digitalKeywords.some((kw) => text.includes(kw))) {
    return COMMERCIAL_POSTER_GRAMMARS.DIGITAL_PRODUCT_HERO
  }

  // 4. Retail Brochure / High-Promo Multi-Price Deals
  if (
    params.stylePreset === 'DYNAMIC_OFFER' ||
    params.objective === 'CAMPAIGN' ||
    text.includes('katalog') ||
    text.includes('broşür') ||
    text.includes('toptan indirim') ||
    text.includes('haftanın fırsatı')
  ) {
    return COMMERCIAL_POSTER_GRAMMARS.RETAIL_BROCHURE
  }

  // 5. Premium / Luxury Goods
  const luxuryKeywords = [
    'mücevher', 'takı', 'parfüm', 'kozmetik', 'lüks', 'luxury', 'saat',
    'mobilya', 'dekorasyon', 'koltuk', 'tasarım', 'özel seri', 'premium'
  ]
  if (
    params.stylePreset === 'PREMIUM' ||
    params.objective === 'BRAND_AWARENESS' ||
    luxuryKeywords.some((kw) => text.includes(kw))
  ) {
    return COMMERCIAL_POSTER_GRAMMARS.PREMIUM_PRODUCT_HERO
  }

  // 6. Default to Standard Physical Product Sales Poster
  return COMMERCIAL_POSTER_GRAMMARS.PRODUCT_SALES_POSTER
}
