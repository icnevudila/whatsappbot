import type {
  FactNormalizerOutput,
  OntologyClassification,
  VoiceoverOutput,
  OverlayPlanOutput,
  OverlayItem,
} from './schemas'

/**
 * Derives a punchy 2-4 word hook headline from verified benefit, problem, or offer.
 * Rule: NEVER default to just "MARKA + ÜRÜN".
 */
export function deriveHookHeadline(
  facts: FactNormalizerOutput,
  ontology: OntologyClassification,
): string {
  const brand = facts.verifiedFacts.brandName
  const subject = facts.verifiedFacts.offerName || 'FIRSAT'
  const discount = facts.verifiedFacts.discount
  const benefits = facts.verifiedFacts.benefits
  const features = facts.verifiedFacts.features
  const rawBrief = facts.verifiedFacts.rawBrief.toLowerCase()

  // 1. If discount or promo is verified, highlight the concrete offer
  if (discount) {
    if (discount.includes('%')) {
      const match = discount.match(/%\s*\d+|\d+\s*%/)?.[0] || discount
      return `${match} TOPTAN AVANTAJI`.toUpperCase()
    }
    const words = discount.trim().split(/\s+/).slice(0, 3).join(' ')
    return words.toUpperCase()
  }

  // 2. Derive from verified benefits / features
  if (benefits.length > 0) {
    const candidate = benefits[0].replace(/[.,]/g, '').trim().split(/\s+/)
    if (candidate.length >= 2) {
      return candidate.slice(0, 3).join(' ').toUpperCase()
    }
  }

  if (features.length > 0) {
    const candidate = features[0].replace(/[.,]/g, '').trim().split(/\s+/)
    if (candidate.length >= 2) {
      return candidate.slice(0, 3).join(' ').toUpperCase()
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

  // 4. Derive from primary value & ontology (strictly 2-4 words, never MARKA + URUN)
  if (ontology.primaryValue === 'reduces_effort') return 'ZAHMETSİZ HIZLI KULLANIM'
  if (ontology.primaryValue === 'speed') return 'HIZLI KESİNTİSİZ ÇÖZÜM'
  if (ontology.primaryValue === 'price_or_value') return 'ÖZEL FİYAT AVANTAJI'
  if (ontology.primaryValue === 'sensory_appeal') return 'ÖZEL REÇETELİ LEZZET'
  if (ontology.primaryValue === 'reliability') return 'DAYANIKLI KUSURSUZ YAPI'
  if (ontology.primaryValue === 'access_or_discovery') return 'ANLIK DOĞRU VERİ'
  if (ontology.offerType === 'food_or_consumable') return 'USTALIKLA HAZIRLANAN LEZZET'
  if (ontology.offerType === 'digital_product_or_saas') return 'AKILLI DİJİTAL ANALİTİK'
  if (ontology.offerType === 'property_or_high_consideration_offer') return 'AYRICALIKLI YAŞAM ALANI'
  if (ontology.riskClass === 'regulated_health') return 'UZMAN HEKİM KONTROLÜNDE'

  // Universal fallback: 2-3 words action headline
  return 'PROJENİZ İÇİN HAZIR'
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
      text: offerText.slice(0, 40),
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
    },
    brandWatermarkOrLogoPlacement: {
      enabled: facts.assets.logoReference,
      sourceAsset: facts.assets.logoReferenceUrl || null,
    },
  }
}
