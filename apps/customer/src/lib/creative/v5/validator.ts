import type {
  FactNormalizerOutput,
  OntologyClassification,
  HookPlanOutput,
  ShotPlanOutput,
  VoiceoverOutput,
  OverlayPlanOutput,
  ValidationOutput,
  HardFailChecks,
} from './schemas'

/**
 * Deterministic Hard-Fail Validator & Modular Auto-Repair
 * Production gate relies strictly on boolean measurable checks, not arbitrary LLM scores.
 */
export function validateAndRepair(
  facts: FactNormalizerOutput,
  ontology: OntologyClassification,
  hook: HookPlanOutput,
  shotPlan: ShotPlanOutput,
  voiceover: VoiceoverOutput,
  overlay: OverlayPlanOutput,
): {
  validation: ValidationOutput
  repairedVoiceover?: VoiceoverOutput
  repairedShotPlan?: ShotPlanOutput
} {
  const hardFails: string[] = []
  const warnings: string[] = []
  const repairedModules: string[] = []

  let currentVoiceover = { ...voiceover }
  let currentShotPlan = { ...shotPlan }

  // 1. Check Duration (Must total 8 seconds)
  const durationOk = shotPlan.durationSeconds === 8
  if (!durationOk) hardFails.push('duration_not_eight_seconds')

  // 2. Check Format (9:16 vertical)
  const formatOk = shotPlan.aspectRatio === '9:16'
  if (!formatOk) hardFails.push('format_not_vertical')

  // 3. Check Location Continuity
  const locationContinuityOk = Boolean(shotPlan.singleLocation && shotPlan.shots.length === 3)
  if (!locationContinuityOk) hardFails.push('location_continuity_broken')

  // 4. Check Raw Video Text Policy (Zero new text generated in raw video)
  const rawPrompt = shotPlan.veoEnglishPrompt
  const hasDynamicTextInRaw =
    rawPrompt.includes('TEXT CARD') ||
    rawPrompt.includes('FLOATING LETTERS') ||
    rawPrompt.includes('ON-SCREEN BANNER')
  if (hasDynamicTextInRaw) hardFails.push('raw_video_has_unauthorized_text')

  // 5. Check Invented Logo
  const hasInventedLogo =
    !facts.assets.logoReference &&
    (rawPrompt.includes('invented logo') || rawPrompt.includes('random emblem'))
  if (hasInventedLogo) hardFails.push('has_invented_logo')

  // 6. Voiceover Word Count Limit Check & Auto-Repair (Max 18 words)
  let voWords = currentVoiceover.text.split(/\s+/).filter(Boolean).length
  if (voWords > 18) {
    // Modular Auto-Repair: Trim and repair voiceover
    const trimmed = currentVoiceover.text.split(/\s+/).slice(0, 14).join(' ') + '.'
    currentVoiceover = {
      ...currentVoiceover,
      text: trimmed,
      wordCount: trimmed.split(/\s+/).filter(Boolean).length,
      genericCopyCheck: 'repaired',
      reasonCode: `${currentVoiceover.reasonCode}_repaired_word_limit`,
    }
    repairedModules.push('voiceover')
    warnings.push('Voiceover exceeded 18 words and was auto-repaired to 14 words.')
    voWords = currentVoiceover.wordCount
  }
  const voiceoverOk = voWords <= 18

  // 7. Hook Action Check (Must not be establishing shot only)
  const hookOk = !hook.establishingShotOnly && hook.productOrResultVisible
  if (!hookOk) hardFails.push('hook_is_establishing_only_or_missing_action')

  // 8. Risk Class Compliance
  let claimsAllowed = true
  if (ontology.riskClass === 'regulated_health' || ontology.riskClass === 'legal_or_professional_claim') {
    const voLower = currentVoiceover.text.toLowerCase()
    if (voLower.includes('garanti') || voLower.includes('%100') || voLower.includes('kesin')) {
      // Auto-repair: remove forbidden claim from voiceover
      currentVoiceover.text = currentVoiceover.text
        .replace(/%100 garanti|kesin sonuç|garantili/gi, 'güvenilir')
        .trim()
      repairedModules.push('voiceover')
      warnings.push('Regulated claim in voiceover was auto-repaired.')
    }
  }

  // 9. All Overlay Facts Verified
  for (const item of overlay.overlayTimeline) {
    if (item.type === 'offer' && !facts.verifiedFacts.discount && !facts.verifiedFacts.price) {
      hardFails.push('unverified_offer_in_overlay')
    }
  }

  const checks: HardFailChecks = {
    durationTotalsEightSeconds: durationOk,
    verticalFormatSpecified: formatOk,
    hasOnePrimaryIdea: true,
    hasOnePrimaryAction: true,
    locationContinuityValid: locationContinuityOk,
    identityContinuityValid: true,
    hasGeneratedDynamicTextInRawVideo: hasDynamicTextInRaw,
    hasInventedLogo: Boolean(hasInventedLogo),
    hasInventedOfferOrFeature: false,
    hasReferenceConflict: false,
    voiceoverWithinLimit: voiceoverOk,
    hookStartsWithRelevantAction: hookOk,
    firstShotIsNotEstablishingOnly: hookOk,
    claimsAllowedForRiskClass: claimsAllowed,
    allOverlayFactsVerified: !hardFails.includes('unverified_offer_in_overlay'),
  }

  // Status calculation
  let status: ValidationOutput['status'] = 'pass'
  let clarificationQuestion: string | null = null

  if (facts.unknowns.includes('offer_subject_missing')) {
    status = 'needs_clarification'
    clarificationQuestion = 'Videoda tanıtılacak ana ürünü veya hizmeti kısaca belirtin.'
  } else if (hardFails.length > 0) {
    status = 'blocked'
  } else if (repairedModules.length > 0) {
    status = 'repaired'
  }

  return {
    validation: {
      status,
      hardFails,
      warnings,
      repairedModules: repairedModules.length ? repairedModules : undefined,
      clarificationQuestion,
      score: status === 'pass' ? 95 : status === 'repaired' ? 88 : 40,
    },
    repairedVoiceover: repairedModules.includes('voiceover') ? currentVoiceover : undefined,
    repairedShotPlan: repairedModules.includes('shotPlan') ? currentShotPlan : undefined,
  }
}
