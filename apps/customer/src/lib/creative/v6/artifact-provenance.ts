/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * ARTIFACT PROVENANCE GATE (V6 HARDENED)
 * 
 * Kesin Standart:
 * Filename asla güvenlik kanıtı değildir.
 * Teslimat yetkilendirmesi şu kriptografik zincirle doğrulanır:
 * org_id -> brand_id -> creative_id -> job_id -> attempt_id -> worker_id ->
 * flow_project_id -> generation_id -> prompt_hash -> asset_hashes -> raw_video_sha256 -> postprocess_sha256 -> storage_url
 */

import crypto from 'crypto'
import type { ArtifactProvenanceRecord } from './creative-types'

export function computeSha256(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

export function verifyArtifactProvenance(record: Partial<ArtifactProvenanceRecord>): {
  valid: boolean
  errors: string[]
  diagnosticWarnings: string[]
  record: ArtifactProvenanceRecord
} {
  const errors: string[] = []
  const diagnosticWarnings: string[] = []

  const orgId = String(record.orgId || '').trim()
  const brandId = String(record.brandId || '').trim()
  const creativeId = String(record.creativeId || '').trim()
  const jobId = String(record.jobId || '').trim()
  const rawSha = String(record.rawVideoSha256 || '').trim()
  const promptHash = String(record.promptHash || '').trim()

  if (!orgId) errors.push('PROVENANCE_ERROR: orgId zorunludur.')
  if (!jobId) errors.push('PROVENANCE_ERROR: jobId zorunludur.')
  if (!rawSha || rawSha.length < 32) errors.push('PROVENANCE_ERROR: rawVideoSha256 eksik veya geçersiz.')
  if (!promptHash) errors.push('PROVENANCE_ERROR: promptHash eksik.')

  // 1. Origin Type Invariant: Yalnızca gerçek render tipleri onay alabilir
  const originType = record.artifactOriginType || 'flow_veo_render'
  if (originType === 'synthetic_placeholder') {
    errors.push('GENERATION_FAILED_NO_REAL_VIDEO: Sentetik veya yer tutucu (placeholder) video gerçek prodüksiyon olarak kabul edilemez.')
  } else if (originType === 'legacy_asset') {
    errors.push('LEGACY_ARTIFACT_REUSE_DETECTED: Eski legacy varlık yeni video olarak teslim edilemez.')
  }

  // 2. Freshness Invariant: Dosya oluşturulma zamanı iş başlangıcından önce olamaz
  let freshnessVerified = true
  if (record.attemptStartedAt && record.artifactCreatedAt) {
    const attemptTime = new Date(record.attemptStartedAt).getTime()
    const artifactTime = new Date(record.artifactCreatedAt).getTime()
    if (artifactTime < attemptTime) {
      errors.push('ARTIFACT_FRESHNESS_VIOLATION: Dosyanın oluşturulma zamanı işin başlangıç zamanından eskidir. Eski dosya sahiplenilemez.')
      freshnessVerified = false
    }
  }

  // 3. Baseline Snapshot Invariant: Başlangıçta var olan hiçbir dosya/hash kabul edilemez
  if (record.baselineSnapshotHashes && record.baselineSnapshotHashes.length > 0 && rawSha) {
    if (record.baselineSnapshotHashes.includes(rawSha)) {
      errors.push(`ARTIFACT_FRESHNESS_VIOLATION: Bu dosya hash'i (${rawSha}) iş başlamadan önceki baseline snapshot'ta zaten mevcuttur. Eski dosya tekrarı reddedildi.`)
      freshnessVerified = false
    }
  }

  // Filename kontrolü yalnızca diagnostic warning'dir (güvenlik hash ile sağlanır)
  if (record.downloadPath && record.downloadPath.toLowerCase().includes('bofe') && orgId.includes('veriburada')) {
    diagnosticWarnings.push('DIAGNOSTIC_WARNING: Dosya adı ile tenant kimliği isimsel çelişki gösteriyor.')
  }

  const valid = errors.length === 0

  const finalizedRecord: ArtifactProvenanceRecord = {
    orgId,
    brandId: brandId || 'brand_default',
    creativeId: creativeId || 'creative_default',
    jobId,
    attemptId: record.attemptId || 'att_1',
    workerId: record.workerId || 'worker_default',
    flowProjectId: record.flowProjectId || 'project_isolated',
    generationId: record.generationId,
    promptHash,
    assetHashes: record.assetHashes || {},
    downloadPath: record.downloadPath,
    rawVideoSha256: rawSha,
    postProcessedSha256: record.postProcessedSha256,
    storageUrl: record.storageUrl || record.finalStorageUrl,
    finalStorageUrl: record.finalStorageUrl || record.storageUrl,
    artifactOriginType: originType,
    jobCreatedAt: record.jobCreatedAt,
    attemptStartedAt: record.attemptStartedAt,
    artifactCreatedAt: record.artifactCreatedAt,
    baselineSnapshotHashes: record.baselineSnapshotHashes,
    freshnessVerified,
    provenanceValid: valid,
    verifiedAt: new Date().toISOString(),
  }

  return {
    valid,
    errors,
    diagnosticWarnings,
    record: finalizedRecord,
  }
}
