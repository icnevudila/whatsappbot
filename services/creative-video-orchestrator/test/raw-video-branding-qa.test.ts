import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import {
  ChatGPTVideoReviewer,
  ChatGPTCreativeDirectorV2,
  type CreativeContext,
  type SampledFrame,
} from '../src/index.js'

function buildTestContext(): CreativeContext {
  return {
    org_id: 'tenant_bofe_test',
    job_id: 'job_test_qa_hardening',
    campaign_id: 'camp_autumn_olive_2026',
    brand_profile: {
      brand_name: 'Bofe Tarım',
      sector: 'Tarım ve Bahçe Makineleri',
      tone_voice: 'Güvenilir, dinamik, doğrudan sonuca odaklı',
      visual_style: 'Doğal gün ışığı, gerçek zeytin bahçesi, sinematik reklam estetiği',
      forbidden_elements: ['araba yıkama', 'oto kuaför', 'yapay stüdyo', 'yabancı marka logosu'],
    },
    campaign_context: {
      goal: 'Bofe Şarjlı Sırt Pompası için 8 saniyelik yüksek etkili ürün odaklı video reklam',
      target_audience: 'Bahçe ve tarım ile uğraşan profesyonel ve hobi kullanıcılar',
      primary_message: 'Zahmetsiz, kesintisiz ve güçlü ilaçlama performansı',
      key_benefits: ['16 litre geniş depo', 'Şarjlı motor', 'Sırtta ergonomik taşıma', 'Pirinç püskürtme ucu'],
    },
    verified_facts: [
      { fact_id: 'vf_01', category: 'product_spec', statement: 'Bofe Şarjlı Sırt Pompası 16 litre depo hacmine sahiptir.', source: 'technical_datasheet' },
      { fact_id: 'vf_02', category: 'brand', statement: 'Bofe Tarım tescilli Türk tarım makineleri markasıdır.', source: 'trademark_registry' },
    ],
    asset_manifest: {
      manifest_id: 'mf_bofe_test',
      org_id: 'tenant_bofe_test',
      job_id: 'job_test_qa_hardening',
      attached_asset_count: 2,
      attachments: [
        {
          asset_id: 'prod_bofe_sprayer',
          org_id: 'tenant_bofe_test',
          role: 'hero_product',
          canonical_handle: '@HeroProduct',
          local_path: '/assets/bofe_product.jpg',
          sha256: 'fd99aabb97b39bb3d0557def0f45725d1e7917203777121e775d99d4c71f8e4c',
          byte_size: 35840,
          mime_type: 'image/jpeg',
          attached_successfully: true,
          provider_attachment_id: 'att_hero_01',
          visual_provenance: {
            is_master: true,
            aspect_ratio: 1.0,
            primary_colors: ['#00A896', '#333333'],
            detected_features: ['turquoise tank', 'brass spray lance', 'bofe brand logo printed on tank'],
          },
        },
        {
          asset_id: 'logo_bofe',
          org_id: 'tenant_bofe_test',
          role: 'logo',
          canonical_handle: '@BrandLogo',
          local_path: '/assets/bofe_logo.png',
          sha256: '0576350c4d92212bd8c219b4b095cf3bc2060302b978753549ad1d3d95c4d8e8',
          byte_size: 7280,
          mime_type: 'image/png',
          attached_successfully: true,
          provider_attachment_id: 'att_logo_01',
          visual_provenance: {
            is_master: true,
            aspect_ratio: 2.73,
            primary_colors: ['#FFFFFF'],
            detected_features: ['bofe pure transparent logo text'],
          },
        },
      ],
    },
    recent_fingerprints: [],
  }
}

test('RAW VIDEO QA: canonical logo physically printed on product -> PASS', async () => {
  const reviewer = new ChatGPTVideoReviewer()
  const director = new ChatGPTCreativeDirectorV2()
  const context = buildTestContext()
  const concepts = await director.generateThreeConcepts(context)
  const plan = await director.buildDetailedMasterPlan(concepts[0]!, context)

  const diegeticFrames: SampledFrame[] = [
    { timestamp_sec: 0.3, frame_path: '/mock/frames/frame_macro_nozzle.jpg' },
    { timestamp_sec: 2.5, frame_path: '/mock/frames/frame_diegetic_printed_logo_on_tank.jpg', is_diegetic_product_branding_only: true },
    { timestamp_sec: 5.0, frame_path: '/mock/frames/frame_spraying_field.jpg' },
    { timestamp_sec: 7.7, frame_path: '/mock/frames/frame_clean_orchard_hold.jpg' },
  ]

  const report = await reviewer.reviewSampledVideo(diegeticFrames, plan, context, 1)
  assert.strictEqual(report.decision, 'PASS', 'Physical canonical branding on product must PASS')
  assert.strictEqual(report.non_diegetic_branding_detected, false)
  assert.strictEqual(report.failure_codes.length, 0)
})

test('RAW VIDEO QA: floating artificial logo overlay -> FAIL / REGENERATE', async () => {
  const reviewer = new ChatGPTVideoReviewer()
  const director = new ChatGPTCreativeDirectorV2()
  const context = buildTestContext()
  const concepts = await director.generateThreeConcepts(context)
  const plan = await director.buildDetailedMasterPlan(concepts[0]!, context)

  const floatingLogoFrames: SampledFrame[] = [
    { timestamp_sec: 0.3, frame_path: '/mock/frames/frame_macro.jpg' },
    { timestamp_sec: 2.5, frame_path: '/mock/frames/frame_floating_logo_overlay.jpg' },
    { timestamp_sec: 7.0, frame_path: '/mock/frames/frame_closing.jpg' },
  ]

  const report = await reviewer.reviewSampledVideo(floatingLogoFrames, plan, context, 1)
  assert.strictEqual(report.decision, 'REGENERATE', 'Floating artificial logo must trigger REGENERATE')
  assert.ok(report.failure_codes.includes('NON_DIEGETIC_GENERATED_BRANDING'))
  assert.ok(report.failure_codes.includes('GENERATED_LOGO_OR_TEXT_FAIL'))
  assert.strictEqual(report.non_diegetic_branding_detected, true)
  assert.ok(report.retry_direction[0]!.includes('Preserve the canonical physical product'))
})

test('RAW VIDEO QA: AI-generated subtitle/lower-third -> FAIL / REGENERATE', async () => {
  const reviewer = new ChatGPTVideoReviewer()
  const director = new ChatGPTCreativeDirectorV2()
  const context = buildTestContext()
  const concepts = await director.generateThreeConcepts(context)
  const plan = await director.buildDetailedMasterPlan(concepts[0]!, context)

  const subtitleFrames: SampledFrame[] = [
    { timestamp_sec: 0.3, frame_path: '/mock/frames/frame_0.jpg' },
    { timestamp_sec: 3.3, frame_path: '/mock/frames/frame_ai_subtitle_lower_third.jpg', has_generated_subtitles: true },
    { timestamp_sec: 7.7, frame_path: '/mock/frames/frame_hold.jpg' },
  ]

  const report = await reviewer.reviewSampledVideo(subtitleFrames, plan, context, 1)
  assert.strictEqual(report.decision, 'REGENERATE', 'AI generated subtitle must trigger REGENERATE')
  assert.ok(report.failure_codes.includes('NON_DIEGETIC_GENERATED_BRANDING'))
  assert.strictEqual(report.hallucinated_typography_detected, true)
})

test('RAW VIDEO QA: AI-generated brand end-card -> FAIL / REGENERATE', async () => {
  const reviewer = new ChatGPTVideoReviewer()
  const director = new ChatGPTCreativeDirectorV2()
  const context = buildTestContext()
  const concepts = await director.generateThreeConcepts(context)
  const plan = await director.buildDetailedMasterPlan(concepts[0]!, context)

  const endCardFrames: SampledFrame[] = [
    { timestamp_sec: 0.3, frame_path: '/mock/frames/frame_0.jpg' },
    { timestamp_sec: 4.2, frame_path: '/mock/frames/frame_product.jpg' },
    { timestamp_sec: 7.7, frame_path: '/mock/frames/frame_ai_generated_end_card.jpg', has_generated_end_card: true },
  ]

  const report = await reviewer.reviewSampledVideo(endCardFrames, plan, context, 1)
  assert.strictEqual(report.decision, 'REGENERATE', 'AI generated brand end card must trigger REGENERATE')
  assert.ok(report.failure_codes.includes('NON_DIEGETIC_GENERATED_BRANDING'))
  assert.strictEqual(report.non_diegetic_branding_detected, true)
})

test('RAW VIDEO QA: maximum automatic regeneration = 1 is strictly enforced', async () => {
  const reviewer = new ChatGPTVideoReviewer()
  const director = new ChatGPTCreativeDirectorV2()
  const context = buildTestContext()
  const concepts = await director.generateThreeConcepts(context)
  const plan = await director.buildDetailedMasterPlan(concepts[0]!, context)

  const badFrames: SampledFrame[] = [
    { timestamp_sec: 0.3, frame_path: '/mock/frames/frame_floating_logo.jpg' },
  ]

  // Attempt 1 -> REGENERATE
  const report1 = await reviewer.reviewSampledVideo(badFrames, plan, context, 1)
  assert.strictEqual(report1.decision, 'REGENERATE')

  // Attempt 2 -> NEEDS_REVIEW (never loops indefinitely)
  const report2 = await reviewer.reviewSampledVideo(badFrames, plan, context, 2)
  assert.strictEqual(report2.decision, 'NEEDS_REVIEW')
  assert.ok(report2.failure_codes.includes('NON_DIEGETIC_GENERATED_BRANDING'))
})

test('RAW VIDEO QA: foreign brand detection remains active', async () => {
  const reviewer = new ChatGPTVideoReviewer()
  const director = new ChatGPTCreativeDirectorV2()
  const context = buildTestContext()
  const concepts = await director.generateThreeConcepts(context)
  const plan = await director.buildDetailedMasterPlan(concepts[0]!, context)

  const foreignFrames: SampledFrame[] = [
    { timestamp_sec: 2.5, frame_path: '/mock/frames/frame_foreign_brand_honda.jpg' },
  ]

  const report = await reviewer.reviewSampledVideo(foreignFrames, plan, context, 1)
  assert.strictEqual(report.decision, 'REGENERATE')
  assert.ok(report.failure_codes.includes('FOREIGN_BRAND'))
})

test('RAW VIDEO QA: real disk fixture frame analysis (if local fixtures present)', async () => {
  const reviewer = new ChatGPTVideoReviewer()
  const director = new ChatGPTCreativeDirectorV2()
  const context = buildTestContext()
  const concepts = await director.generateThreeConcepts(context)
  const plan = await director.buildDetailedMasterPlan(concepts[0]!, context)

  const rawEndCardPath = 'C:\\Users\\TP2\\.gemini\\antigravity\\brain\\00c1c845-f591-452a-b6f3-6ddc54986185\\raw_frame_7_5s.jpg'
  const rawMidCleanPath = 'C:\\Users\\TP2\\.gemini\\antigravity\\brain\\00c1c845-f591-452a-b6f3-6ddc54986185\\raw_frame_3_5s.jpg'

  if (existsSync(rawEndCardPath) && existsSync(rawMidCleanPath)) {
    // 1. Raw frame 7.5s has Veo's synthetic black banner -> MUST trigger REGENERATE
    const endCardReport = await reviewer.reviewSampledVideo([
      { timestamp_sec: 7.5, frame_path: rawEndCardPath }
    ], plan, context, 1)

    assert.strictEqual(endCardReport.decision, 'REGENERATE', 'Real raw frame with bottom black banner must fail raw video QA')
    assert.ok(endCardReport.failure_codes.includes('NON_DIEGETIC_GENERATED_BRANDING'))
    assert.strictEqual(endCardReport.non_diegetic_branding_detected, true)

    // 2. Pixel heuristics prove only that no synthetic banner was found. Without
    // multimodal identity evidence, a real frame must not be promoted to PASS.
    const cleanReport = await reviewer.reviewSampledVideo([
      { timestamp_sec: 3.5, frame_path: rawMidCleanPath }
    ], plan, context, 1)

    assert.strictEqual(cleanReport.decision, 'NEEDS_REVIEW', 'Real raw frame without multimodal identity evidence must require review')
    assert.strictEqual(cleanReport.non_diegetic_branding_detected, false)
  }
})
