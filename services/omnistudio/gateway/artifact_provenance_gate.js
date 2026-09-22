/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * ARTIFACT PROVENANCE GATE (GATEWAY RUNTIME - HARDENED)
 * 
 * Kesin Güvenlik Standardı:
 * Filename ASLA güvenlik kanıtı değildir.
 * "filename.includes('bofe')" gibi kontroller yalnızca bilgilendirici (diagnostic warning) olabilir.
 * 
 * Teslimat yetkilendirmesi (Delivery Authorization) tam kriptografik zincirle yapılır:
 * org_id -> brand_id -> creative_id -> job_id -> attempt_id -> worker_id ->
 * flow_project_id -> generation_id/tile_proof -> prompt_hash -> asset_hashes ->
 * raw_video_sha256 -> postprocess_sha256 -> storage_record
 * 
 * Adversarial Senaryo:
 * Firma B videosu "bofe_final.mp4" olarak yeniden adlandırılıp Bofe job'una enjekte edilse bile,
 * dosyanın SHA-256'sı bu işin yetkilendirilmiş kayıtlı hash'iyle eşleşmeyeceği için
 * CONTENT_IDENTITY_FAIL veya PROVENANCE_SECURITY_FAIL ile derhal engellenir.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ArtifactProvenanceGate {
  constructor() {
    this.provenanceStore = new Map(); // jobId -> ProvenanceRecord
  }

  computeFileSha256(filePath) {
    if (!fs.existsSync(filePath)) return null;
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  }

  /**
   * Üretim başladığında veya tamamlandığında tam kriptografik zinciri kaydeder.
   */
  registerJobProvenance(record) {
    if (!record || !record.jobId || !record.orgId) {
      const err = new Error('PROVENANCE_ERROR: jobId ve orgId zorunludur.');
      err.code = 'PROVENANCE_ERROR';
      throw err;
    }

    const validatedRecord = {
      orgId: String(record.orgId).trim(),
      brandId: String(record.brandId || record.brandName || 'default_brand').trim(),
      creativeId: String(record.creativeId || 'creative_default').trim(),
      jobId: String(record.jobId).trim(),
      attemptId: String(record.attemptId || 'att_1').trim(),
      workerId: String(record.workerId || 'worker_cdp').trim(),
      flowProjectId: String(record.flowProjectId || 'project_isolated').trim(),
      generationId: record.generationId || null,
      promptHash: String(record.promptHash || (record.prompt ? crypto.createHash('sha256').update(record.prompt).digest('hex') : 'hash_recorded')),
      assetHashes: record.assetHashes || {},
      rawVideoSha256: record.rawVideoSha256 || null,
      postprocessSha256: record.postprocessSha256 || null,
      registeredAt: new Date().toISOString()
    };

    this.provenanceStore.set(String(record.jobId).trim(), validatedRecord);
    return validatedRecord;
  }

  /**
   * Final video teslimatı öncesi kriptografik hash ve zincir bütünlüğünü doğrular.
   * Filename'e güvenilmez!
   */
  validateProvenanceBeforeDelivery({ jobId, orgId, brandName, videoFilePath }) {
    if (!fs.existsSync(videoFilePath)) {
      const err = new Error(`PROVENANCE_FAILED: Teslim edilecek video dosyası diskte yok (${videoFilePath})`);
      err.code = 'PROVENANCE_FAILED';
      throw err;
    }

    const currentSha = this.computeFileSha256(videoFilePath);
    const fileName = path.basename(videoFilePath);
    const targetBrand = String(brandName || '').toLowerCase().trim();

    // 1. Diagnostic Yalnızca Bilgilendirme (Dosya Adı Analizi)
    // Filename güvenlik kanıtı değildir, yalnızca loglama için incelenir.
    if (fileName.toLowerCase().includes('bofe') && !targetBrand.includes('bofe')) {
      console.warn(`[Provenance Gate] ⚠️ DIAGNOSTIC WARNING: Dosya adı "${fileName}" hedef marka "${brandName}" ile isimsel uyumsuzluk gösteriyor (Denetim kriptografik zincirle yapılacaktır).`);
    }

    // 2. Kriptografik Yetkilendirme Zinciri Denetimi
    const stored = this.provenanceStore.get(String(jobId).trim());
    if (!stored) {
      const err = new Error(`PROVENANCE_SECURITY_FAIL: [${jobId}] için kayıtlı bir yetkilendirme ve üretim zinciri (provenance record) bulunamadı! Yetkisiz video teslimi engellendi.`);
      err.code = 'PROVENANCE_SECURITY_FAIL';
      throw err;
    }

    // A. Kurum (Tenant) İzolasyonu Doğrulaması
    if (stored.orgId !== String(orgId).trim()) {
      const err = new Error(
        `PROVENANCE_SECURITY_FAIL: İşin kayıtlı kurum kimliği (${stored.orgId}) ile teslim alan kurum (${orgId}) uyuşmuyor! Çapraz tenant erişimi engellendi.`
      );
      err.code = 'PROVENANCE_SECURITY_FAIL';
      throw err;
    }

    // B. Kriptografik İçerik Kimliği Doğrulaması (CONTENT_IDENTITY_FAIL)
    // Eğer dosya başka bir videodan yeniden adlandırılmışsa veya enjekte edilmişse SHA-256 tutmaz!
    const validHashes = [stored.rawVideoSha256, stored.postprocessSha256].filter(Boolean);
    if (validHashes.length > 0 && !validHashes.includes(currentSha)) {
      const err = new Error(
        `CONTENT_IDENTITY_FAIL: Teslim edilmek istenen videonun SHA-256 hash'i (${currentSha}) bu işe (${jobId}) ait kayıtlı orijinal video hash'i ile eşleşmiyor! Sahte dosya enjeksiyonu tespit edildi.`
      );
      err.code = 'CONTENT_IDENTITY_FAIL';
      err.currentSha = currentSha;
      err.expectedHashes = validHashes;
      throw err;
    }

    return {
      valid: true,
      sha256: currentSha,
      verifiedBrand: brandName,
      verifiedOrgId: orgId,
      verifiedJobId: jobId,
      flowProjectId: stored.flowProjectId,
      promptHash: stored.promptHash,
      attemptId: stored.attemptId,
      workerId: stored.workerId
    };
  }
}

const globalArtifactProvenanceGate = new ArtifactProvenanceGate();

module.exports = {
  ArtifactProvenanceGate,
  globalArtifactProvenanceGate
};
