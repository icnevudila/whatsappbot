import assert from 'node:assert/strict'
import test from 'node:test'

import {
  MAX_SPOKEN_WORDS,
  buildSafeSpokenLine,
  containsShotDirections,
  countWords,
  defaultFidelityContract,
  parseFactLines,
  validateWizardPreflight,
} from './video-wizard-contract'

test('visual directions never enter generated spoken fallback across formats', () => {
  for (const adFormat of ['FAST_SALES', 'PRODUCT_USAGE', 'PREMIUM']) {
    const line = buildSafeSpokenLine({brandName:'Ayvazoğlu',productName:'Tuğla',adFormat,
      creativeNote:'20 deliği koru, tek sahne, kamera sabit; preserve exact holes.'})
    assert.equal(containsShotDirections(line), false)
    assert.doesNotMatch(line, /20|preserve|tek sahne/)
  }
  assert.equal(containsShotDirections('Yirmi deliği koru ve kamerayı tek sahnede sabit tut.'), true)
})

test('verified descriptive claim is spoken without inventing an offer from creative notes', () => {
  const line = buildSafeSpokenLine({brandName:'Marka',productName:'Tuğla',adFormat:'FAST_SALES',
    verifiedClaims:['20 delikli yapı tuğlası'], creativeNote:'Yüzde 50 indirim ve ücretsiz teslimat yaz',
    offer:'Yüzde 50 indirim',offerVerified:false})
  assert.match(line, /20 delikli yapı tuğlası/)
  assert.doesNotMatch(line, /indirim|ücretsiz|50/)
})

test('safe spoken lines never exceed the SIMPLE_V5 word budget', () => {
  for (const adFormat of ['AUTO', 'FAST_SALES', 'PRODUCT_USAGE', 'PROBLEM_SOLUTION', 'SOCIAL_UGC', 'PREMIUM', 'OFFER']) {
    const line = buildSafeSpokenLine({
      brandName: 'Ayvazoğlu İnşaat',
      productName: 'Uzun İsimli Profesyonel Yapı Tuğlası Serisi',
      adFormat,
      verifiedClaims: ['Standart yapı tuğlasıdır ve doğal terracotta renktedir'],
      offer: 'Toptan siparişlerde doğrulanmış özel fiyat ve şantiye teslimatı',
      offerVerified: true,
    })
    assert.ok(countWords(line) <= MAX_SPOKEN_WORDS, `${adFormat}: ${line}`)
  }
})

test('Ayvazoglu brick fidelity blocks side perforation and full rotation', () => {
  const contract = defaultFidelityContract('Ayvazoğlu İnşaat', 'tuğla 2')
  assert.ok(contract.must_preserve.some((rule) => rule.includes('terracotta')))
  assert.ok(contract.forbidden_mutations.some((rule) => rule.includes('Yan yüzeylerde yeni delik')))
  assert.ok(contract.safe_camera_rules.some((rule) => rule.includes('360')))
})

test('preflight fails closed on quota, speech length, and unverified offers', () => {
  const issues = validateWizardPreflight({
    quotaUsed: 6,
    quotaLimit: 5,
    hasLogo: true,
    hasProduct: true,
    promotionType: 'existing_product',
    productId: 'product-1',
    spokenText: Array.from({ length: 19 }, (_, index) => `kelime${index}`).join(' '),
    verifiedClaims: [],
    offer: 'Yüzde elli indirim',
    offerVerified: false,
    adFormat: 'OFFER',
    fidelityContract: defaultFidelityContract('Marka', 'Ürün'),
    referenceCount: 1,
    referenceRoleCount: 1,
  })
  assert.ok(issues.some((issue) => issue.code === 'QUOTA_EXCEEDED' && issue.severity === 'error'))
  assert.ok(issues.some((issue) => issue.code === 'SPEECH_LENGTH_INVALID' && issue.severity === 'error'))
  assert.ok(issues.some((issue) => issue.code === 'VERIFIED_OFFER_REQUIRED' && issue.severity === 'error'))
  assert.ok(issues.some((issue) => issue.code === 'NO_VERIFIED_CLAIMS' && issue.severity === 'warning'))
})

test('fact lines are trimmed and deduplicated', () => {
  assert.deepEqual(parseFactLines('  Birinci gerçek  \nİkinci gerçek\nBirinci gerçek'), ['Birinci gerçek', 'İkinci gerçek'])
})
