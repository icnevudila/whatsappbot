/**
 * OmniStudio Extension Popup Logic
 * Realtime dashboard for queue, gallery, platform status & settings
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const toggleWorkerBtn = document.getElementById('toggleWorkerBtn');
  const workspaceSelect = document.getElementById('workspaceSelect');
  
  const chipChatGPT = document.getElementById('chipChatGPT');
  const stateChatGPT = document.getElementById('stateChatGPT');
  const chipGemini = document.getElementById('chipGemini');
  const stateGemini = document.getElementById('stateGemini');
  
  const queueBadge = document.getElementById('queueBadge');
  const galleryBadge = document.getElementById('galleryBadge');
  const queueList = document.getElementById('queueList');
  const queueStatusSummary = document.getElementById('queueStatusSummary');
  const pauseQueueBtn = document.getElementById('pauseQueueBtn');
  const retryFailedBtn = document.getElementById('retryFailedBtn');
  const clearCompletedBtn = document.getElementById('clearCompletedBtn');
  
  const galleryGrid = document.getElementById('galleryGrid');
  const refreshGalleryBtn = document.getElementById('refreshGalleryBtn');
  
  const gatewayUrlInput = document.getElementById('gatewayUrlInput');
  const delayRangeInput = document.getElementById('delayRangeInput');
  const delayValueText = document.getElementById('delayValueText');
  const preferredPlatformSelect = document.getElementById('preferredPlatformSelect');
  const antiThrottleCheck = document.getElementById('antiThrottleCheck');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  
  const lightboxModal = document.getElementById('lightboxModal');
  const closeLightboxBtn = document.getElementById('closeLightboxBtn');
  const closeLightboxBackdrop = document.getElementById('closeLightboxBackdrop');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxPrompt = document.getElementById('lightboxPrompt');
  const lightboxDownloadBtn = document.getElementById('lightboxDownloadBtn');
  const lightboxRetryBtn = document.getElementById('lightboxRetryBtn');

  // Varsayılan Ayarları Yükle
  const settings = await chrome.storage.local.get({
    gatewayUrl: 'http://localhost:3456',
    delaySeconds: 8,
    preferredPlatform: 'auto',
    antiThrottle: true,
    isEngineActive: true,
    selectedWorkspace: 'whatsapp',
    galleryHistory: []
  });

  gatewayUrlInput.value = settings.gatewayUrl;
  delayRangeInput.value = settings.delaySeconds;
  delayValueText.textContent = `${settings.delaySeconds}s`;
  preferredPlatformSelect.value = settings.preferredPlatform;
  antiThrottleCheck.checked = settings.antiThrottle;
  workspaceSelect.value = settings.selectedWorkspace;
  updateEngineStateUI(settings.isEngineActive);

  // Sekme Değiştirme
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');
    });
  });

  // Gecikme Slider
  delayRangeInput.addEventListener('input', (e) => {
    delayValueText.textContent = `${e.target.value}s`;
  });

  // Motor Aç/Kapat
  toggleWorkerBtn.addEventListener('click', async () => {
    const current = await chrome.storage.local.get({ isEngineActive: true });
    const next = !current.isEngineActive;
    await chrome.storage.local.set({ isEngineActive: next });
    updateEngineStateUI(next);
    // Background worker'a bildir
    chrome.runtime.sendMessage({ action: 'toggle_engine', active: next });
  });

  function updateEngineStateUI(active) {
    if (active) {
      toggleWorkerBtn.className = 'btn-toggle-engine active';
      toggleWorkerBtn.querySelector('.engine-text').textContent = 'CANLI';
    } else {
      toggleWorkerBtn.className = 'btn-toggle-engine inactive';
      toggleWorkerBtn.querySelector('.engine-text').textContent = 'DURDU';
    }
  }

  // Workspace Değişimi
  workspaceSelect.addEventListener('change', async (e) => {
    await chrome.storage.local.set({ selectedWorkspace: e.target.value });
  });

  // Ayarları Kaydet
  saveSettingsBtn.addEventListener('click', async () => {
    const newSettings = {
      gatewayUrl: gatewayUrlInput.value.trim() || 'http://localhost:3456',
      delaySeconds: parseInt(delayRangeInput.value, 10),
      preferredPlatform: preferredPlatformSelect.value,
      antiThrottle: antiThrottleCheck.checked,
    };
    await chrome.storage.local.set(newSettings);
    chrome.runtime.sendMessage({ action: 'settings_updated', settings: newSettings });
    saveSettingsBtn.textContent = '✓ Kaydedildi!';
    setTimeout(() => { saveSettingsBtn.textContent = 'Ayarları Kaydet'; }, 1500);
    pollGateway();
  });

  // Platform Sekmelerini Kontrol Et (ChatGPT & Gemini)
  async function checkTabs() {
    try {
      const gptTabs = await chrome.tabs.query({ url: "*://chatgpt.com/*" });
      const geminiTabs = await chrome.tabs.query({ url: "*://gemini.google.com/*" });

      if (gptTabs.length > 0) {
        chipChatGPT.className = 'platform-chip active';
        stateChatGPT.textContent = 'Hazır';
      } else {
        chipChatGPT.className = 'platform-chip';
        stateChatGPT.textContent = 'Sekme Yok';
      }

      if (geminiTabs.length > 0) {
        chipGemini.className = 'platform-chip active';
        stateGemini.textContent = 'Hazır';
      } else {
        chipGemini.className = 'platform-chip';
        stateGemini.textContent = 'Sekme Yok';
      }
    } catch (err) {
      console.warn('Sekmeler sorgulanamadı:', err);
    }
  }

  // Gateway Durumunu Sorgula
  async function pollGateway() {
    const { gatewayUrl } = await chrome.storage.local.get({ gatewayUrl: 'http://localhost:3456' });
    try {
      const res = await fetch(`${gatewayUrl}/stats`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Gateway HTTP ${res.status}`);
      const data = await res.json();
      renderQueue(data);
      if (data.activeWorkers) {
        if (data.activeWorkers.chatgpt) {
          chipChatGPT.className = 'platform-chip busy';
          stateChatGPT.textContent = 'Çiziyor...';
        }
        if (data.activeWorkers.gemini) {
          chipGemini.className = 'platform-chip busy';
          stateGemini.textContent = 'Çiziyor...';
        }
      }
    } catch (err) {
      queueStatusSummary.textContent = '⚠️ Gateway bağlantısı yok';
      queueList.innerHTML = `
        <div class="empty-placeholder">
          <span class="empty-icon">🔌</span>
          <p>Gateway'e ulaşılamadı (${gatewayUrl})</p>
          <span style="font-size:10px;">Lütfen sunucuyu başlatın: <code>node server.js</code></span>
        </div>
      `;
    }
  }

  // Kuyruğu Çiz
  function renderQueue(data) {
    const pending = data.pending || 0;
    const total = data.total || 0;
    const recent = data.recent || [];

    queueBadge.textContent = pending;
    queueStatusSummary.textContent = `${pending} bekleyen iş / ${total} toplam`;

    if (recent.length === 0) {
      queueList.innerHTML = `
        <div class="empty-placeholder">
          <span class="empty-icon">☕</span>
          <p>Kuyrukta iş yok, sistem boşta.</p>
          <span style="font-size:10px;">WhatsApp botundan veya API'den görsel talep edildiğinde otomatik belirecek.</span>
        </div>
      `;
      return;
    }

    queueList.innerHTML = '';
    recent.forEach(job => {
      const div = document.createElement('div');
      div.className = 'queue-item';

      let statusBadge = '';
      if (job.status === 'pending') statusBadge = '<span class="queue-item-badge badge-pending">Sırada</span>';
      else if (job.status === 'processing') statusBadge = '<span class="queue-item-badge badge-processing">Üretiliyor</span>';
      else if (job.status === 'completed') statusBadge = '<span class="queue-item-badge badge-completed">Tamam</span>';
      else if (job.status === 'failed') statusBadge = '<span class="queue-item-badge badge-failed">Hata</span>';

      div.innerHTML = `
        <span class="queue-item-icon">${job.platform === 'gemini' ? '🔵' : '🟢'}</span>
        <div class="queue-item-info">
          <div class="queue-item-prompt" title="${job.prompt}">${job.prompt}</div>
          <div class="queue-item-meta">
            <span>#${job.id.slice(0, 8)}</span>
            <span>·</span>
            <span>${job.workspace || 'WhatsApp'}</span>
            <span>·</span>
            <span>${job.size || '1024x1024'}</span>
          </div>
        </div>
        ${statusBadge}
      `;

      // Tıklayınca tamamlanmışsa lightbox aç
      if (job.status === 'completed' && job.resultUrl) {
        div.style.cursor = 'pointer';
        div.addEventListener('click', () => openLightbox(job.resultUrl, job.prompt));
      }

      queueList.appendChild(div);
    });

    // Galeriye tamamlananları ekle
    syncGallery(recent);
  }

  // Galeri Yönetimi
  async function syncGallery(recentJobs) {
    const completed = recentJobs.filter(j => j.status === 'completed' && j.resultUrl);
    const { galleryHistory = [] } = await chrome.storage.local.get(['galleryHistory']);
    
    // Birleştir
    const map = new Map();
    [...completed, ...galleryHistory].forEach(item => {
      if (item.resultUrl) map.set(item.resultUrl, item);
    });

    const uniqueGallery = Array.from(map.values()).slice(0, 30);
    await chrome.storage.local.set({ galleryHistory: uniqueGallery });
    galleryBadge.textContent = uniqueGallery.length;
    renderGallery(uniqueGallery);
  }

  function renderGallery(items) {
    if (!items || items.length === 0) {
      galleryGrid.innerHTML = `
        <div class="empty-placeholder" style="grid-column: 1 / -1;">
          <span class="empty-icon">🖼️</span>
          <p>Henüz üretilmiş bir görsel yok.</p>
        </div>
      `;
      return;
    }

    galleryGrid.innerHTML = '';
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'gallery-card';
      card.innerHTML = `
        <img src="${item.resultUrl}" alt="Görsel" loading="lazy">
        <div class="gallery-card-overlay">
          <span class="gallery-card-caption">${item.prompt}</span>
        </div>
      `;
      card.addEventListener('click', () => openLightbox(item.resultUrl, item.prompt));
      galleryGrid.appendChild(card);
    });
  }

  // Lightbox
  function openLightbox(url, prompt) {
    lightboxImage.src = url;
    lightboxPrompt.textContent = prompt || 'Görsel önizleme';
    lightboxDownloadBtn.href = url;
    lightboxModal.style.display = 'flex';
  }

  closeLightboxBtn.addEventListener('click', () => { lightboxModal.style.display = 'none'; });
  closeLightboxBackdrop.addEventListener('click', () => { lightboxModal.style.display = 'none'; });

  refreshGalleryBtn.addEventListener('click', async () => {
    const { galleryHistory = [] } = await chrome.storage.local.get(['galleryHistory']);
    renderGallery(galleryHistory);
  });

  // Hatalıları Yeniden Dene
  retryFailedBtn.addEventListener('click', async () => {
    const { gatewayUrl } = await chrome.storage.local.get({ gatewayUrl: 'http://localhost:3456' });
    try {
      const res = await fetch(`${gatewayUrl}/stats`);
      const data = await res.json();
      const failed = (data.recent || []).filter(j => j.status === 'failed');
      for (const job of failed) {
        await fetch(`${gatewayUrl}/v1/images/generations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: job.prompt, platform: job.platform, size: job.size })
        });
      }
      pollGateway();
    } catch (e) {
      console.error(e);
    }
  });

  // İlk kontroller ve döngü
  await checkTabs();
  await pollGateway();
  const pollTimer = setInterval(async () => {
    await checkTabs();
    await pollGateway();
  }, 2500);

  window.addEventListener('unload', () => clearInterval(pollTimer));
});
