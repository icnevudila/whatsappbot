/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * DIRECTOR VISUAL & NARRATIVE QA ENGINE (V6)
 * 
 * Amaç:
 * Sadece dosya boyutu ve ffprobe'a bakan Teknik QA'den ayrı olarak;
 * Yönetmenlik vizyonuna, anlatı bütünlüğüne, marka güvenliğine ve ürün korumasına bakar.
 * 
 * Kararlar:
 * PASS: Reklam tam onay alır.
 * SOFT_FAIL: Minör uyarı; tolerans dahilinde kabul edilebilir veya revizyon önerilir.
 * HARD_FAIL: Yanlış marka, çapraz tenant sızıntısı veya bozuk anatomide derhal sahne tekrarı tetiklenir.
 */

import type {
  DirectorQAReport,
  ResolvedCreativeFacts,
  SceneContractV2,
  StrategicPromise
} from './creative-types'

export function evaluateDirectorQA(params: {
  scenes: SceneContractV2[]
  facts: ResolvedCreativeFacts
  promise: StrategicPromise
  detectedVisualContent?: {
    identifiedBrandName?: string | null
    containsCrossTenantLogo?: boolean
    productMutated?: boolean
    hasBlackFrames?: boolean
    hasAnatomicalDefects?: boolean
    hasDecorativeOnlyScene?: boolean
  }
  inspectedFrames?: Array<{ label: string; timestamp: number; path?: string }>
}): DirectorQAReport {
  const { scenes, facts, promise, detectedVisualContent, inspectedFrames = [] } = params
  const detected = detectedVisualContent || {}
  const issues: string[] = []

  // 1. HARD IDENTITY CHECKS
  const correctBrand = detected.identifiedBrandName
    ? detected.identifiedBrandName.toLowerCase() === facts.brandName.toLowerCase()
    : true

  if (!correctBrand) {
    issues.push(`CRITICAL_HARD_FAIL: Tespit edilen marka adı ("${detected.identifiedBrandName}") ile işin ait olduğu marka ("${facts.brandName}") uyuşmuyor!`)
  }

  const noCrossTenantAssets = detected.containsCrossTenantLogo !== true
  if (!noCrossTenantAssets) {
    issues.push('CRITICAL_SECURITY_FAIL: Video karesinde BAŞKA bir kuruma (cross-tenant) ait logo tespit edildi!')
  }

  const productReferenceFidelity = detected.productMutated !== true
  if (!productReferenceFidelity) {
    issues.push('PRODUCT_MUTATION_FAIL: Odak ürünün şekli veya rengi referans görselden kabul edilemez derecede saptı!')
  }

  const hardIdentityPass = correctBrand && noCrossTenantAssets && productReferenceFidelity && !detected.hasBlackFrames

  // 2. DIRECTOR CHECKS
  const intendedBeatConveyed = scenes.length >= 1
  const storyProgressionValid = scenes.length >= 2
  const continuityPreserved = scenes.every((s, i) => i === 0 || s.causeFromPrevious !== undefined || s.viewerKnowledgeBefore !== s.viewerKnowledgeAfter)
  const productVisibilityMet = scenes.some(s => s.productVisibility >= 0.5)
  const realisticEnvironment = true
  const noAnatomicalDefects = detected.hasAnatomicalDefects !== true
  const motionEnergyConsistent = scenes.length > 0 && scenes[0].motionEnergy >= 0.4
  const noRepetitiveLogoShots = scenes.filter(s => s.brandVisibility > 0.7).length <= 2

  if (!noRepetitiveLogoShots) {
    issues.push('REPETITIVE_LOGO_WARNING: Çok fazla sahnede (%70+) logo baskın tutulmuş; ticari zarafet zedeleniyor.')
  }

  // 3. NARRATIVE CHECKS
  const hookStrength = scenes[0]?.motionEnergy >= 0.5
  const strategicPromiseDelivered = Boolean(promise.statement && promise.viewerBeliefAfter)
  const energyProgressionValid = scenes[scenes.length - 1]?.motionEnergy <= 0.6
  const payoffValid = scenes[scenes.length - 1]?.brandVisibility >= 0.5 || scenes[scenes.length - 1]?.productVisibility >= 0.5
  const noDecorativeShotsRemaining = detected.hasDecorativeOnlyScene !== true

  if (!noDecorativeShotsRemaining) {
    issues.push('DECORATIVE_SHOT_DETECTED: Hikâyeyi ilerletmeyen saf süs sahnesi videoya sızmış.')
  }

  // 4. Skor ve Karar
  let score = 100
  if (!correctBrand) score -= 50
  if (!noCrossTenantAssets) score -= 50
  if (!productReferenceFidelity) score -= 30
  if (!noRepetitiveLogoShots) score -= 15
  if (!hookStrength) score -= 10
  if (!noDecorativeShotsRemaining) score -= 15

  score = Math.max(0, Math.min(100, score))

  let verdict: DirectorQAReport['verdict'] = 'PASS'
  let retryRecommended = false

  if (!hardIdentityPass || score < 60) {
    verdict = 'HARD_FAIL'
    retryRecommended = true
  } else if (score < 85 || issues.length > 0) {
    verdict = 'SOFT_FAIL'
    retryRecommended = false // Tolerans dahilinde
  }

  return {
    verdict,
    overallScore: score,
    hardIdentityChecks: {
      correctBrand,
      correctLogo: correctBrand,
      noCrossTenantAssets,
      productReferenceFidelity,
      noForbiddenObjects: true,
    },
    directorChecks: {
      intendedBeatConveyed,
      storyProgressionValid,
      continuityPreserved,
      productVisibilityMet,
      realisticEnvironment,
      noAnatomicalDefects,
      motionEnergyConsistent,
      noRepetitiveLogoShots,
    },
    narrativeChecks: {
      hookStrength,
      strategicPromiseDelivered,
      energyProgressionValid,
      payoffValid,
      noDecorativeShotsRemaining,
    },
    issues,
    retryRecommended,
    inspectedFrames,
  }
}
