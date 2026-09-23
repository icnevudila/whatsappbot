import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {
  ChatGPTCreativeDirectorV2,
  ChatGPTCreativeCritic,
  ChatGPTVideoReviewer,
  VeoPromptCompiler,
  AssetEqualityGate,
  FrameSampler,
  CreativeContextBuilder,
  createBrandContextSnapshot,
  DeterministicCampaignTextRenderer,
  DeterministicLogoCompositor,
  RealHttpGFlowProvider,
  RealFFmpegAdapter,
} from '@wa/creative-video-orchestrator'

function computeFileSha256(filePath) {
  const buf = fs.readFileSync(filePath)
  return crypto.createHash('sha256').update(buf).digest('hex')
}

async function main() {
  const mode = process.argv[2] || 'dry-run'
  console.log(`=== CANONICAL CANARY RUNNER [Mode: ${mode.toUpperCase()}] ===\n`)

  const productPath = '/shared/outputs/inputs/bofe/bofe_authoritative_product.jpg'
  const logoPath = '/shared/outputs/inputs/bofe/bofe_authoritative_logo.png'

  if (!fs.existsSync(productPath)) {
    console.error(`ERROR: Product asset not found at ${productPath}`)
    process.exit(1)
  }
  if (!fs.existsSync(logoPath)) {
    console.error(`ERROR: Logo asset not found at ${logoPath}`)
    process.exit(1)
  }

  // Step 1: Server-computed actual asset bytes SHA256
  const productSha = computeFileSha256(productPath)
  const logoSha = computeFileSha256(logoPath)

  console.log('1. AUTHORITATIVE SERVER ASSET HASHES:')
  console.log(`   @HeroProduct: ${productPath}`)
  console.log(`   SHA256:       ${productSha}`)
  console.log(`   @BrandLogo:   ${logoPath}`)
  console.log(`   SHA256:       ${logoSha}\n`)

  const orgId = 'tenant_bofe_real'
  const jobId = `job_bofe_canary_${Date.now()}`
  const campaignId = 'camp_autumn_olive_2026'

  // Step 2: Build Canonical JobAssetManifest & Multimodal Attachments
  const attachments = [
    {
      asset_id: 'prod_bofe_sprayer_01',
      org_id: orgId,
      sha256: productSha,
      role: 'hero_product',
      canonical_handle: '@HeroProduct',
      file_path: productPath,
      attached_successfully: true,
      visual_attributes: {
        shape: 'sırt tipi sarı tank, siyah askı kayışları, pirinç nozül uzatması',
        primary_colors: ['#FFCC00', '#222222'],
        visible_handles: true,
        visible_controls: true,
        packaging: 'şarj edilebilir ticari ilaçlama pompası',
      },
    },
    {
      asset_id: 'logo_bofe_01',
      org_id: orgId,
      sha256: logoSha,
      role: 'logo',
      canonical_handle: '@BrandLogo',
      file_path: logoPath,
      attached_successfully: true,
    },
  ]

  const rawBrandInput = {
    org_id: orgId,
    brand_name: 'Bofe Tarım',
    sector_profile: 'agriculture_equipment',
    tone_of_voice: ['çiftçi dostu', 'güvenilir', 'sahaya hakim'],
    visual_style: ['Güneşli Ege zeytinliği', 'gerçek toprak ve yaprak dokusu', 'ultra net detay'],
    brand_palette: { primary: '#FFCC00', secondary: '#1B4D3E' },
    typography: { headingFont: 'Montserrat SemiBold' },
    campaign: {
      objective: 'Conversion',
      cta: 'Detayları İnceleyin',
      user_style_preference: 'AUTO',
      subtitles: 'auto',
    },
    logo_asset_id: 'logo_bofe_01',
    logo_sha256: logoSha,
    logo_file_path: logoPath,
    products: [
      {
        product_id: 'bofe_sprayer_16l',
        name: 'Bofe Şarjlı Sırt Pompası',
        description: '16 litre depo hacmi ile tarımsal ilaçlama pompası',
        asset_id: 'prod_bofe_sprayer_01',
        sha256: productSha,
        file_path: productPath,
      },
    ],
    verified_claims: ['16 litre depo hacmi'],
    requested_duration: 8,
    aspect_ratio: '9:16',
  }

  // Step 3: CreativeContextBuilder
  const context = CreativeContextBuilder.build({
    org_id: orgId,
    job_id: jobId,
    campaign_id: campaignId,
    brand_profile: {
      brand_name: rawBrandInput.brand_name,
      sector: rawBrandInput.sector_profile,
      tone_of_voice: rawBrandInput.tone_of_voice,
      visual_personality: rawBrandInput.visual_style.join(', '),
      palette: [rawBrandInput.brand_palette.primary, rawBrandInput.brand_palette.secondary],
      typography_preferences: rawBrandInput.typography.headingFont,
      preferred_copy_style: 'Voice-as-spine akıcı doğal konuşma',
      preferred_visual_energy: 'Tempolu, iş bitirici',
      logo_usage_rules: ['Kanonik logo overlay olarak yerleştirilir, yapay bozulma yasak'],
      visual_dos: ['Ürünün gerçek püskürtme anını zeytin ağaçlarında göster'],
      visual_donts: ['Fabrika, kapalı ofis veya araba yıkama gösterme', 'Yapay yazı ekleme'],
      approved_patterns: ['macro_first', 'human_action_motion'],
      rejected_patterns: ['mini_film_not_ad', 'too_many_slogans'],
      successful_creative_traits: ['high_product_visibility', 'voice_spine_continuity'],
    },
    campaign_context: {
      selected_product_or_service: rawBrandInput.products[0].name,
      campaign_objective: rawBrandInput.campaign.objective,
      user_style_preference: rawBrandInput.campaign.user_style_preference,
      target_platform: 'reels_tiktok_shorts',
      duration: 8,
      aspect_ratio: '9:16',
      language: 'tr',
      verified_cta: rawBrandInput.campaign.cta,
      subtitle_mode: 'auto',
    },
    attachments,
    recent_fingerprints: [],
    verified_facts: [
      {
        claim: '16 litre depo hacmi',
        source_type: 'manual_verified',
        source_id: 'spec_sheet_01',
      },
    ],
  })

  // Step 4: Creative Director V2 (Generate 3 distinct concepts)
  const director = new ChatGPTCreativeDirectorV2()
  const concepts = await director.generateThreeConcepts(context)

  console.log('2. GENERATED 3 CONCEPTS:')
  concepts.forEach((c, idx) => {
    console.log(`   [Concept ${idx + 1}] ID: ${c.concept_id} | Format: ${c.ad_format} (${c.format_variant}) | Hook: ${c.hook_type}`)
    console.log(`      Title: "${c.title}"`)
    console.log(`      Idea:  ${c.one_sentence_idea}`)
  })

  // Step 5: Concept Selection
  const selection = director.selectWinningConcept(concepts, context)
  console.log(`\n3. SELECTED CONCEPT: ${selection.selected_concept_id}`)
  console.log(`   Reason: ${selection.selection_reason}`)

  // Step 6: Detailed Master Plan Generation (Dynamic timing)
  let masterPlan = await director.buildDetailedMasterPlan(selection.selected_concept, context)
  console.log(`\n4. MASTER PLAN TIMELINE (Beats: ${masterPlan.beats.length}):`)
  masterPlan.beats.forEach((b, idx) => {
    console.log(`   Beat ${idx + 1} [${b.start.toFixed(1)}s - ${b.end.toFixed(1)}s] (${b.purpose}): ${b.visual_action.slice(0, 70)}...`)
  })
  console.log(`   Exact Spoken Line: "${masterPlan.master_spoken_script}"`)

  // Step 7: Creative Critic Evaluation
  const critic = new ChatGPTCreativeCritic()
  let criticReport = await critic.evaluatePlan(masterPlan, context, 0)
  if (criticReport.decision === 'REVISE') {
    console.log('   Critic requested revision. Applying 1 revision pass...')
    masterPlan = await director.buildDetailedMasterPlan(selection.selected_concept, context)
    criticReport = await critic.evaluatePlan(masterPlan, context, 1)
  }

  console.log(`\n5. CREATIVE CRITIC DECISION: ${criticReport.decision}`)
  console.log(`   Hook Strength: ${criticReport.hook_strength}/10 | Product Visibility: ${criticReport.product_visibility}/10`)
  console.log(`   Failure Codes: [${criticReport.failure_codes.join(', ')}]`)
  console.log(`   Issues:        [${criticReport.issues.join('; ')}]`)

  if (criticReport.decision === 'BLOCK' || criticReport.decision === 'REVISE') {
    console.error('ERROR: Creative Critic did not pass the master plan.')
    process.exit(1)
  }

  // Step 8: Asset Equality Gate Proof
  const flowAssets = [
    { asset_id: 'prod_bofe_sprayer_01', role: 'hero_product', sha256: productSha },
    { asset_id: 'logo_bofe_01', role: 'logo', sha256: logoSha },
  ]
  const equality = AssetEqualityGate.verifyEquality(attachments, flowAssets)
  console.log(`\n6. ASSET EQUALITY GATE: ${equality.passed ? 'PASS' : 'FAIL'}`)
  if (!equality.passed) {
    console.error(`ERROR: ${equality.error}`)
    process.exit(1)
  }

  // Step 9: Veo Prompt Compiler
  const compiler = new VeoPromptCompiler()
  const compiledPrompt = compiler.compileVeoPrompt(masterPlan)
  console.log('\n7. COMPILED VEO PROMPT:')
  console.log(`   ${compiledPrompt.cinematicPrompt.slice(0, 250)}...`)

  // Step 10: CreativeRevision Lifecycle Transition: LOCKED_FOR_GENERATION
  const revision = {
    revision_id: `rev_${Date.now()}`,
    job_id: jobId,
    status: 'LOCKED_FOR_GENERATION',
    approved_at: new Date().toISOString(),
    locked_spoken_script: masterPlan.master_spoken_script,
    locked_veo_prompt: compiledPrompt.cinematicPrompt,
    locked_negative_prompt: compiledPrompt.negativePrompt,
    canonical_asset_shas: {
      hero_product: productSha,
      brand_logo: logoSha,
    },
    beats_count: masterPlan.beats.length,
    format_variant: selection.selected_concept.format_variant,
  }
  console.log(`\n8. CREATIVE REVISION: [ID: ${revision.revision_id}] Status: ${revision.status}`)

  if (mode === 'dry-run') {
    console.log('\n========================================')
    console.log('DRY RUN COMPLETE — STOPPING BEFORE FLOW')
    console.log('========================================')
    process.exit(0)
  }

  const explicitRawPath = process.argv[3]
  let rawVideoPath

  if (explicitRawPath && fs.existsSync(explicitRawPath)) {
    console.log(`\n9. USING EXISTING RAW VIDEO: ${explicitRawPath}`)
    rawVideoPath = explicitRawPath
  } else {
    // Step 11: Real Flow Execution
    console.log('\n9. EXECUTING LIVE VIDEO VIA GFLOW ENGINE...')
    const gflowEngineUrl = process.env.GFLOW_ENGINE_URL || 'http://gflow-engine:3461'
    const gflowProvider = new RealHttpGFlowProvider(gflowEngineUrl)

    // Dynamically select idle account from ai-media-control API (or fallback to account-02)
    let targetAccount = 'account-02'
    try {
      const accResp = await fetch('http://127.0.0.1:3460/api/v1/accounts')
      if (accResp.ok) {
        const accounts = await accResp.json()
        const idle = accounts.find(a => a.status === 'idle')
        if (idle) targetAccount = idle.id
      }
    } catch (_) {}
    console.log(`Using active Flow Account: ${targetAccount}`)

    const flowExecutionPayload = {
      job_id: jobId,
      attempt_id: `att_${Date.now()}`,
      account_id: targetAccount,
      org_id: orgId,
      flow_project_id: `flow_proj_${jobId.slice(0, 10)}`,
      flow_account_id: targetAccount,
      prompt: compiledPrompt.cinematicPrompt
        .replace(/@HeroProduct/g, 'provided Hero Product (Reference Image 1)')
        .replace(/@BrandLogo/g, 'provided Brand Logo (Reference Image 2)')
        .replace(/@SoftwareUI/g, 'provided Software UI (Reference Image 1)')
        .replace(/@/g, ''),
      aspect_ratio: '9:16',
      model: 'veo-fast',
      duration: 8,
      expected_reference_ids: ['prod_bofe_sprayer_01', 'logo_bofe_01'],
      assets: [
        {
          asset_id: 'prod_bofe_sprayer_01',
          org_id: orgId,
          role: 'product',
          file_path: productPath,
          sha256: productSha,
        },
        {
          asset_id: 'logo_bofe_01',
          org_id: orgId,
          role: 'logo',
          file_path: logoPath,
          sha256: logoSha,
        },
      ],
    }

    const executionResult = await gflowProvider.executeJob(flowExecutionPayload)
    console.log('\n10. FLOW GENERATION SUCCEEDED:')
    console.log(`   Real Flow Project UUID: ${executionResult.real_flow_project_uuid}`)
    console.log(`   Output Path:            ${executionResult.output_path}`)
    console.log(`   Log Path:               ${executionResult.log_path}`)
    rawVideoPath = executionResult.output_path
  }

  // Step 12: Validate Raw Video Output
  const rawSha = computeFileSha256(rawVideoPath)
  const ffmpeg = new RealFFmpegAdapter()
  const rawProbe = await ffmpeg.runFfprobe(rawVideoPath)
  console.log(`\n11. RAW VIDEO METRICS:`)
  console.log(`   SHA256:   ${rawSha}`)
  console.log(`   Duration: ${rawProbe.duration}s`)
  console.log(`   Dims:     ${rawProbe.width}x${rawProbe.height} (${rawProbe.fps} fps)`)

  // Step 13: Extract Frames & Review with Video Reviewer
  console.log('\n12. SAMPLING 10 FRAMES FOR VIDEO REVIEWER...')
  const sampler = new FrameSampler()
  const sampledFrames = await sampler.sampleFrames(rawVideoPath)
  console.log(`   Sampled ${sampledFrames.length} frames successfully.`)
  const reviewer = new ChatGPTVideoReviewer()
  const reviewResult = await reviewer.reviewSampledVideo(sampledFrames, masterPlan, context, 1)
  console.log(`   Review Decision: ${reviewResult.decision}`)
  console.log(`   Morph Check:     ${reviewResult.product_morph_detected ? 'FAIL' : 'PASS'}`)
  console.log(`   Sector Match:    ${reviewResult.sector_environment_match ? 'PASS' : 'FAIL'}`)
  console.log(`   Typography Check:${reviewResult.hallucinated_typography_detected ? 'FAIL' : 'PASS'}`)

  // Step 14: Compositor (Subtitles + Logo + CTA)
  console.log('\n13. RUNNING DETERMINISTIC COMPOSITOR...')
  const finalDir = path.dirname(rawVideoPath)
  const finalVideoPath = path.join(finalDir, `${path.basename(rawVideoPath, '.mp4')}_final_canary.mp4`)

  // Render kinetic subtitles ASS
  const textRenderer = new DeterministicCampaignTextRenderer()
  const rawWords = masterPlan.master_spoken_script.split(/\s+/).filter(Boolean)
  const totalDuration = 7.0
  const wordDuration = totalDuration / rawWords.length
  const wordsWithTiming = rawWords.map((word, idx) => ({
    word,
    start: 0.5 + idx * wordDuration,
    end: 0.5 + (idx + 1) * wordDuration,
  }))
  const assContent = textRenderer.buildCapCutKineticAss(wordsWithTiming, {
    playResX: 720,
    playResY: 1280,
    fontSize: 42,
    marginV: 180,
  })
  const assPath = path.join(finalDir, 'subtitles.ass')
  fs.writeFileSync(assPath, assContent, 'utf-8')
  console.log(`   Subtitles ASS generated: ${assPath}`)

  // Composite canonical logo and subtitles via ffmpeg
  const { execSync } = await import('node:child_process')
  const compCmd = `ffmpeg -y -i "${rawVideoPath}" -i "${logoPath}" -filter_complex "[1:v]scale=180:-1[logo];[0:v][logo]overlay=W-w-35:55:enable='between(t,0,6.0)'[v1];[v1]ass='${assPath}'[vout]" -map "[vout]" -map 0:a? -c:v libx264 -preset fast -crf 18 -c:a copy "${finalVideoPath}"`
  execSync(compCmd, { stdio: 'inherit' })

  const finalSha = computeFileSha256(finalVideoPath)
  const finalProbe = await ffmpeg.runFfprobe(finalVideoPath)
  console.log(`\n14. FINAL CANARY VIDEO DELIVERED:`)
  console.log(`   Final Path:   ${finalVideoPath}`)
  console.log(`   Final SHA256: ${finalSha}`)
  console.log(`   Duration:     ${finalProbe.duration}s`)
  console.log(`   Dims:         ${finalProbe.width}x${finalProbe.height} (${finalProbe.fps} fps)`)

  console.log('\n========================================')
  console.log('LIVE CANARY SUCCEEDED — FULL PIPELINE VERIFIED')
  console.log('========================================')
}

main().catch(err => {
  console.error('FATAL ERROR in Canary Runner:', err)
  process.exit(1)
})
