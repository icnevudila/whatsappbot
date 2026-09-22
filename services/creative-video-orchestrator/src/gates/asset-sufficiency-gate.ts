import type { TenantAssetInventory, AssetRole, BusinessModel } from '../types/asset-intake.js'

export type SufficiencyStatus = 'PASS' | 'NEEDS_ASSET'

export interface AssetSufficiencyResult {
  status: SufficiencyStatus
  business_model: BusinessModel
  missing_roles: AssetRole[]
  rationale: string
  authoritativeAssetsAvailable: {
    hasLogo: boolean
    hasProductImage: boolean
    hasAppScreenshot: boolean
    hasEnvironmentRef: boolean
  }
}

export class AssetSufficiencyGate {
  /**
   * Enforces that authoritative assets are strictly present BEFORE generation starts.
   * Never allows the model to invent unverified products, logos, or software interfaces.
   */
  static evaluate(inventory: TenantAssetInventory): AssetSufficiencyResult {
    const missing: AssetRole[] = []

    const hasLogo = Boolean(inventory.official_logo && inventory.official_logo.approved)
    const hasProductImage = inventory.product_images.some(p => p.approved && p.file_path)
    const hasAppScreenshot =
      inventory.website_or_app_screens.some(s => s.approved && s.file_path) ||
      inventory.service_screenshots.some(s => s.approved && s.file_path)
    const hasEnvironmentRef = inventory.environment_references.some(e => e.approved && e.file_path)

    if (!hasLogo) {
      missing.push('official_logo')
    }

    switch (inventory.business_model) {
      case 'physical_product':
      case 'retail_cpg':
        if (!hasProductImage) {
          missing.push('product_image')
        }
        break

      case 'saas_software':
        // Real UI/dashboard/app screenshot REQUIRED for software/SaaS
        if (!hasAppScreenshot) {
          missing.push('website_or_app_screen')
        }
        break

      case 'restaurant_food':
        if (!hasProductImage) {
          missing.push('product_image')
        }
        break

      case 'service_business':
        if (!hasProductImage && !hasEnvironmentRef && !hasAppScreenshot) {
          missing.push('environment_reference')
        }
        break
    }

    const passed = missing.length === 0

    let rationale = ''
    if (passed) {
      rationale = `Asset sufficiency verified for ${inventory.business_model}. Authoritative assets are grounded and locked.`
    } else {
      rationale = `Cannot start generation for ${inventory.business_model}. Missing required authoritative assets: [${missing.join(', ')}]. Model is forbidden from hallucinating missing assets.`
    }

    return {
      status: passed ? 'PASS' : 'NEEDS_ASSET',
      business_model: inventory.business_model,
      missing_roles: missing,
      rationale,
      authoritativeAssetsAvailable: {
        hasLogo,
        hasProductImage,
        hasAppScreenshot,
        hasEnvironmentRef,
      },
    }
  }
}
