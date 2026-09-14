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
  if (tab.url.includes('/auth') || tab.url.includes('/login')) {
    return false;
  }
  try {
    const cdp = await createCdpSession(tab.webSocketDebuggerUrl);
    const evalRes = await cdp.send('Runtime.evaluate', {
      expression: `!!(
        document.querySelector('#prompt-textarea') || 
        document.querySelector('div[contenteditable="true"]') ||
        document.querySelector('textarea')
      )`,
      returnByValue: true
    });
    cdp.close();
    return !!evalRes.result?.value;
  } catch (e) {
    return false;
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

    await executeChatGPTJob(chatgptTab, job);

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

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Sürekli çalıştır
setInterval(workerLoop, POLL_INTERVAL_MS);
workerLoop();
