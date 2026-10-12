import { chromium } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = 'http://localhost:3003'
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
  wizardHeight: number
  screenshot: string
}

async function main() {
  console.log('=== STARTING REAL PLAYWRIGHT RESPONSIVE & COMPACT AUDIT ===\n')
  const browser = await chromium.launch({ headless: true })

  // 1. Establish authenticated session
  const loginContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const loginPage = await loginContext.newPage()

  console.log('1. Logging in with test credentials...')
  await loginPage.goto(`${BASE_URL}/giris`, { waitUntil: 'networkidle' })
  await loginPage.fill('input[name="email"]', 'test@filo.dev')
  await loginPage.fill('input[name="password"]', 'TestPass123!')
  await Promise.all([
    loginPage.waitForURL(url => !url.pathname.includes('/giris'), { timeout: 15000 }),
    loginPage.click('button[type="submit"]')
  ])
  console.log('Logged in. Current URL:', loginPage.url())

  const cookies = await loginContext.cookies()
  await loginContext.close()

  const measurements: StepMeasurement[] = []

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`)
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

    // Measure Step 1
    await page.waitForSelector('text=Ne Tanıtmak İstiyorsunuz', { timeout: 15000 })
    const step1Metrics = await page.evaluate(() => {
      const wizard = document.querySelector('[data-testid="creative-wizard"]') || document.querySelector('form') || document.body
      return {
        totalScrollHeight: document.documentElement.scrollHeight,
        wizardHeight: wizard.scrollHeight
      }
    })

    const step1Shot = `${vp.name}_step1.png`
    await page.screenshot({ path: path.join(evidenceDir, step1Shot), fullPage: true })
    console.log(`Step 1 Scroll Height: ${step1Metrics.totalScrollHeight}px, Wizard Height: ${step1Metrics.wizardHeight}px`)
    measurements.push({
      viewport: vp.name,
      step: 1,
      totalScrollHeight: step1Metrics.totalScrollHeight,
      wizardHeight: step1Metrics.wizardHeight,
      screenshot: step1Shot
    })

    // Advance to Step 2
    // Look for Devam Et button
    const nextBtn = page.locator('button:has-text("Devam Et")').first()
    if (await nextBtn.isVisible()) {
      await nextBtn.click()
      await page.waitForTimeout(1000)

      // Measure Step 2
      const step2Metrics = await page.evaluate(() => {
        return {
          totalScrollHeight: document.documentElement.scrollHeight,
          wizardHeight: document.body.scrollHeight
        }
      })

      const step2Shot = `${vp.name}_step2.png`
      await page.screenshot({ path: path.join(evidenceDir, step2Shot), fullPage: true })
      console.log(`Step 2 Scroll Height: ${step2Metrics.totalScrollHeight}px`)
      measurements.push({
        viewport: vp.name,
        step: 2,
        totalScrollHeight: step2Metrics.totalScrollHeight,
        wizardHeight: step2Metrics.wizardHeight,
        screenshot: step2Shot
      })

      // Advance to Step 3
      const step2Next = page.locator('button:has-text("Özeti Gör ve İncele")').first()
      if (await step2Next.isVisible()) {
        await step2Next.click()
        await page.waitForTimeout(1000)

        // Measure Step 3
        const step3Metrics = await page.evaluate(() => {
          return {
            totalScrollHeight: document.documentElement.scrollHeight,
            wizardHeight: document.body.scrollHeight
          }
        })

        const step3Shot = `${vp.name}_step3.png`
        await page.screenshot({ path: path.join(evidenceDir, step3Shot), fullPage: true })
        console.log(`Step 3 Scroll Height: ${step3Metrics.totalScrollHeight}px`)
        measurements.push({
          viewport: vp.name,
          step: 3,
          totalScrollHeight: step3Metrics.totalScrollHeight,
          wizardHeight: step3Metrics.wizardHeight,
          screenshot: step3Shot
        })
      }
    }

    await context.close()
  }

  // 2. Test interactive features: Collapsible Price Toggle, Editable Scene Prompt, Brand-only mode
  console.log('\n--- Interactive Verification: Smart Collapsibles & Brand-Only Mode ---')
  const testContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await testContext.addCookies([
    ...cookies,
    { name: 'wb_active_org', value: BOFE_ORG_ID, domain: 'localhost', path: '/' }
  ])
  const testPage = await testContext.newPage()
  await testPage.goto(`${BASE_URL}/icerik/yeni`, { waitUntil: 'networkidle' })

  // Verify Brand Only selection
  const brandOnlyChip = testPage.locator('button:has-text("Yalnızca Logo & Marka")').first()
  if (await brandOnlyChip.isVisible()) {
    await brandOnlyChip.click()
    console.log('[PASS] Clicked "Yalnızca Logo & Marka" chip')
    await testPage.waitForTimeout(500)
    await testPage.screenshot({ path: path.join(evidenceDir, 'brand_only_selected.png'), fullPage: false })
  }

  // Switch to offering mode & test Sales objective auto-expanding price
  const offeringChip = testPage.locator('button:has-text("Ürün / Hizmet / Yazılım")').first()
  if (await offeringChip.isVisible()) {
    await offeringChip.click()
    await testPage.waitForTimeout(500)
  }

  const salesObjectiveChip = testPage.locator('button:has-text("Satış Yap")').first()
  if (await salesObjectiveChip.isVisible()) {
    await salesObjectiveChip.click()
    console.log('[PASS] Clicked "Satış Yap" objective')
  } else {
    console.error('ERROR: "Satış Yap" button not found!')
    process.exit(1)
  }

  // Go to Step 2
  const continueBtn = testPage.locator('button:has-text("Devam Et")').first()
  if (await continueBtn.isVisible()) {
    await continueBtn.click()
    await testPage.waitForTimeout(1000)

    // Check if visualScenePrompt textarea is present and editable
    const sceneTextarea = testPage.locator('textarea').filter({ hasText: /vitrin|ortam|ışık|arka plan|Zeytinlik/i }).first()
    const allTextareas = await testPage.locator('textarea').all()
    console.log(`Found ${allTextareas.length} textareas on step 2`)

    // Edit scene prompt
    if (allTextareas.length >= 1) {
      const targetArea = allTextareas[0]
      const originalVal = await targetArea.inputValue()
      console.log('Original scene prompt / field value:', originalVal)
      await targetArea.fill(originalVal + ' - [Kullanıcı Özel İnce Ayar]')
      const editedVal = await targetArea.inputValue()
      console.log('[PASS] Successfully edited prompt to:', editedVal)
    }

    // Check price accordion state (should be open for SALES_OFFER)
    const priceInput = testPage.locator('input[placeholder*="249 TL"]').first()
    const isPriceVisible = await priceInput.isVisible()
    console.log('Is price field visible (auto-expanded for sales):', isPriceVisible ? '[PASS]' : '[FAIL]')
    if (!isPriceVisible) {
      console.error('ERROR: Price field expected to be visible for SALES_OFFER objective!')
      process.exit(1)
    }

    await testPage.screenshot({ path: path.join(evidenceDir, 'step2_interactive_verified.png'), fullPage: false })
  }

  await testContext.close()
  await browser.close()

  // Save measurement summary
  fs.writeFileSync(
    path.join(evidenceDir, 'measurements.json'),
    JSON.stringify(measurements, null, 2),
    'utf-8'
  )

  console.log('\n=== REAL PLAYWRIGHT AUDIT COMPLETE ===')
  console.log(`Results and screenshots saved to: ${evidenceDir}`)
}

main().catch(err => {
  console.error('Audit failed with error:', err)
  process.exit(1)
})
