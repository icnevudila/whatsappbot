/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * CONCEPT TOURNAMENT ENGINE (V6)
 * 
 * Amaç:
 * 5 konsept adayını sistem içi ağırlıklı skor matrisi ile değerlendirir
 * ve Creative Memory'deki aşırı kullanılan kalıpları cezalandırarak en uygun olanı seçer.
 * 
 * Ağırlıklar:
 * brandFit              0.20
 * productRelevance      0.20
 * proofStrength         0.15
 * visualDistinctiveness 0.15
 * narrativePayoff       0.15
 * novelty               0.10
 * productionFeasibility 0.05
 */

import type {
  ResolvedCreativeFacts,
  CreativeDNA,
  StrategicPromise,
  CreativeConcept,
  ConceptScore,
  TournamentResult,
  CreativeMemoryEvaluation
} from './creative-types'

export function runConceptTournament(
  concepts: CreativeConcept[],
  facts: ResolvedCreativeFacts,
  dna: CreativeDNA,
  promise: StrategicPromise,
  memory?: CreativeMemoryEvaluation | null
): TournamentResult {
  if (!concepts || concepts.length === 0) {
    throw new Error('CONCEPT_TOURNAMENT_ERROR: Değerlendirilecek konsept adayı bulunamadı.');
  }

  const scores: ConceptScore[] = []

  for (const c of concepts) {
    // 1. Brand Fit (0.20): Marka DNA'sı ve prestij seviyesi ile uyum
    let brandFit = 85
    if (dna.brand.premiumLevel === 'industrial_grade' && (c.id === 'c01_material_truth' || c.id === 'c04_scale_and_supply')) {
      brandFit = 96
    } else if (dna.brand.premiumLevel === 'luxury' && (c.id === 'c05_prestige_monolith' || c.id === 'c01_material_truth')) {
      brandFit = 98
    } else if (c.id === 'c02_practitioner_mastery' || c.id === 'c03_transformation_proof') {
      brandFit = 92
    }

    // 2. Product Relevance (0.20): Ürünün somut doğası ve fiziksel malzeme ile bağı
    let productRelevance = 88
    if (c.proofUsage && c.proofUsage.length > 0) productRelevance += 6
    if (c.visualPotential && c.visualPotential.length >= 3) productRelevance += 4
    productRelevance = Math.min(100, productRelevance)

    // 3. Proof Strength (0.15): Kanıt gücü ve stratejik vaat delilleri
    let proofStrength = 85
    if (c.id === 'c03_transformation_proof' || c.id === 'c01_material_truth') {
      proofStrength = 95
    }

    // 4. Visual Distinctiveness (0.15): Görsel özgünlük ve dramatik etki
    let visualDistinctiveness = 88
    if (c.id === 'c01_material_truth' || c.id === 'c05_prestige_monolith') {
      visualDistinctiveness = 94
    }

    // 5. Narrative Payoff (0.15): Açılış kancasının son sahneye bağlanma gücü
    let narrativePayoff = 86
    if (c.payoffMechanism && c.payoffMechanism.length > 15) {
      narrativePayoff = 94
    }

    // 6. Production Feasibility (0.05): AI video motoru ve fiziksel gerçeklik üretilebilirliği
    let productionFeasibility = 90
    if (c.risks && c.risks.length > 0) {
      productionFeasibility = 88
    }

    // 7. Novelty (0.10) & Memory Penalty
    let novelty = memory?.noveltyScore || 95
    let noveltyPenaltyApplied = 0

    if (memory?.avoidRecentPatterns && memory.avoidRecentPatterns.length > 0) {
      for (const pattern of memory.avoidRecentPatterns) {
        const normPattern = pattern.toLowerCase()
        if (
          c.oneSentenceIdea.toLowerCase().includes(normPattern) ||
          c.openingMechanism.toLowerCase().includes(normPattern) ||
          c.narrativeDevice.toLowerCase().includes(normPattern)
        ) {
          noveltyPenaltyApplied += 15
        }
      }
    }

    novelty = Math.max(10, novelty - noveltyPenaltyApplied)

    // Ağırlıklı Toplam Hesaplama
    const totalScore = Math.round(
      brandFit * 0.20 +
      productRelevance * 0.20 +
      proofStrength * 0.15 +
      visualDistinctiveness * 0.15 +
      narrativePayoff * 0.15 +
      novelty * 0.10 +
      productionFeasibility * 0.05
    )

    scores.push({
      conceptId: c.id,
      brandFit,
      productRelevance,
      proofStrength,
      visualDistinctiveness,
      narrativePayoff,
      novelty,
      productionFeasibility,
      totalScore,
      noveltyPenaltyApplied,
      notes: [
        `Brand fit: ${brandFit}, Product relevance: ${productRelevance}`,
        `Novelty: ${novelty} (Penalty: -${noveltyPenaltyApplied})`,
      ],
    })
  }

  // En yüksek skora sahip konsepti seç (Eşitlik durumunda proofStrength ve brandFit belirler)
  scores.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
    return (b.proofStrength + b.brandFit) - (a.proofStrength + a.brandFit)
  })

  const winnerScore = scores[0]
  const winner = concepts.find(c => c.id === winnerScore.conceptId) || concepts[0]

  return {
    winner,
    winnerScore,
    candidates: concepts,
    allScores: scores,
  }
}
