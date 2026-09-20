import { test } from 'node:test'
import assert from 'node:assert'
import {
  compileDeterministicV5,
  validateClaims,
  countTurkishSyllables,
  estimateSpeechDuration,
  deriveHookHeadline,
  validateAndRepair,
  planShots,
  selectHook,
  writeVoiceover,
  compileOverlay,
  normalizeFacts,
  analyzeOntology,
  selectCreativeStrategy,
} from '../apps/customer/src/lib/creative/v5/index.ts'
import type { UserVideoInput, VoiceoverOutput } from '../apps/customer/src/lib/creative/v5/schemas.ts'

// ======================================================================
// 12 COMPREHENSIVE REFINEMENT INTEGRATION TESTS & COUNTER-EXAMPLES (V5)
// ======================================================================

test('1. Dynamic hook candidate scoring: different inputs produce different winning candidates', () => {
  // Scenario A: Agriculture / Spraying -> Action focused should win
  const pkgAgri = compileDeterministicV5({
    brandName: 'Bofe',
    brief: 'Bahçede tek şarjla yüksek basınçlı mikronize ilaç püskürtme',
    products: [{ name: '16L Akülü Sırt Pompası' }],
  })
  assert.strictEqual(
    pkgAgri.hookPlan.selectedCandidate.type,
    'action_focused',
    `Expected action_focused to win for spray equipment, got: ${pkgAgri.hookPlan.selectedCandidate.type}`
  )

  // Scenario B: Restaurant / Food -> Result reveal focused should win
  const pkgFood = compileDeterministicV5({
    brandName: 'Burger Lab',
    brief: 'Özel marinasyonlu dana burger ve taze lezzet dönüşümü',
    products: [{ name: 'Truffle Burger' }],
  })
  assert.strictEqual(
    pkgFood.hookPlan.selectedCandidate.type,
    'result_reveal_focused',
    `Expected result_reveal_focused to win for food experience, got: ${pkgFood.hookPlan.selectedCandidate.type}`
  )

  // Scenario C: Heavy Bulk Logistics / Brick -> Curiosity or scale focused should win
  const pkgBrick = compileDeterministicV5({
    brandName: 'Ayvazoğlu Tuğla',
    brief: 'Şantiyelere doğrudan tır bazında toptan killi cephe tuğlası sevkiyatı ve stok hacmi',
    products: [{ name: 'Killi Cephe Tuğlası' }],
  })
  assert.strictEqual(
    pkgBrick.hookPlan.selectedCandidate.type,
    'curiosity_or_scale_focused',
    `Expected curiosity_or_scale_focused to win for heavy bulk bricks, got: ${pkgBrick.hookPlan.selectedCandidate.type}`
  )

  // Verify all 3 scenarios selected 3 DIFFERENT candidate types
  const winners = [
    pkgAgri.hookPlan.selectedCandidate.type,
    pkgFood.hookPlan.selectedCandidate.type,
    pkgBrick.hookPlan.selectedCandidate.type,
  ]
  const uniqueWinners = new Set(winners)
  assert.strictEqual(uniqueWinners.size, 3, 'Hook scoring is static; different inputs did not produce 3 distinct winning candidate types')
})

test('2. Claim validation counter-examples: %5 vs %50, material vs discount, "indirim yok", negation', () => {
  // Counter-example 1: %5 does NOT match %50
  const facts50 = normalizeFacts({
    brandName: 'Trend Giyim',
    brief: 'Seçili ürünlerde %50 indirim fırsatı.',
    products: [{ name: 'Kışlık Kaban' }],
  })
  const check5 = validateClaims('Tüm kabanlarda %5 indirim fırsatı.', facts50)
  assert.strictEqual(check5.valid, false, 'Numeric boundary mismatch: %50 in brief erroneously validated %5')

  // Counter-example 2: Material composition (%100 pamuk) must NOT validate discount (%100 indirim)
  const factsCotton = normalizeFacts({
    brandName: 'Ege Tekstil',
    brief: 'Doğal kumaştan üretilen %100 pamuk tişört.',
    products: [{ name: 'Pamuk Tişört' }],
  })
  const checkCottonDiscount = validateClaims('Tişörtlerde %100 indirim avantajı.', factsCotton)
  assert.strictEqual(checkCottonDiscount.valid, false, 'Material percentage (%100 pamuk) erroneously validated %100 discount')

  // Counter-example 3: "İndirim yok" in brief prevents any discount assertion
  const factsNoDiscount = normalizeFacts({
    brandName: 'Net Fiyat Mağazası',
    brief: 'Sabit fabrika satış fiyatı, indirim yapılmamaktadır. Hızlı teslimat yok.',
    products: [{ name: 'Standart Masa' }],
  })
  const checkAssertDiscount = validateClaims('Masalarda %20 indirim fırsatını kaçırmayın.', factsNoDiscount)
  assert.strictEqual(checkAssertDiscount.valid, false, 'Failed to reject discount claim when brief states indirim yapılmamaktadır')

  // Counter-example 4: Negation detection ("Hızlı teslimat yok")
  const checkNegation = validateClaims('Hızlı teslimat imkanı ile kapınızda.', factsNoDiscount)
  assert.strictEqual(checkNegation.valid, false, 'Failed to catch negation: "Hızlı teslimat yok" should invalidate "hızlı teslimat"')

  // Counter-example 5: Unit mismatch (500 gram does NOT substantiate %50 indirim)
  const factsGram = normalizeFacts({
    brandName: 'Kahve Durağı',
    brief: '500 gram paketli taze filtre kahve çekirdeği.',
    products: [{ name: 'Filtre Kahve 500g' }],
  })
  const checkPercentFalsePositive = validateClaims('Kahvede %50 indirim fırsatı.', factsGram)
  assert.strictEqual(checkPercentFalsePositive.valid, false, 'Numeric false positive: 500 gram erroneously validated %50 discount')

  // Positive verified claim must pass
  const checkValid = validateClaims('500 gram paketli taze filtre kahve çekirdeği.', factsGram)
  assert.strictEqual(checkValid.valid, true)
})

test('3. Hook and scene descriptions subjected to claim validation (no unverified binlerce stok, steam, or cure)', () => {
  // 1. Food brief without hot/steam does NOT generate "dumanı üstünde" or "sıcak"
  const coldFoodPkg = compileDeterministicV5({
    brandName: 'Salata Bar',
    brief: 'Taze yeşillik ve zeytinyağlı soğuk meze',
    products: [{ name: 'Akdeniz Salatası' }],
  })
  assert.ok(!coldFoodPkg.hookPlan.visualEventDescription.includes('dumanı üstünde'), 'Unverified dumanı üstünde generated for cold salad')
  assert.ok(!coldFoodPkg.hookPlan.visualEventDescription.includes('sıcak dokusu'), 'Unverified sıcak generated for cold salad')

  // 2. Brick brief without "binlerce" does NOT generate "binlerce stok"
  const brickNoThousandsPkg = compileDeterministicV5({
    brandName: 'Ayvazoğlu Tuğla',
    brief: 'Şantiyelere tır bazında killi cephe tuğlası sevkiyatı',
    products: [{ name: 'Killi Cephe Tuğlası' }],
  })
  assert.ok(!brickNoThousandsPkg.hookPlan.visualEventDescription.includes('binlerce stok'), 'Unverified binlerce stok generated without brief source')

  // 3. Regulated health does NOT generate unverified treatment outcome
  const healthPkg = compileDeterministicV5({
    brandName: 'Dent Sağlık',
    brief: 'Estetik diş hekimliği ve implant muayenesi',
    products: [{ name: 'İmplant Tedavisi' }],
  })
  assert.ok(!healthPkg.hookPlan.visualEventDescription.includes('tedavi sonrası sonuç'), 'Unverified treatment outcome claim generated in health hook')
  assert.ok(!healthPkg.hookPlan.visualEventDescription.includes('kesin sonuç'), 'Unverified kesin sonuç generated in health hook')

  // 4. Injected unverified claim into hook is caught by validator
  const brokenHook = JSON.parse(JSON.stringify(brickNoThousandsPkg.hookPlan))
  brokenHook.visualEventDescription = 'Binlerce stok garantili mucizevi killi tuğla sevkiyatı ilk saniyede başlar.'
  const valHook = validateAndRepair(
    brickNoThousandsPkg.normalizedBrief,
    brickNoThousandsPkg.classification,
    brokenHook,
    brickNoThousandsPkg.shotPlan,
    brickNoThousandsPkg.voiceover,
    brickNoThousandsPkg.overlayPlan
  )
  assert.strictEqual(valHook.validation.checks.claimsAllowedForRiskClass, false)
  assert.ok(valHook.validation.hardFails.some((hf) => hf.includes('unverified_claims_in_hook')))
})

test('4. Decoupled mappings: "basınç" does NOT become "yorulmadan yüksek basınç" and percentage does NOT become "toptan iskonto"', () => {
  // 1. Brief with only "basınç" (without "yorulmadan" or "yüksek basınç")
  const basincOnlyPkg = compileDeterministicV5({
    brandName: 'Bofe',
    brief: 'Bahçede basınçlı ilaçlama',
    products: [{ name: 'Sırt Pompası' }],
  })
  const hookHeadline = deriveHookHeadline(basincOnlyPkg.normalizedBrief, basincOnlyPkg.classification)
  assert.notStrictEqual(hookHeadline, 'YORULMADAN YÜKSEK BASINÇ', '"basınç" alone incorrectly mapped to YORULMADAN YÜKSEK BASINÇ')
  assert.strictEqual(hookHeadline, 'GÜÇLÜ BASINÇLI ÇÖZÜM')

  // 2. Brief with discount percentage without "toptan" does NOT become "toptan alımlarda"
  const discountOnlyPkg = compileDeterministicV5({
    brandName: 'Moda Butik',
    brief: 'Yeni sezon kıyafetlerde %20 indirim',
    products: [{ name: 'Yün Triko', promo: '%20 indirim' }],
  })
  assert.ok(!discountOnlyPkg.voiceover.text.includes('toptan'), 'Discount percentage without toptan incorrectly produced toptan copy')
})

test('5. claimsAllowed is dynamic; any unproven control stops production (status: blocked)', () => {
  // Valid package: claimsAllowed is true
  const validPkg = compileDeterministicV5({
    brandName: 'Ayvazoğlu Tuğla',
    brief: 'Şantiyelere killi tuğla sevkiyatı',
    products: [{ name: 'Killi Cephe Tuğlası' }],
  })
  assert.strictEqual(validPkg.validation.checks.claimsAllowedForRiskClass, true)
  assert.strictEqual(validPkg.validation.status, 'pass')

  // Package with unverified claim injected into voiceover: claimsAllowed becomes false and status becomes blocked
  const badVoPkg = JSON.parse(JSON.stringify(validPkg))
  badVoPkg.voiceover.text = 'Fabrikadan doğrudan kapınızda mucizevi tuğlalar ile %100 garanti.'
  const valResult = validateAndRepair(
    validPkg.normalizedBrief,
    validPkg.classification,
    validPkg.hookPlan,
    validPkg.shotPlan,
    badVoPkg.voiceover,
    validPkg.overlayPlan
  )
  assert.strictEqual(valResult.validation.checks.claimsAllowedForRiskClass, false)
  assert.strictEqual(valResult.validation.status, 'blocked')
  assert.ok(valResult.validation.hardFails.length > 0)
})

test('6. continuous_take maintains ONE simple unified camera route across all time segments', () => {
  const continuousPkg = compileDeterministicV5({
    brandName: 'Lüks Parfüm',
    brief: 'Cam şişede kalıcı esans',
    cameraMode: 'continuous_take',
    products: [{ name: 'Amber Oud Parfüm' }],
  })

  assert.strictEqual(continuousPkg.shotPlan.cameraMode, 'continuous_take')
  const shots = continuousPkg.shotPlan.shots

  // 1. All 3 shots maintain the identical slow forward push-in route
  assert.ok(shots[0].cameraMotion.includes('slow forward push-in route'), 'Shot 1 deviated from slow forward push-in route')
  assert.ok(shots[1].cameraMotion.includes('slow forward push-in route'), 'Shot 2 deviated from slow forward push-in route')
  assert.ok(shots[2].cameraMotion.includes('slow forward push-in route'), 'Shot 3 deviated from slow forward push-in route')

  // 2. Zero cut mentions in prompt
  const prompt = continuousPkg.shotPlan.veoEnglishPrompt
  assert.strictEqual(/\bcuts?\b/i.test(prompt), false, 'Prompt contains forbidden word cut')
})

test('7. Test objects strictly conform to TypeScript schemas (VoiceoverOutput, ShotPlanOutput)', () => {
  const facts = normalizeFacts({
    brandName: 'Test Marka',
    brief: 'Kısa brief',
    products: [{ name: 'Test Ürün' }],
  })
  const ontology = analyzeOntology(facts)
  const strategy = selectCreativeStrategy(ontology)
  const hook = selectHook(ontology, facts)
  const shots = planShots(facts, ontology, strategy, hook, 'test')

  const longVoText = 'Bu seslendirme metni kasıtlı olarak otuzdan fazla kelime içerecek şekilde uzatılmıştır çünkü sekiz saniyeye sığamayacak uzunluktaki metinlerin kesinlikle doğrudan onay alamadığını ve üretiminin durdurulması gerektiğini test etmemiz gerekiyor.'
  const est = estimateSpeechDuration(longVoText)

  // Strictly typed conforming VoiceoverOutput
  const conformingVo: VoiceoverOutput = {
    text: longVoText,
    wordCount: longVoText.split(/\s+/).filter(Boolean).length,
    syllableCount: est.syllableCount,
    estimatedDurationSeconds: est.durationSeconds,
    safetyMarginSeconds: est.safetyMarginSeconds,
    strategy: 'problem_solution',
    voiceCharacter: {
      gender: 'male',
      energy: 'medium',
      warmth: 'authoritative',
      pace: 'deliberate',
    },
    usesOnlyVerifiedClaims: true,
    genericCopyCheck: 'pass',
    reasonCode: 'test_long_vo',
  }

  const overlay = compileOverlay(facts, ontology, conformingVo)
  const validationResult = validateAndRepair(facts, ontology, hook, shots, conformingVo, overlay)

  // Long VO must NOT receive status: pass
  assert.notStrictEqual(validationResult.validation.status, 'pass')
})

test('8. Overlay texts are clean of unverified hype words (özel reçeteli, kusursuz, anlık)', () => {
  const pkg = compileDeterministicV5({
    brandName: 'Burger Ustası',
    brief: 'Izgara köfte ve taze ekmek',
    products: [{ name: 'Klasik Köfte' }],
  })

  const allOverlayText = pkg.overlayPlan.overlayTimeline.map((item) => item.text.toLowerCase()).join(' ')
  assert.ok(!allOverlayText.includes('özel reçeteli'))
  assert.ok(!allOverlayText.includes('kusursuz'))
  assert.ok(!allOverlayText.includes('anlık'))
})

test('9. Complete removal of word-slicing across VO and overlay with recursive re-validation', () => {
  const pkg = compileDeterministicV5({
    brandName: 'Uluslararası Ağır Sanayi Ekipmanları Anonim Şirketi',
    brief: 'Yüksek mukavemetli çelik konstrüksiyon imalatı, montajı, anahtar teslim endüstriyel tesisler ve projelendirme hizmetleri',
    products: [{ name: 'Ağır Çelik Konstrüksiyon Fabrika Binaları' }],
  })

  assert.ok(pkg.voiceover.text.endsWith('.'))
  assert.ok(!pkg.voiceover.text.endsWith(' ve.'))
  assert.ok(!pkg.voiceover.text.endsWith(' ile.'))
  assert.ok(!pkg.voiceover.text.endsWith(' için.'))
  assert.ok(pkg.voiceover.wordCount <= 16)
  assert.strictEqual(pkg.voiceover.usesOnlyVerifiedClaims, true)
})

test('10. Timeline continuity: 0.0s to 8.0s, sequential, positive durations, zero gaps, zero overlaps', () => {
  const pkg = compileDeterministicV5({
    brandName: 'Ayvazoğlu Tuğla',
    brief: 'Şantiyelere killi tuğla sevkiyatı',
    products: [{ name: 'Killi Cephe Tuğlası' }],
  })

  assert.strictEqual(pkg.validation.checks.timelineContinuityValid, true)
  assert.strictEqual(pkg.shotPlan.durationSeconds, 8.0)
  assert.strictEqual(pkg.shotPlan.shots.length, 3)
  assert.strictEqual(pkg.shotPlan.shots[0].timing.from, 0.0)
  assert.strictEqual(pkg.shotPlan.shots[0].timing.to, 2.2)
  assert.strictEqual(pkg.shotPlan.shots[1].timing.from, 2.2)
  assert.strictEqual(pkg.shotPlan.shots[1].timing.to, 5.8)
  assert.strictEqual(pkg.shotPlan.shots[2].timing.from, 5.8)
  assert.strictEqual(pkg.shotPlan.shots[2].timing.to, 8.0)

  // Counter-example: Inject a gap
  const brokenShots = JSON.parse(JSON.stringify(pkg.shotPlan))
  brokenShots.shots[0].timing.to = 2.0
  const ontology = analyzeOntology(pkg.normalizedBrief)
  const hook = selectHook(ontology, pkg.normalizedBrief)
  const valWithGap = validateAndRepair(pkg.normalizedBrief, ontology, hook, brokenShots, pkg.voiceover, pkg.overlayPlan)

  assert.strictEqual(valWithGap.validation.checks.timelineContinuityValid, false)
  assert.ok(valWithGap.validation.hardFails.includes('shot_timeline_gap_or_overlap_detected'))
  assert.strictEqual(valWithGap.validation.status, 'blocked')
})

test('11. 100% voiceover text synchronization across voiceover, Veo AUDIO directive, and subtitles sourceText', () => {
  const pkg = compileDeterministicV5({
    brandName: 'Bofe',
    brief: 'Bahçede tek şarjla ilaçlama',
    products: [{ name: '16L Akülü Sırt Pompası' }],
  })

  const voText = pkg.voiceover.text
  const subtitleSource = pkg.overlayPlan.subtitles.sourceText
  const veoAudioDirectiveMatch = pkg.veoPrompt.match(/AUDIO: Professional crystal-clear Turkish voiceover: "(.*?)"/)
  const shotPlanAudioMatch = pkg.shotPlan.veoEnglishPrompt.match(/AUDIO: Professional crystal-clear Turkish voiceover: "(.*?)"/)

  assert.ok(veoAudioDirectiveMatch, 'veoPrompt missing AUDIO directive')
  assert.ok(shotPlanAudioMatch, 'shotPlan.veoEnglishPrompt missing AUDIO directive')

  // Exact 100% string equality
  assert.strictEqual(voText, subtitleSource)
  assert.strictEqual(voText, veoAudioDirectiveMatch[1])
  assert.strictEqual(voText, shotPlanAudioMatch[1])
})

test('12. Preserves ctaText, ctaDestination, campaignDeadline, deliveryArea, and Turkish brand characters', () => {
  const pkg = compileDeterministicV5({
    brandName: 'Özgür Çelik İmalat',
    brief: 'Şantiyelere doğrudan killi tuğla sevkiyatı',
    ctaText: 'Hemen Fiyat Teklifi Alın',
    ctaDestination: 'WhatsApp: 05321112233',
    campaignDeadline: '31 Mart 2026',
    deliveryArea: 'Marmara ve Ege Bölgesi',
    phones: [{ phone: '05321112233' }],
    products: [{ name: 'Killi Cephe Tuğlası' }],
  })

  assert.strictEqual(pkg.normalizedBrief.verifiedFacts.brandName, 'Özgür Çelik İmalat')
  assert.strictEqual(pkg.normalizedBrief.verifiedFacts.campaignDeadline, '31 Mart 2026')
  assert.strictEqual(pkg.normalizedBrief.verifiedFacts.deliveryArea, 'Marmara ve Ege Bölgesi')
  assert.strictEqual(pkg.normalizedBrief.verifiedFacts.ctaText, 'Hemen Fiyat Teklifi Alın')
  assert.strictEqual(pkg.normalizedBrief.verifiedFacts.ctaDestination, 'WhatsApp: 05321112233')

  const ctaOverlay = pkg.overlayPlan.overlayTimeline.find((i) => i.type === 'cta')
  assert.ok(ctaOverlay?.text.includes('HEMEN FİYAT TEKLİFİ ALIN'))
  assert.ok(ctaOverlay?.text.includes('WHATSAPP'))

  const deliveryOverlay = pkg.overlayPlan.overlayTimeline.find((i) => i.text.includes('MARMARA VE EGE BÖLGESİ'))
  assert.ok(deliveryOverlay)
  assert.ok(pkg.veoPrompt.includes('Özgür Çelik İmalat'))
})
