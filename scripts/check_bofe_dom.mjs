import fs from 'fs'
import path from 'path'
import { chromium } from 'playwright'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3025'
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@filo.dev'
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPass123!'
const BOFE_ORG = 'afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc'
const JOB_ID = '6f8654c2-a94d-5233-a8d9-0839623d33ed'
const OUTPUT_ID = 'ebd77172-8701-4c63-a251-27d9cc55f9d8'

async function checkBofeDom() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  await page.goto(`${BASE_URL}/giris`, { waitUntil: 'domcontentloaded' })
  await page.fill('input[type="email"]', TEST_EMAIL)
  await page.fill('input[type="password"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/ozet', { timeout: 15000 })

  await context.addCookies([{
    name: 'wb_active_org',
    value: BOFE_ORG,
    domain: 'localhost',
    path: '/'
  }])

  await page.goto(`${BASE_URL}/icerik/yeni?job_id=${JOB_ID}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(6000)
  await page.waitForSelector('video, text="Video İnceleme Bekliyor"', { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(2000)

  const shotPath = path.resolve(`docs/evidence/real_ai_production/bofe_video_player_${OUTPUT_ID.slice(0, 8)}.png`)
  await page.screenshot({ path: shotPath, fullPage: true })

  const checks = await page.evaluate(async () => {
    const video = document.querySelector('video')
    if (!video) return { error: 'No video element found in DOM' }
    return {
      hasVideo: true,
      src: video.src,
      duration: video.duration,
      readyState: video.readyState,
      paused: video.paused
    }
  })
  console.log('Bofe DOM Player checks:', checks)

  // Update bofe_video_result.json
  const resPath = path.resolve('docs/evidence/real_ai_production/bofe_video_result.json')
  if (fs.existsSync(resPath)) {
    const data = JSON.parse(fs.readFileSync(resPath, 'utf-8'))
    data.playbackChecks = checks
    fs.writeFileSync(resPath, JSON.stringify(data, null, 2))
    console.log('Updated bofe_video_result.json with verified DOM checks.')
  }

  await browser.close()
}

checkBofeDom().catch(err => {
  console.error(err)
  process.exit(1)
})
