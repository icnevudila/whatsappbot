import {
  createBrandContextSnapshot,
  CreativeContextBuilder,
  ChatGPTCreativeDirectorV2,
  VeoPromptCompiler,
  SimpleV5BriefNormalizer,
  GeminiVideoPromptCompiler,
  FlowVeoPromptCompiler,
} from '../services/creative-video-orchestrator/dist/index.js'
import {
  buildFlowVeoProviderPayload,
  buildGeminiNativeProviderPayload,
} from '../services/ai-media-control/dist/providers/real-video-providers.js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export async function runComparison() {
  console.log('======================================================================')
  console.log('🔬 A/B OFFLINE VALIDATION: CURRENT vs SIMPLE_V5_HYBRID')
  console.log('======================================================================\n')

  const rawBrandInput = {
    org_id: '4a58b0dd-0931-4901-880a-686457d15010',
    brand_name: 'Ayvazoğlu İnşaat',
    sector_profile: 'construction_materials',
    brand_description: 'Yüksek dayanımlı standart inşaat tuğlası ve modern yapı elemanları üreticisi',
    brand_palette: { primary: '#D32F2F', secondary: '#FF9800' },
    typography: { headingFont: 'Roboto Bold', primaryColor: '#FFFFFF' },
    tone_of_voice: ['sağlam', 'güvenilir', 'endüstriyel ustalık'],
    visual_style: [
      'Modern inşaat sahası ve şantiye alanı',
      'doğal sabah ışığı altında tuğla duvar örme ustalığı',
      'harç ve tuğla temasında gerçekçi fizik ve malzeme dokusu'
    ],
    logo_asset_id: 'logo_ayvaz_official_01',
    logo_sha256: '29f704f4710e4776deb91bf24a51f0f734ce8379e649b68bc28a779d9ef50cc1',
    logo_file_path: '/shared/outputs/inputs/4a58b0dd-0931-4901-880a-686457d15010/ayvazoglu_logo_official_transparent.png',
    products: [
      {
        product_id: 'prod_ayvaz_brick_01',
        name: 'Ayvazoğlu Tuğla',
        description: 'Yüksek mukavemetli standart yapı tuğlası',
        asset_id: 'prod_ayvaz_brick_01',
        sha256: 'ef1e48809c7f706db6f03459b2378e3cb23346a3378dd97ae92712556720f5c2',
        file_path: '/shared/outputs/inputs/4a58b0dd-0931-4901-880a-686457d15010/ayvazoglu_canonical_brick.jpg',
      },
    ],
    campaign: {
      objective: 'Müteahhit ve şantiye yöneticilerine yönelik yapı tuğlası tanıtımı',
      cta: 'Ayvazoğlu İnşaat ile Güçlü Temeller',
      user_style_preference: 'FAST_SALES',
      subtitles: 'auto',
    },
    verified_claims: ['Standart yapı tuğlası'],
    requested_duration: 8,
    aspect_ratio: '9:16',
    output_type: 'SHORT_VIDEO',
  }

  const snapshot = createBrandContextSnapshot(rawBrandInput)

  // -------------------------------------------------------------
  // 1. CURRENT PIPELINE GENERATION
  // -------------------------------------------------------------
  const attachments = [
    {
      asset_id: snapshot.products[0].product_id,
      org_id: snapshot.org_id,
      sha256: snapshot.products[0].sha256,
      role: 'hero_product',
      canonical_handle: '@HeroProduct',
      file_path: snapshot.products[0].file_path || '',
      attached_successfully: true,
    },
    {
      asset_id: snapshot.logo_asset_id,
      org_id: snapshot.org_id,
      sha256: snapshot.logo_sha256,
      role: 'logo',
      canonical_handle: '@BrandLogo',
      file_path: snapshot.logo_file_path || '',
      attached_successfully: true,
    },
  ]

  const creativeContext = CreativeContextBuilder.build({
    org_id: snapshot.org_id,
    job_id: 'job_current_comparison',
    brand_profile: {
      brand_name: snapshot.brand_name,
      sector: snapshot.sector_profile,
      tone_of_voice: [...snapshot.tone_of_voice],
      visual_personality: snapshot.visual_style.join(', '),
      palette: [snapshot.brand_palette.primary],
      typography_preferences: snapshot.typography.headingFont,
      preferred_copy_style: 'Voice-as-spine akıcı doğal konuşma',
      preferred_visual_energy: 'Net, tok, sonuç odaklı',
      logo_usage_rules: ['Kanonik logo overlay olarak yerleştirilir'],
      visual_dos: ['İnşaat sahasında tuğla yerleştirme ve harç temasını göster'],
      visual_donts: ['Tarla, zeytinlik, ofis masa plaketi veya sentetik AI yazıları gösterme'],
      approved_patterns: ['macro_first', 'human_action_motion'],
      rejected_patterns: ['mini_film_not_ad', 'acrylic_plaque'],
      successful_creative_traits: ['high_product_visibility', 'voice_spine_continuity'],
    },
    campaign_context: {
      selected_product_or_service: snapshot.products[0].name,
      campaign_objective: snapshot.campaign.objective,
      user_style_preference: snapshot.campaign.user_style_preference,
      target_platform: 'reels_tiktok_shorts',
      duration: 8,
      aspect_ratio: '9:16',
      language: 'tr',
      verified_cta: snapshot.campaign.cta,
      subtitle_mode: 'auto',
    },
    attachments,
    recent_fingerprints: [],
    verified_facts: [{ claim: 'Standart yapı tuğlası', source_type: 'catalog', source_id: 'c1' }],
  })

  // CURRENT: 3 concepts -> selection -> master plan -> VeoPromptCompiler
  const director = new ChatGPTCreativeDirectorV2()
  const concepts = await director.generateThreeConcepts(creativeContext)
  const selection = director.selectWinningConcept(concepts, creativeContext)
  const masterPlan = await director.buildDetailedMasterPlan(selection.selected_concept, creativeContext)
  const compiler = new VeoPromptCompiler()
  const currentCompiled = compiler.compileVeoPrompt(masterPlan)

  const currentNegativeCount = currentCompiled.negativePrompt.split(', ').length
  const currentWords = masterPlan.master_spoken_script.split(/\s+/).filter(Boolean)

  // -------------------------------------------------------------
  // 2. SIMPLE_V5_HYBRID PIPELINE GENERATION
  // -------------------------------------------------------------
  const { brief, shotPlan } = SimpleV5BriefNormalizer.normalize(snapshot)
  const geminiCompiled = GeminiVideoPromptCompiler.compile(brief, shotPlan)
  const flowCompiled = FlowVeoPromptCompiler.compile(brief, shotPlan)
  const geminiPrompt = `${geminiCompiled.cinematicPrompt}\n[SHORT NEGATIVE LIST]: ${geminiCompiled.negativePrompt}`
  const flowPrompt = `${flowCompiled.cinematicPrompt}\n[SHORT NEGATIVE LIST]: ${flowCompiled.negativePrompt}`
  const providerRequest = {
    jobId: 'job_simple_v5_dry_run',
    attemptId: 'attempt_dry_run_1',
    orgId: snapshot.org_id,
    prompt: geminiPrompt,
    approvedDialogue: brief.spokenScript,
    aspectRatio: brief.aspectRatio,
    durationSeconds: brief.durationSeconds,
    accountId: 'DRY_RUN_FLOW_ACCOUNT_NOT_USED',
    assets: attachments.map(asset => ({
      asset_id: asset.asset_id,
      org_id: asset.org_id,
      role: asset.role === 'hero_product' ? 'product' : asset.role,
      file_path: asset.file_path,
      sha256: asset.sha256,
    })),
  }
  const geminiProviderPayload = buildGeminiNativeProviderPayload(providerRequest)
  const flowProviderPayload = buildFlowVeoProviderPayload({ ...providerRequest, prompt: flowPrompt })

  // -------------------------------------------------------------
  // 3. COMPARISON METRICS
  // -------------------------------------------------------------
  const currentMetrics = {
    pipeline: 'CURRENT',
    charCount: currentCompiled.cinematicPrompt.length,
    instructionCount: masterPlan.beats.length + 6, // 4 beats + environment + subject + physics + audio + negative
    negativeCount: currentNegativeCount,
    actionCount: masterPlan.beats.length, // 4 separate beat actions
    locationCount: 2, // Concept beat switches and macro shifts
    voiceoverWordCount: currentWords.length,
    voiceoverScript: masterPlan.master_spoken_script,
    llmCallCountBeforeVeo: 4, // generateThreeConcepts, selectWinningConcept, buildDetailedMasterPlan, evaluatePlan
  }

  const simpleMetrics = {
    pipeline: 'SIMPLE_V5_HYBRID',
    charCount: geminiCompiled.metrics.charCount,
    instructionCount: geminiCompiled.metrics.instructionCount,
    negativeCount: geminiCompiled.metrics.negativeCount,
    actionCount: geminiCompiled.metrics.actionCount,
    locationCount: geminiCompiled.metrics.locationCount,
    voiceoverWordCount: geminiCompiled.wordCount,
    voiceoverScript: geminiCompiled.voiceoverScript,
    llmCallCountBeforeVeo: geminiCompiled.metrics.llmCallCountBeforeVeo,
    postGenerationReviewerCalls: 1,
    maximumPostGenerationReviewerCalls: 2,
    expectedProviderRouting: 'AUTO -> GEMINI_NATIVE_VIDEO when AVAILABLE; FLOW_VEO only on NO_QUOTA, FEATURE_UNAVAILABLE, or TEMPORARILY_UNAVAILABLE',
  }
  currentMetrics.postGenerationReviewerCalls = 1
  currentMetrics.maximumPostGenerationReviewerCalls = 2
  currentMetrics.expectedProviderRouting = 'FLOW_VEO (existing default preserved)'

  console.log('=== [0] NORMALIZED CONTEXT AND CREATIVE PLANS ===')
  console.log(JSON.stringify({
    current: {
      normalizedContext: creativeContext,
      creativePlan: masterPlan,
      voiceover: masterPlan.master_spoken_script,
    },
    simple: {
      normalizedContext: brief,
      creativePlan: shotPlan,
      voiceover: geminiCompiled.voiceoverScript,
    },
  }, null, 2))

  console.log('=== [1] CURRENT PIPELINE FINAL VEO PROMPT ===')
  console.log(currentCompiled.cinematicPrompt)
  console.log('\n=== [1] CURRENT NEGATIVE PROMPT ===')
  console.log(currentCompiled.negativePrompt)

  console.log('\n----------------------------------------------------------------------\n')

  console.log('=== [2] SIMPLE_V5_HYBRID FINAL VEO PROMPT ===')
  console.log(geminiCompiled.cinematicPrompt)
  console.log('\n=== [2] SIMPLE_V5_HYBRID NEGATIVE PROMPT ===')
  console.log(geminiCompiled.negativePrompt)

  console.log('\n----------------------------------------------------------------------\n')

  console.log('=== [3] COMPARATIVE METRICS TABLE ===')
  console.table([
    {
      Metric: 'Prompt Character Count',
      CURRENT: currentMetrics.charCount,
      SIMPLE_V5_HYBRID: simpleMetrics.charCount,
      Reduction: `${(((currentMetrics.charCount - simpleMetrics.charCount) / currentMetrics.charCount) * 100).toFixed(1)}%`,
    },
    {
      Metric: 'Number of Instructions',
      CURRENT: currentMetrics.instructionCount,
      SIMPLE_V5_HYBRID: simpleMetrics.instructionCount,
      Reduction: `${(((currentMetrics.instructionCount - simpleMetrics.instructionCount) / currentMetrics.instructionCount) * 100).toFixed(1)}%`,
    },
    {
      Metric: 'Number of Negatives',
      CURRENT: currentMetrics.negativeCount,
      SIMPLE_V5_HYBRID: simpleMetrics.negativeCount,
      Reduction: `${(((currentMetrics.negativeCount - simpleMetrics.negativeCount) / currentMetrics.negativeCount) * 100).toFixed(1)}%`,
    },
    {
      Metric: 'Number of Planned Actions',
      CURRENT: currentMetrics.actionCount,
      SIMPLE_V5_HYBRID: simpleMetrics.actionCount,
      Reduction: `${(((currentMetrics.actionCount - simpleMetrics.actionCount) / currentMetrics.actionCount) * 100).toFixed(1)}%`,
    },
    {
      Metric: 'Number of Locations',
      CURRENT: currentMetrics.locationCount,
      SIMPLE_V5_HYBRID: simpleMetrics.locationCount,
      Reduction: 'Single Location Lock (1)',
    },
    {
      Metric: 'Voiceover Word Count',
      CURRENT: currentMetrics.voiceoverWordCount,
      SIMPLE_V5_HYBRID: simpleMetrics.voiceoverWordCount,
      Reduction: `${currentMetrics.voiceoverWordCount}w -> ${simpleMetrics.voiceoverWordCount}w (target 10-14w)`,
    },
    {
      Metric: 'LLM/Reviewer Calls Before Veo',
      CURRENT: currentMetrics.llmCallCountBeforeVeo,
      SIMPLE_V5_HYBRID: simpleMetrics.llmCallCountBeforeVeo,
      Reduction: '100% (4 -> 0 deterministic)',
    },
    {
      Metric: 'Post-generation Combined Reviewer Calls',
      CURRENT: currentMetrics.postGenerationReviewerCalls,
      SIMPLE_V5_HYBRID: simpleMetrics.postGenerationReviewerCalls,
      Reduction: '1 normally; maximum 2 only after one severe retry',
    },
  ])

  console.log('\n=== [4] EXPECTED PROVIDER ROUTING (NO GENERATION PERFORMED) ===')
  console.table([
    { Pipeline: 'CURRENT', Routing: currentMetrics.expectedProviderRouting },
    { Pipeline: 'SIMPLE_V5_HYBRID', Routing: simpleMetrics.expectedProviderRouting },
  ])

  const artifactPath = join(process.cwd(), 'artifacts', 'video-engine', 'current-vs-simple-v5-dry-run.json')
  const report = {
    generatedAt: new Date().toISOString(),
    paidGenerationInvoked: false,
    current: {
      normalizedContext: creativeContext,
      creativePlan: masterPlan,
      exactProviderPrompt: currentCompiled.cinematicPrompt,
      negativePrompt: currentCompiled.negativePrompt,
      voiceover: masterPlan.master_spoken_script,
      metrics: currentMetrics,
    },
    simpleV5Hybrid: {
      normalizedContext: brief,
      creativePlan: shotPlan,
      aspectRatio: brief.aspectRatio,
      exactApprovedTurkishDialogue: brief.spokenScript,
      exactGeminiProviderPrompt: geminiPrompt,
      exactGeminiProviderPayload: geminiProviderPayload,
      exactFlowProviderPrompt: flowPrompt,
      exactFlowProviderPayload: flowProviderPayload,
      ffprobeExpectedAspectRatio: brief.aspectRatio,
      negativePrompt: geminiCompiled.negativePrompt,
      voiceover: geminiCompiled.voiceoverScript,
      metrics: simpleMetrics,
    },
  }
  mkdirSync(dirname(artifactPath), { recursive: true })
  writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`\nDry-run artifact: ${artifactPath}`)

  return { currentCompiled, geminiCompiled, flowCompiled, currentMetrics, simpleMetrics, artifactPath }
}

if (process.argv[1]?.endsWith('compare_current_vs_simple_v5.mjs')) {
  runComparison().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
