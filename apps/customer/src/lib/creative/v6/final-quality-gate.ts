/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * FINAL PRODUCTION QUALITY GATE (V6)
 * 
 * Amaç:
 * Tüm alt kapıları (Scene Validator, Product Budget, Brand Budget, Audio Gate,
 * Director QA, Artifact Provenance) tek bir üretim sürüm kararına bağlar.
 */

import type {
  DirectorQAReport,
  ArtifactProvenanceRecord
} from './creative-types'
import type { SceneValidationResult } from './scene-validator'
import type { ProductVisibilityAudit } from './product-visibility'
import type { BrandVisibilityAudit } from './brand-visibility'

export interface QualityGateEvaluation {
  status: 'RELEASE_APPROVED' | 'RELEASE_REJECTED' | 'RELEASE_SOFT_FLAGGED'
  score: number // 0-100
  hardFails: string[]
  warnings: string[]
  canProceedToGeneration: boolean
  canProceedToFinalReady: boolean
}

export function evaluateProductionQualityGate(params: {
  sceneValidation: SceneValidationResult
  productAudit: ProductVisibilityAudit
  brandAudit: BrandVisibilityAudit
  directorQA?: DirectorQAReport | null
  provenance?: ArtifactProvenanceRecord | null
  audioGateResult?: { passed: boolean; deltaSec: number; error?: string } | null
}): QualityGateEvaluation {
  const { sceneValidation, productAudit, brandAudit, directorQA, provenance, audioGateResult } = params
  const hardFails: string[] = []
  const warnings: string[] = []

  // 1. Sahne Geçerliliği
  if (!sceneValidation.valid) {
    hardFails.push(...sceneValidation.errors)
  }
  warnings.push(...sceneValidation.warnings)

  // 2. Ürün ve Marka Bütçeleri
  warnings.push(...productAudit.warnings)
  warnings.push(...brandAudit.warnings)
  if (productAudit.errors.length > 0) {
    hardFails.push(...productAudit.errors)
  }

  // 3. Audio Duration Gate (Eğer final aşamasındaysa)
  if (audioGateResult && !audioGateResult.passed) {
    hardFails.push(audioGateResult.error || 'FINALIZATION_FAILED_AUDIO_DURATION_MISMATCH')
  }

  // 4. Director QA (Eğer video render edildiyse)
  if (directorQA) {
    if (directorQA.verdict === 'HARD_FAIL') {
      hardFails.push(...directorQA.issues)
    } else if (directorQA.verdict === 'SOFT_FAIL') {
      warnings.push(...directorQA.issues)
    }
  }

  // 5. Artifact Provenance (Eğer dosya indirildiyse)
  if (provenance && !provenance.provenanceValid) {
    hardFails.push('CRITICAL_PROVENANCE_FAIL: Dosya aidiyeti ve audit zinciri doğrulanamadı!')
  }

  // Skor Hesabı
  let score = 100
  score -= hardFails.length * 35
  score -= warnings.length * 8
  score = Math.max(0, Math.min(100, score))

  let status: QualityGateEvaluation['status'] = 'RELEASE_APPROVED'
  if (hardFails.length > 0) {
    status = 'RELEASE_REJECTED'
  } else if (warnings.length > 0 || score < 85) {
    status = 'RELEASE_SOFT_FLAGGED'
  }

  return {
    status,
    score,
    hardFails,
    warnings,
    canProceedToGeneration: hardFails.length === 0,
    canProceedToFinalReady: hardFails.length === 0 && (audioGateResult ? audioGateResult.passed : true),
  }
}
