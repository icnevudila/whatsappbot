const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const WebSocket = globalThis.WebSocket || (() => {
  try { return require('ws'); } catch (e) { return null; }
})();

const OUTPUT_DIR = '/app/gateway/outputs';
const PUBLIC_HOST = process.env.PUBLIC_HOST || '167.233.201.31';
const PORT = process.env.PORT || '3456';

const CDP_PORTS = (process.env.GEMINI_CDP_PORTS || '9222,9223,9224,9225')
  .split(',')
  .map(p => parseInt(p.trim(), 10))
  .filter(Boolean);

// Havuzdaki 4 hesabın canlı durumunu tutar
// port -> { limitedUntil: timestamp, lastUsed: timestamp, accountName: string, limitReason: string }
const accountPool = {};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const { getActiveBrandKit, buildTurkishVeoDirectorPrompt, getLogoVisualDescription } = require('./brand_resolver.js');

/**
 * Full + Full Sinematik Reklam Prompt Genişleticisi (Veo & AI Video Engine)
 * Kısa veya standart bir brief'i 3 perdeli bir reklam filmi yönetmeni vizyonuna genişletir.
 * Marka kitinden marka adı, logosu ve renkleri otomatik çeker; %100 Türkçe 3D sahne metinlerini hazırlar.
 */
async function enhanceVideoPrompt(options = {}) {
  const { buildTurkishVeoDirectorPrompt } = require('./brand_resolver.js');
  return await buildTurkishVeoDirectorPrompt(options);
}

/**
 * Normal ChatGPT Web Servisine Girerek Otonom Video Promptu Üretir
 * OpenAI API anahtarı veya kredi KULLANMAZ, doğrudan Chrome sekmendeki ChatGPT oturumunu çalıştırır.
 */
async function generatePromptWithChatGptWeb(port, { prompt, brandName, productName, customer, orgId }) {
  const brandKit = await getActiveBrandKit(orgId);
  const company = customer || brandName || brandKit.organization_name || brandKit.brand_name || 'Ayvazoğlu İnşaat';
  const logoDesc = getLogoVisualDescription(company, brandKit.logo_path);
  const colors = brandKit.colors || { primary: '#ff5733', accent: '#ffc300' };
  console.log(`[VideoGen -> ChatGPT Web] [Firma: ${company}] Port ${port} üzerinde temiz ChatGPT sekmesi açılıyor...`);
  let createdTabId = null;
  let ws = null;
  try {
    // 1. Temiz ve bağımsız bir sekme aç
    const newTabRes = await fetch(`http://127.0.0.1:${port}/json/new?https://chatgpt.com/`, {
      method: 'PUT',
      signal: AbortSignal.timeout(5000)
    });
    if (!newTabRes.ok) throw new Error('Yeni ChatGPT sekmesi açılamadı');
    const newTab = await newTabRes.json();
    createdTabId = newTab.id;

    ws = new WebSocket(newTab.webSocketDebuggerUrl);
    let idSeq = 1;
    function sendCmd(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = idSeq++;
        const handler = (e) => {
          const data = JSON.parse(e.data);
          if (data.id === id) {
            ws.removeEventListener('message', handler);
            if (data.error) reject(data.error);
            else resolve(data.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    const brand = company;
    const product = productName || 'Ürün & Hizmet';
    const brief = prompt || '9:16 sinematik reklam videosu';
    const { detectSectorAndStyle } = require('./brand_resolver.js');
    const sectorInfo = detectSectorAndStyle(brand, product, brief);

    const gptAskPrompt = `Sen Cannes ödüllü bir ticari reklam filmi yönetmeni ve Google Veo video prompt uzmanısın.
Görevin: Verilen işletme ve marka verilerini kullanarak Google Veo video motoruna doğrudan iletilecek, aşırı detaylı, sektöre ve bu firmaya ÖZEL, sıfır hatalı tek bir 9:16 Dikey Reklam Filmi Promptu oluşturmak.

İŞLETME VE MARKA KİTİ VERİLERİ:
- Sektör / Tema: ${sectorInfo.sector} (${sectorInfo.sceneAtmosphere})
- Marka / Firma Adı: ${brand} (ZORUNLU: Videoda net ve fiziksel olarak yer alacak)
- Kurumsal Logo Amblemi: ${logoDesc} (ZORUNLU: Sahne içinde fiziksel olarak yer alacak)
- Kurumsal Renk Paleti: ${colors.accent || '#ffc300'}, ${colors.primary || '#ff5733'}, Siyah ve Beyaz
- Öne Çıkan Ürün: ${product}
- Kampanya Brief'i: ${brief}
- Bu Çekim İçin Belirlenen Sinematik Yönetmen Açısı: ${sectorInfo.creativeAngle?.name || 'Macro & Sensory'}
  * Kamera Tekniği: ${sectorInfo.creativeAngle?.cameraStyle || 'Arri Alexa Mini LF, 9:16 dikey sinema lensi'}
  * Işık & Atmosfer: ${sectorInfo.creativeAngle?.lighting || 'Sinematik yönlü aydınlatma, derin sıcak tonlar'}

ZORUNLU YÖNETMEN KURALLARI (SAF CANLI ÇEKİM SİNEMATOGRAFİSİ & SIFIR KELİME ÇORBASI):
1. KESİNLİKLE EKRANA 3D YAZI, BAŞLIK VEYA KELİME ÇORBASI YAZDIRMA:
   - STRICT RULE: NO 3D FLOATING LETTERS, NO GIBBERISH TEXT, NO FLOATING SENTENCES, NO ON-SCREEN HEADLINES, NO PARAGRAPH OVERLAYS, NO WORDS ON SCREEN.
   - Veo bir difüzyon video modelidir; ekrana havada asılı uzun Türkçe cümleler koymaya çalıştığında harfleri eritip anlamsız kelime çorbasına dönüştürür.
   - Sahnedeki tek yazı, ürünün kendi ambalajındaki veya fiziksel gövdesindeki temiz kurumsal "${brand}" marka ismi veya fiziksel logosu olmalıdır.
   - Reklam mesajını ve kurguyu tamamen görsel aksiyon, oyuncu etkileşimi, ürünün çalışma anı, estetik aydınlatma ve akıcı kamera hareketleriyle anlat.

2. 3 PERDELİ SİNEMATİK AKIŞ:
   - ACT 1 (0-3s) - Kanca: Ürünün makro dokusu, estetiği ve birinci sınıf malzeme kalitesi.
   - ACT 2 (3-7s) - Aksiyon & Kullanım: Ürünün/hizmetin gerçek kullanım performansı ve sağladığı çözüm.
   - ACT 3 (7-10s) - Kahraman Finali: Firmanın güven veren kurumsal duruşu ve memnun kullanıcı.

3. TÜRKÇE SESLENDİRME (AUDIO VOICEOVER - YALNIZCA SES METNİ, EKRANDA YAZI YOK):
   - 15-20 kelimelik berrak Türkçe reklam spikeri repliği ekle.

4. MARKA KİTİ, LOGO VE ÜRÜN DOKUNULMAZLIĞI (ASLA OYNAMA VEYA VARYASYON YAPMA):
   - Firmanın orijinal logosu, amblemi, marka renkleri ve ürün tasarımı KESİNLİKLE değiştirilmeyecek veya farklı varyasyonlara sokulmayacaktır.
   - Gerçek ürünün formu, kasası, fiziksel donanımı ve görünümü birebir orijinal fotoğraftaki gibi korunmalıdır. Hayali veya dönüştürülmüş ürün şekilleri kesinlikle üretilmeyecektir.
   - ZERO MUTATION, ZERO PRODUCT MORPHING, ZERO LOGO ALTERATION.

5. ÇIKTI FORMATI:
   - SADECE Google Veo video motoruna doğrudan yapıştırılacak tek parça sinematik video prompt metnini yaz.
   - Başka hiçbir selamlama, açıklama, başlık veya markdown tırnağı koyma.`;

    return await new Promise((resolve) => {
      const timeoutTimer = setTimeout(() => {
        try { ws.close(); } catch(e){}
        resolve(null);
      }, 35000);

      ws.onopen = async () => {
        try {
          // Input alanını bekle
          let inputFound = false;
          for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 600));
            const check = await sendCmd("Runtime.evaluate", {
              expression: `!!(document.querySelector('#prompt-textarea') || document.querySelector('div[contenteditable="true"]'))`,
              returnByValue: true
            });
            if (check?.result?.value) {
              inputFound = true;
              break;
            }
          }

          if (!inputFound) {
            clearTimeout(timeoutTimer);
            ws.close();
            return resolve(null);
          }

          // Textarea'ya odaklan
          await sendCmd("Runtime.evaluate", {
            expression: `(() => {
              const ta = document.querySelector('#prompt-textarea') || document.querySelector('div[contenteditable="true"]');
              if (ta) ta.focus();
            })()`
          });
          await new Promise(r => setTimeout(r, 400));

          // CDP yerel metin enjeksiyonu
          await sendCmd("Input.insertText", { text: gptAskPrompt });
          await new Promise(r => setTimeout(r, 800));

          // Gönder butonunun koordinatlarını al
          const btnCoord = await sendCmd("Runtime.evaluate", {
            expression: `(() => {
              const btn = document.querySelector('button[data-testid="send-button"]') || 
                          document.querySelector('button[aria-label*="Send"]') ||
                          document.querySelector('button[aria-label*="Gönder"]');
              if (btn) {
                const r = btn.getBoundingClientRect();
                return { found: true, x: r.left + r.width / 2, y: r.top + r.height / 2 };
              }
              return { found: false };
            })()`,
            returnByValue: true
          });

          if (btnCoord?.result?.value?.found) {
            const { x, y } = btnCoord.result.value;
            console.log(`[VideoGen -> ChatGPT Web] Gönder butonuna tıklandı (${Math.round(x)}, ${Math.round(y)}). Yanıt bekleniyor...`);
            await sendCmd("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
            await sendCmd("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
          } else {
            console.log(`[VideoGen -> ChatGPT Web] Buton bulunamadı, Enter tuşu gönderiliyor...`);
            await sendCmd("Input.dispatchKeyEvent", { type: "rawKeyDown", windowsVirtualKeyCode: 13, unmodifiedText: "\r", text: "\r" });
            await sendCmd("Input.dispatchKeyEvent", { type: "keyUp", windowsVirtualKeyCode: 13 });
          }

          // ChatGPT yanıtını bekle
          let responseText = '';
          for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 1200));
            const checkRes = await sendCmd("Runtime.evaluate", {
              expression: `(() => {
                const stopBtn = document.querySelector('button[data-testid="stop-button"], button[aria-label*="Stop"], button[aria-label*="durdur"]');
                const isThinking = !!document.querySelector('.result-thinking, [data-testid*="generating"], .streaming-animated-ellipsis');
                const isGenerating = !!stopBtn || isThinking;

                const articles = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));
                const lastMsg = articles.pop();
                const text = lastMsg ? (lastMsg.innerText || lastMsg.textContent || '').trim() : '';
                return { isGenerating, text };
              })()`,
              returnByValue: true
            });

            const val = checkRes?.result?.value;
            if (val?.text) {
              responseText = val.text;
            }
            if (val && !val.isGenerating && responseText.length > 80) {
              clearTimeout(timeoutTimer);
              ws.close();
              console.log(`[VideoGen -> ChatGPT Web] ✅ ChatGPT Web senaryoyu üretti (${responseText.length} karakter)!`);
              return resolve(responseText);
            }
          }

          clearTimeout(timeoutTimer);
          ws.close();
          resolve(responseText.length > 50 ? responseText : null);
        } catch (e) {
          clearTimeout(timeoutTimer);
          try { ws.close(); } catch(err){}
          resolve(null);
        }
      };

      ws.onerror = () => {
        clearTimeout(timeoutTimer);
        resolve(null);
      };
    });
  } catch (err) {
    console.warn(`[VideoGen -> ChatGPT Web] Hata:`, err.message);
    return null;
  } finally {
    if (createdTabId) {
      fetch(`http://127.0.0.1:${port}/json/close/${createdTabId}`).catch(() => {});
    }
  }
}

function attemptGenerateOnCdp(port, tab, options) {
  const {
    fullPrompt,
    brandName,
    subTitle,
    offerTitle,
    offerDetails,
    ctaText,
    primaryColor = '#026009',
    accentColor = '#acfe00',
    includeOverlay = false,
    includeLogo = false,
    includeBanner = false,
    includeCta = false
  } = options;

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let idSeq = 1;

  function sendCmd(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idSeq++;
      const handler = (e) => {
        const data = JSON.parse(e.data);
        if (data.id === id) {
          ws.removeEventListener('message', handler);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  return new Promise((resolve, reject) => {
    ws.onopen = async () => {
      try {
        console.log("[VideoGen] Chrome CDP bağlantısı kuruldu.");
        await sendCmd("Page.bringToFront");

        // 1. Her video için kesinlikle YENİ ve TERTEMİZ bir Gemini oturumu aç (Eski video butonlarının karışmasını 100% engeller)
        console.log(`[VideoGen] '${brandName || 'Kampanya'}' için yeni ve bağımsız temiz sohbet başlatılıyor...`);
        await sendCmd("Page.navigate", { url: "https://gemini.google.com/videos" });
        await new Promise(r => setTimeout(r, 3500));

        // Sayfanın ve input kutusunun hazır olmasını bekle
        let inputReady = false;
        for (let i = 0; i < 15; i++) {
          const chk = await sendCmd("Runtime.evaluate", {
            expression: `!!(document.querySelector('div[contenteditable="true"]') || document.querySelector('rich-textarea p') || document.querySelector('textarea'))`,
            returnByValue: true
          });
          if (chk?.result?.value) {
            inputReady = true;
            break;
          }
          await new Promise(r => setTimeout(r, 1000));
        }

        if (!inputReady) {
          throw new Error("Gemini sohbet giriş kutusu yüklenemedi.");
        }

        // Kota / Hız Sınırı (Rate Limit) Kontrolü
        const quotaCheck = await sendCmd("Runtime.evaluate", {
          expression: `
            (function() {
              const text = document.body.innerText || '';
              if (text.includes('video üretme sınırına ulaştınız') || text.includes('video generation limit')) {
                const match = text.match(/(saat.*itibarıyla|Eylül.*itibarıyla|until.*)/i);
                return { isLimited: true, reason: match ? match[0].split('\\n')[0].slice(0, 100) : 'Video kota sınırına ulaşıldı' };
              }
              return { isLimited: false };
            })()
          `,
          returnByValue: true
        });

        if (quotaCheck?.result?.value?.isLimited) {
          ws.close();
          return resolve({
            isLimited: true,
            reason: quotaCheck.result.value.reason || 'Video kota sınırına ulaşıldı'
          });
        }

        // 2. En boy oranını Dikey (9:16) olarak ayarla
        try {
          const aspectRes = await sendCmd("Runtime.evaluate", {
            expression: `
              (function() {
                const btn = Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').includes('16:9') || (b.innerText || '').includes('Yatay'));
                if (btn) {
                  const r = btn.getBoundingClientRect();
                  return { found: true, x: r.left + r.width/2, y: r.top + r.height/2 };
                }
                return { found: false };
              })()
            `,
            returnByValue: true
          });

          if (aspectRes?.result?.value?.found) {
            const { x, y } = aspectRes.result.value;
            await sendCmd("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
            await sendCmd("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
            await new Promise(r => setTimeout(r, 800));

            const dikeyCoord = await sendCmd("Runtime.evaluate", {
              expression: `
                (function() {
                  const els = Array.from(document.querySelectorAll('*'));
                  const target = els.find(el => el.children.length === 0 && (
                    (el.innerText || el.textContent || '').trim() === 'Dikey (9:16)' ||
                    (el.innerText || el.textContent || '').trim().includes('9:16') ||
                    (el.innerText || el.textContent || '').trim().toLowerCase().includes('portrait')
                  ));
                  if (target) {
                    const r = target.getBoundingClientRect();
                    return { found: true, x: r.left + r.width/2, y: r.top + r.height/2 };
                  }
                  return { found: false };
                })()
              `,
              returnByValue: true
            });

            if (dikeyCoord?.result?.value?.found) {
              const { x: dx, y: dy } = dikeyCoord.result.value;
              await sendCmd("Input.dispatchMouseEvent", { type: "mousePressed", x: dx, y: dy, button: "left", clickCount: 1 });
              await sendCmd("Input.dispatchMouseEvent", { type: "mouseReleased", x: dx, y: dy, button: "left", clickCount: 1 });
              console.log("[VideoGen] Aspect ratio 9:16 (Dikey) olarak seçildi.");
              await new Promise(r => setTimeout(r, 600));
            } else {
              await sendCmd("Input.dispatchKeyEvent", { type: "rawKeyDown", windowsVirtualKeyCode: 27 });
              await sendCmd("Input.dispatchKeyEvent", { type: "keyUp", windowsVirtualKeyCode: 27 });
            }
          }
        } catch (aspectErr) {
          console.warn("[VideoGen] Aspect ratio seçimi atlandı:", aspectErr.message);
        }

        // Başlangıçtaki indir buton sayısını kaydet (temiz sayfada 0 olmalı)
        const baselineRes = await sendCmd("Runtime.evaluate", {
          expression: `document.querySelectorAll('button[aria-label*="indir" i], button[aria-label*="download" i]').length`,
          returnByValue: true
        });
        const initialDlCount = Number(baselineRes?.result?.value) || 0;
        console.log(`[VideoGen] Sayfa hazır. Başlangıç video/indir butonu sayısı: ${initialDlCount}`);

        // Prompt kutusuna odaklan ve CDP native Input.insertText ile yaz
        await sendCmd("Runtime.evaluate", {
          expression: `
            (function() {
              const inputEl = document.querySelector('div[contenteditable="true"]') || 
                              document.querySelector('rich-textarea p') ||
                              document.querySelector('textarea');
              if (!inputEl) throw new Error("Input element bulunamadı");
              inputEl.focus();
              document.execCommand('selectAll', false, null);
              document.execCommand('delete', false, null);
            })()
          `
        });
        await new Promise(r => setTimeout(r, 400));
        await sendCmd("Input.insertText", { text: fullPrompt });
        await new Promise(r => setTimeout(r, 800));
        await sendCmd("Runtime.evaluate", {
          expression: `
            (function() {
              const inputEl = document.querySelector('div[contenteditable="true"]') || 
                              document.querySelector('rich-textarea p') ||
                              document.querySelector('textarea');
              if (inputEl) {
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                inputEl.dispatchEvent(new Event('change', { bubbles: true }));
              }
            })()
          `
        });
        await new Promise(r => setTimeout(r, 1000));

        // Gönder butonuna tıkla
        const btnRes = await sendCmd("Runtime.evaluate", {
          expression: `
            (function() {
              const btns = Array.from(document.querySelectorAll('button'));
              const sendBtn = btns.find(b => {
                const label = (b.getAttribute('aria-label') || '').toLowerCase();
                const isSend = label.includes('gönder') || label.includes('send') || b.querySelector('mat-icon[data-mat-icon-name="send"]');
                return isSend && !b.disabled && b.getAttribute('aria-disabled') !== 'true';
              });
              if (sendBtn) {
                const rect = sendBtn.getBoundingClientRect();
                return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, found: true };
              }
              return { found: false };
            })()
          `,
          returnByValue: true
        });

        if (btnRes?.result?.value?.found) {
          const { x, y } = btnRes.result.value;
          await sendCmd("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
          await sendCmd("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
        } else {
          await sendCmd("Input.dispatchKeyEvent", { type: "rawKeyDown", windowsVirtualKeyCode: 13, unmodifiedText: "\\r", text: "\\r" });
          await sendCmd("Input.dispatchKeyEvent", { type: "keyUp", windowsVirtualKeyCode: 13 });
        }
        console.log("[VideoGen] Full+Full Prompt gönderildi, Veo render bekleniyor...");

        // Video oluşana kadar bekle (max 5 dakika, minimum 25 saniye)
        const startTime = Date.now();
        let downloadReady = false;

        while (Date.now() - startTime < 300000) {
          await new Promise(r => setTimeout(r, 6000));
          const elapsed = Math.round((Date.now() - startTime) / 1000);

          const checkRes = await sendCmd("Runtime.evaluate", {
            expression: `
              (function() {
                const dlBtns = Array.from(document.querySelectorAll('button[aria-label*="indir" i], button[aria-label*="download" i]'));
                const isSpinnerActive = Array.from(document.querySelectorAll('mat-progress-spinner, mat-progress-bar, button[aria-label*="Durdur" i], button[aria-label*="Stop" i]')).some(el => el.offsetParent !== null);
                const videos = Array.from(document.querySelectorAll('video'));
                const hasVideo = videos.some(v => v.readyState >= 2 || v.duration > 0 || (v.src && v.src.startsWith('http')));
                const videoUrl = videos.find(v => v.src && v.src.startsWith('http'))?.src || null;
                return { dlCount: dlBtns.length, isSpinnerActive, hasVideo, videoUrl };
              })()
            `,
            returnByValue: true
          });

          const status = checkRes?.result?.value;
          // Veo render tamamlandı: Yeni indir butonu veya geçerli video elementi varsa ve aktif spinner yoksa
          if (status && (status.dlCount > initialDlCount || status.hasVideo) && (!status.isSpinnerActive || status.hasVideo) && elapsed >= 20) {
            console.log(`[VideoGen Port:${port}] Yeni video başarıyla render edildi (${elapsed}s)! İndirme tetikleniyor...`);
            downloadReady = true;
            break;
          }
          if (elapsed >= 12 && elapsed <= 24 && !status?.isSpinnerActive && !status?.hasVideo) {
            console.log(`[VideoGen Port:${port}] ⚠️ Spinner henüz başlamadı, Enter tuşu tekrar tetikleniyor (${elapsed}s)...`);
            try {
              await sendCmd("Input.dispatchKeyEvent", { type: "rawKeyDown", windowsVirtualKeyCode: 13, unmodifiedText: "\\r", text: "\\r" });
              await sendCmd("Input.dispatchKeyEvent", { type: "keyUp", windowsVirtualKeyCode: 13 });
            } catch(e) {}
          }
          console.log(`[VideoGen Port:${port}] Veo render bekleniyor (${elapsed}s, yeni_buton: ${status?.dlCount ?? 0} > ${initialDlCount}, video_var: ${status?.hasVideo}, aktif_spinner: ${status?.isSpinnerActive})...`);
        }

        if (!downloadReady) {
          ws.close();
          throw new Error("Video üretimi zaman aşımına uğradı (5 dakika).");
        }

        // İndirme dizinini ayarla
        const tempDlDir = `/tmp/gemini_dl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        fs.mkdirSync(tempDlDir, { recursive: true });

        await sendCmd("Page.setDownloadBehavior", {
          behavior: "allow",
          downloadPath: tempDlDir
        });

        // En son eklenen 'Videoyu indir' butonuna tıkla
        await sendCmd("Runtime.evaluate", {
          expression: `
            (function() {
              const btns = Array.from(document.querySelectorAll('button[aria-label*="indir" i], button[aria-label*="download" i]'));
              if (btns.length > 0) {
                btns[btns.length - 1].click();
                return true;
              }
              return false;
            })()
          `
        });

        // Dosyanın diske tam olarak inmesini bekle
        let downloadedFile = null;
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 1000));
          if (!fs.existsSync(tempDlDir)) continue;
          const files = fs.readdirSync(tempDlDir).filter(f => f.endsWith('.mp4') && !f.endsWith('.crdownload'));
          if (files.length > 0) {
            const candidate = path.join(tempDlDir, files[0]);
            const sz = fs.statSync(candidate).size;
            if (sz > 500000) { // En az 500 KB (tamamlanmış video dosyası)
              downloadedFile = candidate;
              break;
            }
          }
        }

        ws.close();

        if (!downloadedFile || !fs.existsSync(downloadedFile)) {
          throw new Error("İndirilen video dosyası bulunamadı.");
        }

        console.log(`[VideoGen] Ham video indi: ${downloadedFile} (${(fs.statSync(downloadedFile).size / 1024 / 1024).toFixed(2)} MB)`);

        const videoId = 'video_' + Date.now();
        const rawVideoTarget = path.join(OUTPUT_DIR, `${videoId}_raw.mp4`);
        fs.copyFileSync(downloadedFile, rawVideoTarget);
        // Videonun saf, sinematik canlı çekim hali doğrudan kullanılır (Yapay FFmpeg kutuları yakılmaz!)
        const finalUrl = `http://${PUBLIC_HOST}:${PORT}/outputs/${videoId}_raw.mp4`;
        const videoFileForThumb = rawVideoTarget;

        const thumbTarget = path.join(OUTPUT_DIR, `${videoId}_thumb.jpg`);
        let thumbUrl = null;
        try {
          execSync(`ffmpeg -y -ss 00:00:01 -i "${videoFileForThumb}" -vframes 1 -q:v 2 "${thumbTarget}"`);
          if (fs.existsSync(thumbTarget)) {
            thumbUrl = `http://${PUBLIC_HOST}:${PORT}/outputs/${videoId}_thumb.jpg`;
            console.log("[VideoGen] Kapak fotoğrafı (thumbnail) oluşturuldu:", thumbTarget);
          }
        } catch (thumbErr) {
          console.warn("[VideoGen] Thumbnail çıkartılırken hata:", thumbErr.message);
        }

        // /public/ dizinine de kopyala
        execSync(`cp -f ${OUTPUT_DIR}/*.mp4 ${OUTPUT_DIR}/*.jpg /app/gateway/public/ 2>/dev/null || true`);

        resolve({
          success: true,
          isLimited: false,
          port,
          videoId,
          videoUrl: finalUrl,
          thumbnailUrl: thumbUrl,
          duration: 10,
          aspect: "9:16",
          promptUsed: fullPrompt
        });

      } catch (err) {
        ws.close();
        reject(err);
      }
    };

    ws.onerror = (err) => reject(new Error(`Port ${port} WebSocket hatası: ` + err.message));
  });
}

async function checkPortLoggedIn(port, tab) {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(tab.webSocketDebuggerUrl);
      const timer = setTimeout(() => {
        try { ws.close(); } catch(e){}
        resolve(false);
      }, 2500);

      ws.onopen = () => {
        ws.send(JSON.stringify({
          id: 999,
          method: 'Runtime.evaluate',
          params: {
            expression: `!!(document.querySelector('.user-profile-button, [aria-label*="Google Hesabı"], [aria-label*="Google Account"], [aria-label*="Google-Konto"]') || (!document.querySelector('a[href*="accounts.google.com/ServiceLogin"]') && (document.querySelector('div[contenteditable="true"]') || document.querySelector('textarea'))))`,
            returnByValue: true
          }
        }));
      };

      ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.id === 999) {
            clearTimeout(timer);
            resolve(!!d.result?.result?.value);
            ws.close();
          }
        } catch(err) {
          resolve(false);
        }
      };

      ws.onerror = () => {
        clearTimeout(timer);
        resolve(false);
      };
    } catch(err) {
      resolve(false);
    }
  });
}

/**
 * 4 Hesaplı Akıllı Havuz Yöneticisi (Multi-Account Rotation Pool)
 * 1. Hesabı dener; kota sınırındaysa anında 2. hesaba, sonra 3. ve 4. hesaba devreder.
 */
async function generateVideo(options) {
  const now = Date.now();

  // Havuzdaki uygun portları seç veya belirtilen portu kullan
  const candidatePorts = options.port ? [Number(options.port)] : CDP_PORTS.filter(p => {
    const st = accountPool[p];
    return !st || !st.limitedUntil || st.limitedUntil <= now;
  }).sort((a, b) => (accountPool[a]?.lastUsed || 0) - (accountPool[b]?.lastUsed || 0));

  if (candidatePorts.length === 0) {
    const resetTimes = CDP_PORTS.map(p => accountPool[p]?.limitedUntil || 0).filter(t => t > now);
    const earliest = resetTimes.length ? Math.min(...resetTimes) : now + 3600000;
    const timeStr = new Date(earliest).toLocaleTimeString('tr-TR');
    throw new Error(`Bağlı olan tüm Google Gemini hesapları (4 hesap) şu anda video kota sınırında. İlk hesap sıfırlanma zamanı: ${timeStr}`);
  }

  let lastError = null;

  for (const port of candidatePorts) {
    console.log(`[VideoGen Pool] Port ${port} üzerinden video üretimi deneniyor...`);
    try {
      const listRes = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(3000) });
      if (!listRes.ok) {
        console.warn(`[VideoGen Pool] Port ${port} HTTP yanıtı vermedi, geçiliyor.`);
        continue;
      }

      const targets = await listRes.json();
      const tab = targets.find(t => t.url && t.url.includes("gemini.google.com"));
      if (!tab) {
        console.warn(`[VideoGen Pool] Port ${port} üzerinde açık Gemini sekmesi bulunamadı, sonraki hesaba geçiliyor.`);
        continue;
      }

      // Google hesabı oturum kontrolü (Giriş yapılmamışsa beklemeden anında atla!)
      const isLoggedIn = await checkPortLoggedIn(port, tab);
      if (!isLoggedIn) {
        console.warn(`[VideoGen Pool] ⚠️ Port ${port} üzerinde Google Gemini oturumu AÇIK DEĞİL. Bu hesap atlanıyor.`);
        accountPool[port] = accountPool[port] || {};
        accountPool[port].notLoggedIn = true;
        continue;
      }

      accountPool[port] = accountPool[port] || {};
      accountPool[port].notLoggedIn = false;
      accountPool[port].lastUsed = Date.now();

      // 1. Önce doğrudan bu porttaki ChatGPT Web sekmesine girip promptu ürettir!
      console.log(`[VideoGen Pool] 🤖 Port ${port} ChatGPT Web sekmesinden reklam promptu isteniyor...`);
      let fullPrompt = await generatePromptWithChatGptWeb(port, options);
      if (!fullPrompt) {
        console.log(`[VideoGen Pool] ChatGPT Web promptu oluşturamadı, yerel sinematik şablon devrede.`);
        fullPrompt = await enhanceVideoPrompt(options);
      } else {
        console.log(`[VideoGen Pool] 🎯 ChatGPT Web promptu başarıyla alındı ve Gemini'ye iletiliyor!`);
      }

      const result = await attemptGenerateOnCdp(port, tab, { ...options, fullPrompt });

      if (result.isLimited) {
        const cooldownMs = 2 * 60 * 60 * 1000; // 2 saatlik bekleme penceresi
        accountPool[port].limitedUntil = Date.now() + cooldownMs;
        accountPool[port].limitReason = result.reason;
        console.warn(`[VideoGen Pool] ⚠️ Port ${port} kota sınırına ulaştı (${result.reason}). Havuzdaki sonraki hesaba otomatik geçiliyor...`);
        continue; // Sonraki hesaba geç!
      }

      // Başarılı!
      accountPool[port].limitedUntil = 0;
      accountPool[port].limitReason = null;
      console.log(`[VideoGen Pool] ✅ Video üretimi başarıyla tamamlandı (Hesap Portu: ${port})!`);
      return result;

    } catch (err) {
      console.error(`[VideoGen Pool] Port ${port} üzerinde hata:`, err.message);
      lastError = err;
    }
  }

  // Eğer tüm Gemini hesapları kota sınırına ulaştıysa veya hata verdiyse Google Flow (Veo 3.1) yedek motoruna otomatik geç!
  console.log(`[VideoGen Pool] 🎬 Gemini havuzu kotada veya yanıt vermedi. Google Flow (Veo 3.1) yüksek kapasiteli yedek motoruna devrediliyor...`);
  try {
    return await generateVideoOnFlow(options);
  } catch (flowErr) {
    console.error(`[VideoGen Pool] Google Flow hatası:`, flowErr.message);
    throw lastError || flowErr;
  }
}

/**
 * Google Flow (Veo 3.1) Video Üretim Motoru
 * Pro hesap ile kota engeline takılmadan aylık kredi havuzundan saf 9:16 ticari video üretir.
 */
async function generateVideoOnFlow(options = {}) {
  const port = options.port || 9222;
  const projectUrl = options.projectUrl || 'https://flow.google.com/project/6b718bdf-9bf3-44c3-8b65-4c8f9110c8c5';
  
  let prompt = options.fullPrompt;
  if (!prompt) {
    if (options.prompt && options.prompt.length >= 80) {
      console.log(`[Flow Video] 📋 Mevcut detaylı kampanya promptu doğrudan kullanılıyor (${options.prompt.length} karakter).`);
      prompt = options.prompt;
    } else {
      console.log(`[Flow Video] 🤖 ChatGPT Web üzerinden marka kitiyle reklam promptu hazırlanıyor...`);
      prompt = await generatePromptWithChatGptWeb(port, options);
    }
  }
  if (!prompt) {
    prompt = await enhanceVideoPrompt(options);
  }

  console.log(`[Flow Video] 🎬 Google Flow (Veo 3.1) üzerinden video üretimi başlatılıyor...`);
  const newTabRes = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(projectUrl)}`, { method: 'PUT' });
  const tab = await newTabRes.json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);

  let msgId = 1;
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      const handler = (m) => {
        const d = JSON.parse(m.toString());
        if (d.id === id) {
          ws.removeListener('message', handler);
          if (d.error) reject(d.error);
          else resolve(d.result);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await sleep(6000);

  // İndirme dizinini yapılandır
  try {
    await send('Browser.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: OUTPUT_DIR,
      eventsEnabled: true
    });
  } catch(e) {}
  try {
    await send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: OUTPUT_DIR
    });
  } catch(e) {}

  // 1. ProseMirror editörünü odakla
  const targetInfo = await send('Runtime.evaluate', {
    expression: `(() => {
      const pm = document.querySelector('flow-rich-text-editor div.ProseMirror') || document.querySelector('div.ProseMirror');
      if (!pm) return null;
      pm.focus();
      const r = pm.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`,
    returnByValue: true
  });

  if (!targetInfo?.result?.value) {
    ws.close();
    await fetch(`http://127.0.0.1:${port}/json/close/${tab.id}`);
    throw new Error('Google Flow metin editörü (ProseMirror) bulunamadı.');
  }

  const { x, y } = targetInfo.result.value;
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await sleep(500);

  // 1.5. Mevcut tile sayısını kaydet
  const baselineTiles = await send('Runtime.evaluate', {
    expression: `document.querySelectorAll('.tile, flow-tile, flow-media-tile, div[class*="tile"], div[class*="virtual-item"]').length`,
    returnByValue: true
  });
  const initialTileCount = Number(baselineTiles?.result?.value) || 0;

  // 2. Promptu yaz
  await send('Input.insertText', { text: prompt });
  await sleep(1000);

  // 3. Üretimi başlat butonuna tıkla
  const submitBtn = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('button[aria-label="Start generation"]') ||
                  Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('arrow_forward') || b.querySelector('mat-icon')?.innerText === 'arrow_forward');
      if (btn && !btn.disabled) {
        const r = btn.getBoundingClientRect();
        return { x: r.left + r.width/2, y: r.top + r.height/2 };
      }
      return null;
    })()`,
    returnByValue: true
  });

  if (!submitBtn?.result?.value) {
    ws.close();
    await fetch(`http://127.0.0.1:${port}/json/close/${tab.id}`);
    throw new Error('Google Flow video üretim başlatma butonu bulunamadı.');
  }

  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: submitBtn.result.value.x, y: submitBtn.result.value.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: submitBtn.result.value.x, y: submitBtn.result.value.y, button: 'left', clickCount: 1 });
  console.log(`[Flow Video] Üretim başlatıldı! Onay ve render kontrolü yapılıyor...`);

  // 4. Onay penceresi çıkarsa otomatik onayla
  await sleep(4000);
  await send('Runtime.evaluate', {
    expression: `(() => {
      const allEls = Array.from(document.querySelectorAll('button, .action-button, [role="button"], span.option-label'));
      const app = allEls.find(el => (el.innerText || '').trim() === 'Always approve' || (el.innerText || '').trim() === 'Approve');
      if (app) app.click();
    })()`
  });

  // 5. Video tile'ını bekle (en fazla 180 saniye)
  let videoTileFound = false;
  const startTime = Date.now();
  while (Date.now() - startTime < 180000) {
    await sleep(5000);
    const checkTile = await send('Runtime.evaluate', {
      expression: `(() => {
        const tiles = Array.from(document.querySelectorAll('.tile, flow-tile, flow-media-tile, div[class*="tile"], div[class*="virtual-item"]'));
        const newTiles = tiles.length > ${initialTileCount} ? tiles.slice(${initialTileCount}) : tiles;
        const playTile = newTiles.find(t => {
          const text = (t.innerText || '').toLowerCase();
          const isFinished = !text.includes('generating') && !text.includes('rendering') && !text.includes('bekleniyor');
          return (text.includes('play_circle') || t.querySelector('video') || t.querySelector('[aria-label*="Play"]')) && isFinished;
        });
        if (playTile) {
          const r = playTile.getBoundingClientRect();
          return { found: true, x: r.left + r.width/2, y: r.top + r.height/2 };
        }
        return { found: false };
      })()`,
      returnByValue: true
    });

    if (checkTile?.result?.value?.found) {
      videoTileFound = true;
      const tx = checkTile.result.value.x;
      const ty = checkTile.result.value.y;
      console.log(`[Flow Video] 🎬 Video render tamamlandı! Tile açılıyor (${tx}, ${ty})...`);
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: tx, y: ty, button: 'left', clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: tx, y: ty, button: 'left', clickCount: 1 });
      await sleep(2500);
      break;
    }
  }

  if (!videoTileFound) {
    ws.close();
    await fetch(`http://127.0.0.1:${port}/json/close/${tab.id}`);
    throw new Error('Google Flow video render işlemi zaman aşımına uğradı (120sn).');
  }

  // 6. Download butonuna tıkla
  const dlBtn = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('button[aria-label="Download media"]') ||
                  document.querySelector('button[aria-label*="download" i]');
      if (btn) {
        const r = btn.getBoundingClientRect();
        return { x: r.left + r.width/2, y: r.top + r.height/2 };
      }
      return null;
    })()`,
    returnByValue: true
  });

  if (dlBtn?.result?.value) {
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: dlBtn.result.value.x, y: dlBtn.result.value.y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: dlBtn.result.value.x, y: dlBtn.result.value.y, button: 'left', clickCount: 1 });
    await sleep(1500);

    // 7. 720p seçeneğini tıkla
    await send('Runtime.evaluate', {
      expression: `(() => {
        const items = Array.from(document.querySelectorAll('[role="menuitem"], .mat-mdc-menu-item, button'));
        const target = items.find(i => i.innerText.includes('720p') || i.innerText.includes('Original size'));
        if (target) target.click();
      })()`
    });
    console.log(`[Flow Video] 📥 İndirme tetiklendi, dosya bekleniyor...`);
    await sleep(10000);
  }

  ws.close();
  await fetch(`http://127.0.0.1:${port}/json/close/${tab.id}`);

  // 8. Dosya ve thumbnail oluştur
  const timestamp = Date.now();
  const rawFileName = `video_${timestamp}_flow.mp4`;
  const thumbFileName = `video_${timestamp}_flow_thumb.jpg`;
  const rawPath = path.join(OUTPUT_DIR, rawFileName);
  const thumbPath = path.join(OUTPUT_DIR, thumbFileName);

  const downloadedCandidate = path.join(OUTPUT_DIR, 'download');
  if (fs.existsSync(downloadedCandidate)) {
    fs.renameSync(downloadedCandidate, rawPath);
  } else {
    const files = fs.readdirSync(OUTPUT_DIR).map(f => ({ name: f, time: fs.statSync(path.join(OUTPUT_DIR, f)).mtimeMs })).sort((a, b) => b.time - a.time);
    const recent = files.find(f => f.name.endsWith('.mp4') && f.name !== rawFileName && Date.now() - f.time < 60000);
    if (recent) {
      fs.copyFileSync(path.join(OUTPUT_DIR, recent.name), rawPath);
    }
  }

  try {
    const { execSync } = require('child_process');
    execSync(`ffmpeg -y -ss 00:00:03 -i "${rawPath}" -frames:v 1 -update 1 "${thumbPath}"`, { stdio: 'ignore' });
  } catch(e) {}

  return {
    success: true,
    engine: 'Google Flow (Veo 3.1)',
    videoUrl: `http://${PUBLIC_HOST}:${PORT}/outputs/${rawFileName}`,
    thumbnailUrl: `http://${PUBLIC_HOST}:${PORT}/outputs/${thumbFileName}`,
    duration: 10,
    aspectRatio: '9:16',
    creditsRemaining: 1035,
  };
}

function getRecentVideos() {
  try {
    if (!fs.existsSync(OUTPUT_DIR)) return [];
    const files = fs.readdirSync(OUTPUT_DIR);
    const mp4Files = files.filter(f => (f.startsWith('video_') || f.startsWith('flow_') || f.includes('commercial') || f.includes('bofe')) && f.endsWith('.mp4'));
    return mp4Files.map(file => {
      const fullPath = path.join(OUTPUT_DIR, file);
      const stat = fs.statSync(fullPath);
      const id = file.replace(/_raw\.mp4$/, '').replace(/\.mp4$/, '');
      let thumbFile = `${id}_thumb.jpg`;
      if (!fs.existsSync(path.join(OUTPUT_DIR, thumbFile))) {
        const alt = `${file.replace(/\.mp4$/, '')}_thumb.jpg`;
        if (fs.existsSync(path.join(OUTPUT_DIR, alt))) {
          thumbFile = alt;
        } else {
          try {
            execSync(`ffmpeg -y -ss 00:00:01 -i "${fullPath}" -vframes 1 -q:v 2 "${path.join(OUTPUT_DIR, thumbFile)}" 2>/dev/null`);
          } catch(e){}
        }
      }
      const hasThumb = fs.existsSync(path.join(OUTPUT_DIR, thumbFile));
      return {
        id,
        filename: file,
        videoUrl: `http://${PUBLIC_HOST}:${PORT}/outputs/${file}`,
        thumbnailUrl: hasThumb ? `http://${PUBLIC_HOST}:${PORT}/outputs/${thumbFile}` : null,
        sizeMb: (stat.size / (1024 * 1024)).toFixed(2),
        createdAt: stat.mtime.toISOString(),
        timestamp: stat.mtimeMs,
      };
    }).sort((a, b) => b.timestamp - a.timestamp).slice(0, 16);
  } catch (err) {
    console.warn('[VideoGen] getRecentVideos hatası:', err.message);
    return [];
  }
}
const CONFIG_FILE = '/app/gateway/accounts_config.json';

function loadAccountsConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (e) {
    console.warn('[VideoGen] Config okunamadı, varsayılanlar kullanılacak:', e.message);
  }
  return {
    accounts: {
      9222: { name: 'Ali Düvenci (Pro - Flow & Gemini)', email: 'jeynjones@gmail.com', enabled: true },
      9223: { name: 'Ali Düvenci (2. Gemini Hesabı)', email: 'icnevudila@gmail.com', enabled: true },
      9224: { name: '3. Havuz Hesabı (Port 9224)', email: null, enabled: true },
      9225: { name: '4. Havuz Hesabı (Port 9225)', email: null, enabled: true }
    },
    flow: {
      initialCredits: 1050,
      usedVideos: 2,
      creditsPerVideo: 15
    }
  };
}

function saveAccountsConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  } catch (e) {
    console.warn('[VideoGen] Config kaydedilemedi:', e.message);
  }
}

async function verifyAccount(port) {
  try {
    const tabsRes = await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(3500) });
    if (!tabsRes.ok) return { port, ok: false, error: 'Port yanıt vermiyor (Chrome kapalı olabilir)' };
    const tabs = await tabsRes.json();
    let gemTab = tabs.find(t => t.type === 'page' && t.url && t.url.includes('gemini.google.com'));

    if (!gemTab) {
      const createRes = await fetch(`http://127.0.0.1:${port}/json/new?https://gemini.google.com/`, { method: 'PUT' });
      gemTab = await createRes.json();
      await sleep(3500);
    }

    const ws = new WebSocket(gemTab.webSocketDebuggerUrl);
    const checkFn = function() {
      const body = document.body ? document.body.innerText : '';
      const signIn = body.includes('Sign in') || body.includes('Oturum aç') || !!document.querySelector('a[href*="accounts.google.com/ServiceLogin"]');
      const accBtn = document.querySelector('a[href*="SignOutOptions"], button[aria-label*="Google Account"], a[aria-label*="Google Hesabı"], button[id*="profile"], div[aria-label*="Google Account"]');
      const aria = accBtn ? (accBtn.getAttribute('aria-label') || accBtn.innerText || '') : '';
      
      let email = null;
      let accountName = null;
      const em = aria.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (em) email = em[1];

      const nm = aria.match(/Google (?:Account|Hesab[ıi]):\s*([^\n(]+)/i);
      if (nm) accountName = nm[1].trim();

      const isLimited = body.includes("reached your limit") || body.includes("Daha sonra tekrar deneyin") || body.includes("quota exceeded");
      return {
        isLoggedIn: !signIn && (!!accBtn || !!email),
        email: email,
        accountName: accountName || email || null,
        rawAria: aria,
        isLimited: isLimited,
        title: document.title
      };
    };

    const res = await new Promise((resolve) => {
      const timer = setTimeout(() => { ws.close(); resolve({ ok: false, error: 'CDP timeout' }); }, 8000);
      ws.on('open', () => {
        ws.send(JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: {
            expression: `(${checkFn.toString()})()`,
            returnByValue: true
          }
        }));
      });
      ws.on('message', (m) => {
        const d = JSON.parse(m.toString());
        if (d.id === 1) {
          clearTimeout(timer);
          ws.close();
          const val = d.result?.result?.value || {};
          resolve({ ok: true, ...val });
        }
      });
      ws.on('error', (err) => {
        clearTimeout(timer);
        resolve({ ok: false, error: err.message });
      });
    });

    if (res.ok) {
      const cfg = loadAccountsConfig();
      cfg.accounts = cfg.accounts || {};
      cfg.accounts[port] = {
        name: res.accountName || cfg.accounts[port]?.name || `Hesap (Port ${port})`,
        email: res.email || cfg.accounts[port]?.email || null,
        enabled: true,
        lastVerified: new Date().toISOString()
      };
      saveAccountsConfig(cfg);

      accountPool[port] = accountPool[port] || {};
      accountPool[port].notLoggedIn = !res.isLoggedIn;
      if (res.isLimited) {
        accountPool[port].limitedUntil = Date.now() + 6 * 3600 * 1000;
        accountPool[port].limitReason = 'Google Gemini günlük video/istek sınırına ulaştı';
      } else {
        accountPool[port].limitedUntil = 0;
        accountPool[port].limitReason = null;
      }
    }

    return { port, ...res };
  } catch (err) {
    return { port, ok: false, error: err.message };
  }
}

function resetAccountLimit(port) {
  const p = parseInt(port, 10);
  if (accountPool[p]) {
    accountPool[p].limitedUntil = 0;
    accountPool[p].limitReason = null;
  }
  return { ok: true, port: p, message: `Port ${p} kotası sıfırlandı ve aktif havuza alındı.` };
}

async function provisionAccountSlot(port, name, flowProjectUrl) {
  const p = parseInt(port, 10);
  if (!p || p < 9222 || p > 9240) {
    throw new Error('Geçersiz port numarası (9222-9240 arası olmalıdır)');
  }

  if (!CDP_PORTS.includes(p)) {
    CDP_PORTS.push(p);
  }

  const profileDir = p === 9222 ? '/data/chromium-profile' : `/data/chromium-profile-${p}`;
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }

  // Portta Chrome açık mı kontrol et
  let isOpen = false;
  try {
    const res = await fetch(`http://127.0.0.1:${p}/json/version`, { signal: AbortSignal.timeout(1200) });
    if (res.ok) isOpen = true;
  } catch (e) {}

  if (!isOpen) {
    try {
      const { spawn } = require('child_process');
      const child = spawn('/usr/bin/google-chrome-stable', [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-search-engine-choice-screen',
        `--user-data-dir=${profileDir}`,
        `--remote-debugging-port=${p}`,
        'https://accounts.google.com/ServiceLogin',
        'https://gemini.google.com/',
        'https://flow.google.com/'
      ], {
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, DISPLAY: ':99' }
      });
      child.unref();
      await sleep(3000);
    } catch (err) {
      console.warn(`[VideoGen] Port ${p} başlatılamadı:`, err.message);
    }
  } else {
    // Chrome zaten açıksa Flow sekmesini aç/kontrol et
    try {
      await fetch(`http://127.0.0.1:${p}/json/new?https://flow.google.com/`, { method: 'PUT' });
    } catch (e) {}
  }

  const cfg = loadAccountsConfig();
  cfg.accounts = cfg.accounts || {};
  cfg.accounts[p] = {
    name: name || cfg.accounts[p]?.name || `Port ${p} Hesabı`,
    email: cfg.accounts[p]?.email || null,
    flowProjectUrl: flowProjectUrl || cfg.accounts[p]?.flowProjectUrl || null,
    enabled: true,
    addedAt: new Date().toISOString()
  };
  saveAccountsConfig(cfg);

  return {
    ok: true,
    port: p,
    name: cfg.accounts[p].name,
    flowProjectUrl: cfg.accounts[p].flowProjectUrl,
    vncUrl: `http://${PUBLIC_HOST}:6080/vnc.html`,
    message: `Port ${p} için Chrome, Gemini ve Flow oturumları hazırlandı.`
  };
}

/**
 * Belirli bir slotun Flow Creative Studio proje linkini ve kredi ayarlarını günceller
 */
async function updateAccountFlow(port, flowProjectUrl, flowCredits) {
  const p = parseInt(port, 10);
  if (!p) throw new Error('Geçerli bir port numarası gereklidir.');
  const url = (flowProjectUrl || '').trim();
  if (!url || !url.startsWith('http')) {
    throw new Error('Geçerli bir Flow proje URLsi giriniz (örn: https://flow.google.com/project/...)');
  }

  const cfg = loadAccountsConfig();
  cfg.accounts = cfg.accounts || {};
  cfg.accounts[p] = cfg.accounts[p] || { name: `Port ${p} Hesabı`, enabled: true };
  cfg.accounts[p].flowProjectUrl = url;
  if (flowCredits !== undefined && flowCredits !== null) {
    cfg.accounts[p].flowCredits = parseInt(flowCredits, 10);
  } else if (!cfg.accounts[p].flowCredits) {
    cfg.accounts[p].flowCredits = 1050;
  }
  cfg.accounts[p].flowInitialCredits = cfg.accounts[p].flowInitialCredits || 1050;
  saveAccountsConfig(cfg);

  // Hetzner'deki Chrome sekmesini Flow projesine yönlendir
  try {
    const tabsRes = await fetch(`http://127.0.0.1:${p}/json`, { signal: AbortSignal.timeout(3000) });
    if (tabsRes.ok) {
      const tabs = await tabsRes.json();
      const flowTab = tabs.find(t => t.type === 'page' && t.url && t.url.includes('flow.google.com'));
      if (flowTab) {
        const ws = new WebSocket(flowTab.webSocketDebuggerUrl);
        ws.on('open', () => {
          ws.send(JSON.stringify({ id: 1, method: 'Page.navigate', params: { url } }));
          setTimeout(() => { try { ws.close(); } catch(e){} }, 2000);
        });
      } else {
        await fetch(`http://127.0.0.1:${p}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
      }
    }
  } catch (err) {
    console.warn(`[VideoGen] Flow sekmesi yönlendirilemedi (Port ${p}):`, err.message);
  }

  return {
    ok: true,
    port: p,
    flowProjectUrl: url,
    flowCredits: cfg.accounts[p].flowCredits,
    message: `Port ${p} için Google Flow projesi başarıyla bağlandı ve aktif edildi.`
  };
}

/**
 * Belirli bir slotun açık Flow sekmesini inceler veya 'New project'e tıklayarak
 * proje URL'sini sıfır kullanıcı çabasıyla 1-tıkta otomatik algılar ve bağlar.
 */
async function autoDetectFlowProject(port) {
  const p = parseInt(port, 10);
  if (!p) throw new Error('Geçerli bir port numarası gereklidir.');

  try {
    const tabsRes = await fetch(`http://127.0.0.1:${p}/json`, { signal: AbortSignal.timeout(4000) });
    if (!tabsRes.ok) throw new Error(`Port ${p} Chrome servisine ulaşılamadı.`);
    const tabs = await tabsRes.json();

    // 1. Zaten açık /project/ sekmesi var mı?
    const existingProjectTab = tabs.find(t => t.type === 'page' && t.url && t.url.includes('flow.google.com/project/'));
    if (existingProjectTab) {
      console.log(`[Flow AutoDetect] Port ${p} için mevcut proje sekmesi bulundu:`, existingProjectTab.url);
      return await updateAccountFlow(p, existingProjectTab.url);
    }

    // 2. flow.google.com sekmesi var mı?
    let flowTab = tabs.find(t => t.type === 'page' && t.url && t.url.includes('flow.google.com'));
    if (!flowTab) {
      const newTabRes = await fetch(`http://127.0.0.1:${p}/json/new?https://flow.google.com/`, { method: 'PUT' });
      if (newTabRes.ok) {
        flowTab = await newTabRes.json();
        await sleep(3500);
      }
    }

    if (!flowTab || !flowTab.webSocketDebuggerUrl) {
      throw new Error(`Port ${p} üzerinde Flow sekmesi bulunamadı veya açılamadı.`);
    }

    const WebSocketClass = globalThis.WebSocket || (() => {
      try { return require('ws'); } catch (e) { return null; }
    })();

    if (!WebSocketClass) throw new Error('WebSocket desteği bulunamadı.');
    const ws = new WebSocketClass(flowTab.webSocketDebuggerUrl);

    let msgId = 1;
    const sendCdp = (method, params = {}) => new Promise((resolve, reject) => {
      const id = msgId++;
      const timer = setTimeout(() => reject(new Error('CDP zaman aşımı')), 8000);
      const handler = (event) => {
        const str = typeof event.data === 'string' ? event.data : event.toString();
        try {
          const parsed = JSON.parse(str);
          if (parsed.id === id) {
            clearTimeout(timer);
            ws.removeEventListener ? ws.removeEventListener('message', handler) : ws.off?.('message', handler);
            resolve(parsed.result);
          }
        } catch(e){}
      };
      ws.addEventListener ? ws.addEventListener('message', handler) : ws.on?.('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });

    const detectedUrl = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        try { ws.close(); } catch(e){}
        reject(new Error('Flow proje tespiti zaman aşımına uğradı.'));
      }, 15000);

      const onOpen = async () => {
        try {
          const evalRes = await sendCdp('Runtime.evaluate', {
            expression: `
              (() => {
                if (window.location.href.includes('/project/')) return window.location.href;
                const a = document.querySelector('a[href*="/project/"]');
                if (a && a.href) return a.href;
                return null;
              })()
            `,
            returnByValue: true
          });

          if (evalRes?.result?.value) {
            clearTimeout(timeout);
            try { ws.close(); } catch(e){}
            return resolve(evalRes.result.value);
          }

          // Butonları tara ve yeni proje oluştur
          await sendCdp('Runtime.evaluate', {
            expression: `
              (() => {
                const el = Array.from(document.querySelectorAll('button, div[role="button"], a')).find(b => {
                  const t = (b.innerText || b.getAttribute('aria-label') || '').toLowerCase();
                  return t.includes('new project') || t.includes('yeni proje') || t.includes('create') || t.includes('start');
                });
                if (el) el.click();
              })()
            `
          });

          await sleep(3500);

          const finalEval = await sendCdp('Runtime.evaluate', {
            expression: `window.location.href`,
            returnByValue: true
          });

          clearTimeout(timeout);
          try { ws.close(); } catch(e){}

          const currentHref = finalEval?.result?.value;
          if (currentHref && currentHref.includes('/project/')) {
            return resolve(currentHref);
          }
          return resolve(null);
        } catch (err) {
          clearTimeout(timeout);
          try { ws.close(); } catch(e){}
          reject(err);
        }
      };

      ws.addEventListener ? ws.addEventListener('open', onOpen) : ws.on?.('open', onOpen);
      ws.addEventListener ? ws.addEventListener('error', reject) : ws.on?.('error', reject);
    });

    if (detectedUrl) {
      console.log(`[Flow AutoDetect] Port ${p} için proje otomatik tespit edildi:`, detectedUrl);
      return await updateAccountFlow(p, detectedUrl);
    } else {
      throw new Error(`Port ${p} üzerinde aktif Flow projesi bulunamadı. Lütfen oturumun açık olduğundan emin olun.`);
    }
  } catch (err) {
    console.error(`[Flow AutoDetect] Port ${p} hatası:`, err.message);
    throw err;
  }
}

/**
 * Kullanıcının kendi tarayıcısından kopyaladığı Google / Flow / ChatGPT çerezlerini
 * doğrudan Hetzner'deki hedef slota enjekte eder (VNC'ye hiç girmeden oturum açar).
 */
async function syncAccountCookies(port, cookieInput, targetPlatform = 'google') {
  const p = parseInt(port, 10);
  if (!p) throw new Error('Geçerli bir port numarası gereklidir.');
  if (!cookieInput || typeof cookieInput !== 'string') {
    throw new Error('Çerez veya oturum verisi gereklidir.');
  }

  const cookies = [];
  const defaultDomain = targetPlatform === 'chatgpt' ? '.chatgpt.com' : '.google.com';
  const trimmed = cookieInput.trim();

  // JSON Array formatı (EditThisCookie / Cookie-Editor)
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsedJson = JSON.parse(trimmed);
      for (const c of parsedJson) {
        if (c.name && c.value) {
          cookies.push({
            name: c.name,
            value: c.value,
            domain: c.domain || defaultDomain,
            path: c.path || '/',
            secure: c.secure !== false,
            httpOnly: !!c.httpOnly,
            sameSite: c.sameSite || 'None',
          });
        }
      }
    } catch (e) {
      // JSON parse başarısızsa string formatına geç
    }
  }

  // String formatı (name=value; name2=val2)
  if (cookies.length === 0) {
    const pairs = trimmed.split(';');
    for (const pair of pairs) {
      const eqIdx = pair.indexOf('=');
      if (eqIdx > 0) {
        const name = pair.slice(0, eqIdx).trim();
        const value = pair.slice(eqIdx + 1).trim();
        if (name && value) {
          cookies.push({
            name,
            value,
            domain: defaultDomain,
            path: '/',
            secure: true,
            httpOnly: name.startsWith('__Secure') || name.startsWith('__Host'),
            sameSite: 'None',
          });
        }
      }
    }
  }

  if (cookies.length === 0) {
    throw new Error('Geçerli bir oturum çerezi okunamadı. Lütfen metni kontrol edin.');
  }

  // Porttaki Chrome sekmesine bağlan ve Network.setCookies gönder
  const tabsRes = await fetch(`http://127.0.0.1:${p}/json`, { signal: AbortSignal.timeout(3500) });
  if (!tabsRes.ok) throw new Error(`Port ${p} Chrome yanıt vermiyor.`);
  const tabs = await tabsRes.json();
  let tab = tabs.find(t => t.type === 'page');
  if (!tab) {
    const targetUrl = targetPlatform === 'chatgpt' ? 'https://chatgpt.com/' : 'https://gemini.google.com/';
    const createRes = await fetch(`http://127.0.0.1:${p}/json/new?${encodeURIComponent(targetUrl)}`, { method: 'PUT' });
    tab = await createRes.json();
    await sleep(2500);
  }

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { ws.close(); reject(new Error('CDP cookie aktarım zaman aşımı')); }, 10000);
    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Network.enable' }));
      ws.send(JSON.stringify({
        id: 2,
        method: 'Network.setCookies',
        params: { cookies }
      }));
    });
    ws.on('message', (m) => {
      const d = JSON.parse(m.toString());
      if (d.id === 2) {
        clearTimeout(timer);
        const targetUrl = targetPlatform === 'chatgpt' ? 'https://chatgpt.com/' : 'https://gemini.google.com/';
        ws.send(JSON.stringify({ id: 3, method: 'Page.navigate', params: { url: targetUrl } }));
        setTimeout(() => {
          try { ws.close(); } catch(e){}
          resolve();
        }, 3000);
      }
    });
    ws.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  await sleep(2500);
  const verifyRes = await verifyAccount(p);

  return {
    ok: true,
    port: p,
    cookiesCount: cookies.length,
    verification: verifyRes,
    message: `${cookies.length} adet oturum çerezi Port ${p}'e aktarıldı ve oturum yenilendi.`
  };
}

/**
 * Hesap slotunu düzenle (ad, pasif/aktif)
 */
function updateAccountSlot(port, { name, enabled }) {
  const p = parseInt(port, 10);
  if (!p) throw new Error('Geçerli bir port numarası gereklidir.');
  const cfg = loadAccountsConfig();
  cfg.accounts = cfg.accounts || {};
  cfg.accounts[p] = cfg.accounts[p] || {};
  if (name !== undefined) cfg.accounts[p].name = (name || '').trim();
  if (enabled !== undefined) cfg.accounts[p].enabled = !!enabled;
  saveAccountsConfig(cfg);
  return { ok: true, port: p, account: cfg.accounts[p] };
}

function getAccountPoolStatus() {
  const now = Date.now();
  const cfg = loadAccountsConfig();
  const accountsMap = cfg.accounts || {};

  return CDP_PORTS.map(port => {
    const info = accountPool[port] || {};
    const isLimited = (info.limitedUntil || 0) > now;
    const cfgAcc = accountsMap[port] || {};

    const defaultNames = {
      9222: 'Ali Düvenci (Pro - Flow & Gemini)',
      9223: 'Ali Düvenci (2. Gemini Hesabı)',
      9224: '3. Havuz Hesabı (Port 9224)',
      9225: '4. Havuz Hesabı (Port 9225)',
    };

    const remainingSec = isLimited ? Math.max(0, Math.round((info.limitedUntil - now) / 1000)) : 0;
    const flowProjectUrl = cfgAcc.flowProjectUrl || (port === 9222 ? 'https://flow.google.com/project/6b718bdf-9bf3-44c3-8b65-4c8f9110c8c5' : null);
    const flowCredits = cfgAcc.flowCredits ?? (port === 9222 ? 1020 : 1050);
    const flowInitialCredits = cfgAcc.flowInitialCredits ?? 1050;

    return {
      port,
      name: cfgAcc.name || defaultNames[port] || `Hesap (Port ${port})`,
      email: cfgAcc.email || (port === 9222 ? 'jeynjones@gmail.com' : (port === 9223 ? 'icnevudila@gmail.com' : null)),
      isLoggedIn: info.notLoggedIn === false || (port === 9222 || port === 9223),
      isLimited,
      secondsUntilReset: remainingSec,
      limitedUntil: isLimited ? new Date(info.limitedUntil).toISOString() : null,
      lastUsed: info.lastUsed ? new Date(info.lastUsed).toISOString() : null,
      limitReason: info.limitReason || null,
      flowProjectUrl,
      flowCredits,
      flowInitialCredits,
      hasFlow: !!flowProjectUrl,
      vncUrl: `http://${PUBLIC_HOST}:6080/vnc.html`,
    };
  });
}

function getAiEngineStatus() {
  const geminiAccounts = getAccountPoolStatus();
  const cfg = loadAccountsConfig();
  const flowCfg = cfg.flow || { initialCredits: 1050, usedVideos: 2, creditsPerVideo: 15 };

  // Çoklu Flow Havuzu Hesapları (Giriş yapılmış veya Flow URLsi atanmış tüm hesaplar)
  const flowAccounts = geminiAccounts.map(a => {
    const creds = a.flowCredits ?? 1050;
    const initCreds = a.flowInitialCredits ?? 1050;
    const isFlowActive = a.isLoggedIn && !!a.flowProjectUrl;
    return {
      port: a.port,
      accountName: a.name,
      email: a.email,
      projectUrl: a.flowProjectUrl || (a.port === 9222 ? 'https://flow.google.com/project/6b718bdf-9bf3-44c3-8b65-4c8f9110c8c5' : null),
      credits: creds,
      initialCredits: initCreds,
      videosRemaining: Math.floor(creds / 15),
      isLoggedIn: a.isLoggedIn,
      hasProjectUrl: !!a.flowProjectUrl,
      status: isFlowActive ? 'active' : (a.isLoggedIn ? 'ready_to_link' : 'not_connected')
    };
  });

  const activeFlowAccounts = flowAccounts.filter(a => a.status === 'active');
  const totalFlowCredits = activeFlowAccounts.length > 0
    ? activeFlowAccounts.reduce((sum, a) => sum + a.credits, 0)
    : 1020;
  const totalFlowInitialCredits = activeFlowAccounts.length > 0
    ? activeFlowAccounts.reduce((sum, a) => sum + a.initialCredits, 0)
    : 1050;
  const totalFlowVideosRemaining = Math.floor(totalFlowCredits / 15);

  const primaryFlow = activeFlowAccounts[0] || flowAccounts[0] || {};

  return {
    success: true,
    timestamp: new Date().toISOString(),
    chatgpt: {
      status: 'online',
      accountName: 'Yahya Gökbey (Plus)',
      port: 9222,
      mode: 'Otonom Web Oturumu (CDP)',
      model: 'Cannes Reklam Filmi Yönetmeni & Prompt Enhancer',
      zeroApiCost: true,
    },
    geminiPool: {
      totalAccounts: geminiAccounts.length,
      activeAccounts: geminiAccounts.filter(a => a.isLoggedIn && !a.isLimited).length,
      limitedAccounts: geminiAccounts.filter(a => a.isLimited).length,
      accounts: geminiAccounts,
      vncUrl: `http://${PUBLIC_HOST}:6080/vnc.html`,
    },
    googleFlow: {
      status: 'online',
      license: 'PRO',
      accountName: activeFlowAccounts.map(a => a.accountName).join(' + ') || primaryFlow.accountName || 'Ali Düvenci (Pro)',
      projectName: 'Çoklu Google Flow Havuzu',
      projectUrl: primaryFlow.projectUrl || 'https://flow.google.com/project/6b718bdf-9bf3-44c3-8b65-4c8f9110c8c5',
      initialCredits: totalFlowInitialCredits,
      credits: totalFlowCredits,
      creditsPerVideo: 15,
      videosRemaining: totalFlowVideosRemaining,
      activeFlowCount: activeFlowAccounts.length,
      totalAccountsCount: flowAccounts.length,
      accounts: flowAccounts,
      watermark: 'Kapalı (Filigransız Saf Reklam)',
      aspectRatio: '9:16 Dikey Reklam',
      model: 'Google Veo 3.1 & Omni 1.1 Flash',
      quotaType: `${activeFlowAccounts.length}x Flow Hesap Havuzu`,
      role: 'Yedek & Yüksek Kapasiteli Video Motoru',
    },
    recentVideos: getRecentVideos(),
  };
}

module.exports = {
  generateVideo,
  generateVideoOnFlow,
  enhanceVideoPrompt,
  getAccountPoolStatus,
  getRecentVideos,
  getAiEngineStatus,
  verifyAccount,
  resetAccountLimit,
  provisionAccountSlot,
  updateAccountFlow,
  autoDetectFlowProject,
  syncAccountCookies,
  updateAccountSlot
};

