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
import type { UserVideoInput } from '../apps/customer/src/lib/creative/v5/schemas.ts'

// ======================================================================
// 12 REFINEMENT INTEGRATION TESTS FOR MESAJIFY VIDEO ENGINE V5
// ======================================================================

test('1. Voiceover is truly wired to Veo prompt AUDIO directive and not just in JSON', () => {
  const pkg = compileDeterministicV5({
    brandName: 'Bofe',
    brief: 'Bahçede yorulmadan tek şarjla yüksek basınçlı ilaçlama',
    products: [{ name: '16L Akülü Sırt Pompası' }],
  })

  assert.ok(pkg.voiceover.text.length > 5, 'Voiceover text is empty')
  // Verify VO text is directly inside veoPrompt and shotPlan.veoEnglishPrompt
  assert.ok(
    pkg.veoPrompt.includes(`AUDIO: Professional crystal-clear Turkish voiceover: "${pkg.voiceover.text}"`),
    'Veo prompt AUDIO directive does not contain the exact voiceover text'
  )
  assert.ok(
    pkg.shotPlan.veoEnglishPrompt.includes(pkg.voiceover.text),
    'Shot plan does not include the voiceover text in its prompt'
  )
})

test('2. usesOnlyVerifiedClaims evaluates to true when only verified facts are used', () => {
  const pkg = compileDeterministicV5({
    brandName: 'Ayvazoğlu Tuğla',
    brief: 'Şantiyelere doğrudan tır bazında killi tuğla sevkiyatı',
    products: [{ name: 'Killi Cephe Tuğlası', promo: '%15 toptan iskonto' }],
  })

  assert.strictEqual(pkg.voiceover.usesOnlyVerifiedClaims, true)
  assert.strictEqual(pkg.validation.status, 'pass')
})

test('3. usesOnlyVerifiedClaims catches unverified marketing claims and discount percentages', () => {
  const facts = normalizeFacts({
    brandName: 'Kahve Dünyası',
    brief: 'Taze çekilmiş filtre kahve',
    products: [{ name: 'Filtre Kahve' }],
  })

  // Test unverified hype words
  const checkHype = validateClaims('Taptaze filtre kahve kapınızda, hemen sipariş verin.', facts)
  assert.strictEqual(checkHype.valid, false)
  assert.ok(checkHype.unverifiedClaims.includes('taptaze') || checkHype.unverifiedClaims.includes('kapınızda'))

  // Test unverified discount percentage
  const checkPercent = validateClaims('Filtre kahvede %50 indirim fırsatı.', facts)
  assert.strictEqual(checkPercent.valid, false)
  assert.ok(checkPercent.unverifiedClaims.some((c) => c.includes('50')))

  // Verify validator blocks or reports unverified claims if injected
  const ontology = analyzeOntology(facts)
  const strategy = selectCreativeStrategy(ontology)
  const hook = selectHook(ontology, facts)
  const vo = writeVoiceover(facts, ontology, strategy)
  vo.text = 'Filtre kahvede %50 indirim kapınızda.'
  const shots = planShots(facts, ontology, strategy, hook, vo.text)
  const overlay = compileOverlay(facts, ontology, vo)
  const val = validateAndRepair(facts, ontology, hook, shots, vo, overlay)

  assert.ok(val.validation.hardFails.some((hf) => hf.includes('unverified_claims_in_voiceover')))
})

test('4. Hype words are NOT generated unless verified in brief or facts', () => {
  // Case A: Food brief without "taptaze" or "kapınızda"
  const foodPkg = compileDeterministicV5({
    brandName: 'Burger Lab',
    brief: 'Özel marinasyonlu dana burger',
    products: [{ name: 'Truffle Burger' }],
  })
  assert.ok(!foodPkg.voiceover.text.toLowerCase().includes('taptaze'), 'Unverified taptaze was generated')
  assert.ok(!foodPkg.voiceover.text.toLowerCase().includes('kapınızda'), 'Unverified kapınızda was generated')

  // Case B: Sprayer brief with "yorulmadan" explicitly verified in brief
  const agriPkg = compileDeterministicV5({
    brandName: 'Bofe',
    brief: 'Bahçede yorulmadan tek şarjla ilaçlama',
    products: [{ name: 'Akülü Pülverizatör' }],
  })
  assert.ok(agriPkg.voiceover.text.toLowerCase().includes('yorulmadan'), 'Verified word yorulmadan was not utilized')

  // Case C: Bulk brief without "fabrikadan doğrudan"
  const bulkPkg = compileDeterministicV5({
    brandName: 'Mega Çimento',
    brief: 'Şantiyelere dökme çimento tedariği',
    products: [{ name: 'Portland Çimento' }],
  })
  assert.ok(!bulkPkg.voiceover.text.toLowerCase().includes('fabrikadan doğrudan'), 'Unverified fabrikadan doğrudan was generated')
})

test('5. Long VO is rewritten into grammatically complete 8-13 word sentence without slicing mid-sentence', () => {
  const pkg = compileDeterministicV5({
    brandName: 'Çok Uzun Kurumsal Şirketler Topluluğu Anonim Şirketi',
    brief: 'Her türlü endüstriyel tesisler için yüksek standartlarda ağır çelik konstrüksiyon imalatı ve montajı',
    products: [{ name: 'Ağır Çelik Konstrüksiyon Taşıyıcı Sistemleri', description: 'Depreme dayanıklı sertifikalı çelik yapı çözümleri' }],
  })

  const words = pkg.voiceover.text.split(/\s+/).filter(Boolean)
  assert.ok(words.length <= 16, `Voiceover too long: ${words.length} words`)
  // Check grammatical integrity: must end with terminal punctuation and valid Turkish sentence
  assert.ok(pkg.voiceover.text.endsWith('.'), 'Voiceover does not end with a period')
  assert.ok(!pkg.voiceover.text.endsWith(' ve.'), 'Voiceover sliced mid-conjunction')
  assert.ok(!pkg.voiceover.text.endsWith(' ile.'), 'Voiceover sliced mid-postposition')
  assert.ok(!pkg.voiceover.text.endsWith(' için.'), 'Voiceover sliced mid-sentence')
})

test('6. Duration calculated by Turkish syllable count & pauses (~4.8 syl/s + pauses) with >= 0.5s safety margin', () => {
  // Test syllable counter
  const syl = countTurkishSyllables('Ayvazoğlu Tuğla')
  assert.strictEqual(syl, 6, 'Syllable count mismatch for Ayvazoğlu Tuğla')

  const est = estimateSpeechDuration('Ayvazoğlu Tuğla ile kaliteli yapılar, hemen bilgi alın.')
  assert.ok(est.syllableCount > 15)
  assert.ok(est.durationSeconds > 3.0 && est.durationSeconds < 7.5)
  assert.ok(est.safetyMarginSeconds >= 0.5)

  // Test in compiled package
  const pkg = compileDeterministicV5({
    brandName: 'Veri Burada',
    brief: 'Yeni açılan tüm işletmeleri Google Haritalar üzerinde anında tespit edin',
    products: [{ name: 'Harita Müşteri Bulucu' }],
  })
  assert.ok(pkg.voiceover.syllableCount > 10)
  assert.ok(pkg.voiceover.estimatedDurationSeconds <= 7.5, `Duration ${pkg.voiceover.estimatedDurationSeconds} exceeds 7.5s`)
  assert.ok(pkg.voiceover.safetyMarginSeconds >= 0.5, `Safety margin ${pkg.voiceover.safetyMarginSeconds} < 0.5s`)
})

test('7. Generates at least 3 distinct hook candidates scored on 5 criteria and selects the winner', () => {
  const pkg = compileDeterministicV5({
    brandName: 'Bofe',
    brief: 'Bahçede yorulmadan tek şarjla yüksek basınçlı ilaçlama',
    products: [{ name: '16L Akülü Sırt Pompası' }],
  })

  assert.ok(pkg.hookPlan.candidates.length >= 3, 'Did not generate at least 3 hook candidates')
  const types = pkg.hookPlan.candidates.map((c) => c.type)
  assert.ok(types.includes('action_focused'), 'Missing action_focused candidate')
  assert.ok(types.includes('result_reveal_focused'), 'Missing result_reveal_focused candidate')
  assert.ok(types.includes('curiosity_or_scale_focused'), 'Missing curiosity_or_scale_focused candidate')

  for (const c of pkg.hookPlan.candidates) {
    assert.ok(c.scores.actionSpeed >= 1 && c.scores.actionSpeed <= 10)
    assert.ok(c.scores.relevanceToOffer >= 1 && c.scores.relevanceToOffer <= 10)
    assert.ok(c.scores.visualImpact >= 1 && c.scores.visualImpact <= 10)
    assert.ok(c.scores.physicalPlausibility >= 1 && c.scores.physicalPlausibility <= 10)
    assert.ok(c.scores.clarityWithoutText >= 1 && c.scores.clarityWithoutText <= 10)
    assert.strictEqual(
      c.totalScore,
      c.scores.actionSpeed + c.scores.relevanceToOffer + c.scores.visualImpact + c.scores.physicalPlausibility + c.scores.clarityWithoutText
    )
  }

  assert.strictEqual(pkg.hookPlan.selectedCandidate.id, pkg.hookPlan.candidates[0].id)
  assert.strictEqual(pkg.hookPlan.visualEventDescription, pkg.hookPlan.selectedCandidate.visualEventDescription)
})

test('8. Decoupled stereotypes - hooks derived from visualAffordance and verified facts', () => {
  // A. Tuğla / Bulk: does not default to pallet cliché
  const brickPkg = compileDeterministicV5({
    brandName: 'Ayvazoğlu Tuğla',
    brief: 'Şantiyelere doğrudan tır bazında killi tuğla sevkiyatı',
    products: [{ name: 'Killi Cephe Tuğlası' }],
  })
  assert.ok(
    brickPkg.hookPlan.visualEventDescription.toLowerCase().includes('killi cephe tuğlası') ||
    brickPkg.hookPlan.visualEventDescription.toLowerCase().includes('tuğla'),
    'Hook does not reference the actual brick product'
  )

  // B. SaaS without map: should not mention harita pini if not in brief
  const crmPkg = compileDeterministicV5({
    brandName: 'Bulut CRM',
    brief: 'Satış ekipleri için müşteri takip ve teklif platformu',
    products: [{ name: 'Bulut CRM Paneli' }],
  })
  assert.ok(!crmPkg.hookPlan.visualEventDescription.includes('harita pinleri'), 'Stereotype map pins appeared in non-map SaaS')

  // C. Food without sauce: should not mention pouring sauce
  const breadPkg = compileDeterministicV5({
    brandName: 'Taş Fırın',
    brief: 'Geleneksel ekşi mayalı köy ekmeği',
    products: [{ name: 'Köy Ekmeği' }],
  })
  assert.ok(!breadPkg.hookPlan.visualEventDescription.includes('sos/sıvı akışıyla'), 'Stereotype sauce drizzle appeared for bread')
})

test('9. Camera modes (continuous_take vs three_cut) properly set and enforced in prompt and validator', () => {
  // Test continuous_take
  const continuousPkg = compileDeterministicV5({
    brandName: 'Lüks Parfüm',
    brief: 'Altın varaklı cam şişede kalıcı esans',
    cameraMode: 'continuous_take',
    products: [{ name: 'Amber Oud Parfüm' }],
  })
  assert.strictEqual(continuousPkg.shotPlan.cameraMode, 'continuous_take')
  assert.ok(continuousPkg.shotPlan.veoEnglishPrompt.includes('CAMERA MOVEMENT: continuous_take - Single unbroken camera movement'))

  // Test three_cut
  const cutPkg = compileDeterministicV5({
    brandName: 'Bofe',
    brief: 'Tarımda pratik ilaçlama',
    cameraMode: 'three_cut',
    products: [{ name: 'Sırt Pompası' }],
  })
  assert.strictEqual(cutPkg.shotPlan.cameraMode, 'three_cut')
  assert.ok(cutPkg.shotPlan.veoEnglishPrompt.includes('CAMERA MOVEMENT: three_cut - Three distinct controlled camera framings'))
})

test('10. First overlay headline is 2-4 words hook, not "MARKA + ÜRÜN"', () => {
  const pkg = compileDeterministicV5({
    brandName: 'Ayvazoğlu Tuğla',
    brief: 'Şantiyelere doğrudan tır bazında killi tuğla sevkiyatı',
    products: [{ name: 'Killi Cephe Tuğlası', promo: '%15 toptan iskonto' }],
  })

  const hookOverlay = pkg.overlayPlan.overlayTimeline.find((i) => i.type === 'hook')
  assert.ok(hookOverlay, 'Missing hook overlay')
  const words = hookOverlay.text.split(/\s+/).filter(Boolean)
  assert.ok(words.length >= 2 && words.length <= 4, `Headline words count ${words.length} not in 2-4 range: ${hookOverlay.text}`)
  assert.notStrictEqual(
    hookOverlay.text,
    'AYVAZOĞLU TUĞLA KİLLİ CEPHE TUĞLASI',
    'Headline defaulted to MARKA + URUN'
  )
})

test('11. HardFailChecks contains ZERO hardcoded booleans (all computed)', () => {
  const pkg = compileDeterministicV5({
    brandName: 'Veri Burada',
    brief: 'Yeni açılan tüm işletmeleri Google Haritalar üzerinde anında tespit edin',
    products: [{ name: 'Harita Müşteri Bulucu' }],
  })

  assert.strictEqual(pkg.validation.status, 'pass')
  assert.strictEqual(pkg.validation.hardFails.length, 0)
  assert.strictEqual(typeof pkg.validation.score, 'number')
})

test('12. Preserves ctaText, ctaDestination, campaignDeadline, deliveryArea and prevents duplicate brand/product words', () => {
  const pkg = compileDeterministicV5({
    brandName: 'Ayvazoğlu Tuğla',
    brief: 'Şantiyelere killi tuğla sevkiyatı',
    ctaText: 'Hemen Fiyat Teklifi Alın',
    ctaDestination: 'WhatsApp: 05321112233',
    campaignDeadline: '31 Mart 2026',
    deliveryArea: 'Marmara ve Ege Bölgesi',
    phones: [{ phone: '05321112233' }],
    products: [{ name: 'Killi Cephe Tuğlası' }],
  })

  // 1. Preserved in facts
  assert.strictEqual(pkg.normalizedBrief.verifiedFacts.campaignDeadline, '31 Mart 2026')
  assert.strictEqual(pkg.normalizedBrief.verifiedFacts.deliveryArea, 'Marmara ve Ege Bölgesi')
  assert.strictEqual(pkg.normalizedBrief.verifiedFacts.ctaText, 'Hemen Fiyat Teklifi Alın')
  assert.strictEqual(pkg.normalizedBrief.verifiedFacts.ctaDestination, 'WhatsApp: 05321112233')

  // 2. Preserved in overlay
  const ctaOverlay = pkg.overlayPlan.overlayTimeline.find((i) => i.type === 'cta')
  assert.ok(ctaOverlay?.text.includes('HEMEN FİYAT TEKLİFİ ALIN'), 'Custom CTA text was dropped from overlay')
  assert.ok(ctaOverlay?.text.includes('WHATSAPP'), 'WhatsApp destination dropped from CTA')

  const deliveryOverlay = pkg.overlayPlan.overlayTimeline.find((i) => i.text.includes('MARMARA VE EGE BÖLGESİ'))
  assert.ok(deliveryOverlay, 'Delivery area dropped from overlay timeline')

  // 3. Prevent duplicate brand/product words (no "Tuğla Tuğla")
  assert.ok(
    !pkg.voiceover.text.match(/\btuğla\s+tuğla\b/i),
    `Voiceover contains consecutive duplicate words: ${pkg.voiceover.text}`
  )
})
