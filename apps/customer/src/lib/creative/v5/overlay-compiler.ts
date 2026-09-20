import type {
  FactNormalizerOutput,
  OntologyClassification,
  VoiceoverOutput,
  OverlayPlanOutput,
  OverlayItem,
} from './schemas'

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
  const subject = facts.verifiedFacts.offerName || 'Özel Fırsat'
  const brand = facts.verifiedFacts.brandName

  // 1. Hook Headline (0.3s - 2.0s)
  const hookText = brand ? `${brand} ${subject}`.toUpperCase() : subject.toUpperCase()
  timeline.push({
    from: 0.3,
    to: 2.0,
    type: 'hook',
    text: hookText.slice(0, 35),
    placement: 'upper_safe_area',
  })

  // 2. Offer / Feature Banner (2.4s - 5.6s) - ONLY if verified in facts
  if (facts.verifiedFacts.discount || facts.verifiedFacts.price) {
    const offerText = facts.verifiedFacts.discount
      ? `${facts.verifiedFacts.discount}`.toUpperCase()
      : `FİYAT: ${facts.verifiedFacts.price}`.toUpperCase()

    timeline.push({
      from: 2.4,
      to: 5.6,
      type: 'offer',
      text: offerText.slice(0, 40),
      placement: 'center_safe_area',
    })
  }

  // 3. CTA (6.0s - 8.0s) - Matched to campaign objective
  let ctaText = 'BİZİMLE İLETİŞİME GEÇİN'
  if (ontology.campaignObjective === 'direct_order') {
    ctaText = 'SİPARİŞ VER'
  } else if (ontology.campaignObjective === 'quote_request') {
    ctaText = 'FİYAT TEKLİFİ ALIN'
  } else if (ontology.campaignObjective === 'appointment_booking') {
    ctaText = 'RANDEVU ALIN'
  } else if (ontology.campaignObjective === 'store_visit') {
    ctaText = 'MAĞAZAMIZI ZİYARET EDİN'
  }

  if (facts.verifiedFacts.phones.length > 0) {
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
