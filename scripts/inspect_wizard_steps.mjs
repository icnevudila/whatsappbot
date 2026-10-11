import { chromium } from 'playwright'

const BASE_URL = 'http://localhost:3025'
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@filo.dev'
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPass123!'
const BOFE_ORG = 'afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc'

async function run() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  await page.goto(`${BASE_URL}/giris`, { waitUntil: 'domcontentloaded' })
  await page.fill('input[type="email"]', TEST_EMAIL)
  await page.fill('input[type="password"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/ozet')

  await context.addCookies([{
    name: 'wb_active_org',
    value: BOFE_ORG,
    domain: 'localhost',
    path: '/'
  }])

  await page.goto(`${BASE_URL}/icerik/yeni`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)

  // Step 1 -> Step 2
  await page.click('button:has-text("Devam Et")')
  await page.waitForTimeout(2000)

  // Step 2 -> Step 3
  await page.click('button:has-text("Son Kontrol")')
  await page.waitForTimeout(2000)

  await page.screenshot({ path: 'docs/evidence/real_ai_production/wizard_step3_bofe.png', fullPage: true })
  const step3Buttons = await page.locator('button').allInnerTexts()
  console.log('Step 3 buttons:', step3Buttons)

  await browser.close()
}

run().catch(console.error)
