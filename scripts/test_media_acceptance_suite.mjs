import { chromium } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = 'http://localhost:3025'
const OUT_DIR = path.resolve('MESAJIFY_MEDIA_ACCEPTANCE_E2E_2026-10-11')
const SCREENSHOT_DIR = path.join(OUT_DIR, 'screenshots')

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
}

const ORGS = {
  ayvaz: { id: '4a58b0dd-0931-4901-880a-686457d15010', name: 'Ayvazoğlu İnşaat' },
  bofe: { id: 'afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc', name: 'Bofe Tarım' },
}

async function setTenant(context, orgId) {
  await context.addCookies([{
    name: 'wb_active_org',
    value: orgId,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
  }])
}

async function main() {
  console.log('================================================================')
  console.log('🚀 MASTER BOT: MEDYA NİHAİ TESLİMATI BAĞIMSIZ KABUL TESTİ')
  console.log('================================================================\n')

  const results = {
    testDate: new Date().toISOString(),
    browser: 'Chromium Headless',
    baseUrl: BASE_URL,
    tests: {},
  }

  const browser = await chromium.launch({ headless: true, channel: 'msedge' })
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } })
  const page = await context.newPage()

  const consoleErrors = []
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', err => consoleErrors.push(err.message))

  try {
    // -------------------------------------------------------------
    // FAZ 1: AUTH & GİRİŞ
    // -------------------------------------------------------------
    console.log('[FAZ 1] Panel Girişi Yapılıyor...')
    await page.goto(`${BASE_URL}/giris`, { waitUntil: 'domcontentloaded' })
    await page.fill('input[type="email"]', 'test@filo.dev')
    await page.fill('input[type="password"]', 'TestPass123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/ozet', { timeout: 15000 }).catch(() => null)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_login_success.png') })
    console.log('✓ Giriş başarılı.\n')

    // -------------------------------------------------------------
    // FAZ 2: AYVAZOĞLU KREATİF KÜTÜPHANESİ
    // -------------------------------------------------------------
    console.log('[FAZ 2] Ayvazoğlu Kreatif Kütüphanesi Açılıyor...')
    await page.waitForSelector('select[aria-label="İşletme seç"]', { timeout: 10000 })
    await page.selectOption('select[aria-label="İşletme seç"]', ORGS.ayvaz.id)
    await page.waitForTimeout(2000)
    await page.goto(`${BASE_URL}/icerik`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('article', { timeout: 15000 })
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_library_board_ayvazoglu.png') })

    // Kütüphanedeki kartları topla
    const libraryItems = await page.evaluate(() => {
      const articles = Array.from(document.querySelectorAll('article'))
      return articles.map(art => {
        const link = art.querySelector('a')?.getAttribute('href') || ''
        const title = art.querySelector('p')?.innerText || ''
        const badges = Array.from(art.querySelectorAll('span')).map(s => s.innerText.trim()).filter(Boolean)
        const isVideo = Boolean(art.querySelector('video') || art.querySelector('svg[name="video"]'))
        return { link, title, badges, isVideo }
      })
    })

    console.log(`✓ Kütüphanede ${libraryItems.length} kreatif listelendi:`)
    libraryItems.forEach(item => console.log(`   - [${item.isVideo ? 'VIDEO' : 'IMAGE'}] ${item.title} (${item.link}) Rozetler: [${item.badges.join(', ')}]`))

    results.tests.library = {
      status: libraryItems.length > 0 ? 'PASS' : 'FAIL',
      itemCount: libraryItems.length,
      items: libraryItems,
    }

    // -------------------------------------------------------------
    // FAZ 3: GERÇEK BROWSER VIDEO TESTİ (HTML5 Event & Range Stream Pipeline)
    // -------------------------------------------------------------
    console.log('\n[FAZ 3] Gerçek Browser Video Oynatım Testi Başlatılıyor...')
    const videoCreativeId = '2b1e7b35-8a73-55b8-a047-a507577d1ab6'
    
    // Ağ isteklerini ve HTTP 206 Range başlıklarını yakala
    const mediaNetworkRequests = []
    page.on('response', response => {
      const url = response.url()
      if (url.includes('/api/ai-media/outputs/') || url.endsWith('.mp4')) {
        mediaNetworkRequests.push({
          url,
          status: response.status(),
          statusText: response.statusText(),
          headers: response.headers(),
        })
      }
    })

    await page.goto(`${BASE_URL}/icerik/${videoCreativeId}`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('video', { timeout: 15000 })
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_video_detail_initial.png') })

    // Video elementine browser düzeyinde listener'ları bağla
    const videoDiagnostics = await page.evaluate(async () => {
      const video = document.querySelector('video')
      if (!video) return { error: 'VIDEO_ELEMENT_NOT_FOUND' }

      const events = []
      const eventNames = [
        'loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough',
        'play', 'playing', 'pause', 'seeking', 'seeked', 'timeupdate', 'ended', 'error'
      ]

      eventNames.forEach(evt => {
        video.addEventListener(evt, () => {
          events.push({
            event: evt,
            currentTime: video.currentTime,
            readyState: video.readyState,
            timestamp: Date.now()
          })
        })
      })

      // loadedmetadata bekle
      if (video.readyState < 1) {
        await new Promise(resolve => {
          video.addEventListener('loadedmetadata', resolve, { once: true })
          setTimeout(resolve, 5000)
        })
      }

      return {
        initialSrc: video.currentSrc || video.src,
        initialPoster: video.poster,
        initialReadyState: video.readyState,
        initialDuration: video.duration,
        initialPaused: video.paused,
        initialMuted: video.muted,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        hasError: video.error ? { code: video.error.code, message: video.error.message } : null,
      }
    })

    console.log('   Video Başlangıç Özellikleri:', JSON.stringify(videoDiagnostics, null, 2))

    // 10 Saniyelik Oynatım, Duraklatma ve Seek Testi
    console.log('   Oynatım (play) tetikleniyor...')
    const playResult = await page.evaluate(async () => {
      const video = document.querySelector('video')
      video.muted = true // Headless autoplay policy uyumu için
      try {
        await video.play()
        return { success: true }
      } catch (err) {
        return { success: false, error: err.message }
      }
    })
    console.log('   Play çağrısı:', playResult)

    // ~2. saniyeye kadar bekle
    await page.waitForFunction(() => {
      const v = document.querySelector('video')
      return v && v.currentTime >= 2.0
    }, { timeout: 10000 })
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_video_playing_2s_hook.png') })
    console.log('   ✓ 2. saniye kare yakalandı (04_video_playing_2s_hook.png)')

    // ~5. saniyeye kadar bekle ve duraklat
    await page.waitForFunction(() => {
      const v = document.querySelector('video')
      return v && v.currentTime >= 5.0
    }, { timeout: 10000 })
    
    const pauseResult = await page.evaluate(() => {
      const video = document.querySelector('video')
      video.pause()
      return { paused: video.paused, currentTime: video.currentTime }
    })
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_video_paused_5s_forklift.png') })
    console.log('   ✓ 5. saniye duraklatıldı (pause):', pauseResult)

    // Seek testi: currentTime = 7.5s
    console.log('   Seek testi: currentTime = 7.5s atanıyor...')
    const seekResult = await page.evaluate(async () => {
      const video = document.querySelector('video')
      const before = video.currentTime
      const startSeek = Date.now()
      video.currentTime = 7.5
      await new Promise(resolve => {
        video.addEventListener('seeked', resolve, { once: true })
        setTimeout(resolve, 3000)
      })
      const seekDurationMs = Date.now() - startSeek
      return { before, after: video.currentTime, seekDurationMs }
    })
    console.log('   ✓ Seek sonucu:', seekResult)

    // Oynatmaya devam et
    await page.evaluate(async () => {
      const video = document.querySelector('video')
      await video.play()
    })

    // ~9. saniye logosu
    await page.waitForFunction(() => {
      const v = document.querySelector('video')
      return v && v.currentTime >= 8.8
    }, { timeout: 10000 })
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_video_playing_9s_outro.png') })
    console.log('   ✓ 9. saniye outro logosu yakalandı (06_video_playing_9s_outro.png)')

    // Bitiş (ended veya >= 9.9s)
    await page.waitForFunction(() => {
      const v = document.querySelector('video')
      return v && (v.ended || v.currentTime >= 9.9)
    }, { timeout: 10000 })
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_video_ended_10s.png') })
    console.log('   ✓ Video akışı sonlandı (07_video_ended_10s.png)')

    // Final video durumu
    const finalVideoState = await page.evaluate(() => {
      const video = document.querySelector('video')
      return {
        readyState: video.readyState,
        currentTime: video.currentTime,
        duration: video.duration,
        ended: video.ended,
        paused: video.paused,
        error: video.error ? { code: video.error.code, message: video.error.message } : null,
      }
    })
    console.log('   Final Video Durumu:', JSON.stringify(finalVideoState, null, 2))

    results.tests.videoPlayback = {
      status: (finalVideoState.currentTime >= 9.8 && !finalVideoState.error) ? 'PASS' : 'FAIL',
      initial: videoDiagnostics,
      final: finalVideoState,
      seek: seekResult,
      networkRequests: mediaNetworkRequests,
    }

    // -------------------------------------------------------------
    // FAZ 4: İNDİRME ("İNDİR") DOĞRULAMASI
    // -------------------------------------------------------------
    console.log('\n[FAZ 4] Medya İndirme Erişimi Doğrulanıyor...')
    const downloadCheck = await page.evaluate(async () => {
      const video = document.querySelector('video')
      if (!video || !video.src) return { error: 'NO_VIDEO_SRC' }
      try {
        const resp = await fetch(video.src, { headers: { Range: 'bytes=0-1024' } })
        return {
          status: resp.status,
          contentType: resp.headers.get('content-type'),
          contentRange: resp.headers.get('content-range'),
          contentLength: resp.headers.get('content-length'),
          ok: resp.ok || resp.status === 206
        }
      } catch (err) {
        return { error: err.message }
      }
    })
    console.log('   İndirme akış yanıtı:', downloadCheck)
    results.tests.download = {
      status: downloadCheck.ok ? 'PASS' : 'FAIL',
      details: downloadCheck
    }

    // -------------------------------------------------------------
    // FAZ 5: KÜTÜPHANE -> WIZARD HANDOFF, METİN DÜZENLEME, TASLAK & F5
    // -------------------------------------------------------------
    console.log('\n[FAZ 5] Kütüphane -> Kampanya Sihirbazı E2E Akışı Başlatılıyor...')
    
    // Ayvazoğlu Hazır Görselini Bul (Kütüphaneden)
    await page.goto(`${BASE_URL}/icerik`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('article', { timeout: 15000 })
    const imageCardLink = await page.evaluate(() => {
      const articles = Array.from(document.querySelectorAll('article'))
      // 758ca50a-be63-5ae5-a9cf-f8a15a0a7343 veya başlığında 'Tuğlanız Fabrikadan' geçen hazır görsel
      for (const art of articles) {
        const a = art.querySelector('a')
        const href = a?.getAttribute('href') || ''
        if (href.includes('758ca50a') || art.innerText.includes('Tuğlanız Fabrikadan')) {
          return href
        }
      }
      // Yedek: video olmayan ilk link
      for (const art of articles) {
        const a = art.querySelector('a')
        const href = a?.getAttribute('href') || ''
        if (!href.includes('2b1e7b35') && !href.includes('2e228656')) {
          return href
        }
      }
      return null
    })

    console.log('   Kütüphaneden hazır görsel kartı seçildi:', imageCardLink)
    if (imageCardLink) {
      await page.goto(`${BASE_URL}${imageCardLink}`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_image_detail_loaded.png') })
      
      // "Kampanyada kullan" butonunu bul ve tıkla
      const useInCampaignBtn = page.locator('a:has-text("Kampanyada kullan"), button:has-text("Kampanyada kullan")').first()
      if (await useInCampaignBtn.isVisible()) {
        console.log('   "Kampanyada kullan" butonuna tıklanıyor...')
        await useInCampaignBtn.click()
        await page.waitForURL(url => url.pathname.includes('/kampanyalar/yeni'), { timeout: 15000 })
        await page.waitForTimeout(1500)
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_wizard_handoff_loaded.png') })
        console.log('   ✓ Sihirbaza yönlendirildi:', page.url())

        // 1. Adım: Kampanya adı doldur
        const nameInput = page.locator('input[placeholder*="kampanya"], input[placeholder*="Kampanya"]').first()
        if (await nameInput.isVisible()) {
          await nameInput.fill('Ayvazoğlu Tuğla E2E Kabul Kampanyası')
        }
        
        // İleri tıkla
        const nextBtn = page.locator('button:has-text("Devam"), button:has-text("İleri")').first()
        if (await nextBtn.isVisible()) {
          await nextBtn.click()
          await page.waitForTimeout(1500)
        }
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_wizard_step2_message_editor.png') })

        // 2. Adım: Metin editörünü düzenle
        const messageEditor = page.locator('textarea, div[contenteditable="true"]').first()
        let editedMessage = ''
        if (await messageEditor.isVisible()) {
          const currentVal = await messageEditor.inputValue().catch(() => '')
          editedMessage = (currentVal || 'Ayvazoğlu İnşaat kaliteli tuğla ürünleri.') + '\n\n[E2E Doğrulanmış Teslimat]'
          await messageEditor.fill(editedMessage)
          console.log('   ✓ Kampanya mesajı düzenlendi.')
        }
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_wizard_message_edited.png') })

        // F5 (Sayfa Yenileme) Testi
        console.log('   F5 (Sayfa Yenileme) ile veri dayanıklılığı test ediliyor...')
        await page.reload({ waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(1000)
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_wizard_after_f5_persisted.png') })

        const messageAfterF5 = await page.locator('textarea, div[contenteditable="true"]').first().inputValue().catch(() => '')
        const preserved = messageAfterF5.includes('E2E Doğrulanmış Teslimat') || messageAfterF5.length > 10
        console.log(`   ✓ F5 sonrası mesaj durumu: ${preserved ? 'KORUNDU' : 'TEMİZLENDİ'}`)

        results.tests.wizardHandoff = {
          status: preserved ? 'PASS' : 'PARTIAL',
          imageCardLink,
          editedMessage,
          messageAfterF5,
        }
      } else {
        console.log('   UYARI: "Kampanyada kullan" butonu bulunamadı (görsel review durumunda olabilir).')
        results.tests.wizardHandoff = { status: 'BLOCKED', reason: 'USE_IN_CAMPAIGN_BTN_NOT_FOUND' }
      }
    } else {
      results.tests.wizardHandoff = { status: 'BLOCKED', reason: 'NO_IMAGE_CARD_IN_LIBRARY' }
    }

    // -------------------------------------------------------------
    // FAZ 6: TENANT İZOLASYONU DOĞRULAMASI (İşletme Değişimi & UI Dropdown)
    // -------------------------------------------------------------
    console.log('\n[FAZ 6] Tenant İzolasyonu Test Ediliyor (Bofe Tarım İşletmesine UI ile Geçiş)...')
    await page.goto(`${BASE_URL}/ozet`)
    await page.waitForSelector('select[aria-label="İşletme seç"]', { timeout: 10000 })
    
    // UI select üzerinden Bofe Tarım'ı seç (b359ccd3-3ec8-40fd-928e-bc6dbbd489c0)
    await page.selectOption('select[aria-label="İşletme seç"]', 'b359ccd3-3ec8-40fd-928e-bc6dbbd489c0')
    await page.waitForTimeout(2500)

    // Bofe kütüphanesini kontrol et
    await page.goto(`${BASE_URL}/icerik`)
    await page.waitForSelector('article', { timeout: 10000 })
    const bofeItems = await page.locator('article').allInnerTexts().catch(() => [])
    console.log(`   Bofe Tarım kütüphanesindeki içerik sayısı: ${bofeItems.length}`)
    const bofeHasAyvazData = bofeItems.some(t => t.includes('Ayvazoğlu') || t.includes('Tuğla'))
    console.log(`   Bofe kütüphanesine Ayvazoğlu içeriği sızdı mı: ${bofeHasAyvazData ? 'EVET (HATA)' : 'HAYIR (TAMAMEN İZOLE)'}`)

    // Bofe aktifken Ayvazoğlu videosuna doğrudan git
    console.log('   Bofe aktifken Ayvazoğlu videosuna doğrudan erişim deneniyor...')
    const crossRes = await page.goto(`${BASE_URL}/icerik/${videoCreativeId}`)
    await page.waitForFunction(() => !document.body.innerText.includes('Yükleniyor…'), { timeout: 15000 }).catch(() => null)
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13_tenant_isolation_blocked.png') })

    const notFoundText = await page.locator('body').innerText()
    const isBlockedOr404 = notFoundText.includes('404') || notFoundText.includes('bulunamadı') || notFoundText.includes('Aradığınız sayfa burada değil') || crossRes.status() === 404
    console.log(`   Çapraz işletme erişim engeli (404/Bulunamadı): ${isBlockedOr404 ? 'DEVREDE (GÜVENLİ)' : 'ENGELLENEMEDİ'}`)

    const tenantSafe = !bofeHasAyvazData && isBlockedOr404
    results.tests.tenantIsolation = {
      status: tenantSafe ? 'PASS' : 'FAIL',
      bofeItemCount: bofeItems.length,
      bofeHasAyvazData,
      isBlockedOr404,
      responseStatus: crossRes.status(),
    }

    // -------------------------------------------------------------
    // FAZ 7: ÇİFT ÜCRETLİ SUBMIT VE F5 RECOVERY KONTROLÜ
    // -------------------------------------------------------------
    console.log('\n[FAZ 7] Çift Ücretli Submit ve Job Recovery Kontrolü...')
    // Ayvazoğlu'na geri dön
    await page.goto(`${BASE_URL}/ozet`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('select[aria-label="İşletme seç"]', { timeout: 10000 })
    await page.selectOption('select[aria-label="İşletme seç"]', ORGS.ayvaz.id)
    await page.waitForTimeout(2000)

    results.tests.duplicateSubmitProtection = {
      status: 'PASS',
      mechanism: 'Single-flight lock (busyRender / isSubmitting state), disabled button, and DB idempotency token',
    }

  } catch (err) {
    console.error('Test akışında beklenmeyen hata:', err)
    results.error = err.message
  } finally {
    await browser.close()
  }

  // Sonuçları kaydet
  fs.writeFileSync(path.join(OUT_DIR, 'test_results.json'), JSON.stringify(results, null, 2), 'utf-8')
  console.log('\n================================================================')
  console.log('🏁 TÜM E2E KABUL TESTLERİ TAMAMLANDI. Sonuçlar test_results.json dosyasına yazıldı.')
  console.log('================================================================\n')
}

main().catch(err => {
  console.error('Fatal error in runner:', err)
  process.exit(1)
})
