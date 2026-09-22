/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * DUAL & TRIPLE CREATIVE GRAMMAR ROUTER (V6)
 * 
 * Kesin İlke:
 * Süre uzadığında sadece sahne sayısı çoğalmaz; gerçek anlatı grameri değişir.
 * Uzun video 4 tane bağımsız 10 saniyelik klibin montajı OLAMAZ.
 */

export type CommercialGrammarType = 'short_performance' | 'mid_form' | 'brand_film'

export interface GrammarRoutePlan {
  grammarType: CommercialGrammarType
  recommendedSceneCount: { min: number; max: number; target: number }
  beatStructure: string[]
  productExposureTarget: number // 0.0 - 1.0 (minimum % of time)
  brandExposureTarget: number   // 0.0 - 1.0
  cameraModePreferred: 'continuous_take' | 'directed_cuts'
  narrativeGuideline: string
}

export function routeCommercialGrammar(durationSeconds: number, hasExactProductReference = false): GrammarRoutePlan {
  const d = Math.max(5, Math.min(60, Number(durationSeconds) || 8))

  // 1. SHORT PERFORMANCE (6–12 SANİYE)
  if (d <= 12) {
    return {
      grammarType: 'short_performance',
      recommendedSceneCount: hasExactProductReference
        ? { min: 1, max: 2, target: 1 } // Tek kesintisiz continuous take
        : { min: 2, max: 3, target: 3 }, // Hızlı 3 kadrajlı performans
      beatStructure: [
        'hook',
        'product',
        'action_and_proof',
        'brand_resolution',
      ],
      productExposureTarget: 0.65, // %65 ürün/eylem görünürlüğü
      brandExposureTarget: 0.25,   // %25 kontrollü kapanış
      cameraModePreferred: hasExactProductReference ? 'continuous_take' : 'directed_cuts',
      narrativeGuideline: '0-2 saniyede ürünle doğrudan temas. Boş genel plan ve uzun logo jeneriği yasak. Tek temel vaat ve tek net CTA.',
    }
  }

  // 2. MID FORM (13–24 SANİYE)
  if (d <= 24) {
    return {
      grammarType: 'mid_form',
      recommendedSceneCount: { min: 3, max: 4, target: 4 },
      beatStructure: [
        'hook',
        'context_and_friction',
        'product_intervention',
        'proof_and_result',
        'brand_resolution',
      ],
      productExposureTarget: 0.55,
      brandExposureTarget: 0.20,
      cameraModePreferred: 'directed_cuts',
      narrativeGuideline: 'İhtiyaç veya iş ortamı hızla açılır, ürün çözüm olarak müdahale eder, somut sonuç alınır ve marka imzasıyla bağlanır.',
    }
  }

  // 3. BRAND FILM (25–60 SANİYE)
  return {
    grammarType: 'brand_film',
    recommendedSceneCount: { min: 5, max: 7, target: 5 },
    beatStructure: [
      'hook',
      'world_establishment',
      'need_or_challenge',
      'product_entrance',
      'transformation_and_proof',
      'escalation',
      'payoff',
      'brand_resolution',
    ],
    productExposureTarget: 0.45,
    brandExposureTarget: 0.15,
    cameraModePreferred: 'directed_cuts',
    narrativeGuideline: 'Bağımsız kliplerin toplamı değil; tek bir neden-sonuç zinciri ve dramatik durum dönüşümü. Başlangıçtaki soru veya gerilim sondaki payoff ile çözülmelidir.',
  }
}
