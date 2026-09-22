/**
 * Google Flow batchexecute HTTP RPC İstemcisi
 * 
 * Upstream Kaynak:
 * - DiegoLopez0208/google-flow-skill/flow_provider/api.py
 *   Commit: ccd24a316b37ea43b208dc5fb72d3dc47c7dd6cc (18 Eylül 2026)
 *   Lisans: MIT
 * 
 * Güvenlik İlkesi:
 * - Fail-closed: Yanıt şeması değişirse FLOW_RPC_CHANGED fırlatılır.
 * - Sıfır fuzzy fallback: Asla "son proje", "latest.mp4" veya rastgele dosya seçilmez.
 * - Tarayıcısız indirme: Asset dosyaları doğrudan flow-content.google HTTP akışı ile indirilir.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  FlowRpcChangedError,
  FlowSessionExpiredError
} = require('./flow_errors.js');

const BASE_URL = 'https://flow.google.com';
const BATCHEXECUTE_ENDPOINT = `${BASE_URL}/_/AiSandboxAngularFrontend/data/batchexecute`;
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

class FlowRpcClient {
  /**
   * CDP oturumu üzerinden açık olan sayfadaki oturum anahtarlarını (SNlM0e / at, FdrFJe / sid, cfb2h / bl)
   * ve flow.google.com çerezlerini ayıklar.
   * 
   * @param {Object} cdpSession - WebSocket send fonksiyonu veya CDP wrapper
   * @returns {Promise<Object>} Oturum bilgisi { at, sid, bl, cookies, cookieHeader }
   */
  static async extractSessionFromCdp(cdpSend) {
    // 1. Sayfa DOM içeriğinden Google dahili oturum token'larını çek
    const evalRes = await cdpSend('Runtime.evaluate', {
      expression: `(() => {
        const html = document.documentElement.innerHTML || '';
        const mAt = html.match(/"SNlM0e":"([^"]+)"/);
        const mSid = html.match(/"FdrFJe":"([^"]+)"/);
        const mBl = html.match(/"cfb2h":"([^"]+)"/);
        return {
          at: mAt ? mAt[1] : null,
          sid: mSid ? mSid[1] : null,
          bl: mBl ? mBl[1] : null,
          url: window.location.href,
          isSignIn: /accounts\\.google\\.com/i.test(window.location.href) || html.includes('identifierId')
        };
      })()`,
      returnByValue: true
    });

    const info = evalRes?.result?.value;
    if (!info || info.isSignIn || !info.at) {
      throw new FlowSessionExpiredError('CDP_ACTIVE_TAB', {
        reason: 'Oturum tokeni (SNlM0e/at) bulunamadı veya sayfa login durumunda.',
        url: info?.url
      });
    }

    // 2. CDP Network üzerinden çerezleri çek
    const cookieRes = await cdpSend('Network.getCookies', {
      urls: [BASE_URL, 'https://google.com']
    });

    const cookies = (cookieRes?.cookies || []).filter(c => {
      const dom = (c.domain || '').replace(/^\./, '');
      return dom === 'google.com' || dom === 'flow.google.com';
    });

    const seenNames = new Set();
    const cookiePairs = [];
    for (const c of cookies) {
      if (!seenNames.has(c.name)) {
        seenNames.add(c.name);
        cookiePairs.push(`${c.name}=${c.value}`);
      }
    }

    const cookieHeader = cookiePairs.join('; ');
    return {
      at: info.at,
      sid: info.sid || '-1',
      bl: info.bl || 'boq_assistant',
      cookies,
      cookieHeader,
      extractedAt: new Date().toISOString()
    };
  }

  /**
   * batchexecute zarfını (envelope) ayrıştırır.
   * Format: )]}'\n[[["wrb.fr", "<rpcid>", "<escaped_json_payload>"]]]
   */
  static parseEnvelope(rawText, rpcid) {
    if (!rawText || typeof rawText !== 'string') return null;

    const lines = rawText.split('\n');
    for (let line of lines) {
      line = line.trim();
      if (!line.startsWith('[[')) continue;

      try {
        const blocks = JSON.parse(line);
        if (!Array.isArray(blocks)) continue;

        for (const block of blocks) {
          if (!Array.isArray(block) || block.length < 3) continue;
          if (block[0] === 'wrb.fr' && block[1] === rpcid && typeof block[2] === 'string') {
            return JSON.parse(block[2]);
          }
        }
      } catch (_) {
        // İlgili satır JSON değilse geç
      }
    }
    return null;
  }

  /**
   * Tek bir RPC çağrısı yapar.
   */
  static async call(rpcid, payload, session) {
    if (!session || !session.at || !session.cookieHeader) {
      throw new FlowSessionExpiredError('RPC_SESSION_MISSING', { rpcid });
    }

    const queryParams = new URLSearchParams({
      rpcids: rpcid,
      'source-path': '/',
      'f.sid': session.sid || '-1',
      bl: session.bl || 'boq_assistant',
      hl: 'tr',
      _reqid: String(Math.floor(10000 + Math.random() * 90000)),
      rt: 'c'
    });

    const formBody = new URLSearchParams({
      'f.req': JSON.stringify([[[rpcid, JSON.stringify(payload), null, 'generic']]]),
      at: session.at
    }).toString();

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'Cookie': session.cookieHeader,
      'User-Agent': DEFAULT_USER_AGENT,
      'Origin': BASE_URL,
      'Referer': `${BASE_URL}/`,
      'x-same-domain': '1'
    };

    let response;
    try {
      response = await fetch(`${BATCHEXECUTE_ENDPOINT}?${queryParams.toString()}`, {
        method: 'POST',
        headers,
        body: formBody,
        signal: AbortSignal.timeout(90000)
      });
    } catch (netErr) {
      throw new FlowRpcChangedError(rpcid, netErr.message, { networkError: true });
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new FlowSessionExpiredError('RPC_HTTP_' + response.status, { rpcid });
      }
      throw new FlowRpcChangedError(rpcid, `HTTP ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    if (text.trim().startsWith('<')) {
      throw new FlowSessionExpiredError('RPC_HTML_LOGIN_RESPONSE', { rpcid, snippet: text.slice(0, 200) });
    }

    const parsed = this.parseEnvelope(text, rpcid);
    if (!parsed) {
      throw new FlowRpcChangedError(rpcid, text, {
        reason: `RPC '${rpcid}' zarfı parse edilemedi (wrb.fr bloğu eksik).`
      });
    }

    return parsed;
  }

  /**
   * jHPbke RPC ile tarayıcıda tıklama yapmadan 50ms'de yeni izole proje oluşturur.
   */
  static async createProject(session, projectName) {
    const name = projectName || `Project_${Date.now()}`;
    const payload = ['projects/*', [null, [name]], [null, 22]];

    const resp = await this.call('jHPbke', payload, session);
    const projectId = this._findFirstUuid(resp);

    if (!projectId) {
      throw new FlowRpcChangedError('jHPbke', resp, {
        reason: 'jHPbke yanıtında 36 karakterlik proje UUID bulunamadı.'
      });
    }

    return {
      projectId,
      projectName: name,
      projectUrl: `${BASE_URL}/project/${projectId}`
    };
  }

  /**
   * ngNC2 RPC ile projedeki tüm kayıtlı asset ID'lerini listeler.
   */
  static async listProjectAssets(session, projectId) {
    if (!projectId || typeof projectId !== 'string') {
      throw new Error('listProjectAssets için geçerli bir projectId gereklidir.');
    }

    const payload = [`tools/PINHOLE/projects/${projectId}`];
    const resp = await this.call('ngNC2', payload, session);

    const allUuids = this._findAllUuids(resp);
    // Projenin kendi UUID'sini filtrele, sadece içindeki asset'leri döndür
    const assetIds = allUuids.filter(u => u !== projectId);
    return assetIds;
  }

  /**
   * as29s RPC ile bir asset'in doğrudan indirilebilir orijinal 'https://flow-content.google/' URL'ini çeker.
   */
  static async getAssetInfo(session, assetId) {
    if (!assetId || typeof assetId !== 'string') {
      throw new Error('getAssetInfo için geçerli bir assetId gereklidir.');
    }

    const payload = [assetId];
    const resp = await this.call('as29s', payload, session);
    const contentUrls = this._findContentUrls(resp);

    if (contentUrls.length === 0) {
      throw new FlowRpcChangedError('as29s', resp, {
        assetId,
        reason: `Asset '${assetId}' için flow-content.google indirme URL'i bulunamadı.`
      });
    }

    return {
      assetId,
      downloadUrl: contentUrls[0],
      allUrls: contentUrls,
      raw: resp
    };
  }

  /**
   * flow-content.google üzerinden doğrudan HTTP akışıyla dosyayı diske indirir.
   * İndirme sırasında SHA-256 özetini hesaplar. Tarayıcı indirmesi kullanılmaz!
   */
  static async downloadAssetDirect(session, downloadUrl, targetFilePath) {
    const dir = path.dirname(targetFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const headers = {
      'Cookie': session.cookieHeader,
      'User-Agent': DEFAULT_USER_AGENT,
      'Referer': `${BASE_URL}/`
    };

    const res = await fetch(downloadUrl, {
      headers,
      signal: AbortSignal.timeout(300000) // 5 dakika
    });

    if (!res.ok) {
      throw new Error(`Doğrudan medya indirme HTTP ${res.status} ile başarısız oldu: ${downloadUrl}`);
    }

    const fileStream = fs.createWriteStream(targetFilePath);
    const hash = crypto.createHash('sha256');
    let bytesWritten = 0;

    const reader = res.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          fileStream.write(value);
          hash.update(value);
          bytesWritten += value.length;
        }
      }
    } finally {
      fileStream.end();
    }

    await new Promise((resolve, reject) => {
      fileStream.on('finish', resolve);
      fileStream.on('error', reject);
    });

    const sha256 = hash.digest('hex');
    return {
      targetFilePath,
      bytesWritten,
      sha256
    };
  }

  // --- Yardımcı Özyinelemeli Arama Metotları (Recursive Unpacking) ---

  static _findFirstUuid(node) {
    if (typeof node === 'string') {
      if (node.length === 36 && (node.match(/-/g) || []).length === 4) {
        return node;
      }
      return null;
    }
    if (Array.isArray(node)) {
      for (const item of node) {
        const found = this._findFirstUuid(item);
        if (found) return found;
      }
    }
    return null;
  }

  static _findAllUuids(node, set = new Set()) {
    if (typeof node === 'string') {
      if (node.length === 36 && (node.match(/-/g) || []).length === 4) {
        set.add(node);
      }
    } else if (Array.isArray(node)) {
      for (const item of node) {
        this._findAllUuids(item, set);
      }
    }
    return Array.from(set);
  }

  static _findContentUrls(node, list = []) {
    if (typeof node === 'string') {
      if (node.startsWith('https://flow-content.google/') && !list.includes(node)) {
        list.push(node);
      }
    } else if (Array.isArray(node)) {
      for (const item of node) {
        this._findContentUrls(item, list);
      }
    }
    return list;
  }
}

module.exports = FlowRpcClient;
