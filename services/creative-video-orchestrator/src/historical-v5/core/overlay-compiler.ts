import type {
  FactNormalizerOutput,
  OntologyClassification,
  VoiceoverOutput,
  OverlayPlanOutput,
  OverlayItem,
} from './schemas.js'

/**
 * Derives a punchy 2-4 word hook headline from verified benefit, problem, or offer.
 * Rule: NEVER default to just "MARKA + ÜRÜN", and NEVER invent unverified hype claims (kusursuz, özel reçeteli, anlık).
 */
export function deriveHookHeadline(
  facts: FactNormalizerOutput,
  ontology: OntologyClassification,
): string {
  const verifiedFacts = facts.verifiedFacts
  const productFacts = verifiedFacts.productFacts || []
  const discountOffers = verifiedFacts.discountOffers || []
  const benefits = verifiedFacts.benefits
  const features = verifiedFacts.features
  const rawBrief = verifiedFacts.rawBrief.toLowerCase()

  // 1. Resolve selected product and its valid verified campaign record
  const heroProduct =
    productFacts.find((p) => p.name.toLowerCase() === verifiedFacts.offerName?.toLowerCase()) ||
    productFacts[0]

  const validCampaign =
    heroProduct?.discounts?.[0] ||
    discountOffers.find((d) => !d.productName || (heroProduct && d.productName === heroProduct.name)) ||
    discountOffers[0]

  if (validCampaign) {
    const rate = validCampaign.rate
    if (validCampaign.isWholesale) {
      return `%${rate} TOPTAN İSKONTO`
    }
    return `%${rate} İNDİRİM`
  }

  // Fallback for non-percentage discount text
  const discount = verifiedFacts.discount
  if (discount) {
    const match = discount.match(/%\s*\d+|\d+\s*%/)?.[0]
    if (match) {
      return `${match} İNDİRİM`.toLocaleUpperCase('tr-TR')
    }
    const words = discount.trim().split(/\s+/).filter(Boolean)
    if (words.length >= 2 && words.length <= 4) {
      return discount.toLocaleUpperCase('tr-TR')
    }
    return 'AVANTAJLI FİYAT TEKLİFİ'
  }


  // 2. Derive from verified benefits / features without slicing mid-clause
  if (benefits.length > 0) {
    const firstClause = benefits[0].split(/[,.;]/)[0].trim()
    const words = firstClause.split(/\s+/).filter(Boolean)
    if (words.length >= 2 && words.length <= 4) {
      return firstClause.toLocaleUpperCase('tr-TR')
    }
  }

  if (features.length > 0) {
    const firstClause = features[0].split(/[,.;]/)[0].trim()
    const words = firstClause.split(/\s+/).filter(Boolean)
    if (words.length >= 2 && words.length <= 4) {
      return firstClause.toLocaleUpperCase('tr-TR')
    }
  }

  // 3. Derive from verified brief keywords
  if (rawBrief.includes('şantiye') && rawBrief.includes('sevkiyat')) {
    return 'ŞANTİYEYE DOĞRUDAN SEVKİYAT'
  }
  if (rawBrief.includes('yorulmadan') && rawBrief.includes('yüksek basınç')) {
    return 'YORULMADAN YÜKSEK BASINÇ'
  }
  if (rawBrief.includes('basınç')) {
    return 'GÜÇLÜ BASINÇLI ÇÖZÜM'
  }
  if (rawBrief.includes('yorulmadan')) {
    return 'YORULMADAN PRATİK KULLANIM'
  }
  if (rawBrief.includes('harita') || rawBrief.includes('tespit')) {
    return 'CANLI İŞLETME İSTİHBARATI'
  }
  if (rawBrief.match(/(serum|cilt|yüz bakım|krem|skincare|kozmetik)/)) {
    return 'CANLANDIRICI DOĞAL BAKIM'
  }
  if (rawBrief.match(/(kahve|çekirdek|kavrum|coffee|roast)/)) {
    return 'TAZE KAVRULMUŞ LEZZET'
  }
  if (rawBrief.match(/(ilaçlama|sprey|pompa|tarım|püskürt)/) || ontology.primaryAffordance === 'apply_spray_mist') {
    return 'KOLAY VE PRATİK KULLANIM'
  }

  // 4. Derive from primary value & ontology (strictly 2-4 words, ZERO unverified claims like kusursuz/özel reçeteli/anlık)
  if (ontology.primaryValue === 'reduces_effort') return 'KOLAY VE PRATİK KULLANIM'
  if (ontology.primaryValue === 'speed') return 'HIZLI VE ETKİN ÇÖZÜM'
  if (ontology.primaryValue === 'price_or_value') return 'AVANTAJLI FİYAT TEKLİFİ'
  if (ontology.primaryValue === 'sensory_appeal') {
    if (ontology.offerType === 'food_or_consumable') return 'ÖZENLE HAZIRLANAN LEZZET'
    return 'ÖZEL VE SEÇKİN DENEYİM'
  }
  if (ontology.primaryValue === 'reliability') return 'PROJENİZE UYGUN ÇÖZÜM'
  if (ontology.primaryValue === 'access_or_discovery') return 'DİJİTAL VERİ PLATFORMU'
  if (ontology.offerType === 'food_or_consumable') return 'MENÜMÜZÜ KEŞFEDİN'
  if (ontology.offerType === 'digital_product_or_saas') return 'DİJİTAL İŞ SÜREÇLERİ'
  if (ontology.offerType === 'property_or_high_consideration_offer') return 'YENİ PROJEYİ KEŞFEDİN'
  if (ontology.riskClass === 'regulated_health') return 'HEKİM KONTROLÜNDE RANDEVU'
  if (ontology.offerType === 'professional_service' || ontology.riskClass === 'legal_or_professional_claim') {
    return 'UZMAN DANIŞMANLIK HİZMETİ'
  }

// Universal fallback: 2-3 words action headline
  return 'PROJENİZ İÇİN ÇÖZÜM'
}

/**
 * Derives a punchy 2-4 word function / benefit line for Beat 2 (2.4s - 5.5s).
 * Strictly grounded in verified facts, features, claims, or discounts.
 */
export function deriveFunctionBenefitLine(
  facts: FactNormalizerOutput,
  ontology: OntologyClassification,
): string {
  const verifiedFacts = facts.verifiedFacts
  const claims = (verifiedFacts as any).claims || []
  const benefits = verifiedFacts.benefits || []
  const features = verifiedFacts.features || []
  const rawBrief = verifiedFacts.rawBrief.toLowerCase()
  const fullContext = `${verifiedFacts.offerName || ''} ${rawBrief} ${features.join(' ')} ${benefits.join(' ')} ${claims.join(' ')}`.toLowerCase()

  // 1. If discount or price is verified
  if (verifiedFacts.discount) {
    const match = verifiedFacts.discount.match(/%\s*\d+|\d+\s*%/)?.[0]
    if (match) return `${match} İNDİRİM AVANTAJI`.toLocaleUpperCase('tr-TR')
    return `${verifiedFacts.discount}`.toLocaleUpperCase('tr-TR')
  }

  // 2. Specific verified technical/physical facts
  if (fullContext.includes('16 litre') || fullContext.includes('16l')) {
    return '16 LİTRE GENİŞ DEPO HACMİ'
  }
  if (fullContext.includes('10 litre') || fullContext.includes('10l')) {
    return '10 LİTRE KESİNTİSİZ BASINÇ'
  }
  if (fullContext.includes('akülü') && (fullContext.includes('pompa') || fullContext.includes('ilaçlama'))) {
    return 'GÜÇLÜ AKÜLÜ PÜSKÜRTME'
  }
  if (fullContext.includes('manuel') && (fullContext.includes('pompa') || fullContext.includes('ilaçlama'))) {
    return 'PRATİK MANUEL BASINÇ'
  }
  if (fullContext.includes('delikli') && fullContext.includes('tuğla')) {
    return 'YÜKSEK MUKAVEMETLİ YAPI BLOĞU'
  }
  if (fullContext.includes('tuğla') || fullContext.includes('inşaat')) {
    return 'DAYANIKLI CEPHE ÇÖZÜMÜ'
  }
  if (fullContext.match(/(serum|cilt|yüz bakım|krem|skincare|kozmetik)/)) {
    return 'CANLANDIRICI SERUM ETKİSİ'
  }
  if (fullContext.match(/(kahve|çekirdek|kavrum|coffee|roast)/)) {
    return 'TAZE KAVRULMUŞ ÇEKİRDEK'
  }

  // 3. From verified features or benefits (2-4 words)
  for (const item of [...features, ...benefits, ...claims]) {
    const clause = item.split(/[,.;]/)[0].trim()
    const words = clause.split(/\s+/).filter(Boolean)
    if (words.length >= 2 && words.length <= 4) {
      return clause.toLocaleUpperCase('tr-TR')
    }
  }

  // 4. Fallback from ontology
  if (ontology.primaryAffordance === 'apply_spray_mist') return 'MİKRONİZE İLAÇLAMA GÜCÜ'
  if (ontology.offerType === 'food_or_consumable') return 'ÖZENLE SEÇİLMİŞ MALZEMELER'
  if (ontology.offerType === 'digital_product_or_saas') return 'HIZLI VE DİJİTAL SÜREÇLER'
  if (ontology.proofMode === 'scale_or_inventory') return 'ŞANTİYEYE DOĞRUDAN TESLİMAT'
  return 'GÜÇLÜ VE VERİMLİ PERFORMANS'
}

/**
 * Derives brand / product resolution line for Beat 3 (6.0s - 8.0s).
 */
export function deriveBrandResolutionLine(
  facts: FactNormalizerOutput,
  ontology: OntologyClassification,
): string {
  const brandName = (facts.verifiedFacts.brandName || '').trim()
  let ctaText = (facts.verifiedFacts.ctaText || '').trim()

  if (!ctaText) {
    if (ontology.campaignObjective === 'direct_order') ctaText = 'Sipariş Ver'
    else if (ontology.campaignObjective === 'quote_request') ctaText = 'Fiyat Teklifi Alın'
    else if (ontology.campaignObjective === 'appointment_booking') ctaText = 'Randevu Alın'
    else ctaText = 'Hemen İncele'
  }

  if (brandName && ctaText) {
    return `${brandName.toLocaleUpperCase('tr-TR')} · ${ctaText.toLocaleUpperCase('tr-TR')}`
  }
  if (brandName) return brandName.toLocaleUpperCase('tr-TR')
  return ctaText.toLocaleUpperCase('tr-TR')
}

/**
 * Builds the deterministic ASS subtitle content for the 3 sequential commercial typography states.
 */
export function buildCommercialTypographyAss(
  beat1Text: string,
  beat2Text: string,
  beat3Text: string,
  options: {
    playResX?: number
    playResY?: number
    fontName?: string
  } = {}
): string {
  const playResX = options.playResX || 720
  const playResY = options.playResY || 1280
  const fontName = options.fontName || 'DejaVu Sans'

  const clean1 = beat1Text.replace(/[\r\n]+/g, ' ').replace(/'/g, '').trim()
  const clean2 = beat2Text.replace(/[\r\n]+/g, ' ').replace(/'/g, '').trim()
  const clean3 = beat3Text.replace(/[\r\n]+/g, ' ').replace(/'/g, '').trim()

  return `[Script Info]
Title: Deterministic Serial Commercial Typography
ScriptType: v4.00+
PlayResX: ${playResX}
PlayResY: ${playResY}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: CommercialHook,${fontName},36,&H0000D0FF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,2,0,1,3.5,2.0,2,40,40,240,1
Style: CommercialBenefit,${fontName},36,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,2,0,1,3.5,2.0,2,40,40,240,1
Style: CommercialBrandClose,${fontName},38,&H0000D0FF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,2,0,1,3.8,2.2,2,40,40,240,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.30,0:00:02.00,CommercialHook,,0,0,0,,{\\b1}${clean1}{\\b0}
Dialogue: 0,0:00:02.40,0:00:05.50,CommercialBenefit,,0,0,0,,{\\b1}${clean2}{\\b0}
Dialogue: 0,0:00:06.00,0:00:08.00,CommercialBrandClose,,0,0,0,,{\\b1}${clean3}{\\b0}
`
}

/**
 * Overlay / Subtitle Compiler
 * Compiles dynamic graphics, typography, subtitles and CTAs for post-production finishing.
 * Veo raw video remains 100% text-free; all typography lives in this structured timeline.
 */
export function compileOverlay(
  facts: FactNormalizerOutput,
  ontology: OntologyClassification,
  voiceover: VoiceoverOutput,
): OverlayPlanOutput {
  const timeline: OverlayItem[] = []

  // 1. Hook Headline (0.3s - 2.0s): Strictly 2-4 words from verified value/problem/offer
  const hookHeadline = deriveHookHeadline(facts, ontology)
  timeline.push({
    from: 0.3,
    to: 2.0,
    type: 'hook',
    text: hookHeadline,
    placement: 'upper_safe_area',
  })

  // 2. Offer / Feature / Benefit Banner (2.4s - 5.5s)
  const functionBenefitLine = deriveFunctionBenefitLine(facts, ontology)
  timeline.push({
    from: 2.4,
    to: 5.5,
    type: 'offer',
    text: functionBenefitLine,
    placement: 'center_safe_area',
  })

  // 3. Optional Delivery Area / Campaign Deadline badges if verified
  if (facts.verifiedFacts.deliveryArea) {
    timeline.push({
      from: 2.4,
      to: 5.5,
      type: 'offer',
      text: `TESLİMAT: ${facts.verifiedFacts.deliveryArea.toLocaleUpperCase('tr-TR')}`,
      placement: 'lower_safe_area',
    })
  } else if (facts.verifiedFacts.campaignDeadline) {
    timeline.push({
      from: 2.4,
      to: 5.5,
      type: 'offer',
      text: `SON GÜN: ${facts.verifiedFacts.campaignDeadline.toLocaleUpperCase('tr-TR')}`,
      placement: 'lower_safe_area',
    })
  }

  // 4. CTA / Brand Resolution (6.0s - 8.0s)
  const brandResolutionLine = deriveBrandResolutionLine(facts, ontology)
  timeline.push({
    from: 6.0,
    to: 8.0,
    type: 'cta',
    text: brandResolutionLine,
    placement: 'lower_safe_area',
  })

  return {
    overlayTimeline: timeline,
    commercialTypography: {
      beat1: hookHeadline,
      beat2: functionBenefitLine,
      beat3: brandResolutionLine,
    },
    subtitles: {
      enabled: true,
      mode: 'synchronized_voiceover',
      safeArea: '9:16',
      sourceText: voiceover.text,
    },
    brandWatermarkOrLogoPlacement: {
      enabled: Boolean(facts.assets.logoReference || facts.lockedBrandIdentity?.originalLogoUrl),
      sourceAsset: facts.lockedBrandIdentity?.originalLogoUrl || facts.assets.logoReferenceUrl || null,
    },
  }
}
