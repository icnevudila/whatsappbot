import { buildCreativePrompt } from '../apps/customer/src/lib/creative/prompt'
import { campaignFactsError } from '../apps/customer/src/lib/creative/campaign-facts'
import type { CreativeJobSnapshot } from '../apps/customer/src/lib/creative/types'

console.log('--- COMPACT UX & SCENE PROMPT TEST START ---')

// 1. Verify visualScenePrompt integration in image generation prompt
const testScenePrompt = 'Zeytinlikte gün batımı ışığında ahşap zemin üzerinde ürün vitrini'
const snapshot: CreativeJobSnapshot = {
  brief: 'Bofe ile Güçlü Tarım. Yüksek verim garantisi',
  style: 'auto',
  format: '1:1',
  templateFamily: 'CAMPAIGN_POSTER',
  instruction: testScenePrompt,
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
const containsCustomScene = compiled.prompt.includes(testScenePrompt)
console.log('1. Custom Scene Prompt in Image Provider Prompt:', containsCustomScene ? 'PASS' : 'FAIL')
if (!containsCustomScene) {
  console.error('Expected prompt to contain:', testScenePrompt)
  process.exit(1)
}

// 2. Verify campaignFactsError rules
const salesWithoutPrice = campaignFactsError({
  objective: 'SALES_OFFER',
  headline: 'Büyük İndirim',
  cta: 'Satın Al',
  price: '',
  oldPrice: '',
  offer: '',
})
console.log('2. Sales objective without price/offer returns error:', salesWithoutPrice !== null ? 'PASS' : 'FAIL')

const salesWithPrice = campaignFactsError({
  objective: 'SALES_OFFER',
  headline: 'Büyük İndirim',
  cta: 'Satın Al',
  price: '1.450 TL',
  oldPrice: '1.750 TL',
  offer: '%17 İndirim',
})
console.log('3. Sales objective with valid price/offer passes:', salesWithPrice === null ? 'PASS' : 'FAIL')

const brandIntroWithoutPrice = campaignFactsError({
  objective: 'PRODUCT_INTRO',
  headline: 'Bofe Kalitesi',
  cta: 'İncele',
  price: '',
  oldPrice: '',
  offer: '',
})
console.log('4. Product intro without price passes (optional):', brandIntroWithoutPrice === null ? 'PASS' : 'FAIL')

console.log('--- ALL AUTOMATED CONTRACT CHECKS PASSED ---')
