/**
 * OmniStudio Direct CDP Autonomous Worker
 * Bypasses Chrome 142+ extension restrictions by directly orchestrating
 * Chrome DevTools Protocol (CDP) on port 9222.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://127.0.0.1:3456';
const CDP_HTTP = process.env.CDP_HTTP || 'http://127.0.0.1:9222';
const argvWorker = process.argv.find(a => a.startsWith('--worker-id='))?.split('=')[1];
const argvTab = process.argv.find(a => a.startsWith('--tab-index='))?.split('=')[1];
const WORKER_ID = argvWorker || process.env.WORKER_ID || 'chatgpt-1';
const TAB_INDEX = parseInt(argvTab || process.env.TAB_INDEX || (WORKER_ID.endsWith('2') ? '1' : '0'), 10);
const POLL_INTERVAL_MS = 2500;

const {
  getExpectedChatTitle,
  getCompanyChat,
  setCompanyChat,
  renameChatToTitle
} = require('./chat_manager.js');
const {
  OrphanTabReaper,
  acquireSubmitPacing,
  acquireSessionFlightLease,
  releaseSessionFlightLease
} = require('./orphan_tab_reaper.js');

const reaper = new OrphanTabReaper();
let cachedTabId = null;


function isMemorySafeForWork() {
  if (WORKER_ID === 'chatgpt-1') return true; // Ana worker her zaman çalışır
  try {
    if (fs.existsSync('/proc/meminfo')) {
      const content = fs.readFileSync('/proc/meminfo', 'utf8');
      const match = content.match(/MemAvailable:\s+(\d+)\s+kB/);
      if (match) {
        const availMb = parseInt(match[1], 10) / 1024;
        return availMb >= 250;
      }
    }
  } catch (_) {}
  const freeMb = os.freemem() / (1024 * 1024);
  return freeMb >= 250;
}

console.log(`[CDP Worker: ${WORKER_ID}] OmniStudio Otonom Tarayıcı Motoru Başlatılıyor...`);
console.log(`[CDP Worker: ${WORKER_ID}] Gateway: ${GATEWAY_URL} | CDP: ${CDP_HTTP}`);

const JS_GET_ASSISTANT_MSGS = `
  (() => {
    const classic = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));
    if (classic.length > 0) return classic;
    const unitKeys = Array.from(document.querySelectorAll('[data-chatgpt-search-unit-key*="assistant"]'));
    if (unitKeys.length > 0) return unitKeys;
    const h4s = Array.from(document.querySelectorAll('[data-conversation-role="assistant"]'));
    if (h4s.length > 0) return h4s.map(h => h.parentElement || h);
    return [];
  })()
`;

let isBusy = false;

function createWorkerTiming(job, kind) {
  const startedAt = Date.now();
  const timings = {
    worker_acquire_ms: Math.max(0, startedAt - (job.startedAt || startedAt)),
    tab_acquire_ms: 0,
    tab_ready_ms: 0,
    prompt_insert_ms: 0,
    submit_ms: 0,
    total_worker_ms: 0,
  };
  if (kind === 'text') {
    timings.first_response_signal_ms = null;
    timings.response_complete_ms = null;
    timings.parse_ms = null;
  } else if (kind === 'image') {
    timings.reference_upload_ms = null;
    timings.generation_start_detect_ms = null;
    timings.generation_complete_detect_ms = null;
    timings.image_acquire_ms = null;
    timings.decode_process_ms = null;
  }

  return {
    mark(name, since = startedAt) {
      timings[name] = Math.max(0, Date.now() - since);
    },
    finalize() {
      const total = Math.max(0, Date.now() - startedAt);
      timings.total_worker_ms = total;
      const providerWait = kind === 'image'
        ? (timings.generation_complete_detect_ms || timings.image_acquire_ms)
        : timings.response_complete_ms;
      if (Number.isFinite(providerWait)) {
        timings.provider_wait_ms = providerWait;
        timings.infrastructure_overhead_ms = Math.max(0, total - providerWait);
      } else {
        timings.provider_wait_ms = null;
        timings.infrastructure_overhead_ms = total;
      }
      return timings;
    },
    async flush() {
      const finalized = this.finalize();
      await fetch(`${GATEWAY_URL}/job/worker-timings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id, timings: finalized }),
      }).catch(() => {});
    },
    timings,
  };
}

// DevTools CDP WebSocket Command Helper
function createCdpSession(wsUrl, connectTimeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    let connectTimer = setTimeout(() => {
      try { ws.close(); } catch (_) {}
      reject(new Error(`[CDP Timeout] WebSocket connection to ${wsUrl} timed out after ${connectTimeoutMs}ms`));
    }, connectTimeoutMs);

    const ws = new WebSocket(wsUrl);
    let msgId = 1;
    const callbacks = new Map();

    ws.onopen = () => {
      clearTimeout(connectTimer);
      resolve({
        send(method, params = {}, timeoutMs = 45000) {
          return new Promise((res, rej) => {
            const id = msgId++;
            let timer = null;
            if (timeoutMs > 0) {
              timer = setTimeout(() => {
                callbacks.delete(id);
                rej(new Error(`[CDP Timeout] ${method} ${timeoutMs}ms icinde yanit vermedi`));
              }, timeoutMs);
            }
            callbacks.set(id, {
              res: (val) => {
                if (timer) clearTimeout(timer);
                res(val);
              },
              rej: (err) => {
                if (timer) clearTimeout(timer);
                rej(err);
              }
            });
            ws.send(JSON.stringify({ id, method, params }));
          });
        },
        close() {
          try { ws.close(); } catch (e) {}
        }
      });
    };

    ws.onerror = (err) => {
      clearTimeout(connectTimer);
      reject(err);
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.id && callbacks.has(data.id)) {
          const { res, rej } = callbacks.get(data.id);
          callbacks.delete(data.id);
          if (data.error) rej(data.error);
          else res(data.result);
        }
      } catch (err) {
        console.error('[CDP Worker] WS parse error:', err);
      }
    };
  });
}

// Worker'a atanmış ChatGPT sekmesini bul veya gerekirse yeni sekme aç
async function getTab(matchPattern) {
  try {
    const res = await fetch(`${CDP_HTTP}/json/list`);
    const tabs = await res.json();
    const chatTabs = tabs.filter(t => t.url && t.url.includes(matchPattern));

    // 1. Eğer bu worker'ın kayıtlı canonical sekmesi varsa ve hala açıksa onu kullan
    if (cachedTabId) {
      const existing = chatTabs.find(t => t.id === cachedTabId);
      if (existing) {
        reaper.registry.touchTab(cachedTabId, existing.url);
        return existing;
      }
    }

    // 2. Worker canonical tab eşleşmesi:
    // Eğer TAB_INDEX sınırında bir sekme varsa ve başka bir worker'ın canonical'ı değilse sahiplen
    const candidateTab = chatTabs[TAB_INDEX];
    if (candidateTab && (!reaper.registry.isCanonicalForAnyWorker(candidateTab.id) || reaper.registry.getWorkerCanonicalTab(WORKER_ID)?.tabId === candidateTab.id)) {
      cachedTabId = candidateTab.id;
      reaper.registry.bindWorkerCanonical(WORKER_ID, candidateTab.id, candidateTab.url);
      return candidateTab;
    }

    // 3. Eğer chatTabs içinde henüz hiçbir worker tarafından sahiplenilmemiş sekme varsa bağla
    const unowned = chatTabs.find(t => !reaper.registry.isCanonicalForAnyWorker(t.id));
    if (unowned) {
      cachedTabId = unowned.id;
      reaper.registry.bindWorkerCanonical(WORKER_ID, unowned.id, unowned.url);
      return unowned;
    }

    // 4. Eğer bu worker için gereken sekme (ör. 2. sekme) henüz açık değilse, Chrome'da bu worker için aç
    console.log(`[CDP Worker: ${WORKER_ID}] Worker'a özel sekme #${TAB_INDEX + 1} açılıyor...`);
    const newRes = await fetch(`${CDP_HTTP}/json/new?https://chatgpt.com/`, { method: 'PUT' });
    const newTab = await newRes.json();
    await sleep(3500);
    cachedTabId = newTab.id;
    reaper.registry.bindWorkerCanonical(WORKER_ID, newTab.id, newTab.url);
    return newTab;
  } catch (err) {
    return null;
  }
}


let isTabLoggedIn = false;
let lastLoginCheck = 0;

async function checkTabLogin(tab) {
  if (!tab || !tab.url) return false;
  if (tab.url.includes('/auth') || tab.url.includes('/login') || tab.url.includes('/uc/') || tab.url.includes('unauth')) {
    return false;
  }
  // Aktif bir sohbet URL'indeysek (/c/...) kullanıcı kesinlikle oturum açmıştır
  if (tab.url.includes('/c/')) {
    return true;
  }
  let cdp = null;
  try {
    cdp = await createCdpSession(tab.webSocketDebuggerUrl);
    await cdp.send('Runtime.enable').catch(() => {});
    const evalRes = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const hasLoginBtn = !!(document.querySelector('[data-testid="login-button"]') || Array.from(document.querySelectorAll('button')).some(b => b.innerText.trim().toLowerCase().includes('log in') || b.innerText.trim().toLowerCase().includes('giriş yap')));
        const hasProfileBtn = !!(document.querySelector('[data-testid="profile-button"]') || document.querySelector('button[aria-label*="User"]') || document.querySelector('nav img[alt]'));
        const isUnauthUrl = window.location.pathname.startsWith('/uc/') || window.location.href.includes('unauth');
        
        if (hasLoginBtn || isUnauthUrl) return false;
        if (hasProfileBtn) return true;

        const hasPrompt = !!(document.querySelector('#prompt-textarea') || document.querySelector('div[contenteditable="true"]'));
        return hasPrompt && !hasLoginBtn;
      })()`,
      returnByValue: true
    });
    return !!evalRes.result?.value;
  } catch (e) {
    // Geçici CDP execution context hatasında mevcut durumu koru
    return isTabLoggedIn;
  } finally {
    if (cdp) cdp.close();
  }
}


async function dismissAnyModals(cdp) {
  try {
    const res = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const dialogs = Array.from(document.querySelectorAll('[role="dialog"], [role="alertdialog"], .modal'));
        let dismissed = false;
        for (const d of dialogs) {
          const btn = Array.from(d.querySelectorAll('button')).find(b => {
            const t = (b.innerText || '').trim().toLowerCase();
            return t.includes('got it') || t.includes('anladım') || t.includes('tamam') || t.includes('dismiss') || t.includes('stay logged out') || t.includes('close');
          }) || d.querySelector('button[aria-label="Close"], button.btn-primary');
          if (btn) {
            btn.click();
            dismissed = true;
          }
        }
        return dismissed;
      })()`,
      returnByValue: true
    });
    return !!res.result?.value;
  } catch (e) {
    return false;
  }
}

async function checkRateLimitModal(cdp) {
  try {
    const res = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const dialogs = Array.from(document.querySelectorAll('[role="dialog"], [role="alertdialog"], .modal'));
        for (const d of dialogs) {
          const t = (d.innerText || '').toLowerCase();
          if (t.includes('too many requests') || t.includes('requests too quickly') || t.includes('çok hızlı istek') || t.includes('istek sınır')) {
            const btn = Array.from(d.querySelectorAll('button')).find(b => {
              const bt = (b.innerText || '').toLowerCase();
              return bt.includes('got it') || bt.includes('anladım') || bt.includes('tamam') || bt.includes('dismiss');
            });
            if (btn) btn.click();
            return true;
          }
        }
        const alerts = Array.from(document.querySelectorAll('[role="alert"], [class*="alert"], [class*="banner"]'));
        for (const a of alerts) {
          const t = (a.innerText || '').toLowerCase();
          if (t.includes('too many requests') || t.includes('requests too quickly')) {
            return true;
          }
        }
        return false;
      })()`,
      returnByValue: true
    });
    return !!res.result?.value;
  } catch (_) {
    return false;
  }
}

async function waitForChatInput(cdp, maxWaitMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await dismissAnyModals(cdp);
    const check = await cdp.send('Runtime.evaluate', {
      expression: `!!(
        document.querySelector('#prompt-textarea') || 
        document.querySelector('div[contenteditable="true"]') ||
        document.querySelector('textarea')
      )`,
      returnByValue: true
    }).catch(() => ({ result: { value: false } }));
    if (check.result?.value) {
      return true;
    }
    await sleep(100);
  }
  return false;
}

function stripEmojis(text) {
  if (!text) return '';
  return text
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function injectPromptAndSend(cdp, promptText) {
  const startedAt = Date.now();
  let promptInsertedAt = null;
  try {
    // 0. Session-scoped submission pacing to avoid ChatGPT web concurrent submit rate-limits
    const sessionKey = process.env.SESSION_KEY || `chatgpt_${String(CDP_HTTP).replace(/[^0-9]/g, '') || '9222'}`;
    await acquireSubmitPacing(sessionKey);

    if (await checkRateLimitModal(cdp)) {
      throw new Error('WEB_SESSION_RATE_LIMITED: ChatGPT web "Too many requests" rate-limit modal detected');
    }

    // 1. Varsa engelleyici modalları temizle
    await dismissAnyModals(cdp);

    // 2. Textarea'yı temizle, odaklan ve form GET navigasyonunu önle
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const form = document.querySelector('form');
        if (form) form.onsubmit = (e) => { e.preventDefault(); return false; };
        const textarea = document.querySelector('#prompt-textarea') || 
                         document.querySelector('div[contenteditable="true"]') ||
                         document.querySelector('textarea');
        if (textarea) {
          textarea.focus();
          try {
            const range = document.createRange();
            range.selectNodeContents(textarea);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            document.execCommand('delete');
          } catch (_) {}
          if (textarea.innerHTML) textarea.innerHTML = '';
        }
      })()`
    });

    // 2. Chrome DevTools Protocol yerel Input.insertText ile metni enjekte et
    await cdp.send('Input.insertText', { text: promptText });
    promptInsertedAt = Date.now();
    await sleep(200);
    
    // 3. Gönder butonunun render edilmesini bekle ve tıkla
    let clicked = false;
    for (let wait = 0; wait < 35; wait++) {
      if (await checkRateLimitModal(cdp)) {
        throw new Error('WEB_SESSION_RATE_LIMITED: ChatGPT web "Too many requests" rate-limit modal detected');
      }
      await dismissAnyModals(cdp);
      const clickRes = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          let sendBtn = document.querySelector('button[data-testid="composer-send-button"]') ||
                        document.querySelector('#composer-submit-button') ||
                        document.querySelector('button[data-testid="send-button"]') ||
                        document.querySelector('button[data-testid="composer-speech-button"]') ||
                        document.querySelector('button[aria-label*="Send" i]') ||
                        document.querySelector('button[aria-label*="Gönder" i]') ||
                        document.querySelector('button.composer-submit-button-color') ||
                        document.querySelector('.composer-submit-button-color') ||
                        document.querySelector('form button[type="submit"]') ||
                        document.querySelector('button:has(svg.icon-2xl)') ||
                        document.querySelector('button:has(svg path[d*="M12 2"])');
          if (sendBtn && !sendBtn.disabled && sendBtn.getAttribute('aria-disabled') !== 'true') {
            sendBtn.click();
            const r = sendBtn.getBoundingClientRect();
            return { clicked: true, x: r.left + r.width / 2, y: r.top + r.height / 2 };
          }
          return null;
        })()`,
        returnByValue: true
      });

      if (clickRes.result?.value?.clicked) {
        clicked = true;
        const { x, y } = clickRes.result.value;
        if (x && y) {
          await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }).catch(() => {});
          await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }).catch(() => {});
        }
        break;
      }
      await sleep(150);
    }

    if (!clicked) {
      console.log(`[CDP Worker: ${WORKER_ID}] Buton bulunamadı/tıklanamadı, Enter tuşu simüle ediliyor...`);
      await cdp.send('Input.dispatchKeyEvent', {
        type: 'rawKeyDown',
        windowsVirtualKeyCode: 13,
        unmodifiedText: '\r',
        text: '\r',
        key: 'Enter',
        code: 'Enter'
      });
      await cdp.send('Input.dispatchKeyEvent', {
        type: 'keyUp',
        windowsVirtualKeyCode: 13,
        unmodifiedText: '\r',
        text: '\r',
        key: 'Enter',
        code: 'Enter'
      });
      await sleep(300);
    }

    return {
      success: true,
      prompt_insert_ms: Math.max(0, promptInsertedAt - startedAt),
      submit_ms: Math.max(0, Date.now() - promptInsertedAt)
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function resetToFreshChat(cdp) {
  try {
    await cdp.send('Page.navigate', { url: 'https://chatgpt.com/' });
    await sleep(3000);
    await waitForChatInput(cdp);
  } catch (err) {
    console.warn(`[CDP Worker: ${WORKER_ID}] resetToFreshChat uyarısı:`, err.message);
  }
}

let completedJobCount = 0;
const RECYCLE_JOB_THRESHOLD = 30;

async function performMemoryRecycle(tab) {
  console.log(`[CDP Worker: ${WORKER_ID}] 🧹 Bellek ve DOM temizliği tetiklendi (Tamamlanan iş: ${completedJobCount})...`);
  let cdp = null;
  try {
    cdp = await createCdpSession(tab.webSocketDebuggerUrl);
    await cdp.send('Runtime.evaluate', {
      expression: `window.location.replace('https://chatgpt.com/')`
    }, 15000);
    await sleep(4000);
    await waitForChatInput(cdp);
    console.log(`[CDP Worker: ${WORKER_ID}] ✨ Bellek ve DOM başarıyla tazelendi.`);
  } catch (err) {
    console.warn(`[CDP Worker: ${WORKER_ID}] Bellek temizleme uyarısı:`, err.message);
  } finally {
    if (cdp) cdp.close();
  }
}

async function renameChatToCustomer(cdp, title) {
  if (!title) return;
  try {
    await cdp.send('Runtime.evaluate', {
      expression: `(async () => {
        const pathParts = window.location.pathname.split('/');
        const cIndex = pathParts.indexOf('c');
        if (cIndex === -1) return;
        const conversationId = pathParts[cIndex + 1];

        let token = '';
        try {
          const sess = await (await fetch('/api/auth/session')).json();
          token = sess?.accessToken || '';
        } catch (e) {}

        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        await fetch('/backend-api/conversation/' + conversationId, {
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
      })()`,
      awaitPromise: true
    });
    console.log(`[CDP Worker: ${WORKER_ID}] Sohbet başlığı "${title}" olarak adlandırıldı.`);
  } catch (e) {
    console.warn(`[CDP Worker: ${WORKER_ID}] Sohbet adlandırma uyarısı:`, e.message);
  }
}

async function ensureCustomerChat(cdp, customer, channel = 'media', identity = {}) {
  const isCanary = customer === 'Sistem' || customer === 'Sistem Nöbetçisi' || channel === 'canary';
  const effectiveCustomer = isCanary ? 'Sistem' : (customer || 'Genel').trim();
  const effectiveChannel = isCanary ? 'canary' : channel;
  const expectedTitle = getExpectedChatTitle(effectiveCustomer, effectiveChannel);

  const chatIdentity = isCanary ? { customer: effectiveCustomer } : {
    customer: effectiveCustomer,
    tenantId: identity.tenantId,
    conversationId: identity.conversationId,
  };
  const saved = getCompanyChat(chatIdentity, effectiveChannel);
  let targetUrl = saved?.chatUrl || null;

  const urlEval = await cdp.send('Runtime.evaluate', {
    expression: 'window.location.href',
    returnByValue: true
  });
  const currentUrl = urlEval.result?.value || '';

  if (targetUrl) {
    const targetChatPath = targetUrl.replace('https://chatgpt.com', '');
    const isMatching = currentUrl.includes(targetChatPath);
    if (!isMatching) {
      console.log(`[CDP Worker: ${WORKER_ID}] "${effectiveCustomer}" [${effectiveChannel}] kayıtlı sohbetine geçiliyor: ${targetUrl}`);
      await cdp.send('Page.navigate', { url: targetUrl });
      await waitForChatInput(cdp, 15000);
    }

    const afterNavEval = await cdp.send('Runtime.evaluate', {
      expression: 'window.location.href',
      returnByValue: true
    });
    const afterUrl = afterNavEval.result?.value || '';
    if (afterUrl.includes('/c/')) {
      console.log(`[CDP Worker: ${WORKER_ID}] "${effectiveCustomer}" [${effectiveChannel}] aktif sohbetteyiz: ${targetUrl}`);
      return { isNewChat: false, chatUrl: targetUrl, title: expectedTitle };
    }
  }

  // Yeni temiz sohbet aç (Kayıtlı URL yoksa veya geçersizse)
  console.log(`[CDP Worker: ${WORKER_ID}] "${effectiveCustomer}" [${effectiveChannel}] için yeni sohbet açılıyor...`);
  await cdp.send('Page.navigate', { url: 'https://chatgpt.com/' });
  await waitForChatInput(cdp, 15000);
  return { isNewChat: true, chatUrl: null, title: expectedTitle };
}

// Düzenli Kalp Atışı (5s)
setInterval(async () => {
  try {
    if (WORKER_ID.startsWith('gemini')) {
      fetch(`${GATEWAY_URL}/worker/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId: WORKER_ID, status: 'idle', details: 'Gemini Video Worker Hazır' })
      }).catch(() => {});
      return;
    }

    const chatgptTab = await getTab('chatgpt.com');
    if (!chatgptTab) {
      isTabLoggedIn = false;
      fetch(`${GATEWAY_URL}/worker/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId: WORKER_ID, status: 'offline', details: 'ChatGPT sekmesi açık değil' })
      }).catch(() => {});
      return;
    }

    const now = Date.now();
    if (now - lastLoginCheck > 8000) {
      lastLoginCheck = now;
      isTabLoggedIn = await checkTabLogin(chatgptTab);
    }

    if (!isMemorySafeForWork()) {
      fetch(`${GATEWAY_URL}/worker/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerId: WORKER_ID,
          status: 'sleeping',
          details: `Bellek tasarrufu modu (${(os.freemem() / (1024 * 1024)).toFixed(0)} MB boş RAM)`
        })
      }).catch(() => {});
      return;
    }

    const status = isBusy ? 'busy' : (isTabLoggedIn ? 'idle' : 'waiting_login');
    const details = isBusy
      ? 'Görsel üretiyor'
      : (isTabLoggedIn ? 'Oturum açık, görev bekliyor' : 'Giriş bekleniyor (Login ekranı)');
    const sessionKey = process.env.SESSION_KEY || `chatgpt_${String(CDP_HTTP).replace(/[^0-9]/g, '') || '9222'}`;

    fetch(`${GATEWAY_URL}/worker/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workerId: WORKER_ID, status, details, sessionKey })
    }).catch(() => {});
  } catch (err) {}
}, 5000);

let lastJobTime = Date.now();

// Boşta kalan ChatGPT oturumunu diri tut (Session Keep-Alive - 12 dakikada bir hafif ping)
setInterval(async () => {
  if (isBusy) return;
  const idleMs = Date.now() - lastJobTime;
  if (idleMs > 12 * 60 * 1000) {
    try {
      const chatTab = await getTab('chatgpt.com');
      if (chatTab) {
        const cdp = await createCdpSession(chatTab.webSocketDebuggerUrl);
        await cdp.send('Runtime.evaluate', {
          expression: `fetch('https://chatgpt.com/', { method: 'HEAD', cache: 'no-store' }).then(() => true).catch(() => false);`,
          awaitPromise: true
        }).catch(() => {});
        cdp.close();
        lastJobTime = Date.now();
        console.log(`[CDP Worker: ${WORKER_ID}] ChatGPT oturum canlılık tazeleme (keep-alive) pingi gönderildi.`);
      }
    } catch (e) {}
  }
  // Boşta periyodik yetim sekme taraması (kritik yoldan bağımsız, rate-limited)
  if (!isBusy) {
    reaper.scheduleAsyncSweep({
      cdpHttpUrl: CDP_HTTP,
      workerId: WORKER_ID,
      reason: 'idle_periodic',
      delayMs: 1500,
    });
  }
}, 6 * 60 * 1000);


// Ana Döngü
async function workerLoop() {
  if (isBusy) return;
  if (WORKER_ID.startsWith('gemini')) return;

  if (!isMemorySafeForWork()) {
    return;
  }

  let chatgptTab = null;
  try {
    // 1. ChatGPT sekmesi var mı kontrol et
    chatgptTab = await getTab('chatgpt.com');
    if (!chatgptTab) {
      return;
    }


    // 1.1. Oturum açık mı kontrol et (Giriş yapılmadıysa iş çekme)
    if (!isTabLoggedIn) {
      return;
    }

    // 2. Gateway'den sıradaki işi çek
    const sessionKey = process.env.SESSION_KEY || `chatgpt_${String(CDP_HTTP).replace(/[^0-9]/g, '') || '9222'}`;
    const jobRes = await fetch(`${GATEWAY_URL}/job/next?platform=chatgpt&workerId=${encodeURIComponent(WORKER_ID)}&sessionKey=${encodeURIComponent(sessionKey)}`, { cache: 'no-store' });
    if (!jobRes.ok) return;

    const { job } = await jobRes.json();
    if (!job) return; // Boşta iş yok

    isBusy = true;
    if (chatgptTab && chatgptTab.id) {
      reaper.registry.setTabJob(chatgptTab.id, job.id);
    }
    console.log(`\n======================================================`);
    console.log(`[CDP Worker] YENİ İŞ ALINDI: #${job.id}`);
    console.log(`[CDP Worker] İş türü: ${job.type || 'image'} | Prompt karakteri: ${(job.prompt || '').length}`);
    console.log(`======================================================`);

    if (job.type === 'chat_suggestions') {
      await executeChatSuggestionsJob(chatgptTab, job);
    } else if (job.type === 'extract_knowledge') {
      await executeExtractKnowledgeJob(chatgptTab, job);
    } else if (job.type === 'product_affordance') {
      await executeProductAffordanceJob(chatgptTab, job);
    } else {
      await executeChatGPTJob(chatgptTab, job);
    }

    completedJobCount++;
    lastJobTime = Date.now();
    if (completedJobCount % RECYCLE_JOB_THRESHOLD === 0) {
      await performMemoryRecycle(chatgptTab);
    }

  } catch (err) {
    console.error('[CDP Worker] Döngü hatası:', err.message);
  } finally {
    if (chatgptTab && chatgptTab.id) {
      reaper.registry.setTabJob(chatgptTab.id, null);
    }
    isBusy = false;
    // Off critical path: asynchronous rate-limited sweep after response delivery
    reaper.scheduleAsyncSweep({
      cdpHttpUrl: CDP_HTTP,
      workerId: WORKER_ID,
      reason: 'post_job',
      delayMs: 2500,
    });
  }
}


// ChatGPT İşini Çalıştır
async function executeChatGPTJob(tab, job) {
  let cdp = null;
  const workerTiming = createWorkerTiming(job, 'image');
  const tempRefPaths = [];
  try {
    cdp = await createCdpSession(tab.webSocketDebuggerUrl);
    workerTiming.mark('tab_acquire_ms');

    // 0. Firma veya Sistem Kanaryası için belirlenmiş tekil oturumu aç
    const customer = (job.customer || 'Genel').trim();
    const isCanary = customer === 'Sistem' || customer === 'Sistem Nöbetçisi' || (job.workspace || '').includes('Canary');
    const channel = isCanary ? 'canary' : 'media';
    console.log(`[CDP Worker: ${WORKER_ID}] Firma: "${customer}" [${channel}] oturumu hazırlanıyor...`);
    const chatIdentity = { customer, tenantId: job.tenantId, conversationId: job.conversationId };
    const chatInfo = await ensureCustomerChat(cdp, customer, channel, chatIdentity);
    workerTiming.mark('tab_ready_ms');

    // 1. Referans Görseller Varsa (Image-to-Image / Ürün Görseli) ChatGPT'ye Dosya Olarak Yükle
    if (Array.isArray(job.referenceImages) && job.referenceImages.length > 0) {
      console.log(`[CDP Worker] ${job.referenceImages.length} adet referans görsel ekleniyor...`);
      for (let idx = 0; idx < job.referenceImages.length; idx++) {
        const ref = job.referenceImages[idx];
        const b64 = typeof ref === 'string' ? ref : (ref.data || ref.b64_json || '');
        if (b64) {
          const raw = b64.includes(',') ? b64.split(',')[1] : b64;
          const tmpPath = path.join('/tmp', `ref_${job.id}_${idx}.png`);
          fs.writeFileSync(tmpPath, Buffer.from(raw, 'base64'));
          tempRefPaths.push(tmpPath);
        }
      }

      if (tempRefPaths.length > 0) {
        try {
          const doc = await cdp.send('DOM.getDocument', {});
          const fileInput = await cdp.send('DOM.querySelector', {
            nodeId: doc.root.nodeId,
            selector: '#upload-photos, #upload-media, input[type=file]'
          });
          if (fileInput && fileInput.nodeId) {
            await cdp.send('DOM.setFileInputFiles', {
              files: tempRefPaths,
              nodeId: fileInput.nodeId
            });
            await cdp.send('Runtime.evaluate', {
              expression: `
                const el = document.querySelector('#upload-photos') || document.querySelector('#upload-media') || document.querySelector('input[type=file]');
                if (el) el.dispatchEvent(new Event('change', { bubbles: true }));
              `
            });
            console.log('[CDP Worker] Referans görsel inputa yüklendi, thumbnail bekleniyor...');
            const refUploadStart = Date.now();
            const maxRefWait = 4000;
            while (Date.now() - refUploadStart < maxRefWait) {
              const hasThumb = await cdp.send('Runtime.evaluate', {
                expression: `!!(
                  document.querySelector('[data-testid*="thumbnail"]') ||
                  document.querySelector('img[src^="blob:"]') ||
                  document.querySelector('#upload-photos img') ||
                  document.querySelector('.upload-preview')
                )`,
                returnByValue: true
              }).catch(() => ({ result: { value: false } }));
              if (hasThumb.result?.value) break;
              await sleep(150);
            }
            workerTiming.mark('reference_upload_ms', refUploadStart);
          }
        } catch (uploadErr) {
          console.warn('[CDP Worker] Referans görsel yükleme uyarısı:', uploadErr.message);
        }
      }
    }

    // 2. Stale Image Protection: Mevcut görsel URL'lerini snapshot al (Referans thumbnail'lar DAHİL)
    const beforeEval = await cdp.send('Runtime.evaluate', {
      expression: `Array.from(document.querySelectorAll('img')).map(i => i.src).filter(Boolean)`,
      returnByValue: true
    });
    const beforeImages = new Set(beforeEval.result?.value || []);

    // 3. Prompt'u Enjekte Et
    const injectRes = await injectPromptAndSend(cdp, job.prompt);
    if (!injectRes?.success) {
      throw new Error(injectRes?.error || 'Prompt kutusu bulunamadı veya gönderilemedi');
    }
    workerTiming.timings.prompt_insert_ms = injectRes.prompt_insert_ms;
    workerTiming.timings.submit_ms = injectRes.submit_ms;
    const submittedAt = Date.now();

    console.log('[CDP Worker] Prompt gönderildi, adaptif görsel üretim tespiti devrede...');

    // 4. Görselin üretilmesini bekle (Stale korumalı adaptif bounded polling)
    let foundImgSrc = null;
    const maxAttempts = 120; // 120 * 1.5s = 180s
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await sleep(1500);

      // İlerlemeyi Gateway'e bildir
      const elapsed = Math.round((Date.now() - submittedAt) / 1000);
      const progress = Math.min(96, Math.round((elapsed / 180) * 100));
      let statusText = 'Prompt gönderildi, görsel üretimi bekleniyor...';
      if (elapsed > 15) statusText = 'ChatGPT DALL-E görsel motoru çiziyor...';
      if (elapsed > 45) statusText = 'Görsel ayrıntıları ve ışıklandırma işleniyor...';
      if (elapsed > 90) statusText = 'Yüksek çözünürlüklü render tamamlanmak üzere...';

      fetch(`${GATEWAY_URL}/job/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id, progress, statusText })
      }).catch(() => {});

      const checkEval = await cdp.send('Runtime.evaluate', {
        expression: `
          (function() {
            const beforeList = ${JSON.stringify(Array.from(beforeImages))};
            // ChatGPT üretim/düşünme durumunu kontrol et
            const stopBtn = document.querySelector('button[data-testid="stop-button"], button[aria-label*="Stop"], button[aria-label*="durdur"]');
            const isThinking = !!document.querySelector('.result-thinking, [data-testid*="generating"], .streaming-animated-ellipsis');
            const isGenerating = !!stopBtn || isThinking;

            // Tüm img elementlerini tara (DALL-E estuary backend URL veya Generated image)
            const candidateImgs = Array.from(document.querySelectorAll('img'));

            for (const img of candidateImgs) {
              const src = img.src || '';
              if (!src) continue;

              const alt = (img.alt || '').toLowerCase();
              const isEstuaryOrGenerated = src.includes('backend-api/estuary') || alt.startsWith('generated image');

              if (!isEstuaryOrGenerated) continue;
              if (beforeList.includes(src)) continue;

              // Yüklenen referans dosyaları ref_... veya dosya uzantısıyla biter, onları asla alma
              if (alt.startsWith('ref_') || alt.endsWith('.png') || alt.endsWith('.jpg') || alt.endsWith('.jpeg') || alt.endsWith('.webp')) continue;

              const width = img.naturalWidth || img.width;
              const height = img.naturalHeight || img.height;
              // Henüz render edilmemiş veya çok küçük profil/ikon ise geç (minimum 80px)
              if (width < 80 || height < 80) continue;

              // Eğer ChatGPT hala yanıt üretiyorsa çizim henüz tamamlanmamış olabilir
              if (isGenerating) {
                return { ready: false, isGenerating: true, foundSrc: null };
              }

              // Görsel hazır, tamamen yüklendi ve üretim bitti!
              return { ready: true, isGenerating: false, foundSrc: src };
            }

            return { ready: false, isGenerating, foundSrc: null };
          })()
        `,
        returnByValue: true
      });

      const checkResult = checkEval.result?.value;
      if (checkResult?.isGenerating && !workerTiming.timings.generation_start_detect_ms) workerTiming.mark('generation_start_detect_ms', submittedAt);
      if (checkResult?.ready && checkResult?.foundSrc) {
        foundImgSrc = checkResult.foundSrc;
        workerTiming.mark('generation_complete_detect_ms', submittedAt);
        console.log(`[CDP Worker] Görsel ${elapsed}. saniyede başarıyla tamamlandı ve tespit edildi!`);
        break;
      }
    }

    if (!foundImgSrc) {
      throw new Error('Görsel üretim zaman aşımı (180 saniye)');
    }

    // 4. Görsel Blob'unu Sayfa Context'inden Çek
    console.log('[CDP Worker] Görsel çekiliyor ve indiriliyor...');
    const acquireStartedAt = Date.now();
    const extractEval = await cdp.send('Runtime.evaluate', {
      expression: `
        (async () => {
          const resp = await fetch(${JSON.stringify(foundImgSrc)});
          const blob = await resp.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve({ base64: reader.result, size: blob.size });
            reader.readAsDataURL(blob);
          });
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });

    const b64Data = extractEval.result?.value?.base64;
    workerTiming.mark('image_acquire_ms', acquireStartedAt);
    if (!b64Data) {
      throw new Error('Görsel verisi base64 olarak okunamadı');
    }

    const base64Content = b64Data.split(',')[1];
    const decodeStartedAt = Date.now();
    const imageBuffer = Buffer.from(base64Content, 'base64');
    workerTiming.mark('decode_process_ms', decodeStartedAt);
    console.log(`[CDP Worker] Görsel hazır: ${(imageBuffer.length / 1024).toFixed(1)} KB`);

    // 5. Gateway'e Yükle
    const filename = `img_${job.id}_${Date.now()}.png`;
    const finalTimings = workerTiming.finalize();
    const uploadRes = await fetch(`${GATEWAY_URL}/upload?jobId=${job.id}&filename=${filename}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'image/png',
        'x-worker-timings': JSON.stringify(finalTimings),
      },
      body: imageBuffer
    });

    if (!uploadRes.ok) {
      throw new Error(`Gateway upload HTTP ${uploadRes.status}`);
    }

    const uploadData = await uploadRes.json();
    console.log(`[CDP Worker] BAŞARIYLA TAMAMLANDI: ${uploadData.url}`);

    // 6. Firma / Sistem Sohbet URL'sini Güncelle/Kaydet
    try {
      const finalUrlEval = await cdp.send('Runtime.evaluate', {
        expression: 'window.location.href',
        returnByValue: true
      });
      const finalUrl = finalUrlEval.result?.value || '';
      if (finalUrl.includes('/c/')) {
        const expectedTitle = getExpectedChatTitle(customer, channel);
        if (chatInfo.isNewChat) {
          await renameChatToTitle(cdp, expectedTitle);
        }
        setCompanyChat(chatIdentity, channel, finalUrl, expectedTitle);
      }
    } catch (urlErr) {
      console.warn(`[CDP Worker: ${WORKER_ID}] URL kaydetme uyarısı:`, urlErr.message);
    }

  } catch (err) {
    console.error(`[CDP Worker] İş hatası (${job.id}):`, err.message);

    let crashSnapshotUrl = null;
    if (cdp) {
      try {
        const snap = await cdp.send('Page.captureScreenshot', { format: 'png' });
        if (snap?.data) {
          const crashFile = `crash_${job.id}_${Date.now()}.png`;
          const crashPath = path.join('/app/gateway/outputs', crashFile);
          fs.writeFileSync(crashPath, Buffer.from(snap.data, 'base64'));
          crashSnapshotUrl = `${GATEWAY_URL}/outputs/${crashFile}`;
          console.log(`[CDP Worker] 📸 HATA ANINDA EKRAN GÖRÜNTÜSÜ ALINDI: ${crashSnapshotUrl}`);
        }
      } catch (snapErr) {
        console.warn(`[CDP Worker] Crash snapshot alınamadı:`, snapErr.message);
      }
    }

    // Kilidi serbest bırak
    await fetch(`${GATEWAY_URL}/job/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id, error: err.message, crashSnapshotUrl })
    }).catch(() => {});
  } finally {
    for (const p of tempRefPaths) {
      try { fs.unlinkSync(p); } catch (e) {}
    }
    if (cdp) cdp.close();
    await workerTiming.flush();
  }
}

// WhatsApp Yapay Zeka Mesaj Önerileri İşini Çalıştır (Kalıcı Mesajlaşma Sohbeti)
async function executeChatSuggestionsJob(tab, job) {
  let cdp = null;
  const workerTiming = createWorkerTiming(job, 'text');
  const sessionKey = process.env.SESSION_KEY || `chatgpt_${String(CDP_HTTP).replace(/[^0-9]/g, '') || '9222'}`;
  await acquireSessionFlightLease(sessionKey, job.id);
  try {
    cdp = await createCdpSession(tab.webSocketDebuggerUrl);
    workerTiming.mark('tab_acquire_ms');

    const customer = (job.customer || 'Genel').trim();
    console.log(`[CDP Worker: ${WORKER_ID}] [Mesajlar] Firma: "${customer}" için oturum hazırlanıyor...`);
    const chatIdentity = { customer, tenantId: job.tenantId, conversationId: job.conversationId };
    const chatInfo = await ensureCustomerChat(cdp, customer, 'chat', chatIdentity);
    if (!chatInfo.isNewChat) {
      const waitStart = Date.now();
      while (Date.now() - waitStart < 1500) {
        const check = await cdp.send('Runtime.evaluate', {
          expression: `document.querySelectorAll('[data-message-author-role], [data-conversation-role], [data-chatgpt-search-unit-key]').length > 0`,
          returnByValue: true
        }).catch(() => ({ result: { value: false } }));
        if (check.result?.value) break;
        await sleep(100);
      }
    }
    workerTiming.mark('tab_ready_ms');

    // 1. Stale Result Protection: Submit öncesi asistan mesajlarının kesin baseline'ını al
    const baselineEval = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const assts = ${JS_GET_ASSISTANT_MSGS};
        const ids = assts.map(a => a.getAttribute('data-message-id') || a.getAttribute('data-chatgpt-search-message-ids') || a.id || '').filter(Boolean);
        const lastText = assts.length > 0 ? (assts[assts.length - 1].innerText || '').trim() : '';
        return { count: assts.length, ids, lastText };
      })()`,
      returnByValue: true
    });
    const baseline = baselineEval.result?.value || { count: 0, ids: [], lastText: '' };

    // 2. Prompt hazırla
    const prompt = `Sen "${customer}" firmasının WhatsApp kurumsal müşteri temsilcisisin.
${job.companyContext ? `Firma / Sektör Bilgisi:\n${job.companyContext}` : 'Firma Bilgisi: Müşteri odaklı kurumsal hizmet'}
${job.tone ? `İstenen İletişim Tonu: ${job.tone}` : ''}

${job.conversationHistory ? `Önceki Konuşma Geçmişi:\n${job.conversationHistory}` : 'Konuşma yeni başladı.'}

MÜŞTERİDEN GELEN EN SON MESAJ:
"${job.incomingMessage}"

GÖREV:
Bu mesaja verilebilecek en kaliteli ve uygun 3 FARKLI alternatif Türkçe yanıt hazırla:
1. "Kısa & Net" (Hızlı, öz, gereksiz uzatmayan net bilgi)
2. "Samimi" (Nazik, çözüm odaklı kurumsal yanıt)
3. "Yönlendirici" (Gerekiyorsa sonraki adımı, arama saatini veya detayları soran aksiyon yanıtı)

ÖNEMLİ KURALLAR:
1. Asla Canvas, doküman veya kod aracı açma.
2. Düşünme süresini minimumda tut, doğrudan yanıt ver.
3. Kesinlikle hiçbir emoji kullanma. Metinler tamamen emojiden arındırılmış temiz Türkçe olmalı.
4. YALNIZCA doğrudan sohbet mesajı olarak aşağıdaki geçerli JSON metnini yaz:
{
  "suggestions": [
    {"label": "Kısa & Net", "text": "..."},
    {"label": "Samimi", "text": "..."},
    {"label": "Yönlendirici", "text": "..."}
  ]
}`;

    // 3. Prompt'u ChatGPT'ye enjekte et ve gönder
    const injectRes = await injectPromptAndSend(cdp, prompt);
    if (!injectRes?.success) {
      throw new Error(injectRes?.error || 'ChatGPT input kutusu bulunamadı veya gönderilemedi');
    }
    workerTiming.timings.prompt_insert_ms = injectRes.prompt_insert_ms;
    workerTiming.timings.submit_ms = injectRes.submit_ms;
    const submittedAt = Date.now();

    console.log(`[CDP Worker: ${WORKER_ID}] [Mesajlar] Prompt gönderildi, adaptif yanıt kontrolü devrede...`);

    // 4. Yeni metin yanıtının tamamlanmasını bekle (Stale korumalı adaptif bounded polling)
    let lastText = '';
    let stableCount = 0;
    let foundNewMessage = false;
    const maxWaitTimeMs = 60000;
    const pollStart = Date.now();

    while (Date.now() - pollStart < maxWaitTimeMs) {
      await sleep(250);
      if (await checkRateLimitModal(cdp)) {
        throw new Error('WEB_SESSION_RATE_LIMITED: ChatGPT web "Too many requests" rate-limit modal detected');
      }
      const textEval = await cdp.send('Runtime.evaluate', {
        expression: `
          (() => {
            const assts = ${JS_GET_ASSISTANT_MSGS};
            if (assts.length <= ${baseline.count}) {
              const stopBtn = document.querySelector('button[data-testid*="stop"], button[aria-label*="Stop"], button[aria-label*="durdur"], button[aria-label*="Durdur"]');
              const isGenerating = !!stopBtn || !!document.querySelector('.result-thinking, [data-testid*="generating"], .streaming-animated-ellipsis');
              return { hasNewMsg: false, isGenerating, text: '' };
            }

            const lastAsst = assts[assts.length - 1];
            const text = (lastAsst.innerText || '').trim();
            const stopBtn = document.querySelector('button[data-testid*="stop"], button[aria-label*="Stop"], button[aria-label*="durdur"], button[aria-label*="Durdur"]');
            const isMsgStreaming = lastAsst ? !!lastAsst.querySelector('.streaming-animation, [data-is-streaming="true"]') : false;
            const isGenerating = !!stopBtn || isMsgStreaming;

            return { hasNewMsg: true, isGenerating, text };
          })()
        `,
        returnByValue: true
      });

      const res = textEval.result?.value;
      if (!res?.hasNewMsg) {
        continue;
      }
      foundNewMessage = true;
      if (!workerTiming.timings.first_response_signal_ms) workerTiming.mark('first_response_signal_ms', submittedAt);

      const currentText = (res && res.text) ? res.text : '';
      if (currentText && currentText === lastText) {
        stableCount++;
      } else {
        stableCount = 0;
      }
      lastText = currentText;

      let hasValidJson = false;
      try {
        let clean = lastText.trim();
        if (clean.includes('```json')) clean = clean.split('```json')[1].split('```')[0].trim();
        else if (clean.includes('```')) clean = clean.split('```')[1].split('```')[0].trim();
        const jsonStart = clean.indexOf('{');
        const jsonEnd = clean.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const parsed = JSON.parse(clean.slice(jsonStart, jsonEnd + 1));
          if (Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
            hasValidJson = true;
          }
        }
      } catch (err) {}

      if (hasValidJson) {
        workerTiming.mark('response_complete_ms', submittedAt);
        console.log(`[CDP Worker: ${WORKER_ID}] [Mesajlar] Geçerli JSON başarıyla algılandı, döngü sonlandırılıyor.`);
        break;
      }
      if (!res.isGenerating && stableCount >= 2 && lastText.length > 30) {
        workerTiming.mark('response_complete_ms', submittedAt);
        break;
      }
    }

    if (!foundNewMessage) {
      throw new Error('STALE_RESPONSE_DETECTED: Yeni model yanıtı üretilmedi (Fail-closed)');
    }

    if (!lastText || lastText.length < 15) {
      console.warn(`[CDP Worker: ${WORKER_ID}] [Mesajlar] ChatGPT web yanıtı kısa veya gecikmeli, akıllı şablon önerileri devreye giriyor.`);
    }

    // 5. JSON ayrıştırma ve emoji temizliği
    const parseStartedAt = Date.now();
    let parsedSuggestions = [];
    try {
      let clean = lastText.trim();
      if (clean.includes('```json')) {
        clean = clean.split('```json')[1].split('```')[0].trim();
      } else if (clean.includes('```')) {
        clean = clean.split('```')[1].split('```')[0].trim();
      }
      const jsonStart = clean.indexOf('{');
      const jsonEnd = clean.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        clean = clean.slice(jsonStart, jsonEnd + 1);
      }
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
        parsedSuggestions = parsed.suggestions
          .filter((s) => s && typeof s.text === 'string' && s.text.trim().length > 3)
          .map((s) => ({
            label: stripEmojis(s.label || 'Öneri').slice(0, 30),
            text: stripEmojis(s.text),
          }));
      }
    } catch (parseErr) {
      console.warn(`[CDP Worker: ${WORKER_ID}] JSON ayrıştırma uyarısı:`, parseErr.message);
      console.warn(`[CDP Worker: ${WORKER_ID}] Ayrıştırılamayan yanıt (karakter):`, lastText.length);
    }

    // Yedek ayrıştırıcı
    if (parsedSuggestions.length === 0) {
      const lines = lastText.split('\n').map((l) => l.trim()).filter(Boolean);
      const extracted = [];
      for (const line of lines) {
        const match = line.match(/^(\d+[\.\)]|\-|\*)\s*(\"?[^:\"]+\"?)\s*:\s*(.+)$/i);
        if (match && match[3]) {
          const label = match[2].replace(/[\"\'\:\*]/g, '').trim();
          const text = match[3].replace(/^[\"\']|[\"\']$/g, '').trim();
          if (text.length > 10 && !text.includes('suggestions')) {
            extracted.push({ label: stripEmojis(label.slice(0, 20) || 'Öneri'), text: stripEmojis(text) });
          }
        }
      }
      if (extracted.length > 0) {
        parsedSuggestions = extracted.slice(0, 3);
      }
    }
    workerTiming.mark('parse_ms', parseStartedAt);

    if (parsedSuggestions.length === 0 && lastText.length > 30) {
      const cleanFallback = stripEmojis(lastText.replace(/[\{\}\[\]\"\'\`]/g, ' ').replace(/\s+/g, ' ').trim());
      if (cleanFallback.length > 25 && !cleanFallback.startsWith('suggestions')) {
        parsedSuggestions = [
          { label: 'Kısa & Net', text: cleanFallback.slice(0, 250) }
        ];
      }
    }

    if (parsedSuggestions.length === 0) {
      const norm = (job.incomingMessage || '').toLowerCase();
      if (norm.includes('fiyat') || norm.includes('ne kadar') || norm.includes('ücret') || norm.includes('ucret') || norm.includes('kaç') || norm.includes('kac')) {
        parsedSuggestions = [
          { label: 'Kısa & Net', text: 'Merhabalar, ilgilendiğiniz ürün veya hizmet detayını iletirseniz hemen güncel fiyat bilgisi paylaşalım.' },
          { label: 'Samimi', text: 'Merhabalar, memnuniyetle yardımcı oluruz. Tam olarak hangi model veya ürünümüzün fiyatını öğrenmek istemiştiniz?' },
          { label: 'Yönlendirici', text: 'Merhaba, güncel fiyat listemizi iletebilmemiz için ürün adı veya görselini iletebilir misiniz?' }
        ];
      } else if (norm.includes('konum') || norm.includes('adres') || norm.includes('nerede') || norm.includes('yeriniz')) {
        parsedSuggestions = [
          { label: 'Kısa & Net', text: 'İşletmemiz Mamak, Ankara adresindedir. WhatsApp üzerinden konum pini iletiyoruz.' },
          { label: 'Samimi', text: 'Merhabalar, yerimiz Mamak / Ankara\'da bulunuyor. Canlı harita konumumuzu paylaşıyoruz.' },
          { label: 'Yönlendirici', text: 'Merhaba, Mamak Ankara adresindeyiz. Ziyaretinizden memnuniyet duyarız; harita konumu gönderelim mi?' }
        ];
      } else {
        parsedSuggestions = [
          { label: 'Kısa & Net', text: `Merhabalar, ${customer} işletmemize hoş geldiniz. Size nasıl yardımcı olabiliriz?` },
          { label: 'Samimi', text: 'Merhabalar, hoş geldiniz! Size yardımcı olmaktan memnuniyet duyarız, nasıl bir konuda bilgi almak istersiniz?' },
          { label: 'Yönlendirici', text: 'İyi günler dileriz. Ürünlerimiz, siparişleriniz veya hizmetlerimiz hakkında bilgi almak için sorunuzu iletebilirsiniz.' }
        ];
      }
    }

    console.log(`[CDP Worker: ${WORKER_ID}] [Mesajlar] ${parsedSuggestions.length} öneri başarıyla üretildi.`);

    // 6. Gateway'e bildir
    const finalTimings = workerTiming.finalize();
    await fetch(`${GATEWAY_URL}/job/complete-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: job.id,
        result: { suggestions: parsedSuggestions, raw: lastText },
        timings: finalTimings,
      })
    });

    // 7. Sohbet kaydetme ve adlandırma
    try {
      const finalUrlEval = await cdp.send('Runtime.evaluate', {
        expression: 'window.location.href',
        returnByValue: true
      });
      const finalUrl = finalUrlEval.result?.value || '';
      if (finalUrl.includes('/c/')) {
        const expectedTitle = getExpectedChatTitle(customer, 'chat');
        if (chatInfo.isNewChat) {
          await renameChatToTitle(cdp, expectedTitle);
        }
        setCompanyChat(chatIdentity, 'chat', finalUrl, expectedTitle);
      }
    } catch (urlErr) {
      console.warn(`[CDP Worker: ${WORKER_ID}] Adlandırma uyarısı:`, urlErr.message);
    }

  } catch (err) {
    console.error(`[CDP Worker] [Mesajlar] İş hatası (${job.id}):`, err.message);
    await fetch(`${GATEWAY_URL}/job/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id, error: err.message })
    }).catch(() => {});
  } finally {
    releaseSessionFlightLease(sessionKey, job.id);
    if (cdp) cdp.close();
    await workerTiming.flush();
  }
}

// OCR ve Kampanya Ürün/Fiyat Bilgi Çıkarımı İşini Çalıştır
async function executeExtractKnowledgeJob(tab, job) {
  let cdp = null;
  const tempRefPaths = [];
  try {
    cdp = await createCdpSession(tab.webSocketDebuggerUrl);

    const customer = (job.customer || 'Genel').trim();
    const hasImages = Array.isArray(job.referenceImages) && job.referenceImages.length > 0;
    const channel = hasImages ? 'media' : 'chat';
    console.log(`[CDP Worker: ${WORKER_ID}] [OCR/Bilgi Çıkarımı] Firma: "${customer}" (${channel} kanalı)...`);

    await ensureCustomerChat(cdp, customer, channel, { customer, tenantId: job.tenantId, conversationId: job.conversationId });

    // 1. Görsel varsa ChatGPT'ye yükle (Vision OCR)
    if (hasImages) {
      for (let idx = 0; idx < job.referenceImages.length; idx++) {
        const ref = job.referenceImages[idx];
        let buffer = null;
        if (typeof ref === 'string' && ref.startsWith('http')) {
          try {
            const resp = await fetch(ref);
            if (resp.ok) buffer = Buffer.from(await resp.arrayBuffer());
          } catch (e) {
            console.warn(`[CDP Worker] Görsel indirilemedi: ${ref}`);
          }
        } else if (typeof ref === 'string') {
          const raw = ref.includes(',') ? ref.split(',')[1] : ref;
          buffer = Buffer.from(raw, 'base64');
        } else if (ref && (ref.data || ref.b64_json)) {
          const raw = (ref.data || ref.b64_json).replace(/^data:image\/\w+;base64,/, '');
          buffer = Buffer.from(raw, 'base64');
        }

        if (buffer) {
          const tmpPath = path.join('/tmp', `ocr_${job.id}_${idx}.png`);
          fs.writeFileSync(tmpPath, buffer);
          tempRefPaths.push(tmpPath);
        }
      }

      if (tempRefPaths.length > 0) {
        try {
          const doc = await cdp.send('DOM.getDocument', {});
          const fileInput = await cdp.send('DOM.querySelector', {
            nodeId: doc.root.nodeId,
            selector: 'input[type="file"]'
          });
          if (fileInput && fileInput.nodeId) {
            console.log(`[CDP Worker] ${tempRefPaths.length} görsel dosya seçiciye aktarılıyor (OCR)...`);
            await cdp.send('DOM.setFileInputFiles', {
              files: tempRefPaths,
              nodeId: fileInput.nodeId
            });
            await sleep(2500);
          }
        } catch (uploadErr) {
          console.warn('[CDP Worker] Görsel dosya seçiciye yüklenemedi:', uploadErr.message);
        }
      }
    }

    // 2. OCR ve Ürün/Fiyat Çıkarım Prompt'u
    const prompt = `Sen kurumsal e-ticaret, perakende ve WhatsApp veri analizi uzmanısın.
${job.companyContext ? `İşletme / Sektör: ${job.companyContext}` : ''}
${job.incomingMessage ? `Kampanya / Mesaj Metni:\n"${job.incomingMessage}"` : ''}

GÖREV:
Görseli ve varsa metni derinlemesine analiz et (OCR yap):
1. Görselde veya metinde geçen TÜM ürünleri tespit et (adı, fiyatı, para birimi [TRY, USD, EUR], birim/paket miktarı [koli, adet, kg, paket vb.] ve ürün detayları).
2. Kampanya koşulları varsa (indirim oranı, minimum sipariş adedi, kampanya son tarihi, kargo detayı vb.) çıkar.
3. Görselde okunabilen tüm metinleri eksiksiz OCR transcript olarak çıkar.

ÖNEMLİ KURAL:
YALNIZCA aşağıdaki JSON formatında yanıt ver, markdown kod bloğu (\`\`\`json) veya başka hiçbir açıklama ekleme:
{
  "products": [
    { "name": "...", "price": 100, "currency": "TRY", "unit": "adet", "details": "..." }
  ],
  "campaign": {
    "title": "...",
    "discount": "...",
    "conditions": "..."
  },
  "ocrText": "..."
}`;

    // 3. Prompt'u enjekte et ve gönder
    const injectRes = await injectPromptAndSend(cdp, prompt);
    if (!injectRes?.success) {
      throw new Error(injectRes?.error || 'Prompt enjekte edilemedi');
    }

    console.log(`[CDP Worker: ${WORKER_ID}] [OCR/Bilgi Çıkarımı] Prompt gönderildi, yanıt bekleniyor...`);
    await sleep(2500);

    // 4. Yanıtı bekle
    let lastText = '';
    const maxWait = 35;
    for (let i = 0; i < maxWait; i++) {
      await sleep(1500);

      const textEval = await cdp.send('Runtime.evaluate', {
        expression: `
          (() => {
            const stopBtn = document.querySelector('button[data-testid="stop-button"], button[aria-label*="Stop"], button[aria-label*="durdur"]');
            const isThinking = !!document.querySelector('.result-thinking, [data-testid*="generating"], .streaming-animated-ellipsis');
            const isGenerating = !!stopBtn || isThinking;

            const articles = ${JS_GET_ASSISTANT_MSGS};
            const lastMsg = articles.pop();
            const text = lastMsg ? (lastMsg.innerText || '').trim() : '';
            return { isGenerating, text };
          })()
        `,
        returnByValue: true
      });

      const res = textEval.result?.value;
      if (res && res.text) {
        lastText = res.text;
      }
      if (res && !res.isGenerating && lastText.length > 20) {
        break;
      }
    }

    if (!lastText) {
      throw new Error('ChatGPT OCR/çıkarım yanıtı üretemedi veya boş döndü');
    }

    // 5. JSON ayrıştırma
    let parsedResult = { products: [], campaign: null, ocrText: '' };
    try {
      let clean = lastText.trim();
      if (clean.includes('```json')) {
        clean = clean.split('```json')[1].split('```')[0].trim();
      } else if (clean.includes('```')) {
        clean = clean.split('```')[1].split('```')[0].trim();
      }
      const jsonStart = clean.indexOf('{');
      const jsonEnd = clean.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        clean = clean.slice(jsonStart, jsonEnd + 1);
      }
      const parsed = JSON.parse(clean);
      parsedResult = {
        products: Array.isArray(parsed.products) ? parsed.products : [],
        campaign: parsed.campaign || null,
        ocrText: parsed.ocrText || '',
      };
    } catch (parseErr) {
      console.warn(`[CDP Worker: ${WORKER_ID}] OCR JSON ayrıştırma uyarısı:`, parseErr.message);
      parsedResult = {
        products: [],
        campaign: null,
        ocrText: lastText.slice(0, 1000)
      };
    }

    console.log(`[CDP Worker: ${WORKER_ID}] [OCR/Bilgi Çıkarımı] ${parsedResult.products.length} ürün ve OCR tamamlandı.`);

    // 6. Gateway'e bildir
    await fetch(`${GATEWAY_URL}/job/complete-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: job.id,
        result: { ...parsedResult, raw: lastText }
      })
    });

  } catch (err) {
    console.error(`[CDP Worker] [OCR/Bilgi Çıkarımı] İş hatası (${job.id}):`, err.message);
    await fetch(`${GATEWAY_URL}/job/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id, error: err.message })
    }).catch(() => {});
  } finally {
    for (const p of tempRefPaths) {
      try { fs.unlinkSync(p); } catch (e) {}
    }
    if (cdp) cdp.close();
  }
}

// Ürün ve Ortam Fiziksel Akıl Yürütme İşini Çalıştır (ChatGPT Web)
async function executeProductAffordanceJob(tab, job) {
  let cdp = null;
  try {
    cdp = await createCdpSession(tab.webSocketDebuggerUrl);
    const customer = (job.customer || 'Genel').trim();
    console.log(`[CDP Worker: ${WORKER_ID}] [Affordance] Firma: "${customer}" için oturum hazırlanıyor...`);
    await ensureCustomerChat(cdp, customer, 'video');
    await sleep(1000);

    const countEval = await cdp.send('Runtime.evaluate', {
      expression: `${JS_GET_ASSISTANT_MSGS}.length`,
      returnByValue: true
    });
    const initialAsstCount = countEval.result?.value || 0;

    // Metni enjekte et
    await sendPromptToChatGpt(cdp, job.affordancePrompt || job.prompt);

    // Yanıtı bekle
    let lastText = '';
    for (let i = 0; i < 25; i++) {
      await sleep(1000);
      const textEval = await cdp.send('Runtime.evaluate', {
        expression: `
          (() => {
            const assts = ${JS_GET_ASSISTANT_MSGS};
            if (assts.length <= ${initialAsstCount}) return { hasNewMsg: false, isGenerating: true, text: '' };
            const last = assts[assts.length - 1];
            const text = (last.innerText || '').trim();
            const stopBtn = document.querySelector('button[data-testid*="stop"], button[aria-label*="Stop"]');
            return { hasNewMsg: true, isGenerating: !!stopBtn, text };
          })()
        `,
        returnByValue: true
      });
      const res = textEval.result?.value;
      if (res?.text) lastText = res.text;
      if (res?.hasNewMsg && !res.isGenerating && lastText.includes('{') && lastText.includes('}')) {
        break;
      }
    }

    let parsed = null;
    try {
      let clean = lastText.trim();
      if (clean.includes('```json')) clean = clean.split('```json')[1].split('```')[0].trim();
      else if (clean.includes('```')) clean = clean.split('```')[1].split('```')[0].trim();
      const s = clean.indexOf('{');
      const e = clean.lastIndexOf('}');
      if (s !== -1 && e !== -1) {
        parsed = JSON.parse(clean.slice(s, e + 1));
      }
    } catch (_) {}

    const finalResult = (parsed && parsed.naturalEnvironment) ? parsed : (job.fallbackResult || {});
    await fetch(`${GATEWAY_URL}/job/complete-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id, result: finalResult })
    });
    console.log(`[CDP Worker: ${WORKER_ID}] [Affordance] İş başarıyla tamamlandı: #${job.id}`);
  } catch (err) {
    console.error(`[CDP Worker: ${WORKER_ID}] [Affordance] Hata:`, err.message);
    await fetch(`${GATEWAY_URL}/job/complete-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id, result: job.fallbackResult || {} })
    }).catch(() => {});
  } finally {
    if (cdp) cdp.close();
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Sürekli çalıştır
setInterval(workerLoop, POLL_INTERVAL_MS);
workerLoop();
