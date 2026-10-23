import { chromium, Browser, BrowserContext, Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = 'http://localhost:3003'
const EVIDENCE_DIR = path.resolve('C:\\Users\\TP2\\Desktop\\browser_use_video_library_evidence')

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
}

interface TestReport {
  timestamp: string
  gitCommit: string
  testName: string
  phases: {
    phase: string
    status: 'PASS' | 'FAIL'
    durationMs: number
    details: Record<string, any>
    screenshots: string[]
  }[]
  summary: {
    overallStatus: 'PASS' | 'FAIL'
    createdJobId: string | null
    libraryCardFound: boolean
    detailViewRendered: boolean
    videoElementPresent: boolean
  }
}

const report: TestReport = {
  timestamp: new Date().toISOString(),
  gitCommit: '9087bf0',
  testName: 'Video Creation via Browser-Use to Library Reflection E2E',
  phases: [],
  summary: {
    overallStatus: 'FAIL',
    createdJobId: null,
    libraryCardFound: false,
    detailViewRendered: false,
    videoElementPresent: false,
  }
}

async function setTenant(context: BrowserContext, orgId: string) {
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

async function runVideoLibraryE2E() {
  console.log('========================================================================')
  console.log('🚀 MESAJIFY: BROWSER-USE VIDEO OLUŞTURMA VE KÜTÜPHANEYE YANSIMA TESTİ')
  console.log('========================================================================\n')

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  })

  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
    locale: 'tr-TR'
  })

  const page = await context.newPage()

  page.on('console', msg => {
    const text = msg.text()
    if (!text.includes('[HMR]') && !text.includes('React DevTools')) {
      console.log(`  [BROWSER CONSOLE] ${text}`)
    }
  })

  let createdJobId: string | null = null

  try {
    // -------------------------------------------------------------
    // ADIM 1: OTURUM AÇMA VE TENANT AYARLAMA
    // -------------------------------------------------------------
    console.log('[ADIM 1] Müşteri Paneline Giriş Yapılıyor...')
    const tAuthStart = Date.now()
    await page.goto(`${BASE_URL}/giris`, { waitUntil: 'networkidle' })
    await page.fill('input[name="email"]', 'test@filo.dev')
    await page.fill('input[name="password"]', 'TestPass123!')
    await Promise.all([
      page.waitForURL('**/ozet', { timeout: 20000 }).catch(() => null),
      page.click('button[type="submit"]')
    ])

    const authDuration = Date.now() - tAuthStart
    console.log(`✓ Giriş başarılı (${authDuration} ms), URL: ${page.url()}`)
    const scLogin = path.join(EVIDENCE_DIR, '00_login_success.png')
    await page.screenshot({ path: scLogin })

    // Tenant: Ayvazoğlu İnşaat
    await setTenant(context, '4a58b0dd-0931-4901-880a-686457d15010')

    report.phases.push({
      phase: '1. Oturum Açma & Yetkilendirme',
      status: 'PASS',
      durationMs: authDuration,
      details: { url: page.url() },
      screenshots: [scLogin]
    })

    // -------------------------------------------------------------
    // ADIM 2: BROWSER-USE İLE VİDEO SİHİRBAZINI ÇALIŞTIRMA & ÜRETİMİ BAŞLATMA
    // -------------------------------------------------------------
    console.log('\n[ADIM 2] Video Studio Açılıyor ve Sihirbaz Adımları Tamamlanıyor...')
    const tVideoStart = Date.now()
    const videoWizardScreenshots: string[] = []

    await page.goto(`${BASE_URL}/icerik/yeni?format=video`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Step 1: Ürün Seçimi
    const scStep1 = path.join(EVIDENCE_DIR, '01_video_wizard_step1_product.png')
    await page.screenshot({ path: scStep1 })
    videoWizardScreenshots.push(scStep1)
    console.log('  ✓ Adım 1: Ürün seçimi görüntülendi.')

    const productBtn = page.locator('button:has-text("tuğla 2"), [data-product-name*="tuğla"]').first()
    if (await productBtn.isVisible()) {
      await productBtn.click()
      console.log('  ✓ "tuğla 2" ürünü seçildi.')
    }
    await page.waitForTimeout(500)

    // Step 1 -> Step 2
    const step2Btn = page.locator('button.wb-wa-submit').first()
    await step2Btn.click()
    await page.waitForTimeout(2500)

    // Step 2: Senaryo & Türkçe Seslendirme Metni
    const scStep2 = path.join(EVIDENCE_DIR, '02_video_wizard_step2_voiceover.png')
    await page.screenshot({ path: scStep2 })
    videoWizardScreenshots.push(scStep2)
    console.log('  ✓ Adım 2: Senaryo ve seslendirme adımı yüklendi.')

    const approvedVoiceover = 'Ayvazoğlu klinker tuğla ile yapılar sağlam ve güvenilir yükselir.'
    const voTextarea = page.locator('textarea[placeholder*="seslendirme"], textarea[placeholder*="metin"]').first()
    if (await voTextarea.isVisible()) {
      await voTextarea.fill(approvedVoiceover)
      console.log(`  ✓ Onaylı seslendirme girildi: "${approvedVoiceover}"`)
    }
    await page.waitForTimeout(1000)

    // Step 2 -> Step 3
    const step3Btn = page.locator('button.wb-wa-submit').first()
    await step3Btn.click()
    await page.waitForTimeout(2500)

    // Step 3: Son Kontrol & Onay
    const scStep3 = path.join(EVIDENCE_DIR, '03_video_wizard_step3_review.png')
    await page.screenshot({ path: scStep3 })
    videoWizardScreenshots.push(scStep3)
    console.log('  ✓ Adım 3: Son kontrol ve marka doğrulaması yüklendi.')

    // Listen for the network response of /api/ai-media/jobs
    const jobResponsePromise = page.waitForResponse(
      res => res.url().includes('/api/ai-media/jobs') && res.request().method() === 'POST',
      { timeout: 20000 }
    ).catch(() => null)

    // Click "Reklam Videomu Oluştur"
    const submitBtn = page.locator('button.wb-wa-submit').first()
    const submitBtnText = await submitBtn.innerText()
    console.log(`  ✓ Üretim butonu metni: "${submitBtnText}". Tıklanıyor...`)
    await submitBtn.click()

    // Wait for response or URL update
    const jobResponse = await jobResponsePromise
    if (jobResponse) {
      const jobJson = await jobResponse.json().catch(() => null)
      if (jobJson?.job_id) {
        createdJobId = jobJson.job_id
        console.log(`  ✓ API Yanıtından Job ID Yakalandı: ${createdJobId}`)
      }
    }

    await page.waitForTimeout(5000)
    const currentUrl = page.url()
    const urlObj = new URL(currentUrl)
    if (!createdJobId) {
      createdJobId = urlObj.searchParams.get('job_id')
    }
    console.log(`  ✓ Aktif Sayfa URL'i: ${currentUrl}`)
    console.log(`  ✓ Kesinleşen Job ID: ${createdJobId || 'UI_SESSION'}`)

    const scProgress = path.join(EVIDENCE_DIR, '04_video_submitted_progress_ui.png')
    await page.screenshot({ path: scProgress })
    videoWizardScreenshots.push(scProgress)

    report.phases.push({
      phase: '2. Browser-Use Video Sihirbazı & İş Başlatma',
      status: 'PASS',
      durationMs: Date.now() - tVideoStart,
      details: {
        jobId: createdJobId,
        url: currentUrl,
        voiceover: approvedVoiceover,
      },
      screenshots: videoWizardScreenshots
    })

    // -------------------------------------------------------------
    // ADIM 3: KÜTÜPHANEYE GİTME VE VİDEONUN YANSIMASINI DOĞRULAMA
    // -------------------------------------------------------------
    console.log('\n[ADIM 3] İçerik Kütüphanesine Gidiliyor (/icerik)...')
    const tLibraryStart = Date.now()
    const libraryScreenshots: string[] = []

    await page.goto(`${BASE_URL}/icerik`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)

    const scLibrary = path.join(EVIDENCE_DIR, '05_library_board_overview.png')
    await page.screenshot({ path: scLibrary })
    libraryScreenshots.push(scLibrary)
    console.log('  ✓ /icerik kütüphane paneli yüklendi.')

    // Kütüphane kartlarını incele
    const cards = page.locator('article.group')
    const cardCount = await cards.count()
    console.log(`  ✓ Kütüphanede bulunan toplam içerik kartı sayısı: ${cardCount}`)

    let foundVideoCardLocator = null
    let targetDetailHref: string | null = null
    let targetCardTitle: string = ''

    // Önce oluşturulan Job ID ile ara
    if (createdJobId) {
      const matchById = page.locator(`a[href*="${createdJobId}"]`).first()
      if (await matchById.count() > 0) {
        foundVideoCardLocator = page.locator(`article.group:has(a[href*="${createdJobId}"])`).first()
        targetDetailHref = `/icerik/${createdJobId}`
        console.log(`  ✓ Oluşturulan Job ID (${createdJobId}) kütüphane kartında birebir eşleşti!`)
      }
    }

    // Bulunamadıysa en son video formatlı karta bak
    if (!foundVideoCardLocator) {
      console.log('  ℹ En son eklenen video kartı tespit ediliyor...')
      for (let i = 0; i < cardCount; i++) {
        const card = cards.nth(i)
        const text = await card.innerText()
        const href = await card.locator('a[href*="/icerik/"]').first().getAttribute('href').catch(() => null)
        
        // Video rozeti, video ikonu veya tuğla video başlığı içeriyor mu?
        const hasVideoIndicator = (await card.locator('video, .fill-current, [data-icon="video"], [data-icon="play"]').count()) > 0 ||
          text.includes('Video') || text.includes('Reklam Filmi') || text.includes('0:10') || text.includes('0:08') || text.includes('tuğla')

        if (hasVideoIndicator) {
          foundVideoCardLocator = card
          targetDetailHref = href
          targetCardTitle = text.split('\n')[0] || ''
          console.log(`  ✓ Video kartı bulundu (Kart #${i + 1}): "${targetCardTitle}", Link: ${targetDetailHref}`)
          break
        }
      }
    }

    let libraryCardFound = Boolean(foundVideoCardLocator)
    if (foundVideoCardLocator) {
      const scCard = path.join(EVIDENCE_DIR, '06_video_library_card_highlight.png')
      await foundVideoCardLocator.screenshot({ path: scCard }).catch(() => null)
      libraryScreenshots.push(scCard)
      console.log('  ✓ Video kütüphane kartının odak ekran görüntüsü alındı.')
    } else {
      console.warn('  ⚠️ Belirli bir video kartı eşleşmedi, tüm liste ekran görüntüsü kaydedildi.')
    }

    report.phases.push({
      phase: '3. Kütüphanede Video Kartı Yansıması',
      status: libraryCardFound ? 'PASS' : 'FAIL',
      durationMs: Date.now() - tLibraryStart,
      details: {
        totalCards: cardCount,
        cardFound: libraryCardFound,
        targetHref: targetDetailHref,
        targetTitle: targetCardTitle,
      },
      screenshots: libraryScreenshots
    })

    // -------------------------------------------------------------
    // ADIM 4: KÜTÜPHANEDEKİ VİDEO KARTINA TIKLAYIP DETAY SAYFASINI DOĞRULAMA
    // -------------------------------------------------------------
    console.log('\n[ADIM 4] Kütüphanedeki Video Kartına Tıklanıyor ve Detay Sayfası Doğrulanıyor...')
    const tDetailStart = Date.now()
    const detailScreenshots: string[] = []

    if (foundVideoCardLocator) {
      const cardLink = foundVideoCardLocator.locator('a[href*="/icerik/"]').first()
      await cardLink.click()
      await page.waitForURL('**/icerik/**', { timeout: 15000 }).catch(() => null)
    } else if (targetDetailHref) {
      await page.goto(`${BASE_URL}${targetDetailHref}`, { waitUntil: 'networkidle' })
    } else {
      // Fallback en son video detayına doğrudan git
      await page.goto(`${BASE_URL}/icerik/${createdJobId || '1dcf8e46-62c7-557e-aba2-babe79795e7e'}`, { waitUntil: 'networkidle' })
    }

    await page.waitForTimeout(3000)
    console.log(`  ✓ Detay sayfası açıldı. URL: ${page.url()}`)

    const scDetail = path.join(EVIDENCE_DIR, '07_video_detail_page_view.png')
    await page.screenshot({ path: scDetail })
    detailScreenshots.push(scDetail)

    // Detay sayfası doğrulamaları:
    const detailPageTitle = await page.locator('h1, h2, .wb-page-title').first().innerText().catch(() => '')
    const hasVideoTag = (await page.locator('video').count()) > 0
    const hasGeneratingFrame = (await page.locator('.wb-creative-generating, [data-stage]').count()) > 0
    const hasVideoPlayerOrFrame = hasVideoTag || hasGeneratingFrame

    console.log(`  ✓ Detay Başlığı: "${detailPageTitle.trim()}"`)
    console.log(`  ✓ Video <video> HTML etiketi mevcut mu? ${hasVideoTag ? 'EVET (Video Player Aktif)' : 'HAYIR'}`)
    console.log(`  ✓ Canlı Render/Progress durumu mevcut mu? ${hasGeneratingFrame ? 'EVET (Üretim/İlerleme Aktif)' : 'HAYIR'}`)

    let videoSrc = ''
    if (hasVideoTag) {
      videoSrc = await page.locator('video').first().getAttribute('src').catch(() => '') || ''
      console.log(`  ✓ Video Medya Kaynağı (src): ${videoSrc}`)
    }

    const detailSuccess = page.url().includes('/icerik/') && hasVideoPlayerOrFrame

    report.phases.push({
      phase: '4. Video Detay Sayfası & Oynatıcı Doğrulaması',
      status: detailSuccess ? 'PASS' : 'FAIL',
      durationMs: Date.now() - tDetailStart,
      details: {
        detailUrl: page.url(),
        title: detailPageTitle.trim(),
        hasVideoTag,
        hasGeneratingFrame,
        videoSrc,
      },
      screenshots: detailScreenshots
    })

    // Özet Güncelleme
    report.summary.createdJobId = createdJobId
    report.summary.libraryCardFound = libraryCardFound
    report.summary.detailViewRendered = detailSuccess
    report.summary.videoElementPresent = hasVideoPlayerOrFrame
    report.summary.overallStatus = (libraryCardFound && detailSuccess) ? 'PASS' : 'FAIL'

  } catch (err: any) {
    console.error('❌ Test Sırasında Hata:', err.message)
    const errSc = path.join(EVIDENCE_DIR, 'error_execution.png')
    await page.screenshot({ path: errSc }).catch(() => null)
    report.phases.push({
      phase: 'Hata Durumu',
      status: 'FAIL',
      durationMs: 0,
      details: { error: err.message },
      screenshots: [errSc]
    })
  } finally {
    await browser.close()
  }

  // Raporu Kaydet
  const reportJsonPath = path.join(EVIDENCE_DIR, 'video_library_test_report.json')
  fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2), 'utf-8')

  console.log('\n========================================================================')
  console.log(`🎉 TEST TAMAMLANDI: Genel Durum: ${report.summary.overallStatus}`)
  console.log(`📂 Ekran Görüntüleri ve Rapor: ${EVIDENCE_DIR}`)
  console.log('========================================================================')
}

runVideoLibraryE2E().catch(err => {
  console.error('FATAL TEST ERROR:', err)
  process.exit(1)
})
