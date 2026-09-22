import type { BusinessModel, TenantAsset } from '../types/asset-intake.js'
import type { AdvertisingFormat } from './advertising-grammar-registry.js'

export type UserStylePreference =
  | 'AUTO'
  | 'FAST_SALES'
  | 'PRODUCT_USAGE'
  | 'PROBLEM_SOLUTION'
  | 'SOCIAL_UGC'
  | 'PREMIUM'
  | 'OFFER'

export interface AdFormatRoutingResult {
  ad_format: AdvertisingFormat
  selection_reason: string
  source_preference: UserStylePreference | string
  fallback_applied: boolean
}

/**
 * AdFormatRouter / ShortAdFormatRouter.
 * Resolves user style preference, campaign objective, sector, and business model
 * into one of the 8 standard advertising grammars with an explicit audit reason.
 *
 * Rules:
 * - Brand names must NEVER be hardcoded.
 * - For physical product promotion / conversion ads, DO NOT default to BRAND_CINEMATIC.
 * - Default toward PERFORMANCE_DEMO or PROBLEM_SOLUTION.
 * - Source of truth lives in creative-video-orchestrator.
 */
export class AdFormatRouter {
  public routeStyleToFormat(
    userPreference: UserStylePreference | string = 'AUTO',
    objective: string = 'conversion',
    sectorProfile: string = 'general',
    businessModel: BusinessModel = 'physical_product',
    assets: TenantAsset[] = []
  ): AdFormatRoutingResult {
    const prefUpper = (userPreference || 'AUTO').toUpperCase().trim()
    const objLower = (objective || '').toLowerCase().trim()

    // 1. Explicit User Style Preference from Wizard
    if (prefUpper === 'FAST_SALES') {
      return {
        ad_format: 'PERFORMANCE_DEMO',
        selection_reason: 'User explicitly selected FAST_SALES style preference. Routing to PERFORMANCE_DEMO for instant visual hook, active mechanical proof, and strong conversion tempo.',
        source_preference: prefUpper,
        fallback_applied: false,
      }
    }

    if (prefUpper === 'PRODUCT_USAGE') {
      return {
        ad_format: 'PRODUCT_USAGE',
        selection_reason: 'User explicitly selected PRODUCT_USAGE style preference. Routing to PRODUCT_USAGE to showcase ergonomic handling and practical in-situ application.',
        source_preference: prefUpper,
        fallback_applied: false,
      }
    }

    if (prefUpper === 'PROBLEM_SOLUTION') {
      return {
        ad_format: 'PROBLEM_SOLUTION',
        selection_reason: 'User explicitly selected PROBLEM_SOLUTION style preference. Routing to PROBLEM_SOLUTION to highlight real-world friction and position the product as the definitive solution.',
        source_preference: prefUpper,
        fallback_applied: false,
      }
    }

    if (prefUpper === 'SOCIAL_UGC') {
      return {
        ad_format: 'UGC_TESTIMONIAL',
        selection_reason: 'User explicitly selected SOCIAL_UGC style preference. Routing to UGC_TESTIMONIAL for creator-first unboxing, authentic review, or community tip.',
        source_preference: prefUpper,
        fallback_applied: false,
      }
    }

    if (prefUpper === 'PREMIUM') {
      const format: AdvertisingFormat = (objLower.includes('awareness') || objLower.includes('prestige')) && businessModel !== 'physical_product'
        ? 'BRAND_CINEMATIC'
        : 'PRODUCT_HERO'
      return {
        ad_format: format,
        selection_reason: `User explicitly selected PREMIUM style preference. Routing to ${format} for elevated cinematic lighting and hero product showcase.`,
        source_preference: prefUpper,
        fallback_applied: false,
      }
    }

    if (prefUpper === 'OFFER') {
      return {
        ad_format: 'OFFER_DRIVEN',
        selection_reason: 'User explicitly selected OFFER style preference. Routing to OFFER_DRIVEN for high-visibility commercial deal, pricing hook, and direct CTA.',
        source_preference: prefUpper,
        fallback_applied: false,
      }
    }

    // 2. AUTO Preference: Intelligently inferred from Business Model + Campaign Objective
    if (businessModel === 'saas_software') {
      if (objLower.includes('problem') || objLower.includes('pain') || objLower.includes('sorun')) {
        return {
          ad_format: 'PROBLEM_SOLUTION',
          selection_reason: 'AUTO selected for SaaS: Campaign objective highlights operational pain points. Routing to PROBLEM_SOLUTION.',
          source_preference: 'AUTO',
          fallback_applied: false,
        }
      }
      return {
        ad_format: 'SOFTWARE_DEMO',
        selection_reason: 'AUTO selected for SaaS: Routing to SOFTWARE_DEMO to highlight interface velocity, data insights, and workflow ease.',
        source_preference: 'AUTO',
        fallback_applied: false,
      }
    }

    if (objLower.includes('offer') || objLower.includes('discount') || objLower.includes('indirim') || objLower.includes('fiyat')) {
      return {
        ad_format: 'OFFER_DRIVEN',
        selection_reason: 'AUTO selected: Campaign objective contains pricing or promotional offer. Routing to OFFER_DRIVEN.',
        source_preference: 'AUTO',
        fallback_applied: false,
      }
    }

    if (objLower.includes('ugc') || objLower.includes('testimonial') || objLower.includes('creator') || objLower.includes('yorum')) {
      return {
        ad_format: 'UGC_TESTIMONIAL',
        selection_reason: 'AUTO selected: Campaign objective requests authentic customer reaction or creator test. Routing to UGC_TESTIMONIAL.',
        source_preference: 'AUTO',
        fallback_applied: false,
      }
    }

    if (objLower.includes('problem') || objLower.includes('pain') || objLower.includes('before') || objLower.includes('sorun')) {
      return {
        ad_format: 'PROBLEM_SOLUTION',
        selection_reason: 'AUTO selected: Campaign objective addresses friction or pain points. Routing to PROBLEM_SOLUTION.',
        source_preference: 'AUTO',
        fallback_applied: false,
      }
    }

    if (objLower.includes('brand_awareness') || objLower.includes('farkındalık') || objLower.includes('prestige')) {
      return {
        ad_format: 'PRODUCT_HERO',
        selection_reason: 'AUTO selected: Brand awareness objective for product. Routing to PRODUCT_HERO to maintain product fidelity over abstract mood film.',
        source_preference: 'AUTO',
        fallback_applied: false,
      }
    }

    if (objLower.includes('usage') || objLower.includes('workflow') || objLower.includes('kullanım')) {
      return {
        ad_format: 'PRODUCT_USAGE',
        selection_reason: 'AUTO selected: Usage education objective. Routing to PRODUCT_USAGE.',
        source_preference: 'AUTO',
        fallback_applied: false,
      }
    }

    // Default for physical product / ordinary conversion ad:
    // Strictly PERFORMANCE_DEMO (never BRAND_CINEMATIC)
    return {
      ad_format: 'PERFORMANCE_DEMO',
      selection_reason: 'AUTO selected: Conversion / product promotion objective. Routing to PERFORMANCE_DEMO for instant hook, physical proof, and commercial conversion tempo.',
      source_preference: 'AUTO',
      fallback_applied: true,
    }
  }

  // Backward compatibility helper
  public selectFormat(
    objective: string = 'conversion',
    businessModel: BusinessModel = 'physical_product',
    assets: TenantAsset[] = []
  ): AdvertisingFormat {
    return this.routeStyleToFormat('AUTO', objective, 'general', businessModel, assets).ad_format
  }
}
