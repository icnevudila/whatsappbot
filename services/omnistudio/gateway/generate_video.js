const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OUTPUT_DIR = '/app/gateway/outputs';
const PUBLIC_HOST = process.env.PUBLIC_HOST || '167.233.201.31';
const PORT = process.env.PORT || '3456';

/**
 * Full + Full Sinematik Reklam Prompt Genişleticisi (Veo & AI Video Engine)
 * Kısa veya standart bir brief'i 3 perdeli bir reklam filmi yönetmeni vizyonuna genişletir.
 */
function enhanceVideoPrompt({ prompt, brandName, productName, primaryColor, accentColor, setting }) {
  if (prompt && prompt.length > 200) {
    return prompt; // Zaten detaylı hazırlanmış
  }

  const brand = brandName || 'Kurumsal Marka';
  const product = productName || 'Premium Ürün';
  const bgSetting = setting || 'güneşli ve bereketli bir tarım bahçesi, modern bağ ortamı';
  const colorDesc = primaryColor && accentColor 
    ? `Ürünün gövdesinde mat ${primaryColor} kurumsal tonlar ve ${accentColor} dinamik detaylar.`
    : 'Ürünün gövdesinde birinci sınıf endüstriyel malzeme kalitesi ve kurumsal marka detayları.';

  return [
    `9:16 dikey formatta üst düzey televizyon ve sosyal medya reklam filmi (Instagram Reels & WhatsApp Durum).`,
    `Marka: ${brand}. Ürün: ${product}.`,
    `SAHNE 1 (0-3sn - ÜRÜN MAKRO GİRİŞİ): Kameranın aşırı yakın plan makro (100mm macro lens) odaklanması. ${colorDesc} Ürün gövdesinde '${brand}' logosunun hassas işçiliği ve açma/çalıştırma düğmesi belirginleşiyor. Sinematik sığ alan derinliği (f/1.8), hafif lens parlaması.`,
    `SAHNE 2 (3-7sn - DİNAMİK EYLEM & PERFORMANS): Kamera akıcı gimbal hareketiyle ${bgSetting} içinde ürünü kullanan profesyonel kullanıcıya geçiyor. Ürünün nozulundan çıkan ultra ince mikro sis bulutu, altın saat (golden hour) gün batımı ışığında parıldıyor. 120fps ağır çekim su damlacıkları ve sinematik ışık süzülmeleri.`,
    `SAHNE 3 (7-10sn - KAHRAMAN KAPANIŞ): Kamera geriye doğru açılarak bereketli, yemyeşil doğayı ve ürünün kusursuz performansını geniş açıdan yakalıyor. 4K reklam ajansı estetiği, Arri Alexa sinema renk paleti, canlı ve sıcak renk tonları, sıfır yapaylık, fotogerçekçi reklam çekimi.`
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

        // 1. Şirket / Firma Ayrımı: Bu markaya ait mevcut sohbet var mı kontrol et
        const brandKey = (brandName || '').trim().toLowerCase();
        const chatSelectRes = await sendCmd("Runtime.evaluate", {
          expression: `
            (function() {
              const brand = ${JSON.stringify(brandKey)};
              if (!brand || brand.length < 3) return { found: false };
              const items = Array.from(document.querySelectorAll('a, div[role="button"], [data-test-id="conversation-list-item"]'));
              const match = items.find(el => {
                const txt = (el.innerText || el.getAttribute('aria-label') || '').toLowerCase();
                return txt.includes(brand) && (el.getAttribute('href')?.includes('/app/') || el.className?.includes('conversation'));
              });
              if (match) {
                match.click();
                return { found: true, title: (match.innerText || match.getAttribute('aria-label') || '').trim() };
              }
              return { found: false };
            })()
          `,
          returnByValue: true
        });

        if (chatSelectRes?.result?.value?.found) {
          console.log(`[VideoGen] Firmaya özel mevcut sohbet açıldı: "${chatSelectRes.result.value.title}"`);
          await new Promise(r => setTimeout(r, 2000));
        } else {
          console.log(`[VideoGen] '${brandName || 'Firma'}' için yeni özel sohbet başlatılıyor...`);
          await sendCmd("Runtime.evaluate", {
            expression: `
              (function() {
                const btns = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
                const newChat = btns.find(b => (b.innerText || '').includes('Yeni sohbet') || (b.getAttribute('aria-label') || '').includes('Yeni sohbet'));
                if (newChat) newChat.click();
              })()
            `
          });
          await new Promise(r => setTimeout(r, 2000));
        }

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
        await new Promise(r => setTimeout(r, 1200));

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

        // Video oluşana kadar bekle (max 4 dakika)
        const startTime = Date.now();
        let downloadReady = false;

        while (Date.now() - startTime < 240000) {
          await new Promise(r => setTimeout(r, 6000));
          const checkRes = await sendCmd("Runtime.evaluate", {
            expression: `
              (function() {
                const dlBtns = Array.from(document.querySelectorAll('button[aria-label*="Videoyu indir"], button[aria-label*="videoyu indir"]'));
                const hasVideo = !!document.querySelector('video');
                const isGenerating = document.body.innerText.includes('Videonuzu üretiyorum') || document.body.innerText.includes('Defining');
                return { dlCount: dlBtns.length, hasVideo, isGenerating };
              })()
            `,
            returnByValue: true
          });

          const status = checkRes?.result?.value;
          if (status?.dlCount > 0) {
            console.log("[VideoGen] Video hazırlandı! İndirme tetikleniyor...");
            downloadReady = true;
            break;
          }
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          console.log(`[VideoGen] Veo render bekleniyor (${elapsed}s)...`);
        }

        if (!downloadReady) {
          ws.close();
          throw new Error("Video üretimi zaman aşımına uğradı (4 dakika).");
        }

        // İndirme dizinini ayarla
        const tempDlDir = '/tmp/gemini_dl_' + Date.now();
        fs.mkdirSync(tempDlDir, { recursive: true });

        await sendCmd("Page.setDownloadBehavior", {
          behavior: "allow",
          downloadPath: tempDlDir
        });

        // 'Videoyu indir' butonuna tıkla
        await sendCmd("Runtime.evaluate", {
          expression: `
            (function() {
              const btns = Array.from(document.querySelectorAll('button[aria-label*="Videoyu indir"], button[aria-label*="videoyu indir"]'));
              if (btns.length > 0) {
                btns[btns.length - 1].click();
                return true;
              }
              return false;
            })()
          `
        });

        // Dosyanın diske yazılmasını bekle
        let downloadedFile = null;
        for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 1000));
          const files = fs.readdirSync(tempDlDir).filter(f => f.endsWith('.mp4') && !f.endsWith('.crdownload'));
          if (files.length > 0) {
            downloadedFile = path.join(tempDlDir, files[0]);
            break;
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

        // /public/ dizinine de kopyala
        execSync(`cp -f ${OUTPUT_DIR}/*.mp4 /app/gateway/public/ 2>/dev/null || true`);

        resolve({
          success: true,
          videoId,
          videoUrl: finalUrl,
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
