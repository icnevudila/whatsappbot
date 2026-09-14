/**
 * OmniStudio Background Service Worker
 * Manages gateway polling, tab routing, mutex locks & anti-throttling
 */

let isEngineActive = true;
let isPolling = false;

// İlk Yükleme
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[OmniStudio Background] Yüklendi.');
  await chrome.storage.local.set({
    isEngineActive: true,
    gatewayUrl: 'http://localhost:3456',
    delaySeconds: 8,
    preferredPlatform: 'auto'
  });
  setupAlarms();
});

chrome.runtime.onStartup.addListener(() => {
  setupAlarms();
});

function setupAlarms() {
  chrome.alarms.create('omnistudio_heartbeat', { periodInMinutes: 0.2 }); // 12 saniyede bir tetiklenir
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'omnistudio_heartbeat') {
    pollLoop();
  }
});

// Popup'tan gelen mesajları dinle
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'toggle_engine') {
    isEngineActive = msg.active;
    if (isEngineActive) pollLoop();
    sendResponse({ ok: true });
  } else if (msg.action === 'settings_updated') {
    pollLoop();
    sendResponse({ ok: true });
  }
});

// Ana Polling Döngüsü
async function pollLoop() {
  if (isPolling) return;
  
  const { isEngineActive: active, gatewayUrl = 'http://localhost:3456', delaySeconds = 8 } = 
    await chrome.storage.local.get(['isEngineActive', 'gatewayUrl', 'delaySeconds']);

  if (!active) return;

  isPolling = true;

  try {
    // 1. ChatGPT ve Gemini açık sekmelerini kontrol et
    const gptTab = await findTab("*://chatgpt.com/*");
    const geminiTab = await findTab("*://gemini.google.com/*");

    // 2. Eğer ChatGPT sekmesi varsa ve boştaysa iş çek
    if (gptTab) {
      await tryPullAndExecute(gptTab, 'chatgpt', gatewayUrl, delaySeconds);
    }

    // 3. Eğer Gemini sekmesi varsa ve boştaysa iş çek
    if (geminiTab) {
      await tryPullAndExecute(geminiTab, 'gemini', gatewayUrl, delaySeconds);
    }

  } catch (err) {
    // Ağ veya gateway kapalı olabilir
  } finally {
    isPolling = false;
  }
}

// İşi Gateway'den çek ve sekmeye ilet
async function tryPullAndExecute(tab, platform, gatewayUrl, delaySeconds) {
  try {
    const res = await fetch(`${gatewayUrl}/job/next?platform=${platform}`, { cache: 'no-store' });
    if (!res.ok) return;

    const data = await res.json();
    const job = data?.job;
    if (!job) return; // Boşta iş yok

    console.log(`[OmniStudio] İş alındı: ${job.id} -> ${platform} sekmesine iletiliyor`);

    // Sekmeye mesaj gönder
    chrome.tabs.sendMessage(tab.id, { action: 'EXECUTE_JOB', job, gatewayUrl }, async (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        const errorMsg = chrome.runtime.lastError?.message || response?.error || 'Sekme yanıt vermedi';
        console.warn(`[OmniStudio] İş başarısız oldu (${job.id}):`, errorMsg);
        
        // Kilidi serbest bırak ve hata bildir
        await fetch(`${gatewayUrl}/job/release`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId: job.id, error: errorMsg })
        });
      } else {
        console.log(`[OmniStudio] İş başarıyla tamamlandı: ${job.id}`);
        // Rate limit bekleme payı
        if (delaySeconds > 0) {
          await sleep(delaySeconds * 1000);
        }
      }
    });

  } catch (err) {
    console.error(`[OmniStudio] Poll hatası (${platform}):`, err);
  }
}

async function findTab(urlPattern) {
  try {
    const tabs = await chrome.tabs.query({ url: urlPattern });
    return tabs.length > 0 ? tabs[0] : null;
  } catch (e) {
    return null;
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Sürekli arka plan döngüsü (Keep-Alive Loop)
setInterval(() => {
  pollLoop();
}, 4000);
