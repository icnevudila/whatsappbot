/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * DYNAMIC BRAND VISIBILITY ENGINE (V6 HARDENED)
 * 
 * Kesin İlke:
 * 1. Forced billboard (tarlaya/mutfağa devasa yapay tabela koyma) YASAKTIR.
 * 2. Üniforma logosu, araç giydirme veya fabrika tabelası da OTOMATİK ZORUNLU DEĞİLDİR.
 * 3. Marka görünümü konseptin doğasına göre seçilir (dijital UI bildirimi, ambalaj kabartması,
 *    lazer plaket, minimal iş önlüğü arması veya tamamen temiz çekim).
 * 4. Exact logo fidelity gerekiyorsa default ve güvenli tercih:
 *    POST-PRODUCTION EXACT LOGO COMPOSITING.
 *    Veo'ya prompt üzerinden logo uydurtmak EN SON seçenektir.
 */

import type { SceneContractV2 } from './creative-types'

export interface BrandVisibilityAudit {
  passed: boolean
  totalBrandExposurePercent: number
  hasForcedArtificialSignage: boolean
  exactLogoStrategy: 'post_production_composite' | 'subtle_product_emboss' | 'concept_driven_natural'
  brandAppearanceType: string
  warnings: string[]
}

export function auditBrandVisibility(
  scenes: SceneContractV2[],
  grammarType: 'short_performance' | 'mid_form' | 'brand_film',
  options: {
    hasLogoAsset?: boolean
    conceptAppearancePreference?: string
  } = {}
): BrandVisibilityAudit {
  const warnings: string[] = []
  const hasLogoAsset = options.hasLogoAsset ?? false

  let totalDuration = 0
  let weightedBrandExposure = 0
  let forcedSignageCount = 0

  for (const sc of scenes) {
    totalDuration += sc.durationSec
    weightedBrandExposure += sc.durationSec * sc.brandVisibility

    // Tarlanın ortasına veya uyumsuz mekana zoraki konulan dev tabelalar
    const lowerAction = sc.primaryAction.toLowerCase()
    if (
      lowerAction.includes('bina tabelası') ||
      lowerAction.includes('akrilik tabela') ||
      lowerAction.includes('dev afiş') ||
      lowerAction.includes('giant billboard')
    ) {
      forcedSignageCount++
    }
  }

  const effectiveExposureRatio = totalDuration > 0 ? (weightedBrandExposure / totalDuration) : 0
  const exposurePercent = Math.round(effectiveExposureRatio * 100)

  // Kısa reklamda logo dozu %45'i geçmemeli
  if (grammarType === 'short_performance' && exposurePercent > 45) {
    warnings.push(`EXCESSIVE_BRAND_EXPOSURE: Marka görünürlüğü (%${exposurePercent}) kısa reklam için aşırı yüksek.`)
  }

  const hasForcedArtificialSignage = forcedSignageCount > 0
  if (hasForcedArtificialSignage) {
    warnings.push('FORCED_SIGNAGE_DETECTED: Sırf marka adı göstermek için yapay tabela sahnesi üretilmiş.')
  }

  // Exact Logo Stratejisi:
  // Logo asset'i varsa veya kurumsal kimlik korunacaksa her zaman post-production exact composite tercih edilir
  const exactLogoStrategy: BrandVisibilityAudit['exactLogoStrategy'] = hasLogoAsset
    ? 'post_production_composite'
    : options.conceptAppearancePreference === 'emboss'
      ? 'subtle_product_emboss'
      : 'concept_driven_natural'

  const brandAppearanceType = options.conceptAppearancePreference ||
    (hasLogoAsset ? 'post_production_exact_overlay' : 'integrated_concept_signature')

  return {
    passed: warnings.length === 0,
    totalBrandExposurePercent: exposurePercent,
    hasForcedArtificialSignage,
    exactLogoStrategy,
    brandAppearanceType,
    warnings,
  }
}
