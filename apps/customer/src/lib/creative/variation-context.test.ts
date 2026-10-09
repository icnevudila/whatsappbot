import test from 'node:test'
import assert from 'node:assert/strict'
import { inheritVariationContext } from './variation-context'
import type { CreativePayload } from './types'

test('variation preserves commercial context without copying output or submission state', () => {
  const parent = { cta: 'Bilgi alın', dateRange: '10–15 Ekim', deliveryInfo: 'Mağazadan teslim',
    qualityMode: 'DESIGNER', customHeadline: 'Ürünümüz', requestKey: 'old', imageJob: { state: 'ready' },
    artDirectionPlan: { old: true } } as unknown as CreativePayload
  const draft = { requestKey: 'new', variationPreset: 'minimal', style: 'minimal' }
  const actual = inheritVariationContext(draft, parent)
  assert.equal(actual.cta, 'Bilgi alın')
  assert.equal(actual.dateRange, '10–15 Ekim')
  assert.equal(actual.deliveryInfo, 'Mağazadan teslim')
  assert.equal(actual.qualityMode, 'DESIGNER')
  assert.equal(actual.requestKey, 'new')
  assert.equal(actual.imageJob, undefined)
  assert.equal(actual.artDirectionPlan, undefined)
  assert.deepEqual(draft, { requestKey: 'new', variationPreset: 'minimal', style: 'minimal' })
})

test('explicit empty and null edits override parent facts', () => {
  const actual = inheritVariationContext({ cta: '', dateRange: null, customHeadline: 'Yeni başlık' },
    { cta: 'Old', dateRange: 'Old date', customHeadline: 'Old headline' } as CreativePayload)
  assert.equal(actual.cta, '')
  assert.equal(actual.dateRange, null)
  assert.equal(actual.customHeadline, 'Yeni başlık')
})
