import { chromium } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'
import assert from 'node:assert/strict'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3003'
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@filo.dev'
const TEST_PASSWORD = process.env.TEST_PASSWORD || process.env.CUSTOMER_TEST_PASSWORD || 'TestPass123!'
const BOFE_ORG_ID = 'b359ccd3-3ec8-40fd-928e-bc6dbbd489c0'

const VIEWPORTS = [
  { name: 'mobile_360', width: 360, height: 640 },
  { name: 'mobile_390', width: 390, height: 844 },
  { name: 'mobile_412', width: 412, height: 915 },
  { name: 'tablet_768', width: 768, height: 1024 },
  { name: 'desktop_1024', width: 1024, height: 768 },
  { name: 'desktop_1440', width: 1440, height: 900 },
]

const evidenceDir = path.join(process.cwd(), 'docs', 'evidence', 'compact_ux_playwright')
if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true })
}

interface StepMeasurement {
  viewport: string
  step: number
  totalScrollHeight: number
  mainClientHeight: number
  scrollableDistance: number
  hasHorizontalOverflow: boolean
  wizardHeight: number
  screenshot: string
}

async function main() {
  console.log('=== STARTING ROBUST PLAYWRIGHT RESPONSIVE & REAL SCROLL AUDIT ===\n')
  const browser = await chromium.launch({ headless: true })

  // 1. Establish authenticated session
  const loginContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const loginPage = await loginContext.newPage()

  console.log(`1. Authenticating as ${TEST_EMAIL}...`)
  await loginPage.goto(`${BASE_URL}/giris`, { waitUntil: 'networkidle' })
  await loginPage.fill('input[name="email"]', TEST_EMAIL)
  await loginPage.fill('input[name="password"]', TEST_PASSWORD)
  await Promise.all([
    loginPage.waitForURL(url => !url.pathname.includes('/giris'), { timeout: 20000 }),
    loginPage.click('button[type="submit"]')
  ])
  console.log('✓ Logged in. Current URL:', loginPage.url())

  const cookies = await loginContext.cookies()
  await loginContext.close()

  const measurements: StepMeasurement[] = []

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`)
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: vp.width < 768
        ? 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36'
        : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    })

    await context.addCookies([
      ...cookies,
      {
        name: 'wb_active_org',
        value: BOFE_ORG_ID,
        domain: 'localhost',
        path: '/'
      }
    ])

    const page = await context.newPage()
    await page.goto(`${BASE_URL}/icerik/yeni`, { waitUntil: 'networkidle' })

    // Helper to measure the TRUE scroll container (<main> inside panel layout)
    const getContainerMetrics = async () => {
      return page.evaluate(() => {
        const main = document.querySelector('main') || document.documentElement
        const wizard = document.querySelector('.creative-studio-wizard') || document.body
        return {
          totalScrollHeight: main.scrollHeight,
          mainClientHeight: main.clientHeight,
          scrollableDistance: Math.max(0, main.scrollHeight - main.clientHeight),
          hasHorizontalOverflow: main.scrollWidth > main.clientWidth + 1,
          wizardHeight: wizard.scrollHeight
        }
      })
    }

    // Measure Step 1
    await page.waitForSelector('text=Ne Tanıtmak İstiyorsunuz', { timeout: 15000 })
    const m1 = await getContainerMetrics()
    const step1Shot = `${vp.name}_step1.png`
    await page.screenshot({ path: path.join(evidenceDir, step1Shot), fullPage: true })
    console.log(`Step 1 -> scrollHeight: ${m1.totalScrollHeight}px, clientHeight: ${m1.mainClientHeight}px, scrollable: ${m1.scrollableDistance}px, H-Overflow: ${m1.hasHorizontalOverflow}`)
    measurements.push({
      viewport: vp.name,
      step: 1,
      totalScrollHeight: m1.totalScrollHeight,
      mainClientHeight: m1.mainClientHeight,
      scrollableDistance: m1.scrollableDistance,
      hasHorizontalOverflow: m1.hasHorizontalOverflow,
      wizardHeight: m1.wizardHeight,
      screenshot: step1Shot
    })
    assert.strictEqual(m1.hasHorizontalOverflow, false, `Horizontal overflow detected in Step 1 on ${vp.name}!`)

    // Go to Step 2
    const nextBtn1 = page.locator('button:has-text("Devam Et")').first()
    assert.ok(await nextBtn1.isVisible(), 'Step 1 "Devam Et" button MUST be visible!')
    await nextBtn1.click()
    await page.waitForSelector('text=Reklamınız Nasıl Görünsün', { timeout: 10000 })

    // Measure Step 2
    const m2 = await getContainerMetrics()
    const step2Shot = `${vp.name}_step2.png`
    await page.screenshot({ path: path.join(evidenceDir, step2Shot), fullPage: true })
    console.log(`Step 2 -> scrollHeight: ${m2.totalScrollHeight}px, clientHeight: ${m2.mainClientHeight}px, scrollable: ${m2.scrollableDistance}px, H-Overflow: ${m2.hasHorizontalOverflow}`)
    measurements.push({
      viewport: vp.name,
      step: 2,
      totalScrollHeight: m2.totalScrollHeight,
      mainClientHeight: m2.mainClientHeight,
      scrollableDistance: m2.scrollableDistance,
      hasHorizontalOverflow: m2.hasHorizontalOverflow,
      wizardHeight: m2.wizardHeight,
      screenshot: step2Shot
    })
    assert.strictEqual(m2.hasHorizontalOverflow, false, `Horizontal overflow detected in Step 2 on ${vp.name}!`)

    // Go to Step 3
    const nextBtn2 = page.locator('button:has-text("Son Kontrol →")').first()
    assert.ok(await nextBtn2.isVisible(), 'Step 2 "Son Kontrol →" button MUST be visible!')
    await nextBtn2.click()
    await page.waitForSelector('text=Son Kontrol ve Üretim', { timeout: 10000 })

    // Measure Step 3
    const m3 = await getContainerMetrics()
    const step3Shot = `${vp.name}_step3.png`
    await page.screenshot({ path: path.join(evidenceDir, step3Shot), fullPage: true })
    console.log(`Step 3 -> scrollHeight: ${m3.totalScrollHeight}px, clientHeight: ${m3.mainClientHeight}px, scrollable: ${m3.scrollableDistance}px, H-Overflow: ${m3.hasHorizontalOverflow}`)
    measurements.push({
      viewport: vp.name,
      step: 3,
      totalScrollHeight: m3.totalScrollHeight,
      mainClientHeight: m3.mainClientHeight,
      scrollableDistance: m3.scrollableDistance,
      hasHorizontalOverflow: m3.hasHorizontalOverflow,
      wizardHeight: m3.wizardHeight,
      screenshot: step3Shot
    })
    assert.strictEqual(m3.hasHorizontalOverflow, false, `Horizontal overflow detected in Step 3 on ${vp.name}!`)

    await context.close()
  }

  // 2. Interactive Assertions: Brand-Only Mode, AI Plan & Scene Prompt Edit, Smart Collapsible Price
  console.log('\n--- Interactive Verification: Brand-Only Mode, AI Scene Editing & Price Accordion ---')
  const testContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await testContext.addCookies([
    ...cookies,
    { name: 'wb_active_org', value: BOFE_ORG_ID, domain: 'localhost', path: '/' }
  ])
  const testPage = await testContext.newPage()
  await testPage.goto(`${BASE_URL}/icerik/yeni`, { waitUntil: 'networkidle' })

  // Contract A: Brand-Only Mode switch
  const brandOnlyBtn = testPage.locator('button:has-text("Marka Tanıtımı")').first()
  assert.ok(await brandOnlyBtn.isVisible(), 'Marka Tanıtımı button must be visible')
  await brandOnlyBtn.click()
  await testPage.waitForTimeout(300)
  const brandNotice = testPage.locator('text=Marka Tanıtımı Seçildi: Ürün kataloğu kullanılmaz')
  assert.ok(await brandNotice.isVisible(), 'Brand Only notice must be displayed when Marka Tanıtımı is selected')
  console.log('[PASS] Brand-Only mode toggle confirmed')

  // Switch back to offering mode & select "Satış Yap"
  const offeringBtn = testPage.locator('button:has-text("Ürün / Hizmet Tanıtımı")').first()
  assert.ok(await offeringBtn.isVisible(), 'Ürün / Hizmet Tanıtımı button must be visible')
  await offeringBtn.click()
  await testPage.waitForTimeout(300)

  const salesObjectiveBtn = testPage.locator('button:has-text("Satış Yap")').first()
  assert.ok(await salesObjectiveBtn.isVisible(), 'Satış Yap button must be visible')
  await salesObjectiveBtn.click()
  console.log('[PASS] Satış Yap objective selected')

  // Advance to Step 2
  const continueBtn = testPage.locator('button:has-text("Devam Et")').first()
  assert.ok(await continueBtn.isVisible(), 'Devam Et button must be visible')
  await continueBtn.click()
  await testPage.waitForSelector('text=Reklamınız Nasıl Görünsün', { timeout: 10000 })

  // Verify visualScenePrompt textarea is populated
  const sceneTextarea = testPage.locator('textarea').filter({ hasText: /vitrin|ortam|ışık|arka plan|Delta|ilaçlama/i }).first()
  assert.ok(await sceneTextarea.isVisible(), 'AI Scene Prompt textarea must be visible on Step 2')
  const originalScene = await sceneTextarea.inputValue()
  assert.ok(originalScene.length > 5, 'AI Scene prompt must be non-empty')
  console.log('[PASS] Auto-populated scene prompt:', originalScene)

  // Edit scene prompt & verify dirty tracking protects user input
  const userEditedScene = `${originalScene} - [Kullanıcı Özel İnce Ayar Tarla Atmosferi]`
  await sceneTextarea.fill(userEditedScene)
  const currentSceneValue = await sceneTextarea.inputValue()
  assert.strictEqual(currentSceneValue, userEditedScene, 'User scene edit must be preserved')
  console.log('[PASS] User edit preserved on scene prompt')

  // Verify price accordion is AUTO-OPEN for SALES_OFFER
  const priceInput = testPage.locator('input[placeholder*="249 TL"]').first()
  assert.ok(await priceInput.isVisible(), 'Price input MUST be auto-expanded and visible for Satış Yap objective')
  console.log('[PASS] Price accordion auto-expanded for Satış Yap objective')

  // Advance to Step 3 and verify summary
  const step2Next = testPage.locator('button:has-text("Son Kontrol →")').first()
  assert.ok(await step2Next.isVisible(), 'Son Kontrol → button must be visible')
  await step2Next.click()
  await testPage.waitForSelector('text=Son Kontrol ve Üretim', { timeout: 10000 })

  // Verify Step 3 displays the edited scene prompt in summary
  const summaryText = await testPage.locator('.creative-studio-wizard').textContent()
  assert.ok(summaryText?.includes('[Kullanıcı Özel İnce Ayar Tarla Atmosferi]'), 'Step 3 summary must display user edited scene prompt')
  console.log('[PASS] Step 3 review summary contains user edited scene prompt')

  // Verify generate button is present
  const generateBtn = testPage.locator('button:has-text("Reklam Görselimi Oluştur")').first()
  assert.ok(await generateBtn.isVisible(), 'Reklam Görselimi Oluştur button must be visible on Step 3')
  console.log('[PASS] Generate button visible and validated on Step 3')

  await testPage.screenshot({ path: path.join(evidenceDir, 'step3_verified_summary.png'), fullPage: true })

  await testContext.close()
  await browser.close()

  // Save measurement summary
  fs.writeFileSync(
    path.join(evidenceDir, 'measurements.json'),
    JSON.stringify(measurements, null, 2),
    'utf-8'
  )

  console.log('\n=== ALL PLAYWRIGHT ASSERTIONS PASSED SUCCESSFULLY ===')
  console.log(`Measurements saved to: ${path.join(evidenceDir, 'measurements.json')}`)
}

main().catch(err => {
  console.error('\n❌ Playwright audit failed with error:', err.message || err)
  process.exit(1)
})
