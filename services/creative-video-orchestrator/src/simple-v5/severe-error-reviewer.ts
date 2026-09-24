import type { SimpleV5ReviewReport, SevereFailureCode } from './types.js'
import type { AudioIntegrityReport } from '../qa/audio-integrity-gate.js'
import type { VideoReviewReport } from '../qa/chatgpt-video-reviewer.js'

/**
 * SimpleV5SevereReviewer.
 * Consolidates post-generation review into ONE combined pass.
 * Strictly triggers regeneration ONLY for severe existential failures:
 * - WRONG_PRODUCT
 * - FOREIGN_BRAND
 * - severe PRODUCT_MORPH
 * - obviously WRONG_SECTOR
 * - actual speech wrong language (RAW_GENERATION_AUDIO_LANGUAGE_MISMATCH)
 * - severe fake product UI
 * - unusable AI-generated text/branding (INVENTED_DIEGETIC_BRANDING)
 * - impossible product operation
 *
 * Minor aesthetic imperfections, pacing nuances, or subtle lighting differences
 * NEVER trigger regeneration.
 */
export class SimpleV5SevereReviewer {
  public static evaluateSevereErrorsOnly(input: {
    audioReport?: AudioIntegrityReport
    videoReport?: VideoReviewReport
    sampledFrames?: string[]
  }): SimpleV5ReviewReport {
    const severeCodes: SevereFailureCode[] = []
    const issues: string[] = []

    // 1. Audio Language Check (Must be authentic Turkish, English speech strictly forbidden)
    if (input.audioReport && !input.audioReport.passed) {
      if (
        input.audioReport.failureCode === 'ACTUAL_AUDIO_LANGUAGE_MISMATCH' ||
        input.audioReport.failureCode === 'RAW_GENERATION_AUDIO_LANGUAGE_MISMATCH' ||
        input.audioReport.detectedLanguage?.toLowerCase() === 'en'
      ) {
        severeCodes.push('RAW_GENERATION_AUDIO_LANGUAGE_MISMATCH')
        issues.push(
          `SEVERE_AUDIO_ERROR: Spoken language was detected as ${input.audioReport.detectedLanguage?.toUpperCase() || 'foreign'} ("${input.audioReport.transcript || ''}"). Turkish expected.`
        )
      }
    }

    // 2. Video Review Report Mapping (Filter only severe existential defects)
    if (input.videoReport) {
      const vCodes = input.videoReport.failure_codes || []

      if (vCodes.includes('WRONG_PRODUCT') || vCodes.includes('PRODUCT_IDENTITY_FAIL')) {
        severeCodes.push('WRONG_PRODUCT')
        issues.push('SEVERE_PRODUCT_ERROR: Generated subject does not match canonical product reference.')
      }

      if (vCodes.includes('FOREIGN_BRAND')) {
        severeCodes.push('FOREIGN_BRAND')
        issues.push('SEVERE_BRAND_ERROR: Competitor or foreign brand detected in video.')
      }

      if (vCodes.includes('PRODUCT_MORPH_FAIL') || input.videoReport.product_morph_detected) {
        severeCodes.push('PRODUCT_MORPH')
        issues.push('SEVERE_MORPH_ERROR: Severe physical geometry deformation of product.')
      }

      if (vCodes.includes('WRONG_SECTOR') || vCodes.includes('ENVIRONMENT_MISMATCH') || input.videoReport.sector_environment_match === false) {
        severeCodes.push('WRONG_SECTOR')
        issues.push('SEVERE_SECTOR_ERROR: Environment is completely foreign to product reality.')
      }

      if (
        vCodes.includes('INVENTED_DIEGETIC_BRANDING') ||
        vCodes.includes('RAW_VIDEO_BRANDING_MISMATCH') ||
        input.videoReport.hallucinated_typography_detected
      ) {
        severeCodes.push('INVENTED_DIEGETIC_BRANDING')
        issues.push('SEVERE_BRANDING_ERROR: Invented or hallucinated brand mark/stamp on product.')
      }

      if (vCodes.includes('FAKE_UI')) {
        severeCodes.push('SEVERE_FAKE_UI')
        issues.push('SEVERE_UI_ERROR: Unusable fake synthetic UI rendered.')
      }

      if (vCodes.includes('IMPOSSIBLE_PRODUCT_OPERATION')) {
        severeCodes.push('IMPOSSIBLE_PRODUCT_OPERATION')
        issues.push('SEVERE_OPERATION_ERROR: Physical impossibility in product usage.')
      }
    }

    const isSevere = severeCodes.length > 0
    const evidenceUnavailable =
      !input.videoReport ||
      input.videoReport.decision === 'NEEDS_REVIEW' ||
      !input.audioReport ||
      (!input.audioReport.passed && input.audioReport.failureCode !== 'RAW_GENERATION_AUDIO_LANGUAGE_MISMATCH')
    const decision: 'PASS' | 'NEEDS_REVIEW' | 'REGENERATE' = isSevere
      ? 'REGENERATE'
      : evidenceUnavailable
        ? 'NEEDS_REVIEW'
        : 'PASS'

    return {
      passed: decision === 'PASS',
      decision,
      severeFailureCodes: severeCodes,
      issues,
      details: isSevere
        ? `Severe failure detected: [${severeCodes.join(', ')}]. Regeneration required.`
        : evidenceUnavailable
          ? 'No severe failure was proven, but perceptual or audio evidence is incomplete; human review is required.'
          : 'All severe failure checks passed. Video approved for deterministic finishing.',
      isSevere,
    }
  }
}
