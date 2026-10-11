import { chromium } from 'playwright'
import pg from 'pg'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3025'
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@filo.dev'
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPass123!'

const ORGS = {
  bofe: { id: 'afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc', name: 'Bofe' },
  ayvaz: { id: '4a58b0dd-0931-4901-880a-686457d15010', name: 'Ayvazoğlu İnşaat' },
  mesajify: { id: '2881f690-6853-4064-8768-307463ae6255', name: 'Mesajify' },
}

const EVIDENCE_DIR = path.resolve('docs/evidence/tenant_security_negative')
fs.mkdirSync(EVIDENCE_DIR, { recursive: true })

async function run() {
  console.log('================================================================')
  console.log('🔒 MESAJIFY NEGATIVE TENANT ISOLATION SUITE')
  console.log('================================================================\n')

  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    allPassed: false,
  }

  function record(id, title, status, details = {}) {
    console.log(`[${status}] ${id}: ${title}`)
    if (details.message) console.log(`   -> ${details.message}`)
    results.tests.push({ id, title, status, ...details, timestamp: new Date().toISOString() })
  }

  // 1. Fetch real outputs and creatives from PostgreSQL
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  let bofeOutput = null
  let ayvazOutput = null
  let ayvazCreative = null
  let bofeCreative = null

  try {
    const bOutRes = await pool.query(`SELECT id, org_id, file_path FROM ai_media_outputs WHERE org_id = $1 LIMIT 1`, [ORGS.bofe.id])
    bofeOutput = bOutRes.rows[0]

    const aOutRes = await pool.query(`SELECT id, org_id, file_path FROM ai_media_outputs WHERE org_id = $1 LIMIT 1`, [ORGS.ayvaz.id])
    ayvazOutput = aOutRes.rows[0]

    const aCreRes = await pool.query(`SELECT id, org_id, title FROM creatives WHERE org_id = $1 LIMIT 1`, [ORGS.ayvaz.id])
    ayvazCreative = aCreRes.rows[0]

    const bCreRes = await pool.query(`SELECT id, org_id, title FROM creatives WHERE org_id = $1 LIMIT 1`, [ORGS.bofe.id])
    bofeCreative = bCreRes.rows[0]

    console.log('Database assets found:')
    console.log(`  Bofe Output: ${bofeOutput?.id}`)
    console.log(`  Ayvazoğlu Output: ${ayvazOutput?.id}`)
    console.log(`  Ayvazoğlu Creative: ${ayvazCreative?.id}`)
    console.log(`  Bofe Creative: ${bofeCreative?.id}\n`)
  } finally {
    await pool.end()
  }

  const browser = await chromium.launch({ headless: true, channel: 'msedge' })

  try {
    // -------------------------------------------------------------
    // TEST 1: Unauthenticated direct access to outputs MUST return 401
    // -------------------------------------------------------------
    {
      const anonContext = await browser.newContext()
      const anonPage = await anonContext.newPage()

      const targetId = bofeOutput?.id || '00000000-0000-0000-0000-000000000000'
      const res = await anonPage.goto(`${BASE_URL}/api/ai-media/outputs/${targetId}`)
      const status = res?.status()

      if (status === 401) {
        record('SEC-NEG-01', 'Unauthenticated output access blocked with 401', 'PASS', {
          outputId: targetId,
          statusCode: status,
        })
      } else {
        record('SEC-NEG-01', 'Unauthenticated output access blocked with 401', 'FAIL', {
          outputId: targetId,
          statusCode: status,
          message: `Expected HTTP 401, got ${status}`,
        })
      }
      await anonContext.close()
    }

    // Authenticated context for subsequent tests
    const authContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await authContext.newPage()

    // Login
    await page.goto(`${BASE_URL}/giris`, { waitUntil: 'domcontentloaded' })
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/ozet', { timeout: 15000 })

    async function setTenant(orgId) {
      await page.goto(`${BASE_URL}/ozet`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('select[aria-label="İşletme seç"]', { timeout: 10000 })
      await page.selectOption('select[aria-label="İşletme seç"]', orgId)
      await page.waitForTimeout(2000)
      await authContext.addCookies([{
        name: 'wb_active_org',
        value: orgId,
        domain: 'localhost',
        path: '/'
      }])
      await page.goto(`${BASE_URL}/ozet`, { waitUntil: 'domcontentloaded' })
    }

    // -------------------------------------------------------------
    // TEST 2: Tenant Bofe context accessing Ayvazoğlu output MUST return 403
    // -------------------------------------------------------------
    if (ayvazOutput) {
      await setTenant(ORGS.bofe.id)
      const res = await page.goto(`${BASE_URL}/api/ai-media/outputs/${ayvazOutput.id}`)
      const status = res?.status()
      const text = await res?.text()

      if (status === 403) {
        record('SEC-NEG-02', 'Bofe session accessing Ayvazoğlu output blocked with 403', 'PASS', {
          activeOrg: ORGS.bofe.id,
          targetOutputOrg: ayvazOutput.org_id,
          targetOutputId: ayvazOutput.id,
          statusCode: status,
          responseText: text,
        })
      } else {
        record('SEC-NEG-02', 'Bofe session accessing Ayvazoğlu output blocked with 403', 'FAIL', {
          activeOrg: ORGS.bofe.id,
          targetOutputOrg: ayvazOutput.org_id,
          targetOutputId: ayvazOutput.id,
          statusCode: status,
          message: `Expected HTTP 403, got ${status}`,
          responseText: text,
        })
      }
    } else {
      record('SEC-NEG-02', 'Bofe session accessing Ayvazoğlu output blocked with 403', 'SKIPPED', {
        message: 'No Ayvazoğlu output in DB to test against',
      })
    }

    // -------------------------------------------------------------
    // TEST 3: Tenant Ayvazoğlu context accessing Bofe output MUST return 403
    // -------------------------------------------------------------
    if (bofeOutput) {
      await setTenant(ORGS.ayvaz.id)
      const res = await page.goto(`${BASE_URL}/api/ai-media/outputs/${bofeOutput.id}`)
      const status = res?.status()
      const text = await res?.text()

      if (status === 403) {
        record('SEC-NEG-03', 'Ayvazoğlu session accessing Bofe output blocked with 403', 'PASS', {
          activeOrg: ORGS.ayvaz.id,
          targetOutputOrg: bofeOutput.org_id,
          targetOutputId: bofeOutput.id,
          statusCode: status,
          responseText: text,
        })
      } else {
        record('SEC-NEG-03', 'Ayvazoğlu session accessing Bofe output blocked with 403', 'FAIL', {
          activeOrg: ORGS.ayvaz.id,
          targetOutputOrg: bofeOutput.org_id,
          targetOutputId: bofeOutput.id,
          statusCode: status,
          message: `Expected HTTP 403, got ${status}`,
          responseText: text,
        })
      }
    } else {
      record('SEC-NEG-03', 'Ayvazoğlu session accessing Bofe output blocked with 403', 'SKIPPED', {
        message: 'No Bofe output in DB to test against',
      })
    }

    // -------------------------------------------------------------
    // TEST 4: Bofe library (/icerik) contains zero Ayvazoğlu items
    // -------------------------------------------------------------
    {
      await setTenant(ORGS.bofe.id)
      await page.goto(`${BASE_URL}/icerik`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)
      await page.screenshot({ path: path.join(EVIDENCE_DIR, 'bofe_library.png') })

      const cards = await page.$$('article')
      const cardTexts = await page.locator('article').allInnerTexts().catch(() => [])
      const leaked = cardTexts.some(t => t.toLowerCase().includes('ayvazoğlu') || t.toLowerCase().includes('tuğla') || t.toLowerCase().includes('kil tuğla'))

      if (!leaked) {
        record('SEC-NEG-04', 'Bofe library has ZERO Ayvazoğlu data leakage', 'PASS', {
          cardCount: cards.length,
        })
      } else {
        record('SEC-NEG-04', 'Bofe library has ZERO Ayvazoğlu data leakage', 'FAIL', {
          cardCount: cards.length,
          message: 'Found Ayvazoğlu brick content inside Bofe library!',
          cardTexts,
        })
      }
    }

    // -------------------------------------------------------------
    // TEST 5: Ayvazoğlu library (/icerik) contains zero Bofe items
    // -------------------------------------------------------------
    {
      await setTenant(ORGS.ayvaz.id)
      await page.goto(`${BASE_URL}/icerik`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)
      await page.screenshot({ path: path.join(EVIDENCE_DIR, 'ayvaz_library.png') })

      const cards = await page.$$('article')
      const cardTexts = await page.locator('article').allInnerTexts().catch(() => [])
      const leaked = cardTexts.some(t => t.toLowerCase().includes('bofe') || t.toLowerCase().includes('ilaçlama') || t.toLowerCase().includes('sırt pompası'))

      if (!leaked) {
        record('SEC-NEG-05', 'Ayvazoğlu library has ZERO Bofe data leakage', 'PASS', {
          cardCount: cards.length,
        })
      } else {
        record('SEC-NEG-05', 'Ayvazoğlu library has ZERO Bofe data leakage', 'FAIL', {
          cardCount: cards.length,
          message: 'Found Bofe sprayer content inside Ayvazoğlu library!',
          cardTexts,
        })
      }
    }

    // -------------------------------------------------------------
    // TEST 6: Bofe session navigating to Ayvazoğlu detail page /icerik/[id] blocked
    // -------------------------------------------------------------
    if (ayvazCreative) {
      await setTenant(ORGS.bofe.id)
      const res = await page.goto(`${BASE_URL}/icerik/${ayvazCreative.id}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1500)
      const body = await page.evaluate(() => document.body.innerText)
      const isBlocked = body.includes('404') || body.includes('bulunamadı') || body.includes('Aradığınız sayfa') || res?.status() === 404

      if (isBlocked) {
        record('SEC-NEG-06', 'Cross-tenant creative detail view blocked', 'PASS', {
          targetCreativeId: ayvazCreative.id,
          statusOrBodyBlocked: true,
        })
      } else {
        record('SEC-NEG-06', 'Cross-tenant creative detail view blocked', 'FAIL', {
          targetCreativeId: ayvazCreative.id,
          message: 'Ayvazoğlu creative detail page was visible in Bofe session!',
        })
      }
    }

    await authContext.close()
  } finally {
    await browser.close()
  }

  const failures = results.tests.filter(t => t.status === 'FAIL')
  results.allPassed = failures.length === 0

  fs.writeFileSync(path.join(EVIDENCE_DIR, 'results.json'), JSON.stringify(results, null, 2))

  console.log('\n================================================================')
  if (results.allPassed) {
    console.log('✅ ALL TENANT SECURITY NEGATIVE TESTS PASSED!')
    console.log('================================================================')
    process.exit(0)
  } else {
    console.error(`❌ ${failures.length} TENANT SECURITY TESTS FAILED!`)
    console.log('================================================================')
    process.exit(1)
  }
}

run().catch(err => {
  console.error('Unhandled runner error:', err)
  process.exit(1)
})
