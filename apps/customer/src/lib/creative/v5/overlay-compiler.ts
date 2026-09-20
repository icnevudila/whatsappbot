import type {
  FactNormalizerOutput,
  OntologyClassification,
  VoiceoverOutput,
  OverlayPlanOutput,
  OverlayItem,
} from './schemas'

/**
 * Derives a punchy 2-4 word hook headline from verified benefit, problem, or offer.
 * Rule: NEVER default to just "MARKA + ÜRÜN", and NEVER invent unverified hype claims (kusursuz, özel reçeteli, anlık).
 */
export function deriveHookHeadline(
  facts: FactNormalizerOutput,
  ontology: OntologyClassification,
): string {
  const discount = facts.verifiedFacts.discount
  const benefits = facts.verifiedFacts.benefits
  const features = facts.verifiedFacts.features
  const rawBrief = facts.verifiedFacts.rawBrief.toLowerCase()

  // 1. If discount or promo is verified, highlight the concrete offer
  if (discount) {
    if (discount.includes('%')) {
      const match = discount.match(/%\s*\d+|\d+\s*%/)?.[0] || discount
      return `${match} TOPTAN İSKONTO`.toLocaleUpperCase('tr-TR')
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
  if (rawBrief.includes('yorulmadan') || rawBrief.includes('basınç')) {
    return 'YORULMADAN YÜKSEK BASINÇ'
  }
  if (rawBrief.includes('harita') || rawBrief.includes('tespit')) {
    return 'CANLI İŞLETME İSTİHBARATI'
  }

  // 4. Derive from primary value & ontology (strictly 2-4 words, ZERO unverified claims like kusursuz/özel reçeteli/anlık)
  if (ontology.primaryValue === 'reduces_effort') return 'KOLAY VE PRATİK KULLANIM'
  if (ontology.primaryValue === 'speed') return 'HIZLI VE ETKİN ÇÖZÜM'
  if (ontology.primaryValue === 'price_or_value') return 'AVANTAJLI FİYAT TEKLİFİ'
  if (ontology.primaryValue === 'sensory_appeal') return 'ÖZENLE HAZIRLANAN MENÜ'
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
 * Overlay / Subtitle Compiler
 * Compiles dynamic graphics, typography, subtitles and CTAs for CapCut/post-production.
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

  // 2. Offer / Feature Banner (2.4s - 5.6s) - ONLY if verified in facts
  if (facts.verifiedFacts.discount || facts.verifiedFacts.price) {
    const offerText = facts.verifiedFacts.discount
      ? `${facts.verifiedFacts.discount}`.toLocaleUpperCase('tr-TR')
      : `FİYAT: ${facts.verifiedFacts.price}`.toLocaleUpperCase('tr-TR')

    timeline.push({
      from: 2.4,
      to: 5.6,
      type: 'offer',
      text: offerText,
      placement: 'center_safe_area',
    })
  }

  // 3. Optional Delivery Area / Campaign Deadline badges (2.4s - 5.6s) if verified
  if (facts.verifiedFacts.deliveryArea) {
    timeline.push({
      from: 2.4,
      to: 5.6,
      type: 'offer',
      text: `TESLİMAT: ${facts.verifiedFacts.deliveryArea.toLocaleUpperCase('tr-TR')}`,
      placement: 'lower_safe_area',
    })
  } else if (facts.verifiedFacts.campaignDeadline) {
    timeline.push({
      from: 2.4,
      to: 5.6,
      type: 'offer',
      text: `SON GÜN: ${facts.verifiedFacts.campaignDeadline.toLocaleUpperCase('tr-TR')}`,
      placement: 'lower_safe_area',
    })
  }

  // 4. CTA (6.0s - 8.0s) - Preserves user-provided ctaText or matches campaign objective
  let ctaText = facts.verifiedFacts.ctaText
    ? facts.verifiedFacts.ctaText.toLocaleUpperCase('tr-TR')
    : 'BİZİMLE İLETİŞİME GEÇİN'

  if (!facts.verifiedFacts.ctaText) {
    if (ontology.campaignObjective === 'direct_order') {
      ctaText = 'SİPARİŞ VER'
    } else if (ontology.campaignObjective === 'quote_request') {
      ctaText = 'FİYAT TEKLİFİ ALIN'
    } else if (ontology.campaignObjective === 'appointment_booking') {
      ctaText = 'RANDEVU ALIN'
    } else if (ontology.campaignObjective === 'store_visit') {
      ctaText = 'MAĞAZAMIZI ZİYARET EDİN'
    }
  }

  // Append WhatsApp destination if phone is present and not already mentioned
  if (facts.verifiedFacts.phones.length > 0 && !ctaText.includes('WHATSAPP')) {
    ctaText = `${ctaText} · WHATSAPP`
  }

  timeline.push({
    from: 6.0,
    to: 8.0,
    type: 'cta',
    text: ctaText,
    placement: 'lower_safe_area',
  })

  return {
    overlayTimeline: timeline,
    subtitles: {
      enabled: true,
      mode: 'synchronized_voiceover',
      safeArea: '9:16',
      sourceText: voiceover.text,
    },
    brandWatermarkOrLogoPlacement: {
      enabled: facts.assets.logoReference,
      sourceAsset: facts.assets.logoReferenceUrl || null,
    },
  }
}
