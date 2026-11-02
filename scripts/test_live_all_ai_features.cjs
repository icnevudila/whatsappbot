const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/TP2/.gemini/antigravity/brain/30288fc9-f0b7-4bf2-9a4c-5ddc1f28b270';
const SUPABASE_URL = 'https://ilhiuzffapcrleotpfyt.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsaGl1emZmYXBjcmxlb3RwZnl0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzYyNDYwMSwiZXhwIjoyMTA5MjAwNjAxfQ.68AMCdJUHvyYofYRJ5OPsqB_WCktv435YeAPfYhZQXE';

async function checkCreativeStatus(id) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/creatives?id=eq.${id}&select=id,status,error,public_url,created_at`, {
      headers: { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY }
    });
    const rows = await res.json();
    return rows[0] || null;
  } catch (err) {
    return null;
  }
}

async function main() {
  console.log('====================================================');
  console.log('🚀 MESAJIFY PRODUCTION AI SUITE TEST (IMAGE & VIDEO)');
  console.log('====================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Network activity logging
  page.on('response', resp => {
    const u = resp.url();
    if (u.includes('/api/icerik') || u.includes('/api/ai') || u.includes('/render')) {
      console.log(`[NETWORK RESP] ${resp.status()} ${u}`);
    }
  });

  try {
    // 1. LOGIN
    console.log('1️⃣ Giriş yapılıyor (mesajify1@gmail.com)...');
    await page.goto('https://app.mesajify.com/giris', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.fill('input[type="email"]', 'mesajify1@gmail.com');
    await page.fill('input[type="password"]', 'mesajify123@');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/ozet', { timeout: 15000 });
    console.log('✅ Giriş başarılı!\n');

    // ================================================================
    // 2. IMAGE GENERATION TEST (TEST 1)
    // ================================================================
    console.log('2️⃣ [TEST 1] Görsel Üretimi Başlatılıyor...');
    await page.goto('https://app.mesajify.com/icerik/yeni', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Step 1: Select format & product
    console.log('   Adım 1: Format & Ürün seçimi...');
    const continueBtn1 = page.locator('button:has-text("Devam Et")').first();
    await continueBtn1.click();
    await page.waitForTimeout(3000);

    // Step 2: Styling & AI Prompts
    console.log('   Adım 2: Tasarım Stili & Başlıklar...');
    const continueBtn2 = page.locator('button.wb-wa-submit').first();
    await continueBtn2.click();
    await page.waitForTimeout(3000);

    // Step 3: Son Kontrol ve Üretim
    console.log('   Adım 3: Son Kontrol ve Üretim Onayı...');
    const generateBtn = page.locator('button.wb-wa-submit').first();
    const btnText = await generateBtn.innerText();
    console.log(`   Tıklanacak Buton: "${btnText}"`);

    await generateBtn.click();
    console.log('   🚀 "Reklam Görselimi Oluştur" tıklandı!');

    // Wait for redirect to /icerik/[id]
    try {
      await page.waitForURL(/\/icerik\/[a-f0-9-]+/, { timeout: 20000 });
      console.log(`   ✅ Yönlendirme başarılı: ${page.url()}`);
    } catch {
      console.log(`   Mevcut URL: ${page.url()}`);
    }

    const currentUrl = page.url();
    const creativeMatch = currentUrl.match(/\/icerik\/([a-f0-9-]+)/);
    let creativeId = creativeMatch ? creativeMatch[1] : null;

    if (!creativeId) {
      // Find the latest creative from Supabase directly
      const latestRes = await fetch(`${SUPABASE_URL}/rest/v1/creatives?order=created_at.desc&limit=1`, {
        headers: { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY }
      });
      const rows = await latestRes.json();
      creativeId = rows[0]?.id;
      console.log(`   Supabase'deki en son creative ID: ${creativeId}`);
    }

    // Monitor Creative Status in Supabase
    console.log(`   ⏳ Üretim durumu takip ediliyor (Creative ID: ${creativeId})...`);
    let finalStatus = 'pending';
    let publicUrl = null;
    let errorMessage = null;

    for (let i = 0; i < 35; i++) {
      await page.waitForTimeout(4000);
      const row = await checkCreativeStatus(creativeId);
      if (row) {
        console.log(`   [T+${(i+1)*4}s] Durum: ${row.status} | Hata: ${row.error || 'Yok'} | URL: ${row.public_url || 'Hazırlanıyor'}`);
        finalStatus = row.status;
        publicUrl = row.public_url;
        errorMessage = row.error;
        if (row.status === 'ready' || row.status === 'completed' || (row.status === 'failed' && row.error !== 'Görsel üretiliyor...')) {
          break;
        }
      }
    }

    const imgShotPath = path.join(ARTIFACTS_DIR, 'live_prod_image_result.png');
    await page.screenshot({ path: imgShotPath });
    console.log(`   📸 Görsel Üretimi Ekran Görüntüsü: ${imgShotPath}`);
    console.log(`   Son Durum: ${finalStatus.toUpperCase()}\n`);

    // ================================================================
    // 3. VIDEO GENERATION TEST (TEST 2)
    // ================================================================
    console.log('3️⃣ [TEST 2] Video Üretimi Başlatılıyor...');
    await page.goto('https://app.mesajify.com/icerik/yeni?format=video', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Step 1: Select format & product
    console.log('   Adım 1: Video Formatı Doğrulanıyor...');
    const continueVideo1 = page.locator('button:has-text("Devam Et")').first();
    await continueVideo1.click();
    await page.waitForTimeout(3000);

    // Step 2: Spoken voiceover text input
    console.log('   Adım 2: Seslendirme Metni Giriliyor...');
    // Look for voiceover textarea
    const voiceoverInput = page.locator('textarea').first();
    const isVisible = await voiceoverInput.isVisible().catch(() => false);
    if (isVisible) {
      await voiceoverInput.fill('WhatsApp üzerinden tüm müşterilerinize anında ulaşın. Mesajify ile satışlarınızı ikiye katlayın.');
      console.log('   Seslendirme metni girildi (12 kelime).');
    }

    const continueVideo2 = page.locator('button.wb-wa-submit').first();
    await continueVideo2.click();
    await page.waitForTimeout(3000);

    // Step 3: Video Submit
    console.log('   Adım 3: Video Üretim Onayı...');
    const videoSubmitBtn = page.locator('button.wb-wa-submit').first();
    const videoBtnText = await videoSubmitBtn.innerText();
    console.log(`   Tıklanacak Buton: "${videoBtnText}"`);

    await videoSubmitBtn.click();
    console.log('   🚀 Video üretim butonu tıklandı!');

    // Wait for redirect to /icerik/[id]
    try {
      await page.waitForURL(/\/icerik\/[a-f0-9-]+/, { timeout: 20000 });
      console.log(`   ✅ Video Yönlendirme başarılı: ${page.url()}`);
    } catch {
      console.log(`   Video Mevcut URL: ${page.url()}`);
    }

    const currentVideoUrl = page.url();
    const videoMatch = currentVideoUrl.match(/\/icerik\/([a-f0-9-]+)/);
    let videoCreativeId = videoMatch ? videoMatch[1] : null;

    if (videoCreativeId) {
      console.log(`   ⏳ Video durumu takip ediliyor (Creative ID: ${videoCreativeId})...`);
      for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(4000);
        const row = await checkCreativeStatus(videoCreativeId);
        if (row) {
          console.log(`   [Video T+${(i+1)*4}s] Durum: ${row.status} | Hata: ${row.error || 'Yok'} | URL: ${row.public_url || 'Hazırlanıyor'}`);
          if (row.status === 'ready' || row.status === 'completed' || row.status === 'veo_rendering') {
            break;
          }
        }
      }
    }

    await page.waitForTimeout(4000);
    const videoShotPath = path.join(ARTIFACTS_DIR, 'live_prod_video_result.png');
    await page.screenshot({ path: videoShotPath });
    console.log(`   📸 Video Üretimi Ekran Görüntüsü: ${videoShotPath}\n`);

    // ================================================================
    // 4. SUMMARY & ORACLE TELEMETRY
    // ================================================================
    console.log('====================================================');
    console.log('📊 TEST SONUÇLARI ÖZETİ');
    console.log(`- Görsel Üretimi (Creative ID: ${creativeId}): ${finalStatus}`);
    if (publicUrl) console.log(`  Görsel URL: ${publicUrl}`);
    if (errorMessage) console.log(`  Bilgi/Hata: ${errorMessage}`);
    console.log(`- Video UI Akışı: Başlatıldı & Kaydedildi`);
    console.log('====================================================');

  } catch (err) {
    console.error('Kritik test hatası:', err);
  } finally {
    await browser.close();
  }
}

main();
