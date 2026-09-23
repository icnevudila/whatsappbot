const fs = require('fs');
const path = require('path');
const { getTenantScopeKey } = require('./tenant_scope.js');

const CHATS_FILE = process.env.CHATS_FILE || path.join('/data', 'company_chats.json');
const CHAT_CACHE_MAX_ENTRIES = Math.max(1, parseInt(process.env.CHAT_CACHE_MAX_ENTRIES || '500', 10));
const CHAT_CACHE_TTL_MS = Math.max(1000, parseInt(process.env.CHAT_CACHE_TTL_MS || String(5 * 60 * 1000), 10));
const chatCache = new Map();
const cacheMetrics = { hit: 0, miss: 0, diskReadMs: 0, diskWriteMs: 0 };

/**
 * Müşteri ve kanal bazında standart başlık üretir:
 * - Sistem / Canary -> "Sistem - Canary Watchdog"
 * - Medya -> "[Firma] - Medya"
 * - Mesajlar -> "[Firma] - Mesajlar"
 * - Video -> "[Firma] - Video Prompt"
 */
function getExpectedChatTitle(customer, channel) {
  const norm = (customer || '').trim();
  if (channel === 'canary' || norm === 'Sistem' || norm === 'Sistem Nöbetçisi' || norm.toLowerCase().includes('canary')) {
    return '[Sistem] Canary Watchdog';
  }
  const comp = norm || 'Genel';
  if (channel === 'media') return `[Mesajify] ${comp} - Medya`;
  if (channel === 'chat') return `[Mesajify] ${comp} - Mesajlar`;
  if (channel === 'video') return `[Mesajify] ${comp} - Video Prompt`;
  return `[Mesajify] ${comp} - ${channel}`;
}

function normalizeIdentity(customerOrIdentity, channel) {
  const identity = typeof customerOrIdentity === 'object' && customerOrIdentity !== null
    ? customerOrIdentity
    : { customer: customerOrIdentity };
  const norm = (identity.customer || '').trim();
  if (channel === 'canary' || norm === 'Sistem' || norm === 'Sistem Nöbetçisi' || norm.toLowerCase().includes('canary')) {
    return { companyKey: 'Sistem', channelKey: 'canary', displayCustomer: 'Sistem' };
  }
  const tenantId = identity.tenantId || identity.tenant_id || identity.orgId || identity.org_id;
  return {
    // Keep existing on-disk legacy keys readable; tenant-aware callers get an
    // explicitly namespaced key and can never share those legacy sessions.
    companyKey: tenantId
      ? getTenantScopeKey({ tenantId, conversationId: identity.conversationId || identity.conversation_id, customer: norm })
      : (norm || 'Genel'),
    channelKey: channel,
    displayCustomer: norm || 'Genel',
  };
}

let inMemoryChats = null;
let lastChatsMtimeMs = 0;
let lastChatsSize = -1;
let globalWriteQueue = Promise.resolve();
const conversationWriteLocks = new Map();

function getChatsFilePath() {
  return process.env.CHATS_FILE || CHATS_FILE;
}

function loadAllCompanyChats() {
  const filePath = getChatsFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      if (inMemoryChats && stat.mtimeMs === lastChatsMtimeMs && stat.size === lastChatsSize) {
        return inMemoryChats;
      }
      const startedAt = Date.now();
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      cacheMetrics.diskReadMs += Date.now() - startedAt;
      if (parsed && typeof parsed === 'object') {
        inMemoryChats = parsed;
        lastChatsMtimeMs = stat.mtimeMs;
        lastChatsSize = stat.size;
        return inMemoryChats;
      }
    } else {
      inMemoryChats = {};
      lastChatsMtimeMs = 0;
      lastChatsSize = -1;
      return inMemoryChats;
    }
  } catch (e) {
    console.warn('[ChatManager] Dosya okuma uyarısı:', e.message);
  }
  return inMemoryChats || {};
}

function saveAllCompanyChats(data) {
  const startedAt = Date.now();
  const filePath = getChatsFilePath();
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, filePath);
    inMemoryChats = data;
    try {
      const stat = fs.statSync(filePath);
      lastChatsMtimeMs = stat.mtimeMs;
      lastChatsSize = stat.size;
    } catch (_) {}
  } catch (e) {
    console.error('[ChatManager] Dosya yazma hatası:', e.message);
  }
  cacheMetrics.diskWriteMs += Date.now() - startedAt;
}

function serializeConversationWrite(scopeKey, task) {
  const current = conversationWriteLocks.get(scopeKey) || Promise.resolve();
  const next = current.then(task, task);
  conversationWriteLocks.set(scopeKey, next);
  return next.finally(() => {
    if (conversationWriteLocks.get(scopeKey) === next) {
      conversationWriteLocks.delete(scopeKey);
    }
  });
}

function cacheKey(companyKey, channelKey) {
  return `${companyKey}\u0000${channelKey}`;
}

function getCompanyChat(customerOrIdentity, channel) {
  const { companyKey, channelKey } = normalizeIdentity(customerOrIdentity, channel);
  const key = cacheKey(companyKey, channelKey);
  const cached = chatCache.get(key);
  if (cached) {
    if (Date.now() - cached.cachedAt < CHAT_CACHE_TTL_MS) {
      cacheMetrics.hit++;
      chatCache.delete(key);
      chatCache.set(key, cached);
      return cached.entry;
    }
    chatCache.delete(key);
  }
  cacheMetrics.miss++;
  const data = loadAllCompanyChats();
  const entry = data[companyKey]?.[channelKey];
  if (entry && entry.chatUrl) putCache(key, entry);
  if (entry && entry.chatUrl) {
    return entry;
  }
  return null;
}

function putCache(key, entry) {
  chatCache.delete(key);
  chatCache.set(key, { entry, cachedAt: Date.now() });
  while (chatCache.size > CHAT_CACHE_MAX_ENTRIES) chatCache.delete(chatCache.keys().next().value);
}

function setCompanyChat(customerOrIdentity, channel, chatUrl, customTitle = null) {
  if (!chatUrl) return;
  const { companyKey, channelKey, displayCustomer } = normalizeIdentity(customerOrIdentity, channel);
  const title = customTitle || getExpectedChatTitle(displayCustomer, channelKey);
  const data = loadAllCompanyChats();

  if (!data[companyKey] || typeof data[companyKey] !== 'object') {
    data[companyKey] = {};
  }

  const entry = {
    chatUrl,
    title,
    updatedAt: Date.now()
  };
  data[companyKey][channelKey] = entry;

  saveAllCompanyChats(data);
  putCache(cacheKey(companyKey, channelKey), entry);
  console.log(`[ChatManager] 💾 [${companyKey}] [${channelKey}] -> "${title}" kaydedildi: ${chatUrl}`);
}

async function renameChatToTitle(cdp, title) {
  if (!title || !cdp) return;
  try {
    await cdp.send('Runtime.evaluate', {
      expression: `(async () => {
        const pathParts = window.location.pathname.split('/');
        const cIndex = pathParts.indexOf('c');
        if (cIndex === -1) return { success: false, reason: 'not_in_c' };
        const conversationId = pathParts[cIndex + 1];

        let token = '';
        try {
          const sessionRes = await fetch('/api/auth/session');
          const session = await sessionRes.json();
          token = session.accessToken;
        } catch (e) {}

        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const MESAJIFY_PROJECT_ID = 'g-p-6aaf94b0ae20819180ce47c040ff4a59';
        const res = await fetch('/backend-api/conversation/' + conversationId, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            title: ${JSON.stringify(title)},
            gizmo_id: MESAJIFY_PROJECT_ID
          })
        });

        const links = Array.from(document.querySelectorAll('nav a'));
        for (const a of links) {
          if (a.href.includes(conversationId) || a.getAttribute('aria-current') === 'page') {
            const textDiv = a.querySelector('div') || a;
            textDiv.innerText = ${JSON.stringify(title)};
          }
        }
        return { success: res.ok, status: res.status };
      })()`,
      awaitPromise: true
    });
    console.log(`[ChatManager] 🏷️ Sohbet başlığı "${title}" olarak güncellendi.`);
  } catch (e) {
    console.warn(`[ChatManager] Sohbet başlık güncelleme uyarısı:`, e.message);
  }
}

function clearChatCache() {
  chatCache.clear();
  inMemoryChats = null;
  lastChatsMtimeMs = 0;
  lastChatsSize = -1;
}

module.exports = {
  CHATS_FILE,
  getExpectedChatTitle,
  normalizeIdentity,
  getCompanyChat,
  setCompanyChat,
  renameChatToTitle,
  loadAllCompanyChats,
  saveAllCompanyChats,
  serializeConversationWrite,
  getChatCacheMetrics: () => ({ ...cacheMetrics, entries: chatCache.size }),
  clearChatCache,
};
