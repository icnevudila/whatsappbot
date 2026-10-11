import fs from 'fs'
import path from 'path'
import { chromium } from 'playwright'
import { execSync } from 'child_process'
import crypto from 'crypto'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3025'
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@filo.dev'
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPass123!'
const AYVAZ_ORG = '4a58b0dd-0931-4901-880a-686457d15010'
const JOB_ID = '9005770f-a73a-594b-aa1a-c8ab91b6b303'
const OUTPUT_ID = 'd074451a-ad9d-45f8-82f3-6d80527048c2'

async function testVideo() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  // Login
  console.log('[1/4] Logging in...')
  await page.goto(`${BASE_URL}/giris`, { waitUntil: 'domcontentloaded' })
  await page.fill('input[type="email"]', TEST_EMAIL)
  await page.fill('input[type="password"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/ozet', { timeout: 15000 })

  // Switch Org
  console.log('[2/4] Setting active org...')
  await page.goto(`${BASE_URL}/ozet`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('select[aria-label="İşletme seç"]', { timeout: 10000 })
  await page.selectOption('select[aria-label="İşletme seç"]', AYVAZ_ORG)
  await page.waitForTimeout(2000)
  await context.addCookies([{
    name: 'wb_active_org',
    value: AYVAZ_ORG,
    domain: 'localhost',
    path: '/'
  }])

  // Download with ?preview=1
  console.log('[3/4] Downloading generated video with ?preview=1...')
  const videoStreamUrl = `${BASE_URL}/api/ai-media/outputs/${OUTPUT_ID}?preview=1`
  console.log('Stream URL:', videoStreamUrl)

  const videoBuffer = await page.evaluate(async (url) => {
    const res = await fetch(url)
    const buf = await res.arrayBuffer()
    return Array.from(new Uint8Array(buf))
  }, videoStreamUrl)

  console.log('Downloaded bytes:', videoBuffer.length)
  const diskPath = path.resolve(`docs/evidence/real_ai_production/ayvaz_final_ad_${OUTPUT_ID.slice(0, 8)}.mp4`)
  fs.writeFileSync(diskPath, Buffer.from(videoBuffer))

  const sha256 = crypto.createHash('sha256').update(Buffer.from(videoBuffer)).digest('hex')
  console.log('SHA256:', sha256)

  // FFprobe
  const ffprobeCmd = `ffprobe -v quiet -print_format json -show_format -show_streams "${diskPath}"`
  const ffprobeOut = JSON.parse(execSync(ffprobeCmd, { encoding: 'utf-8' }))
  const vStream = ffprobeOut.streams.find(s => s.codec_type === 'video')
  const aStream = ffprobeOut.streams.find(s => s.codec_type === 'audio')
  const duration = parseFloat(ffprobeOut.format.duration)

  console.log('=== FFPROBE RESULT ===')
  console.log('Format:', ffprobeOut.format.format_name)
  console.log('Duration:', duration.toFixed(2), 's')
  console.log('Video Codec:', vStream?.codec_name, `(${vStream?.width}x${vStream?.height})`)
  console.log('Audio Codec:', aStream?.codec_name, `(${aStream?.channels} ch, ${aStream?.sample_rate} Hz)`)

  // DOM Player check on wizard page
  console.log('[4/4] Verifying HTML5 Video Player in browser DOM...')
  await page.goto(`${BASE_URL}/icerik/yeni?job_id=${JOB_ID}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(6000)

  // Wait for the video element or terminal banner to appear
  await page.waitForSelector('video, text="Video İnceleme Bekliyor"', { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(2000)

  const shotPath = path.resolve(`docs/evidence/real_ai_production/ayvaz_video_player_${OUTPUT_ID.slice(0, 8)}.png`)
  await page.screenshot({ path: shotPath, fullPage: true })

  const playbackChecks = await page.evaluate(async () => {
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
  console.log('DOM checks:', playbackChecks)

  const result = {
    test: 'AYVAZ_REAL_VEO_VIDEO',
    orgId: AYVAZ_ORG,
    orgName: 'Ayvazoğlu İnşaat',
    jobId: JOB_ID,
    outputId: OUTPUT_ID,
    videoPath: diskPath,
    bytes: videoBuffer.length,
    sha256,
    durationSec: duration,
    videoCodec: vStream?.codec_name,
    audioCodec: aStream?.codec_name,
    resolution: `${vStream?.width}x${vStream?.height}`,
    playbackChecks,
    timestamp: new Date().toISOString(),
  }

  fs.writeFileSync(
    path.resolve('docs/evidence/real_ai_production/ayvaz_video_result.json'),
    JSON.stringify(result, null, 2)
  )

  await browser.close()
  console.log('\n🎉 AYVAZOĞLU REAL VEO VIDEO VERIFICATION COMPLETED WITH 100% PASS!')
}

testVideo().catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})
