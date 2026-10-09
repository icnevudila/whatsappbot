import type { CreativeSnapshot, TemplateFamily } from './types'
import { CREATIVE_FORMATS, CREATIVE_STYLES, TEMPLATE_FAMILIES, VARIATION_PRESETS } from './types'

const STYLE_HINT: Record<string, string> = {
  auto: 'Choose the most suitable commercial look from the brief, products and brand (do not invent a sector).',
  modern: 'Modern, clean commercial design, contemporary type hierarchy, generous spacing.',
  premium: 'Premium, refined, high-end campaign look, restrained palette, quality materials.',
  minimal: 'Minimal, lots of whitespace, few elements, one focal product or offer.',
  energetic: 'Energetic, high contrast, bold shapes, still readable on a phone.',
  fun: 'Playful but professional, not childish, still conversion-oriented.',
  corporate: 'Corporate, trustworthy, calm, no visual noise.',
  luxury: 'Luxury, elegant lighting, sparse composition, no clutter.',
  food: 'Appetizing food photography mood, warm light, steam/freshness if relevant, no fake ingredients.',
}

const DENSITY_HINT: Record<string, string> = {
  low: 'Very little on-image text: at most a short headline. No paragraphs, no tiny disclaimers.',
  balanced: 'Limited on-image text: headline + one short offer line. No long body copy. Keep mobile-readable.',
  detailed:
    'More campaign text is allowed (headline, offer, one contact line) but still sparse. Never fill the image with paragraphs.',
}

function formatLabel(formatId: string): string {
  if (formatId === 'reels_video') return 'Kampanya videosu'
  return CREATIVE_FORMATS.find((row) => row.id === formatId)?.label ?? formatId
}

function styleLabel(styleId: string): string {
  return CREATIVE_STYLES.find((row) => row.id === styleId)?.label ?? styleId
}

export type PromptFidelityOptions = {
  verifiedRefs?: {
    logo?: boolean
    product?: boolean
    base?: boolean
  }
  artDirectionPlan?: import('./director/creative-director').ArtDirectionPlan | null
  mode?: 'LEGACY_SIMPLE' | 'OVER_DIRECTED_DESIGNER'
}

export function describeColor(colorStr: string): string {
  if (!colorStr) return ''
  if (!colorStr.includes('#')) return colorStr

  const exactMap: Record<string, string> = {
    '008069': 'official deep emerald WhatsApp green',
    '25d366': 'vibrant bright WhatsApp green',
    '00a884': 'luminous teal emerald',
    '026009': 'deep agricultural forest green',
    '2d5a27': 'deep olive / hunter green',
    'b4fe00': 'electric chartreuse / lime accent',
    '8fbc8f': 'soft sage green',
    'a82218': 'deep brick terracotta / warm architectural rust',
    'b7410e': 'warm terracotta rust',
    'd32f2f': 'vivid architectural crimson red',
    '263238': 'dark graphite slate / architectural charcoal',
    '212121': 'dark architectural charcoal black',
    '111b21': 'deep midnight teal-slate',
    '0b141a': 'deep obsidian night slate',
    'ffffff': 'clean crisp white',
    '111111': 'deep rich black',
    '121212': 'deep architectural black',
  }

  return colorStr.replace(/#([0-9a-fA-F]{3,8})\b/g, (_match, hex) => {
    let h = hex.toLowerCase()
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
    const short6 = h.slice(0, 6)
    if (exactMap[short6]) return exactMap[short6]

    const num = parseInt(short6, 16)
    if (isNaN(num)) return ''
    const r = (num >> 16) & 255
    const g = (num >> 8) & 255
    const b = num & 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const delta = max - min

    if (max < 30) return 'deep rich black'
    if (min > 230) return 'clean crisp white'
    if (delta < 25) {
      if (max < 100) return 'dark slate charcoal'
      if (max < 180) return 'neutral architectural gray'
      return 'soft off-white'
    }

    if (r > g && r > b) {
      if (g > 150 && b < 100) return 'warm amber gold'
      if (g > 80 && b < 80) return 'brick terracotta / warm rust'
      if (b > 120) return 'vibrant magenta / rose'
      return 'rich crimson / red'
    } else if (g > r && g > b) {
      if (r > 150) return 'electric lime / chartreuse'
      if (b > 100) return 'fresh mint / emerald'
      if (r < 80 && g < 120) return 'deep forest green'
      return 'vivid vibrant green'
    } else {
      if (r > 120) return 'electric indigo / violet'
      if (g > 150) return 'optic cyan / bright turquoise'
      if (r < 60 && g < 100) return 'deep navy blue'
      return 'rich royal cobalt blue'
    }
  })
}

export type VerifiedCampaignData = {
  brandName: string
  sector?: string | null
  templateFamily: TemplateFamily
  headline: string
  offer?: string | null
  price?: string | null
  oldPrice?: string | null
  discount?: string | null
  quantityTiers?: string | null
  primaryBenefits: string[]
  deliveryFact?: string | null
  stockFact?: string | null
  urgencyFact?: string | null
  cta?: string | null
  contactLines: string[]
  website?: string | null
  campaignDate?: string | null
  productRef: boolean
  logoRef: boolean
}

export function deriveVerifiedCampaignData(
  snapshot: CreativeSnapshot,
  options?: PromptFidelityOptions,
): VerifiedCampaignData {
  const kit = snapshot.brandKit
  const brandName = (
    kit?.name
      ? kit.name.replace(/(?:brand\s*kit|marka\s*kiti|kampanya\s*kiti|whatsapp\s*kampanya\s*kiti)/gi, '').trim()
      : 'İşletmemiz'
  ) || 'İşletmemiz'

  const sector = snapshot.sector?.trim() || null

  let templateFamily: TemplateFamily = 'CAMPAIGN_POSTER'
  if (snapshot.templateFamily && TEMPLATE_FAMILIES.some((t) => t.id === snapshot.templateFamily)) {
    templateFamily = snapshot.templateFamily
  } else if (snapshot.style === 'food') {
    templateFamily = 'FOOD_OFFER_POSTER'
  } else if (snapshot.style === 'luxury') {
    templateFamily = 'ELEGANT_RETAIL'
  } else if (snapshot.style === 'minimal' || snapshot.style === 'modern') {
    templateFamily = 'PRODUCT_SHOWCASE'
  } else if (
    snapshot.style === 'corporate' &&
    (sector?.toLowerCase().includes('yazılım') ||
      sector?.toLowerCase().includes('saas') ||
      sector?.toLowerCase().includes('teknoloji'))
  ) {
    templateFamily = 'SAAS_PROMO_CARD'
  }

  const hero = snapshot.products?.[0]
  const headline = (
    snapshot.customText ||
    snapshot.brief ||
    hero?.name ||
    'Özel Kampanya'
  ).trim()

  const price = hero?.price?.trim() || null
  const oldPrice = hero?.oldPrice?.trim() || null
  const offer = hero?.promo?.trim() || null

  let discount: string | null = null
  if (offer && /%\s*\d+|\d+\s*%/i.test(offer)) {
    const match = offer.match(/%\s*\d+|\d+\s*%/i)
    if (match) discount = match[0].replace(/\s+/g, '')
  }

  const quantityTiers = hero?.boxContents?.trim() || hero?.extra?.trim() || null

  const primaryBenefits: string[] = []
  if (Array.isArray(snapshot.primaryBenefits)) {
    for (const b of snapshot.primaryBenefits) {
      if (b?.trim() && !primaryBenefits.includes(b.trim())) primaryBenefits.push(b.trim())
    }
  }
  if (Array.isArray(snapshot.labels)) {
    for (const l of snapshot.labels) {
      if (l?.trim() && !primaryBenefits.includes(l.trim())) primaryBenefits.push(l.trim())
    }
  }

  const deliveryFact = snapshot.deliveryInfo?.trim() || null
  const stockFact = snapshot.stockInfo?.trim() || null
  const urgencyFact = snapshot.urgencyInfo?.trim() || null
  const cta = snapshot.cta?.trim() || null

  const contactLines: string[] = []
  for (const phone of snapshot.phones || []) {
    contactLines.push(`${phone.phone}${phone.label ? ` (${phone.label})` : ''}`)
  }
  for (const social of snapshot.socials || []) {
    const handle = social.label || social.url
    contactLines.push(`${social.platform}: ${handle}`)
  }
  const website = snapshot.website?.trim() || null
  const campaignDate = snapshot.dateRange?.trim() || null

  const productRef = Boolean(
    options?.verifiedRefs?.product ?? (hero?.imageUrl && hero?.include?.image !== false),
  )
  const logoRef = Boolean(
    options?.verifiedRefs?.logo ??
      (snapshot.useLogo !== false && (kit?.logoPath || (snapshot as any).customLogoUrl)),
  )

  return {
    brandName,
    sector,
    templateFamily,
    headline,
    offer,
    price,
    oldPrice,
    discount,
    quantityTiers,
    primaryBenefits,
    deliveryFact,
    stockFact,
    urgencyFact,
    cta,
    contactLines,
    website,
    campaignDate,
    productRef,
    logoRef,
  }
}

const TEMPLATE_FAMILY_INSTRUCTIONS: Record<TemplateFamily, string> = {
  CAMPAIGN_POSTER: [
    'Design mode: High-impact commercial campaign visual tailored custom-designed for this brand and sector.',
    '- The physical product is the undisputed hero, occupying 60-70% visual share and physically integrated into the environment with authentic perspective, natural lighting, and realistic contact shadows (NEVER look like a flat cut-out pasted onto graphics).',
    '- High-contrast Turkish commercial headline with clear mobile readability, styled appropriately for the brand personality.',
    '- Clear commercial hierarchy: select only the strongest 2 to 4 commercial anchors (such as headline, price/offer hierarchy, and one concise benefit or CTA). Do NOT clutter with repetitive badge packs or generic footer strips.',
    '- Avoid repeated Canva template skeletons: allow composition to emerge naturally from product geometry and sector (e.g., dynamic diagonal, large product crop breaking the frame, environmental embedding, or elegant editorial framing).',
    '- Clean, authentic corporate logo placement integrated naturally into the composition.',
  ].join('\n'),

  PRODUCT_SHOWCASE: [
    'Design mode: Clean commercial product showcase.',
    '- Generous breathing room with pristine commercial studio lighting.',
    '- The physical product is the central hero, showcasing authentic materials, textures, and clean reflections.',
    '- Restrained, elegant sales typography with subtle branding.',
    '- Focus on craftsmanship, design quality, and authentic physical identity.',
  ].join('\n'),

  FOOD_OFFER_POSTER: [
    'Design mode: Appetizing culinary campaign poster.',
    '- Mouth-watering, fresh food hero staging with warm, delicious lighting and glistening textures.',
    '- Clear menu item title, appetizing food presentation, and prominent offer/price badge.',
    '- High contrast, mobile-first sales appeal designed to drive direct WhatsApp orders.',
  ].join('\n'),

  ELEGANT_RETAIL: [
    'Design mode: Boutique retail campaign visual.',
    '- Soft, harmonious commercial lighting with graceful composition.',
    '- The product or floral arrangement is front and center with refined aesthetic balance.',
    '- Elegant commercial typography suitable for gifts, flowers, or boutique fashion.',
  ].join('\n'),

  SAAS_PROMO_CARD: [
    'Design mode: Modern tech-commercial promo visual.',
    '- Clean digital product staging featuring a sleek modern dashboard, app interface, or software card.',
    '- Crisp digital typography highlighting key product benefits, core feature badge, and clear call-to-action.',
  ].join('\n'),
}

function getSectorArtDirectionHint(sector?: string | null, brief?: string | null): string | null {
  const text = `${sector || ''} ${brief || ''}`.toLowerCase()
  if (/tarım|bahçe|çiftlik|ilaçlama|gübre|tohum|sprayer|tarim/i.test(text)) {
    return 'Sector art direction (Tarım & Bahçe): The product is physically integrated into a real orchard, field, or foliage setting with natural morning daylight and realistic ground shadows. High-contrast agricultural campaign energy. Avoid generic neon supermarket flyer modules or repetitive badge strips.'
  }
  if (/inşaat|yapı|tuğla|klinker|çimento|şantiye|mimari|insaat/i.test(text)) {
    return 'Sector art direction (İnşaat & Yapı Malzemeleri): Grounded in authentic construction-site materiality—natural daylight, wooden pallets, raw concrete, and authentic masonry texture. Solid architectural typography; avoid generic red discount-flyer compositions.'
  }
  if (/döner|restoran|yiyecek|gıda|lezzet|menü|kebap|food|doner/i.test(text)) {
    return 'Sector art direction (Restoran & Gıda): Mouth-watering food photography must dominate the scene (70%+ visual share) with warm ambient light, rich textures, and appetizing freshness. Typography must support appetite; do NOT bury or cover the food under heavy graphic boxes or badge packs.'
  }
  if (/çiçek|lale|buket|gül|butik|hediye|flora/i.test(text)) {
    return 'Sector art direction (Çiçekçilik & Butik): Editorial boutique aesthetic with organic composition, soft natural daylight, refined typography, and generous breathing room. Graceful and premium; avoid supermarket discount flyer graphics.'
  }
  if (/sanayi|endüstri|rulman|çelik|makine|yedek parça|vortex|bearing|sanayi/i.test(text)) {
    return 'Sector art direction (Ağır Sanayi & Endüstri): Precision engineering aesthetic highlighting metallic product detail, brushed steel reflections, and realistic workshop or factory environment. Crisp technical typography and engineering clarity; avoid simply recoloring a generic template.'
  }
  return null
}

/**
 * P0 LEGACY_SIMPLE PROMPT PHILOSOPHY:
 *
 * Simple user intent + verified product + verified logo + brand kit context + concise creative request.
 * Lets ChatGPT / OmniStudio perform the actual art direction naturally without micromanaging
 * zones, coordinates, percentages, badges, or predefined template grids.
 */
export function buildLegacySimpleCreativePrompt(
  snapshot: CreativeSnapshot,
  options?: PromptFidelityOptions,
): {
  prompt: string
  negative: string
} {
  const verified = deriveVerifiedCampaignData(snapshot, options)
  const aspect =
    snapshot.formatId === 'reels_video'
      ? '9:16'
      : CREATIVE_FORMATS.find((row) => row.id === snapshot.formatId)?.aspect ?? snapshot.aspect
  const kit = snapshot.brandKit

  const colors = kit?.colors
    ? Object.entries(kit.colors)
        .filter(([, value]) => typeof value === 'string' && value)
        .map(([key, value]) => `${key} ${describeColor(String(value))}`)
        .join(', ')
    : null

  const productBlocks = snapshot.products.map((product, index) => {
    const bits: string[] = [`Product ${index + 1}`]
    if (product.include?.name !== false && product.name) bits.push(`name: ${product.name}`)
    if (product.include?.description !== false && product.description) bits.push(`description: ${product.description}`)
    if (product.include?.boxContents && product.boxContents) {
      bits.push(`box contents: ${product.boxContents}`)
    }
    if (product.include?.price && (product.price || product.oldPrice)) {
      bits.push(
        `price: ${product.price || '—'} ${product.oldPrice ? `(was ${product.oldPrice})` : ''}`.trim(),
      )
    }
    if (product.include?.promo && product.promo) bits.push(`offer: ${product.promo}`)
    if (product.extra) bits.push(`extra: ${product.extra}`)
    return bits.join('. ')
  })

  const templateInstruction = TEMPLATE_FAMILY_INSTRUCTIONS[verified.templateFamily] ?? TEMPLATE_FAMILY_INSTRUCTIONS.CAMPAIGN_POSTER

  // Proven historical reference phrasing
  const refInstruction = [
    (verified.logoRef && verified.productRef)
      ? 'Authentic product and company logo references are attached.'
      : null,
    verified.logoRef
      ? 'A real brand logo image is attached. Place it as a small clean logo. Do NOT redraw, restyle or invent a new logo. Do not distort it.'
      : 'Do not invent fake logos.',
    verified.productRef
      ? 'A product photo is attached as a reference. Keep the real product identity.'
      : 'Do not invent fantasy products.',
  ].filter(Boolean).join('\n')

  const variation = snapshot.variationPreset
    ? VARIATION_PRESETS.find((row) => row.id === snapshot.variationPreset)?.label
    : null

  const sectorArtDirection = getSectorArtDirectionHint(verified.sector, snapshot.brief)

  // Selective commercial elements (Pick 2 to 4 strongest anchors based on campaign focus):
  const commercialLines: string[] = []
  if (verified.headline) commercialLines.push(`Campaign headline: "${verified.headline}"`)
  if (verified.price) {
    const discountPart = verified.discount ? ` · Discount: ${verified.discount}` : ''
    commercialLines.push(
      `Price hierarchy: ${verified.price}${verified.oldPrice ? ` (was ${verified.oldPrice})` : ''}${discountPart}`,
    )
  } else if (verified.offer) {
    commercialLines.push(`Offer: ${verified.offer}`)
  }
  if (verified.primaryBenefits.length) {
    commercialLines.push(`Key verified selling point: ${verified.primaryBenefits.slice(0, 2).join(' · ')}`)
  }
  if (verified.deliveryFact) {
    commercialLines.push(`Delivery promise: ${verified.deliveryFact}`)
  }
  if (verified.cta) {
    commercialLines.push(`CTA: ${verified.cta}`)
  }
  if (verified.contactLines.length) {
    commercialLines.push(`Phone/WhatsApp: ${verified.contactLines.join(' · ')}`)
  }
  if (snapshot.website) {
    commercialLines.push(`Website: ${snapshot.website}`)
  }

  const designerDirectives = options?.artDirectionPlan
    ? [
        'EXECUTIVE ART DIRECTION & DESIGNER DIRECTIVES:',
        `- CONCEPT & ARCHETYPE: ${options.artDirectionPlan.concept_name} (Archetype: ${options.artDirectionPlan.creative_archetype}).`,
        `- VISUAL HOOK: ${options.artDirectionPlan.visual_hook}.`,
        `- LIGHTING & SHADOW PHYSICS: ${options.artDirectionPlan.art_direction.lighting}.`,
        `- MATERIAL & TEXTURE REALISM: ${options.artDirectionPlan.art_direction.material_language}. Surface texture: ${options.artDirectionPlan.art_direction.texture}.`,
        `- ATMOSPHERE & BACKGROUND: ${options.artDirectionPlan.art_direction.background_treatment}. Atmosphere: ${options.artDirectionPlan.art_direction.atmosphere}.`,
        `- COLOR TREATMENT & CONTRAST: ${options.artDirectionPlan.art_direction.color_treatment}. Contrast strategy: ${options.artDirectionPlan.art_direction.contrast_strategy}.`,
        options.artDirectionPlan.brand_dna
          ? `- AUTHORITATIVE BRAND DNA: ${options.artDirectionPlan.brand_dna.brand_name} (${options.artDirectionPlan.brand_dna.tone}). Visual personality: ${options.artDirectionPlan.brand_dna.visual_personality}. Background: ${options.artDirectionPlan.brand_dna.background_preference}.`
          : null,
        `- ANTI-GENERIC MANDATES: ${options.artDirectionPlan.anti_generic_rules.slice(0, 5).join('; ')}.`,
      ].filter(Boolean).join('\n')
    : null

  const prompt = [
    'Create ONE professional commercial campaign creative for WhatsApp / social ads.',
    'Turkish audience. High quality, sharp, mobile-first, no watermarks, no stock-photo logos.',
    `Use case: ${formatLabel(snapshot.formatId)} (${aspect}).`,
    templateInstruction,
    sectorArtDirection,
    designerDirectives,
    DENSITY_HINT[snapshot.textDensity] ?? DENSITY_HINT.balanced,
    verified.brandName ? `Brand name: ${verified.brandName}.` : null,
    verified.sector ? `Sector: ${verified.sector}.` : null,
    kit?.tone ? `Brand tone of voice: ${kit.tone}` : null,
    colors ? `Follow this brand palette in backgrounds, accents and props: ${colors}.` : null,
    kit?.fonts?.heading ? `Prefer a ${kit.fonts.heading}-like heading feel.` : null,
    refInstruction,
    snapshot.baseCreativeId
      ? 'A base/reference campaign image is attached. Keep the same product and brand identity; apply the requested change.'
      : null,
    snapshot.instruction ? `Revision instruction (must follow): ${snapshot.instruction}` : null,
    variation ? `Variation direction: ${variation}. Same offer, different composition.` : null,
    `Campaign brief from the advertiser: ${snapshot.brief}`,
    productBlocks.length ? `Products:\n${productBlocks.join('\n')}` : 'No specific product catalog items.',
    commercialLines.length ? `Verified commercial facts:\n${commercialLines.join('\n')}` : null,
    'Commercial composition mandate: Feature only the 2 to 4 strongest commercial anchors above. Avoid repetitive circular discount stickers, 3-icon rows, boxed price cards, and bottom footer bars all together. Avoid a generic Canva template skeleton; let the layout emerge naturally from the product geometry, photography, and brand character.',
    'Do not invent prices, discounts, slogans, dates, product names or brand claims that are not in this brief.',
    'Do not replace products with different products. Preserve packaging and product shape from reference photos.',
    'Clean visual hierarchy. One focal offer. Not cluttered. Readable on a phone screen.',
  ]
    .filter(Boolean)
    .join('\n')

  const negative = [
    'no generic Canva template look',
    'no repeated flyer layout',
    'no cut-out product pasted on graphic background',
    'no fake 3-icon benefit row',
    'no supermarket sticker pack',
    'no cookie-cutter poster skeleton',
    'no generic boxed price cards',
    'no extra products that were not listed',
    'no fake logos',
    'no distorted logo',
    'no modified logo',
    'no redesigned brand logo',
    'no unreadable micro-text',
    'no watermarks',
    'no misspelled brand names',
    'no cartoon stickers',
    'no starburst badges',
    'no supermarket flyer clipart',
    'no fake clickable web buttons',
    'no tiny product in distant background',
    'no generic minimalist empty poster',
    'no cinematic lifestyle drift away from the product',
    'no invented trust badges',
    'no unverified warranty claims',
    ...(options?.artDirectionPlan?.commercial_grammar?.negativeLayoutRules || []),
    ...(options?.artDirectionPlan?.anti_generic_rules || []),
  ].join(', ')

  return { prompt, negative }
}

/**
 * Preserved Over-Directed Prompt Builder (Kept behind code boundaries for A/B testing and recovery).
 */
export function buildOverDirectedCreativePrompt(
  snapshot: CreativeSnapshot,
  options?: PromptFidelityOptions,
): {
  prompt: string
  negative: string
} {
  const aspect =
    snapshot.formatId === 'reels_video'
      ? '9:16'
      : CREATIVE_FORMATS.find((row) => row.id === snapshot.formatId)?.aspect ?? snapshot.aspect
  const kit = snapshot.brandKit
  const colors = kit?.colors
    ? Object.entries(kit.colors)
        .filter(([, value]) => typeof value === 'string' && value)
        .map(([key, value]) => `${key}: ${describeColor(String(value))}`)
        .join(', ')
    : null

  const productBlocks = snapshot.products.map((product, index) => {
    const bits: string[] = [`Product ${index + 1}`]
    if (product.include.name && product.name) bits.push(`name: ${product.name}`)
    if (product.include.description && product.description) bits.push(`description: ${product.description}`)
    if (product.include.boxContents && product.boxContents) {
      bits.push(`box contents: ${product.boxContents}`)
    }
    if (product.include.price && (product.price || product.oldPrice)) {
      bits.push(
        `price: ${product.price || '—'} ${product.oldPrice ? `(was ${product.oldPrice})` : ''}`.trim(),
      )
    }
    if (product.include.promo && product.promo) bits.push(`offer: ${product.promo}`)
    if (product.extra) bits.push(`extra: ${product.extra}`)
    if (!snapshot.baseCreativeId && product.include.image && product.imageUrl && index === 0) {
      bits.push('A product photo is attached as a reference. Keep the real product identity.')
    }
    return bits.join('. ')
  })

  const contacts: string[] = []
  for (const phone of snapshot.phones) {
    contacts.push(`Phone/WhatsApp: ${phone.phone}${phone.label ? ` (${phone.label})` : ''}`)
  }
  for (const social of snapshot.socials) {
    const handle = social.label || social.url
    contacts.push(`${social.platform}: ${handle}`)
  }
  if (snapshot.website) contacts.push(`Website: ${snapshot.website}`)
  if (snapshot.address) contacts.push(`Address: ${snapshot.address}`)

  const extras: string[] = []
  if (snapshot.labels.length) extras.push(`Badges/labels to feature: ${snapshot.labels.join(', ')}`)
  if (snapshot.cta) extras.push(`CTA: ${snapshot.cta}`)
  if (snapshot.dateRange) extras.push(`Campaign dates: ${snapshot.dateRange}`)
  if (snapshot.customText) extras.push(`Custom line: ${snapshot.customText}`)

  const rawBrandName = kit?.name || ''
  const cleanBrandName = rawBrandName
    .replace(/(?:brand\s*kit|marka\s*kiti|kampanya\s*kiti|whatsapp\s*kampanya\s*kiti)/gi, '')
    .trim()

  const briefText = snapshot.brief?.trim() || ''

  const variation = snapshot.variationPreset
    ? VARIATION_PRESETS.find((row) => row.id === snapshot.variationPreset)?.label
    : null

  // Reklam Poster Hiyerarşisi & Executive Art Direction Yönergesi
  const compositionDirectives = options?.artDirectionPlan
    ? [
        'EXECUTIVE ART DIRECTION & DESIGNER DIRECTIVES:',
        'COMMERCIAL CAMPAIGN POSTER ARCHITECTURE (4-ZONE READING FLOW):',
        '- ZONE 1 (HEADER & BRAND AUTHORITY): Top-aligned brand header featuring the authentic corporate logo with generous breathing room and pristine background contrast.',
        '- ZONE 2 (HERO PRODUCT/MATERIAL/INTERFACE STAGING): The hero subject is the undisputed commercial anchor occupying 45-55% visual share. True-to-life physical materials, crisp ambient occlusion contact shadows, and realistic lighting. Contextual scene elements remain strictly supportive in the background.',
        '- ZONE 3 (COMMERCIAL TYPOGRAPHY & VALUE STACK): Prominent, ultra-bold commercial Turkish headline in brand font personality. Core offer/pricing displayed in a modern rounded capsule/pill badge in brand accent color.',
        '- ZONE 4 (CONVERSION CALL-TO-ACTION): Sleek, high-clickability CTA pill button in brand accent color with clean text and directional arrow glyph (e.g. "Hemen Sipariş Ver →", "Kataloğu İndir →", "Ücretsiz Başla →").',
        options.artDirectionPlan.brand_dna
          ? [
              `- AUTHORITATIVE BRAND DNA MANDATES (SUPERCEDES ARCHETYPE DEFAULTS):`,
              `  * Brand Identity: ${options.artDirectionPlan.brand_dna.brand_name} (Authentic Tone: ${options.artDirectionPlan.brand_dna.tone}).`,
              `  * Palette Authority: ${options.artDirectionPlan.brand_dna.palette.naturalLanguageDescription}. All background treatment, lighting accents, UI highlights, and CTA button MUST strictly derive from this brand palette. Archetype colors must NEVER override the brand palette.`,
              `  * Typography Authority: ${options.artDirectionPlan.brand_dna.typography.personality}`,
              `  * Visual Restraint & Tone: ${options.artDirectionPlan.brand_dna.visual_personality}`,
              `  * Background Integration: ${options.artDirectionPlan.brand_dna.background_preference}`,
              `  * Accent & CTA Discipline: ${options.artDirectionPlan.brand_dna.accent_usage}`,
              `  * Logo Rule: ${options.artDirectionPlan.brand_dna.logo_rules.placement}. 100% geometric and color fidelity. Never redraw or morph.`,
            ].join('\n')
          : null,
        options.artDirectionPlan.commercial_grammar
          ? [
              `- COMMERCIAL POSTER GRAMMAR (${options.artDirectionPlan.commercial_grammar.id}):`,
              `  * Layout Reading Path: ${options.artDirectionPlan.commercial_grammar.layoutHierarchy.spatialReadingPath}`,
              `  * Hero Staging Area: ${options.artDirectionPlan.commercial_grammar.layoutHierarchy.heroProductArea}`,
              `  * Headline & Offer Hierarchy: ${options.artDirectionPlan.commercial_grammar.layoutHierarchy.headlineScaleAndPosition} | ${options.artDirectionPlan.commercial_grammar.layoutHierarchy.offerBlockStructure}`,
              `  * Action CTA Placement: ${options.artDirectionPlan.commercial_grammar.layoutHierarchy.ctaPlacement}`,
              `  * Priority Rule: COMMERCIAL_GRAMMAR controls layout hierarchy only. BRAND_KIT controls visual identity and ALWAYS has higher priority than layout grammar.`,
              ...options.artDirectionPlan.commercial_grammar.compositionDirectives.map((d) => `  * ${d}`),
            ].join('\n')
          : null,
        `- CONCEPT & ARCHETYPE: ${options.artDirectionPlan.concept_name} (Archetype: ${options.artDirectionPlan.creative_archetype}).`,
        `- VISUAL HOOK: ${options.artDirectionPlan.visual_hook}.`,
        `- COMPOSITION & GRID: ${options.artDirectionPlan.composition.grid}. Focal point: ${options.artDirectionPlan.composition.focal_point}. Product scale: ${options.artDirectionPlan.composition.product_scale}, positioned at ${options.artDirectionPlan.composition.product_position}.`,
        options.artDirectionPlan.product_dominance
          ? `- PRODUCT/MATERIAL DOMINANCE MANDATE: Undisputed commercial hero. Target visual share: ${options.artDirectionPlan.product_dominance.target_visual_share}. Full silhouette preserved without cropping or occlusion. Human presence is strictly ${options.artDirectionPlan.product_dominance.human_role} and environment is ${options.artDirectionPlan.product_dominance.context_role}. Do NOT let human models, nature, or lifestyle elements overpower the hero product.`
          : null,
        `- DEPTH & LAYERING: ${options.artDirectionPlan.composition.depth_layers.join(' -> ')}.`,
        `- LIGHTING & SHADOW PHYSICS: ${options.artDirectionPlan.art_direction.lighting}.`,
        `- MATERIAL & TEXTURE REALISM: ${options.artDirectionPlan.art_direction.material_language}. Surface texture: ${options.artDirectionPlan.art_direction.texture}.`,
        `- BACKGROUND TREATMENT & ATMOSPHERE: ${options.artDirectionPlan.art_direction.background_treatment}. Atmosphere: ${options.artDirectionPlan.art_direction.atmosphere}.`,
        `- COLOR TREATMENT & CONTRAST: ${options.artDirectionPlan.art_direction.color_treatment}. Contrast strategy: ${options.artDirectionPlan.art_direction.contrast_strategy}.`,
        options.artDirectionPlan.human_direction?.enabled
          ? `- HUMAN PRESENCE & ACTION: Staged ${options.artDirectionPlan.human_direction.role} in ${options.artDirectionPlan.human_direction.wardrobe}, performing: ${options.artDirectionPlan.human_direction.interaction}. Expression: ${options.artDirectionPlan.human_direction.expression}. (Must remain secondary supporting role to the hero product).`
          : null,
        `- PRODUCT HERO FIDELITY: ${options.artDirectionPlan.product_direction.hero_behavior}. Scale: ${options.artDirectionPlan.product_direction.scale}. Shadow: ${options.artDirectionPlan.product_direction.reflection_shadow}.`,
        `- GRAPHIC ACCENTS: Incorporate subtle ${options.artDirectionPlan.graphic_language.shapes.join(', ')} with ${options.artDirectionPlan.graphic_language.frames.join(', ')}.`,
        `- TYPOGRAPHY DIRECTION: ${options.artDirectionPlan.typography_direction.headline_character}. Feel: ${options.artDirectionPlan.typography_direction.style_feel}. Keep commercial headline, offer badge, and CTA prominent and readable on mobile.`,
        `- STRICT ANTI-GENERIC MANDATES: ${options.artDirectionPlan.anti_generic_rules.join('; ')}.`,
      ].filter(Boolean).join('\n')
    : [
        'AUTONOMOUS COMMERCIAL AD POSTER COMPOSITION & LAYOUT:',
        '- TOP / HEADER: Clean brand placement at top. If logo reference is provided, position the authentic corporate logo with high clarity and balanced margins.',
        '- HEADLINE TYPOGRAPHY: Prominent, ultra-bold, condensed commercial Turkish headline typography matching the brand palette and font tone. High visual contrast against background.',
        '- OFFER SUB-BADGE: Sleek modern rounded capsule/pill badge in brand accent color containing the core offer, discount or delivery promise. Keep it minimal and elegant (e.g. "Kapıya Teslim • Hızlı Gönderim" or "%20 İndirim • Sınırlı Stok"). NEVER paint tacky cartoon supermarket stickers or comic starbursts.',
        '- CENTER HERO STAGING: The hero subject (physical product or service visual) must be staged in a realistic, premium, context-appropriate commercial environment with authentic materials, natural lighting, crisp reflections, and contextual atmospheric depth (e.g., sleek logistics dock for construction/wholesale, natural slate with water mist for spray/agritech, executive desk with laptop/app UI for tech/software, marble surface for food/retail).',
        '- BOTTOM VALUE STRIP: Sleek minimal horizontal feature bar with 2-3 concise value propositions and clean icons (e.g., "[icon] HIZLI TESLİMAT  |  [icon] YÜKSEK KALİTE  |  [icon] GÜVENİLİR HİZMET").',
        '- ZERO TACKY GRAPHICS: Strictly NO cartoon supermarket flyer stickers, NO yellow starbursts, NO fake web clickable buttons painted on image, NO comic speech bubbles.'
      ].join('\n')

  const prompt = [
    'Create ONE professional commercial campaign creative for WhatsApp / social ads.',
    'Turkish audience. High quality, sharp, mobile-first, no watermarks, no stock-photo logos.',
    `Use case: ${formatLabel(snapshot.formatId)} (${aspect}).`,
    `Visual style: ${styleLabel(snapshot.style)}. ${STYLE_HINT[snapshot.style] ?? STYLE_HINT.auto}`,
    DENSITY_HINT[snapshot.textDensity] ?? DENSITY_HINT.balanced,
    cleanBrandName ? `Brand name: ${cleanBrandName}.` : null,
    kit?.tone ? `Brand tone of voice: ${kit.tone}` : null,
    colors ? `Follow this brand palette in backgrounds, accents and props: ${colors}.` : null,
    kit?.fonts?.heading ? `Prefer a ${kit.fonts.heading}-like heading feel.` : null,
    'Do NOT write internal labels on the image: never paint brand-kit titles, "marka kiti", "brand kit", "kampanya kiti", or similar meta text.',
    options?.verifiedRefs?.logo
      ? 'STRICT LOGO FIDELITY: A real company logo image is attached as a reference. Place that exact logo cleanly without any modification, restyling, or variation. Keep its exact proportions, geometry, emblem shape, and brand colors. NEVER invent a different logo, NEVER stylize or morph the logo, and NEVER replace the logo with typed text.'
      : snapshot.useLogo !== false
        ? 'Clean brand identity. If no authentic logo file is attached, do NOT invent a fictional logo.'
        : 'Do not invent fake logos. Do not type a brand name as a fake logo unless the advertiser brief explicitly asks for the business name as headline text.',
    options?.verifiedRefs?.base
      ? 'A base/reference campaign image is attached. Keep the exact same product and brand identity; apply the requested change.'
      : null,
    snapshot.instruction ? `Revision instruction (must follow): ${snapshot.instruction}` : null,
    variation ? `Variation direction: ${variation}. Same offer, different composition.` : null,
    `Campaign brief from the advertiser: ${briefText || 'Özel Kampanya'}`,
    productBlocks.length ? `Products:\n${productBlocks.join('\n')}` : 'No specific product catalog items.',
    compositionDirectives,
    options?.verifiedRefs?.product
      ? 'STRICT PRODUCT FIDELITY: The real product photo is provided as a reference. You must preserve the real physical product exactly as shown: exact shape, casing, components, buttons, materials, and colors. Do NOT mutate the product, do NOT invent fantasy product variations, do NOT change the product design, and do NOT replace the product with a generic item.'
      : 'Do not invent fantasy products. Feature the offered service or commercial offer cleanly.',
    contacts.length
      ? `Contact lines that may appear on the creative if text is used: ${contacts.join(' · ')}`
      : null,
    extras.length ? extras.join(' ') : null,
    'CLAIM VERIFICATION & BADGE RESTRICTION: Absolutely DO NOT invent or paint unverified trust badges, warranty seals, leader claims, or reseller stamps (e.g. "Orijinal Ürün", "Yetkili Satıcı", "50 Yıl Garanti", "Lider Marka", "100% Güvenli", or arbitrary discount badges) unless that exact text appears in the verified Badges/Labels list above. If no badges are explicitly listed, do not invent any.',
    'Do not invent prices, discounts, slogans, dates, product names or brand claims that are not in this brief.',
    'Do not replace products with different products. Preserve packaging and product shape from reference photos with 100% fidelity.',
    'Clean visual hierarchy. One focal offer. Not cluttered. Readable on a phone screen.',
  ]
    .filter(Boolean)
    .join('\n')

  const negative = [
    'no extra products that were not listed',
    'no fake logos',
    'no distorted logo',
    'no modified logo',
    'no logo variations',
    'no redesigned brand logo',
    'no wrong brand colors',
    'no morphed product',
    'no deformed product design',
    'no fantasy product variations',
    'no generic product replacement',
    'no lifestyle-dominated framing where background or person overpowers the product',
    'no tiny product in distant background',
    'no human model stealing focus from the hero product',
    'no cartoon stickers',
    'no yellow starburst badges',
    'no supermarket flyer graphics',
    'no fake clickable buttons',
    'no fake web UI elements',
    'no speech bubbles',
    'no unreadable micro-text',
    'no watermarks',
    'no misspelled brand names',
    'no text saying marka kiti',
    'no text saying brand kit',
    'no campaign kit title overlays',
    'no invented trust badges',
    'no unverified warranty claims',
    'no fake certification stamps',
    'no invented reseller badges',
    'no fake Orijinal Ürün',
    'no fake Yetkili Satıcı',
    'no fake Garanti stamps',
    'no arbitrary discounts',
    'no arbitrary claims',
    'no generic template layout',
    'no stock clipart graphics',
    'no random floating geometric shapes or 3D spheres',
    'no tacky gradient banners',
    'no distorted Turkish typography',
    'no muddy vignette corners',
    ...(options?.artDirectionPlan?.commercial_grammar?.negativeLayoutRules || []),
    ...(options?.artDirectionPlan?.anti_generic_rules || []),
  ].join(', ')

  return { prompt, negative }
}

/**
 * Structured brief → image-model prompt.
 *
 * P0 POLICY: By default, uses the clean LEGACY_SIMPLE prompt structure.
 * Only if options?.mode === 'OVER_DIRECTED_DESIGNER' is explicitly passed will it inject
 * the verbose composition directives.
 */
export function buildCreativePrompt(
  snapshot: CreativeSnapshot,
  options?: PromptFidelityOptions,
): {
  prompt: string
  negative: string
} {
  if (options?.mode === 'OVER_DIRECTED_DESIGNER') {
    return buildOverDirectedCreativePrompt(snapshot, options)
  }
  return buildLegacySimpleCreativePrompt(snapshot, options)
}

const VIDEO_STYLE_MOODS: Record<string, string> = {
  luxury: 'Ultra-luxurious atmosphere, moody directional lighting, rich shadows, warm specular highlights, whisper-quiet elegance.',
  premium: 'High-end commercial aesthetic, refined balanced lighting, rich tactile textures, authoritative craftsmanship.',
  modern: 'Contemporary commercial look, pristine natural daylight, clean architectural lines, bright vivid tones, crisp focus.',
  minimal: 'Pure minimalist aesthetic, serene spacious environment, elegant simplicity, soft diffused illumination.',
  energetic: 'Dynamic movement, high contrast, vibrant saturated tones, intense lighting, fast-paced cinematic energy.',
  food: 'Mouth-watering commercial culinary mood, warm soft light, glistening textures, fresh appetizing atmosphere.',
  corporate: 'Trustworthy, clean, professional, pristine high-end industrial or office setting, steady measured camera.',
  fun: 'Vibrant, bright, upbeat, cheerful commercial lighting, lively color balance.',
  auto: 'High-end commercial marketing aesthetic, pristine professional lighting, natural color fidelity.',
}

/**
 * Structured brief → High-fidelity cinematic 3-act live-action commercial video prompt (Veo / AI Video).
 * Matches the deep detail, brand kit integration, and style fidelity of the image generation engine.
 * Keeps campaign text out of the raw video while allowing real-world brand identity.
 */
export function buildVideoPrompt(snapshot: CreativeSnapshot): {
  prompt: string
  negative: string
  overlay: {
    brandName: string
    subTitle?: string
    offerTitle?: string
    offerDetails?: string
    ctaText?: string
    primaryColor?: string
    accentColor?: string
  }
} {
  const kit = snapshot.brandKit
  const brandName = kit?.name?.replace(/Brand Kit/i, '').replace(/Kampanya Kiti/i, '').trim() || ''
  const mainProduct = snapshot.products[0]
  const productName = mainProduct?.name || 'Ürün'

  // 1. Tüm ürünlerin zengin katalog bilgilerini derle
  const productBlocks = snapshot.products.map((product, index) => {
    const bits: string[] = [`Ürün ${index + 1}: ${product.name}`]
    if (product.description) bits.push(product.description)
    if (product.boxContents) bits.push(`Kutu içeriği: ${product.boxContents}`)
    if (product.price || product.oldPrice) {
      bits.push(
        `Fiyat: ${product.price || '—'} ${product.oldPrice ? `(Eski fiyat: ${product.oldPrice})` : ''}`.trim(),
      )
    }
    if (product.promo) bits.push(`Kampanya: ${product.promo}`)
    if (product.extra) bits.push(product.extra)
    return bits.join('. ')
  })

  // 2. Kampanya bağlamı ve ek ayrıntılar
  const campaignContext: string[] = []
  if (snapshot.brief) campaignContext.push(`Kampanya Konsepti: ${snapshot.brief.trim()}`)
  if (snapshot.customText) campaignContext.push(`Özel Kampanya Duyurusu / Slogan: ${snapshot.customText.trim()}`)
  if (snapshot.dateRange) campaignContext.push(`Kampanya Süresi: ${snapshot.dateRange.trim()}`)
  if (snapshot.labels.length) campaignContext.push(`Öne Çıkan Rozetler: ${snapshot.labels.join(', ')}`)
  if (snapshot.cta) campaignContext.push(`Harekete Geçirici Çağrı (CTA): ${snapshot.cta.trim()}`)
  if (snapshot.phones.length) {
    campaignContext.push(`WhatsApp Sipariş Hattı: ${snapshot.phones.map((p) => p.phone).join(', ')}`)
  }

  const fullContext = [
    productBlocks.join(' '),
    snapshot.brief || '',
    snapshot.customText || '',
    snapshot.labels.join(' '),
    kit?.tone || '',
  ]
    .join(' ')
    .toLowerCase()

  // 3. Sektöre ve ürüne göre gerçekçi sinematik ortam tespiti
  let environment = 'profesyonel, aydınlık ve modern bir ticari reklam çekim ortamı'
  let act1Focus = `${productName} yüzeyindeki doğal malzeme dokusu, birinci sınıf işçilik ve kusursuz detaylar`
  let act2Action = `${productName} ürününün gerçek kullanım anı, işlevi ve yüksek dayanıklılığı`
  let act3Climax = `${productName} ürününün yer aldığı kusursuz, tamamlanmış ve güven veren geniş açı son sahne`

  if (fullContext.includes('veri') || fullContext.includes('data') || fullContext.includes('yazılım') || fullContext.includes('b2b') || fullContext.includes('platform') || fullContext.includes('istihbarat') || fullContext.includes('leads') || fullContext.includes('crm') || fullContext.includes('analiz') || fullContext.includes('şirket takip') || fullContext.includes('bilişim')) {
    environment = 'modern, aydınlık ve fütüristik bir cam gökdelen ofisi ve teknoloji veri analitiği merkezi'
    act1Focus = 'ince çerçeveli dizüstü bilgisayar ekranında canlı akan veri grafikleri, harita üzerinde parıldayan yeni işletme bildirimleri'
    act2Action = 'kullanıcının onaylı şirket iletişim bilgilerine tek tıkla ulaşması, sıcak potansiyel müşterilere WhatsApp ile anında teklif sunuşu'
    act3Climax = 'panoramik şehir manzarası önünde yükselen başarı grafikleri ve güven veren prestijli kurumsal teknoloji vitrini'
  } else if (fullContext.includes('tuğla') || fullContext.includes('inşaat') || fullContext.includes('yapı') || fullContext.includes('harç') || fullContext.includes('çimento') || fullContext.includes('boya') || fullContext.includes('fayans') || fullContext.includes('seramik') || fullContext.includes('mermer') || fullContext.includes('çatı')) {
    environment = 'modern bir mimari yapı projesi ve gün ışığında estetik şantiye ortamı'
    act1Focus = 'doğal killi yapı malzemesinin nizami dizilimi, pürüzsüz yüzey dokusu ve sağlam kütlesi'
    act2Action = 'ustalıkla örülen modern ve estetik duvar mimarisi, malzemenin kusursuz yerleşimi'
    act3Climax = 'yeni tamamlanmış çağdaş ve estetik bir mimari yapının güven veren heybetli dış cephesi'
  } else if (fullContext.includes('yemek') || fullContext.includes('gıda') || fullContext.includes('restoran') || fullContext.includes('kahve') || fullContext.includes('kahvaltı') || fullContext.includes('pasta') || fullContext.includes('döner') || fullContext.includes('burger') || fullContext.includes('tatlı') || fullContext.includes('fırın') || fullContext.includes('çikolata')) {
    environment = 'şık, sıcak ve samimi bir gourmet mutfak ve ahşap sunum masası'
    act1Focus = 'taptaze malzemelerin iştah açıcı mikro dokusu, buharı ve canlı renkleri'
    act2Action = 'yemeğin ustalıkla hazırlanışı, sıcak servis anı ve lezzetli sunum detayı'
    act3Climax = 'tüm ziyafet masasını ve davetkâr lezzetleri sergileyen sıcak ışıklı geniş açı sahne'
  } else if (fullContext.includes('pompa') || fullContext.includes('tarım') || fullContext.includes('ilaçlama') || fullContext.includes('traktör') || fullContext.includes('hasat') || fullContext.includes('tohum') || fullContext.includes('fidan') || fullContext.includes('gübre') || fullContext.includes('bahçe')) {
    environment = 'güneşli, bereketli bir tarım arazisi ve yemyeşil meyve bahçesi'
    act1Focus = 'ürünün dayanıklı gövdesi, kaliteli malzeme detayları ve ergonomik formu'
    act2Action = 'ürünün arazideki akıcı ve verimli çalışma performansı, bitkilerle uyumu'
    act3Climax = 'bereketli tarlaları ve ürünün doğadaki kusursuz katkısını gösteren geniş açı plan'
  } else if (fullContext.includes('mobilya') || fullContext.includes('dekorasyon') || fullContext.includes('koltuk') || fullContext.includes('ahşap') || fullContext.includes('yatak') || fullContext.includes('dolap') || fullContext.includes('masa') || fullContext.includes('halı')) {
    environment = 'doğal güneş ışığı alan modern, minimalist ve ferah bir iç mekan yaşam alanı'
    act1Focus = 'kumaş ve ahşap malzemenin zarif dokuma detayları, dikiş kalitesi ve pürüzsüz cila'
    act2Action = 'mobilyanın yaşam alanına kattığı konfor, zarafet ve fonksiyonellik'
    act3Climax = 'tüm odayı ve mobilyanın uyumunu sergileyen ilham verici geniş salon sahnesi'
  } else if (fullContext.includes('giyim') || fullContext.includes('moda') || fullContext.includes('ayakkabı') || fullContext.includes('çanta') || fullContext.includes('butik') || fullContext.includes('elbise') || fullContext.includes('ceket')) {
    environment = 'modern bir moda stüdyosu veya şık bir şehir caddesi'
    act1Focus = 'kumaşın kaliteli dokuması, zarif dikiş hatları ve birinci sınıf malzeme parlaklığı'
    act2Action = 'ürünün üzerdeki dinamik duruşu, akıcı kumaş hareketi ve şık tasarım çizgisi'
    act3Climax = 'tüm kombini ve stil sahibi duruşu öne çıkaran sinematik podyum / cadde planı'
  } else if (fullContext.includes('kozmetik') || fullContext.includes('parfüm') || fullContext.includes('güzellik') || fullContext.includes('cilt') || fullContext.includes('bakım') || fullContext.includes('krem') || fullContext.includes('serum')) {
    environment = 'aydınlık, ferah ve lüks bir spa veya minimalist banyo atmosferi'
    act1Focus = 'şişenin cam yansımaları, mikro damlacık dokusu ve ürünün berrak saf kıvamı'
    act2Action = 'ürünün cilde nazikçe uygulanışı, kadifemsi emilişi ve ışıltılı tazeliği'
    act3Climax = 'ürünü ve tazeleyici saf güzellik hissini yansıtan zarif soft ışıklı geniş plan'
  } else if (fullContext.includes('elektronik') || fullContext.includes('telefon') || fullContext.includes('bilgisayar') || fullContext.includes('kulaklık') || fullContext.includes('cihaz') || fullContext.includes('teknoloji') || fullContext.includes('akıllı')) {
    environment = 'fütüristik, minimalist ve modern bir teknoloji stüdyosu'
    act1Focus = 'ürünün mat metalik kaplaması, mikro hassas kenarları ve kusursuz montajı'
    act2Action = 'cihazın akıcı kullanımı, parlak ekran netliği ve ergonomik kontrolü'
    act3Climax = 'ürünün şık tasarımını ve ileri mühendisliğini sergileyen dramatik stüdyo planı'
  } else if (fullContext.includes('otomotiv') || fullContext.includes('araç') || fullContext.includes('araba') || fullContext.includes('oto') || fullContext.includes('lastik') || fullContext.includes('servis') || fullContext.includes('yıkama') || fullContext.includes('yedek parça')) {
    environment = 'modern bir showroom veya gün batımında akıcı asfalt sahil yolu'
    act1Focus = 'parlatılmış gövdenin metalik yansımaları, aerodinamik hatlar ve işçilik kalitesi'
    act2Action = 'aracın yoldaki akıcı ve güven veren sürüş performansı, dinamik tekerlek dönüşü'
    act3Climax = 'aracın heybetli duruşunu ve yoldaki asaleti sergileyen sinematik geniş takip planı'
  } else if (fullContext.includes('temizlik') || fullContext.includes('deterjan') || fullContext.includes('hijyen') || fullContext.includes('yıkama') || fullContext.includes('dezenfektan')) {
    environment = 'pırıl pırıl, aydınlık ve ferah bir ev ortamı'
    act1Focus = 'ürünün aktif formülü, köpük dokusu ve ferahlatıcı mikro tanecikleri'
    act2Action = 'yüzeyin zahmetsizce temizlenişi, ardında bıraktığı ışıl ışıl ayna gibi parlaklık'
    act3Climax = 'tertemiz, kusursuz ve hijyenik yaşam alanını gösteren aydınlık geniş plan'
  } else if (fullContext.includes('takı') || fullContext.includes('mücevher') || fullContext.includes('saat') || fullContext.includes('altın') || fullContext.includes('pırlanta') || fullContext.includes('gümüş') || fullContext.includes('kolye') || fullContext.includes('yüzük') || fullContext.includes('bileklik')) {
    environment = 'karanlık ve lüks bir mücevher stüdyosu, kadife zemin ve odaklanmış kristal spot ışıkları'
    act1Focus = 'değerli taşların ve parlatılmış metalin mikro prizmatik ışık kırılmaları, kusursuz faset kesimleri ve lüks yansımaları'
    act2Action = 'mücevherin zarif bir ışık hüzmesi altında yavaşça dönmesi, ışıltının her açıdan parıldayan büyüleyici dansı'
    act3Climax = 'ürünün tüm asaleti ve prestijini gözler önüne seren nefes kesici lüks hero planı'
  } else if (fullContext.includes('spor') || fullContext.includes('fitness') || fullContext.includes('gym') || fullContext.includes('antrenman') || fullContext.includes('outdoor') || fullContext.includes('kamp') || fullContext.includes('koşu') || fullContext.includes('protein') || fullContext.includes('bisiklet')) {
    environment = 'modern, dinamik ve enerjik bir fitness kulübü veya gün doğumunda sisli bir dağ patikası'
    act1Focus = 'ürünün nefes alan aerodinamik teknik dokusu, sağlam dikişleri ve yüksek performanslı malzemesi'
    act2Action = 'ürünün dinamik hareket anındaki esnekliği ve gücü, 120fps ağır çekim ile performans detayı'
    act3Climax = 'ürünün kazandırdığı motivasyonu, dinamizmi ve üstün performansı yansıtan güçlü geniş açı'
  } else if (fullContext.includes('sağlık') || fullContext.includes('medikal') || fullContext.includes('diş') || fullContext.includes('klinik') || fullContext.includes('optik') || fullContext.includes('gözlük') || fullContext.includes('eczane') || fullContext.includes('doktor')) {
    environment = 'tertemiz, aydınlık, beyaz ve güven verici bir modern klinik veya optik stüdyosu'
    act1Focus = 'ürünün steril, medikal kalitede pürüzsüz yüzeyi, ergonomik hatları ve hassas mühendisliği'
    act2Action = 'ürünün güven ve konfor sağlayan pratik kullanımı, hassas ve profesyonel dokunuşlar'
    act3Climax = 'ferah, sağlıklı ve güven veren bir atmosferde ürünün estetiğini sergileyen berrak plan'
  } else if (fullContext.includes('emlak') || fullContext.includes('gayrimenkul') || fullContext.includes('villa') || fullContext.includes('daire') || fullContext.includes('rezidans') || fullContext.includes('konut') || fullContext.includes('arsa')) {
    environment = 'gün batımında havuzlu modern bir lüks villa veya panoramik manzaralı rezidans terası'
    act1Focus = 'geniş cam cepheler, mermer zeminler ve birinci sınıf mimari malzeme detayları'
    act2Action = 'iç mekandan gün batımı manzarasına doğru süzülen akıcı ve ferah gimbal / slider çekimi'
    act3Climax = 'yapının ışıklandırılmış heybetli ve büyüleyici akşam siluetini gösteren sinematik geniş açı'
  } else if (fullContext.includes('eğitim') || fullContext.includes('kitap') || fullContext.includes('kırtasiye') || fullContext.includes('sanat') || fullContext.includes('hobi') || fullContext.includes('kurs') || fullContext.includes('okul')) {
    environment = 'sıcak ahşap raflı modern bir kütüphane veya aydınlık, ilham dolu bir tasarım atölyesi'
    act1Focus = 'kaliteli kâğıdın mikro dokusu, kabartma kapak işçiliği veya boya pigmentlerinin canlı renkleri'
    act2Action = 'sayfaların veya fırça darbelerinin akıcı, ilham verici hareketi, odaklanmış yaratıcı an'
    act3Climax = 'tüm çalışma masasını ve yaratıcı atmosferi kucaklayan sıcak ve dingin geniş sahne'
  }

  const styleMood = VIDEO_STYLE_MOODS[snapshot.style] || VIDEO_STYLE_MOODS.auto
  const toneDesc = kit?.tone ? `Marka tonu: ${kit.tone}.` : ''
  const brandPresence = brandName
    ? snapshot.useLogo !== false && kit?.logoPath
      ? `Marka Kimliği: Videoda ${brandName} işletme adı ve ekli gerçek kurumsal logo doğal, büyük ve okunabilir fiziksel marka yüzeylerinde yer almalıdır: ürün gövdesi/ambalaj etiketi, iş kıyafeti nakışı, araç gövde etiketi, dükkan/fabrika giriş tabelası veya ana hero üründeki marka plakası. Küçük masa standı, elde taşınan mini tabela veya rastgele CTA levhası kullanma. Logoyu yeniden tasarlama; ekli referanstaki oran, amblem ve renkleri koru.`
      : `Marka Kimliği: Videoda ${brandName} işletme adı doğal, büyük ve okunabilir fiziksel marka yüzeylerinde yer almalıdır: ürün etiketi, iş kıyafeti, araç etiketi, dükkan/fabrika giriş tabelası veya ana hero üründeki marka plakası. Küçük masa standı, elde taşınan mini tabela veya rastgele CTA levhası kullanma. Hayali amblem üretme.`
    : null

  // 4. Ses / Konuşma Kurgusu (Voiceover vs Silent Instrumental)
  const isSpeechEnabled = snapshot.videoSpeech !== false
  let rawBrief = (snapshot.brief || '').replace(/[\r\n]+/g, ' ').trim()
  rawBrief = rawBrief.replace(/[\.\s]+$/, '').trim()

  const promoEmphasis = (mainProduct?.promo || snapshot.customText || '').replace(/[\r\n]+/g, ' ').replace(/[\.\s]+$/, '').trim()
  const customCta = (snapshot.cta || '').replace(/[\r\n]+/g, ' ').replace(/[\.\s]+$/, '').trim()
  const ctaClosing = customCta
    ? (customCta.toLowerCase().includes('geçin') || customCta.toLowerCase().includes('alın') || customCta.toLowerCase().includes('verin')
        ? `${customCta}.`
        : `${customCta} için hemen bizimle iletişime geçin.`)
    : 'Fiyat teklifi ve detaylı bilgi için hemen bizimle iletişime geçin.'

  let voiceLine = ''
  if (rawBrief) {
    const briefLower = rawBrief.toLowerCase()
    const hasCTA =
      briefLower.includes('iletişim') ||
      briefLower.includes('ulaşın') ||
      briefLower.includes('yazın') ||
      briefLower.includes('arayın') ||
      briefLower.includes('bağlanın') ||
      briefLower.includes('geçin')

    if (promoEmphasis && !briefLower.includes(promoEmphasis.toLowerCase())) {
      voiceLine = `${rawBrief}. ${promoEmphasis}. ${hasCTA ? '' : ctaClosing}`.replace(/\s+/g, ' ').trim()
    } else if (hasCTA) {
      voiceLine = `${rawBrief}.`
      voiceLine = `${rawBrief}. ${ctaClosing}`
    }
  } else {
    voiceLine = `${brandName ? `${brandName} ` : ''}${productName ? `${productName} kalitesi ` : ''}şimdi projenizde. ${promoEmphasis ? `${promoEmphasis}. ` : ''}${ctaClosing}`.replace(/\s+/g, ' ').trim()
  }

  // v4 Seslendirme Kuralı: 8 saniyelik klip için en fazla 18 kelime, ideal 10-14 kelime
  const voiceWords = voiceLine.split(/\s+/).filter(Boolean)
  if (voiceWords.length > 18) {
    voiceLine = voiceWords.slice(0, 14).join(' ') + ' için hemen iletişime geçin.'
  }
  const voiceSection = isSpeechEnabled
    ? `SESLENDİRME VE TÜRKÇE REKLAM DIŞ SESİ: Kristal netliğinde profesyonel Türkçe erkek reklam spikeri sesi: ${voiceLine}`
    : `SES DÜZENİ (KONUŞMASIZ & SADECE FON MÜZİĞİ VE SES EFEKTLERİ): Videoda KESİNLİKLE hiçbir insan konuşması, dış ses, seslendirme veya diyalog OLMAYACAKTIR. STRICT RULE: NO VOICE, NO SPEECH, NO SPOKEN WORDS, NO DIALOGUE. Sadece sahneye uygun yüksek kaliteli ortam ses efektleri (foley) ve arka planda modern reklam fon müziği.`

  const prompt = [
    `9:16 dikey formatta, 8 saniyelik üst düzey Türk televizyon ve sinema reklam filmi (Instagram Reels & WhatsApp Durum).`,
    brandName ? `Marka: ${brandName}.` : null,
    brandPresence,
    `Ürün: ${productName}.`,
    productBlocks.length ? `Ürün Kataloğu ve Detayları:\n${productBlocks.join('\n')}` : null,
    campaignContext.length ? `Kampanya Ayrıntıları:\n${campaignContext.join('\n')}` : null,
    `Tek Lokasyon ve Çekim Ortamı: ${environment}. Tek mekan devamlılığı, tutarlı ışık kurulumu ve sıfır gereksiz mekan değişimi.`,
    `Görsel Stil ve Işık Atmosferi: ${styleMood} ${toneDesc}`,
    `Sinematografi ve Kamera: Shot on Arri Alexa Mini LF, Master Prime 100mm macro & 35mm sinema lensleri. 180 derece obtüratör açısı, tek akıcı kamera hareketi, doğal sığ alan derinliği (f/1.8), zarif sinematik bokeh. 4K HDR fotogerçekçi reklam ajansı renk derecelendirmesi (color grading).`,
    `SAHNE 1 (0.0s - 2.2s - GÖRSEL KANCA & MAKRO DETAY): Kamera aşırı yakın plan makro odakla yaklaşır. ${act1Focus}. Işığın yüzeyde yarattığı yumuşak yansımalar ve birinci sınıf işçilik ön plandadır.`,
    `SAHNE 2 (2.2s - 5.8s - DİNAMİK KULLANIM & İŞLEV KANITI): Kamera akıcı bir gimbal kaymasıyla sahneye genişler. ${act2Action}. Ürünün gerçek hayat ortamındaki güvenilir performansı ve pratik faydası sergilenir.`,
    `SAHNE 3 (5.8s - 8.0s - ODAK KAHRAMAN FİNALİ): Kamera geriye ve hafif yukarı doğru yükselerek kahraman (hero) kadrajına geçer. ${act3Climax}. İlham verici aydınlık ışık, sıcak kontrastlar, üstün kalite hissi.`,
    voiceSection,
    `ÖNEMLİ VE KESİN KURAL 1 (MARKALI HAM VIDEO, METIN ÇORBASI YOK): Ham videoda fiyat, indirim, telefon, uzun kampanya metni, altyazı, CTA butonu, bilgi kutusu, grafik overlay, banner veya lower-third OLMAYACAKTIR. Veo'nun bozduğu küçük yazılardan kaçın: küçük masa levhası, elde taşınan küçük pankart, arka plan raf etiketi, karmaşık ekran metni ve rastgele CTA tabelası yasaktır. Ancak gerçek dünyadaki fiziksel marka kimliği SERBESTTİR: ürün üzerindeki orijinal logo/etiket, büyük dükkan/fabrika tabelası, araç etiketi, önlük nakışı veya ana hero üründeki marka plakası gibi doğal yüzeylerde ${brandName || 'işletme'} adı ve varsa ekli gerçek logo görünmelidir. Marka renk paleti sahnenin objelerinde, kıyafette, ürün gövdesinde ve ışık aksanlarında kullanılmalıdır; hex kod yazma. STRICT RULE: NO GIBBERISH WORDS, NO SMALL TEXT, NO RANDOM CTA SIGNS, NO PRICES, NO DISCOUNTS, NO PHONE NUMBERS, NO SUBTITLES, NO CAPTIONS, NO GRAPHIC OVERLAYS, NO BANNERS, NO LOWER THIRDS. ALLOW LARGE CLEAN PHYSICAL BRAND SIGNAGE AND ORIGINAL LOGO ONLY.`,
    `ÖNEMLİ VE KESİN KURAL 2 (MARKA VE ÜRÜN DOKUNULMAZLIĞI): Marka logosu, amblemi, renkleri ve gerçek ürün tasarımı üzerinde KESİNLİKLE hiçbir oynama, değişiklik, deformasyon veya varyasyon YAPILMAYACAKTIR. Ürünün gerçek fiziksel kasası, formu, renkleri ve amblemi %100 birebir korunacaktır. Hayali veya dönüştürülmüş ürün varyasyonları kesinlikle üretilmeyecektir. STRICT MANDATE: ZERO ALTERATION TO BRAND LOGO OR PRODUCT IDENTITY. PRESERVE ORIGINAL EMBLEM, COLORS, AND PHYSICAL PRODUCT FORM EXACTLY. NO PRODUCT MORPHING, NO LOGO REINVENTION.`,
  ]
    .filter(Boolean)
    .join('\n')

  const negative = [
    'duplicate subject',
    'duplicate product',
    'altered product geometry',
    'incorrect product color',
    'warped packaging',
    'warped logo',
    'gibberish typography',
    'floating graphics',
    'holographic interface',
    'unmotivated location change',
    'identity drift',
    'extra fingers',
    'deformed hands',
    'unsafe product use',
    'watermark',
    'gibberish words, misspelled words, small text, random CTA signs, handheld sign, desk sign, prices, discounts, phone numbers, long text, subtitles, captions, floating typography, logo overlay, graphic box, lower third, banner, card',
    'cartoon, 3D animation look, cgi render, uncanny valley',
    'blurry artifacts, low quality, pixelated, amateur video, jump cuts, jerky camera',
  ].join(', ')

  const offerTitle = snapshot.brief || 'ÖZEL KAMPANYA'
  const offerDetails =
    mainProduct?.promo || (mainProduct?.price ? `Fiyat: ${mainProduct.price}` : snapshot.customText || '')
  const ctaText =
    snapshot.cta ||
    (snapshot.phones?.[0]?.phone ? `WHATSAPP: ${snapshot.phones[0].phone}` : 'WHATSAPP SIPARIS HATTI')

  return {
    prompt,
    negative,
    overlay: {
      brandName,
      subTitle: kit?.tone ? kit.tone.slice(0, 35) : 'Yetkili Satış & Sipariş',
      offerTitle,
      offerDetails,
      ctaText,
      primaryColor: kit?.colors?.background || kit?.colors?.primary || '#026009',
      accentColor: kit?.colors?.accent || '#acfe00',
    },
  }
}
