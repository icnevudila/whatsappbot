import assert from 'node:assert/strict'
import {
  verifyCommercialIntegrity,
  cleanAiMessage,
  formatPriceText,
  isRewriteAction,
} from '../apps/customer/src/lib/ai/campaign-message.ts'

console.log('[TEST] Starting isolated campaign-message integrity assertions...')

// 1. Rewrite Actions Verification
assert.equal(isRewriteAction('improve'), true)
assert.equal(isRewriteAction('attention_grabbing'), true)
assert.equal(isRewriteAction('sales_focused'), true)
assert.equal(isRewriteAction('invalid_action'), false)
console.log('✓ Rewrite actions contract verified')

// 2. formatPriceText formatting
assert.equal(formatPriceText('18.50'), '18.50 TL')
assert.equal(formatPriceText('1900'), '1.900 TL')
assert.equal(formatPriceText('500 TL'), '500 TL')
console.log('✓ Price text formatting verified')

// 3. cleanAiMessage heading cleanup
const rawAiOutput1 = 'Ayvazoğlu WhatsApp Kampanya Mesajı:\n\nMerhaba! Fabrikadan şantiyenize doğrudan tuğla teslimatı.'
const cleaned1 = cleanAiMessage(rawAiOutput1, 'Ayvazoğlu')
assert.equal(cleaned1.startsWith('Merhaba!'), true)
assert.equal(cleaned1.includes('Kampanya Mesajı'), false)

const rawAiOutput2 = '"İşte metniniz: Özel üretim 8 delikli terracotta tuğlalar."'
const cleaned2 = cleanAiMessage(rawAiOutput2)
assert.equal(cleaned2.startsWith('Özel üretim'), true)
console.log('✓ AI message cleaning & heading stripping verified')

// 4. verifyCommercialIntegrity: Blank output rejection
const blankCheck = verifyCommercialIntegrity({
  sourceText: 'Tuğla 18.50 TL',
  outputText: '   ',
})
assert.equal(blankCheck.valid, false)
assert.equal(blankCheck.drifts.includes('Üretilen kampanya metni boş.'), true)
console.log('✓ Blank output rejection verified')

// 5. verifyCommercialIntegrity: Price preservation
const validPriceCheck = verifyCommercialIntegrity({
  sourceText: 'Ayvazoğlu Tuğla 18.50 TL fabrika teslimi',
  outputText: 'Ayvazoğlu Tuğla için özel fiyat: 18.50 TL. Hemen sipariş verin.',
})
assert.equal(validPriceCheck.valid, true)
console.log('✓ Price preservation verified')

// 6. verifyCommercialIntegrity: Price drift catching
const driftCheck = verifyCommercialIntegrity({
  sourceText: 'Ayvazoğlu Tuğla 18.50 TL',
  outputText: 'Ayvazoğlu Tuğla şimdi sadece 25 TL!',
})
assert.equal(driftCheck.valid, false)
assert.equal(driftCheck.drifts.length > 0, true)
console.log('✓ Price drift detection verified')

console.log('====================================================')
console.log('🏁 ALL CAMPAIGN AI INTEGRITY UNIT TESTS PASSED (6/6)')
console.log('====================================================')
