import test from 'node:test'
import assert from 'node:assert'
import {
  ChatGPTCreativeDirectorV2,
  ChatGPTCreativeCritic,
  ChatGPTVideoReviewer,
  FrameSampler,
  AssetEqualityGate,
  CreativeContextBuilder,
  ReferenceStyleAnalyzer,
  globalHumanFeedbackStore,
  type MultimodalAttachment,
  type CreativeContext,
} from '../src/index.js'

function buildTestContext(overrides?: Partial<CreativeContext>): CreativeContext {
  const attachments: MultimodalAttachment[] = [
    {
      asset_id: 'prod_bofe_hero',
      org_id: 'org_bofe',
      sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      role: 'hero_product',
      canonical_handle: '@HeroProduct',
      file_path: '/assets/bofe_sprayer.png',
      attached_successfully: true,
      visual_attributes: {
        shape: 'sırt tipi tank gövdesi, sarı renkli plastik hazne',
        primary_colors: ['#FFD700', '#000000'],
        visible_handles: true,
        visible_controls: true,
      },
    },
    {
      asset_id: 'logo_bofe',
      org_id: 'org_bofe',
      sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      role: 'logo',
      canonical_handle: '@BrandLogo',
      file_path: '/assets/bofe_logo.png',
      attached_successfully: true,
    },
  ]

  return CreativeContextBuilder.build({
    org_id: 'org_bofe',
    job_id: 'job_test_123',
    brand_profile: {
      brand_name: 'Bofe Tarım',
      sector: 'agriculture_equipment',
      tone_of_voice: ['profesyonel', 'güvenilir'],
      visual_personality: 'Gerçek bahçe ve tarla ortamı, kaliteli çekim',
      palette: ['#FFD700', '#008000'],
      typography_preferences: 'Montserrat Bold',
      preferred_copy_style: 'Voice-as-spine akıcı ticari seslendirme',
      preferred_visual_energy: 'Dinamik, sonuç odaklı',
      logo_usage_rules: ['Kanonik logo oranları korunmalı'],
      visual_dos: ['Gerçek zeytinlikte ilaçlama yap'],
      visual_donts: ['Fabrika veya şantiye gösterme'],
      approved_patterns: ['macro_first', 'human_action_motion'],
      rejected_patterns: ['mini_film_not_ad', 'too_many_slogans'],
      successful_creative_traits: ['high_product_visibility', 'voice_spine_continuity'],
    },
    campaign_context: {
      selected_product_or_service: 'Bofe Şarjlı Sırt Pompası',
      campaign_objective: 'Bahçıvan ve çiftçilere şarjlı ilaçlama pompasını tanıtmak',
      user_style_preference: 'AUTO',
      target_platform: 'reels_tiktok_shorts',
      duration: 8,
      aspect_ratio: '9:16',
      language: 'tr',
      campaign_message: 'Zorlu bahçe işlerinde tek tuşla güçlü ilaçlama',
      verified_offer: 'Şimdi Tanıtım Fiyatıyla',
      verified_price: '2.499 TL',
      verified_cta: 'Hemen İnceleyin',
      verified_phone: '+90 850 123 4567',
      verified_url: 'bofe.com.tr',
      subtitle_mode: 'auto',
    },
    attachments,
    recent_fingerprints: overrides?.recent_fingerprints || [],
    verified_facts: [
      { claim: '16 litre depo kapasitesi', source_type: 'catalog', source_id: 'cat_01' },
      { claim: 'Şarjlı kullanım', source_type: 'manual_verified', source_id: 'spec_02' },
    ],
  })
}

test('Creative Director returns 3 genuinely distinct concepts (different hooks, stories, variants)', async () => {
  const director = new ChatGPTCreativeDirectorV2()
  const context = buildTestContext()

  const concepts = await director.generateThreeConcepts(context)

  assert.strictEqual(concepts.length, 3, 'Must return exactly 3 concepts')
  assert.notStrictEqual(concepts[0].concept_id, concepts[1].concept_id)
  assert.notStrictEqual(concepts[1].concept_id, concepts[2].concept_id)

  // Verify genuine creative differences
  assert.notStrictEqual(concepts[0].format_variant, concepts[1].format_variant, 'Concepts must use different format variants')
  assert.notStrictEqual(concepts[0].hook_type, concepts[1].hook_type, 'Concepts must use different hook types')
  assert.notStrictEqual(concepts[0].story_structure, concepts[2].story_structure, 'Concepts must use different story structures')
})

test('Creative Director sees real multimodal asset references with provenance', async () => {
  const context = buildTestContext()
  assert.strictEqual(context.asset_manifest.all_attached, true)
  assert.strictEqual(context.asset_manifest.attached_asset_count, 2)

  const hero = context.asset_manifest.attachments.find(a => a.canonical_handle === '@HeroProduct')
  assert.ok(hero, '@HeroProduct must be in attachments')
  assert.strictEqual(hero?.sha256, '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08')
  assert.strictEqual(hero?.visual_attributes?.visible_handles, true)
})

test('Missing GPT attachment fails closed with GPT_ASSET_ATTACHMENT_FAILED', () => {
  assert.throws(
    () => {
      CreativeContextBuilder.build({
        org_id: 'org_test',
        job_id: 'job_fail',
        brand_profile: {
          brand_name: 'Test', sector: 'tech', tone_of_voice: [], visual_personality: '', palette: [],
          typography_preferences: '', preferred_copy_style: '', preferred_visual_energy: '', logo_usage_rules: [],
          visual_dos: [], visual_donts: [], approved_patterns: [], rejected_patterns: [], successful_creative_traits: [],
        },
        campaign_context: {
          selected_product_or_service: 'Test Prod', campaign_objective: 'Obj', user_style_preference: 'AUTO',
          target_platform: 'reels', duration: 8, aspect_ratio: '9:16', language: 'tr', subtitle_mode: 'auto',
        },
        attachments: [
          {
            asset_id: 'a1', org_id: 'org_test', sha256: 'sha1', role: 'hero_product',
            canonical_handle: '@HeroProduct', file_path: '/p1.png', attached_successfully: false, // FAILED ATTACHMENT
          },
        ],
      })
    },
    /GPT_ASSET_ATTACHMENT_FAILED/,
    'Builder must fail closed if expected asset attachment fails'
  )
})

test('Same sector + different style preferences produce different creative concepts', async () => {
  const director = new ChatGPTCreativeDirectorV2()
  const ctxA = buildTestContext()
  ctxA.campaign_context.user_style_preference = 'FAST_SALES'
  const conceptsA = await director.generateThreeConcepts(ctxA)
  const selA = director.selectWinningConcept(conceptsA, ctxA)

  const ctxB = buildTestContext()
  ctxB.campaign_context.user_style_preference = 'PREMIUM'
  const conceptsB = await director.generateThreeConcepts(ctxB)
  const selB = director.selectWinningConcept(conceptsB, ctxB)

  assert.notStrictEqual(selA.selected_concept.concept_id, selB.selected_concept.concept_id)
  assert.strictEqual(selA.selected_concept.format_variant, 'RESULT_FIRST')
  assert.strictEqual(selB.selected_concept.format_variant, 'STEP_BY_STEP')
})

test('Same style + different sector produces different environmental and physical realization', async () => {
  const director = new ChatGPTCreativeDirectorV2()
  const ctxAgri = buildTestContext()
  ctxAgri.brand_profile.sector = 'agriculture_equipment'
  const conceptsAgri = await director.generateThreeConcepts(ctxAgri)
  const planAgri = await director.buildDetailedMasterPlan(conceptsAgri[0], ctxAgri)

  const ctxConst = buildTestContext()
  ctxConst.brand_profile.brand_name = 'Ayvazoğlu Tuğla'
  ctxConst.brand_profile.sector = 'construction_materials'
  ctxConst.campaign_context.selected_product_or_service = 'İzo Killi Blok Tuğla'
  const conceptsConst = await director.generateThreeConcepts(ctxConst)
  const planConst = await director.buildDetailedMasterPlan(conceptsConst[0], ctxConst)

  assert.ok(planAgri.beats[0].visual_action.includes('Bofe'), 'Agri plan features Bofe')
  assert.ok(planConst.beats[0].visual_action.includes('Ayvazoğlu') || planConst.beats[0].visual_action.includes('Tuğla'), 'Const plan features construction materials')
})

test('Recent fingerprint repetition is actively avoided in concept selection', async () => {
  const director = new ChatGPTCreativeDirectorV2()
  const context = buildTestContext({
    recent_fingerprints: [
      {
        tenant_id: 'org_bofe',
        ad_format: 'PERFORMANCE_DEMO',
        format_variant: 'RESULT_FIRST', // Concept A was recently generated!
        hook_type: 'instant_result_impact',
        opening_visual_type: 'result_macro',
        camera_pattern: 'macro_cine_shallow_push',
        environment_type: 'agriculture_equipment',
        speech_structure: 'HOOK_PROOF_PAYOFF',
        end_card_family: 'minimalist_center',
      },
    ],
  })

  const concepts = await director.generateThreeConcepts(context)
  const sel = director.selectWinningConcept(concepts, context)

  // System should avoid repeating RESULT_FIRST and rotate to Concept B (HUMAN_ACTION_FIRST)
  assert.notStrictEqual(sel.selected_concept.format_variant, 'RESULT_FIRST', 'Must not repeat recent format variant')
  assert.strictEqual(sel.selected_concept.format_variant, 'HUMAN_ACTION_FIRST', 'Must pick alternative fresh variant')
})

test('Critic catches UNSUPPORTED_CLAIM and triggers REVISE', async () => {
  const critic = new ChatGPTCreativeCritic()
  const director = new ChatGPTCreativeDirectorV2()
  const context = buildTestContext()

  const concepts = await director.generateThreeConcepts(context)
  const plan = await director.buildDetailedMasterPlan(concepts[0], context)

  // Inject unverified claim into spoken script
  plan.master_spoken_script = 'Bu ürün tamamen su geçirmez ve 20 saat kesintisiz çalışır.'

  const report = await critic.evaluatePlan(plan, context, 0)
  assert.strictEqual(report.decision, 'REVISE', 'Critic must request revision for unverified claims')
  assert.ok(report.failure_codes.includes('UNSUPPORTED_CLAIM'), 'Must contain UNSUPPORTED_CLAIM')
  assert.ok(report.unsupported_claims.length > 0)
})

test('Critic catches MINI_FILM_NOT_AD when opening is artistic landscape without product', async () => {
  const critic = new ChatGPTCreativeCritic()
  const director = new ChatGPTCreativeDirectorV2()
  const context = buildTestContext()

  const concepts = await director.generateThreeConcepts(context)
  const plan = await director.buildDetailedMasterPlan(concepts[0], context)

  // Inject artistic mini-film opening
  plan.beats[0].visual_action = 'Geniş açıda uzun manzara ve dağların üzerinde yavaş gün doğumu'
  plan.beats[0].end = 3.5

  const report = await critic.evaluatePlan(plan, context, 0)
  assert.strictEqual(report.decision, 'REVISE')
  assert.ok(report.failure_codes.includes('MINI_FILM_NOT_AD') || report.failure_codes.includes('PRODUCT_VISIBLE_TOO_LATE'))
})

test('Critic catches WEAK_HOOK when hook is missing or empty', async () => {
  const critic = new ChatGPTCreativeCritic()
  const director = new ChatGPTCreativeDirectorV2()
  const context = buildTestContext()

  const concepts = await director.generateThreeConcepts(context)
  const plan = await director.buildDetailedMasterPlan(concepts[0], context)

  plan.advertising_hook = ''

  const report = await critic.evaluatePlan(plan, context, 0)
  assert.ok(report.failure_codes.includes('WEAK_HOOK'))
})

test('Dynamic beat timing adapts to format instead of fixed template', () => {
  const director = new ChatGPTCreativeDirectorV2()
  const baseDir = (director as any).baseDirector

  const cutsPerf = baseDir.computeDynamicCutPoints('PERFORMANCE_DEMO', 'RESULT_FIRST')
  const cutsUGC = baseDir.computeDynamicCutPoints('UGC_TESTIMONIAL')
  const cutsHero = baseDir.computeDynamicCutPoints('PRODUCT_HERO', 'HERO_EXPLODED_TECH')

  assert.notDeepStrictEqual(cutsPerf, cutsUGC, 'Cuts between Performance Demo and UGC must be different')
  assert.notDeepStrictEqual(cutsPerf, cutsHero, 'Cuts between Performance Demo and Product Hero must be different')
})

test('AssetEqualityGate verifies creative_asset_sha == flow_asset_sha and fails closed on drift', () => {
  const context = buildTestContext()
  const creativeAttachments = context.asset_manifest.attachments

  // 1. Matching Flow assets
  const matchingFlow = [
    {
      asset_id: 'prod_bofe_hero',
      role: 'hero_product',
      sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    },
    {
      asset_id: 'logo_bofe',
      role: 'logo',
      sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    },
  ]
  const passCheck = AssetEqualityGate.verifyEquality(creativeAttachments, matchingFlow)
  assert.strictEqual(passCheck.passed, true, 'Matching SHA must pass')

  // 2. Drifted Flow asset (different SHA)
  const driftedFlow = [
    {
      asset_id: 'prod_bofe_hero',
      role: 'hero_product',
      sha256: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', // DRIFT!
    },
    {
      asset_id: 'logo_bofe',
      role: 'logo',
      sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    },
  ]
  const failCheck = AssetEqualityGate.verifyEquality(creativeAttachments, driftedFlow)
  assert.strictEqual(failCheck.passed, false, 'Drifted SHA must fail')
  assert.ok(failCheck.error?.includes('CREATIVE_ASSET_DRIFT'), 'Must throw CREATIVE_ASSET_DRIFT')
})

test('Video Reviewer receives actual sampled frames and catches PRODUCT_MORPH_FAIL and WRONG_SECTOR', async () => {
  const reviewer = new ChatGPTVideoReviewer()
  const director = new ChatGPTCreativeDirectorV2()
  const context = buildTestContext()

  const concepts = await director.generateThreeConcepts(context)
  const plan = await director.buildDetailedMasterPlan(concepts[0], context)

  // 1. Clean sampled frames -> PASS
  const cleanFrames = [
    { timestamp_sec: 0.3, frame_path: '/mock/frames/frame_0.jpg' },
    { timestamp_sec: 2.5, frame_path: '/mock/frames/frame_1.jpg' },
    { timestamp_sec: 6.0, frame_path: '/mock/frames/frame_2.jpg' },
  ]
  const cleanReport = await reviewer.reviewSampledVideo(cleanFrames, plan, context, 1)
  assert.strictEqual(cleanReport.decision, 'PASS', 'Clean frames should pass')

  // 2. Morph detected -> REGENERATE on attempt 1
  const morphFrames = [
    { timestamp_sec: 0.3, frame_path: '/mock/frames/frame_morph_0.jpg' },
    { timestamp_sec: 2.5, frame_path: '/mock/frames/frame_morph_1.jpg' },
  ]
  const morphReport = await reviewer.reviewSampledVideo(morphFrames, plan, context, 1)
  assert.strictEqual(morphReport.decision, 'REGENERATE', 'Morphing product must trigger regeneration')
  assert.ok(morphReport.failure_codes.includes('PRODUCT_MORPH_FAIL'))
  assert.ok(morphReport.retry_direction.length > 0)

  // 3. Exhausted attempt 2 -> NEEDS_REVIEW (never infinite loop)
  const exhaustedReport = await reviewer.reviewSampledVideo(morphFrames, plan, context, 2)
  assert.strictEqual(exhaustedReport.decision, 'NEEDS_REVIEW', 'Attempt 2 must fall back to NEEDS_REVIEW instead of infinite loop')
})

test('Optional Reference Style Analyzer extracts high-level pacing with strict non-copying directive', () => {
  const analyzer = new ReferenceStyleAnalyzer()
  const profile = analyzer.analyzeReferenceAd({
    reference_id: 'ref_video_01',
    video_path_or_url: '/assets/sample_ref.mp4',
    has_human_actor: true,
    energy_rating: 'rapid',
  })

  assert.strictEqual(profile.camera_energy, 'rapid')
  assert.strictEqual(profile.shot_frequency, 6)
  assert.ok(profile.non_copying_directive.includes('DO NOT copy'))
})

test('Human feedback learning stores approved trends and rejected traits without copying templates', () => {
  globalHumanFeedbackStore.recordFeedback({
    org_id: 'org_bofe',
    job_id: 'job_fb_1',
    creative_revision_id: 'rev_1',
    verdict: 'APPROVED',
    reasons: ['great pacing'],
    creative_fingerprint: {
      tenant_id: 'org_bofe',
      ad_format: 'PERFORMANCE_DEMO',
      format_variant: 'RESULT_FIRST',
      hook_type: 'instant_result_impact',
      opening_visual_type: 'result_macro',
      camera_pattern: 'macro_cine_shallow_push',
      environment_type: 'agriculture_equipment',
      speech_structure: 'HOOK_PROOF_PAYOFF',
      end_card_family: 'minimalist_center',
    },
    created_at: new Date().toISOString(),
  })

  globalHumanFeedbackStore.recordFeedback({
    org_id: 'org_bofe',
    job_id: 'job_fb_2',
    creative_revision_id: 'rev_2',
    verdict: 'REJECTED',
    reasons: ['MINI_FILM_NOT_AD', 'TOO_SLOW'],
    creative_fingerprint: {
      tenant_id: 'org_bofe',
      ad_format: 'BRAND_CINEMATIC',
      format_variant: 'ATMOSPHERIC_SLOW',
      hook_type: 'landscape_pan',
      opening_visual_type: 'scenic_view',
      camera_pattern: 'slow_pan',
      environment_type: 'agriculture_equipment',
      speech_structure: 'POETIC_CLOSE',
      end_card_family: 'minimalist_center',
    },
    created_at: new Date().toISOString(),
  })

  const learned = globalHumanFeedbackStore.getLearnedPreferences('org_bofe')
  assert.ok(learned.approved_trends.includes('opening:result_macro'))
  assert.ok(learned.rejected_traits.includes('MINI_FILM_NOT_AD'))
  assert.ok(learned.rejected_traits.includes('avoid_variant:ATMOSPHERIC_SLOW'))
})
