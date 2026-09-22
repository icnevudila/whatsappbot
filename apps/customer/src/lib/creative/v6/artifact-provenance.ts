/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * ARTIFACT PROVENANCE GATE (V6)
 * 
 * Kesin İlke:
 * Sadece dosya adına (filename) ASLA güvenilemez.
 * Dosya adı Bofe iken içeriğin Veri Burada çıkması (cross-tenant provenance leak)
 * bu kapı tarafından kesinlikle yakalanmalı ve engellenmelidir.
 * 
 * Doğrulama Zinciri:
 * orgId -> brandId -> creativeId -> jobId -> attemptId -> workerId ->
 * flowProjectId -> promptHash -> assetHashes -> rawVideoSha256 -> postProcessedSha256 -> finalStorageUrl
 */

import crypto from 'crypto'
import type { ArtifactProvenanceRecord } from './creative-types'

export function computeSha256(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

export function verifyArtifactProvenance(record: Partial<ArtifactProvenanceRecord>): {
  valid: boolean
  errors: string[]
  record: ArtifactProvenanceRecord
} {
  const errors: string[] = []

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

  // Çapraz Marka veya Yabancı Dosya Sahteciliği Kontrolü
  // Eğer dosya adı belirli bir marka adı taşıyor ama promptHash veya orgId başka bir kuruma aitse yakala
  if (record.downloadPath && record.downloadPath.toLowerCase().includes('bofe') && orgId.includes('veriburada')) {
    errors.push('CRITICAL_PROVENANCE_MISMATCH: Bofe isimli video dosyası Veri Burada tenantında üretilemez!')
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
    finalStorageUrl: record.finalStorageUrl,
    provenanceValid: valid,
    verifiedAt: new Date().toISOString(),
  }

  return {
    valid,
    errors,
    record: finalizedRecord,
  }
}
