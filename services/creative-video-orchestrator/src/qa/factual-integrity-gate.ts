import type { BrandContextSnapshot } from '../types/brand-snapshot.js'
import type { ShortAdMasterPlan } from '../planner/short-ad-master-plan.js'
import type { VeoFootagePromptCompilation } from '../compiler/veo-prompt-compiler.js'
import type { EndCardTemplateSpec, LowerThirdRenderSpec } from '../compositor/campaign-text-renderer.js'

export interface FactualGateViolation {
  field: string
  unverifiedValue: string
  reason: string
  hardFailCode: 'UNVERIFIED_PHONE_LEAKAGE' | 'UNVERIFIED_URL_LEAKAGE' | 'UNVERIFIED_PRICE_LEAKAGE' | 'UNVERIFIED_CLAIM_LEAKAGE'
}

export interface FactualGateReport {
  passed: boolean
  violations: FactualGateViolation[]
  hardFailGate?: string
}

const DEFAULT_UNVERIFIED_PERFORMANCE_PATTERNS = [
  'mikronize',
  'homojen sis',
  'without leaking',
  'yorulmadan',
  'kesintisiz',
  'damlatmayan',
  'mikro diyafram',
  'ultra yüksek basınç',
]

/**
 * FactualIntegrityGate.
 * Strict fail-closed verification ensuring NO hallucinated, unverified,
 * or fabricated marketing claims, phone numbers, URLs, or prices reach
 * any downstream component (Veo prompt, Lower-Third, End-Card, Compositor).
 */
export class FactualIntegrityGate {
  /**
   * Validates a compiled Veo prompt against unverified facts and unverified performance claims.
   */
  public static validateVeoPrompt(
    prompt: string,
    snapshot: BrandContextSnapshot
  ): FactualGateReport {
    const violations: FactualGateViolation[] = []
    const promptLower = prompt.toLowerCase()

    // 1. Check against snapshot's explicit unverified_facts list
    const unverifiedList = snapshot.unverified_facts || []
    for (const unverified of unverifiedList) {
      if (!unverified || !unverified.trim()) continue
      const target = unverified.toLowerCase().trim()
      if (promptLower.includes(target)) {
        violations.push({
          field: 'veo_prompt',
          unverifiedValue: unverified,
          reason: `Unverified fact "${unverified}" was detected in Veo prompt.`,
          hardFailCode: 'UNVERIFIED_CLAIM_LEAKAGE',
        })
      }
    }

    // 2. Check unverified performance patterns unless explicitly present in verified_claims
    const verifiedClaims = (snapshot.verified_claims || []).map(c => c.toLowerCase())
    for (const pattern of DEFAULT_UNVERIFIED_PERFORMANCE_PATTERNS) {
      if (promptLower.includes(pattern)) {
        const isVerified = verifiedClaims.some(c => c.includes(pattern))
        if (!isVerified) {
          violations.push({
            field: 'veo_prompt',
            unverifiedValue: pattern,
            reason: `Unverified product-performance claim "${pattern}" was detected in Veo prompt without verified DB claim.`,
            hardFailCode: 'UNVERIFIED_CLAIM_LEAKAGE',
          })
        }
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      hardFailGate: violations[0]?.hardFailCode,
    }
  }

  /**
   * Validates compositor render specs (Lower Third and End Card)
   * to ensure no fake phone number, URL, price, or unverified claims appear.
   */
  public static validateCompositorSpec(
    spec: {
      lowerThird?: LowerThirdRenderSpec | any
      endCard?: EndCardTemplateSpec | any
    },
    snapshot: BrandContextSnapshot
  ): FactualGateReport {
    const violations: FactualGateViolation[] = []
    const verifiedPhone = (snapshot.campaign.phoneNumber || '').replace(/\s+/g, '')
    const verifiedWebsite = (snapshot.campaign.website || '').toLowerCase().trim()
    const verifiedPrice = (snapshot.campaign.price || '').toLowerCase().trim()
    const unverifiedList = (snapshot.unverified_facts || []).map(u => u.toLowerCase().trim())

    const checkString = (str: string | undefined, sourceArea: string) => {
      if (!str) return
      const lower = str.toLowerCase()

      // Phone number detection pattern (e.g., 0850..., 05xx..., +90..., 444...)
      const phoneRegex = /(?:\+?90|0)?\s*(?:850|5\d{2}|[2-4]\d{2})\s*\d{3}\s*\d{2}\s*\d{2}|\b444\s*\d{1}\s*\d{3}\b/g
      const phoneMatches = str.match(phoneRegex) || []
      for (const match of phoneMatches) {
        const cleanMatch = match.replace(/\s+/g, '')
        if (!verifiedPhone || cleanMatch !== verifiedPhone) {
          violations.push({
            field: sourceArea,
            unverifiedValue: match.trim(),
            reason: `Unverified phone number "${match.trim()}" injected into ${sourceArea} without verified source provenance.`,
            hardFailCode: 'UNVERIFIED_PHONE_LEAKAGE',
          })
        }
      }

      // Web URL detection pattern
      const urlRegex = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.(?:com\.tr|com|net|org|io|me)\b/gi
      const urlMatches = str.match(urlRegex) || []
      for (const match of urlMatches) {
        const cleanUrl = match.toLowerCase().trim()
        if (!verifiedWebsite || cleanUrl !== verifiedWebsite) {
          violations.push({
            field: sourceArea,
            unverifiedValue: match.trim(),
            reason: `Unverified website URL "${match.trim()}" injected into ${sourceArea} without verified source provenance.`,
            hardFailCode: 'UNVERIFIED_URL_LEAKAGE',
          })
        }
      }

      // Check unverified list substring
      for (const unv of unverifiedList) {
        if (unv && lower.includes(unv)) {
          violations.push({
            field: sourceArea,
            unverifiedValue: unv,
            reason: `Unverified value "${unv}" present in ${sourceArea}.`,
            hardFailCode: 'UNVERIFIED_PRICE_LEAKAGE',
          })
        }
      }
    }

    if (spec.lowerThird) {
      checkString(spec.lowerThird.textLine1, 'lower_third.textLine1')
      checkString(spec.lowerThird.textLine2, 'lower_third.textLine2')
      checkString(spec.lowerThird.drawtextFilter, 'lower_third.drawtextFilter')
    }

    if (spec.endCard) {
      checkString(spec.endCard.headline, 'end_card.headline')
      checkString(spec.endCard.offerPriceText, 'end_card.offerPriceText')
      checkString(spec.endCard.contactInfo, 'end_card.contactInfo')
      checkString(spec.endCard.website_or_phone, 'end_card.website_or_phone')
      checkString(spec.endCard.filterComplexSnippet, 'end_card.filterComplexSnippet')
    }

    return {
      passed: violations.length === 0,
      violations,
      hardFailGate: violations[0]?.hardFailCode,
    }
  }

  /**
   * Complete validation of the entire render graph:
   * MasterPlan + Veo Prompt + Compositor specs.
   */
  public static validateRenderGraph(
    snapshot: BrandContextSnapshot,
    plan: ShortAdMasterPlan,
    veoPrompt: string,
    compositorSpec: { lowerThird?: any; endCard?: any }
  ): FactualGateReport {
    const promptReport = this.validateVeoPrompt(veoPrompt, snapshot)
    const compReport = this.validateCompositorSpec(compositorSpec, snapshot)

    const allViolations = [...promptReport.violations, ...compReport.violations]
    return {
      passed: allViolations.length === 0,
      violations: allViolations,
      hardFailGate: allViolations[0]?.hardFailCode,
    }
  }
}
