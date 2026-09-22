import type { BusinessModel } from '../types/asset-intake.js'
import {
  AdvertisingGrammarRegistry,
  type AdvertisingFormat,
  type FormatVariant,
} from './advertising-grammar-registry.js'
import type { CreativeFingerprint } from './creative-diversity-guard.js'

export interface VariantSelectionResult {
  format_variant: FormatVariant
  selection_reason: string
  available_variants: FormatVariant[]
}

/**
 * FormatVariantSelector.
 * Selects a concrete format variant family from the AdvertisingGrammarRegistry
 * ensuring context suitability and anti-fatigue variant rotation.
 */
export class FormatVariantSelector {
  public selectVariant(
    adFormat: AdvertisingFormat,
    sectorProfile: string = 'general',
    businessModel: BusinessModel = 'physical_product',
    history: CreativeFingerprint[] = [],
    tenantId?: string
  ): VariantSelectionResult {
    const spec = AdvertisingGrammarRegistry.getSpec(adFormat)
    const available = spec.supportedVariants

    if (available.length === 0) {
      return {
        format_variant: spec.defaultVariant,
        selection_reason: `Default variant assigned for ${adFormat}`,
        available_variants: [spec.defaultVariant],
      }
    }

    // Filter history for this tenant
    const tenantHistory = tenantId
      ? history.filter(h => h.tenant_id === tenantId)
      : history

    // Check if tenant recently used any variant of this format
    const recentMatchingAds = tenantHistory.filter(h => h.ad_format === adFormat)

    if (recentMatchingAds.length > 0) {
      const lastVariant = recentMatchingAds[recentMatchingAds.length - 1]!.format_variant
      const lastIdx = available.indexOf(lastVariant)
      if (lastIdx !== -1 && available.length > 1) {
        // Rotate to the next variant
        const nextIdx = (lastIdx + 1) % available.length
        const selected = available[nextIdx]!
        return {
          format_variant: selected,
          selection_reason: `Rotated from previous variant ${lastVariant} to ${selected} to prevent creative fatigue for tenant.`,
          available_variants: available,
        }
      }
    }

    // Context-sensitive default selection
    let chosen = spec.defaultVariant
    let reason = `Selected primary default variant ${chosen} for ${adFormat}.`

    if (adFormat === 'PERFORMANCE_DEMO') {
      if (sectorProfile.toLowerCase().includes('agri') || sectorProfile.toLowerCase().includes('garden')) {
        chosen = 'MACRO_FIRST'
        reason = 'Selected MACRO_FIRST for agricultural/outdoor gear to capture fine nozzle/spray mechanics immediately.'
      } else if (sectorProfile.toLowerCase().includes('construction') || sectorProfile.toLowerCase().includes('industrial')) {
        chosen = 'HUMAN_ACTION_FIRST'
        reason = 'Selected HUMAN_ACTION_FIRST for industrial gear to ground the tool in active craftmanship.'
      } else {
        chosen = 'RESULT_FIRST'
        reason = 'Selected RESULT_FIRST for fast conversion engagement.'
      }
    } else if (adFormat === 'PROBLEM_SOLUTION') {
      chosen = 'FRICTION_FIRST'
      reason = 'Selected FRICTION_FIRST to emphasize the recognized friction before introducing the solution.'
    }

    return {
      format_variant: chosen,
      selection_reason: reason,
      available_variants: available,
    }
  }
}
