import { chromium } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3025'
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@filo.dev'
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPass123!'
const BOFE_ORG = 'afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc'

const EVIDENCE_DIR = path.resolve('docs/evidence/real_ai_production')
fs.mkdirSync(EVIDENCE_DIR, { recursive: true })

async function run() {
  console.log('================================================================')
  console.log('📸 REAL AI IMAGE PRODUCTION — BOFE (END-TO-END BROWSER WIZARD)')
  console.log('================================================================\n')

  const browser = await chromium.launch({ headless: true, channel: 'msedge' })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  const t0 = Date.now()

  // 1. Login
  console.log('[1/7] Logging in as test user...')
  await page.goto(`${BASE_URL}/giris`, { waitUntil: 'domcontentloaded' })
  await page.fill('input[type="email"]', TEST_EMAIL)
  await page.fill('input[type="password"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/ozet', { timeout: 15000 })

  // 2. Select Bofe Org
  console.log('[2/7] Setting active org to Bofe...')
  await page.goto(`${BASE_URL}/ozet`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('select[aria-label="İşletme seç"]', { timeout: 10000 })
  await page.selectOption('select[aria-label="İşletme seç"]', BOFE_ORG)
  await page.waitForTimeout(2000)
  await context.addCookies([{
    name: 'wb_active_org',
    value: BOFE_ORG,
    domain: 'localhost',
    path: '/'
  }])
  await page.goto(`${BASE_URL}/ozet`, { waitUntil: 'domcontentloaded' })

  // 3. Navigate to /icerik/yeni
  console.log('[3/7] Navigating to Creative Studio Wizard (/icerik/yeni)...')
  await page.goto(`${BASE_URL}/icerik/yeni`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)

  // Step 1 -> Step 2
  console.log('[4/7] Proceeding from Step 1 to Step 2...')
  const step1Btn = page.locator('button.wb-wa-submit:has-text("Devam Et")')
  await step1Btn.waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForSelector('button.wb-wa-submit:has-text("Devam Et"):not([disabled])', { timeout: 15000 })
  await page.waitForTimeout(1000)
  await step1Btn.click()

  // Step 2 -> Step 3
  console.log('[5/7] Proceeding from Step 2 to Step 3 (Son Kontrol →)...')
  const step2Btn = page.locator('button:has-text("Son Kontrol →")')
  await step2Btn.waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForSelector('button:has-text("Son Kontrol →"):not([disabled])', { timeout: 15000 })
  await page.waitForTimeout(1000)
  await step2Btn.click()

  // Verify preflight indicators
  const step3Shot = path.join(EVIDENCE_DIR, 'bofe_wizard_step3_preflight.png')
  await page.screenshot({ path: step3Shot, fullPage: true })
  console.log(`   Preflight check screenshot: ${step3Shot}`)

  // Click "Reklam Görselimi Oluştur"
  console.log('[6/7] Clicking "Reklam Görselimi Oluştur" to initiate production...')
  const submitBtn = page.locator('button.wb-wa-submit:has-text("Reklam Görselimi Oluştur")')
  await submitBtn.waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForSelector('button.wb-wa-submit:has-text("Reklam Görselimi Oluştur"):not([disabled])', { timeout: 15000 })
  await page.waitForTimeout(1000)
  await submitBtn.click()

  // Wait for redirect to /icerik/[id]
  console.log('   Waiting for redirect to /icerik/[id]...')
  await page.waitForURL(/\/icerik\/[0-9a-fA-F-]{36}/, { timeout: 30000 })
  const detailUrl = page.url()
  const creativeId = detailUrl.split('/icerik/')[1].split('?')[0]
  console.log(`✓ Navigated to detail page for Creative ID: ${creativeId}`)

  // Wait for rendering to complete (status: ready)
  console.log('   Watching detail page progress (polling /api/icerik/render)...')
  const startTime = Date.now()
  const timeoutMs = 240000

  // Wait until the image appears and "Hazırlanıyor" / "Rendering" spinner disappears
  let isReady = false
  while (Date.now() - startTime < timeoutMs) {
    const isSpinnerVisible = await page.locator('.wb-creative-generating, text="Hazırlanıyor", text="tasarımınız hazırlanıyor"').isVisible().catch(() => false)
    const hasImage = await page.evaluate(() => {
      const img = document.querySelector('img[src*="public/creatives"], img[src*="outputs"]')
      return img && img.naturalWidth > 0
    }).catch(() => false)

    if (hasImage && !isSpinnerVisible) {
      isReady = true
      break
    }

    console.log(`   Still rendering... (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`)
    await page.waitForTimeout(4000)
  }

  if (!isReady) {
    // Check if error message is present
    const bodyText = await page.evaluate(() => document.body.innerText)
    throw new Error(`Generation timed out or failed on detail page. Body: ${bodyText.slice(0, 300)}`)
  }

  const durationSec = Math.round((Date.now() - t0) / 1000)
  console.log(`✓ Image successfully rendered in ${durationSec}s!`)

  // Screenshot detail page
  const detailShot = path.join(EVIDENCE_DIR, `bofe_image_detail_${creativeId.slice(0, 8)}.png`)
  await page.screenshot({ path: detailShot, fullPage: true })

  // Get image src and download
  const imgSrc = await page.evaluate(() => {
    const img = document.querySelector('img[src*="public/creatives"], img[src*="outputs"]')
    return img ? img.src : null
  })
  console.log(`✓ Rendered image URL: ${imgSrc}`)

  if (!imgSrc) throw new Error('Rendered image URL could not be resolved from DOM!')
  const imgRes = await fetch(imgSrc)
  if (!imgRes.ok) throw new Error(`Failed to download rendered image: HTTP ${imgRes.status}`)
  const imgBuffer = Buffer.from(await imgRes.arrayBuffer())
  const sha256 = crypto.createHash('sha256').update(imgBuffer).digest('hex')
  const diskPath = path.join(EVIDENCE_DIR, `bofe_real_ad_${creativeId.slice(0, 8)}.png`)
  fs.writeFileSync(diskPath, imgBuffer)
  console.log(`✓ Saved downloaded image (${imgBuffer.length} bytes) to ${diskPath}`)
  console.log(`✓ SHA-256: ${sha256}`)

  // 7. Campaign Wizard Handoff
  console.log('\n[7/7] Testing Campaign Wizard Handoff ("Kampanyada kullan")...')
  const useBtn = page.locator('button:has-text("Kampanyada kullan"), a:has-text("Kampanyada kullan")')
  await useBtn.waitFor({ timeout: 10000 })
  await useBtn.click()

  await page.waitForURL(/\/kampanyalar\/yeni\?creative_id=/, { timeout: 15000 })
  console.log(`✓ Successfully navigated to Campaign Wizard: ${page.url()}`)

  // Sentinel persistence check
  const sentinel = `[BOFE SENTINEL ${Date.now()}] 16L Şarjlı Akülü Sırt Pompası Sezon Fırsatı`
  await page.waitForSelector('textarea[name="body"]', { timeout: 10000 })
  await page.fill('textarea[name="body"]', sentinel)
  await page.waitForTimeout(1000)

  console.log('   Reloading (F5) to verify sentinel text persistence...')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('textarea[name="body"]', { timeout: 10000 })
  const persistedText = await page.locator('textarea[name="body"]').inputValue()
  const isPersisted = persistedText.includes(sentinel)
  console.log(`✓ Sentinel persistence verified: ${isPersisted}`)

  if (!isPersisted) throw new Error(`Sentinel text was lost on reload! Found: ${persistedText}`)

  const handoffShot = path.join(EVIDENCE_DIR, `bofe_campaign_handoff_${creativeId.slice(0, 8)}.png`)
  await page.screenshot({ path: handoffShot, fullPage: true })

  await browser.close()

  const summary = {
    test: 'BOFE_REAL_AI_IMAGE',
    creativeId,
    imageUrl: imgSrc,
    bytes: imgBuffer.length,
    sha256,
    durationSec,
    handoffPassed: true,
    sentinelPersisted: true,
    timestamp: new Date().toISOString(),
  }

  fs.writeFileSync(path.join(EVIDENCE_DIR, 'bofe_image_result.json'), JSON.stringify(summary, null, 2))

  console.log('\n================================================================')
  console.log('🎉 BOFE REAL AI IMAGE PRODUCTION VERIFIED 100% PASS!')
  console.log(`   Creative ID: ${creativeId}`)
  console.log(`   Duration: ${durationSec}s`)
  console.log(`   SHA-256: ${sha256}`)
  console.log('================================================================\n')
}

run().catch(err => {
  console.error('\n❌ BOFE Real AI Image Production Failed:', err)
  process.exit(1)
})
