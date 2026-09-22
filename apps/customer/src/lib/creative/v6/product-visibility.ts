/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * CONFIGURABLE PRODUCT VISIBILITY BUDGET ENGINE (V6 HARDENED)
 * 
 * Kesin İlke:
 * %50 ürün görünürlüğü global bir hard invariant DEĞİLDİR.
 * Bütçe; gramer, kampanya hedefi, ürün kategorisi ve yönetmen kurgusundan türetilir:
 * - Direct Response Short: %55 - %80
 * - Brand Short: %35 - %70
 * - Long Brand Film: %25 - %60
 * - Luxury / Atmospheric: %20 - %50 (Konsept odaklı)
 * 6 saniyelik ürün yokluğu (absence) kuralı yalnızca kısa performans videolarında uygulanır.
 * Uzun metrajlı veya atmosferik marka filmlerinde global hard fail olamaz.
 */

import type { SceneContractV2 } from './creative-types'

export interface ProductVisibilityConfig {
  campaignObjective?: 'direct_response' | 'product_demonstration' | 'brand_awareness' | 'luxury_atmospheric' | string
  productCategory?: string
  customMinExposurePercent?: number
  customMaxAbsenceSec?: number
}

export interface ProductVisibilityAudit {
  passed: boolean
  totalDirectExposurePercent: number
  longestAbsenceSeconds: number
  targetExposureMin: number
  targetExposureMax: number
  warnings: string[]
  errors: string[]
}

export function auditProductVisibility(
  scenes: SceneContractV2[],
  grammarType: 'short_performance' | 'mid_form' | 'brand_film',
  config: ProductVisibilityConfig = {}
): ProductVisibilityAudit {
  const warnings: string[] = []
  const errors: string[] = []
  const objective = config.campaignObjective || 'direct_response'

  // Dinamik hedef aralıkları
  let targetMin = 50
  let targetMax = 80
  let maxAllowedAbsence = 6.0
  let enforceAbsenceRule = true

  if (grammarType === 'short_performance') {
    if (objective === 'brand_awareness') {
      targetMin = 35
      targetMax = 70
      maxAllowedAbsence = 5.0
    } else if (objective === 'luxury_atmospheric') {
      targetMin = 30
      targetMax = 65
      maxAllowedAbsence = 6.0
    } else {
      // Direct response default
      targetMin = config.customMinExposurePercent ?? 55
      targetMax = 85
      maxAllowedAbsence = config.customMaxAbsenceSec ?? 4.0
    }
  } else if (grammarType === 'mid_form') {
    targetMin = objective === 'brand_awareness' ? 30 : 45
    targetMax = 75
    maxAllowedAbsence = 8.0
  } else {
    // Brand Film / Long Form (25–60s)
    targetMin = objective === 'luxury_atmospheric' ? 20 : 25
    targetMax = 60
    maxAllowedAbsence = 14.0 // Uzun filmlerde dünya ve bağlam kurulurken ürün hemen girmeyebilir
    enforceAbsenceRule = objective === 'direct_response' // Atmosferik uzun filmlerde hard fail yok
  }

  let totalDuration = 0
  let weightedProductExposure = 0
  let currentAbsence = 0
  let maxAbsence = 0

  for (const sc of scenes) {
    totalDuration += sc.durationSec
    weightedProductExposure += sc.durationSec * sc.productVisibility

    if (sc.productVisibility < 0.20) {
      currentAbsence += sc.durationSec
      if (currentAbsence > maxAbsence) maxAbsence = currentAbsence
    } else {
      currentAbsence = 0
    }
  }

  const effectiveExposureRatio = totalDuration > 0 ? (weightedProductExposure / totalDuration) : 0
  const exposurePercent = Math.round(effectiveExposureRatio * 100)

  // Kontroller
  if (exposurePercent < targetMin) {
    warnings.push(
      `LOW_PRODUCT_VISIBILITY: ${grammarType} (${objective}) için ürün görünürlüğü (%${exposurePercent}) hedeflenen minimum %${targetMin} seviyesinin altında.`
    )
  }

  if (enforceAbsenceRule && maxAbsence > maxAllowedAbsence) {
    warnings.push(
      `PRODUCT_ABSENCE_TOO_LONG: Ürün ${maxAbsence.toFixed(1)} saniye boyunca kadrajdan uzak kaldı (Eşik: ${maxAllowedAbsence}s).`
    )
  }

  return {
    passed: errors.length === 0,
    totalDirectExposurePercent: exposurePercent,
    longestAbsenceSeconds: Number(maxAbsence.toFixed(1)),
    targetExposureMin: targetMin,
    targetExposureMax: targetMax,
    warnings,
    errors,
  }
}
