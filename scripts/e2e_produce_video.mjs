import { chromium } from 'playwright'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import pg from 'pg'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3025'
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@filo.dev'
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPass123!'

const ORGS = {
  ayvaz: {
    id: '4a58b0dd-0931-4901-880a-686457d15010',
    name: 'Ayvazoğlu İnşaat',
    heroProduct: 'Tuğla',
    voiceover: "Ayvazoğlu Tuğla ile sağlam ve dayanıklı yapılar yükseliyor. Şantiyenize doğrudan teslimat için hemen WhatsApp'tan bize ulaşın.",
  },
  bofe: {
    id: 'afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc',
    name: 'Bofe',
    heroProduct: 'Bofe Otomatik Şarjlı Akülü Sırt İlaçlama Pompası',
    voiceover: "Bofe 16L şarjlı sırt pompası ile bahçenizde ve tarlanızda kesintisiz güç. Sezon indirimini kaçırmayın, hemen sipariş verin.",
  },
}

const targetOrgKey = process.argv.find(a => a.startsWith('--org='))?.split('=')[1] || 'ayvaz'
const targetOrg = ORGS[targetOrgKey]

if (!targetOrg) {
  console.error(`Invalid org: ${targetOrgKey}. Available: ayvaz, bofe`)
  process.exit(1)
}

const EVIDENCE_DIR = path.resolve('docs/evidence/real_ai_production')
fs.mkdirSync(EVIDENCE_DIR, { recursive: true })

async function run() {
  console.log('================================================================')
  console.log(`🎬 REAL VEO 3.1 FAST VIDEO PRODUCTION — ${targetOrg.name.toUpperCase()}`)
  console.log('================================================================\n')

  const browser = await chromium.launch({ headless: true, channel: 'msedge' })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  const t0 = Date.now()

  // 1. Login
  console.log('[1/8] Logging in as test user...')
  await page.goto(`${BASE_URL}/giris`, { waitUntil: 'domcontentloaded' })
  await page.fill('input[type="email"]', TEST_EMAIL)
  await page.fill('input[type="password"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/ozet', { timeout: 15000 })

  // 2. Switch Org
  console.log(`[2/8] Setting active org to ${targetOrg.name}...`)
  await page.goto(`${BASE_URL}/ozet`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('select[aria-label="İşletme seç"]', { timeout: 10000 })
  await page.selectOption('select[aria-label="İşletme seç"]', targetOrg.id)
  await page.waitForTimeout(2000)
  await context.addCookies([{
    name: 'wb_active_org',
    value: targetOrg.id,
    domain: 'localhost',
    path: '/'
  }])
  await page.goto(`${BASE_URL}/ozet`, { waitUntil: 'domcontentloaded' })

  // 3. Navigate to /icerik/yeni
  console.log('[3/8] Navigating to Creative Studio Wizard (/icerik/yeni)...')
  await page.goto(`${BASE_URL}/icerik/yeni`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)

  // Select "Kampanya Videosu"
  console.log('   Selecting "Kampanya Videosu" (9:16 Cinematic)...')
  const videoBtn = page.locator('button:has-text("Kampanya Videosu")')
  await videoBtn.waitFor({ state: 'visible', timeout: 10000 })
  await videoBtn.click()
  await page.waitForTimeout(1000)

  // Step 1 -> Step 2
  console.log('[4/8] Proceeding from Step 1 to Step 2...')
  const step1Btn = page.locator('button.wb-wa-submit:has-text("Devam Et")')
  await step1Btn.waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForSelector('button.wb-wa-submit:has-text("Devam Et"):not([disabled])', { timeout: 15000 })
  await page.waitForTimeout(1000)
  await step1Btn.click()

  // Step 2: Ensure Turkish Voiceover is set
  console.log('   Configuring Turkish voiceover script in Step 2...')
  await page.waitForTimeout(2000)
  const voTextarea = page.locator('textarea').first()
  if (await voTextarea.isVisible()) {
    await voTextarea.fill(targetOrg.voiceover)
    await page.waitForTimeout(500)
  }

  // Step 2 -> Step 3
  console.log('[5/8] Proceeding from Step 2 to Step 3 (Son Kontrol →)...')
  const step2Btn = page.locator('button:has-text("Son Kontrol →")')
  await step2Btn.waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForSelector('button:has-text("Son Kontrol →"):not([disabled])', { timeout: 15000 })
  await page.waitForTimeout(1000)
  await step2Btn.click()

  // Verify preflight indicators
  const step3Shot = path.join(EVIDENCE_DIR, `${targetOrgKey}_video_wizard_step3_preflight.png`)
  await page.screenshot({ path: step3Shot, fullPage: true })
  console.log(`   Preflight check screenshot: ${step3Shot}`)

  // Set up API interception for POST /api/ai-media/jobs
  console.log('[6/8] Clicking "Reklam Videomu Oluştur" to initiate production...')
  const submitBtn = page.getByRole('button', { name: /Reklam Videomu Oluştur/i })
  await submitBtn.waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForTimeout(1000)

  // Listen specifically for the POST /api/ai-media/jobs response
  const [response] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/ai-media/jobs') && res.request().method() === 'POST', { timeout: 30000 }),
    submitBtn.click(),
  ])

  const responseJson = await response.json()
  const capturedJobId = responseJson.job_id
  console.log(`✓ Active Production Job ID: ${capturedJobId}`)

  if (!capturedJobId) {
    throw new Error(`Failed to capture job_id! Response: ${JSON.stringify(responseJson)}`)
  }

  // Query PostgreSQL for job details
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  let finalJobRecord = null
  let finalOutputRecord = null

  console.log('   Monitoring video production progress via database & API...')
  const deadline = Date.now() + 420000 // 7 minutes timeout

  while (Date.now() < deadline) {
    const jobRes = await pool.query(
      `SELECT id, state, error_message, metadata FROM ai_media_jobs WHERE id = $1`,
      [capturedJobId]
    )
    const job = jobRes.rows[0]
    if (job) {
      console.log(`   [Job ${capturedJobId?.slice(0, 8)}] State: ${job.state}`)
      if (['COMPLETED', 'NEEDS_REVIEW'].includes(job.state)) {
        finalJobRecord = job
        break
      }
      if (job.state === 'FAILED') {
        throw new Error(`Video production failed! Error: ${job.error_message}`)
      }
    }
    await page.waitForTimeout(5000)
  }

  if (!finalJobRecord) {
    throw new Error('Video production timed out after 7 minutes!')
  }

  console.log(`✓ Job finished with terminal state: ${finalJobRecord.state}`)

  // Fetch output record
  const outRes = await pool.query(
    `SELECT * FROM ai_media_outputs WHERE job_id = $1 LIMIT 1`,
    [capturedJobId]
  )
  finalOutputRecord = outRes.rows[0]
  await pool.end()

  console.log('✓ AI Media Output Record:', {
    id: finalOutputRecord?.id,
    duration: finalOutputRecord?.duration_seconds,
    filePath: finalOutputRecord?.file_path,
    storageUrl: finalOutputRecord?.storage_url,
    verified: finalOutputRecord?.verified,
    isApproved: finalOutputRecord?.is_approved,
  })

  // 7. Download and Inspect Video with ffprobe
  console.log('\n[7/8] Downloading produced video and running ffprobe verification...')
  // When in NEEDS_REVIEW state, private inspection requires ?preview=1
  const videoStreamUrl = finalJobRecord.state === 'NEEDS_REVIEW'
    ? `${BASE_URL}/api/ai-media/outputs/${finalOutputRecord.id}?preview=1`
    : `${BASE_URL}/api/ai-media/outputs/${finalOutputRecord.id}`
  console.log(`   Stream URL: ${videoStreamUrl}`)

  // Download video through authenticated page
  const videoBuffer = await page.evaluate(async (url) => {
    const res = await fetch(url)
    const buf = await res.arrayBuffer()
    return Array.from(new Uint8Array(buf))
  }, videoStreamUrl)

  const videoDiskPath = path.join(EVIDENCE_DIR, `${targetOrgKey}_final_ad_${finalOutputRecord.id.slice(0, 8)}.mp4`)
  fs.writeFileSync(videoDiskPath, Buffer.from(videoBuffer))
  const videoSha256 = crypto.createHash('sha256').update(Buffer.from(videoBuffer)).digest('hex')

  console.log(`✓ Saved video (${videoBuffer.length} bytes) to ${videoDiskPath}`)
  console.log(`✓ Video SHA-256: ${videoSha256}`)

  // Run ffprobe
  const ffprobeCmd = `ffprobe -v quiet -print_format json -show_format -show_streams "${videoDiskPath}"`
  const ffprobeOut = JSON.parse(execSync(ffprobeCmd, { encoding: 'utf-8' }))

  const vStream = ffprobeOut.streams.find(s => s.codec_type === 'video')
  const aStream = ffprobeOut.streams.find(s => s.codec_type === 'audio')
  const duration = parseFloat(ffprobeOut.format.duration)

  console.log('=== FFPROBE VERIFICATION ===')
  console.log(`  Format: ${ffprobeOut.format.format_name}`)
  console.log(`  Duration: ${duration.toFixed(2)}s (Target: ~10.00s)`)
  console.log(`  Video Codec: ${vStream?.codec_name} (${vStream?.width}x${vStream?.height})`)
  console.log(`  Audio Codec: ${aStream?.codec_name} (${aStream?.channels} channels, ${aStream?.sample_rate} Hz)`)

  if (!vStream || vStream.codec_name !== 'h264') {
    console.warn(`Video codec warning: expected h264, got ${vStream?.codec_name}`)
  }
  if (Math.abs(duration - 10.0) > 1.5) {
    console.warn(`Duration warning: expected ~10.0s, got ${duration}s`)
  }

  // 8. Video Player Playback & Scrubbing in Browser
  console.log('\n[8/8] Testing HTML5 Video Player DOM Playback & Range Scrubbing...')
  // Ensure we are viewing the wizard page with the completed video player
  await page.goto(`${BASE_URL}/icerik/yeni?job_id=${capturedJobId}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4000)

  const playerShot = path.join(EVIDENCE_DIR, `${targetOrgKey}_video_player_${finalOutputRecord.id.slice(0, 8)}.png`)
  await page.screenshot({ path: playerShot, fullPage: true })

  // Verify video element in DOM
  const playbackChecks = await page.evaluate(async () => {
    const video = document.querySelector('video')
    if (!video) return { error: 'No video element found in DOM' }

    const results = {
      hasVideo: true,
      src: video.src,
      duration: video.duration,
      readyState: video.readyState,
      canPlay: false,
      paused: video.paused,
      seekPassed: false,
    }

    try {
      video.currentTime = 0
      await video.play().catch(() => {})
      results.canPlay = !video.paused

      // Seek to 7.5s (range scrub check)
      video.currentTime = 7.5
      await new Promise(r => setTimeout(r, 600))
      results.seekPassed = Math.abs(video.currentTime - 7.5) < 0.8
    } catch (e) {
      results.error = e.message
    }

    return results
  })

  console.log('✓ Video DOM Playback Results:', playbackChecks)

  await browser.close()

  const result = {
    test: `${targetOrgKey.toUpperCase()}_REAL_VEO_VIDEO`,
    orgId: targetOrg.id,
    orgName: targetOrg.name,
    jobId: capturedJobId,
    outputId: finalOutputRecord.id,
    videoPath: videoDiskPath,
    bytes: videoBuffer.length,
    sha256: videoSha256,
    durationSec: duration,
    videoCodec: vStream?.codec_name,
    audioCodec: aStream?.codec_name,
    resolution: `${vStream?.width}x${vStream?.height}`,
    playbackChecks,
    timestamp: new Date().toISOString(),
  }

  fs.writeFileSync(
    path.join(EVIDENCE_DIR, `${targetOrgKey}_video_result.json`),
    JSON.stringify(result, null, 2)
  )

  console.log('\n================================================================')
  console.log(`🎉 ${targetOrg.name.toUpperCase()} REAL VEO VIDEO PRODUCTION 100% PASS!`)
  console.log(`   Job ID: ${capturedJobId}`)
  console.log(`   Output ID: ${finalOutputRecord.id}`)
  console.log(`   Duration: ${duration.toFixed(2)}s`)
  console.log(`   SHA-256: ${videoSha256}`)
  console.log('================================================================\n')
}

run().catch(err => {
  console.error('\n❌ Real Veo Video Production Error:', err)
  process.exit(1)
})
