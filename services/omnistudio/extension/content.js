/**
 * OmniStudio In-Page Autonomous Engine (content.js)
 * Executes prompt injection & visual extraction on chatgpt.com & gemini.google.com
 */

(function () {
  const isChatGPT = window.location.hostname.includes('chatgpt.com');
  const isGemini = window.location.hostname.includes('gemini.google.com');

  if (!isChatGPT && !isGemini) return;

  console.log(`[OmniStudio Engine] Aktif: ${isChatGPT ? 'ChatGPT' : 'Gemini'}`);

  // Floating HUD Arayüzü Ekle
  const hud = document.createElement('div');
  hud.className = 'omnistudio-hud';
  hud.innerHTML = `
    <span class="omnistudio-hud-dot"></span>
    <span class="omnistudio-hud-text">OmniStudio: Bağlı & Hazır</span>
  `;
  document.body.appendChild(hud);

  function updateHUD(text, state = 'ready') {
    hud.className = `omnistudio-hud ${state}`;
    const span = hud.querySelector('.omnistudio-hud-text');
    if (span) span.textContent = `OmniStudio: ${text}`;
  }

  // Sayfadaki tüm görselleri URL olarak listele
  function getCurrentImageUrls() {
    return Array.from(document.querySelectorAll('img'))
      .map(img => img.src)
      .filter(Boolean);
  }

  // Background Worker'dan gelen komutları dinle
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'PING') {
      sendResponse({ status: 'ready', platform: isChatGPT ? 'chatgpt' : 'gemini' });
      return true;
    }

    if (message.action === 'EXECUTE_JOB') {
      const job = message.job;
      const gatewayUrl = message.gatewayUrl || 'http://localhost:3456';

      updateHUD(`Görsel Üretiliyor (#${job.id.slice(0, 6)})`, 'busy');

      if (isChatGPT) {
        runChatGPTJob(job, gatewayUrl)
          .then(res => sendResponse(res))
          .catch(err => sendResponse({ success: false, error: err.message }));
      } else if (isGemini) {
        runGeminiJob(job, gatewayUrl)
          .then(res => sendResponse(res))
          .catch(err => sendResponse({ success: false, error: err.message }));
      }

      return true; // Asenkron yanıt garantisi
    }
  });

  // =========================================================================
  // 1. ChatGPT Otomasyon Motoru
  // =========================================================================
  async function runChatGPTJob(job, gatewayUrl) {
    const beforeImages = new Set(getCurrentImageUrls());
    const promptText = job.prompt;

    // Input alanını bul
    const textarea = document.querySelector('#prompt-textarea') || 
                     document.querySelector('div[contenteditable="true"]') ||
                     document.querySelector('textarea');

    if (!textarea) {
      updateHUD('Hata: Prompt kutusu bulunamadı', 'error');
      throw new Error('ChatGPT prompt textarea bulunamadı');
    }

    // Odaklan
    textarea.focus();

    // Değeri enjekte et
    if (textarea.tagName === 'DIV' || textarea.getAttribute('contenteditable') === 'true') {
      textarea.innerHTML = `<p>${promptText}</p>`;
    } else {
      textarea.value = promptText;
    }

    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));

    await sleep(600);

    // Gönder butonuna tıkla
    const sendBtn = document.querySelector('button[data-testid="send-button"]') ||
                    document.querySelector('button[aria-label*="Send"]') ||
                    document.querySelector('button[aria-label*="Gönder"]');

    if (sendBtn && !sendBtn.disabled) {
      sendBtn.click();
    } else {
      // Enter tuşu bas
      textarea.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
      }));
    }

    updateHUD('Görsel Bekleniyor...', 'busy');

    // Görselin düşmesini bekle (Maks 110 saniye)
    let foundUrl = null;
    let attempts = 0;

    while (attempts < 55) {
      await sleep(2000);
      attempts++;

      const current = getCurrentImageUrls();
      const added = current.filter(src => 
        !beforeImages.has(src) && 
        (src.includes('oaiusercontent') || src.includes('dall-e') || src.startsWith('blob:'))
      );

      if (added.length > 0) {
        foundUrl = added[added.length - 1];
        break;
      }
    }

    if (!foundUrl) {
      updateHUD('Hata: Görsel zaman aşımı', 'error');
      throw new Error('ChatGPT görsel zaman aşımı (110s)');
    }

    updateHUD('Görsel Yükleniyor...', 'busy');

    // Blob çekip Gateway'e yükle
    return await uploadToGateway(foundUrl, job, gatewayUrl);
  }

  // =========================================================================
  // 2. Google Gemini Otomasyon Motoru
  // =========================================================================
  async function runGeminiJob(job, gatewayUrl) {
    const beforeImages = new Set(getCurrentImageUrls());
    // Gemini'de Imagen 3'ü tetiklemek için prompt'un başına Türkçe veya İngilizce çizim direktifi eklenebilir
    const promptText = job.prompt.toLowerCase().includes('generate') || job.prompt.toLowerCase().includes('çiz') 
      ? job.prompt 
      : `Generate a high quality image: ${job.prompt}`;

    // Gemini rich text area
    const richInput = document.querySelector('rich-textarea') || 
                      document.querySelector('.ql-editor') ||
                      document.querySelector('textarea[aria-label*="prompt"]') ||
                      document.querySelector('div[contenteditable="true"]');

    if (!richInput) {
      updateHUD('Hata: Gemini input bulunamadı', 'error');
      throw new Error('Gemini input kutusu bulunamadı');
    }

    const editor = richInput.querySelector('.ql-editor') || richInput;
    editor.focus();

    // Text injection
    if (editor.tagName === 'DIV' || editor.getAttribute('contenteditable') === 'true') {
      editor.innerHTML = `<p>${promptText}</p>`;
    } else {
      editor.value = promptText;
    }

    editor.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(600);

    // Gönder butonu
    const sendBtn = document.querySelector('button[aria-label*="Gönder"]') ||
                    document.querySelector('button[aria-label*="Send"]') ||
                    document.querySelector('.send-button');

    if (sendBtn) {
      sendBtn.click();
    } else {
      editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
    }

    updateHUD('Imagen 3 Bekleniyor...', 'busy');

    // Görsel bekle
    let foundUrl = null;
    let attempts = 0;

    while (attempts < 55) {
      await sleep(2000);
      attempts++;

      const current = getCurrentImageUrls();
      const added = current.filter(src => 
        !beforeImages.has(src) && 
        (src.includes('googleusercontent.com') || src.includes('lh3.googleusercontent') || src.startsWith('blob:'))
      );

      if (added.length > 0) {
        foundUrl = added[added.length - 1];
        break;
      }
    }

    if (!foundUrl) {
      updateHUD('Hata: Görsel zaman aşımı', 'error');
      throw new Error('Gemini görsel zaman aşımı (110s)');
    }

    updateHUD('Görsel Yükleniyor...', 'busy');
    return await uploadToGateway(foundUrl, job, gatewayUrl);
  }

  // =========================================================================
  // 3. Gateway'e Yükleme
  // =========================================================================
  async function uploadToGateway(imageUrl, job, gatewayUrl) {
    try {
      const resp = await fetch(imageUrl);
      const blob = await resp.blob();

      const filename = `img_${job.id}_${Date.now()}.png`;
      const uploadUrl = `${gatewayUrl}/upload?jobId=${job.id}&filename=${filename}`;

      const postRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'image/png' },
        body: blob
      });

      if (!postRes.ok) {
        throw new Error(`Gateway upload HTTP ${postRes.status}`);
      }

      const postData = await postRes.json();
      updateHUD('Tamamlandı ✓', 'ready');
      return { success: true, url: postData.url, jobId: job.id };
    } catch (err) {
      updateHUD(`Yükleme Hatası: ${err.message}`, 'error');
      throw err;
    }
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
})();
