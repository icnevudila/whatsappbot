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
import { validateClaims, estimateSpeechDuration } from './voiceover-writer'

/**
 * Deterministic Hard-Fail Validator & Modular Auto-Repair
 * - Production gate relies strictly on boolean measurable checks, not arbitrary LLM scores.
 * - Zero hardcoded booleans in HardFailChecks.
 * - Enforces risk class compliance (health, legal, finance, children, high consideration).
 * - Enforces cameraMode consistency.
 * - Repairs long VO grammatically without slicing mid-sentence.
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

  // 1. Duration & Timeline Continuity Check (Must total 8 seconds with zero gaps or overlaps)
  const durationOk =
    shotPlan.durationSeconds === 8 &&
    shotPlan.shots.length === 3 &&
    shotPlan.shots[2].timing.to === 8.0
  if (!durationOk) hardFails.push('duration_not_eight_seconds')

  const s = shotPlan.shots
  const timelineContinuityValid = Boolean(
    s.length === 3 &&
    s[0].timing.from === 0.0 &&
    s[0].timing.to > s[0].timing.from &&
    Math.abs(s[0].timing.to - s[1].timing.from) < 0.001 &&
    s[1].timing.to > s[1].timing.from &&
    Math.abs(s[1].timing.to - s[2].timing.from) < 0.001 &&
    s[2].timing.to === 8.0 &&
    s[2].timing.to > s[2].timing.from
  )
  if (!timelineContinuityValid) hardFails.push('shot_timeline_gap_or_overlap_detected')

  // 2. Format Check (9:16 vertical)
  const formatOk =
    shotPlan.aspectRatio === '9:16' &&
    shotPlan.veoEnglishPrompt.includes('9:16')
  if (!formatOk) hardFails.push('format_not_vertical')

  // 3. Camera Mode Match & Trajectory Check
  let cameraModeMatch = false
  if (shotPlan.cameraMode === 'continuous_take') {
    const hasContinuousTag = shotPlan.veoEnglishPrompt.includes('CAMERA MOVEMENT: continuous_take')
    const hasCutMention = /cut to|cut transition|distinct controlled framings/i.test(
      shotPlan.shots.map((sh) => `${sh.framing} ${sh.cameraMotion}`).join(' ')
    )
    cameraModeMatch = hasContinuousTag && !hasCutMention
  } else if (shotPlan.cameraMode === 'three_cut') {
    cameraModeMatch = shotPlan.veoEnglishPrompt.includes('CAMERA MOVEMENT: three_cut')
  }
  if (!cameraModeMatch) hardFails.push('camera_mode_mismatch')

  // 4. Location Continuity Check
  const locationContinuityOk = Boolean(
    shotPlan.singleLocation &&
    shotPlan.singleLocation.trim().length > 5 &&
    shotPlan.shots.length === 3
  )
  if (!locationContinuityOk) hardFails.push('location_continuity_broken')

  // 5. Raw Video Text Policy Check (Zero new text generated in raw video)
  const rawPrompt = shotPlan.veoEnglishPrompt
  const hasDynamicTextInRaw =
    rawPrompt.includes('TEXT CARD') ||
    rawPrompt.includes('FLOATING LETTERS') ||
    rawPrompt.includes('ON-SCREEN BANNER') ||
    rawPrompt.includes('CAPTIONS ON SCREEN')
  if (hasDynamicTextInRaw) hardFails.push('raw_video_has_unauthorized_text')

  // 6. Invented Logo Check
  const hasInventedLogo =
    !facts.assets.logoReference &&
    (rawPrompt.includes('invented logo') || rawPrompt.includes('random emblem'))
  if (hasInventedLogo) hardFails.push('has_invented_logo')

  // 7. Reference Conflict Check
  const hasReferenceConflict =
    Boolean(facts.assets.productReference && !facts.assets.productReferenceUrl)
  if (hasReferenceConflict) hardFails.push('reference_conflict_detected')

  // 8. Hook Action Check (Must not be establishing shot only)
  const hookOk =
    !hook.establishingShotOnly &&
    hook.meaningfulMotionBySeconds <= 0.5 &&
    hook.productOrResultVisible
  if (!hookOk) hardFails.push('hook_is_establishing_only_or_missing_action')

  // 9. Risk Class Compliance Pre-Check & Auto-Repair
  const voLower = currentVoiceover.text.toLowerCase()

  if (ontology.riskClass === 'regulated_health') {
    if (voLower.includes('garanti') || voLower.includes('%100') || voLower.includes('kesin') || voLower.includes('mucize')) {
      currentVoiceover.text = currentVoiceover.text
        .replace(/%100 garanti|kesin sonuç|garantili|mucizevi/gi, 'hekim kontrolünde')
        .trim()
      repairedModules.push('voiceover')
      warnings.push('Regulated health claim in voiceover was auto-repaired to objective medical phrasing.')
    }
  } else if (ontology.riskClass === 'finance_or_investment') {
    if (voLower.includes('kesin kazanç') || voLower.includes('zengin') || voLower.includes('garanti getiri')) {
      currentVoiceover.text = currentVoiceover.text
        .replace(/kesin kazanç|zengin olun|garanti getiri/gi, 'finansal hedefler')
        .trim()
      repairedModules.push('voiceover')
      warnings.push('Finance claim in voiceover was auto-repaired.')
    }
  } else if (ontology.riskClass === 'legal_or_professional_claim') {
    if (voLower.includes('kazanma garantisi') || voLower.includes('kesin beraat')) {
      currentVoiceover.text = currentVoiceover.text
        .replace(/kazanma garantisi|kesin beraat/gi, 'hukuki danışmanlık')
        .trim()
      repairedModules.push('voiceover')
      warnings.push('Legal claim in voiceover was auto-repaired.')
    }
  }

  // 10. Voiceover Word Count & Duration Limits (Target 8-13, max 16, duration <= 7.5s, margin >= 0.5s)
  const initialVoWords = voiceover.text.split(/\s+/).filter(Boolean).length
  const initialVoExceeded = initialVoWords > 16 || voiceover.estimatedDurationSeconds > 7.5 || voiceover.safetyMarginSeconds < 0.5

  let voWords = currentVoiceover.text.split(/\s+/).filter(Boolean).length
  let durationSeconds = currentVoiceover.estimatedDurationSeconds
  let safetyMargin = currentVoiceover.safetyMarginSeconds

  if (initialVoExceeded || voWords > 16 || durationSeconds > 7.5 || safetyMargin < 0.5) {
    // Grammatical Rewrite: strictly without slice()
    const brand = facts.verifiedFacts.brandName
    const subject = facts.verifiedFacts.offerName || 'çözüm'
    let rewritten = ''

    if (ontology.riskClass === 'regulated_health') {
      rewritten = brand
        ? `${brand} ile hekim kontrolünde ${subject}. Detaylı bilgi alın.`
        : `Hekim kontrolünde ${subject}, detaylı bilgi alın.`
    } else if (ontology.offerType === 'professional_service' || ontology.riskClass === 'legal_or_professional_claim') {
      rewritten = brand
        ? `${brand} ile ${subject} danışmanlığı. Detaylı bilgi alın.`
        : `${subject} alanında profesyonel danışmanlık. Detaylı bilgi alın.`
    } else if (ontology.offerType === 'food_or_consumable') {
      rewritten = brand
        ? `${brand} ile ${subject}. Hemen sipariş verin.`
        : `${subject} lezzeti sizleri bekliyor. Hemen sipariş verin.`
    } else if (facts.verifiedFacts.discount) {
      rewritten = brand
        ? `${brand} ${subject}, avantajlı fiyat teklifleriyle projenizde. Hemen bilgi alın.`
        : `${subject} avantajlı fiyat teklifleriyle projenizde hazır. Detaylar için yazın.`
    } else if (facts.verifiedFacts.benefits.length > 0) {
      const firstClause = facts.verifiedFacts.benefits[0].split(/[,.;]/)[0].trim()
      rewritten = brand
        ? `${brand} ${subject} ile ${firstClause}. Detaylar için yazın.`
        : `${subject} ile ${firstClause}. Hemen bizimle iletişime geçin.`
    } else {
      rewritten = brand
        ? `${brand} ile ${subject}. Bizimle iletişime geçin.`
        : `${subject} projeniz için hazır. Bizimle iletişime geçin.`
    }

    const est = estimateSpeechDuration(rewritten)
    currentVoiceover = {
      ...currentVoiceover,
      text: rewritten,
      wordCount: rewritten.split(/\s+/).filter(Boolean).length,
      syllableCount: est.syllableCount,
      estimatedDurationSeconds: est.durationSeconds,
      safetyMarginSeconds: est.safetyMarginSeconds,
      genericCopyCheck: 'repaired',
      reasonCode: `${currentVoiceover.reasonCode}_repaired_grammatically`,
    }
    repairedModules.push('voiceover')
    warnings.push('Voiceover exceeded limits and was grammatically rewritten to fit within 8.0s runtime.')
    voWords = currentVoiceover.wordCount
    durationSeconds = currentVoiceover.estimatedDurationSeconds
    safetyMargin = currentVoiceover.safetyMarginSeconds
  }

  const voiceoverOk = voWords <= 16 && durationSeconds <= 7.5 && safetyMargin >= 0.5
  if (!voiceoverOk) {
    hardFails.push('voiceover_cannot_fit_eight_seconds')
  }

  // 11. Claim Validation Check (VO, Overlay, Hook and Shot Plan)
  const voClaimValidation = validateClaims(currentVoiceover.text, facts)
  if (!voClaimValidation.valid) {
    currentVoiceover.usesOnlyVerifiedClaims = false
    hardFails.push(`unverified_claims_in_voiceover: ${voClaimValidation.unverifiedClaims.join(', ')}`)
  }

  const hookClaimCheck = validateClaims(hook.visualEventDescription, facts)
  const hookClaimsValid = hookClaimCheck.valid
  if (!hookClaimsValid) {
    hardFails.push(`unverified_claims_in_hook: ${hookClaimCheck.unverifiedClaims.join(', ')}`)
  }

  let shotPlanClaimsValid = true
  for (const sh of currentShotPlan.shots) {
    const actionCheck = validateClaims(sh.subjectAction, facts)
    if (!actionCheck.valid) {
      shotPlanClaimsValid = false
      hardFails.push(`unverified_claims_in_shot_${sh.shotNumber}: ${actionCheck.unverifiedClaims.join(', ')}`)
    }
  }

  // 12. All Overlay Facts & Timeline Verified Check
  let overlayFactsValid = true
  for (const item of overlay.overlayTimeline) {
    if (item.from < 0.0 || item.to > 8.0 || item.to <= item.from) {
      overlayFactsValid = false
      hardFails.push(`overlay_timing_out_of_bounds: from ${item.from} to ${item.to}`)
    }

    const overlayClaimCheck = validateClaims(item.text, facts)
    if (!overlayClaimCheck.valid) {
      overlayFactsValid = false
      hardFails.push(`unverified_claims_in_overlay: ${overlayClaimCheck.unverifiedClaims.join(', ')}`)
    }

    if (item.type === 'offer') {
      if (!facts.verifiedFacts.discount && !facts.verifiedFacts.price && !facts.verifiedFacts.deliveryArea && !facts.verifiedFacts.campaignDeadline) {
        overlayFactsValid = false
        hardFails.push('unverified_offer_in_overlay')
        break
      }
      const percentMatches = item.text.match(/(?:%\s*\d+|\d+\s*%)/g) || []
      for (const pm of percentMatches) {
        const num = pm.replace(/\D/g, '')
        const corpus = [facts.verifiedFacts.rawBrief, facts.verifiedFacts.discount || ''].join(' ')
        const percentRegex = new RegExp(`(?:%\\s*${num}|${num}\\s*%|yüzde\\s*${num})`, 'i')
        if (!percentRegex.test(corpus)) {
          overlayFactsValid = false
          hardFails.push(`unverified_discount_percentage_in_overlay: ${pm}`)
        }
      }
    }
  }

  // 13. Dynamic Risk Class & Claims Compliance Computation
  let riskClassCompliant = true
  const currentVoLower = currentVoiceover.text.toLowerCase()
  const allOverlayText = overlay.overlayTimeline.map((item) => item.text.toLowerCase()).join(' ')
  const combinedScrutinyText = `${currentVoLower} ${allOverlayText} ${hook.visualEventDescription.toLowerCase()}`

  if (ontology.riskClass === 'regulated_health') {
    const hasForbiddenHealthClaim = /(%100 garanti|kesin sonuç|garantili|mucizevi|kesin iyileşme|tam tedavi|tedavi garantisi)/i.test(combinedScrutinyText)
    if (hasForbiddenHealthClaim) {
      riskClassCompliant = false
      hardFails.push('unauthorized_health_guarantee_detected')
    }
  } else if (ontology.riskClass === 'finance_or_investment') {
    const hasForbiddenFinanceClaim = /(kesin kazanç|zengin olun|garanti getiri|%100 kâr|sıfır risk)/i.test(combinedScrutinyText)
    if (hasForbiddenFinanceClaim) {
      riskClassCompliant = false
      hardFails.push('unauthorized_financial_guarantee_detected')
    }
  } else if (ontology.riskClass === 'legal_or_professional_claim') {
    const hasForbiddenLegalClaim = /(kazanma garantisi|kesin beraat|kesin tahliye)/i.test(combinedScrutinyText)
    if (hasForbiddenLegalClaim) {
      riskClassCompliant = false
      hardFails.push('unauthorized_legal_guarantee_detected')
    }
  }

  const claimsAllowed = Boolean(
    riskClassCompliant &&
    voClaimValidation.valid &&
    overlayFactsValid &&
    hookClaimsValid &&
    shotPlanClaimsValid
  )
  if (!claimsAllowed) {
    hardFails.push('claims_not_allowed_or_unverified')
  }

  // 14. Dynamic checks computation (Zero hardcoded booleans)
  const hasOnePrimaryIdea = Boolean(
    ontology.offerType &&
    ontology.offerType !== 'unknown' &&
    ontology.campaignObjective &&
    facts.verifiedFacts.offerName
  )

  const hasOnePrimaryAction = Boolean(
    hook.visualEventDescription &&
    hook.meaningfulMotionBySeconds <= 0.5 &&
    shotPlan.shots[0].subjectAction.length > 10
  )

  const identityContinuityValid = Boolean(
    shotPlan.shots[0].subjectAction.includes(facts.verifiedFacts.offerName || '') ||
    shotPlan.shots[1].subjectAction.includes(facts.verifiedFacts.offerName || '') ||
    shotPlan.brandIdentityMode !== 'none'
  )

  const hasInventedOfferOrFeature = !claimsAllowed

  const checks: HardFailChecks = {
    durationTotalsEightSeconds: durationOk,
    timelineContinuityValid,
    verticalFormatSpecified: formatOk,
    cameraModeMatch,
    hasOnePrimaryIdea,
    hasOnePrimaryAction,
    locationContinuityValid: locationContinuityOk,
    identityContinuityValid,
    hasGeneratedDynamicTextInRawVideo: hasDynamicTextInRaw,
    hasInventedLogo: Boolean(hasInventedLogo),
    hasInventedOfferOrFeature,
    hasReferenceConflict,
    voiceoverWithinLimit: voiceoverOk,
    hookStartsWithRelevantAction: hookOk,
    firstShotIsNotEstablishingOnly: !hook.establishingShotOnly,
    claimsAllowedForRiskClass: claimsAllowed,
    allOverlayFactsVerified: overlayFactsValid,
  }

  // 14. Status calculation (Hard fails strictly stop production / block)
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

  // If voiceover was repaired, update shotPlan's audio directive if needed
  if (repairedModules.includes('voiceover') && currentShotPlan.veoEnglishPrompt.includes('AUDIO:')) {
    currentShotPlan = {
      ...currentShotPlan,
      veoEnglishPrompt: currentShotPlan.veoEnglishPrompt.replace(
        /AUDIO: Professional crystal-clear Turkish voiceover: "[^"]*"/,
        `AUDIO: Professional crystal-clear Turkish voiceover: "${currentVoiceover.text.replace(/["']/g, '')}"`
      ),
    }
    repairedModules.push('shotPlan')
  }

  return {
    validation: {
      status,
      checks,
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
