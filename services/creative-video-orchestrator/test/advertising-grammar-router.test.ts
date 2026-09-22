import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ShortAdFormatRouter,
  ShortAdCreativeDirector,
  createBrandContextSnapshot,
  createJobAssetManifest,
} from '../src/index.js'

test('ShortAdFormatRouter - routes physical product promotion/conversion to PERFORMANCE_DEMO (never BRAND_CINEMATIC)', () => {
  const router = new ShortAdFormatRouter()

  const format = router.selectFormat('conversion', 'physical_product', [])
  assert.equal(format, 'PERFORMANCE_DEMO')

  const grammar = router.getGrammar(format)
  assert.equal(grammar.format, 'PERFORMANCE_DEMO')
  assert.deepEqual(grammar.cut_points, [0.7, 2.2, 4.5, 6.2])
  assert.equal(grammar.micro_beats.length, 5)
  assert.deepEqual(grammar.target_word_count_range, [18, 24])
  assert.equal(grammar.on_screen_copy_max_levels, 3)
})

test('ShortAdFormatRouter - routes software / saas to SOFTWARE_DEMO and problem to PROBLEM_SOLUTION', () => {
  const router = new ShortAdFormatRouter()

  const saasFormat = router.selectFormat('conversion', 'saas_software', [])
  assert.equal(saasFormat, 'SOFTWARE_DEMO')

  const problemFormat = router.selectFormat('pain_point_relief', 'physical_product', [])
  assert.equal(problemFormat, 'PROBLEM_SOLUTION')

  const beforeAfterFormat = router.selectFormat('before_and_after_comparison', 'physical_product', [])
  assert.equal(beforeAfterFormat, 'BEFORE_AFTER')
})

test('ShortAdCreativeDirector - planFromJobManifest generates complete PERFORMANCE_DEMO grammar without hardcoding', async () => {
  const director = new ShortAdCreativeDirector()

  const readyManifest = createJobAssetManifest({
    job_id: 'job_bofe_perf_demo',
    org_id: 'org_bofe',
    authoritative_assets: {
      brandLogo: {
        handle: '@BrandLogo',
        assetId: 'logo_bofe_01',
        filePath: 'scratch/bofe_logo_pure_transparent.png',
        sha256: '0576350c4d92212bd8c219b4b095cf3bc2060302b978753549ad1d3d95c4d8e8',
        mimeType: 'image/png',
      },
      heroProduct: {
        handle: '@HeroProduct',
        assetId: 'prod_bofe_01',
        filePath: 'scratch/bofe_authoritative_product.jpg',
        sha256: 'fd99aabb97b39bb3d0557def0f45725d1e7917203777121e775d99d4c71f8e4c',
        mimeType: 'image/jpeg',
      },
    },
    authoritative_facts: {
      brand_name: 'Bofe',
      product_name: 'Bofe 16L Akülü Sırt Pompası',
      description: '16 litre kapasiteli şarjlı sırt tipi ilaçlama pompası.',
      cta: 'Bofe Güvencesiyle',
    },
  })

  assert.equal(readyManifest.status, 'READY')
  if (readyManifest.status !== 'READY') return

  const masterPlan = await director.planFromJobManifest(readyManifest.manifest)

  assert.equal(masterPlan.ad_format, 'PERFORMANCE_DEMO')
  assert.equal(masterPlan.beats.length, 5)
  assert.deepEqual(masterPlan.editing_rhythm?.cut_points, [0.7, 2.2, 4.5, 6.2])

  // Verify continuous timed speech across 0-8s
  assert.equal(masterPlan.speech_timeline?.length, 3)
  const wordCount = masterPlan.master_spoken_script?.trim().split(/\s+/).length || 0
  assert.ok(wordCount >= 18 && wordCount <= 24, `Word count should be in [18, 24], got ${wordCount}`)

  // Verify end card visual transition inherits footage
  assert.equal(masterPlan.end_card_plan.visual_transition, 'background_continuation')

  // Verify maximum 3 message levels on-screen without emojis
  assert.ok(masterPlan.on_screen_copy?.hook)
  assert.ok(masterPlan.on_screen_copy?.benefit_or_proof)
  assert.ok(masterPlan.on_screen_copy?.brand_or_cta)
  assert.equal(/[\u{1F300}-\u{1F9FF}]/u.test(masterPlan.on_screen_copy?.hook || ''), false)
})

test('Voice-As-Spine Principle - speech carries the commercial across the timeline with natural cadence', () => {
  const router = new ShortAdFormatRouter()
  const grammar = router.getGrammar('PERFORMANCE_DEMO')

  assert.equal(grammar.voice_as_spine.is_audio_spine, true)
  assert.equal(grammar.voice_as_spine.no_mechanical_padding, true)
  assert.ok(grammar.voice_as_spine.min_timeline_coverage_pct >= 80)
  assert.deepEqual(grammar.voice_as_spine.natural_words_per_second_range, [2.4, 3.2])
  assert.equal(grammar.voice_as_spine.kinetic_typography_mode, 'capcut_kinetic_neon')
})

test('DeterministicCampaignTextRenderer - builds CapCut kinetic ASS without black boxes and with neon active word', async () => {
  const { DeterministicCampaignTextRenderer } = await import('../src/index.js')
  const renderer = new DeterministicCampaignTextRenderer()

  const words = [
    { word: 'Zorlu', start: 0.0, end: 0.3 },
    { word: 'bahçe', start: 0.3, end: 0.58 },
    { word: 'işlerinde', start: 0.58, end: 0.98 },
    { word: 'güç', start: 0.98, end: 1.12 },
  ]

  const ass = renderer.buildCapCutKineticAss(words)
  assert.ok(ass.includes('[Script Info]'))
  assert.ok(ass.includes('Style: CapCutNeon,Arial Black,58'))
  assert.ok(ass.includes('{\\c&H0026FFFF&}ZORLU'))
  assert.ok(ass.includes('{\\c&H00FFFFFF&}BAHÇE'))
})

