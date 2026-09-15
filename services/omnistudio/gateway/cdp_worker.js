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
        send(method, params = {}) {
          return new Promise((res, rej) => {
            const id = msgId++;
            callbacks.set(id, { res, rej });
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
    // Bu firma ve kanal için önceden açılmış bir sohbet var
    const targetChatPath = targetUrl.replace('https://chatgpt.com', '');
    if (currentUrl.includes(targetChatPath)) {
      console.log(`[CDP Worker: ${WORKER_ID}] "${customer}" [${channel}] aktif sohbetteyiz: ${targetUrl}`);
      return;
    }

    console.log(`[CDP Worker: ${WORKER_ID}] "${customer}" [${channel}] sohbetine geçiliyor: ${targetUrl}`);
    await cdp.send('Page.navigate', { url: targetUrl });
    await waitForChatInput(cdp);

    // Eğer geçiş sonrası sayfa 404 verdi veya ana sayfaya yönlendirdiyse (sohbet silinmiş vs.), yeni sohbet aç
    const afterNavEval = await cdp.send('Runtime.evaluate', {
      expression: 'window.location.href',
      returnByValue: true
    });
    const afterUrl = afterNavEval.result?.value || '';
    if (afterUrl.includes('/c/')) {
      return;
    }
    console.log(`[CDP Worker: ${WORKER_ID}] "${customer}" [${channel}] eski sohbeti açılamadı, yeni sohbet oluşturulacak.`);
  }

  // Bu firma ve kanal için kayıtlı sohbet yok veya eski sohbet kapalı -> Yeni temiz sohbet aç
  if (currentUrl.includes('/c/')) {
    console.log(`[CDP Worker: ${WORKER_ID}] "${customer}" [${channel}] için yeni özel sohbet açılıyor...`);
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const link = document.querySelector('a[href="/"]');
        if (link) { link.click(); return true; }
        window.location.href = 'https://chatgpt.com/';
        return false;
      })()`,
      returnByValue: true
    });
    await waitForChatInput(cdp);
  } else {
    console.log(`[CDP Worker: ${WORKER_ID}] "${customer}" [${channel}] için temiz sohbet sayfası hazır.`);
  }
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
    } else {
      await executeChatGPTJob(chatgptTab, job);
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

    // 0. Firma Başına Ayrılmış Özel Sohbet Yönetimi (Medya / Görsel Kanalı)
    const customer = (job.customer || 'Genel').trim();
    console.log(`[CDP Worker: ${WORKER_ID}] Firma: "${customer}" için [Medya] sohbeti hazırlanıyor...`);
    await ensureCustomerChat(cdp, customer, 'media');

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
    const injectEval = await cdp.send('Runtime.evaluate', {
      expression: `
        (function() {
          const prompt = ${JSON.stringify(job.prompt)};
          const textarea = document.querySelector('#prompt-textarea') || 
                           document.querySelector('div[contenteditable="true"]') ||
                           document.querySelector('textarea');
          if (!textarea) return { success: false, error: 'Textarea bulunamadı' };
          
          textarea.focus();
          if (textarea.tagName === 'DIV' || textarea.getAttribute('contenteditable') === 'true') {
            textarea.innerHTML = '<p>' + prompt.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p>';
          } else {
            textarea.value = prompt;
          }

          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));

          // Gönder butonuna tıkla
          setTimeout(() => {
            const sendBtn = document.querySelector('button[data-testid="send-button"]') ||
                            document.querySelector('button[aria-label*="Send"]') ||
                            document.querySelector('button[aria-label*="Gönder"]');
            if (sendBtn && !sendBtn.disabled) {
              sendBtn.click();
            } else {
              textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
            }
          }, 500);

          return { success: true };
        })()
      `,
      returnByValue: true
    });

    if (!injectEval.result?.value?.success) {
      throw new Error(injectEval.result?.value?.error || 'Prompt kutusu bulunamadı');
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

            // DALL-E üretilen görseller özel container (.group/imagegen-image) veya alt="Generated image..." formatındadır
            const candidateImgs = Array.from(document.querySelectorAll(
              '.group\\\\/imagegen-image img, img[alt^="Generated image"], [id^="image-"] img'
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
              // Henüz render edilmemiş veya çok küçük ikon ise geç
              if (!img.complete || width < 512 || height < 512) continue;

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
    console.log(`[CDP Worker: ${WORKER_ID}] [Mesajlar] Firma: "${customer}" için müşteri temsilcisi sohbeti hazırlanıyor...`);

    // 1. Müşteri temsilcisi sohbetine geç ('chat' kanalı)
    await ensureCustomerChat(cdp, customer, 'chat');

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
2. "Samimi" (Nazik, güler yüzlü, çözüm odaklı kurumsal yanıt)
3. "Yönlendirici" (Gerekiyorsa sonraki adımı, arama saatini veya detayları soran aksiyon yanıtı)

ÖNEMLİ KURAL:
YALNIZCA VE SADECE aşağıdaki JSON formatında çıktı ver. Markdown kod bloğu (\`\`\`json) veya başka hiçbir metin ekleme:
{"suggestions":[{"label":"Kısa & Net","text":"..."},{"label":"Samimi","text":"..."},{"label":"Yönlendirici","text":"..."}]}`;

    // 3. Prompt'u ChatGPT'ye enjekte et ve gönder
    const injectEval = await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const textarea = document.querySelector('#prompt-textarea') || 
                           document.querySelector('div[contenteditable="true"]') ||
                           document.querySelector('textarea');
          if (!textarea) return { success: false, error: 'Textarea bulunamadı' };
          
          textarea.focus();
          if (textarea.tagName === 'DIV' || textarea.getAttribute('contenteditable') === 'true') {
            textarea.innerHTML = '<p>' + ${JSON.stringify(prompt)}.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p>';
          } else {
            textarea.value = ${JSON.stringify(prompt)};
          }

          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));

          setTimeout(() => {
            const sendBtn = document.querySelector('button[data-testid="send-button"]') ||
                            document.querySelector('button[aria-label*="Send"]') ||
                            document.querySelector('button[aria-label*="Gönder"]');
            if (sendBtn && !sendBtn.disabled) {
              sendBtn.click();
            } else {
              textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
            }
          }, 400);

          return { success: true };
        })()
      `,
      returnByValue: true
    });

    if (!injectEval.result?.value?.success) {
      throw new Error(injectEval.result?.value?.error || 'ChatGPT input kutusu bulunamadı');
    }

    console.log(`[CDP Worker: ${WORKER_ID}] [Mesajlar] Prompt gönderildi, yanıt bekleniyor...`);
    await sleep(2500);

    // 4. Metin yanıtının tamamlanmasını bekle (Maksimum 35 saniye)
    let lastText = '';
    const maxWait = 22; // 22 * 1.5s = ~33s
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
      throw new Error('ChatGPT yanıt üretemedi veya boş döndü');
    }

    // 5. JSON ayrıştırma
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
        parsedSuggestions = parsed.suggestions;
      }
    } catch (parseErr) {
      console.warn(`[CDP Worker: ${WORKER_ID}] JSON ayrıştırma uyarısı:`, parseErr.message);
      parsedSuggestions = [
        { label: 'Öneri 1', text: lastText.slice(0, 300) }
      ];
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

    // 7. Sohbet URL'sini ve Başlığını Kaydet
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
      console.warn(`[CDP Worker: ${WORKER_ID}] URL kaydetme uyarısı:`, urlErr.message);
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

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Sürekli çalıştır
setInterval(workerLoop, POLL_INTERVAL_MS);
workerLoop();
