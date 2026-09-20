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

// ======================================================================
// 10 MANDATORY DEFECT FIX INTEGRATION TESTS & COUNTER-EXAMPLES (V5)
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

test('2. Claim validation counter-examples: negation-aware and unit-aware checks', () => {
  const facts = normalizeFacts({
    brandName: 'Örnek Mağaza',
    brief: '500 gram paketli taze kavrulmuş kahve çekirdeği. Hızlı teslimat yok.',
    products: [{ name: '500g Filtre Kahve' }],
  })

  // Counter-example 1: Negation detection ("Hızlı teslimat yok")
  const checkNegation = validateClaims('Hızlı teslimat imkanı ile kapınızda.', facts)
  assert.strictEqual(
    checkNegation.valid,
    false,
    'Failed to catch negation: "Hızlı teslimat yok" in brief should invalidate "hızlı teslimat"'
  )
  assert.ok(
    checkNegation.unverifiedClaims.some((c) => c.includes('olumsuz') || c.includes('hızlı teslimat')),
    `Expected negation reason, got: ${checkNegation.unverifiedClaims.join(', ')}`
  )

  // Counter-example 2: Unit mismatch ("500 gram" must NOT substantiate "%50 indirim")
  const checkPercentFalsePositive = validateClaims('Kahvede %50 indirim fırsatı.', facts)
  assert.strictEqual(
    checkPercentFalsePositive.valid,
    false,
    'Numeric false positive: 500 gram erroneously validated %50 discount'
  )
  assert.ok(
    checkPercentFalsePositive.unverifiedClaims.some((c) => c.includes('%50') || c.includes('indirim')),
    `Expected unverified %50 discount claim, got: ${checkPercentFalsePositive.unverifiedClaims.join(', ')}`
  )

  // Verified claim should pass
  const checkValid = validateClaims('500 gram paketli taze kavrulmuş kahve çekirdeği.', facts)
  assert.strictEqual(checkValid.valid, true, `Verified claim failed: ${checkValid.unverifiedClaims.join(', ')}`)
})

test('3. Overlay texts are clean of unverified hype words (özel reçeteli, kusursuz, anlık)', () => {
  const pkg = compileDeterministicV5({
    brandName: 'Burger Ustası',
    brief: 'Izgara köfte ve taze ekmek',
    products: [{ name: 'Klasik Köfte' }],
  })

  const allOverlayText = pkg.overlayPlan.overlayTimeline.map((item) => item.text.toLowerCase()).join(' ')
  assert.ok(!allOverlayText.includes('özel reçeteli'), 'Overlay contains unverified claim "özel reçeteli"')
  assert.ok(!allOverlayText.includes('kusursuz'), 'Overlay contains unverified claim "kusursuz"')
  assert.ok(!allOverlayText.includes('anlık'), 'Overlay contains unverified claim "anlık"')

  // Counter-example: Injecting an unverified hype claim into overlay causes validator to catch it
  const ontology = analyzeOntology(pkg.normalizedBrief)
  const strategy = selectCreativeStrategy(ontology)
  const hook = selectHook(ontology, pkg.normalizedBrief)
  const badOverlay = compileOverlay(pkg.normalizedBrief, ontology, pkg.voiceover)
  badOverlay.overlayTimeline.push({
    type: 'benefit',
    text: 'KUSURSUZ VE ÖZEL REÇETELİ LEZZET',
    from: 3.0,
    to: 5.5,
    position: 'middle',
    style: 'highlight',
  })

  const valResult = validateAndRepair(pkg.normalizedBrief, ontology, hook, pkg.shotPlan, pkg.voiceover, badOverlay)
  assert.ok(
    valResult.validation.hardFails.some((hf) => hf.includes('unverified_claims_in_overlay')),
    'Validator failed to flag unverified hype claim injected into overlay timeline'
  )
})

test('4. Complete removal of word-slicing across VO and overlay with recursive re-validation', () => {
  const pkg = compileDeterministicV5({
    brandName: 'Uluslararası Ağır Sanayi Ekipmanları Anonim Şirketi',
    brief: 'Yüksek mukavemetli çelik konstrüksiyon imalatı, montajı, anahtar teslim endüstriyel tesisler ve projelendirme hizmetleri',
    products: [{ name: 'Ağır Çelik Konstrüksiyon Fabrika Binaları' }],
  })

  // Grammatically complete sentence verification
  assert.ok(pkg.voiceover.text.endsWith('.'), 'Voiceover does not end with a period')
  assert.ok(!pkg.voiceover.text.endsWith(' ve.'), 'Voiceover cut mid-conjunction')
  assert.ok(!pkg.voiceover.text.endsWith(' ile.'), 'Voiceover cut mid-postposition')
  assert.ok(!pkg.voiceover.text.endsWith(' için.'), 'Voiceover cut mid-phrase')
  assert.ok(pkg.voiceover.wordCount <= 16, `Word count ${pkg.voiceover.wordCount} > 16`)

  // Re-validated against claims
  assert.strictEqual(pkg.voiceover.usesOnlyVerifiedClaims, true)
})

test('5. HardFails stop production, checks returned, long VO cannot pass', () => {
  const pkg = compileDeterministicV5({
    brandName: 'Test Marka',
    brief: '30 kelimelik çok uzun bir seslendirme metni talebi. Bu metin ilk haliyle kesinlikle sekiz saniyeye sığmaz ve doğrudan pass alamaz.',
    products: [{ name: 'Test Ürün' }],
  })

  // 1. Checks object is present and contains dynamic boolean flags
  assert.ok(pkg.validation.checks, 'ValidationOutput missing checks object')
  assert.strictEqual(typeof pkg.validation.checks.durationTotalsEightSeconds, 'boolean')
  assert.strictEqual(typeof pkg.validation.checks.timelineContinuityValid, 'boolean')
  assert.strictEqual(typeof pkg.validation.checks.voiceoverWithinLimit, 'boolean')
  assert.strictEqual(typeof pkg.validation.checks.allOverlayFactsVerified, 'boolean')

  // 2. Direct validator test with long VO: long VO cannot pass
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
  const longVo = {
    text: longVoText,
    wordCount: longVoText.split(/\s+/).filter(Boolean).length,
    syllableCount: est.syllableCount,
    estimatedDurationSeconds: est.durationSeconds,
    safetyMarginSeconds: est.safetyMarginSeconds,
    speechRateSyllablesPerSecond: 4.8,
    usesOnlyVerifiedClaims: true,
    toneOfVoice: 'corporate' as const,
    brandMentionedInFirst3Seconds: true,
    genericCopyCheck: 'passed' as const,
    reasonCode: 'test_long_vo',
  }
  const overlay = compileOverlay(facts, ontology, longVo)
  const validationResult = validateAndRepair(facts, ontology, hook, shots, longVo, overlay)

  // Long VO must NOT have status === 'pass'
  assert.notStrictEqual(
    validationResult.validation.status,
    'pass',
    'Long VO erroneously received status: pass'
  )
})

test('6. Timeline continuity: 0.0s to 8.0s, sequential, positive durations, zero gaps, zero overlaps', () => {
  const pkg = compileDeterministicV5({
    brandName: 'Ayvazoğlu Tuğla',
    brief: 'Şantiyelere killi tuğla sevkiyatı',
    products: [{ name: 'Killi Cephe Tuğlası' }],
  })

  // Valid package check
  assert.strictEqual(pkg.validation.checks.timelineContinuityValid, true)
  assert.strictEqual(pkg.shotPlan.durationSeconds, 8.0)
  assert.strictEqual(pkg.shotPlan.shots.length, 3)
  assert.strictEqual(pkg.shotPlan.shots[0].timing.from, 0.0)
  assert.strictEqual(pkg.shotPlan.shots[0].timing.to, 2.2)
  assert.strictEqual(pkg.shotPlan.shots[1].timing.from, 2.2)
  assert.strictEqual(pkg.shotPlan.shots[1].timing.to, 5.8)
  assert.strictEqual(pkg.shotPlan.shots[2].timing.from, 5.8)
  assert.strictEqual(pkg.shotPlan.shots[2].timing.to, 8.0)

  // Counter-example: Inject a gap into shots (e.g. shot 0 ends at 2.0s, shot 1 starts at 2.5s)
  const brokenShots = JSON.parse(JSON.stringify(pkg.shotPlan))
  brokenShots.shots[0].timing.to = 2.0 // Gap of 0.5s between shot 0 and shot 1
  const ontology = analyzeOntology(pkg.normalizedBrief)
  const hook = selectHook(ontology, pkg.normalizedBrief)
  const valWithGap = validateAndRepair(pkg.normalizedBrief, ontology, hook, brokenShots, pkg.voiceover, pkg.overlayPlan)

  assert.strictEqual(valWithGap.validation.checks.timelineContinuityValid, false)
  assert.ok(valWithGap.validation.hardFails.includes('shot_timeline_gap_or_overlap_detected'))
  assert.strictEqual(valWithGap.validation.status, 'blocked')
})

test('7. Domain decoupling: Legal/consulting copy free of health terms, SaaS copy free of generic "müşteri bulma"', () => {
  // Case A: Legal / Consulting
  const legalPkg = compileDeterministicV5({
    brandName: 'Adalet Hukuk Bürosu',
    brief: 'Şirketler hukuku, ticari davalar ve sözleşme yönetimi',
    products: [{ name: 'Ticari Dava Danışmanlığı' }],
  })
  const legalCombinedText = `${legalPkg.voiceover.text} ${legalPkg.overlayPlan.overlayTimeline.map((i) => i.text).join(' ')}`.toLowerCase()
  assert.ok(!legalCombinedText.includes('sağlık'), 'Legal copy contains health term "sağlık"')
  assert.ok(!legalCombinedText.includes('hekim'), 'Legal copy contains medical term "hekim"')
  assert.ok(!legalCombinedText.includes('bakım'), 'Legal copy contains personal care term "bakım"')
  assert.ok(!legalCombinedText.includes('klinik'), 'Legal copy contains clinic term "klinik"')

  // Case B: SaaS - Accounting software
  const saasAccountingPkg = compileDeterministicV5({
    brandName: 'Bulut Ön Muhasebe',
    brief: 'Küçük işletmeler için e-fatura ve gelir gider takibi',
    products: [{ name: 'E-Fatura Ön Muhasebe Programı' }],
  })
  assert.ok(
    saasAccountingPkg.voiceover.text.toLowerCase().includes('muhasebe') ||
    saasAccountingPkg.voiceover.text.toLowerCase().includes('finans') ||
    saasAccountingPkg.voiceover.text.toLowerCase().includes('e-fatura'),
    'Accounting SaaS copy failed to anchor in accounting context'
  )

  // Case C: SaaS - HR software
  const saasHrPkg = compileDeterministicV5({
    brandName: 'İnsan Kaynakları 360',
    brief: 'Şirketler için personel vardiya ve bordro yönetimi',
    products: [{ name: 'Personel Takip Sistemi' }],
  })
  assert.ok(
    saasHrPkg.voiceover.text.toLowerCase().includes('ekip') ||
    saasHrPkg.voiceover.text.toLowerCase().includes('personel') ||
    saasHrPkg.voiceover.text.toLowerCase().includes('ik'),
    'HR SaaS copy failed to anchor in HR/personnel context'
  )
})

test('8. continuous_take camera trajectory: single unbroken camera glide with zero "cut" mentions', () => {
  const continuousPkg = compileDeterministicV5({
    brandName: 'Lüks Parfüm',
    brief: 'Cam şişede kalıcı esans',
    cameraMode: 'continuous_take',
    products: [{ name: 'Amber Oud Parfüm' }],
  })

  assert.strictEqual(continuousPkg.shotPlan.cameraMode, 'continuous_take')
  const prompt = continuousPkg.shotPlan.veoEnglishPrompt

  // 1. Must describe continuous unbroken camera glide across all 3 phases
  assert.ok(prompt.includes('CAMERA MOVEMENT: continuous_take - Single unbroken camera movement'))

  // 2. Must contain ZERO occurrences of "cut" or "cuts"
  const hasCut = /\bcuts?\b/i.test(prompt)
  assert.strictEqual(hasCut, false, `continuous_take prompt contains forbidden word "cut":\n${prompt}`)
})

test('9. 100% voiceover text synchronization across voiceover, Veo AUDIO directive, and subtitles sourceText', () => {
  const pkg = compileDeterministicV5({
    brandName: 'Bofe',
    brief: 'Bahçede tek şarjla ilaçlama',
    products: [{ name: '16L Akülü Sırt Pompası' }],
  })

  const voText = pkg.voiceover.text
  const subtitleSource = pkg.overlayPlan.subtitles.sourceText
  const veoAudioDirectiveMatch = pkg.veoPrompt.match(/AUDIO: Professional crystal-clear Turkish voiceover: "(.*?)"/)
  const shotPlanAudioMatch = pkg.shotPlan.veoEnglishPrompt.match(/AUDIO: Professional crystal-clear Turkish voiceover: "(.*?)"/)

  assert.ok(veoAudioDirectiveMatch, 'veoPrompt does not contain AUDIO directive')
  assert.ok(shotPlanAudioMatch, 'shotPlan.veoEnglishPrompt does not contain AUDIO directive')

  // Exact 100% string equality
  assert.strictEqual(voText, subtitleSource, 'voiceover.text and overlay.subtitles.sourceText are not identical')
  assert.strictEqual(voText, veoAudioDirectiveMatch[1], 'voiceover.text and veoPrompt AUDIO text are not identical')
  assert.strictEqual(voText, shotPlanAudioMatch[1], 'voiceover.text and shotPlan AUDIO text are not identical')
})

test('10. Preserves ctaText, ctaDestination, campaignDeadline, deliveryArea, and Turkish brand characters', () => {
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

  // 1. Facts preservation
  assert.strictEqual(pkg.normalizedBrief.verifiedFacts.brandName, 'Özgür Çelik İmalat')
  assert.strictEqual(pkg.normalizedBrief.verifiedFacts.campaignDeadline, '31 Mart 2026')
  assert.strictEqual(pkg.normalizedBrief.verifiedFacts.deliveryArea, 'Marmara ve Ege Bölgesi')
  assert.strictEqual(pkg.normalizedBrief.verifiedFacts.ctaText, 'Hemen Fiyat Teklifi Alın')
  assert.strictEqual(pkg.normalizedBrief.verifiedFacts.ctaDestination, 'WhatsApp: 05321112233')

  // 2. Overlay timeline preservation
  const ctaOverlay = pkg.overlayPlan.overlayTimeline.find((i) => i.type === 'cta')
  assert.ok(ctaOverlay?.text.includes('HEMEN FİYAT TEKLİFİ ALIN'))
  assert.ok(ctaOverlay?.text.includes('WHATSAPP'))

  const deliveryOverlay = pkg.overlayPlan.overlayTimeline.find((i) => i.text.includes('MARMARA VE EGE BÖLGESİ'))
  assert.ok(deliveryOverlay)

  // 3. Brand spelling preserved with Turkish characters
  assert.ok(pkg.veoPrompt.includes('Özgür Çelik İmalat'))
})
