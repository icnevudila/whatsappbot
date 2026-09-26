/**
 * Generic Tenant-Aware Brand Manifest & Asset Ownership Engine
 * 
 * Mimari İlke:
 * Kod marka isimlerini (Bofe, Ayvazoğlu vb.) BİLMEZ. Kod yalnızca org_id bilir.
 * Tüm marka, prompt, asset ve output doğrulaması:
 * org_id + brand_manifest + tenant-scoped assets + immutable job snapshot
 * üzerinden tamamen dinamik ve generic çalışır. 3 firmada da, 3.000 firmada da aynıdır.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class TenantBrandRegistry {
  constructor() {
    this.manifests = new Map();     // org_id -> BrandManifest
    this.assetsById = new Map();    // asset_id -> AssetRecord
    this.assetsByHash = new Map();  // sha256 -> AssetRecord
    this.assetsByUrl = new Map();   // url/path -> AssetRecord
    this.activeBrandNames = new Map(); // normalized_name -> org_id (çapraz marka kontrolü için dinamik indeks)
  }

  /**
   * Yeni bir organizasyonun Brand Manifest kaydını ekler/günceller.
   */
  registerManifest(manifest) {
    if (!manifest || !manifest.org_id) {
      throw new Error('Manifest için org_id zorunludur.');
    }

    const orgId = String(manifest.org_id).trim();
    const brandName = (manifest.brand_name || 'İşletme').trim();
    const allowedNames = Array.isArray(manifest.allowed_brand_names) && manifest.allowed_brand_names.length > 0
      ? manifest.allowed_brand_names.map(n => String(n).trim())
      : [brandName];

    const record = {
      org_id: orgId,
      brand_name: brandName,
      sector: manifest.sector || 'general',
      allowed_brand_names: allowedNames,
      products: Array.isArray(manifest.products) ? manifest.products : [],
      asset_ids: Array.isArray(manifest.asset_ids) ? manifest.asset_ids : [],
      logo_asset_id: manifest.logo_asset_id || null,
      brand_palette: Array.isArray(manifest.brand_palette) ? manifest.brand_palette : (manifest.colors ? Object.values(manifest.colors) : []),
      tone: Array.isArray(manifest.tone) ? manifest.tone : [manifest.tone || 'professional'],
      required_terms: Array.isArray(manifest.required_terms) ? manifest.required_terms : [],
      forbidden_brand_ids: Array.isArray(manifest.forbidden_brand_ids) ? manifest.forbidden_brand_ids : [],
      creative_environment_profile: manifest.creative_environment_profile || manifest.sector_profile || null,
      version: manifest.version || 1,
      created_at: manifest.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.manifests.set(orgId, record);

    // Dinamik tenant marka indeksi: Tüm aktif marka adlarını org_id ile haritalar
    for (const name of allowedNames) {
      const norm = name.toLowerCase().trim();
      if (norm.length >= 3) {
        this.activeBrandNames.set(norm, orgId);
      }
    }

    return record;
  }

  /**
   * İstenen organizasyona ait Brand Manifest'i getirir.
   */
  getManifest(orgId) {
    if (!orgId) return null;
    return this.manifests.get(String(orgId).trim()) || null;
  }

  /**
   * Tenant-Scoped Varlık (Asset) Kaydı
   * Her varlık kesinlikle bir org_id'ye bağlıdır.
   */
  registerAsset({ id, org_id, type = 'image', filename, sha256, storage_url, mime_type = 'image/png' }) {
    if (!id || !org_id) {
      throw new Error('Asset için id ve org_id zorunludur.');
    }

    const orgId = String(org_id).trim();
    const assetId = String(id).trim();
    const assetRecord = {
      id: assetId,
      org_id: orgId,
      type,
      filename: filename || path.basename(storage_url || assetId),
      sha256: sha256 || null,
      storage_url: storage_url || null,
      mime_type,
      created_at: new Date().toISOString()
    };

    this.assetsById.set(assetId, assetRecord);

    if (sha256) {
      this.assetsByHash.set(sha256, assetRecord);
    }
    if (storage_url) {
      this.assetsByUrl.set(storage_url, assetRecord);
      this.assetsByUrl.set(path.basename(storage_url), assetRecord);
    }

    // Manifest'teki asset_ids listesine de ekle
    const manifest = this.manifests.get(orgId);
    if (manifest && !manifest.asset_ids.includes(assetId)) {
      manifest.asset_ids.push(assetId);
    }

    return assetRecord;
  }

  /**
   * Query seviyesinde tenant izolasyonu: SELECT * FROM assets WHERE id = ? AND org_id = ?
   */
  getAssetScoped(assetId, orgId) {
    const asset = this.assetsById.get(String(assetId).trim());
    if (!asset) return null;
    if (asset.org_id !== String(orgId).trim()) {
      return null; // Başka tenant'ın varlığı asla görünmez!
    }
    return asset;
  }

  /**
   * Varlık Sahipliği Doğrulaması (Generic Asset Ownership Gate)
   * URL, hash veya assetId verildiğinde varlığın işin org_id'sine ait olup olmadığını denetler.
   */
  validateAssetOwnership(assetRef, jobOrgId) {
    if (!assetRef || !jobOrgId) return;

    const currentOrg = String(jobOrgId).trim();

    // 1. Explicit asset.org_id uyuşmazlığı
    if (assetRef.org_id && String(assetRef.org_id).trim() !== currentOrg) {
      const err = new Error(`ASSET_ORG_MISMATCH: Varlığın ait olduğu kurum (${assetRef.org_id}) ile işin ait olduğu kurum (${currentOrg}) uyuşmuyor.`);
      err.code = 'ASSET_ORG_MISMATCH';
      err.statusCode = 400;
      err.offending_asset = assetRef;
      throw err;
    }

    // 2. Hash bazlı tenant kontrolü (Farklı markaların aynı isimli logo.png yüklemesini de çözer)
    const hash = assetRef.sha256 || null;
    if (hash && this.assetsByHash.has(hash)) {
      const registered = this.assetsByHash.get(hash);
      if (registered.org_id !== currentOrg) {
        const err = new Error(`ASSET_ORG_MISMATCH: Bu görselin SHA-256 hash'i (${hash.slice(0, 12)}...) başka bir kuruma (${registered.org_id}) aittir. Çapraz kullanım reddedildi.`);
        err.code = 'ASSET_ORG_MISMATCH';
        err.statusCode = 400;
        err.offending_hash = hash;
        err.foreign_org = registered.org_id;
        throw err;
      }
    }

    // 3. URL/Path bazlı kayıtlı tenant kontrolü
    const url = assetRef.url || (typeof assetRef === 'string' ? assetRef : null);
    if (url) {
      const registered = this.assetsByUrl.get(url) || this.assetsByUrl.get(path.basename(url));
      if (registered && registered.org_id !== currentOrg) {
        const err = new Error(`ASSET_ORG_MISMATCH: Belirtilen görsel yolu (${url}) başka bir kuruma (${registered.org_id}) aittir.`);
        err.code = 'ASSET_ORG_MISMATCH';
        err.statusCode = 400;
        err.offending_url = url;
        err.foreign_org = registered.org_id;
        throw err;
      }
    }
  }

  /**
   * Generic Prompt Sahipliği Doğrulaması (Zero Hardcoded Brands)
   * Prompt içinde sisteme kayıtlı BAŞKA bir firmanın marka adı geçiyorsa otomatik tespit eder.
   */
  validatePromptAgainstRegistry(prompt, jobOrgId) {
    if (!prompt || !jobOrgId) return;

    const currentOrg = String(jobOrgId).trim();
    const normPrompt = prompt.toLowerCase();

    for (const [registeredName, ownerOrgId] of this.activeBrandNames.entries()) {
      if (ownerOrgId === currentOrg) continue; // Kendi marka adı geçerli

      // Kendi kurum adının veya marka adının bir parçasıysa (örn: Bofe vs Bofe Tarım) kontaminasyon sayma
      const currentOrgName = (this.manifests.get(currentOrg)?.brand_name || '').toLowerCase();
      if (currentOrgName && (currentOrgName.includes(registeredName) || registeredName.includes(currentOrgName))) {
        continue;
      }

      // Sınır kontrollü regex ile yabancı kayıtlı marka adını ara
      const escaped = registeredName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[^a-zA-Z0-9ığüşöçİĞÜŞÖÇ])${escaped}([^a-zA-Z0-9ığüşöçİĞÜŞÖÇ]|$)`, 'i');

      if (regex.test(normPrompt)) {
        const err = new Error(`PROMPT_ORG_MISMATCH: Talebe ait prompt metninde başka bir kuruma (${ownerOrgId}) ait kayıtlı marka adı "${registeredName}" tespit edildi. Çapraz marka prompt kontaminasyonu engellendi.`);
        err.code = 'PROMPT_ORG_MISMATCH';
        err.statusCode = 400;
        err.offending_brand = registeredName;
        err.foreign_org = ownerOrgId;
        throw err;
      }
    }
  }

  /**
   * Değişmez İş Enstantanesi (Immutable Job Snapshot) Üretir
   * Firma sonradan logo veya ayar değiştirse dahi çalışan iş ortada kimlik değiştirmez.
   */
  createJobSnapshot({ jobId, orgId, brandName, prompt, logoUrl, logoSha256, productImageUrl, productSha256, referenceImageUrls = [] }) {
    const currentOrg = String(orgId || 'org_default').trim();
    let manifest = this.getManifest(currentOrg);

    if (!manifest) {
      // Otomatik Onboarding / Dinamik Manifest
      manifest = this.registerManifest({
        org_id: currentOrg,
        brand_name: brandName || 'İşletme',
        allowed_brand_names: brandName ? [brandName] : ['İşletme'],
      });
    }

    const promptHash = crypto.createHash('sha256').update(prompt || '').digest('hex');

    return {
      job_id: jobId,
      org_id: currentOrg,
      snapshot_version: 1,
      brand_manifest: { ...manifest },
      logo_asset: logoUrl ? {
        url: logoUrl,
        sha256: logoSha256 || null,
        org_id: currentOrg
      } : null,
      product_assets: productImageUrl ? [{
        url: productImageUrl,
        sha256: productSha256 || null,
        org_id: currentOrg
      }] : [],
      reference_assets: referenceImageUrls.map(u => ({
        url: u,
        org_id: currentOrg
      })),
      prompt_sha256: promptHash,
      created_at: new Date().toISOString()
    };
  }
}

// Global Singleton Registry
const brandRegistry = new TenantBrandRegistry();

/**
 * Başlangıç verilerini (mevcut aktif kurumları ve varlıkları) registry'e yükler.
 * Supabase veya yerel dosyalardan senkronize eder.
 */
function initializeTenantRegistry(outputDir = '/app/gateway/outputs') {
  try {
    // 1. Örnek Kurumlar (Veritabanından dinamik gelir, burada sıfır hata için başlangıç kaydı yapılır)
    brandRegistry.registerManifest({
      org_id: 'afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc',
      brand_name: 'Bofe',
      allowed_brand_names: ['Bofe', 'Bofe Kimya', 'Bofe Professional'],
      sector: 'agriculture_equipment',
      products: ['Akülü sırt ilaçlama pompası', 'Köpük sabun', 'Oto şampuanı', 'Lavabo açıcı'],
      brand_palette: ['#000000', '#acfe00', '#026009'],
      tone: ['modern', 'professional', 'technical']
    });

    brandRegistry.registerManifest({
      org_id: '4a58b0dd-0931-4901-880a-686457d15010',
      brand_name: 'Ayvazoğlu İnşaat',
      allowed_brand_names: ['Ayvazoğlu', 'Ayvazoğlu İnşaat', 'Ayvazoglu'],
      sector: 'construction',
      products: ['18 Delikli Pişmiş Kil Blok Tuğla', 'Bims', 'İnşaat Malzemeleri'],
      brand_palette: ['#ff5733', '#ffc300', '#333333'],
      tone: ['reliable', 'solid', 'industrial']
    });

    brandRegistry.registerManifest({
      org_id: 'c9b24e55-6d07-48ef-b4e4-e0cb1678ded5',
      brand_name: 'Veri Burada',
      allowed_brand_names: ['Veri Burada', 'Veriburada'],
      sector: 'b2b_software',
      products: ['Google Maps İşletme Verisi', 'B2B Müşteri Listesi'],
      brand_palette: ['#1b5e20', '#2e7d32', '#4caf50'],
      tone: ['data_driven', 'innovative']
    });

    // 2. Varlıkları hash'leri ve dosya yollarıyla registry'ye bağla
    const knownDiskAssets = [
      { id: 'bofe_logo_primary', org_id: 'afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc', type: 'logo', filename: 'bofe_logo.png' },
      { id: 'bofe_logo_white', org_id: 'afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc', type: 'logo', filename: 'bofe_logo_clean_white.png' },
      { id: 'bofe_prod_1', org_id: 'afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc', type: 'product', filename: 'bofe_product.png' },
      { id: 'ayvaz_logo_primary', org_id: '4a58b0dd-0931-4901-880a-686457d15010', type: 'logo', filename: 'ayvazoglu_logo.png' },
      { id: 'ayvaz_prod_brick', org_id: '4a58b0dd-0931-4901-880a-686457d15010', type: 'product', filename: 'ayvazoglu_brick.webp' },
      { id: 'veriburada_logo_primary', org_id: 'c9b24e55-6d07-48ef-b4e4-e0cb1678ded5', type: 'logo', filename: 'veriburada_logo.png' }
    ];

    for (const item of knownDiskAssets) {
      const candidates = [
        path.join(outputDir, item.filename),
        path.join(__dirname, item.filename),
        path.join(__dirname, 'outputs', item.filename)
      ];
      const found = candidates.find(c => fs.existsSync(c));
      if (found) {
        const fileBuf = fs.readFileSync(found);
        const sha256 = crypto.createHash('sha256').update(fileBuf).digest('hex');
        brandRegistry.registerAsset({
          id: item.id,
          org_id: item.org_id,
          type: item.type,
          filename: item.filename,
          sha256,
          storage_url: `/outputs/${item.filename}`
        });
      }
    }
    console.log(`[BrandManifest] 🏢 Tenant Registry Başlatıldı (${brandRegistry.manifests.size} kurum, ${brandRegistry.assetsByHash.size} varlık)`);
  } catch (err) {
    console.warn('[BrandManifest] İlklendirme uyarısı:', err.message);
  }
}

module.exports = {
  TenantBrandRegistry,
  brandRegistry,
  initializeTenantRegistry,
};
