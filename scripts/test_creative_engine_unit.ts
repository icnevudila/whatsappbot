import {
  CAMPAIGN_TONE_INSTRUCTIONS,
  buildGeneratePrompt,
  buildRewritePrompt,
  verifyCommercialIntegrity,
  type CampaignTone,
} from '../apps/customer/src/lib/ai/campaign-message'

function runUnitTests() {
  console.log('=== UNIT TEST: CAMPAIGN COPYWRITING ENGINE ===')
  let passed = 0
  let failed = 0

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  [PASS] ${msg}`)
      passed++
    } else {
      console.error(`  [FAIL] ${msg}`)
      failed++
    }
  }

  // Test 1: 5 tones have distinct, comprehensive instructions
  const tones: CampaignTone[] = ['samimi', 'profesyonel', 'eglenceli', 'enerjik', 'satis']
  for (const t of tones) {
    assert(
      typeof CAMPAIGN_TONE_INSTRUCTIONS[t] === 'string' && CAMPAIGN_TONE_INSTRUCTIONS[t].length > 40,
      `Tone '${t}' has detailed copywriting instructions (${CAMPAIGN_TONE_INSTRUCTIONS[t].length} chars)`
    )
  }

  // Test 2: buildGeneratePrompt includes tone instructions
  const prompt = buildGeneratePrompt({
    brief: '16L akülü ilaçlama pompası tanıtımı.',
    tone: 'samimi',
    business: { name: 'Bofe Tarım', phone: '+90 542 821 22 05' },
  })
  assert(prompt.includes('İstenen Yazım Tonu ve Tarzı'), 'Generate prompt includes tone section')
  assert(prompt.includes('Sıcak, içten, samimi'), 'Generate prompt includes specific tone instructions')
  assert(prompt.includes('Bofe Tarım'), 'Generate prompt includes business name')

  // Test 3: buildRewritePrompt isolates brief for format/grammar actions
  const grammarRewrite = buildRewritePrompt({
    currentMessage: 'Pompa stokta 1.850 TL.',
    action: 'fix_grammar',
    brief: 'Bu hafta sonu özel indirim var organik zeytinyağı.',
    business: { name: 'Bofe Tarım' },
  })
  assert(!grammarRewrite.includes('organik zeytinyağı'), 'Grammar rewrite strictly omits brief context leakage')
  assert(grammarRewrite.includes('YALNIZCA yazım hatalarını'), 'Grammar rewrite instructs only grammar fix')

  // Test 4: verifyCommercialIntegrity passes when prices are preserved and no hallucinations
  const cleanSource = 'Bofe 16L Akülü Sırt Pompası 2.450 TL yerine 1.850 TL. İletişim: 0542 821 22 05'
  const goodOutput = 'Bofe 16L Akülü Sırt Pompası stoklarımızda! 2.450 TL yerine 1.850 TL özel fiyatla hemen sipariş verin.'
  const check1 = verifyCommercialIntegrity({
    sourceText: cleanSource,
    outputText: goodOutput,
    strictPriceCheck: true,
  })
  assert(check1.valid === true, 'Integrity check passes when prices are intact and no drift')
  assert(check1.preservedPrices.length >= 2, `Preserved prices count: ${check1.preservedPrices.length}`)

  // Test 5: verifyCommercialIntegrity flags hallucinated discounts and unverified timeframes
  const driftingOutput = 'Bofe 16L Akülü Sırt Pompası bu hafta sonuna özel %50 indirimle sizi bekliyor.'
  const check2 = verifyCommercialIntegrity({
    sourceText: cleanSource,
    outputText: driftingOutput,
  })
  assert(check2.valid === false, 'Integrity check fails when unverified %50 and "bu hafta sonu" added')
  assert(check2.hallucinatedTerms.some(t => t.includes('%50')), 'Flags unverified %50 discount')
  assert(check2.hallucinatedTerms.some(t => t.includes('bu hafta sonu')), 'Flags unverified "bu hafta sonu" timeframe')

  // Test 6: verifyCommercialIntegrity flags fake warranty promises
  const fakeWarrantyOutput = 'Bofe 16L Akülü Sırt Pompası 1.850 TL ve ömür boyu garanti ile sizlerle!'
  const check3 = verifyCommercialIntegrity({
    sourceText: cleanSource,
    outputText: fakeWarrantyOutput,
  })
  assert(check3.valid === false, 'Integrity check fails on fake lifetime warranty claim')
  assert(check3.hallucinatedTerms.some(t => t.includes('ömür boyu garanti')), 'Flags hallucinated warranty claim')

  // Test 8: Price Mutation (1.850 TL -> 11.850 TL) MUST FAIL (Substring matching prevention)
  const priceMutatedOutput = 'Bofe 16L Akülü Sırt Pompası 2.450 TL yerine 11.850 TL özel fiyatla stokta.'
  const check5 = verifyCommercialIntegrity({
    sourceText: cleanSource,
    outputText: priceMutatedOutput,
    strictPriceCheck: true,
  })
  assert(check5.valid === false, 'Integrity check strictly FAILS when price is mutated from 1.850 TL to 11.850 TL')
  assert(check5.missingPrices.some(p => p.includes('1.850')), 'Flags missing original 1.850 TL price')
  assert(check5.hallucinatedTerms.some(t => t.includes('11.850')), 'Flags hallucinated 11.850 TL price')

  // Test 9: Price Disappearance / Total wipeout MUST FAIL
  const noPriceOutput = 'Bofe 16L Akülü Sırt Pompası muhteşem indirimlerle stokta!'
  const check6 = verifyCommercialIntegrity({
    sourceText: cleanSource,
    outputText: noPriceOutput,
    strictPriceCheck: true,
  })
  assert(check6.valid === false, 'Integrity check strictly FAILS when both prices are wiped out')
  assert(check6.missingPrices.length === 2, 'Detects both missing prices')

  // Test 10: Fake Timeframe & Fake Delivery promise MUST FAIL
  const fakeDeliveryOutput = 'Bofe 16L Akülü Sırt Pompası 2.450 TL yerine 1.850 TL. Yalnızca bugün sipariş verenlere aynı gün kapınızda!'
  const check7 = verifyCommercialIntegrity({
    sourceText: cleanSource,
    outputText: fakeDeliveryOutput,
    strictPriceCheck: true,
  })
  assert(check7.valid === false, 'Integrity check FAILS on hallucinated "yalnızca bugün" timeframe')
  assert(check7.hallucinatedTerms.some(t => t.includes('yalnızca bugün')), 'Flags fake timeframe promise')
  assert(check7.hallucinatedTerms.some(t => t.includes('aynı gün kapınızda')), 'Flags fake delivery promise')

  // Test 11: Brand Name Missing MUST FAIL
  const checkBrand = verifyCommercialIntegrity({
    sourceText: cleanSource,
    outputText: '16L Akülü Sırt Pompası 2.450 TL yerine 1.850 TL.',
    businessName: 'Bofe Tarım',
  })
  assert(checkBrand.valid === false, 'Integrity check FAILS when business brand name is omitted')
  assert(checkBrand.drifts.some(d => d.includes('Bofe Tarım')), 'Flags missing business name')

  // Test 12: Fake / Hallucinated Phone Number MUST FAIL
  const fakePhoneOutput = 'Bofe 16L Akülü Sırt Pompası 2.450 TL yerine 1.850 TL. İletişim: 0532 999 88 77'
  const checkPhone = verifyCommercialIntegrity({
    sourceText: cleanSource,
    outputText: fakePhoneOutput,
  })
  assert(checkPhone.valid === false, 'Integrity check FAILS on fake hallucinated phone number')
  assert(checkPhone.drifts.some(d => d.includes('sahte iletişim')), 'Flags fake phone number')

  // Test 13: Preserved Phone with strictContactCheck PASS
  const preservedPhoneOutput = 'Bofe 16L Akülü Sırt Pompası 2.450 TL yerine 1.850 TL. İletişim: 0542 821 22 05'
  const checkPhonePass = verifyCommercialIntegrity({
    sourceText: cleanSource,
    outputText: preservedPhoneOutput,
    strictContactCheck: true,
    businessName: 'Bofe',
  })
  assert(checkPhonePass.valid === true, 'Integrity check PASSES with preserved phone and brand name')

  console.log(`\nUnit Test Results: ${passed} PASS, ${failed} FAIL\n`)
  if (failed > 0) process.exit(1)
}

runUnitTests()
