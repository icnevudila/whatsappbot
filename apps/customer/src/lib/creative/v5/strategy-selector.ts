import type {
  OntologyClassification,
  CreativeStrategyOutput,
  CreativeStrategyType,
} from './schemas'

/**
 * Universal Creative Strategy Selector
 * Dynamically scores 13 advertising archetypes based on verified ontology dimensions.
 */
export function selectCreativeStrategy(ontology: OntologyClassification): CreativeStrategyOutput {
  const scores: Record<CreativeStrategyType, number> = {
    problem_solution: 50,
    product_demonstration: 50,
    result_first: 50,
    process_proof: 50,
    scale_and_availability: 40,
    sensory_desire: 40,
    discovery_or_opportunity: 40,
    convenience: 40,
    craftsmanship: 40,
    trust_and_expertise: 40,
    offer_and_urgency: 40,
    experience_preview: 40,
    comparison_without_unverified_claims: 20,
  }

  // 1. Proof Mode weighting
  if (ontology.proofMode === 'scale_or_inventory') scores.scale_and_availability += 40
  if (ontology.proofMode === 'craftsmanship') scores.craftsmanship += 40
  if (ontology.proofMode === 'human_expertise') scores.trust_and_expertise += 40
  if (ontology.proofMode === 'environment_or_experience') scores.experience_preview += 40
  if (ontology.proofMode === 'interface_workflow') scores.discovery_or_opportunity += 35
  if (ontology.proofMode === 'product_in_use') scores.product_demonstration += 30
  if (ontology.proofMode === 'offer_value') scores.offer_and_urgency += 35

  // 2. Offer Type weighting
  if (ontology.offerType === 'food_or_consumable') scores.sensory_desire += 45
  if (ontology.offerType === 'digital_product_or_saas') scores.discovery_or_opportunity += 30
  if (ontology.offerType === 'professional_service') scores.trust_and_expertise += 35
  if (ontology.offerType === 'venue_or_experience') scores.experience_preview += 35

  // 3. Primary Value weighting
  if (ontology.primaryValue === 'reduces_effort' || ontology.primaryValue === 'saves_time') {
    scores.problem_solution += 25
    scores.convenience += 30
  }
  if (ontology.primaryValue === 'sensory_appeal') scores.sensory_desire += 35
  if (ontology.primaryValue === 'price_or_value') scores.offer_and_urgency += 30

  // 4. Objective weighting
  if (ontology.campaignObjective === 'quote_request' || ontology.campaignObjective === 'promotion') {
    scores.offer_and_urgency += 25
  }
  if (ontology.campaignObjective === 'product_demonstration') {
    scores.product_demonstration += 35
  }
  if (ontology.campaignObjective === 'lead_generation') {
    scores.discovery_or_opportunity += 25
  }

  // 5. Risk Class Adjustments (Strict regulatory protection)
  if (ontology.riskClass === 'regulated_health' || ontology.riskClass === 'legal_or_professional_claim') {
    scores.comparison_without_unverified_claims = -100
    scores.result_first -= 20
    scores.trust_and_expertise += 40
    scores.process_proof += 35
  }

  // Find highest scoring archetype
  let bestStrategy: CreativeStrategyType = 'product_demonstration'
  let highestScore = -Infinity

  for (const [strat, score] of Object.entries(scores) as [CreativeStrategyType, number][]) {
    if (score > highestScore) {
      highestScore = score
      bestStrategy = strat
    }
  }

  let secondaryTone = 'confident and professional'
  if (bestStrategy === 'sensory_desire') secondaryTone = 'appetizing and warm'
  if (bestStrategy === 'scale_and_availability') secondaryTone = 'reliable and robust'
  if (bestStrategy === 'trust_and_expertise') secondaryTone = 'calm and authoritative'
  if (bestStrategy === 'offer_and_urgency') secondaryTone = 'direct and energetic'

  return {
    primary: bestStrategy,
    secondaryTone,
    reasonCode: `strategy_${bestStrategy}_by_proof_${ontology.proofMode}_offer_${ontology.offerType}`,
  }
}
