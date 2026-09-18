const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const WebSocket = globalThis.WebSocket || (() => {
  try { return require('ws'); } catch (e) { return null; }
})();

const OUTPUT_DIR = '/app/gateway/outputs';
const PUBLIC_HOST = process.env.PUBLIC_HOST || '167.233.201.31';
const PORT = process.env.PORT || '3456';

/**
 * Full + Full Sinematik Reklam Prompt Genişleticisi (Veo & AI Video Engine)
 * Kısa veya standart bir brief'i 3 perdeli bir reklam filmi yönetmeni vizyonuna genişletir.
 */
function enhanceVideoPrompt({ prompt, brandName, productName }) {
  if (prompt && prompt.length > 100) {
    // Zaten detaylı hazırlanmış; metinsiz ve logosuz çekim kuralını pekiştir
    if (!prompt.includes('NO TEXT')) {
      return prompt + ' ÖNEMLİ KURAL: Videoda KESİNLİKLE hiçbir yazı, metin, altyazı, logo kartı, bilgi kutusu veya grafik overlay OLMAYACAKTIR. Ekranda sadece %100 saf, temiz ve sinematik canlı çekim video görüntüsü olacaktır. STRICT RULE: NO TEXT, NO WORDS, NO LETTERS, NO TYPOGRAPHY, NO SUBTITLES, NO CAPTIONS, NO ON-SCREEN TEXT, NO LOGO CARDS, NO GRAPHIC OVERLAYS.';
    }
    return prompt;
  }

  const product = productName || 'Ticari Ürün';

  return [
    `9:16 dikey formatta üst düzey televizyon ve sosyal medya reklam filmi (Instagram Reels & WhatsApp Durum).`,
    `Ürün: ${product}.`,
    `SAHNE 1 (0-3sn - MAKRO GİRİŞ): Kameranın aşırı yakın plan makro (100mm macro lens) odaklanması. Ürün yüzeyindeki doğal malzeme dokusu, birinci sınıf işçilik ve kusursuz detaylar. Sinematik sığ alan derinliği (f/1.8), zarif ışık kırılmaları.`,
    `SAHNE 2 (3-7sn - DİNAMİK EYLEM): Kamera akıcı gimbal hareketiyle ürünün kullanımını ve estetiğini yakalıyor. Doğal gün ışığında 120fps ağır çekim sinematik hareketler.`,
    `SAHNE 3 (7-10sn - KAHRAMAN KAPANIŞ): Kamera geriye doğru açılarak sahneyi geniş açıdan kahraman (hero) planında yakalıyor. 4K reklam ajansı estetiği, Arri Alexa sinema renk tonları, kusursuz fotogerçekçi canlı çekim.`,
    `ÖNEMLİ KURAL: Videoda KESİNLİKLE hiçbir yazı, metin, altyazı, logo kartı, bilgi kutusu veya grafik overlay OLMAYACAKTIR. Ekranda sadece %100 saf, temiz ve sinematik canlı çekim video görüntüsü olacaktır.`,
    `STRICT RULE: NO TEXT, NO WORDS, NO LETTERS, NO TYPOGRAPHY, NO SUBTITLES, NO CAPTIONS, NO ON-SCREEN TEXT, NO LOGO CARDS, NO GRAPHIC OVERLAYS, NO BANNERS, NO LOWER THIRDS. Pure clean cinematic live-action commercial footage only.`,
  ].join(' ');
}

async function generateVideo({
  prompt,
  brandName,
  productName,
  subTitle,
  offerTitle,
  offerDetails,
  ctaText,
  primaryColor = '#026009',
  accentColor = '#acfe00',
  logoPath = null,
  includeOverlay = false,
  includeLogo = false,
  includeBanner = false,
  includeCta = false
}) {
  const fullPrompt = enhanceVideoPrompt({
    prompt,
    brandName,
    productName,
    primaryColor,
    accentColor
  });

  console.log(`[VideoGen] Full+Full Prompt hazırlandı: "${fullPrompt.slice(0, 80)}..."`);
  
  // 1. DevTools CDP bağlan
  const listRes = await fetch("http://127.0.0.1:9222/json/list");
  const targets = await listRes.json();
  const tab = targets.find(t => t.url && t.url.includes("gemini.google.com"));
  if (!tab) {
    throw new Error("Gemini tab not found in Chrome CDP!");
  }

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
                  const target = els.find(el => el.children.length === 0 && (el.innerText || el.textContent || '').trim() === 'Dikey (9:16)');
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

        // Promptu yaz
        await sendCmd("Runtime.evaluate", {
          expression: `
            (function() {
              const inputEl = document.querySelector('div[contenteditable="true"]') || 
                              document.querySelector('rich-textarea p') ||
                              document.querySelector('textarea');
              if (!inputEl) throw new Error("Input element bulunamadı");
              inputEl.focus();
              inputEl.innerText = ${JSON.stringify(fullPrompt)};
              inputEl.dispatchEvent(new Event('input', { bubbles: true }));
              inputEl.dispatchEvent(new Event('change', { bubbles: true }));
            })()
          `
        });
        await new Promise(r => setTimeout(r, 1500));

        // Gönder butonuna tıkla
        const btnRes = await sendCmd("Runtime.evaluate", {
          expression: `
            (function() {
              const btns = Array.from(document.querySelectorAll('button'));
              const sendBtn = btns.find(b => {
                const label = (b.getAttribute('aria-label') || '').toLowerCase();
                return label.includes('gönder') || label.includes('send');
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
          await sendCmd("Input.dispatchKeyEvent", { type: "rawKeyDown", windowsVirtualKeyCode: 13, unmodifiedText: "\\r", text: "\\r", modifiers: 2 });
          await sendCmd("Input.dispatchKeyEvent", { type: "keyUp", windowsVirtualKeyCode: 13, modifiers: 2 });
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
                const isSpinnerActive = !!document.querySelector('mat-progress-spinner, mat-progress-bar, [role="progressbar"], button[aria-label*="Durdur" i], button[aria-label*="Stop" i]');
                const videos = Array.from(document.querySelectorAll('video'));
                const hasVideo = videos.some(v => v.readyState >= 2 || v.duration > 0 || (v.src && !v.src.startsWith('blob:null')));
                return { dlCount: dlBtns.length, isSpinnerActive, hasVideo };
              })()
            `,
            returnByValue: true
          });

          const status = checkRes?.result?.value;
          // Veo render en az 25 saniye sürer. Yeni buton başlangıçtan kesinlikle fazla olmalı ve render spinner'ı bitmiş olmalı.
          if (status && status.dlCount > initialDlCount && !status.isSpinnerActive && elapsed >= 25) {
            console.log(`[VideoGen] Yeni video başarıyla render edildi (${elapsed}s)! İndirme tetikleniyor...`);
            downloadReady = true;
            break;
          }
          console.log(`[VideoGen] Veo render bekleniyor (${elapsed}s, yeni_buton: ${status?.dlCount ?? 0} > ${initialDlCount}, aktif_spinner: ${status?.isSpinnerActive})...`);
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

        let finalUrl = `http://${PUBLIC_HOST}:${PORT}/outputs/${videoId}_raw.mp4`;

        // Montaj opsiyoneldir (kullanıcı açıkça istemedikçe logo, bant ve buton koyulmaz, temiz video verilir)
        const shouldMontage = Boolean(includeOverlay || includeLogo || includeBanner || includeCta);
        if (shouldMontage) {
          const montajTarget = path.join(OUTPUT_DIR, `${videoId}_campaign.mp4`);
          let filters = [];

          const fontPath = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
          const fontReg = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
          const primaryHex = (primaryColor || '#026009').replace('#', '0x');
          const accentHex = (accentColor || '#acfe00').replace('#', '0x');

          if (includeLogo && brandName) {
            const safeBrand = (brandName || 'MARKA').replace(/['":]/g, '').replace(/%/g, '%%');
            const safeSub = (subTitle || '').replace(/['":]/g, '').replace(/%/g, '%%');
            filters.push(`drawbox=x=40:y=60:w=640:h=90:color=black@0.65:t=fill`);
            filters.push(`drawtext=fontfile=${fontPath}:text='${safeBrand}':fontcolor=${accentHex}:fontsize=32:x=60:y=80`);
            if (safeSub) {
              filters.push(`drawtext=fontfile=${fontReg}:text='${safeSub}':fontcolor=white:fontsize=22:x=60:y=118`);
            }
          }

          if (includeBanner && offerTitle) {
            const safeOffer = (offerTitle || '').replace(/['":]/g, '').replace(/%/g, '%%');
            const safeDetails = (offerDetails || '').replace(/['":]/g, '').replace(/%/g, '%%');
            filters.push(`drawbox=x=40:y=970:w=640:h=130:color=${primaryHex}@0.85:t=fill`);
            filters.push(`drawbox=x=40:y=970:w=640:h=6:color=${accentHex}:t=fill`);
            filters.push(`drawtext=fontfile=${fontPath}:text='${safeOffer}':fontcolor=${accentHex}:fontsize=22:x=60:y=995`);
            if (safeDetails) {
              filters.push(`drawtext=fontfile=${fontPath}:text='${safeDetails}':fontcolor=white:fontsize=24:x=60:y=1035`);
            }
          }

          if (includeCta && ctaText) {
            const safeCta = (ctaText || 'WHATSAPP SIPARIS VE BILGI').replace(/['":]/g, '').replace(/%/g, '%%');
            filters.push(`drawbox=x=60:y=1120:w=600:h=70:color=0x25D366:t=fill`);
            filters.push(`drawtext=fontfile=${fontPath}:text='${safeCta}':fontcolor=white:fontsize=26:x=(w-text_w)/2:y=1142`);
          }

          if (filters.length > 0) {
            const ffmpegCmd = `ffmpeg -y -i "${rawVideoTarget}" -vf "${filters.join(',')}" -c:a copy "${montajTarget}"`;
            console.log("[VideoGen] FFmpeg montaj çalıştırılıyor...");
            execSync(ffmpegCmd);
            console.log("[VideoGen] Montaj tamamlandı:", montajTarget);
            finalUrl = `http://${PUBLIC_HOST}:${PORT}/outputs/${videoId}_campaign.mp4`;
          }
        }

        const videoFileForThumb = (shouldMontage && fs.existsSync(path.join(OUTPUT_DIR, `${videoId}_campaign.mp4`)))
          ? path.join(OUTPUT_DIR, `${videoId}_campaign.mp4`)
          : rawVideoTarget;

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

    ws.onerror = (err) => reject(new Error("CDP WebSocket hatası: " + err.message));
  });
}

module.exports = { generateVideo, enhanceVideoPrompt };
