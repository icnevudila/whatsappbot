import assert from 'node:assert/strict'
import { buildCreativePrompt } from '../apps/customer/src/lib/creative/prompt'
import { campaignFactsError } from '../apps/customer/src/lib/creative/campaign-facts'
import type { CreativeSnapshot } from '../apps/customer/src/lib/creative/types'

console.log('=== VERIFY COMPACT UX & SCENE PROMPT CONTRACTS ===\n')

let totalChecks = 0
let passedChecks = 0

function runTest(name: string, fn: () => void) {
  totalChecks++
  try {
    fn()
    passedChecks++
    console.log(`[PASS] ${name}`)
  } catch (err: any) {
    console.error(`[FAIL] ${name}:`, err.message || err)
    process.exit(1)
  }
}

// 1. Contract: visualScenePrompt propagates to provider prompt in standard offering mode
runTest('Contract 1: visualScenePrompt propagates to provider prompt (Legacy Simple / OverDirected)', () => {
  const testScenePrompt = 'Zeytinlikte gün batımı ışığında ahşap zemin üzerinde ürün vitrini'
  const snapshot: CreativeSnapshot = {
    brief: 'Bofe ile Güçlü Tarım. Yüksek verim garantisi',
    style: 'auto',
    aspect: '1:1',
    formatId: 'feed_square',
    templateFamily: 'CAMPAIGN_POSTER',
    instruction: testScenePrompt,
    useLogo: true,
    products: [
      {
        id: 'prod-bofe',
        name: 'Bofe 16L Sırt Pompası',
        imageUrl: 'https://example.com/bofe.png',
        price: '1.450 TL',
        promo: '%20 İndirim',
      },
    ],
    brandKit: {
      name: 'Bofe Tarım',
      logoPath: 'https://example.com/logo.png',
    },
  }

  const compiled = buildCreativePrompt(snapshot)
  assert.ok(
    compiled.prompt.includes(testScenePrompt),
    `Expected compiled prompt to contain scene instruction "${testScenePrompt}". Got:\n${compiled.prompt}`,
  )
})

// 2. Contract: visualScenePrompt propagates to provider prompt in Brand-Only mode (brief-v3)
runTest('Contract 2: visualScenePrompt propagates to provider prompt in Brand-Only mode (brief-v3)', () => {
  const brandScenePrompt = 'Modern kurumsal mimari ofis lobisinde şık cam tabela ve aydınlatma'
  const brandSnapshot: CreativeSnapshot = {
    brief: 'Ayvazoğlu İnşaat Kurumsal Marka Tanıtımı',
    companyName: 'Ayvazoğlu İnşaat',
    promotionMode: 'brand',
    objective: 'BRAND_AWARENESS',
    style: 'premium',
    aspect: '1:1',
    formatId: 'feed_square',
    instruction: brandScenePrompt,
    useLogo: true,
    products: [],
    brandKit: {
      name: 'Ayvazoğlu İnşaat',
      logoPath: 'https://example.com/ayvaz_logo.png',
      colors: { primary: '#b7410e' },
    },
  }

  const compiled = buildCreativePrompt(brandSnapshot)
  assert.ok(
    compiled.prompt.includes(brandScenePrompt),
    `Expected brand-only prompt to contain scene instruction "${brandScenePrompt}". Got:\n${compiled.prompt}`,
  )
})

// 3. Contract: Sales/Campaign objective without price/offer fails campaignFactsError
runTest('Contract 3: Sales objective without price/offer returns error', () => {
  const err = campaignFactsError({
    objective: 'SALES_OFFER',
    headline: 'Büyük İndirim',
    cta: 'Satın Al',
    price: '',
    oldPrice: '',
    offer: '',
  })
  assert.strictEqual(
    err,
    'Satış reklamı için fiyat veya doğruladığınız teklifi yazın.',
    `Expected sales objective without price/offer to fail, got: ${err}`,
  )
})

// 4. Contract: Sales objective with valid price/offer passes campaignFactsError
runTest('Contract 4: Sales objective with valid price passes campaignFactsError', () => {
  const err = campaignFactsError({
    objective: 'SALES_OFFER',
    headline: 'Büyük İndirim',
    cta: 'Satın Al',
    price: '1.450 TL',
    oldPrice: '1.750 TL',
    offer: '%17 İndirim',
  })
  assert.strictEqual(err, null, `Expected valid sales objective to pass, got error: ${err}`)
})

// 5. Contract: Brand-Only and Product Intro without price pass campaignFactsError
runTest('Contract 5: Brand awareness and Product intro without price pass campaignFactsError', () => {
  const brandErr = campaignFactsError({
    objective: 'BRAND_AWARENESS',
    headline: 'Ayvazoğlu Güvenilir Yapı',
    cta: 'İletişime Geç',
    price: '',
    oldPrice: '',
    offer: '',
  })
  assert.strictEqual(brandErr, null, `Expected brand awareness without price to pass, got error: ${brandErr}`)

  const introErr = campaignFactsError({
    objective: 'PRODUCT_INTRO',
    headline: 'Bofe Kalitesi',
    cta: 'İncele',
    price: '',
    oldPrice: '',
    offer: '',
  })
  assert.strictEqual(introErr, null, `Expected product intro without price to pass, got error: ${introErr}`)
})

console.log(`\n=== ALL ${passedChecks}/${totalChecks} CONTRACT CHECKS COMPLETED SUCCESSFULLY ===`)
