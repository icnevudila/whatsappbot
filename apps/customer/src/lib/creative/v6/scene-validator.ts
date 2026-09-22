/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * SCENE VALIDATOR & NECESSITY ENGINE (V6)
 * 
 * Kesin İlke:
 * 1. Scene Necessity Test: "Bu sahneyi silersem anlatı bilgi, duygu, kanıt veya nedensellik kaybediyor mu?"
 *    Cevap hayır ise: DECORATIVE_SHOT olarak işaretle ve eler/birleştir.
 * 2. Motion Energy Curve: Son bölümün anlamsız biçimde 10-15s statik tabela görüntüsüyle çökmesini engeller.
 * 3. Payoff Validator: Açılış kancası ile kapanış çözümü arasındaki nedensel bağı doğrular.
 */

import type { SceneContractV2 } from './creative-types'

export interface SceneValidationResult {
  valid: boolean
  validatedScenes: SceneContractV2[]
  decorativeScenesPruned: string[]
  warnings: string[]
  errors: string[]
  motionCurveValid: boolean
  payoffValid: boolean
}

export function validateSceneContracts(
  scenes: SceneContractV2[],
  targetDurationSeconds: number
): SceneValidationResult {
  const warnings: string[] = []
  const errors: string[] = []
  const decorativeScenesPruned: string[] = []
  const validatedScenes: SceneContractV2[] = []

  if (!scenes || scenes.length === 0) {
    return {
      valid: false,
      validatedScenes: [],
      decorativeScenesPruned: [],
      warnings: [],
      errors: ['SCENE_VALIDATION_ERROR: Hiçbir sahne kontratı bulunamadı.'],
      motionCurveValid: false,
      payoffValid: false,
    }
  }

  // 1. Scene Necessity Test (DECORATIVE_SHOT Tespiti ve Budama)
  for (const sc of scenes) {
    const isPureDecorative =
      sc.viewerKnowledgeBefore.trim().toLowerCase() === sc.viewerKnowledgeAfter.trim().toLowerCase() ||
      (sc.storyFunction.toLowerCase().includes('sadece tabela') && sc.productVisibility < 0.1)

    if (isPureDecorative && scenes.length > 2) {
      decorativeScenesPruned.push(sc.sceneId)
      warnings.push(`DECORATIVE_SHOT tespit edildi ve budandı: Sahne ${sc.sceneId} (${sc.storyFunction}) anlatıya yeni bilgi katmıyor.`)
      continue
    }

    validatedScenes.push(sc)
  }

  // Eğer budama sonrası sahne kalmadıysa en azından orijinali koru
  if (validatedScenes.length === 0) {
    validatedScenes.push(...scenes)
  }

  // 2. Timeline ve Süre Sürekliliği Denetimi
  let totalDur = 0
  for (let i = 0; i < validatedScenes.length; i++) {
    const curr = validatedScenes[i]
    totalDur += curr.durationSec

    if (i > 0) {
      const prev = validatedScenes[i - 1]
      if (Math.abs(curr.startSec - prev.endSec) > 0.05) {
        errors.push(`TIMELINE_GAP_OR_OVERLAP: Sahne ${prev.sceneId} bitişi (${prev.endSec}s) ile ${curr.sceneId} başlangıcı (${curr.startSec}s) uyuşmuyor.`)
      }
    }
  }

  if (Math.abs(totalDur - targetDurationSeconds) > 0.5) {
    warnings.push(`DURATION_MISMATCH: Sahne toplam süresi (${totalDur}s) hedeflenen süreyle (${targetDurationSeconds}s) tam eşleşmiyor.`)
  }

  // 3. Motion Energy Curve Denetimi (Son bölümün 10 saniye donup kalmasını engeller)
  let motionCurveValid = true
  const lastScene = validatedScenes[validatedScenes.length - 1]
  if (lastScene && lastScene.durationSec > 4.5 && lastScene.motionEnergy < 0.15) {
    warnings.push('MOTION_ENERGY_COLLAPSE: Final sahnesi 4.5 saniyeden uzun süre aşırı düşük enerjiyle donuk kalıyor.')
    motionCurveValid = false
  }

  // 4. Payoff Validator (Açılış kancasının sonuca bağlanma kontrolü)
  const firstScene = validatedScenes[0]
  const payoffValid = Boolean(
    firstScene &&
    lastScene &&
    (lastScene.brandVisibility > 0.5 || lastScene.productVisibility > 0.5)
  )

  if (!payoffValid) {
    warnings.push('PAYOFF_WEAK: Final sahnesi açılışta başlatılan eylemi veya marka vaadini doyurucu biçimde çözmüyor.')
  }

  return {
    valid: errors.length === 0,
    validatedScenes,
    decorativeScenesPruned,
    warnings,
    errors,
    motionCurveValid,
    payoffValid,
  }
}
