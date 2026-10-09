import test from 'node:test'
import assert from 'node:assert/strict'
import { adaptLegacyDraftToV2 } from './adapter'

test('current saved draft restores campaign objective and nested commerce copy', () => {
  const restored = adaptLegacyDraftToV2({
    version: 2, mediaType: 'IMAGE', heroProductId: 'sku', objective: 'CAMPAIGN',
    campaignCopy: { price: '120', oldPrice: '150', offer: 'Teslimat dahil', dateRange: '10–15 Ekim', cta: 'Bilgi alın' },
  }, ['sku'])
  assert.equal(restored.objective, 'CAMPAIGN')
  assert.deepEqual(restored.campaignCopy, { price: '120', oldPrice: '150', offer: 'Teslimat dahil', dateRange: '10–15 Ekim', cta: 'Bilgi alın' })
})

test('explicit cleared copy stays cleared instead of resurrecting legacy product extras', () => {
  const restored = adaptLegacyDraftToV2({ heroProductId: 'sku', campaignCopy: { price: '', offer: '' },
    productExtras: { sku: { price: '999', promo: 'Old offer' } } }, ['sku'])
  assert.equal(restored.campaignCopy.price, '')
  assert.equal(restored.campaignCopy.offer, '')
})

test('malformed nested copy cannot enter restored commercial values', () => {
  const restored = adaptLegacyDraftToV2({ campaignCopy: { price: { value: 'invented' }, cta: ['bad'] }, price: '100' })
  assert.equal(restored.campaignCopy.price, '100')
  assert.equal(restored.campaignCopy.cta, null)
})
