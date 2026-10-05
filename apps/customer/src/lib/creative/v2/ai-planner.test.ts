import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDeterministicFallbackPlan } from './ai-planner'
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
