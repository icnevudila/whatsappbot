import type { AdvertisingFormat, FormatVariant } from './advertising-grammar-registry.js'

export interface CreativeFingerprint {
  tenant_id: string
  ad_format: AdvertisingFormat
  format_variant: FormatVariant
  hook_type: string
  opening_visual_type: string
  camera_pattern: string
  environment_type: string
  speech_structure: string
  end_card_family: string
  created_at?: string
}

export interface DiversityEvaluationResult {
  isRepetitive: boolean
  repetitionScore: number // 0.0 to 1.0
  reasons: string[]
}

export interface DiversificationResult {
  fingerprint: CreativeFingerprint
  modified: boolean
  reasons: string[]
}

/**
 * CreativeDiversityGuard.
 * Prevents identical or near-identical video ads from being generated back-to-back
 * for the same tenant.
 *
 * Invariants:
 * 1. Authoritative assets (product photos, brand logos, verified facts) are NEVER altered.
 * 2. Creative variations (camera movement, opening macro angle, variant sub-family, hook perspective)
 *    are systematically rotated to maximize ad fatigue resistance.
 */
export class CreativeDiversityGuard {
  /**
   * Compares candidate fingerprint against tenant's recent creative history.
   */
  public evaluateDiversity(
    candidate: CreativeFingerprint,
    history: CreativeFingerprint[] = []
  ): DiversityEvaluationResult {
    if (!history || history.length === 0) {
      return { isRepetitive: false, repetitionScore: 0.0, reasons: [] }
    }

    const tenantHistory = history.filter(h => h.tenant_id === candidate.tenant_id)
    if (tenantHistory.length === 0) {
      return { isRepetitive: false, repetitionScore: 0.0, reasons: [] }
    }

    // Check against the most recent ad(s)
    const lastAd = tenantHistory[tenantHistory.length - 1]!
    const reasons: string[] = []
    let score = 0.0

    if (lastAd.ad_format === candidate.ad_format) {
      score += 0.3
      reasons.push(`Identical advertising format: ${candidate.ad_format}`)
    }

    if (lastAd.format_variant === candidate.format_variant) {
      score += 0.3
      reasons.push(`Identical format variant: ${candidate.format_variant}`)
    }

    if (lastAd.opening_visual_type === candidate.opening_visual_type) {
      score += 0.2
      reasons.push(`Identical opening visual framing: ${candidate.opening_visual_type}`)
    }

    if (lastAd.camera_pattern === candidate.camera_pattern) {
      score += 0.2
      reasons.push(`Identical camera motion pattern: ${candidate.camera_pattern}`)
    }

    const isRepetitive = score >= 0.6
    return {
      isRepetitive,
      repetitionScore: Math.min(1.0, score),
      reasons,
    }
  }

  /**
   * Ensures the candidate creative fingerprint is sufficiently distinct from recent ads.
   * If repetitive, systematically rotates variant, camera motion, and hook framing.
   */
  public guardAndDiversify(
    candidate: CreativeFingerprint,
    history: CreativeFingerprint[] = [],
    availableVariants: FormatVariant[] = []
  ): DiversificationResult {
    const evalResult = this.evaluateDiversity(candidate, history)

    if (!evalResult.isRepetitive) {
      return {
        fingerprint: { ...candidate },
        modified: false,
        reasons: [],
      }
    }

    const diversified = { ...candidate }
    const modifications: string[] = []

    // 1. Rotate Format Variant if alternatives exist
    if (availableVariants.length > 1) {
      const currentIndex = availableVariants.indexOf(candidate.format_variant)
      const nextIndex = (currentIndex + 1) % availableVariants.length
      diversified.format_variant = availableVariants[nextIndex]!
      modifications.push(`Rotated format_variant from ${candidate.format_variant} to ${diversified.format_variant}`)
    }

    // 2. Rotate Camera Pattern
    const cameraPatterns = [
      'macro_cine_shallow_push',
      'lateral_tracking_reveal',
      'high_angle_dynamic_descent',
      'whip_pan_focus_snap',
      'low_angle_heroic_orbit',
    ]
    const camIdx = cameraPatterns.indexOf(candidate.camera_pattern)
    const nextCamIdx = (camIdx + 1) % cameraPatterns.length
    diversified.camera_pattern = cameraPatterns[nextCamIdx]!
    modifications.push(`Rotated camera_pattern to ${diversified.camera_pattern}`)

    // 3. Rotate Opening Visual Type
    const openingTypes = [
      'product_functional_macro',
      'operator_handling_motion',
      'dynamic_result_first_payoff',
      'kinetic_in_situ_burst',
    ]
    const openIdx = openingTypes.indexOf(candidate.opening_visual_type)
    const nextOpenIdx = (openIdx + 1) % openingTypes.length
    diversified.opening_visual_type = openingTypes[nextOpenIdx]!
    modifications.push(`Rotated opening_visual_type to ${diversified.opening_visual_type}`)

    return {
      fingerprint: diversified,
      modified: true,
      reasons: modifications,
    }
  }
}
