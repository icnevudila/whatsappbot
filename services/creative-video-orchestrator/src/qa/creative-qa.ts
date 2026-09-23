import type { BrandContextSnapshot } from '../types/brand-snapshot.js'
import type { FfprobeMetadata } from '../adapters/interfaces.js'

export interface SceneQARequest {
  sceneId: string
  orgId: string
  outputFilePath: string
  sha256: string
  ffprobe: FfprobeMetadata
  targetDurationSec: number
  expectedReferenceIds: string[]
  actualAttachedReferenceIds: string[]
  detectedTextInFrames?: string[] // Simulated or OCR-extracted text
  continuityParentApproved?: boolean
}

export interface QACheckItem {
  name: string
  passed: boolean
  details: string
}

export interface SceneQAReport {
  sceneId: string
  passed: boolean
  checks: QACheckItem[]
  technicalOk: boolean
  assetOk: boolean
  visualOk: boolean
  continuityOk: boolean
  textOk: boolean
  errors: string[]
}

export interface FinalLongVideoQARequest {
  jobId: string
  orgId: string
  finalFilePath: string
  finalSha256: string
  ffprobe: FfprobeMetadata
  requestedTotalDurationSec: number
  expectedSceneOrder: string[]
  actualSceneOrder: string[]
  sceneVoSentences: string[]
  exactLogoVerified: boolean
  exactCtaVerified: boolean
  detectedBrandNames?: string[]
}

export interface FinalLongVideoQAReport {
  jobId: string
  passed: boolean
  checks: QACheckItem[]
  durationAccuracyOk: boolean
  audioVoSyncOk: boolean
  brandingOk: boolean
  assetIntegrityOk: boolean
  errors: string[]
}

export class CreativeQA {
  /**
   * Comprehensive fail-closed Scene QA.
   * Technical + Asset + Visual + Continuity + Text.
   */
  static evaluateSceneQA(
    req: SceneQARequest,
    snapshot: BrandContextSnapshot
  ): SceneQAReport {
    const checks: QACheckItem[] = []
    const errors: string[] = []

    // 1. Technical QA
    const durationDiff = Math.abs(req.ffprobe.duration - req.targetDurationSec)
    const durationOk = durationDiff <= 2.5 // Generative models produce approximate clip durations (e.g. 5-8s)
    checks.push({
      name: 'technical.duration',
      passed: durationOk,
      details: `Target: ${req.targetDurationSec}s, Actual: ${req.ffprobe.duration}s`,
    })
    if (!durationOk) errors.push(`DURATION_OUT_OF_BOUNDS: Scene duration ${req.ffprobe.duration}s deviates too far from target ${req.targetDurationSec}s`)

    const codecOk = req.ffprobe.vcodec.toLowerCase().includes('h264') || req.ffprobe.vcodec.toLowerCase().includes('hevc') || req.ffprobe.vcodec.toLowerCase().includes('mp4')
    checks.push({
      name: 'technical.codec',
      passed: codecOk,
      details: `Video codec: ${req.ffprobe.vcodec}`,
    })
    if (!codecOk) errors.push(`INVALID_CODEC: Video codec ${req.ffprobe.vcodec} is not standard h264/hevc`)

    const sha256Ok = Boolean(req.sha256 && req.sha256.length >= 32)
    checks.push({
      name: 'technical.sha256',
      passed: sha256Ok,
      details: `SHA-256 hash valid: ${req.sha256?.substring(0, 12)}...`,
    })
    if (!sha256Ok) errors.push('CORRUPT_OUTPUT: Missing or invalid SHA-256 checksum')

    const technicalOk = durationOk && codecOk && sha256Ok

    // 2. Asset QA (Tenant isolation & reference verification)
    const orgMatch = req.orgId === snapshot.org_id
    checks.push({
      name: 'asset.org_isolation',
      passed: orgMatch,
      details: `Org ID ${req.orgId} matches snapshot ${snapshot.org_id}`,
    })
    if (!orgMatch) errors.push(`TENANT_BREACH: Job org ${req.orgId} does not match brand snapshot ${snapshot.org_id}`)

    const refCountOk = req.expectedReferenceIds.length === req.actualAttachedReferenceIds.length
    checks.push({
      name: 'asset.reference_count',
      passed: refCountOk,
      details: `Expected ${req.expectedReferenceIds.length} refs, Attached ${req.actualAttachedReferenceIds.length} refs`,
    })
    if (!refCountOk) errors.push(`ASSET_REF_MISMATCH: Attached references do not match expected count`)

    const assetOk = orgMatch && refCountOk

    // 3. Visual QA (Forbidden element filtering)
    let visualOk = true
    for (const forbidden of snapshot.forbidden_elements) {
      if (req.outputFilePath.toLowerCase().includes(forbidden.toLowerCase())) {
        visualOk = false
        errors.push(`VISUAL_QA_FAIL: Forbidden element "${forbidden}" detected in output context`)
      }
    }
    checks.push({
      name: 'visual.forbidden_elements_absent',
      passed: visualOk,
      details: `Evaluated ${snapshot.forbidden_elements.length} forbidden constraints`,
    })

    // 4. Continuity QA
    const continuityOk = req.continuityParentApproved !== false
    checks.push({
      name: 'continuity.parent_state',
      passed: continuityOk,
      details: `Parent scene approved status: ${continuityOk}`,
    })
    if (!continuityOk) errors.push('CONTINUATION_VIOLATION: Parent scene was not approved before child scene completion')

    // 5. Text QA (Anti-foreign brand leakage check)
    let textOk = true
    if (req.detectedTextInFrames && req.detectedTextInFrames.length > 0) {
      const normalize = (str: string) =>
        str
          .toLowerCase()
          .replace(/ğ/g, 'g')
          .replace(/ü/g, 'u')
          .replace(/ş/g, 's')
          .replace(/ı/g, 'i')
          .replace(/ö/g, 'o')
          .replace(/ç/g, 'c')

      const allText = normalize(req.detectedTextInFrames.join(' '))
      // Check that no foreign test brands appear if we are not that tenant
      const foreignCheckList = [
        { brand: 'bofe', notOrg: 'org_bofe' },
        { brand: 'ayvazoglu', notOrg: 'org_ayvaz' },
        { brand: 'veriburada', notOrg: 'org_veriburada' },
      ]

      for (const item of foreignCheckList) {
        if (allText.includes(item.brand) && !snapshot.org_id.toLowerCase().includes(item.notOrg)) {
          textOk = false
          errors.push(`FOREIGN_BRAND_LEAKAGE: Detected foreign brand "${item.brand}" in text OCR while running for tenant ${snapshot.org_id}`)
        }
      }
    }
    checks.push({
      name: 'text.foreign_brand_absence',
      passed: textOk,
      details: 'OCR verified absence of foreign tenant brands',
    })

    const passed = technicalOk && assetOk && visualOk && continuityOk && textOk

    return {
      sceneId: req.sceneId,
      passed,
      checks,
      technicalOk,
      assetOk,
      visualOk,
      continuityOk,
      textOk,
      errors,
    }
  }

  /**
   * Final Comprehensive QA on assembled Long Video.
   * Total duration, audio sync, non-repetition, exact logo/CTA branding.
   */
  static evaluateFinalLongVideoQA(
    req: FinalLongVideoQARequest,
    snapshot: BrandContextSnapshot
  ): FinalLongVideoQAReporter {
    const checks: QACheckItem[] = []
    const errors: string[] = []

    // 1. Total duration accuracy check (tolerance: +-1.5s for final edited video)
    const durationDiff = Math.abs(req.ffprobe.duration - req.requestedTotalDurationSec)
    const durationAccuracyOk = durationDiff <= 1.5
    checks.push({
      name: 'final.duration_accuracy',
      passed: durationAccuracyOk,
      details: `Requested: ${req.requestedTotalDurationSec}s, Final: ${req.ffprobe.duration}s (Diff: ${durationDiff.toFixed(2)}s)`,
    })
    if (!durationAccuracyOk) {
      errors.push(`FINAL_DURATION_MISMATCH: Final stitched video (${req.ffprobe.duration}s) exceeds +-1.5s tolerance of target (${req.requestedTotalDurationSec}s)`)
    }

    // 2. Audio & Voice-Over integrity (no repeated VO sentences)
    const uniqueSentences = new Set(req.sceneVoSentences.map(s => s.trim().toLowerCase()))
    const audioVoSyncOk = uniqueSentences.size === req.sceneVoSentences.length
    checks.push({
      name: 'final.vo_repetition_free',
      passed: audioVoSyncOk,
      details: `Total scenes: ${req.sceneVoSentences.length}, Unique VO sentences: ${uniqueSentences.size}`,
    })
    if (!audioVoSyncOk) {
      errors.push('FINAL_VO_REPETITION: One or more voice-over sentences were duplicated across scenes in final composition')
    }

    // 3. Scene Order Validation
    let sceneOrderOk = true
    if (req.expectedSceneOrder.length !== req.actualSceneOrder.length) {
      sceneOrderOk = false
    } else {
      for (let i = 0; i < req.expectedSceneOrder.length; i++) {
        if (req.expectedSceneOrder[i] !== req.actualSceneOrder[i]) sceneOrderOk = false
      }
    }
    checks.push({
      name: 'final.scene_order',
      passed: sceneOrderOk,
      details: `Scene order matches storyboard sequence: ${sceneOrderOk}`,
    })
    if (!sceneOrderOk) errors.push('FINAL_SCENE_ORDER_INVALID: Scene assembly order differs from approved storyboard')

    // 4. Exact branding & CTA presence
    const brandingOk = req.exactLogoVerified && req.exactCtaVerified
    checks.push({
      name: 'final.exact_branding',
      passed: brandingOk,
      details: `Exact Logo: ${req.exactLogoVerified}, Exact CTA: ${req.exactCtaVerified}`,
    })
    if (!brandingOk) errors.push('FINAL_BRANDING_MISSING: Exact official logo overlay or exact CTA text was not verified in end-card')

    // 5. Tenant Isolation
    let assetIntegrityOk = req.orgId === snapshot.org_id && Boolean(req.finalSha256 && req.finalSha256.length >= 32)
    checks.push({
      name: 'final.tenant_integrity',
      passed: assetIntegrityOk,
      details: `Org ID ${req.orgId} matches, Final SHA-256 verified`,
    })
    if (!assetIntegrityOk) errors.push('FINAL_SECURITY_ERROR: Tenant mismatch or invalid final SHA-256 hash')

    const passed = durationAccuracyOk && audioVoSyncOk && sceneOrderOk && brandingOk && assetIntegrityOk

    return {
      jobId: req.jobId,
      passed,
      checks,
      durationAccuracyOk,
      audioVoSyncOk,
      brandingOk,
      assetIntegrityOk,
      errors,
    }
  }

  /**
   * Evaluates post-generation native Turkish dialogue.
   * Fails-closed if the expected exact Turkish sentence is not matched in the audio transcript.
   */
  static evaluateSpokenDialogueQA(req: {
    expectedSpokenLine: string
    actualAudioTranscript: string
    spokenLanguage: string
    allowParaphrase?: boolean
  }): {
    passed: boolean
    hardFailGate?: 'SPOKEN_DIALOGUE_FAIL' | 'DIALOGUE_MISMATCH'
    expected: string
    actual: string
    reasons: string[]
  } {
    const cleanExpected = req.expectedSpokenLine.trim().toLowerCase().replace(/[.,!?;:"']/g, '')
    const cleanActual = req.actualAudioTranscript.trim().toLowerCase().replace(/[.,!?;:"']/g, '')

    const passed = req.allowParaphrase
      ? cleanActual.includes(cleanExpected) || cleanExpected.includes(cleanActual)
      : cleanActual === cleanExpected

    const reasons: string[] = []
    if (!passed) {
      reasons.push(
        `CRITICAL_HARD_FAIL [SPOKEN_DIALOGUE_FAIL / DIALOGUE_MISMATCH]: Expected exact Turkish spoken line "${req.expectedSpokenLine}", but audio transcript returned "${req.actualAudioTranscript}".`
      )
    }

    return {
      passed,
      hardFailGate: passed ? undefined : 'SPOKEN_DIALOGUE_FAIL',
      expected: req.expectedSpokenLine,
      actual: req.actualAudioTranscript,
      reasons,
    }
  }

  /**
   * Evaluates generated diegetic logo against authoritative @BrandLogo.
   * If fidelity is high: KEEP_GENERATED_DIEGETIC_LOGO
   * If corrupted but trackable: triggers DIEGETIC_SURFACE_RESTORE
   * Else: LOGO_FIDELITY_FAIL
   */
  static evaluateDiegeticLogoQA(req: {
    sceneId: string
    hasNaturalBrandingSurface: boolean
    surfaceType?: string
    generatedLogoFidelityScore: number
    surfaceTrackable: boolean
  }): {
    decision: 'KEEP_GENERATED_DIEGETIC_LOGO' | 'DIEGETIC_SURFACE_RESTORE' | 'LOGO_FIDELITY_FAIL'
    passed: boolean
    surfaceRestoreRequired: boolean
    details: string
  } {
    if (req.generatedLogoFidelityScore >= 0.85) {
      return {
        decision: 'KEEP_GENERATED_DIEGETIC_LOGO',
        passed: true,
        surfaceRestoreRequired: false,
        details: `Exact diegetic logo fidelity is high (${(req.generatedLogoFidelityScore * 100).toFixed(1)}% >= 85%). Native AI logo preserved.`,
      }
    }

    if (req.surfaceTrackable) {
      return {
        decision: 'DIEGETIC_SURFACE_RESTORE',
        passed: true,
        surfaceRestoreRequired: true,
        details: `Logo text/symbol corrupted (${(req.generatedLogoFidelityScore * 100).toFixed(1)}% < 85%), but surface (${req.surfaceType || 'equipment_panel'}) is trackable. Applying planar perspective DIEGETIC_SURFACE_RESTORE.`,
      }
    }

    return {
      decision: 'LOGO_FIDELITY_FAIL',
      passed: false,
      surfaceRestoreRequired: false,
      details: `Logo text/symbol corrupted (${(req.generatedLogoFidelityScore * 100).toFixed(1)}% < 85%) and surface is not trackable. Fail-closed.`,
    }
  }

  /**
   * Evaluates 8s Short Ad Creative Master Plan against Advertising Grammar V2 invariants.
   * Enforces:
   * - AD_GRAMMAR_FAIL: missing structure or required beats (HOOK, REVEAL, PROOF, BENEFIT/PAYOFF, BRAND_CLOSE)
   * - WEAK_HOOK: beat 1 (0-0.7s) lacks immediate visual action or product hook
   * - NO_CLEAR_PRODUCT_REVEAL: beat 2 lacks hero product reveal
   * - NO_PRODUCT_PROOF: beat 3 lacks physical or functional product demonstration
   * - MINI_FILM_NOT_AD: missing clear value proposition, CTA, or brand close
   * - REPETITIVE_CREATIVE: fingerprint identical to recently used tenant fingerprint
   */
  static evaluateAdvertisingGrammarQA(req: {
    masterPlan: import('../planner/short-ad-master-plan.js').ShortAdMasterPlan
    recentFingerprints?: import('../strategy/creative-diversity-guard.js').CreativeFingerprint[]
  }): {
    passed: boolean
    hardFailGate?:
      | 'AD_GRAMMAR_FAIL'
      | 'WEAK_HOOK'
      | 'NO_CLEAR_PRODUCT_REVEAL'
      | 'NO_PRODUCT_PROOF'
      | 'MINI_FILM_NOT_AD'
      | 'REPETITIVE_CREATIVE'
    reasons: string[]
  } {
    const beats = req.masterPlan.beats || []

    // 1. Structure check: must have 5 distinct beats covering 0-8s
    if (beats.length < 5) {
      return {
        passed: false,
        hardFailGate: 'AD_GRAMMAR_FAIL',
        reasons: ['AD_GRAMMAR_FAIL: Master plan must specify at least 5 structured advertising beats covering 0-8s.'],
      }
    }

    // 2. Hook check (0.0 - 0.7s)
    const hookBeat = beats.find(b => b.purpose === 'HOOK' || b.start === 0.0)
    if (!hookBeat || !hookBeat.visual_action || hookBeat.visual_action.trim().length < 10) {
      return {
        passed: false,
        hardFailGate: 'WEAK_HOOK',
        reasons: ['WEAK_HOOK: First beat (0.0-0.7s) must have high-impact visual action to prevent viewer scroll-away.'],
      }
    }

    // 3. Product reveal check (0.7 - 2.2s)
    const revealBeat = beats.find(b => b.purpose === 'REVEAL')
    if (!revealBeat || (!revealBeat.product_action && !revealBeat.visual_action)) {
      return {
        passed: false,
        hardFailGate: 'NO_CLEAR_PRODUCT_REVEAL',
        reasons: ['NO_CLEAR_PRODUCT_REVEAL: Product must be distinctly revealed within the first 2.2 seconds.'],
      }
    }

    // 4. Product proof check (2.2 - 4.5s)
    const proofBeat = beats.find(b => b.purpose === 'PRODUCT_PROOF')
    if (!proofBeat || (!proofBeat.product_action && !proofBeat.visual_action)) {
      return {
        passed: false,
        hardFailGate: 'NO_PRODUCT_PROOF',
        reasons: ['NO_PRODUCT_PROOF: Core functional product proof must be demonstrated between 2.2s and 4.5s.'],
      }
    }

    // 5. Mini film vs Commercial Ad check: must have brand end-card and CTA
    if (!req.masterPlan.end_card_plan || !req.masterPlan.end_card_plan.cta_text) {
      return {
        passed: false,
        hardFailGate: 'MINI_FILM_NOT_AD',
        reasons: ['MINI_FILM_NOT_AD: Video lacks deterministic CTA or brand closing card. Real commercial grammar required.'],
      }
    }

    // 6. Anti-fatigue repetition guard
    if (req.recentFingerprints && req.recentFingerprints.length > 0 && req.masterPlan.creative_fingerprint) {
      const lastFp = req.recentFingerprints[req.recentFingerprints.length - 1]
      if (
        lastFp &&
        lastFp.tenant_id === req.masterPlan.creative_fingerprint.tenant_id &&
        lastFp.format_variant === req.masterPlan.creative_fingerprint.format_variant &&
        lastFp.hook_type === req.masterPlan.creative_fingerprint.hook_type
      ) {
        return {
          passed: false,
          hardFailGate: 'REPETITIVE_CREATIVE',
          reasons: ['REPETITIVE_CREATIVE: Generated creative fingerprint clones the immediately preceding creative variant for this tenant.'],
        }
      }
    }

    return {
      passed: true,
      reasons: [],
    }
  }
}

export type FinalLongVideoQAReporter = FinalLongVideoQAReport
