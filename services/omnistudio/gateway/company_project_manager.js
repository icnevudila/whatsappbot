'use strict';

const fs = require('fs');
const path = require('path');

const PROJECTS_FILE = process.env.PROJECTS_FILE || path.join('/data', 'company_projects.json');

const DEFAULT_MESAJIFY_PROJECT = {
  projectId: 'g-p-6ad52f176c3c81918f21c8ee6d2d6902',
  projectUrl: 'https://chatgpt.com/g/g-p-6ad52f176c3c81918f21c8ee6d2d6902-mesajify/project',
  title: 'Mesajify'
};

let inMemoryProjects = null;
let lastProjectsMtimeMs = 0;
let lastProjectsSize = -1;

function getProjectsFilePath() {
  return process.env.PROJECTS_FILE || PROJECTS_FILE;
}

function normalizeOrgKey(identityOrOrgId) {
  if (!identityOrOrgId) return null;
  if (typeof identityOrOrgId === 'string') {
    const trimmed = identityOrOrgId.trim();
    return trimmed || null;
  }
  if (typeof identityOrOrgId === 'object') {
    const orgId = identityOrOrgId.orgId || identityOrOrgId.org_id || identityOrOrgId.tenantId || identityOrOrgId.tenant_id;
    if (orgId && typeof orgId === 'string') return orgId.trim();
    if (identityOrOrgId.customer && typeof identityOrOrgId.customer === 'string') {
      return `customer:${identityOrOrgId.customer.trim()}`;
    }
  }
  return null;
}

function loadAllCompanyProjects() {
  const filePath = getProjectsFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      if (inMemoryProjects && stat.mtimeMs === lastProjectsMtimeMs && stat.size === lastProjectsSize) {
        return inMemoryProjects;
      }
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (parsed && typeof parsed === 'object') {
        inMemoryProjects = parsed;
        lastProjectsMtimeMs = stat.mtimeMs;
        lastProjectsSize = stat.size;
        return inMemoryProjects;
      }
    } else {
      inMemoryProjects = {};
      lastProjectsMtimeMs = 0;
      lastProjectsSize = -1;
      return inMemoryProjects;
    }
  } catch (e) {
    console.warn('[ProjectManager] Dosya okuma uyarısı:', e.message);
  }
  return inMemoryProjects || {};
}

function saveAllCompanyProjects(data) {
  const filePath = getProjectsFilePath();
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, filePath);
    inMemoryProjects = data;
    try {
      const stat = fs.statSync(filePath);
      lastProjectsMtimeMs = stat.mtimeMs;
      lastProjectsSize = stat.size;
    } catch (_) {}
  } catch (e) {
    console.error('[ProjectManager] Dosya yazma hatası:', e.message);
  }
}

function getCompanyProject(identityOrOrgId) {
  const orgKey = normalizeOrgKey(identityOrOrgId);
  
  // Mesajify varsayılan tenant ve firma eşlemesi
  if (!orgKey || orgKey === 'Mesajify' || orgKey === 'customer:Mesajify' || orgKey === '2881f690-6853-4064-8768-307463ae6255' || orgKey.includes('2881f690-6853-4064-8768-307463ae6255')) {
    return DEFAULT_MESAJIFY_PROJECT;
  }

  const data = loadAllCompanyProjects();
  const entry = data[orgKey];
  if (entry && entry.projectUrl && entry.projectId) {
    return entry;
  }

  // Tanımlı olmayanlar varsayılan Mesajify projesine yönlenir
  return DEFAULT_MESAJIFY_PROJECT;
}

function setCompanyProject(identityOrOrgId, { projectId, projectUrl, title }) {
  const orgKey = normalizeOrgKey(identityOrOrgId);
  if (!orgKey || !projectUrl || !projectId) return;

  const data = loadAllCompanyProjects();

  // Cross-tenant collision guard: Proje başka bir orgKey'e ait olmamalı
  for (const [otherOrg, entry] of Object.entries(data)) {
    if (otherOrg !== orgKey && entry) {
      if (entry.projectId === projectId || entry.projectUrl === projectUrl) {
        console.warn(`[ProjectManager] 🛑 GÜVENLİK ENGELİ: Proje (${projectId}) zaten '${otherOrg}' tarafından kullanılıyor! '${orgKey}' için atanması reddedildi.`);
        return;
      }
    }
  }

  const projectEntry = {
    projectId,
    projectUrl,
    title: title || `Mesajify — ${orgKey}`,
    createdAt: data[orgKey]?.createdAt || Date.now(),
    updatedAt: Date.now()
  };

  data[orgKey] = projectEntry;
  saveAllCompanyProjects(data);
  console.log(`[ProjectManager] 💾 [${orgKey}] -> "${projectEntry.title}" projesi kaydedildi: ${projectUrl}`);
  return projectEntry;
}

/**
 * ChatGPT Web arayüzünde mevcut projeleri kontrol eder veya yoksa API üzerinden otomatik oluşturur.
 * Fail-safe: Hata durumunda DEFAULT_MESAJIFY_PROJECT döner.
 */
async function ensureCompanyProject(cdp, identityOrOrgId, companyName) {
  const orgKey = normalizeOrgKey(identityOrOrgId);
  const cleanName = (companyName || '').trim() || 'Genel';

  // Mesajify ise doğrudan ana Mesajify projesine yönlendir
  if (!orgKey || orgKey === 'Mesajify' || orgKey === 'customer:Mesajify' || cleanName.toLowerCase() === 'mesajify' || orgKey === '2881f690-6853-4064-8768-307463ae6255' || orgKey.includes('2881f690-6853-4064-8768-307463ae6255')) {
    return DEFAULT_MESAJIFY_PROJECT;
  }

  // 1. Zaten kayıtlı proje var mı?
  const existing = getCompanyProject(orgKey);
  if (existing && existing.projectId !== DEFAULT_MESAJIFY_PROJECT.projectId) {
    return existing;
  }

  if (!cdp) return DEFAULT_MESAJIFY_PROJECT;

  const expectedProjectTitle = `${cleanName}`;

  try {
    console.log(`[ProjectManager] 🔍 "${expectedProjectTitle}" projesi kontrol ediliyor / oluşturuluyor...`);

    // Doğrudan ChatGPT backend API'si üzerinden projeyi oluştur
    const apiRes = await cdp.send('Runtime.evaluate', {
      expression: `(async () => {
        let token = '';
        try {
          const sRes = await fetch('/api/auth/session');
          const s = await sRes.json();
          token = s.accessToken;
        } catch(e) {}
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const payload = {
          name: ${JSON.stringify(expectedProjectTitle)},
          instructions: ${JSON.stringify(`${expectedProjectTitle} şirketi için profesyonel reklam, sosyal medya ve afiş üretim projesi.`)}
        };

        const r = await fetch('/backend-api/projects', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        if (!r.ok) return { success: false, status: r.status };
        const data = await r.json();
        return {
          success: true,
          projectId: data.resource?.gizmo?.id,
          shortUrl: data.resource?.gizmo?.short_url
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    const val = apiRes.result?.value;
    if (val && val.success && val.projectId) {
      const pUrl = `https://chatgpt.com/g/${val.shortUrl || val.projectId}/project`;
      console.log(`[ProjectManager] ✨ Firma projesi başarıyla oluşturuldu: ${val.projectId} -> ${pUrl}`);
      return setCompanyProject(orgKey, {
        projectId: val.projectId,
        projectUrl: pUrl,
        title: expectedProjectTitle
      });
    }

    console.warn(`[ProjectManager] Proje API oluşturma yanıt vermedi (status: ${val?.status}), varsayılan Mesajify projesi kullanılacak.`);
    return DEFAULT_MESAJIFY_PROJECT;

  } catch (err) {
    console.warn('[ProjectManager] ensureCompanyProject hatası (varsayılana fallback yapılıyor):', err.message);
    return DEFAULT_MESAJIFY_PROJECT;
  }
}

function clearCompanyProjectsCache() {
  inMemoryProjects = null;
  lastProjectsMtimeMs = 0;
  lastProjectsSize = -1;
}

module.exports = {
  PROJECTS_FILE,
  DEFAULT_MESAJIFY_PROJECT,
  normalizeOrgKey,
  getCompanyProject,
  setCompanyProject,
  ensureCompanyProject,
  loadAllCompanyProjects,
  saveAllCompanyProjects,
  clearCompanyProjectsCache
};
