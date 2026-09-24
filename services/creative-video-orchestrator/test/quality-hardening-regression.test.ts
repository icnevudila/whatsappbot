import test from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { CanonicalLogoGate } from '../src/qa/canonical-logo-gate.js'
import { LogoPresentationGate } from '../src/qa/logo-presentation-gate.js'
import { AudioIntegrityGate, PreMasterAudioGate } from '../src/qa/audio-integrity-gate.js'
import { SourceProvenanceGate } from '../src/qa/source-provenance-gate.js'
import { DuplicateOutputDetector } from '../src/evaluation/duplicate-output-detector.js'
import { FactualIntegrityGate } from '../src/qa/factual-integrity-gate.js'
import { ChatGPTVideoReviewer } from '../src/qa/chatgpt-video-reviewer.js'
import { ChatGPTCreativeDirectorV2 } from '../src/planner/chatgpt-creative-director.js'
import { VeoPromptCompiler } from '../src/compiler/veo-prompt-compiler.js'
import { createBrandContextSnapshot } from '../src/types/brand-snapshot.js'
import { CreativeContextBuilder, type CreativeContext, type MultimodalAttachment } from '../src/types/creative-context.js'

function buildTestContext(overrides?: Partial<CreativeContext>): CreativeContext {
  const attachments: MultimodalAttachment[] = [
    {
      asset_id: 'prod_bofe_hero',
      org_id: 'org_bofe',
      sha256: 'fd99aabb97b39bb3d0557def0f45725d1e7917203777121e775d99d4c71f8e4c',
      role: 'hero_product',
      canonical_handle: '@HeroProduct',
      file_path: '/assets/bofe_sprayer.png',
      attached_successfully: true,
      visual_attributes: {
        shape: 'sırt tipi tank gövdesi, sarı renkli plastik hazne',
        primary_colors: ['#FFD700', '#000000'],
      },
    },
    {
      asset_id: 'logo_bofe',
      org_id: 'org_bofe',
      sha256: '0576350c4d92212bd8c219b4b095cf3bc2060302b978753549ad1d3d95c4d8e8',
      role: 'logo',
      canonical_handle: '@BrandLogo',
      file_path: '/assets/bofe_logo.png',
      attached_successfully: true,
    },
  ]

  const base = CreativeContextBuilder.build({
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
      visual_dos: ['Meyve dallarına püskürtme'],
      visual_donts: ['Yapay yazı üretme'],
      approved_patterns: ['macro_first'],
      rejected_patterns: ['mini_film_not_ad'],
      successful_creative_traits: ['high_product_visibility'],
    },
    campaign_context: {
      selected_product_or_service: 'Bofe Şarjlı Sırt Pompası 16L',
      campaign_objective: 'Sezon öncesi doğrudan satış oluşturma',
      user_style_preference: 'PRODUCT_USAGE',
      target_platform: 'reels_tiktok_shorts',
      duration: 8,
      aspect_ratio: '9:16',
      language: 'tr',
      campaign_message: 'Bahçenizde yüksek verimli ilaçlama',
      verified_offer: 'Lansmana Özel Fiyat',
      verified_price: '2.499 TL',
      verified_cta: 'Hemen İnceleyin',
      subtitle_mode: 'auto',
    },
    attachments,
    recent_fingerprints: [],
    verified_facts: [
      { claim: '16 litre sıvı haznesi', source_type: 'catalog', source_id: 'c1' },
      { claim: 'Lityum-iyon şarjlı batarya', source_type: 'catalog', source_id: 'c2' },
    ],
  })

  if (overrides) {
    Object.assign(base, overrides)
    if (overrides.brand_profile) base.brand_profile = { ...base.brand_profile, ...overrides.brand_profile }
  }

  return base
}

test('QUALITY HARDENING: CanonicalLogoGate - missing canonical logo fails with NEEDS_ASSET', () => {
  const snapshot = createBrandContextSnapshot({
    org_id: 'org_bofe',
    sector_profile: 'agriculture_equipment',
    logo_asset_id: 'logo_bofe',
    brand_name: 'Bofe Tarım',
    logo_file_path: 'non_existent_logo_path.png',
    logo_sha256: 'deadbeef1234',
    products: [{ product_id: 'p1', name: 'Bofe Pompa', description: 'Pompa', asset_id: 'a1', sha256: 's1' }],
    campaign: { objective: 'Satış', cta: 'Hemen İnceleyin', user_style_preference: 'PRODUCT_USAGE' }
  })

  const result = CanonicalLogoGate.verifyLogo(snapshot)
  assert.strictEqual(result.passed, false)
  assert.strictEqual(result.failureCode, 'NEEDS_ASSET')
  assert.ok(result.error?.includes('NEEDS_ASSET'))
})

test('QUALITY HARDENING: CanonicalLogoGate - valid canonical logo matches SHA256 exactly', () => {
  const tmpLogo = join(process.cwd(), '.tmp', 'test_canonical_logo.png')
  const logoBytes = Buffer.from('fake_png_header_and_pixels_test')
  writeFileSync(tmpLogo, logoBytes)
  const expectedSha = createHash('sha256').update(logoBytes).digest('hex')

  try {
    const snapshot = createBrandContextSnapshot({
      org_id: 'org_bofe',
      sector_profile: 'agriculture_equipment',
      logo_asset_id: 'logo_bofe',
      brand_name: 'Bofe Tarım',
      logo_file_path: tmpLogo,
      logo_sha256: expectedSha,
      products: [{ product_id: 'p1', name: 'Bofe Pompa', description: 'Pompa', asset_id: 'a1', sha256: 's1' }],
      campaign: { objective: 'Satış', cta: 'Hemen İnceleyin', user_style_preference: 'PRODUCT_USAGE' }
    })

    const result = CanonicalLogoGate.verifyLogo(snapshot)
    assert.strictEqual(result.passed, true)
    assert.strictEqual(result.logoSha256, expectedSha)
  } finally {
    if (existsSync(tmpLogo)) unlinkSync(tmpLogo)
  }
})

test('QUALITY HARDENING: CanonicalLogoGate - modified bytes trigger CANONICAL_LOGO_MISMATCH', () => {
  const tmpLogo = join(process.cwd(), '.tmp', 'test_tampered_logo.png')
  writeFileSync(tmpLogo, Buffer.from('tampered_bytes_here'))

  try {
    const snapshot = createBrandContextSnapshot({
      org_id: 'org_bofe',
      sector_profile: 'agriculture_equipment',
      logo_asset_id: 'logo_bofe',
      brand_name: 'Bofe Tarım',
      logo_file_path: tmpLogo,
      logo_sha256: 'original_expected_sha_1234567890',
      products: [{ product_id: 'p1', name: 'Bofe Pompa', description: 'Pompa', asset_id: 'a1', sha256: 's1' }],
      campaign: { objective: 'Satış', cta: 'Hemen İnceleyin', user_style_preference: 'PRODUCT_USAGE' }
    })

    const result = CanonicalLogoGate.verifyLogo(snapshot)
    assert.strictEqual(result.passed, false)
    assert.strictEqual(result.failureCode, 'CANONICAL_LOGO_MISMATCH')
    assert.ok(result.error?.includes('CANONICAL_LOGO_MISMATCH'))
  } finally {
    if (existsSync(tmpLogo)) unlinkSync(tmpLogo)
  }
})

test('QUALITY HARDENING: VeoPromptCompiler - preserves diegetic brand identity and forbids floating logos', async () => {
  const director = new ChatGPTCreativeDirectorV2()
  const context = buildTestContext()
  const concepts = await director.generateThreeConcepts(context)
  const plan = await director.buildDetailedMasterPlan(concepts[0]!, context)

  const compiler = new VeoPromptCompiler()
  const compiled = compiler.compileVeoPrompt(plan)

  assert.ok(compiled.cinematicPrompt.includes('CANONICAL BRAND IDENTITY PRESERVATION'))
  assert.ok(compiled.cinematicPrompt.includes('Preserve the canonical brand identity from @BrandLogo'))
  assert.ok(compiled.negativePrompt.includes('floating screen logo'))
  assert.ok(compiled.negativePrompt.includes('synthetic lower thirds'))
})

test('QUALITY HARDENING: Raw Video QA - correct diegetic product logo PASSES', async () => {
  const reviewer = new ChatGPTVideoReviewer()
  const director = new ChatGPTCreativeDirectorV2()
  const context = buildTestContext()
  const concepts = await director.generateThreeConcepts(context)
  const plan = await director.buildDetailedMasterPlan(concepts[0]!, context)

  const cleanFrames = [
    { timestamp_sec: 1.0, frame_path: 'clean_diegetic_printed_logo.jpg', is_diegetic_product_branding_only: true },
    { timestamp_sec: 4.0, frame_path: 'clean_product_usage.jpg', is_diegetic_product_branding_only: true },
  ]

  const report = await reviewer.reviewSampledVideo(cleanFrames, plan, context, 1)
  assert.strictEqual(report.decision, 'PASS')
  assert.strictEqual(report.non_diegetic_branding_detected, false)
})

test('QUALITY HARDENING: Raw Video QA - warped diegetic product logo triggers DIEGETIC_LOGO_MISMATCH', async () => {
  const reviewer = new ChatGPTVideoReviewer()
  const director = new ChatGPTCreativeDirectorV2()
  const context = buildTestContext()
  const concepts = await director.generateThreeConcepts(context)
  const plan = await director.buildDetailedMasterPlan(concepts[0]!, context)

  const warpedFrames = [
    { timestamp_sec: 3.5, frame_path: 'warped_product_logo.jpg', has_diegetic_logo_mismatch: true },
  ]

  const report = await reviewer.reviewSampledVideo(warpedFrames, plan, context, 1)
  assert.strictEqual(report.decision, 'REGENERATE')
  assert.ok(report.failure_codes.includes('DIEGETIC_LOGO_MISMATCH'))
})

test('QUALITY HARDENING: Raw Video QA - floating AI-generated overlay triggers NON_DIEGETIC_GENERATED_BRANDING', async () => {
  const reviewer = new ChatGPTVideoReviewer()
  const director = new ChatGPTCreativeDirectorV2()
  const context = buildTestContext()
  const concepts = await director.generateThreeConcepts(context)
  const plan = await director.buildDetailedMasterPlan(concepts[0]!, context)

  const floatingFrames = [
    { timestamp_sec: 7.2, frame_path: 'floating_logo_bottom.jpg', has_floating_logo: true },
  ]

  const report = await reviewer.reviewSampledVideo(floatingFrames, plan, context, 1)
  assert.strictEqual(report.decision, 'REGENERATE')
  assert.ok(report.failure_codes.includes('NON_DIEGETIC_GENERATED_BRANDING'))
})

test('QUALITY HARDENING: Sector Affordance - agricultural sprayer in construction site fails with WRONG_SECTOR', async () => {
  const reviewer = new ChatGPTVideoReviewer()
  const director = new ChatGPTCreativeDirectorV2()
  const context = buildTestContext({
    brand_profile: {
      brand_name: 'Bofe Tarım',
      sector: 'agriculture_equipment',
      tone_of_voice: ['Direct'],
      visual_personality: 'Commercial',
      palette: ['#1B5E20'],
      typography_preferences: 'Sans-serif',
      preferred_copy_style: 'Direct',
      preferred_visual_energy: 'Dynamic',
      logo_usage_rules: [],
      visual_dos: [],
      visual_donts: [],
      approved_patterns: [],
      rejected_patterns: [],
      successful_creative_traits: [],
    }
  })
  const concepts = await director.generateThreeConcepts(context)
  const plan = await director.buildDetailedMasterPlan(concepts[0]!, context)

  const agriInConstFrames = [
    { timestamp_sec: 3.5, frame_path: 'bofe_sprayer_in_construction_site.jpg' },
  ]

  const report = await reviewer.reviewSampledVideo(agriInConstFrames, plan, context, 1)
  assert.strictEqual(report.decision, 'REGENERATE')
  assert.ok(report.failure_codes.includes('WRONG_SECTOR'))
  assert.ok(report.failure_codes.includes('PRODUCT_AFFORDANCE_FAIL'))
})

test('QUALITY HARDENING: SaaS QA - acrylic plaque / corporate wall sign ad triggers SOFTWARE_DEMO_MISSING', async () => {
  const reviewer = new ChatGPTVideoReviewer()
  const director = new ChatGPTCreativeDirectorV2()
  const context = buildTestContext({
    brand_profile: {
      brand_name: 'Veri Burada',
      sector: 'saas_software',
      tone_of_voice: ['Professional'],
      visual_personality: 'Software',
      palette: ['#007ACC'],
      typography_preferences: 'Sans-serif',
      preferred_copy_style: 'Direct',
      preferred_visual_energy: 'Clean',
      logo_usage_rules: [],
      visual_dos: [],
      visual_donts: [],
      approved_patterns: [],
      rejected_patterns: [],
      successful_creative_traits: [],
    }
  })
  const concepts = await director.generateThreeConcepts(context)
  const plan = await director.buildDetailedMasterPlan(concepts[0]!, context)

  const plaqueFrames = [
    { timestamp_sec: 3.5, frame_path: 'acrylic_plaque_desk.jpg', has_acrylic_plaque: true },
  ]

  const report = await reviewer.reviewSampledVideo(plaqueFrames, plan, context, 1)
  assert.strictEqual(report.decision, 'REGENERATE')
  assert.ok(report.failure_codes.includes('SOFTWARE_DEMO_MISSING'))
  assert.ok(report.failure_codes.includes('PRODUCT_METAPHOR_FAIL'))
})

test('QUALITY HARDENING: SaaS QA - fake invented UI triggers FAKE_UI failure', async () => {
  const reviewer = new ChatGPTVideoReviewer()
  const director = new ChatGPTCreativeDirectorV2()
  const context = buildTestContext({
    brand_profile: {
      brand_name: 'Veri Burada',
      sector: 'saas_software',
      tone_of_voice: ['Professional'],
      visual_personality: 'Software',
      palette: ['#007ACC'],
      typography_preferences: 'Sans-serif',
      preferred_copy_style: 'Direct',
      preferred_visual_energy: 'Clean',
      logo_usage_rules: [],
      visual_dos: [],
      visual_donts: [],
      approved_patterns: [],
      rejected_patterns: [],
      successful_creative_traits: [],
    }
  })
  const concepts = await director.generateThreeConcepts(context)
  const plan = await director.buildDetailedMasterPlan(concepts[0]!, context)

  const fakeUiFrames = [
    { timestamp_sec: 4.0, frame_path: 'fake_ui_browser_radar.jpg', has_fake_ui: true },
  ]

  const report = await reviewer.reviewSampledVideo(fakeUiFrames, plan, context, 1)
  assert.strictEqual(report.decision, 'REGENERATE')
  assert.ok(report.failure_codes.includes('FAKE_UI'))
})

test('QUALITY HARDENING: FactualIntegrityGate.auditFinalCopy - unsupported performance claims and foreign brands fail', () => {
  const snapshot = createBrandContextSnapshot({
    org_id: 'org_bofe',
    sector_profile: 'agriculture_equipment',
    logo_asset_id: 'logo_bofe',
    logo_sha256: '0576350c4d92212bd8c219b4b095cf3bc2060302b978753549ad1d3d95c4d8e8',
    brand_name: 'Bofe Tarım',
    products: [{ product_id: 'p1', name: 'Bofe Şarjlı Sırt Pompası 16L', description: 'Pompa', asset_id: 'a1', sha256: 's1' }],
    verified_claims: ['16 litre sıvı haznesi', 'Lityum-iyon şarjlı batarya'],
    campaign: { objective: 'Satış', cta: 'Hemen İnceleyin', user_style_preference: 'PRODUCT_USAGE' }
  })

  // Test 1: Unsupported marketing claims like "GÜÇ VE HIZ ARAYANLARA", "TEK TUŞLA GÜÇLÜ İLAÇLAMA", "Satışlarınızı katlayın"
  const unverifiedCopy = [
    { text: 'Tek tuşla güçlü ilaçlama ile yüksek verim', location: 'subtitle' },
    { text: 'Delta Mekanik ilaçlama pompası ile satışlarınızı katlayın', location: 'cta' }
  ]

  const audit = FactualIntegrityGate.auditFinalCopy(unverifiedCopy, snapshot)
  assert.strictEqual(audit.passed, false)
  const reasons = audit.violations.map(v => v.reason).join(' ')
  assert.ok(reasons.includes('unsupported performance claim'))
  assert.ok(reasons.includes('Foreign brand'))

  // Test 2: Verified copy passes
  const verifiedCopy = [
    { text: '16 litre sıvı haznesi ile bahçenizde çalışın', location: 'subtitle' },
    { text: 'Lityum-iyon şarjlı batarya güvencesi', location: 'cta' }
  ]
  const passAudit = FactualIntegrityGate.auditFinalCopy(verifiedCopy, snapshot)
  assert.strictEqual(passAudit.passed, true)
})

test('QUALITY HARDENING: DuplicateOutputDetector - identical final video SHA detected and classified as DUPLICATE_OUTPUT', () => {
  const detector = DuplicateOutputDetector.getInstance()
  detector.clear()

  const first = detector.recordOutput({
    output_id: '03_Bofe_CapCut_Dinamik_Altyazili_Final.mp4',
    job_id: 'job_03',
    final_sha256: '1644db6ac6f9e6def0ba47fd1af2992c321e24e13fbd0d5c468d7595ccfdc857',
    created_at: new Date().toISOString()
  })
  assert.strictEqual(first.isDuplicate, false)

  // Renamed copy with identical SHA
  const second = detector.recordOutput({
    output_id: '07_Bofe_GoldStandard_Reels.mp4',
    job_id: 'job_07',
    final_sha256: '1644db6ac6f9e6def0ba47fd1af2992c321e24e13fbd0d5c468d7595ccfdc857',
    created_at: new Date().toISOString()
  })
  assert.strictEqual(second.isDuplicate, true)
  assert.strictEqual(second.failureCode, 'DUPLICATE_OUTPUT')
  assert.strictEqual(second.duplicateOf, '03_Bofe_CapCut_Dinamik_Altyazili_Final.mp4')
})

test('QUALITY HARDENING: LogoPresentationGate - opaque rectangular logo fails with OPAQUE_LOGO_BOX', () => {
  const report = LogoPresentationGate.evaluateLogoPresentation({
    logoFilePath: 'mock_opaque_logo.png',
    isMock: true,
    mockIsOpaque: true,
  })
  assert.strictEqual(report.passed, false)
  assert.strictEqual(report.failureCode, 'OPAQUE_LOGO_BOX')
  assert.ok(report.issues[0]?.includes('OPAQUE_LOGO_BOX'))
})

test('QUALITY HARDENING: LogoPresentationGate - transparent canonical logo PASSES', () => {
  const report = LogoPresentationGate.evaluateLogoPresentation({
    logoFilePath: 'mock_transparent_logo.png',
    isMock: true,
    mockIsOpaque: false,
    mockTransparentRatio: 0.88,
  })
  assert.strictEqual(report.passed, true)
  assert.strictEqual(report.isOpaqueBox, false)
})

test('QUALITY HARDENING: LogoPresentationGate - oversized logo fails with OVERSIZED_LOGO', () => {
  const report = LogoPresentationGate.evaluateLogoPresentation({
    logoFilePath: 'mock_oversized_logo.png',
    isMock: true,
    mockIsOpaque: false,
    mockIsOversized: true,
  })
  assert.strictEqual(report.passed, false)
  assert.strictEqual(report.failureCode, 'OVERSIZED_LOGO')
})

test('QUALITY HARDENING: AudioIntegrityGate - English spoken audio fails with ACTUAL_AUDIO_LANGUAGE_MISMATCH', async () => {
  const report = await AudioIntegrityGate.evaluateAudioIntegrity({
    audioFilePath: 'mock_audio_en.mp3',
    expectedLanguage: 'tr',
    isMock: true,
    mockDetectedLanguage: 'en',
    mockTranscript: 'Aivazolo Inshod presents the finest quality red clay bricks built for excellence.',
  })
  assert.strictEqual(report.passed, false)
  assert.strictEqual(report.failureCode, 'ACTUAL_AUDIO_LANGUAGE_MISMATCH')
  assert.ok(report.issues[0]?.includes('ACTUAL_AUDIO_LANGUAGE_MISMATCH'))
})

test('QUALITY HARDENING: AudioIntegrityGate - Turkish spoken audio PASSES', async () => {
  const report = await AudioIntegrityGate.evaluateAudioIntegrity({
    audioFilePath: 'mock_audio_tr.mp3',
    expectedLanguage: 'tr',
    isMock: true,
    mockDetectedLanguage: 'tr',
    mockTranscript: 'Ayvazoğlu İnşaat ile güçlü temeller yükseliyor. Standart yapı tuğlası.',
  })
  assert.strictEqual(report.passed, true)
  assert.strictEqual(report.detectedLanguage, 'tr')
})

test('QUALITY HARDENING: Raw Video QA - invented diegetic branding fails with INVENTED_DIEGETIC_BRANDING', async () => {
  const reviewer = new ChatGPTVideoReviewer()
  const director = new ChatGPTCreativeDirectorV2()
  const context = buildTestContext()
  const concepts = await director.generateThreeConcepts(context)
  const plan = await director.buildDetailedMasterPlan(concepts[0]!, context)

  const inventedFrames = [
    { timestamp_sec: 2.0, frame_path: 'frame_2.0s_invented_diegetic_logo.jpg', has_invented_diegetic_branding: true },
  ]

  const report = await reviewer.reviewSampledVideo(inventedFrames, plan, context, 1)
  assert.strictEqual(report.decision, 'REGENERATE')
  assert.ok(report.failure_codes.includes('INVENTED_DIEGETIC_BRANDING'))
  assert.ok(report.failure_codes.includes('RAW_VIDEO_BRANDING_MISMATCH'))
  assert.ok(report.failure_codes.includes('OVERLAY_MASKING_FORBIDDEN'))
})

test('QUALITY HARDENING: PreMasterAudioGate - raw video with English audio fails before voiceover and mandates REGENERATE', async () => {
  const report = await PreMasterAudioGate.evaluateRawVeoAudio({
    rawVideoPath: 'mock_raw_veo_en.mp4',
    expectedLanguage: 'tr',
    isMock: true,
    mockDetectedLanguage: 'en',
    mockTranscript: 'Aivazolo Inshod presents the finest quality red clay bricks.',
  })
  assert.strictEqual(report.passed, false)
  assert.strictEqual(report.failureCode, 'RAW_GENERATION_AUDIO_LANGUAGE_MISMATCH')
  assert.ok(report.issues[0]?.includes('Voiceover patching is strictly forbidden'))
})

test('QUALITY HARDENING: SourceProvenanceGate - rejects post-production mask when raw audio was English', () => {
  const audit = SourceProvenanceGate.verifyProvenance({
    jobId: 'job_test_provenance_01',
    rawVideoSha: 'raw_sha_123',
    rawAudioLanguage: 'en',
    rawAudioTranscript: 'Red clay bricks built for excellence',
    rawDetectedBranding: 'NONE',
    rawBrandingPassed: true,
    rawAudioPassed: false, // Raw Veo spoke English!
    compositorLogoSha: 'logo_sha_abc',
    sourceLogoSha: 'logo_sha_abc',
    voiceoverAudioSha: 'vo_sha_tr_patch', // Attempted to mask with Turkish VO
    finalVideoSha: 'final_sha_xyz',
  })
  assert.strictEqual(audit.passed, false)
  assert.strictEqual(audit.failureCode, 'RAW_GENERATION_AUDIO_LANGUAGE_MISMATCH')
  assert.ok(audit.issues[0]?.includes('Voiceover dubbing over defective raw audio is strictly forbidden'))
})

test('QUALITY HARDENING: SourceProvenanceGate - rejects post-production overlay when raw video had invented branding', () => {
  const audit = SourceProvenanceGate.verifyProvenance({
    jobId: 'job_test_provenance_02',
    rawVideoSha: 'raw_sha_456',
    rawAudioLanguage: 'tr',
    rawAudioTranscript: 'Ayvazoğlu İnşaat kaliteli tuğla',
    rawDetectedBranding: 'INVENTED_LOGO_STAMP',
    rawBrandingPassed: false, // Raw Veo stamped fake logo on brick!
    rawAudioPassed: true,
    compositorLogoSha: 'logo_sha_abc',
    sourceLogoSha: 'logo_sha_abc',
    voiceoverAudioSha: 'vo_sha_tr',
    finalVideoSha: 'final_sha_xyz',
  })
  assert.strictEqual(audit.passed, false)
  assert.strictEqual(audit.failureCode, 'RAW_VIDEO_BRANDING_MISMATCH')
  assert.ok(audit.issues[0]?.includes('Overlay masking is strictly forbidden'))
})

test('QUALITY HARDENING: SourceProvenanceGate - authentic raw video + authentic assets PASSES with full chain', () => {
  const audit = SourceProvenanceGate.verifyProvenance({
    jobId: 'job_test_provenance_03',
    rawVideoSha: 'raw_sha_789',
    rawAudioLanguage: 'tr',
    rawAudioTranscript: 'Ayvaz oğlu inşaat ile projelerinize sağlam temel ve üstün dayanıklılık.',
    rawDetectedBranding: 'CANONICAL_DIEGETIC_TRUCK_LOGO',
    rawBrandingPassed: true,
    rawAudioPassed: true,
    compositorLogoSha: 'logo_sha_abc',
    sourceLogoSha: 'logo_sha_abc',
    voiceoverAudioSha: 'vo_sha_clean',
    finalVideoSha: 'final_sha_pass',
  })
  assert.strictEqual(audit.passed, true)
  assert.strictEqual(audit.provenanceChain.raw_audio_language, 'tr')
  assert.strictEqual(audit.provenanceChain.raw_detected_branding, 'CANONICAL_DIEGETIC_TRUCK_LOGO')
})
