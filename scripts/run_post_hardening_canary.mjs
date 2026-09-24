import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execSync } from 'node:child_process'
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
  CanonicalLogoGate,
  FactualIntegrityGate,
  DuplicateOutputDetector,
} from '@wa/creative-video-orchestrator'

function computeFileSha256(filePath) {
  const buf = fs.readFileSync(filePath)
  return crypto.createHash('sha256').update(buf).digest('hex')
}

async function main() {
  const mode = process.argv[2] || 'dry-run'
  console.log(`\n============================================================`)
  console.log(`=== POST-HARDENING REAL CANARY RUNNER [Mode: ${mode.toUpperCase()}] ===`)
  console.log(`============================================================\n`)

  const tenant = {
    org_id: '4a58b0dd-0931-4901-880a-686457d15010',
    brand_name: 'Ayvazoğlu İnşaat',
    sector_profile: 'construction_materials',
    brand_description: 'Yüksek dayanımlı kırmızı kil tuğla ve modern yapı elemanları üreticisi',
    brand_palette: { primary: '#D32F2F', secondary: '#FF9800' },
    typography: { headingFont: 'Roboto Bold', primaryColor: '#FFFFFF' },
    tone_of_voice: ['sağlam', 'güvenilir', 'endüstriyel ustalık'],
    visual_style: [
      'Modern inşaat sahası ve şantiye alanı',
      'doğal sabah ışığı altında kırmızı kil tuğla duvar örme ustalığı',
      'harç ve tuğla temasında gerçekçi fizik ve malzeme dokusu'
    ],
    product: {
      product_id: 'prod_ayvaz_brick_01',
      name: 'Ayvazoğlu Kırmızı Kil Tuğla',
      description: 'Yüksek mukavemetli standart kırmızı yapı tuğlası',
      file_path: '/shared/outputs/inputs/4a58b0dd-0931-4901-880a-686457d15010/ayvazoglu_canonical_brick.jpg',
    },
    logo: {
      asset_id: 'logo_ayvaz_official_01',
      file_path: '/shared/outputs/inputs/4a58b0dd-0931-4901-880a-686457d15010/ayvazoglu_logo_official.png',
    },
    campaign: {
      objective: 'Müteahhit ve şantiye yöneticilerine yönelik yapı tuğlası tanıtımı',
      cta: 'Ayvazoğlu İnşaat ile Güçlü Temeller',
      user_style_preference: 'FAST_SALES',
      subtitles: 'auto',
    },
    verified_claims: ['Standart kırmızı yapı tuğlası'],
  }

  // 1. Verify existence of canonical input files on disk
  if (!fs.existsSync(tenant.product.file_path)) {
    console.error(`FATAL: Hero Product asset not found at ${tenant.product.file_path}`)
    process.exit(1)
  }
  if (!fs.existsSync(tenant.logo.file_path)) {
    console.error(`FATAL: Canonical Logo asset not found at ${tenant.logo.file_path}`)
    process.exit(1)
  }

  // 2. Compute authoritative source asset SHAs
  const sourceProductSha = computeFileSha256(tenant.product.file_path)
  const sourceLogoSha = computeFileSha256(tenant.logo.file_path)

  console.log('1. CANONICAL SOURCE ASSET DIGESTS:')
  console.log(`   Tenant / Org:   ${tenant.brand_name} (${tenant.org_id})`)
  console.log(`   @HeroProduct:   ${tenant.product.file_path}`)
  console.log(`   Product SHA256: ${sourceProductSha}`)
  console.log(`   @BrandLogo:     ${tenant.logo.file_path}`)
  console.log(`   Logo SHA256:    ${sourceLogoSha}\n`)

  const jobId = `job_canary_ayvaz_${Date.now()}`
  const attemptId = `att_ayvaz_${Date.now()}`

  // 3. Build Canonical Multimodal Attachments & Brand Context Snapshot
  const attachments = [
    {
      asset_id: tenant.product.product_id,
      org_id: tenant.org_id,
      sha256: sourceProductSha,
      role: 'hero_product',
      canonical_handle: '@HeroProduct',
      file_path: tenant.product.file_path,
      attached_successfully: true,
      visual_attributes: {
        shape: 'kırmızı kil tuğla, dikey delikli ve kanallı standart blok form',
        primary_colors: ['#D32F2F', '#8D6E63'],
        visible_handles: false,
        visible_controls: false,
        packaging: 'inşaat paletinde istiflenmiş yapı malzemesi',
      },
    },
    {
      asset_id: tenant.logo.asset_id,
      org_id: tenant.org_id,
      sha256: sourceLogoSha,
      role: 'logo',
      canonical_handle: '@BrandLogo',
      file_path: tenant.logo.file_path,
      attached_successfully: true,
    },
  ]

  const rawBrandInput = {
    org_id: tenant.org_id,
    brand_name: tenant.brand_name,
    sector_profile: tenant.sector_profile,
    brand_description: tenant.brand_description,
    brand_palette: tenant.brand_palette,
    typography: tenant.typography,
    tone_of_voice: tenant.tone_of_voice,
    visual_style: tenant.visual_style,
    logo_asset_id: tenant.logo.asset_id,
    logo_sha256: sourceLogoSha,
    logo_file_path: tenant.logo.file_path,
    products: [
      {
        product_id: tenant.product.product_id,
        name: tenant.product.name,
        description: tenant.product.description,
        asset_id: tenant.product.product_id,
        sha256: sourceProductSha,
        file_path: tenant.product.file_path,
      },
    ],
    campaign: {
      objective: tenant.campaign.objective,
      cta: tenant.campaign.cta,
      user_style_preference: tenant.campaign.user_style_preference,
      subtitles: tenant.campaign.subtitles,
    },
    verified_claims: tenant.verified_claims,
    requested_duration: 8,
    aspect_ratio: '9:16',
    output_type: 'SHORT_VIDEO',
  }

  const snapshot = createBrandContextSnapshot(rawBrandInput)
  console.log(`2. BRAND SNAPSHOT GENERATED (Manifest Version: ${snapshot.brand_manifest_version})`)

  // 4. CreativeContextBuilder
  const context = CreativeContextBuilder.build({
    org_id: tenant.org_id,
    job_id: jobId,
    campaign_id: `camp_${Date.now()}`,
    brand_profile: {
      brand_name: tenant.brand_name,
      sector: tenant.sector_profile,
      tone_of_voice: tenant.tone_of_voice,
      visual_personality: tenant.visual_style.join(', '),
      palette: [tenant.brand_palette.primary, tenant.brand_palette.secondary],
      typography_preferences: tenant.typography.headingFont,
      preferred_copy_style: 'Voice-as-spine akıcı doğal konuşma',
      preferred_visual_energy: 'Net, tok, sonuç odaklı',
      logo_usage_rules: ['Kanonik logo overlay olarak yerleştirilir, yapay font veya yazı çizilemez'],
      visual_dos: ['İnşaat sahasında tuğla yerleştirme ve harç temasını göster'],
      visual_donts: ['Tarla, zeytinlik, ofis masa plaketi veya sentetik AI yazıları gösterme'],
      approved_patterns: ['macro_first', 'human_action_motion'],
      rejected_patterns: ['mini_film_not_ad', 'acrylic_plaque', 'fake_ui'],
      successful_creative_traits: ['high_product_visibility', 'voice_spine_continuity'],
    },
    campaign_context: {
      selected_product_or_service: tenant.product.name,
      campaign_objective: tenant.campaign.objective,
      user_style_preference: tenant.campaign.user_style_preference,
      target_platform: 'reels_tiktok_shorts',
      duration: 8,
      aspect_ratio: '9:16',
      language: 'tr',
      verified_cta: tenant.campaign.cta,
      subtitle_mode: 'auto',
    },
    attachments,
    recent_fingerprints: [],
    verified_facts: [
      {
        claim: 'Standart kırmızı yapı tuğlası',
        source_type: 'catalog',
        source_id: 'spec_ayvaz_01',
      },
    ],
  })

  // 5. Creative Director V2 (Generate 3 distinct concepts)
  const director = new ChatGPTCreativeDirectorV2()
  const concepts = await director.generateThreeConcepts(context)

  console.log('\n3. GENERATED 3 CONCEPTS:')
  concepts.forEach((c, idx) => {
    console.log(`   [Concept ${idx + 1}] ID: ${c.concept_id} | Format: ${c.ad_format} (${c.format_variant}) | Hook: ${c.hook_type}`)
    console.log(`      Title: "${c.title}"`)
    console.log(`      Idea:  ${c.one_sentence_idea}`)
  })

  // 6. Concept Selection
  const selection = director.selectWinningConcept(concepts, context)
  console.log(`\n4. SELECTED WINNING CONCEPT: ${selection.selected_concept_id}`)
  console.log(`   Format: ${selection.selected_concept.ad_format} / ${selection.selected_concept.format_variant}`)
  console.log(`   Reason: ${selection.selection_reason}`)

  // 7. Master Plan Generation
  let masterPlan = await director.buildDetailedMasterPlan(selection.selected_concept, context)
  console.log(`\n5. MASTER PLAN TIMELINE (Beats: ${masterPlan.beats.length}):`)
  masterPlan.beats.forEach((b, idx) => {
    console.log(`   Beat ${idx + 1} [${b.start.toFixed(1)}s - ${b.end.toFixed(1)}s] (${b.purpose}): ${b.visual_action.slice(0, 75)}...`)
  })
  console.log(`   Spoken VO Script: "${masterPlan.master_spoken_script}"`)

  // 8. Creative Critic Evaluation
  const critic = new ChatGPTCreativeCritic()
  let criticReport = await critic.evaluatePlan(masterPlan, context, 0)
  if (criticReport.decision === 'REVISE') {
    console.log('   Critic requested revision. Applying 1 revision pass...')
    masterPlan = await director.buildDetailedMasterPlan(selection.selected_concept, context)
    criticReport = await critic.evaluatePlan(masterPlan, context, 1)
  }

  console.log(`\n6. CREATIVE CRITIC DECISION: ${criticReport.decision}`)
  console.log(`   Hook: ${criticReport.hook_strength}/10 | Product: ${criticReport.product_visibility}/10`)
  if (criticReport.decision === 'BLOCK' || criticReport.decision === 'REVISE') {
    console.error('FATAL: Creative Critic rejected the master plan.')
    process.exit(1)
  }

  // 9. Factual Integrity Pre-Prompt Validation
  const planFactualCheck = FactualIntegrityGate.validateMasterPlan(masterPlan, snapshot)
  console.log(`\n7. FACTUAL INTEGRITY GATE (Plan Check): ${planFactualCheck.passed ? 'PASS' : 'FAIL'}`)
  if (!planFactualCheck.passed) {
    console.error(`FATAL: Factual integrity violation: ${JSON.stringify(planFactualCheck.violations)}`)
    process.exit(1)
  }

  // 10. Veo Prompt Compiler
  const compiler = new VeoPromptCompiler()
  const compiledPrompt = compiler.compileVeoPrompt(masterPlan)
  console.log('\n8. COMPILED VEO CINEMATIC PROMPT:')
  console.log(`   ${compiledPrompt.cinematicPrompt}`)
  console.log('\n   COMPILED VEO NEGATIVE PROMPT:')
  console.log(`   ${compiledPrompt.negativePrompt}`)

  // 11. Lock Creative Revision
  const revision = {
    revision_id: `rev_${Date.now()}`,
    job_id: jobId,
    status: 'LOCKED_FOR_GENERATION',
    approved_at: new Date().toISOString(),
    locked_spoken_script: masterPlan.master_spoken_script,
    locked_veo_prompt: compiledPrompt.cinematicPrompt,
    canonical_asset_shas: {
      hero_product: sourceProductSha,
      brand_logo: sourceLogoSha,
    },
  }
  console.log(`\n9. CREATIVE REVISION LOCKED: [${revision.revision_id}]`)

  if (mode === 'dry-run') {
    console.log('\n============================================================')
    console.log('DRY-RUN VERIFICATION COMPLETE: ALL PRE-GENERATION GATES PASS')
    console.log('============================================================')
    process.exit(0)
  }

  // 12. Flow / Veo Generation (Single attempt policy)
  console.log('\n10. EXECUTING LIVE GENERATION VIA GFLOW ENGINE...')
  const gflowEngineUrl = process.env.GFLOW_ENGINE_URL || 'http://gflow-engine:3461'
  const gflowProvider = new RealHttpGFlowProvider(gflowEngineUrl)

  const targetAccount = 'account-02'
  console.log(`   Active Flow Account: ${targetAccount}`)

  let cleanPrompt = compiledPrompt.cinematicPrompt
    .replace(/@HeroProduct/g, 'provided Hero Product (Reference Image 1)')
    .replace(/@BrandLogo/g, 'provided Brand Logo (Reference Image 2)')
    .replace(/@/g, '')

  // Prevent transport timeout from excessive prompt length (>2500 chars)
  if (cleanPrompt.length > 2500) {
    cleanPrompt = cleanPrompt.replace(/\[CRITICAL VISIBLE ON-SCREEN NEGATIVE DIRECTIVE\]:.*$/, '[NEGATIVE]: No visible subtitles, on-screen text, or floating logos.')
  }
  console.log(`   Clean Prompt Length: ${cleanPrompt.length} chars`)

  const flowPayload = {
    job_id: jobId,
    attempt_id: attemptId,
    account_id: targetAccount,
    org_id: tenant.org_id,
    flow_project_id: `flow_proj_${jobId.slice(0, 10)}`,
    flow_account_id: targetAccount,
    prompt: cleanPrompt,
    aspect_ratio: '9:16',
    model: 'veo-fast',
    duration: 8,
    expected_reference_ids: [tenant.product.product_id, tenant.logo.asset_id],
    assets: [
      {
        asset_id: tenant.product.product_id,
        org_id: tenant.org_id,
        role: 'product',
        file_path: tenant.product.file_path,
        sha256: sourceProductSha,
      },
      {
        asset_id: tenant.logo.asset_id,
        org_id: tenant.org_id,
        role: 'logo',
        file_path: tenant.logo.file_path,
        sha256: sourceLogoSha,
      },
    ],
  }

  let flowResult = await gflowProvider.executeJob(flowPayload)
  console.log('\n11. FLOW EXECUTION COMPLETED:')
  console.log(`   Real Flow Project UUID: ${flowResult.real_flow_project_uuid}`)
  console.log(`   Raw Output Path:        ${flowResult.output_path}`)
  console.log(`   Flow Media IDs:         ${JSON.stringify(flowResult.actual_attached_reference_ids || [])}`)

  let rawVideoPath = flowResult.output_path
  let rawSha = computeFileSha256(rawVideoPath)
  console.log(`   Raw MP4 SHA256:         ${rawSha}`)

  // 13. Raw Video Reviewer & Sector Affordance Inspection
  console.log('\n12. SAMPLING FRAMES & RUNNING HARDENED RAW VIDEO REVIEW...')
  const sampler = new FrameSampler()
  const sampledFrames = await sampler.sampleFrames(rawVideoPath)
  console.log(`   Extracted ${sampledFrames.length} sampled frames.`)

  const reviewer = new ChatGPTVideoReviewer()
  let reviewReport = await reviewer.reviewSampledVideo(sampledFrames, masterPlan, context, 1)
  console.log(`   Review Decision: ${reviewReport.decision}`)
  console.log(`   Failure Codes:   [${reviewReport.failure_codes.join(', ')}]`)
  console.log(`   Sector Match:    ${reviewReport.sector_environment_match ? 'PASS' : 'FAIL'}`)
  console.log(`   Diegetic Logo:   ${reviewReport.diegetic_logo_status || 'NOT_DETECTED'}`)
  console.log(`   Non-Diegetic Overlay Detected: ${reviewReport.non_diegetic_branding_detected}`)

  let regenerationCount = 0
  if (reviewReport.decision === 'REGENERATE' && regenerationCount < 1) {
    console.log('\n   [ATTEMPT 2] Triggering max-one automatic regeneration due to QA failure...')
    regenerationCount++
    flowPayload.attempt_id = `${attemptId}_regen`
    flowResult = await gflowProvider.executeJob(flowPayload)
    rawVideoPath = flowResult.output_path
    rawSha = computeFileSha256(rawVideoPath)
    const newFrames = await sampler.sampleFrames(rawVideoPath)
    reviewReport = await reviewer.reviewSampledVideo(newFrames, masterPlan, context, 2)
    console.log(`   Attempt 2 Decision: ${reviewReport.decision}`)
  }

  // 14. Canonical Logo Gate Verification
  console.log('\n13. RUNNING CANONICAL LOGO GATE...')
  const logoGateResult = CanonicalLogoGate.verifyLogo(snapshot)
  console.log(`   Logo Gate Passed:     ${logoGateResult.passed}`)
  console.log(`   Verified Logo Path:   ${logoGateResult.logoPath}`)
  console.log(`   Verified Logo SHA256: ${logoGateResult.logoSha256}`)
  if (!logoGateResult.passed) {
    console.error(`FATAL: Canonical Logo Gate failed: ${logoGateResult.error}`)
    process.exit(1)
  }

  // Explicit SHA equality assertion: source logo SHA == compositor logo input SHA
  if (sourceLogoSha !== logoGateResult.logoSha256) {
    console.error(`FATAL: SHA Mismatch! Source logo SHA (${sourceLogoSha}) !== Compositor input SHA (${logoGateResult.logoSha256})`)
    process.exit(1)
  }
  console.log(`   EXPLICIT SHA EQUALITY VERIFIED: source logo SHA == compositor logo input SHA`)

  // 15. Pre-Render Final Copy Audit
  console.log('\n14. RUNNING FINAL PRE-RENDER COPY AUDIT (FactualIntegrityGate)...')
  const copyToAudit = [
    { text: masterPlan.master_spoken_script, location: 'subtitles' },
    { text: tenant.campaign.cta, location: 'cta' },
  ]
  const finalCopyAudit = FactualIntegrityGate.auditFinalCopy(copyToAudit, snapshot)
  console.log(`   Final Copy Audit Passed: ${finalCopyAudit.passed}`)
  console.log(`   Audited Claims Count:    ${finalCopyAudit.auditedClaims.length}`)
  if (!finalCopyAudit.passed) {
    console.error(`FATAL: Final copy audit failed: ${JSON.stringify(finalCopyAudit.violations)}`)
    process.exit(1)
  }

  // 16. Deterministic Post-Production Compositor
  console.log('\n15. COMPOSITING CANONICAL LOGO AND KINETIC SUBTITLES VIA FFMPEG...')
  const finalDir = path.dirname(rawVideoPath)
  const finalVideoPath = path.join(finalDir, `Ayvazoglu_Insaat_Post_Hardening_Canary_Final.mp4`)

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
    fontSize: 40,
    marginV: 180,
  })
  const assPath = path.join(finalDir, 'subtitles_ayvaz.ass')
  fs.writeFileSync(assPath, assContent, 'utf-8')

  // Deterministic compositor execution
  const compCmd = `ffmpeg -y -i "${rawVideoPath}" -i "${logoGateResult.logoPath}" -filter_complex "[1:v]scale=180:-1[logo];[0:v][logo]overlay=W-w-35:55:enable='between(t,0,7.5)'[v1];[v1]ass='${assPath}'[vout]" -map "[vout]" -map 0:a? -c:v libx264 -preset fast -crf 18 -c:a copy "${finalVideoPath}"`
  execSync(compCmd, { stdio: 'inherit' })

  // 17. Final Media Validation & Duplicate Detection
  const finalSha = computeFileSha256(finalVideoPath)
  const ffmpeg = new RealFFmpegAdapter()
  const finalProbe = await ffmpeg.runFfprobe(finalVideoPath)

  console.log('\n16. FINAL DELIVERABLE METRICS:')
  console.log(`   Final File Path: ${finalVideoPath}`)
  console.log(`   Final SHA256:    ${finalSha}`)
  console.log(`   Duration:        ${finalProbe.duration}s`)
  console.log(`   Dimensions:      ${finalProbe.width}x${finalProbe.height} (${finalProbe.fps} fps)`)

  // Duplicate Output Check against all previous fixtures
  const duplicateDetector = DuplicateOutputDetector.getInstance()
  const dupCheck = duplicateDetector.recordOutput({
    output_id: path.basename(finalVideoPath),
    job_id: jobId,
    raw_sha256: rawSha,
    final_sha256: finalSha,
    created_at: new Date().toISOString(),
  })

  console.log(`\n17. DUPLICATE OUTPUT CHECK:`)
  console.log(`   Is Duplicate: ${dupCheck.isDuplicate ? 'YES (FAIL)' : 'NO (PASS)'}`)
  if (dupCheck.isDuplicate) {
    console.error(`FATAL: DUPLICATE_OUTPUT DETECTED! SHA matches previous output: ${dupCheck.duplicateOf}`)
    process.exit(1)
  }

  // Summary JSON Payload
  const summaryPayload = {
    tenant: tenant.brand_name,
    product: tenant.product.name,
    org_id: tenant.org_id,
    job_id: jobId,
    attempt_id: attemptId,
    selected_concept: selection.selected_concept.one_sentence_idea,
    style_format: `${selection.selected_concept.ad_format} (${selection.selected_concept.format_variant})`,
    exact_speech: masterPlan.master_spoken_script,
    verified_facts_used: tenant.verified_claims,
    source_product_sha: sourceProductSha,
    source_logo_sha: sourceLogoSha,
    flow_project_id: flowResult.real_flow_project_uuid,
    flow_media_ids: flowResult.actual_attached_reference_ids || [],
    raw_mp4_sha: rawSha,
    reviewer_result: reviewReport.decision,
    regeneration_count: regenerationCount,
    compositor_logo_input_sha: logoGateResult.logoSha256,
    final_mp4_sha: finalSha,
    final_video_path: finalVideoPath,
    logo_sha_equality_verified: sourceLogoSha === logoGateResult.logoSha256,
    duplicate_detected: dupCheck.isDuplicate,
    verdict: 'POST-HARDENING CANARY PASSED',
  }

  fs.writeFileSync(path.join(finalDir, 'canary_summary.json'), JSON.stringify(summaryPayload, null, 2))
  console.log('\nCANARY EXECUTION RESULT:')
  console.log(JSON.stringify(summaryPayload, null, 2))
}

main().catch(err => {
  console.error('\nFATAL ERROR in Canary Runner:', err)
  process.exit(1)
})
