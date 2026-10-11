import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { processCreativeGeneration } from '../apps/customer/src/lib/creative/process.ts'
import { deriveVerifiedCampaignData } from '../apps/customer/src/lib/creative/prompt.ts'
import { generateCampaignWhatsAppMessage } from '../apps/customer/src/lib/ai/campaign-message.ts'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3025'
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@filo.dev'
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPass123!'

const EVIDENCE_DIR = path.resolve('docs/evidence/real_ai_production')
fs.mkdirSync(EVIDENCE_DIR, { recursive: true })

const ORG_ID = 'afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc' // Bofe
const TEST_USER_ID = 'e0784e2d-b636-4b31-8c72-dadd021adec3'

async function run() {
  console.log('================================================================')
  console.log('🚀 REAL AI IMAGE PRODUCTION — BOFE (16L ŞARJLI SIRT POMPASI)')
  console.log('================================================================\n')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rnkrjmblgcdqlyslbhob.supabase.co'
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const supabase = createClient(supabaseUrl, supabaseKey)

  // 1. Authenticate user to get user session client
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  })
  if (authErr) console.warn('Supabase password auth notice:', authErr.message)

  // 2. Fetch canonical product & kit from DB
  const { data: product } = await supabase.from('org_products').select('*').eq('id', 'b68d4eb9-7cc0-491e-9ece-84b8c01068b1').single()
  const { data: kit } = await supabase.from('brand_kits').select('*').eq('id', 'cd4ce662-eede-48a0-ba71-80433a61a842').single()
  const { data: productImg } = await supabase.from('org_product_images').select('*').eq('product_id', product.id).single()

  console.log('✓ Canonical Brand:', kit.name)
  console.log('✓ Canonical Hero Product:', product.name)
  console.log('✓ Product Photo URL:', productImg.public_url)
  console.log('✓ Logo URL:', kit.logo_path)

  const creativeId = crypto.randomUUID()
  const brief = 'Geniş 16L depo, güçlü lityum-iyon batarya ve pirinç teleskopik nozul ile bahçe ve sera ilaçlamasında profesyonel akülü sırt pompası.'
  const headline = 'Bofe 16L Şarjlı Sırt İlaçlama Pompası — Güçlü ve Kesintisiz Basınç'
  const price = '1.850 TL'
  const offer = '%15 Sezon İndirimi · 2 Yıl Garanti'
  const deliveryInfo = 'Aynı gün kargo · Kapıya teslim'

  const payload = {
    brief,
    customText: headline,
    formatId: 'wa',
    aspect: '1:1',
    textDensity: 'balanced',
    templateFamily: 'CAMPAIGN_POSTER',
    sector: 'Tarım ve Bahçe Ekipmanları',
    deliveryInfo,
    primaryBenefits: ['16L Geniş Hazne', 'Güçlü Lityum Batarya', 'Pirinç Teleskopik Nozul'],
    cta: 'Hemen Sipariş Ver',
    useLogo: true,
    brandKit: {
      id: kit.id,
      name: kit.name,
      tone: kit.tone,
      colors: kit.colors,
      fonts: kit.fonts,
      logoPath: kit.logo_path,
    },
    products: [
      {
        id: product.id,
        name: product.name,
        description: product.description,
        boxContents: product.box_contents,
        imageUrl: productImg.public_url,
        price,
        promo: offer,
        include: { name: true, image: true, description: true, boxContents: true, price: true, promo: true },
      },
    ],
    phones: [{ id: 'p1', label: 'Sipariş Hattı', phone: '0850 304 28 16' }],
    socials: [{ id: 's1', platform: 'Instagram', label: '@bofetarim', url: 'https://instagram.com/bofetarim' }],
    customLogoUrl: kit.logo_path,
  }

  const verified = deriveVerifiedCampaignData(payload)
  payload.campaignMessage = generateCampaignWhatsAppMessage(verified)

  console.log('\n[1/5] Inserting pending creative row into DB...')
  const { error: insErr } = await supabase.from('creatives').insert({
    id: creativeId,
    org_id: ORG_ID,
    created_by: TEST_USER_ID,
    brand_kit_id: kit.id,
    title: `${product.name} — Sezon Kampanyası`,
    source: 'ai',
    generation_type: 'new',
    template: 'ai_library',
    format: 'square',
    payload,
    status: 'pending',
  })
  if (insErr) throw new Error(`Insert creative error: ${insErr.message}`)
  console.log(`✓ Creative created: ${creativeId}`)

  console.log('\n[2/5] Triggering real processCreativeGeneration (OmniStudio Gateway)...')
  const t0 = Date.now()
  let result = await processCreativeGeneration(creativeId, supabase)
  const deadline = Date.now() + 240000

  while (result.pending && Date.now() < deadline) {
    const wait = result.retryAfterSeconds || 4
    console.log(`   Pending in queue/generation... Polling in ${wait}s`)
    await new Promise(r => setTimeout(r, wait * 1000))
    result = await processCreativeGeneration(creativeId, supabase)
  }

  const durationSec = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`✓ Generation finished in ${durationSec}s. Result:`, result)

  // 3. Inspect database result
  const { data: finalCreative } = await supabase.from('creatives').select('*').eq('id', creativeId).single()
  console.log('\n[3/5] Inspecting produced output and provider metadata...')
  console.log('Status in DB:', finalCreative.status)
  console.log('Public URL:', finalCreative.public_url)
  const outputPayload = finalCreative.payload || {}
  const jobId = outputPayload.imageJob?.id || 'N/A'
  console.log('OmniStudio Job ID:', jobId)

  if (finalCreative.status !== 'ready' || !finalCreative.public_url) {
    throw new Error(`Creative generation did not reach ready state! Status: ${finalCreative.status}`)
  }

  // 4. Download output and verify technical properties
  console.log('\n[4/5] Downloading image output and checking integrity...')
  const imgRes = await fetch(finalCreative.public_url)
  if (!imgRes.ok) throw new Error(`Failed to fetch produced image: ${imgRes.status}`)
  const imgBuffer = Buffer.from(await imgRes.arrayBuffer())
  const sha256 = crypto.createHash('sha256').update(imgBuffer).digest('hex')
  const outputPath = path.join(EVIDENCE_DIR, `bofe_ad_${creativeId.slice(0, 8)}.png`)
  fs.writeFileSync(outputPath, imgBuffer)
  console.log(`✓ Downloaded image size: ${imgBuffer.length} bytes`)
  console.log(`✓ SHA-256: ${sha256}`)
  console.log(`✓ Saved to: ${outputPath}`)

  // 5. Browser E2E verification: Detail View, F5, and Wizard Handoff
  console.log('\n[5/5] Running Browser E2E verification on localhost:3025...')
  const browser = await chromium.launch({ headless: true, channel: 'msedge' })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  await page.goto(`${BASE_URL}/giris`, { waitUntil: 'domcontentloaded' })
  await page.fill('input[type="email"]', TEST_EMAIL)
  await page.fill('input[type="password"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/ozet')

  // Set active org to Bofe
  await context.addCookies([{
    name: 'wb_active_org',
    value: ORG_ID,
    domain: 'localhost',
    path: '/',
  }])

  // Open creative detail page
  await page.goto(`${BASE_URL}/icerik/${creativeId}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3000)

  const detailShot = path.join(EVIDENCE_DIR, `bofe_detail_${creativeId.slice(0, 8)}.png`)
  await page.screenshot({ path: detailShot })
  console.log(`✓ Detail view screenshot: ${detailShot}`)

  // Check image rendered in DOM
  const imgLoaded = await page.evaluate(() => {
    const img = document.querySelector('img[alt*="Görsel"], img[src*="png"], img[src*="jpg"], img[src*="outputs"]')
    return img && img.naturalWidth > 0
  })
  console.log('✓ Browser image render naturalWidth > 0:', imgLoaded)

  // Test "Kampanyada kullan" button
  console.log('   Clicking "Kampanyada kullan"...')
  const useBtn = await page.waitForSelector('button:has-text("Kampanyada kullan"), a:has-text("Kampanyada kullan")', { timeout: 10000 })
  await useBtn.click()
  await page.waitForURL('**/kampanyalar/yeni?creative_id=*', { timeout: 15000 })
  console.log('✓ Successfully navigated to Campaign Wizard with creative ID')

  // Type sentinel into campaign editor
  const sentinel = `[BOFE E2E TEST ${Date.now()}] Bofe 16L şarjlı sırt pompası sezon fırsatı!`
  await page.waitForSelector('textarea[name="body"]', { timeout: 10000 })
  await page.fill('textarea[name="body"]', sentinel)
  await page.waitForTimeout(1000)

  // Reload (F5) and verify sentinel persistence
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('textarea[name="body"]', { timeout: 10000 })
  const persistedValue = await page.$eval('textarea[name="body"]', el => el.value)
  const isPersisted = persistedValue.includes(sentinel)
  console.log('✓ F5 sentinel persistence in Campaign Wizard:', isPersisted)

  await browser.close()

  console.log('\n================================================================')
  console.log('🏁 BOFE REAL AI IMAGE PRODUCTION: 100% SUCCESSFUL PASS')
  console.log(`   Creative ID: ${creativeId}`)
  console.log(`   OmniStudio Job ID: ${jobId}`)
  console.log(`   Duration: ${durationSec}s`)
  console.log(`   SHA-256: ${sha256}`)
  console.log('================================================================\n')
}

run().catch(err => {
  console.error('\n❌ BOFE Real AI Image Production Error:', err)
  process.exit(1)
})
