'use strict';

const fs = require('fs');
const path = require('path');

const PROJECTS_FILE = process.env.PROJECTS_FILE || path.join('/data', 'company_projects.json');

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
  if (!orgKey) return null;
  const data = loadAllCompanyProjects();
  const entry = data[orgKey];
  if (entry && entry.projectUrl && entry.projectId) {
    return entry;
  }
  return null;
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
 * ChatGPT Web arayüzünde mevcut projeleri kontrol eder veya yoksa otomatik oluşturur.
 * Fail-safe: Hata durumunda null döner; çağıran akış normal ana sayfaya fallback yapar.
 */
async function ensureCompanyProject(cdp, identityOrOrgId, companyName) {
  const orgKey = normalizeOrgKey(identityOrOrgId);
  const cleanName = (companyName || '').trim() || 'Genel';
  const expectedProjectTitle = `Mesajify — ${cleanName}`;

  // 1. Zaten kayıtlı proje var mı?
  const existing = getCompanyProject(orgKey);
  if (existing) {
    return existing;
  }

  // 2. CDP ile DOM üzerinden mevcut proje var mı veya oluşturulabilir mi kontrol et
  if (!cdp) return null;

  try {
    console.log(`[ProjectManager] 🔍 "${expectedProjectTitle}" projesi aranıyor / oluşturuluyor...`);

    // A. DOM'da bu isimde proje bağlantısı veya klasörü var mı tara
    const checkDomRes = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const titleToFind = ${JSON.stringify(expectedProjectTitle)};
        const treeItems = Array.from(document.querySelectorAll('a[href*="/g/g-p-"], [role="treeitem"], div.group\\/folder-row, nav a'));
        for (const item of treeItems) {
          const text = (item.innerText || item.textContent || '').trim();
          if (text.includes(titleToFind)) {
            const a = item.closest('a') || item.querySelector('a');
            if (a && a.href && a.href.includes('/g/g-p-')) {
              const match = a.href.match(/\\/g\\/(g-p-[a-f0-9]+)[^\\/]*(\\/project)?/);
              if (match) {
                return { found: true, projectId: match[1], projectUrl: a.href };
              }
            }
          }
        }
        return { found: false };
      })()`,
      returnByValue: true
    });

    if (checkDomRes.result?.value?.found) {
      const { projectId, projectUrl } = checkDomRes.result.value;
      console.log(`[ProjectManager] 🎯 Proje DOM üzerinde bulundu: ${projectId} (${projectUrl})`);
      return setCompanyProject(orgKey, { projectId, projectUrl, title: expectedProjectTitle });
    }

    // B. Proje henüz yok, otomatik oluşturma modalını tetikle
    console.log(`[ProjectManager] ➕ "${expectedProjectTitle}" projesi oluşturuluyor...`);
    const openModalRes = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('button[aria-label="Add new project"]');
        if (btn) { btn.click(); return { clicked: true }; }
        return { clicked: false };
      })()`,
      returnByValue: true
    });

    if (!openModalRes.result?.value?.clicked) {
      console.warn('[ProjectManager] "Add new project" butonu bulunamadı, standart akışa devam ediliyor.');
      return null;
    }

    // Modalın açılmasını bekle (max 4 sn)
    let modalReady = false;
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 500));
      const modalCheck = await cdp.send('Runtime.evaluate', {
        expression: `!!document.querySelector('div[role="dialog"] input[name="project-name"]')`,
        returnByValue: true
      });
      if (modalCheck.result?.value) {
        modalReady = true;
        break;
      }
    }

    if (!modalReady) {
      console.warn('[ProjectManager] Proje oluşturma modalı zamanında açılmadı.');
      return null;
    }

    // Başlığı React-uyumlu prototype setter ile gir ve formu onayla
    const submitRes = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const input = document.querySelector('div[role="dialog"] input[name="project-name"]');
        if (!input) return { success: false, reason: 'input_missing' };
        
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(input, ${JSON.stringify(expectedProjectTitle)});
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        const submitBtn = Array.from(document.querySelectorAll('div[role="dialog"] button')).find(b => {
          const t = (b.innerText || '').toLowerCase();
          return t.includes('create') || t.includes('oluştur');
        });

        if (submitBtn && !submitBtn.disabled) {
          submitBtn.click();
          return { success: true };
        }
        return { success: false, reason: 'button_disabled_or_missing' };
      })()`,
      returnByValue: true
    });

    if (!submitRes.result?.value?.success) {
      console.warn('[ProjectManager] Proje modal formu onaylanamadı:', submitRes.result?.value?.reason);
      return null;
    }

    // Yeni proje sayfasına yönlenmeyi bekle (max 10 sn)
    let createdProjectUrl = null;
    let createdProjectId = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500));
      const urlRes = await cdp.send('Runtime.evaluate', {
        expression: 'window.location.href',
        returnByValue: true
      });
      const curUrl = urlRes.result?.value || '';
      const match = curUrl.match(/\/g\/(g-p-[a-f0-9]+)/);
      if (match) {
        createdProjectId = match[1];
        createdProjectUrl = curUrl;
        break;
      }
    }

    if (createdProjectId && createdProjectUrl) {
      console.log(`[ProjectManager] ✨ Yeni proje başarıyla oluşturuldu: ${createdProjectId} -> ${createdProjectUrl}`);
      return setCompanyProject(orgKey, {
        projectId: createdProjectId,
        projectUrl: createdProjectUrl,
        title: expectedProjectTitle
      });
    }

    console.warn('[ProjectManager] Proje oluşturulduktan sonra URL tespit edilemedi.');
    return null;

  } catch (err) {
    console.warn('[ProjectManager] ensureCompanyProject hatası (fail-safe fallback devreye giriyor):', err.message);
    return null;
  }
}

function clearCompanyProjectsCache() {
  inMemoryProjects = null;
  lastProjectsMtimeMs = 0;
  lastProjectsSize = -1;
}

module.exports = {
  PROJECTS_FILE,
  normalizeOrgKey,
  getCompanyProject,
  setCompanyProject,
  ensureCompanyProject,
  loadAllCompanyProjects,
  saveAllCompanyProjects,
  clearCompanyProjectsCache
};
