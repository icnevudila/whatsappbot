/**
 * OmniStudio Direct CDP Autonomous Worker
 * Bypasses Chrome 142+ extension restrictions by directly orchestrating
 * Chrome DevTools Protocol (CDP) on port 9222.
 */

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://127.0.0.1:3456';
const CDP_HTTP = process.env.CDP_HTTP || 'http://127.0.0.1:9222';
const POLL_INTERVAL_MS = 2500;

console.log('[CDP Worker] OmniStudio Otonom Tarayıcı Motoru Başlatılıyor...');
console.log(`[CDP Worker] Gateway: ${GATEWAY_URL} | CDP: ${CDP_HTTP}`);

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

// Ana Döngü
async function workerLoop() {
  if (isBusy) return;

  try {
    // 1. ChatGPT sekmesi var mı kontrol et
    const chatgptTab = await getTab('chatgpt.com');
    if (!chatgptTab) {
      // ChatGPT açık değil
      return;
    }

    // 2. Gateway'den sıradaki işi çek
    const jobRes = await fetch(`${GATEWAY_URL}/job/next?platform=chatgpt`, { cache: 'no-store' });
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
  try {
    cdp = await createCdpSession(tab.webSocketDebuggerUrl);

    // 1. Mevcut görsel URL'lerini kaydet
    const beforeEval = await cdp.send('Runtime.evaluate', {
      expression: `Array.from(document.querySelectorAll('img')).map(i => i.src)`,
      returnByValue: true
    });
    const beforeImages = new Set(beforeEval.result?.value || []);

    // 1.5 Referans Görseller Varsa (Image-to-Image / Marka Kiti) ChatGPT'ye Dosya Olarak Yükle
    const fs = require('fs');
    const path = require('path');
    const tempRefPaths = [];

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
            console.log('[CDP Worker] Referans görseller ChatGPT inputuna yüklendi, thumbnail bekleniyor...');
            await sleep(3500); // Görselin yüklenip input alanına eklenmesini bekle
          }
        } catch (uploadErr) {
          console.warn('[CDP Worker] Referans görsel yükleme uyarısı:', uploadErr.message);
        }
      }
    }

    // 2. Prompt'u Enjekte Et
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

    // 3. Görselin üretilmesini bekle (Maks 110 saniye)
    let foundImgSrc = null;
    const maxAttempts = 55; // 55 * 2s = 110s

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await sleep(2000);

      // İlerlemeyi Gateway'e bildir
      const progress = Math.min(95, Math.round((attempt / maxAttempts) * 100));
      fetch(`${GATEWAY_URL}/job/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id, progress })
      }).catch(() => {});

      const checkEval = await cdp.send('Runtime.evaluate', {
        expression: `
          (function() {
            const imgs = Array.from(document.querySelectorAll('img')).map(i => ({
              src: i.src,
              alt: i.alt || '',
              width: i.naturalWidth || i.width
            }));
            const isThinking = !!document.querySelector('.result-thinking, [data-testid*="generating"]');
            return { imgs, isThinking };
          })()
        `,
        returnByValue: true
      });

      const currentImgs = checkEval.result?.value?.imgs || [];
      
      // Yeni oluşan görseli bul
      const newImg = currentImgs.find(img => 
        !beforeImages.has(img.src) &&
        (
          img.src.includes('backend-api/estuary/content') ||
          img.src.includes('oaiusercontent.com') ||
          img.src.includes('dall-e') ||
          img.alt.startsWith('Generated image') ||
          (img.width > 500 && img.src.startsWith('blob:'))
        )
      );

      if (newImg) {
        foundImgSrc = newImg.src;
        console.log(`[CDP Worker] Görsel ${attempt * 2}. saniyede tespit edildi!`);
        break;
      }
    }

    if (!foundImgSrc) {
      throw new Error('Görsel üretim zaman aşımı (110 saniye)');
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
