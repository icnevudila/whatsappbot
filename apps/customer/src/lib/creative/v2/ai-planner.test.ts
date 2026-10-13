import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDeterministicFallbackPlan, generateCreativePlan } from './ai-planner'
import { CAMPAIGN_OBJECTIVES } from './types'

test('missing commercial facts never become invented quality, price, scarcity or experience claims', () => {
  for (const objective of CAMPAIGN_OBJECTIVES) {
    const plan = buildDeterministicFallbackPlan({brandName:'Bofe', productName:'Sırt Pompası',
      objective:objective.id, stylePreset:'PREMIUM', mediaType:'VIDEO'})
    const text = [plan.copy.headline, plan.copy.supporting_line, plan.voiceover_text].join(' ')
    assert.doesNotMatch(text, /üstün|dayanıklılık|avantajlı fiyat|sınırlı süre|yılların|yenilikçi teknoloji|tavizsiz/i)
    assert.equal(plan.copy.price_tag, undefined)
    assert.equal(plan.copy.discount_badge, undefined)
  }
})

test('supplied campaign offer and price survive the neutral fallback', () => {
  const plan = buildDeterministicFallbackPlan({brandName:'Bofe', productName:'Sırt Pompası',
    objective:'SALES_OFFER', stylePreset:'PREMIUM', mediaType:'IMAGE',
    campaignDetail:'Kargo dahil', campaignCopy:{price:'250 TL', offer:'%10 indirim'}})
  assert.equal(plan.copy.supporting_line,'Kargo dahil')
  assert.equal(plan.copy.price_tag,'250 TL')
  assert.equal(plan.copy.discount_badge,'%10 indirim')
})

test('another idea sends previous composition to the provider while retaining tenant and commercial facts', async () => {
  const originalFetch = globalThis.fetch
  const oldToken = process.env.OMNISTUDIO_GATEWAY_TOKEN
  process.env.OMNISTUDIO_GATEWAY_TOKEN = 'fixture-token-not-a-real-secret'
  let submitted = ''
  globalThis.fetch = async (_url, options) => {
    submitted = String(options?.body)
    return Response.json({ choices: [{ message: { content: JSON.stringify({
      copy: { headline: 'Yeni kadraj', supporting_line: 'Kargo dahil', cta: 'Bilgi Alın' },
      scene: { environment: 'Sera', composition: 'Ürün sağda, yazı solda', lighting: 'Gün ışığı' },
    }) } }] })
  }
  try {
    const plan = await generateCreativePlan({ tenantId: 'tenant-bofe', brandName: 'Bofe', productName: 'Sırt Pompası',
      objective: 'SALES_OFFER', stylePreset: 'PREMIUM', mediaType: 'IMAGE',
      previousScene: 'Merkezde ürün, koyu stüdyo', campaignCopy: { price: '250 TL' } })
    assert.equal(plan.source, 'AI')
    assert.equal(plan.scene.composition, 'Ürün sağda, yazı solda')
    assert.match(submitted, /YENİ KOMPOZİSYON İSTEĞİ/)
    assert.match(submitted, /Merkezde ürün, koyu stüdyo/)
    assert.match(submitted, /250 TL/)
    assert.match(submitted, /tenant-bofe/)
  } finally {
    globalThis.fetch = originalFetch
    if (oldToken === undefined) delete process.env.OMNISTUDIO_GATEWAY_TOKEN
    else process.env.OMNISTUDIO_GATEWAY_TOKEN = oldToken
  }
})
