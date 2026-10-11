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
  console.log('Clicking Step 1 submit...')
  await page.click('button.wb-wa-submit:has-text("Devam Et")')
  await page.waitForTimeout(2000)

  // Step 2 -> Step 3
  console.log('Clicking Step 2 submit (Son Kontrol →)...')
  await page.click('button:has-text("Son Kontrol →")')
  await page.waitForTimeout(2000)

  // Step 3
  console.log('On Step 3! Inspecting submit button...')
  const generateBtn = page.locator('button.wb-wa-submit:has-text("Reklam Görselimi Oluştur")')
  console.log('Generate button visible:', await generateBtn.isVisible())
  console.log('Generate button disabled:', await generateBtn.isDisabled())

  await browser.close()
}

run().catch(console.error)
