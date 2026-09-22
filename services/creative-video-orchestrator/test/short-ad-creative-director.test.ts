import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ShortAdCreativeDirector,
  VeoPromptCompiler,
  createBrandContextSnapshot,
  CreativeQA,
} from '../src/index.js'

test('ShortAdCreativeDirector - generates full ShortAdMasterPlan with 0-8s timed beats, audio plan, and exact VO', async () => {
  const director = new ShortAdCreativeDirector()
  const snapshot = createBrandContextSnapshot({
    org_id: 'org_bofe',
    brand_name: 'Bofe Tarım',
    sector_profile: 'agriculture_equipment',
    logo_asset_id: 'logo_bofe',
    logo_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    products: [
      {
        product_id: 'prod_bofe_16l',
        name: 'Bofe 16L Akülü Sırt Pompası',
        description: 'Tarımsal Akülü İlaçlama Pompası',
        asset_id: 'asset_bofe_16l',
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      },
    ],
    campaign: {
      headline: 'Bofe Akülü İlaçlama Pompası',
      offer: 'Sezon İndirimi %25',
      price: '1.499 TL',
      cta: 'Şimdi Sipariş Ver',
    },
  })

  const masterPlan = await director.planCommercial(snapshot, 'physical_product', [])

  assert.equal(masterPlan.brand_name, 'Bofe Tarım')
  assert.ok(masterPlan.creative_idea.includes('Bofe'))
  assert.equal(masterPlan.ad_format, 'PERFORMANCE_DEMO')
  assert.equal(masterPlan.beats.length, 5)

  // Verify 5 micro-beats aligned with PERFORMANCE_DEMO advertising grammar
  assert.equal(masterPlan.beats[0].start, 0.0)
  assert.equal(masterPlan.beats[0].end, 0.7)
  assert.equal(masterPlan.beats[0].purpose, 'HOOK')

  assert.equal(masterPlan.beats[1].start, 0.7)
  assert.equal(masterPlan.beats[1].end, 2.2)
  assert.equal(masterPlan.beats[1].purpose, 'REVEAL')

  assert.equal(masterPlan.beats[2].start, 2.2)
  assert.equal(masterPlan.beats[2].end, 4.5)
  assert.equal(masterPlan.beats[2].purpose, 'PRODUCT_PROOF')

  assert.equal(masterPlan.beats[3].start, 4.5)
  assert.equal(masterPlan.beats[3].end, 6.2)
  assert.equal(masterPlan.beats[3].purpose, 'BENEFIT')

  assert.equal(masterPlan.beats[4].start, 6.2)
  assert.equal(masterPlan.beats[4].end, 8.0)
  assert.equal(masterPlan.beats[4].purpose, 'BRAND_CLOSE')

  // Verify audio plan with continuous timed Turkish dialogue
  assert.equal(masterPlan.audio_plan.spoken_language, 'tr-TR')
  assert.equal(masterPlan.audio_plan.speech_mode, 'native_veo_dialogue')
  assert.equal(masterPlan.audio_plan.allow_paraphrase, false)
  assert.equal(masterPlan.audio_plan.allow_translation, false)
  assert.equal(masterPlan.speech_timeline?.length, 3)

  // Verify 18-24 word count requirement across 0-8s continuous speech
  const wordCount = masterPlan.master_spoken_script?.trim().split(/\s+/).length || 0
  assert.ok(wordCount >= 18 && wordCount <= 24, `Expected 18-24 words, got ${wordCount}`)

  // Verify strict copy hierarchy (max 3 levels, no emojis)
  assert.ok(masterPlan.on_screen_copy?.hook)
  assert.ok(masterPlan.on_screen_copy?.benefit_or_proof)
  assert.ok(masterPlan.on_screen_copy?.brand_or_cta)
  assert.equal(/[\u{1F300}-\u{1F9FF}]/u.test(masterPlan.on_screen_copy?.hook || ''), false)

  // Verify editing rhythm
  assert.deepEqual(masterPlan.editing_rhythm?.cut_points, [0.7, 2.2, 4.5, 6.2])

  // Verify end card visual transition
  assert.equal(masterPlan.end_card_plan.visual_transition, 'background_continuation')
  assert.equal(masterPlan.end_card_plan.cta_text, 'Şimdi Sipariş Ver')
})

test('CreativeQA - evaluateSpokenDialogueQA enforces exact Turkish speech match', () => {
  const passReport = CreativeQA.evaluateSpokenDialogueQA({
    expectedSpokenLine: 'İşinizi hızlandıran güç, şimdi yanınızda.',
    actualAudioTranscript: 'İşinizi hızlandıran güç, şimdi yanınızda.',
    spokenLanguage: 'tr-TR',
  })
  assert.equal(passReport.passed, true)

  const failReport = CreativeQA.evaluateSpokenDialogueQA({
    expectedSpokenLine: 'İşinizi hızlandıran güç, şimdi yanınızda.',
    actualAudioTranscript: 'Gücünüzü artıran teknoloji burada.', // Paraphrased/wrong!
    spokenLanguage: 'tr-TR',
  })
  assert.equal(failReport.passed, false)
  assert.equal(failReport.hardFailGate, 'SPOKEN_DIALOGUE_FAIL')
})

test('VeoPromptCompiler - embeds exact Turkish spoken dialogue and forbids visible on-screen text/logos', async () => {
  const director = new ShortAdCreativeDirector()
  const compiler = new VeoPromptCompiler()

  const snapshot = createBrandContextSnapshot({
    org_id: 'org_bofe',
    brand_name: 'Bofe Tarım',
    sector_profile: 'agriculture_equipment',
    logo_asset_id: 'logo_bofe',
    logo_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    products: [
      {
        product_id: 'prod_bofe_16l',
        name: 'Bofe 16L Akülü Sırt Pompası',
        description: 'Tarımsal Akülü İlaçlama Pompası',
        asset_id: 'asset_bofe_16l',
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      },
    ],
    campaign: {
      headline: 'Bofe 16L Kampanya',
      price: '1.499 TL',
      cta: 'Şimdi Sipariş Ver',
    },
  })

  const masterPlan = await director.planCommercial(snapshot, 'physical_product', [])
  const veoCompilation = compiler.compileVeoPrompt(masterPlan)

  // Check aspect ratio and duration
  assert.equal(veoCompilation.aspectRatio, '9:16')
  assert.equal(veoCompilation.targetDurationSec, 8)

  // Verify Turkish dialogue is embedded verbatim
  assert.ok(veoCompilation.cinematicPrompt.includes('The spoken language is Turkish (tr-TR)'))
  assert.ok(veoCompilation.cinematicPrompt.includes(`Exact spoken line: "${masterPlan.master_spoken_script}"`))
  assert.ok(veoCompilation.cinematicPrompt.includes('Continuous dialogue across entire duration:'))
  assert.ok(veoCompilation.cinematicPrompt.includes('Speak this sentence exactly in Turkish. Do not translate it. Do not paraphrase it.'))

  // Preserves @HeroProduct and includes @BrandLogo for hybrid flow
  assert.ok(veoCompilation.canonicalHandlesInPrompt.includes('@HeroProduct'))
  assert.ok(veoCompilation.canonicalHandlesInPrompt.includes('@BrandLogo'))

  // Must strictly forbid visible text and invented/altered logos
  assert.ok(
    veoCompilation.cinematicPrompt.includes('NO generated on-screen text')
  )
  assert.ok(
    veoCompilation.cinematicPrompt.includes('NO INVENTED LOGO')
  )
  assert.ok(
    veoCompilation.cinematicPrompt.includes('NO FAKE LOGO')
  )

  // Verify that the campaign price '1.499 TL' is NOT in the prompt for Veo
  assert.equal(veoCompilation.cinematicPrompt.includes('1.499 TL'), false)
  // Verify that the CTA 'Şimdi Sipariş Ver' is NOT in the prompt for Veo
  assert.equal(veoCompilation.cinematicPrompt.includes('Şimdi Sipariş Ver'), false)
})
