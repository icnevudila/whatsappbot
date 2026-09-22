/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * DYNAMIC CREATIVE GRAMMAR ROUTER (V6 HARDENED)
 * 
 * Kesin İlke:
 * 1. Short Performance sabit bir süre şablonu (0-2, 2-5, 5-8, 8-10) DEĞİLDİR.
 *    Sadece semantic bir beat sırasıdır:
 *    ATTENTION -> PRODUCT UNDERSTANDING -> ACTION / PROOF -> RESULT -> BRAND RESOLUTION
 *    Bu sıra duration ve concept'e göre 1 continuous take, 2, 3 veya 4 dinamik sahne olabilir.
 * 2. Brand Film sabit bir inşaat şablonu (Felsefe -> Ham Madde -> Ustalık...) DEĞİLDİR.
 *    Semantic state progression sağlar:
 *    HOOK -> WORLD/CONTEXT -> TENSION/NEED -> INTERVENTION -> TRANSFORMATION/PROOF -> ESCALATION -> PAYOFF -> BRAND MEANING
 *    Hangi beat'lerin gerektiğini sektör, Strategic Promise ve seçilen Concept belirler.
 */

export type CommercialGrammarType = 'short_performance' | 'mid_form' | 'brand_film'
export type CampaignObjective = 'direct_response' | 'product_demonstration' | 'brand_awareness' | 'luxury_atmospheric'

export interface GrammarRoutePlan {
  grammarType: CommercialGrammarType
  allowedSceneCounts: number[] // e.g. [1, 2, 3, 4]
  preferredSceneCount: number
  semanticBeatProgression: string[]
  productExposureRange: { min: number; max: number; target: number }
  brandExposureRange: { min: number; max: number; target: number }
  cameraModePreferred: 'continuous_take' | 'directed_cuts'
  narrativeGuideline: string
  dynamicTimingModel: 'concept_driven' | 'pace_driven' | 'continuous_take'
}

export function routeCommercialGrammar(
  durationSeconds: number,
  options: {
    hasExactProductReference?: boolean
    campaignObjective?: CampaignObjective | string
    preferredPacing?: 'fast' | 'measured' | 'cinematic'
    sectorHint?: string
  } = {}
): GrammarRoutePlan {
  const d = Math.max(5, Math.min(60, Number(durationSeconds) || 8))
  const objective = (options.campaignObjective || 'direct_response') as CampaignObjective

  // 1. SHORT PERFORMANCE (6–12 SANİYE)
  if (d <= 12) {
    // Dynamic scene count: 1 continuous take, 2, 3 veya 4 scenes
    const allowed = d <= 7
      ? [1, 2]
      : d <= 9
        ? [1, 2, 3]
        : [1, 2, 3, 4]

    const preferred = options.hasExactProductReference && options.preferredPacing !== 'fast'
      ? 1 // Continuous take
      : d >= 10
        ? 3
        : 2

    // Dynamic product exposure targets based on objective
    const productExposureRange = objective === 'brand_awareness'
      ? { min: 0.35, max: 0.70, target: 0.50 }
      : objective === 'luxury_atmospheric'
        ? { min: 0.25, max: 0.60, target: 0.40 }
        : { min: 0.55, max: 0.85, target: 0.70 } // Direct response

    return {
      grammarType: 'short_performance',
      allowedSceneCounts: allowed,
      preferredSceneCount: preferred,
      semanticBeatProgression: [
        'attention',
        'product_understanding',
        'action_and_proof',
        'result',
        'brand_resolution',
      ],
      productExposureRange,
      brandExposureRange: { min: 0.15, max: 0.35, target: 0.25 },
      cameraModePreferred: preferred === 1 ? 'continuous_take' : 'directed_cuts',
      narrativeGuideline: 'Semantic beat akışı: ATTENTION -> PRODUCT UNDERSTANDING -> ACTION/PROOF -> RESULT -> BRAND RESOLUTION. Sabit süre dilimleri yasaktır; süreler concept ve beat sheet tarafından dinamik belirlenir.',
      dynamicTimingModel: preferred === 1 ? 'continuous_take' : 'concept_driven',
    }
  }

  // 2. MID FORM (13–24 SANİYE)
  if (d <= 24) {
    const productExposureRange = objective === 'brand_awareness'
      ? { min: 0.30, max: 0.60, target: 0.45 }
      : { min: 0.45, max: 0.75, target: 0.60 }

    return {
      grammarType: 'mid_form',
      allowedSceneCounts: [2, 3, 4, 5],
      preferredSceneCount: d >= 18 ? 4 : 3,
      semanticBeatProgression: [
        'hook',
        'world_and_need',
        'product_intervention',
        'transformation_and_proof',
        'result_and_brand',
      ],
      productExposureRange,
      brandExposureRange: { min: 0.12, max: 0.30, target: 0.20 },
      cameraModePreferred: 'directed_cuts',
      narrativeGuideline: 'İhtiyaç veya durum açılır, ürün çözüm olarak müdahale eder, somut fayda doğrulanır ve marka imzasıyla bağlanır.',
      dynamicTimingModel: 'concept_driven',
    }
  }

  // 3. BRAND FILM (25–60 SANİYE)
  const productExposureRange = objective === 'luxury_atmospheric'
    ? { min: 0.20, max: 0.50, target: 0.35 }
    : objective === 'brand_awareness'
      ? { min: 0.25, max: 0.60, target: 0.40 }
      : { min: 0.35, max: 0.70, target: 0.50 }

  return {
    grammarType: 'brand_film',
    allowedSceneCounts: [4, 5, 6, 7, 8],
    preferredSceneCount: d >= 45 ? 6 : 5,
    semanticBeatProgression: [
      'hook',
      'world_context',
      'tension_need',
      'intervention',
      'transformation_proof',
      'escalation',
      'payoff',
      'brand_meaning',
    ],
    productExposureRange,
    brandExposureRange: { min: 0.10, max: 0.25, target: 0.18 },
    cameraModePreferred: 'directed_cuts',
    narrativeGuideline: 'Semantic state progression: HOOK -> WORLD -> TENSION -> INTERVENTION -> TRANSFORMATION -> ESCALATION -> PAYOFF -> BRAND MEANING. Sektöre ve vaade özel özgün beat seçimi yapılır.',
    dynamicTimingModel: 'pace_driven',
  }
}
