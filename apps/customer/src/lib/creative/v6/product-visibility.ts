/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * PRODUCT VISIBILITY BUDGET ENGINE (V6)
 * 
 * Amaç:
 * Ürünün ekrandaki varlığını ve eylemini ölçer.
 * Kısa videolarda %55-65 doğrudan ürün/eylem varlığı ararken,
 * uzun videolarda ürünün uzun süre ortadan kaybolmasını (PRODUCT_ABSENCE_TOO_LONG) engeller.
 */

import type { SceneContractV2 } from './creative-types'

export interface ProductVisibilityAudit {
  passed: boolean
  totalDirectExposurePercent: number
  longestAbsenceSeconds: number
  warnings: string[]
  errors: string[]
}

export function auditProductVisibility(
  scenes: SceneContractV2[],
  grammarType: 'short_performance' | 'mid_form' | 'brand_film',
  maxAllowedAbsenceSec = 6.0
): ProductVisibilityAudit {
  const warnings: string[] = []
  const errors: string[] = []

  let totalDuration = 0
  let weightedProductExposure = 0
  let currentAbsence = 0
  let maxAbsence = 0

  for (const sc of scenes) {
    totalDuration += sc.durationSec
    weightedProductExposure += sc.durationSec * sc.productVisibility

    if (sc.productVisibility < 0.25) {
      currentAbsence += sc.durationSec
      if (currentAbsence > maxAbsence) maxAbsence = currentAbsence
    } else {
      currentAbsence = 0
    }
  }

  const effectiveExposureRatio = totalDuration > 0 ? (weightedProductExposure / totalDuration) : 0
  const exposurePercent = Math.round(effectiveExposureRatio * 100)

  // Kontroller
  if (grammarType === 'short_performance' && exposurePercent < 50) {
    warnings.push(`LOW_PRODUCT_VISIBILITY: Kısa performans reklamında ürün görünürlüğü (%${exposurePercent}) hedeflenen minimum %50 seviyesinin altında.`)
  }

  const absenceThreshold = grammarType === 'brand_film' ? Math.max(8.0, maxAllowedAbsenceSec) : maxAllowedAbsenceSec
  if (maxAbsence > absenceThreshold) {
    warnings.push(`PRODUCT_ABSENCE_TOO_LONG: Ürün ${maxAbsence.toFixed(1)} saniye boyunca kadrajdan ve odak noktasından uzak kaldı (Eşik: ${absenceThreshold}s).`)
  }

  return {
    passed: errors.length === 0,
    totalDirectExposurePercent: exposurePercent,
    longestAbsenceSeconds: Number(maxAbsence.toFixed(1)),
    warnings,
    errors,
  }
}
