/**
 * OmniStudio Direct CDP Autonomous Worker
 * Bypasses Chrome 142+ extension restrictions by directly orchestrating
 * Chrome DevTools Protocol (CDP) on port 9222.
 */

const fs = require('fs');
const path = require('path');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://127.0.0.1:3456';
const CDP_HTTP = process.env.CDP_HTTP || 'http://127.0.0.1:9222';
const WORKER_ID = process.env.WORKER_ID || 'chatgpt-1';
const POLL_INTERVAL_MS = 2500;

console.log(`[CDP Worker: ${WORKER_ID}] OmniStudio Otonom Tarayıcı Motoru Başlatılıyor...`);
console.log(`[CDP Worker: ${WORKER_ID}] Gateway: ${GATEWAY_URL} | CDP: ${CDP_HTTP}`);

let isBusy = false;

// DevTools CDP WebSocket Command Helper
function createCdpSession(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let msgId = 1;
    const callbacks = new Map();

    ws.onopen = () => {
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

    ws.onerror = (err) => reject(err);

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

// Sekmeyi bul veya oluştur
async function getTab(matchPattern) {
  try {
    const res = await fetch(`${CDP_HTTP}/json/list`);
    const tabs = await res.json();
    return tabs.find(t => t.url && t.url.includes(matchPattern));
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
  try {
    const cdp = await createCdpSession(tab.webSocketDebuggerUrl);
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
    cdp.close();
    return !!evalRes.result?.value;
  } catch (e) {
    return false;
  }
}

// Firma Başına Ayrılmış Çift Kanallı (Medya vs Mesajlar) Sohbet Yönetimi
function getCompanyChats() {
  const file = path.join('/data', `company_chats_${WORKER_ID}.json`);
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (e) {}
  return {};
}

function setCompanyChat(customer, channel, chatUrl) {
  if (!customer || !chatUrl) return;
  const file = path.join('/data', `company_chats_${WORKER_ID}.json`);
  try {
    const data = getCompanyChats();
    if (!data[customer] || typeof data[customer] !== 'object') {
      data[customer] = {};
    }
    // Geriye dönük uyumluluk: Eski formatta düz chatUrl varsa media altına taşı
    if (data[customer].chatUrl && !data[customer].media) {
      data[customer].media = { chatUrl: data[customer].chatUrl, updatedAt: data[customer].updatedAt || Date.now() };
    }
    data[customer][channel] = {
      chatUrl,
      updatedAt: Date.now()
    };
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    console.log(`[CDP Worker: ${WORKER_ID}] Firma "${customer}" [${channel}] sohbet URL'si kaydedildi: ${chatUrl}`);
  } catch (e) {
    console.error(`[CDP Worker: ${WORKER_ID}] Firma sohbeti kaydedilemedi:`, e.message);
  }
}

async function waitForChatInput(cdp, maxWaitMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await sleep(600);
    const check = await cdp.send('Runtime.evaluate', {
      expression: `!!(
        document.querySelector('#prompt-textarea') || 
        document.querySelector('div[contenteditable="true"]') ||
        document.querySelector('textarea')
      )`,
      returnByValue: true
    });
    if (check.result?.value) {
      await sleep(600);
      return true;
    }
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
  try {
    // 1. Textarea'yı temizle ve odaklan
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const textarea = document.querySelector('#prompt-textarea') || 
                         document.querySelector('div[contenteditable="true"]') ||
                         document.querySelector('textarea');
        if (textarea) {
          textarea.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('delete', false, null);
        }
      })()`
    });

    // 2. Chrome DevTools Protocol yerel Input.insertText ile metni gerçek klavye gibi enjekte et
    await cdp.send('Input.insertText', { text: promptText });
    await sleep(400);

    // 3. Gönder butonunun render edilmesini bekle ve tıkla
    const clickRes = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        let sendBtn = document.querySelector('#composer-submit-button') ||
                      document.querySelector('button[data-testid="send-button"]') ||
                      document.querySelector('button[aria-label*="Send"]') ||
                      document.querySelector('button[aria-label*="Gönder"]');
        if (sendBtn) {
          sendBtn.click();
          return { success: true };
        }
        return { success: false, error: 'Gönder butonu bulunamadı' };
      })()`,
      returnByValue: true
    });

    return clickRes.result?.value || { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function resetToFreshChat(cdp) {
  const navigated = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('a[href="/"]') || document.querySelector('button[data-testid="new-chat-button"]');
      if (btn) {
        btn.click();
        return true;
      }
      window.location.href = 'https://chatgpt.com/';
      return false;
    })()`,
    returnByValue: true
  }).then(r => r.result?.value).catch(() => false);

  if (!navigated) {
    await sleep(3000);
  } else {
    await sleep(2000);
  }
  await waitForChatInput(cdp);
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

async function ensureCustomerChat(cdp, customer, channel = 'media') {
  const chats = getCompanyChats();
  const companyData = chats[customer];
  let targetUrl = null;
  if (companyData) {
    if (companyData[channel]?.chatUrl) {
      targetUrl = companyData[channel].chatUrl;
    } else if (channel === 'media' && companyData.chatUrl) {
      targetUrl = companyData.chatUrl;
    }
  }

  const urlEval = await cdp.send('Runtime.evaluate', {
    expression: 'window.location.href',
    returnByValue: true
  });
  const currentUrl = urlEval.result?.value || '';

  if (targetUrl) {
    const targetChatPath = targetUrl.replace('https://chatgpt.com', '');
    const isMatching = currentUrl.includes(targetChatPath);
    if (!isMatching) {
      console.log(`[CDP Worker: ${WORKER_ID}] "${customer}" [${channel}] sohbetine geçiliyor: ${targetUrl}`);
      await cdp.send('Page.navigate', { url: targetUrl });
      await waitForChatInput(cdp);
    }

    // Mesaj önerilerinde sohbetin aşırı şişip donmasını önlemek için kontrol et
    const checkBloated = await cdp.send('Runtime.evaluate', {
      expression: `!!(
        document.querySelectorAll('[data-message-author-role]').length >= 8 ||
        Array.from(document.querySelectorAll('button')).some(b => (b.innerText || '').includes('Show more'))
      )`,
      returnByValue: true
    }).then(r => r.result?.value).catch(() => false);

    if (checkBloated) {
      console.log(`[CDP Worker: ${WORKER_ID}] "${customer}" [${channel}] sohbeti çok uzamış (8+ mesaj/Show more), performans için temiz sohbet açılıyor...`);
      targetUrl = null;
    } else {
      const afterNavEval = await cdp.send('Runtime.evaluate', {
        expression: 'window.location.href',
        returnByValue: true
      });
      const afterUrl = afterNavEval.result?.value || '';
      if (afterUrl.includes('/c/')) {
        console.log(`[CDP Worker: ${WORKER_ID}] "${customer}" [${channel}] aktif sohbetteyiz: ${targetUrl}`);
        return;
      }
    }
  }

  // Yeni temiz sohbet aç
  console.log(`[CDP Worker: ${WORKER_ID}] "${customer}" [${channel}] için yeni temiz sohbet açılıyor...`);
  await cdp.send('Page.navigate', { url: 'https://chatgpt.com/' });
  await waitForChatInput(cdp);
  console.log(`[CDP Worker: ${WORKER_ID}] "${customer}" [${channel}] için temiz sohbet sayfası hazır.`);
}

// Düzenli Kalp Atışı (5s)
setInterval(async () => {
  try {
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

    const status = isBusy ? 'busy' : (isTabLoggedIn ? 'idle' : 'waiting_login');
    const details = isBusy
      ? 'Görsel üretiyor'
      : (isTabLoggedIn ? 'Oturum açık, görev bekliyor' : 'Giriş bekleniyor (Login ekranı)');

    fetch(`${GATEWAY_URL}/worker/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workerId: WORKER_ID, status, details })
    }).catch(() => {});
  } catch (err) {}
}, 5000);

// Ana Döngü
async function workerLoop() {
  if (isBusy) return;

  try {
    // 1. ChatGPT sekmesi var mı kontrol et
    const chatgptTab = await getTab('chatgpt.com');
    if (!chatgptTab) {
      return;
    }

    // 1.1. Oturum açık mı kontrol et (Giriş yapılmadıysa iş çekme)
    if (!isTabLoggedIn) {
      return;
    }

    // 2. Gateway'den sıradaki işi çek
    const jobRes = await fetch(`${GATEWAY_URL}/job/next?platform=chatgpt&workerId=${encodeURIComponent(WORKER_ID)}`, { cache: 'no-store' });
    if (!jobRes.ok) return;

    const { job } = await jobRes.json();
    if (!job) return; // Boşta iş yok

    isBusy = true;
    console.log(`\n======================================================`);
    console.log(`[CDP Worker] YENİ İŞ ALINDI: #${job.id}`);
    console.log(`[CDP Worker] Prompt: "${job.prompt.slice(0, 80)}..."`);
    console.log(`======================================================`);

    if (job.type === 'chat_suggestions') {
      await executeChatSuggestionsJob(chatgptTab, job);
    } else if (job.type === 'extract_knowledge') {
      await executeExtractKnowledgeJob(chatgptTab, job);
    } else {
      await executeChatGPTJob(chatgptTab, job);
    }

    completedJobCount++;
    if (completedJobCount % RECYCLE_JOB_THRESHOLD === 0) {
      await performMemoryRecycle(chatgptTab);
    }

  } catch (err) {
    console.error('[CDP Worker] Döngü hatası:', err.message);
  } finally {
    isBusy = false;
  }
}

// ChatGPT İşini Çalıştır
async function executeChatGPTJob(tab, job) {
  let cdp = null;
  const tempRefPaths = [];
  try {
    cdp = await createCdpSession(tab.webSocketDebuggerUrl);

    // 0. Temiz ve yüksek hızlı görsel oturumu sağla (önceki sohbetlerdeki takılma ve donmaları önler)
    const customer = (job.customer || 'Genel').trim();
    console.log(`[CDP Worker: ${WORKER_ID}] Firma: "${customer}" için [Medya] oturumu hazırlanıyor...`);
    await resetToFreshChat(cdp);

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
            await sleep(3500); // Görselin yüklenip input alanına eklenmesini bekle
          }
        } catch (uploadErr) {
          console.warn('[CDP Worker] Referans görsel yükleme uyarısı:', uploadErr.message);
        }
      }
    }

    // 2. Mevcut görsel URL'lerini kaydet (Az önce yüklenen referans thumbnail'lar DAHİL)
    // Böylece referans görseller asla üretilen yeni görsel sanılmaz!
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

    console.log('[CDP Worker] Prompt gönderildi, görsel üretimi bekleniyor...');

    // DALL-E çizimi en az 10-15 saniye sürer, ön başlatma payı
    await sleep(8000);

    // 4. Görselin üretilmesini bekle (Maks 180 saniye - ChatGPT Plus DALL-E derin çizim payı)
    let foundImgSrc = null;
    const maxAttempts = 85; // 85 * 2s + 8s = ~178s

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await sleep(2000);

      // İlerlemeyi Gateway'e bildir
      const elapsed = attempt * 2 + 8;
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
            // ChatGPT üretim/düşünme durumunu kontrol et
            const stopBtn = document.querySelector('button[data-testid="stop-button"], button[aria-label*="Stop"], button[aria-label*="durdur"]');
            const isThinking = !!document.querySelector('.result-thinking, [data-testid*="generating"], .streaming-animated-ellipsis');
            const isGenerating = !!stopBtn || isThinking;

            // DALL-E üretilen görseller özel container (.group/imagegen-image), estuary backend URL veya alt="Generated image..." formatındadır
            const candidateImgs = Array.from(document.querySelectorAll(
              'img[alt^="Generated image"], img[src*="backend-api/estuary"], .group\\\\/imagegen-image img, [id^="image-"] img'
            ));

            const beforeList = ${JSON.stringify(Array.from(beforeImages))};

            for (const img of candidateImgs) {
              const src = img.src || '';
              if (!src || beforeList.includes(src)) continue;

              const alt = (img.alt || '').toLowerCase();
              // Yüklenen referans dosyaları ref_... veya dosya uzantısıyla biter, onları asla alma
              if (alt.startsWith('ref_') || alt.endsWith('.png') || alt.endsWith('.jpg') || alt.endsWith('.jpeg') || alt.endsWith('.webp')) continue;

              const width = img.naturalWidth || img.width;
              const height = img.naturalHeight || img.height;
              // Henüz render edilmemiş veya çok küçük profil/ikon ise geç (minimum 80px)
              if (!img.complete || width < 80 || height < 80) continue;

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
      if (checkResult?.ready && checkResult?.foundSrc) {
        foundImgSrc = checkResult.foundSrc;
        console.log(`[CDP Worker] Görsel ${elapsed}. saniyede başarıyla tamamlandı ve tespit edildi!`);
        break;
      }
    }

    if (!foundImgSrc) {
      throw new Error('Görsel üretim zaman aşımı (180 saniye)');
    }

    // 4. Görsel Blob'unu Sayfa Context'inden Çek
    console.log('[CDP Worker] Görsel çekiliyor ve indiriliyor...');
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
    if (!b64Data) {
      throw new Error('Görsel verisi base64 olarak okunamadı');
    }

    const base64Content = b64Data.split(',')[1];
    const imageBuffer = Buffer.from(base64Content, 'base64');
    console.log(`[CDP Worker] Görsel hazır: ${(imageBuffer.length / 1024).toFixed(1)} KB`);

    // 5. Gateway'e Yükle
    const filename = `img_${job.id}_${Date.now()}.png`;
    const uploadRes = await fetch(`${GATEWAY_URL}/upload?jobId=${job.id}&filename=${filename}`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/png' },
      body: imageBuffer
    });

    if (!uploadRes.ok) {
      throw new Error(`Gateway upload HTTP ${uploadRes.status}`);
    }

    const uploadData = await uploadRes.json();
    console.log(`[CDP Worker] BAŞARIYLA TAMAMLANDI: ${uploadData.url}`);

    // Sohbeti müşteri adına adlandır
    await renameChatToCustomer(cdp, `${customer} - Medya`).catch(() => {});

    // 6. Firma Sohbet URL'sini Güncelle/Kaydet
    try {
      const finalUrlEval = await cdp.send('Runtime.evaluate', {
        expression: 'window.location.href',
        returnByValue: true
      });
      const finalUrl = finalUrlEval.result?.value || '';
      if (finalUrl.includes('/c/')) {
        setCompanyChat(customer, 'media', finalUrl);
        await renameChatToCustomer(cdp, `${customer} - Medya`);
      }
    } catch (urlErr) {
      console.warn(`[CDP Worker: ${WORKER_ID}] URL kaydetme uyarısı:`, urlErr.message);
    }

  } catch (err) {
    console.error(`[CDP Worker] İş hatası (${job.id}):`, err.message);
    // Kilidi serbest bırak
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

// WhatsApp Yapay Zeka Mesaj Önerileri İşini Çalıştır (Kalıcı Mesajlaşma Sohbeti)
async function executeChatSuggestionsJob(tab, job) {
  let cdp = null;
  try {
    cdp = await createCdpSession(tab.webSocketDebuggerUrl);

    const customer = (job.customer || 'Genel').trim();
    console.log(`[CDP Worker: ${WORKER_ID}] [Mesajlar] Firma: "${customer}" için öneri motoru hazırlanıyor...`);

    // 1. Temiz ve yüksek hızlı öneri oturumunu sağla (önceki mesaj karmaşasını ve donmaları önler)
    await resetToFreshChat(cdp);

    const countEval = await cdp.send('Runtime.evaluate', {
      expression: `document.querySelectorAll('[data-message-author-role="assistant"]').length`,
      returnByValue: true
    });
    const initialAsstCount = countEval.result?.value || 0;

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

    console.log(`[CDP Worker: ${WORKER_ID}] [Mesajlar] Prompt gönderildi, yanıt bekleniyor...`);
    await sleep(2000);

    // 4. Yeni metin yanıtının tamamlanmasını bekle (Maksimum ~60 saniye)
    let lastText = '';
    let stableCount = 0;
    const maxWait = 45; // 45 * 1.5s = ~67s
    for (let i = 0; i < maxWait; i++) {
      await sleep(1500);
      const textEval = await cdp.send('Runtime.evaluate', {
        expression: `
          (() => {
            const assts = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));
            if (assts.length <= ${initialAsstCount}) {
              return { hasNewMsg: false, isGenerating: true, text: '' };
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
        console.log(`[CDP Worker: ${WORKER_ID}] [Mesajlar] Geçerli JSON başarıyla algılandı, döngü sonlandırılıyor.`);
        break;
      }
      if (!res.isGenerating && stableCount >= 2 && lastText.length > 50) {
        break;
      }
    }

    if (!lastText || lastText.length < 15) {
      throw new Error('ChatGPT yanıt üretemedi veya boş döndü');
    }

    // 5. JSON ayrıştırma ve emoji temizliği
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
      console.warn(`[CDP Worker: ${WORKER_ID}] Ayrıştırılamayan Ham Metin:`, lastText);
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
    await fetch(`${GATEWAY_URL}/job/complete-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: job.id,
        result: { suggestions: parsedSuggestions, raw: lastText }
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
        setCompanyChat(customer, 'chat', finalUrl);
        await renameChatToCustomer(cdp, `${customer} - Mesajlar`);
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
    if (cdp) cdp.close();
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

    await ensureCustomerChat(cdp, customer, channel);

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

            const articles = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));
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

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Sürekli çalıştır
setInterval(workerLoop, POLL_INTERVAL_MS);
workerLoop();
