/**
 * Google Flow Hesap Havuzu ve Oturum İzolasyonu (v2)
 * 
 * Upstream Kaynak:
 * - miyakejima/google-flow-mcp/src/browser-manager.ts
 *   Commit: 6826452a4a2e93bf7313d1be1626a9034fd7dc27 (19 Temmuz 2026)
 *   Lisans: MIT
 * 
 * Kullanıcı Değişiklik Direktifi:
 * - Asla /tmp kullanılmaz! Profiller /app/flow-profiles/<flowAccountId>/ altında kalıcı tutulur.
 * - VPS / container restart sonrası oturum, çerez ve login bilgileri korunur.
 * - Hesap başına katı concurrency = 1 (runExclusive kuyruğu).
 * - PID kilitleri ve profil sanitizasyonu (SingletonLock temizliği, exit_type=Normal).
 */

const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PROFILES_BASE_DIR = process.env.FLOW_PROFILES_DIR || '/app/flow-profiles';

class FlowAccountPoolV2 {
  constructor() {
    this.accountQueues = new Map(); // accountId -> Promise chain (concurrency = 1)
    this.activeSockets = new Map(); // socketKey -> WebSocket
  }

  /**
   * Hesabın kalıcı profil dizinini döndürür.
   * /app/flow-profiles/<flowAccountId>/
   */
  getProfileDir(accountId) {
    const safeId = String(accountId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
    const p = path.join(PROFILES_BASE_DIR, safeId);
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
    }
    return p;
  }

  /**
   * Chrome başlamadan önce profil dizinini sanitize eder.
   * Önceki kilit dosyalarını (SingletonLock) siler ve Preferences dosyasında
   * exit_type = "Normal" yazarak "Restore tabs" pop-up'ını engeller.
   */
  sanitizeProfile(profileDir) {
    if (!fs.existsSync(profileDir)) return;

    // 1. Bayat kilitleri sil
    const lockFiles = ['SingletonLock', 'lock', 'Lock', 'SingletonCookie', 'SingletonSocket'];
    for (const lf of lockFiles) {
      const lockPath = path.join(profileDir, lf);
      try {
        if (fs.existsSync(lockPath)) {
          fs.unlinkSync(lockPath);
        }
      } catch (_) {}
    }

    // 2. Preferences dosyasını temiz kapatılmış olarak işaretle
    const prefsPath = path.join(profileDir, 'Default', 'Preferences');
    if (fs.existsSync(prefsPath)) {
      try {
        const raw = fs.readFileSync(prefsPath, 'utf8');
        const data = JSON.parse(raw);
        if (!data.profile) data.profile = {};
        data.profile.exit_type = 'Normal';
        data.profile.exited_cleanly = true;
        if (!data.download) data.download = {};
        data.download.prompt_for_download = false;
        data.download.directory_upgrade = true;
        fs.writeFileSync(prefsPath, JSON.stringify(data), 'utf8');
      } catch (_) {}
    }
  }

  /**
   * Hesap düzeyinde katı concurrency = 1 garantisi.
   * Aynı hesaba gelen işlemler sıraya girer ve birbirini ezemez.
   */
  async runExclusive(accountId, fn) {
    const queueKey = String(accountId || 'default');
    const currentQueue = this.accountQueues.get(queueKey) || Promise.resolve();

    let releaseLock;
    const nextQueue = new Promise(resolve => { releaseLock = resolve; });
    this.accountQueues.set(queueKey, currentQueue.then(() => nextQueue));

    await currentQueue;
    try {
      return await fn();
    } finally {
      releaseLock();
      if (this.accountQueues.get(queueKey) === nextQueue) {
        this.accountQueues.delete(queueKey);
      }
    }
  }

  /**
   * Belirtilen CDP portu için WebSocket bağlantısı kurar ve send wrapper'ı döndürür.
   */
  async createCdpSession(cdpUrl) {
    const ws = new WebSocket(cdpUrl);
    let reqId = 1;
    const pending = new Map();

    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });

    ws.on('message', (msg) => {
      try {
        const data = JSON.parse(msg);
        if (data.id && pending.has(data.id)) {
          const { resolve, reject } = pending.get(data.id);
          pending.delete(data.id);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      } catch (_) {}
    });

    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = reqId++;
      pending.set(id, { resolve, reject });
      try {
        ws.send(JSON.stringify({ id, method, params }));
      } catch (err) {
        pending.delete(id);
        reject(err);
      }
    });

    const close = () => {
      try { ws.close(); } catch (_) {}
    };

    return { ws, send, close };
  }

  /**
   * Guard tab (about:blank) güvencesi.
   * Flow işlem sırasında sekme kapatsa bile tarayıcının tümden ölmesini engeller.
   */
  async ensureGuardPage(port) {
    try {
      const listRes = await fetch(`http://127.0.0.1:${port}/json/list`);
      const tabs = await listRes.json();
      const hasGuard = tabs.some(t => t.url === 'about:blank');
      if (!hasGuard) {
        await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
      }
    } catch (_) {}
  }
}

module.exports = new FlowAccountPoolV2();
