import { chromium } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'

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
  await page.waitForTimeout(3000)

  fs.mkdirSync('docs/evidence/real_ai_production', { recursive: true })
  await page.screenshot({ path: 'docs/evidence/real_ai_production/wizard_step1_bofe.png', fullPage: true })
  console.log('Wizard Step 1 Bofe screenshot captured.')

  const title = await page.title()
  console.log('Page title:', title)

  const buttons = await page.locator('button').allInnerTexts()
  console.log('Buttons on page:', buttons)

  await browser.close()
}

run().catch(console.error)
