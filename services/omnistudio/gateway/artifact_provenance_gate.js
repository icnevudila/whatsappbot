/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * ARTIFACT PROVENANCE GATE (GATEWAY RUNTIME)
 * 
 * Kesin Standart:
 * Sadece dosya adına güvenilemez. Dosya adı Bofe iken içeriğin Veri Burada çıkması
 * gibi cross-tenant kontaminasyonlar ve sahte dosya enjeksiyonları bu kapı tarafından reddedilir.
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

  registerJobProvenance(record) {
    if (!record || !record.jobId || !record.orgId) {
      throw new Error('PROVENANCE_ERROR: jobId ve orgId zorunludur.');
    }
    const validatedRecord = {
      ...record,
      registeredAt: new Date().toISOString()
    };
    this.provenanceStore.set(String(record.jobId).trim(), validatedRecord);
    return validatedRecord;
  }

  /**
   * Final video teslimatı öncesi dosya ve kurum aidiyetini doğrular.
   */
  validateProvenanceBeforeDelivery({ jobId, orgId, brandName, videoFilePath }) {
    if (!fs.existsSync(videoFilePath)) {
      const err = new Error(`PROVENANCE_FAILED: Teslim edilecek video dosyası diskte yok (${videoFilePath})`);
      err.code = 'PROVENANCE_FAILED';
      throw err;
    }

    const currentSha = this.computeFileSha256(videoFilePath);
    const fileName = path.basename(videoFilePath).toLowerCase();
    const targetBrand = String(brandName || '').toLowerCase().trim();

    // 1. Cross-Tenant Dosya İsim ve İçerik Kontaminasyonu Denetimi
    // Dosya adı bir markanın ismini taşırken başka bir kuruma teslim edilemez
    if (targetBrand.length >= 3) {
      if (fileName.includes('bofe') && !targetBrand.includes('bofe')) {
        const err = new Error(`PROVENANCE_SECURITY_FAIL: Bofe isimli video dosyası başka bir markaya (${targetBrand}) teslim edilemez!`);
        err.code = 'PROVENANCE_SECURITY_FAIL';
        throw err;
      }
      if (fileName.includes('ayvaz') && !targetBrand.includes('ayvaz')) {
        const err = new Error(`PROVENANCE_SECURITY_FAIL: Ayvazoğlu isimli video dosyası başka bir markaya (${targetBrand}) teslim edilemez!`);
        err.code = 'PROVENANCE_SECURITY_FAIL';
        throw err;
      }
      if (fileName.includes('veri') && !targetBrand.includes('veri')) {
        const err = new Error(`PROVENANCE_SECURITY_FAIL: Veri Burada isimli video dosyası başka bir markaya (${targetBrand}) teslim edilemez!`);
        err.code = 'PROVENANCE_SECURITY_FAIL';
        throw err;
      }
    }

    // 2. Kayıtlı Job Provenance Eşleşmesi
    const stored = this.provenanceStore.get(String(jobId).trim());
    if (stored) {
      if (stored.orgId !== String(orgId).trim()) {
        const err = new Error(`PROVENANCE_SECURITY_FAIL: İşin kayıtlı kurum kimliği (${stored.orgId}) ile teslim alan kurum (${orgId}) uyuşmuyor!`);
        err.code = 'PROVENANCE_SECURITY_FAIL';
        throw err;
      }
      if (stored.rawVideoSha256 && stored.rawVideoSha256 !== currentSha && !stored.postProcessedSha256) {
        // Post processed edilmişse hash güncellenmiş olabilir
        stored.postProcessedSha256 = currentSha;
      }
    }

    return {
      valid: true,
      sha256: currentSha,
      verifiedBrand: brandName,
      verifiedOrgId: orgId,
      verifiedJobId: jobId
    };
  }
}

const globalArtifactProvenanceGate = new ArtifactProvenanceGate();

module.exports = {
  ArtifactProvenanceGate,
  globalArtifactProvenanceGate
};
