const fs = require('fs');
const path = require('path');

const CHATS_FILE = process.env.CHATS_FILE || path.join('/data', 'company_chats.json');

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

function normalizeKey(customer, channel) {
  const norm = (customer || '').trim();
  if (channel === 'canary' || norm === 'Sistem' || norm === 'Sistem Nöbetçisi' || norm.toLowerCase().includes('canary')) {
    return { companyKey: 'Sistem', channelKey: 'canary' };
  }
  return { companyKey: norm || 'Genel', channelKey: channel };
}

function loadAllCompanyChats() {
  try {
    if (fs.existsSync(CHATS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CHATS_FILE, 'utf8'));
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {
    console.warn('[ChatManager] Dosya okuma uyarısı:', e.message);
  }
  return {};
}

function saveAllCompanyChats(data) {
  try {
    const dir = path.dirname(CHATS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmp = `${CHATS_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, CHATS_FILE);
  } catch (e) {
    console.error('[ChatManager] Dosya yazma hatası:', e.message);
  }
}

function getCompanyChat(customer, channel) {
  const { companyKey, channelKey } = normalizeKey(customer, channel);
  const data = loadAllCompanyChats();
  const entry = data[companyKey]?.[channelKey];
  if (entry && entry.chatUrl) {
    return entry;
  }
  return null;
}

function setCompanyChat(customer, channel, chatUrl, customTitle = null) {
  if (!chatUrl) return;
  const { companyKey, channelKey } = normalizeKey(customer, channel);
  const title = customTitle || getExpectedChatTitle(companyKey, channelKey);
  const data = loadAllCompanyChats();

  if (!data[companyKey] || typeof data[companyKey] !== 'object') {
    data[companyKey] = {};
  }

  data[companyKey][channelKey] = {
    chatUrl,
    title,
    updatedAt: Date.now()
  };

  saveAllCompanyChats(data);
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

        const res = await fetch('/backend-api/conversation/' + conversationId, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ title: ${JSON.stringify(title)} })
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

module.exports = {
  CHATS_FILE,
  getExpectedChatTitle,
  getCompanyChat,
  setCompanyChat,
  renameChatToTitle,
  loadAllCompanyChats,
  saveAllCompanyChats
};
