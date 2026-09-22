/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * BRAND VISIBILITY BUDGET ENGINE (V6)
 * 
 * Kesin İlke:
 * Her sahneye yapay logo veya bina tabelası koyma zorunluluğu kaldırılmıştır.
 * Marka görünürlüğü zaman içerisinde kontrollü bir bütçe ile yönetilir.
 * Exact Logo Tercih Sırası:
 * 1. Ürün üzerindeki gerçek logo
 * 2. Referans asset ile fiziksel marka
 * 3. Post-production exact logo compositing
 * 4. Veo'nun serbest tabela üretimi (Son çare)
 */

import type { SceneContractV2 } from './creative-types'

export interface BrandVisibilityAudit {
  passed: boolean
  totalBrandExposurePercent: number
  hasForcedArtificialSignage: boolean
  exactLogoStrategy: 'product_surface' | 'post_production_composite' | 'physical_plaque'
  warnings: string[]
}

export function auditBrandVisibility(
  scenes: SceneContractV2[],
  grammarType: 'short_performance' | 'mid_form' | 'brand_film',
  hasLogoAsset = false
): BrandVisibilityAudit {
  const warnings: string[] = []

  let totalDuration = 0
  let weightedBrandExposure = 0
  let forcedSignageCount = 0

  for (const sc of scenes) {
    totalDuration += sc.durationSec
    weightedBrandExposure += sc.durationSec * sc.brandVisibility

    if (sc.primaryAction.toLowerCase().includes('bina tabelası') || sc.primaryAction.toLowerCase().includes('akrilik tabela')) {
      forcedSignageCount++
    }
  }

  const effectiveExposureRatio = totalDuration > 0 ? (weightedBrandExposure / totalDuration) : 0
  const exposurePercent = Math.round(effectiveExposureRatio * 100)

  // Kısa reklamda logo dozu %40'ı geçmemeli, yoksa tabela klibine döner
  if (grammarType === 'short_performance' && exposurePercent > 45) {
    warnings.push(`EXCESSIVE_BRAND_EXPOSURE: Marka görünürlüğü (%${exposurePercent}) kısa reklam için aşırı yüksek; ürün eylemini gölgeliyor.`)
  }

  const hasForcedArtificialSignage = forcedSignageCount > 0
  if (hasForcedArtificialSignage) {
    warnings.push('FORCED_SIGNAGE_DETECTED: Sırf marka adı göstermek için yapay tabela sahnesi üretilmiş.')
  }

  // Exact Logo Stratejisi
  const exactLogoStrategy: BrandVisibilityAudit['exactLogoStrategy'] = hasLogoAsset
    ? 'post_production_composite'
    : 'product_surface'

  return {
    passed: warnings.length === 0,
    totalBrandExposurePercent: exposurePercent,
    hasForcedArtificialSignage,
    exactLogoStrategy,
    warnings,
  }
}
