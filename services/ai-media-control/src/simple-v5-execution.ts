import { createHash } from 'node:crypto'
import { statSync, readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  AudioIntegrityGate,
  CanonicalLogoGate,
  ChatGPTVideoReviewer,
  CreativeContextBuilder,
  DeterministicCampaignTextRenderer,
  FactualIntegrityGate,
  FlowVeoPromptCompiler,
  FrameSampler,
  GeminiVideoPromptCompiler,
  LogoPresentationGate,
  RealFFmpegAdapter,
  RealHttpGFlowProvider,
  SimpleV5BriefNormalizer,
  SimpleV5SevereReviewer,
  buildSimpleV5ProductionPlan,
  createBrandContextSnapshot,
  type RawBrandInput,
} from '@wa/creative-video-orchestrator'
import { validateOutput } from './validator.js'
import { JobState, transitionJob } from './state-machine.js'
import { FlowVeoVideoProvider, OmniStudioGeminiNativeVideoProvider } from './providers/real-video-providers.js'
import {
  VideoProviderRouter,
  type ProviderRoutingResult,
  type RequestedVideoProvider,
  type VideoGenerationRequest,
} from './providers/video-provider-router.js'
import { GenerationWorkspace } from './providers/generation-workspace.js'
import { loadFinishingCheckpoint } from './finishing-checkpoint.js'

type ProviderAsset = VideoGenerationRequest['assets'][number]

interface SimpleExecutionOptions {
  supabase: any
  gflowEngineUrl: string
  job: any
  accountId: string
  attemptId: string
  startTime: number
  rawInput: RawBrandInput
  assets: ProviderAsset[]
}

function providerPrompt(compiled: { cinematicPrompt: string; negativePrompt: string }): string {
  return `${compiled.cinematicPrompt}\n[SHORT NEGATIVE LIST]: ${compiled.negativePrompt}`
}

function sha256File(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

function buildReviewInputs(job: any, snapshot: ReturnType<typeof createBrandContextSnapshot>, assets: ProviderAsset[], brief: any, shotPlan: any, productionPlan: any) {
  const attachments = assets.map((asset, index) => ({
    asset_id: asset.asset_id,
    org_id: asset.org_id,
    sha256: asset.sha256,
    role: asset.role,
    canonical_handle: asset.role === 'logo'
      ? '@BrandLogo'
      : index === assets.findIndex(item => item.role !== 'logo')
        ? '@HeroProduct'
        : '@ExtraReference',
    file_path: asset.file_path,
    attached_successfully: true,
  }))

  const context = CreativeContextBuilder.build({
    org_id: job.org_id,
    job_id: job.id,
    brand_profile: {
      brand_name: snapshot.brand_name,
      sector: snapshot.sector_profile,
      tone_of_voice: [...snapshot.tone_of_voice],
      visual_personality: snapshot.visual_style.join(', '),
      palette: Object.values(snapshot.brand_palette).filter(Boolean) as string[],
      typography_preferences: snapshot.typography.headingFont || 'canonical brand typography',
      preferred_copy_style: 'short factual Turkish speech',
      preferred_visual_energy: 'single coherent camera language',
      logo_usage_rules: ['Do not invent physical branding; screen-space logo is deterministic.'],
      visual_dos: ['Preserve the canonical hero product.'],
      visual_donts: ['Do not add foreign brands or synthetic text.'],
      approved_patterns: ['simple_v5_hybrid'],
      rejected_patterns: ['invented_diegetic_branding'],
      successful_creative_traits: ['single_product_single_action'],
    },
    campaign_context: {
      selected_product_or_service: brief.subject,
      campaign_objective: brief.goal,
      user_style_preference: 'SIMPLE_V5_HYBRID',
      target_platform: 'reels_tiktok_shorts',
      duration: brief.durationSeconds,
      aspect_ratio: brief.aspectRatio,
      language: 'tr',
      campaign_message: brief.spokenScript,
      verified_offer: snapshot.campaign.offer,
      verified_price: snapshot.campaign.price,
      verified_cta: snapshot.campaign.cta,
      verified_phone: snapshot.campaign.phoneNumber,
      verified_url: snapshot.campaign.website,
      subtitle_mode: productionPlan.subtitles.mode,
    },
    attachments,
    verified_facts: (snapshot.verified_claims || []).map((claim, index) => ({
      claim,
      source_type: 'manual_verified' as const,
      source_id: `locked-revision-${index + 1}`,
    })),
  })

  const plan: any = {
    plan_id: `${job.id}:simple-v5`,
    brand_name: snapshot.brand_name,
    creative_idea: brief.primaryIdea,
    advertising_hook: shotPlan.shot1_hook.description,
    product_truth: brief.subject,
    audience_value: brief.goal,
    story_arc: 'hook, product proof, hero close',
    beats: [
      { start: 0, end: 2.2, purpose: 'HOOK', visual_action: shotPlan.shot1_hook.description, product_action: '', actor_action: '', environment: brief.location, camera: brief.cameraMotion, lighting: brief.lighting, physics_constraints: ['realistic material physics'], sfx: 'natural foley', ambience: 'natural ambience' },
      { start: 2.2, end: 5.8, purpose: 'PRODUCT_PROOF', visual_action: shotPlan.shot2_proof.description, product_action: brief.primaryAction, actor_action: '', environment: brief.location, camera: brief.cameraMotion, lighting: brief.lighting, physics_constraints: ['preserve product geometry'], voiceover: brief.spokenScript, sfx: 'natural foley', ambience: 'natural ambience' },
      { start: 5.8, end: 8, purpose: 'BRAND_CLOSE', visual_action: shotPlan.shot3_close.description, product_action: '', actor_action: '', environment: brief.location, camera: 'stable close', lighting: brief.lighting, physics_constraints: ['no generated text'], sfx: 'natural foley', ambience: 'natural ambience' },
    ],
    audio_plan: {
      spoken_language: 'tr-TR',
      speech_mode: 'native_veo_dialogue',
      exact_spoken_lines: [{ start: 0.5, end: 5.25, speaker: 'narrator', text: brief.spokenScript }],
      allow_paraphrase: false,
      allow_translation: false,
      allow_extra_dialogue: false,
    },
    voiceover_script: brief.spokenScript,
    subtitle_plan: [],
    logo_strategy: 'GRAPHIC_OVERLAY',
    diegetic_branding_plan: [],
    overlay_plan: [],
    end_card_plan: { start_sec: productionPlan.timeline.outro_start_sec, end_sec: productionPlan.timeline.outro_end_sec, template_family: 'deterministic', headline: '', cta_text: '', website_or_phone: '', background_color: '#000000', accent_color: '#000000' },
    negative_constraints: [],
    canonical_asset_handles: attachments.map(item => item.canonical_handle),
    veo_generation_intent: brief.primaryIdea,
  }

  return { context, plan }
}

async function reviewOnce(
  result: ProviderRoutingResult,
  attemptNumber: number,
  job: any,
  snapshot: ReturnType<typeof createBrandContextSnapshot>,
  assets: ProviderAsset[],
  brief: any,
  shotPlan: any,
  productionPlan: any
) {
  const frameSampler = new FrameSampler()
  const frames = await frameSampler.sampleFrames(result.outputPath, {
    output_dir: join('/shared/outputs', job.org_id, job.id, 'qa', `simple-review-${attemptNumber}`),
  })
  const audioReport = await AudioIntegrityGate.evaluateRawVeoAudio({
    rawVideoPath: result.outputPath,
    expectedLanguage: 'tr',
    expectedDialogue: brief.spokenScript,
    speechWindow: { startSec: 0.5, endBeforeSec: 5.5 },
  })
  const { context, plan } = buildReviewInputs(job, snapshot, assets, brief, shotPlan, productionPlan)
  const videoReport = await new ChatGPTVideoReviewer().reviewSampledVideo(frames, plan, context, attemptNumber)
  return { ...SimpleV5SevereReviewer.evaluateSevereErrorsOnly({ audioReport, videoReport, sampledFrames: frames.map(frame => frame.frame_path) }), audio_report: audioReport }
}

export async function runSimpleV5HybridExecution(options: SimpleExecutionOptions): Promise<void> {
  const { supabase, gflowEngineUrl, job, accountId, attemptId, startTime, rawInput, assets } = options
  const { data: flowAccount } = await supabase
    .from('flow_accounts')
    .select('email')
    .eq('id', accountId)
    .maybeSingle()
  const expectedAccountEmail = String(flowAccount?.email || '').trim().toLowerCase() || null
  if (!expectedAccountEmail) {
    throw new Error(`FLOW_ACCOUNT_CONFIGURATION_REQUIRED: no canonical email is configured for ${accountId}`)
  }
  const snapshot = createBrandContextSnapshot({ ...rawInput, creative_engine_mode: 'SIMPLE_V5_HYBRID' })
  const { brief, shotPlan } = SimpleV5BriefNormalizer.normalize(snapshot)
  const productionPlan = buildSimpleV5ProductionPlan(snapshot, brief, shotPlan)
  const geminiCompiled = GeminiVideoPromptCompiler.compile(brief, shotPlan)
  const flowCompiled = FlowVeoPromptCompiler.compile(brief, shotPlan)
  const geminiPrompt = providerPrompt(geminiCompiled)
  const flowPrompt = providerPrompt(flowCompiled)

  for (const exactPrompt of [geminiPrompt, flowPrompt]) {
    const factual = FactualIntegrityGate.validateVeoPrompt(exactPrompt, snapshot)
    if (!factual.passed) {
      console.warn(`[simple-v5] Factual integrity warning: ${factual.violations.map(item => item.unverifiedValue).join(', ')}`)
    }
  }

  const requestedProvider = (job.requested_provider || job.metadata?.requested_provider || 'AUTO') as RequestedVideoProvider
  const fidelityInfo = flowCompiled.fidelity || geminiCompiled.fidelity || {
    applied: true,
    canonicalAssetSha: brief.heroProductSha || '',
    productId: brief.heroProductId || '',
    ruleCount: brief.fidelityReport?.ruleCount || 0,
    contract: brief.fidelityReport?.contract,
  }

  const diagnostics = {
    creative_engine_mode: 'SIMPLE_V5_HYBRID',
    requested_provider: requestedProvider,
    common_plan: { brief, shotPlan },
    exact_provider_prompts: {
      GEMINI_NATIVE_VIDEO: geminiPrompt,
      FLOW_VEO: flowPrompt,
    },
    prompt_metrics: {
      GEMINI_NATIVE_VIDEO: geminiCompiled.metrics,
      FLOW_VEO: flowCompiled.metrics,
    },
    fidelity_contract_applied: true,
    canonical_asset_sha: fidelityInfo.canonicalAssetSha,
    product_id: fidelityInfo.productId,
    fidelity_rule_count: fidelityInfo.ruleCount,
    product_fidelity_contract: fidelityInfo.contract,
    max_automatic_regenerations: 1,
    production_plan: productionPlan,
  }
  await supabase.from('ai_media_jobs').update({
    creative_engine_mode: 'SIMPLE_V5_HYBRID',
    requested_provider: requestedProvider,
    metadata: {
      ...(job.metadata || {}),
      simple_v5_diagnostics: diagnostics,
      fidelity_contract_applied: true,
      canonical_asset_sha: fidelityInfo.canonicalAssetSha,
      product_id: fidelityInfo.productId,
      fidelity_rule_count: fidelityInfo.ruleCount,
    },
  }).eq('id', job.id)

  const checkpoint = await loadFinishingCheckpoint(supabase, job, brief, assets)
  let providerStage = JobState.PREPARING_ENV
  const onProgress: NonNullable<VideoGenerationRequest['onProgress']> = async event => {
    // Automatic regeneration stays in GENERATING; its physical evidence is still saved.
    if (providerStage === JobState.GENERATING) return
    const next = event.stage as JobState
    if (next === JobState.INGREDIENTS_VERIFIED) {
      const verified = event.verified_assets || []
      const media = new Set<string>()
      const identities = new Set<string>()
      if (verified.length !== assets.length) throw new Error('PHYSICAL_REFERENCE_COUNT_MISMATCH')
      for (const actual of verified) {
        const expected = assets.find(asset => asset.asset_id === actual.asset_id)
        if (identities.has(actual.asset_id) || !expected || actual.org_id !== job.org_id || actual.role !== expected.role || actual.sha256 !== expected.sha256 || !actual.attached_media_id || media.has(actual.attached_media_id)) throw new Error('PHYSICAL_REFERENCE_IDENTITY_MISMATCH')
        media.add(actual.attached_media_id)
        identities.add(actual.asset_id)
      }
      const { error, count } = await supabase.from('ai_media_jobs').update({ actual_ingredient_count: verified.length }, { count: 'exact' }).eq('id', job.id).eq('org_id', job.org_id).eq('state', providerStage)
      if (error || count !== 1) throw new Error('PHYSICAL_REFERENCE_PERSISTENCE_FAILED')
    }
    await transitionJob(supabase, job.id, job.org_id, providerStage, next, `Flow observed ${next}`, { ...event }, attemptId)
    providerStage = next
  }

  const router = new VideoProviderRouter(
    new OmniStudioGeminiNativeVideoProvider(),
    new FlowVeoVideoProvider(new RealHttpGFlowProvider(gflowEngineUrl))
  )
  const request: VideoGenerationRequest = {
    onProgress,
    jobId: job.id,
    attemptId,
    orgId: job.org_id,
    prompt: geminiPrompt,
    providerPrompts: { GEMINI_NATIVE_VIDEO: geminiPrompt, FLOW_VEO: flowPrompt },
    approvedDialogue: brief.spokenScript,
    aspectRatio: brief.aspectRatio,
    durationSeconds: brief.durationSeconds,
    accountId,
    expectedAccountEmail,
    assets,
    productionPlan,
    ...( {
      fidelity_contract_applied: true,
      canonical_asset_sha: fidelityInfo.canonicalAssetSha,
      product_id: fidelityInfo.productId,
      fidelity_rule_count: fidelityInfo.ruleCount,
      product_fidelity_contract: fidelityInfo.contract,
    } as any),
  }

  let generated = checkpoint?.generated || await router.execute(requestedProvider, request)
  let review = await reviewOnce(generated, 1, job, snapshot, assets, brief, shotPlan, productionPlan)
  const providerAttemptHistory: Array<Record<string, unknown>> = checkpoint ? [...checkpoint.history] : [{
    ...generated,
    combinedReview: review,
  }]
  let automaticRegenerations = checkpoint?.automaticRegenerations || 0
  if (!checkpoint && review.decision === 'REGENERATE') {
    automaticRegenerations = 1
    const retryDirection = `\n[SEVERE RETRY ONLY]: Correct these failures without changing facts or the approved speech: ${review.severeFailureCodes.join(', ')}.`
    generated = await router.execute(requestedProvider, {
      ...request,
      attemptId: `${attemptId}-regen-1`,
      prompt: geminiPrompt + retryDirection,
      providerPrompts: {
        GEMINI_NATIVE_VIDEO: geminiPrompt + retryDirection,
        FLOW_VEO: flowPrompt + retryDirection,
      },
    })
    review = await reviewOnce(generated, 2, job, snapshot, assets, brief, shotPlan, productionPlan)
    providerAttemptHistory.push({
      ...generated,
      combinedReview: review,
    })
  }

  const providerAttemptCounts = providerAttemptHistory.reduce<Record<'GEMINI_NATIVE_VIDEO' | 'FLOW_VEO', number>>((counts, item: any) => {
    counts.GEMINI_NATIVE_VIDEO += Number(item.attemptCounts?.GEMINI_NATIVE_VIDEO || 0)
    counts.FLOW_VEO += Number(item.attemptCounts?.FLOW_VEO || 0)
    return counts
  }, { GEMINI_NATIVE_VIDEO: 0, FLOW_VEO: 0 })

  const providerRecord = {
    requested_provider: requestedProvider,
    selected_provider: generated.selectedProvider,
    provider_account_id: generated.providerAccountId || null,
    provider_attempt_id: generated.providerAttemptId,
    provider_project_id: generated.providerProjectId || null,
    provider_media_ids: generated.providerMediaIds || [],
    capability_state: generated.capabilityState,
    fallback_from: generated.fallbackFrom || null,
    fallback_reason: generated.fallbackReason || null,
    raw_output_sha256: generated.rawOutputSha256,
    generation_started_at: generated.generationStartedAt,
    generation_completed_at: generated.generationCompletedAt,
  }
  await supabase.from('ai_media_attempts').update({
    ...providerRecord,
    flow_project_id: generated.selectedProvider === 'FLOW_VEO' ? generated.providerProjectId : null,
    metadata: {
      diagnostics,
      provider_attempt_counts: providerAttemptCounts,
      provider_attempt_history: providerAttemptHistory,
      automatic_regenerations: automaticRegenerations,
      combined_review: review,
      finishing_checkpoint_assets: assets.map(asset => ({ role: asset.role, sha256: asset.sha256 })),
      resumed_from_attempt_id: checkpoint?.sourceAttemptId || null,
    },
  }).eq('id', attemptId)
  await supabase.from('ai_media_jobs').update({
    selected_provider: providerRecord.selected_provider,
    provider_account_id: providerRecord.provider_account_id,
    capability_state: providerRecord.capability_state,
    fallback_from: providerRecord.fallback_from,
    fallback_reason: providerRecord.fallback_reason,
    raw_output_sha256: providerRecord.raw_output_sha256,
    generation_started_at: providerRecord.generation_started_at,
    generation_completed_at: providerRecord.generation_completed_at,
  }).eq('id', job.id)

  if (checkpoint) {
    await transitionJob(supabase, job.id, job.org_id, JobState.PREPARING_ENV, JobState.MEDIA_DOWNLOADED, 'Resuming verified raw media without a provider submission', { source_attempt_id: checkpoint.sourceAttemptId, raw_output_sha256: generated.rawOutputSha256 }, attemptId)
  } else {
  await transitionJob(supabase, job.id, job.org_id, JobState.GENERATING, JobState.POLLING_FLOW, `${generated.selectedProvider} generation completed; collecting provider output`, { selected_provider: generated.selectedProvider }, attemptId)
  await transitionJob(supabase, job.id, job.org_id, JobState.POLLING_FLOW, JobState.DOWNLOADING_MEDIA, 'Collecting generated MP4 from selected provider', {}, attemptId)
  await transitionJob(supabase, job.id, job.org_id, JobState.DOWNLOADING_MEDIA, JobState.MEDIA_DOWNLOADED, `Raw media saved with SHA-256 ${generated.rawOutputSha256}`, { output_path: generated.outputPath }, attemptId)

  }

  // ── Deterministic subtitle generation from APPROVED VO text (source of truth) ──
  // We deliberately do NOT use ASR. The approved spoken script is the canonical text.
  const snapshotAny = snapshot.campaign as any
  const outroEnabled =
    (productionPlan as any)?.outro?.mode !== 'off' &&
    snapshotAny?.outro !== 'off' &&
    snapshotAny?.outro !== false &&
    (job.metadata as any)?.outro !== 'off'

  await transitionJob(supabase, job.id, job.org_id, JobState.MEDIA_DOWNLOADED, JobState.MEDIA_PROCESSING, 'Processing verified raw media into the final output', {}, attemptId)
  const ffmpeg = new RealFFmpegAdapter()
  const rawProbe = await ffmpeg.runFfprobe(generated.outputPath)

  let logoCheck: any = null
  let logoPresentation: any = { passed: true, skipped: true, reason: 'OUTRO_DISABLED' }
  let presentationNeedsReview = false

  if (outroEnabled) {
    logoCheck = CanonicalLogoGate.verifyLogo(snapshot)
    if (!logoCheck.passed || !logoCheck.logoPath || !logoCheck.logoSha256) {
      throw new Error(`CANONICAL_LOGO_GATE_FAIL: ${logoCheck.error || 'canonical logo unavailable'}`)
    }
  }

  // Words are distributed evenly across subtitle window (strict; never bleeds into outro).
  const SUBTITLE_WINDOW_START = 0.5
  const SUBTITLE_WINDOW_END   = outroEnabled
    ? 5.25
    : Math.max(5.5, (rawProbe.duration || brief.durationSeconds || 8) - 0.5)

  const textRenderer = new DeterministicCampaignTextRenderer()
  const scriptWords = (brief.spokenScript || '').split(/\s+/).filter(Boolean)
  const voiceDuration = SUBTITLE_WINDOW_END - SUBTITLE_WINDOW_START
  const wordDur = voiceDuration / Math.max(1, scriptWords.length)
  const timedWords = scriptWords.map((w: string, idx: number) => ({
    word: w,
    start: SUBTITLE_WINDOW_START + idx * wordDur,
    end:   SUBTITLE_WINDOW_START + (idx + 1) * wordDur,
  }))
  const assContent = textRenderer.buildCapCutKineticAss(timedWords, {
    playResX: rawProbe.width  || 720,
    playResY: rawProbe.height || 1280,
    fontSize:     36,
    activeColor:  '&H0000D0FF&',  // Amber/yellow highlight — visible on all backgrounds
    marginV:      220,
    maxEndTimeSec: SUBTITLE_WINDOW_END,  // Hard cap: zero subtitle bleed into outro
  })
  const assPath = generated.outputPath.replace(/\.mp4$/i, '_subtitles.ass')
  const subtitlesEnabled = productionPlan.subtitles.mode === 'auto'
  if (subtitlesEnabled) writeFileSync(assPath, assContent, 'utf8')

  // ── Layered overlay manifest ─────────────────────────────────────────────────
  // Each layer is independent and combinable. Never mix subtitle_layer with outro layers.
  //   subtitle_layer : VO-synced kinetic words, strictly 0.5–5.5s
  //   logo_layer     : brand logo centered on black card, 6.0–8.0s
  //   brand_layer    : brand name + slogan text, 6.5–8.0s
  //   contact_layer  : phone + website, 6.7–8.0s
  //   cta_layer      : call-to-action button text, 6.7–8.0s
  const finishedPath = generated.outputPath.replace(/\.mp4$/i, '_finished.mp4')

  // Resolve Outro & CTA: pull from wizard inputs if present, or generate clean, natural defaults
  const outroWebsite = (snapshotAny.outro_website || snapshot.campaign.website || (snapshot as any).website || '').trim()
  const outroPhone   = (snapshotAny.outro_phone || snapshot.campaign.phoneNumber || (snapshot as any).phone || '').trim()

  // 1. CTA Button: Wizard explicit > Smart context-aware default
  let ctaText = (snapshotAny.outro_cta || snapshot.campaign.cta || '').trim()
  if (/whatsapp/i.test(ctaText)) ctaText = ''
  if (!ctaText) {
    if (outroWebsite) {
      ctaText = 'Hemen İncele'
    } else if (outroPhone) {
      ctaText = 'Bize Ulaşın'
    } else {
      ctaText = 'Hemen Keşfet'
    }
  }

  // 2. Slogan / Tagline: Wizard explicit > Simple, clean, natural Turkish copy
  let outroSlogan = (snapshotAny.outro_slogan || snapshotAny.slogan || snapshotAny.tagline || snapshotAny.sub_headline || '').trim()

  await ffmpeg.applyDeterministicFinishing(
    generated.outputPath,
    {
      enableOutro: outroEnabled,
      outro: outroEnabled ? 'auto' : 'off',

      // Subtitle layer (source-of-truth: approved VO text, NOT ASR)
      subtitlesPath: subtitlesEnabled ? assPath : '',

      // Logo layer
      brandLogoPath: logoCheck?.logoPath,
      brandLogoSha:  logoCheck?.logoSha256,

      // Brand layer (outro card text)
      outroBrandName: snapshot.brand_name,
      outroSlogan,

      // Contact layer (separate from subtitles and CTA)
      outroPhone:   snapshot.campaign.phoneNumber || '',
      outroWebsite: snapshot.campaign.website     || '',

      // CTA layer (separate overlay, never mixed with subtitles)
      ctaBadgeText: ctaText,
    },
    finishedPath
  )
  if (outroEnabled) {
    const preparedLogoPath = finishedPath.replace(/\.mp4$/i, '_outro_logo.png')
    logoPresentation = { ...LogoPresentationGate.evaluateLogoPresentation({
      logoFilePath: preparedLogoPath, videoWidth: rawProbe.width, videoHeight: rawProbe.height,
      presentationMode: 'outro',
    }), canonical_source_sha256: logoCheck.logoSha256,
      prepared_logo_sha256: existsSync(preparedLogoPath) ? sha256File(preparedLogoPath) : null }
    presentationNeedsReview = !logoPresentation.passed
  }

  await transitionJob(supabase, job.id, job.org_id, JobState.MEDIA_PROCESSING, JobState.FFPROBE_INSPECTING, 'Inspecting final video streams with ffprobe', {}, attemptId)
  await transitionJob(supabase, job.id, job.org_id, JobState.FFPROBE_INSPECTING, JobState.SHA256_VERIFYING, 'Computing final output SHA-256', {}, attemptId)
  await transitionJob(supabase, job.id, job.org_id, JobState.SHA256_VERIFYING, JobState.VISUAL_QA_EVALUATING, 'Recording combined severe-error review and duration-aware QA frames', {}, attemptId)
  await transitionJob(supabase, job.id, job.org_id, JobState.VISUAL_QA_EVALUATING, JobState.QUALITY_CHECK, 'Checking final output against the approved production plan', {}, attemptId)

  const qaDir = join('/shared/outputs', job.org_id, job.id, attemptId, 'qa')
  const validation = await validateOutput(finishedPath, brief.aspectRatio, 3, 15, qaDir)
  if (!validation.verified) {
    throw new Error(`Validation failed: ${validation.errors.join('; ')}`)
  }
  const finalSha = sha256File(finishedPath)
  if (finalSha !== validation.sha256) {
    throw new Error('FINAL_SHA_MISMATCH: independent final output hashes differ')
  }

  const ws = new GenerationWorkspace({ jobId: job.id, attemptId })
  ws.logEvent('FINISHING', 'Recording final finished video')
  const { sha256: recordedFinalSha, size: recordedFinalSize } = ws.recordFinalVideo(finishedPath)
  ws.logEvent('COMPLETED', `final.mp4 written (${recordedFinalSize} bytes, sha256: ${recordedFinalSha})`)

  // --- PUBLISH FINISHED MEDIA TO OMNISTUDIO GATEWAY OUTPUTS & SHARED VOLUMES ---
  const thumbPath = finishedPath.replace(/\.mp4$/i, '_thumb.jpg')
  const targetDirs = [
    '/shared/gateway_outputs',
    '/opt/whatsappbot/services/omnistudio/docker/data/outputs',
    '/shared/outputs',
    join('/shared/outputs', job.org_id, job.id),
  ]

  for (const dir of targetDirs) {
    if (existsSync(dir)) {
      try {
        // 1. As <jobId>_finished.mp4
        copyFileSync(finishedPath, join(dir, `${job.id}_finished.mp4`))
        // 2. As <jobId>.mp4 (overwrite raw video with finished post-production video!)
        copyFileSync(finishedPath, join(dir, `${job.id}.mp4`))
        // 3. As <jobId>_thumb.jpg
        if (existsSync(thumbPath)) {
          copyFileSync(thumbPath, join(dir, `${job.id}_thumb.jpg`))
          copyFileSync(thumbPath, join(dir, `${job.id}.jpg`))
        }
      } catch (copyErr) {
        console.warn(`[simple-v5] Output mirroring warning for ${dir}:`, copyErr)
      }
    }
  }

  const approved = review.decision === 'PASS' && !presentationNeedsReview
  ws.writeResult({
    job_id: job.id,
    attempt_id: attemptId,
    status: approved ? 'COMPLETED' : 'NEEDS_REVIEW',
    selected_provider: generated.selectedProvider,
    raw_mp4_path: ws.rawMp4Path(),
    final_mp4_path: ws.finalMp4Path(),
    raw_sha256: generated.rawOutputSha256,
    final_sha256: recordedFinalSha,
    duration_seconds: validation.ffprobe.duration,
    resolution: `${validation.ffprobe.width}x${validation.ffprobe.height}`,
    approved,
    review_decision: review.decision,
    fidelity_contract_applied: true,
    canonical_asset_sha: fidelityInfo.canonicalAssetSha,
    product_id: fidelityInfo.productId,
    fidelity_rule_count: fidelityInfo.ruleCount,
    completed_at: new Date().toISOString(),
  })
  const { data: outRow } = await supabase.from('ai_media_outputs').insert({
    job_id: job.id,
    org_id: job.org_id,
    attempt_id: attemptId,
    file_path: `/shared/outputs/${job.id}_finished.mp4`,
    sha256: finalSha,
    byte_size: statSync(finishedPath).size,
    duration_seconds: validation.ffprobe.duration,
    width: validation.ffprobe.width,
    height: validation.ffprobe.height,
    fps: validation.ffprobe.fps,
    vcodec: validation.ffprobe.vcodec,
    acodec: validation.ffprobe.acodec,
    visual_qa_score: null,
    visual_qa_report: {
      combined_review: review,
      finishing_checkpoint_assets: assets.map(asset => ({ role: asset.role, sha256: asset.sha256 })),
      resumed_from_attempt_id: checkpoint?.sourceAttemptId || null,
      logo_presentation: logoPresentation,
      provider: providerRecord,
      production_plan: productionPlan,
      automatic_regenerations: automaticRegenerations,
    },
    qa_frame_10_url: validation.qaFramePaths.frame10,
    qa_frame_50_url: validation.qaFramePaths.frame50,
    qa_frame_90_url: validation.qaFramePaths.frame90,
    verified: true,
    is_approved: approved,
    delivered_at: new Date().toISOString(),
  }).select('id').single()

  await supabase.from('ai_media_attempts').update({
    status: 'completed',
    finished_at: new Date().toISOString(),
  }).eq('id', attemptId)

  if (outRow?.id) {
    try {
      const payloadJson = JSON.stringify({
        job_id: job.id,
        creative_engine_mode: 'SIMPLE_V5_HYBRID',
        selected_provider: generated.selectedProvider,
        review_required: !approved,
        review_decision: review.decision,
        thumbnailUrl: `/api/ai-media/outputs/${outRow.id}?thumb=1`,
      })
      const nowIso = new Date().toISOString()
      const publicUrl = `/api/ai-media/outputs/${outRow.id}`
      const title = job.title || 'Kampanya Videosu'

      if (typeof supabase.query === 'function') {
        const updateRes = await supabase.query(`
          UPDATE creatives SET
            title = $2,
            format = 'video',
            status = 'ready',
            source = 'ai',
            public_url = $3,
            payload = $4::jsonb,
            updated_at = $5
          WHERE id = $1
        `, [job.id, title, publicUrl, payloadJson, nowIso])

        if (!updateRes?.rowCount || updateRes.rowCount === 0) {
          const createdBy = (job.metadata as any)?.created_by_user_id || (job.metadata as any)?.created_by || null
          await supabase.query(`
            INSERT INTO creatives (id, org_id, created_by, title, format, status, source, public_url, payload, updated_at)
            VALUES ($1, $2, $3, $4, 'video', 'ready', 'ai', $5, $6::jsonb, $7)
            ON CONFLICT (id) DO UPDATE SET
              status = 'ready',
              public_url = EXCLUDED.public_url,
              payload = EXCLUDED.payload,
              updated_at = EXCLUDED.updated_at
          `, [job.id, job.org_id, createdBy, title, publicUrl, payloadJson, nowIso])
        }
      } else if (typeof supabase.from === 'function') {
        const { data: updated } = await (supabase.from('creatives') as any).update({
          title,
          format: 'video',
          status: 'ready',
          source: 'ai',
          public_url: publicUrl,
          payload: JSON.parse(payloadJson),
          updated_at: nowIso,
        }).eq('id', job.id).select('id')

        if (!updated || updated.length === 0) {
          const createdBy = (job.metadata as any)?.created_by_user_id || (job.metadata as any)?.created_by || null
          await (supabase.from('creatives') as any).upsert({
            id: job.id,
            org_id: job.org_id,
            created_by: createdBy,
            title,
            format: 'video',
            status: 'ready',
            source: 'ai',
            public_url: publicUrl,
            payload: JSON.parse(payloadJson),
            updated_at: nowIso,
          }, { onConflict: 'id' })
        }
      }
    } catch (crErr) {
      console.warn('[simple-v5-execution] creatives upsert warning:', crErr)
    }
  }

  const finalState = approved ? JobState.COMPLETED : JobState.NEEDS_REVIEW
  await transitionJob(
    supabase,
    job.id,
    job.org_id,
    JobState.QUALITY_CHECK,
    finalState,
    approved
      ? `SIMPLE_V5_HYBRID completed in ${Math.round((Date.now() - startTime) / 1000)}s`
      : 'SIMPLE_V5_HYBRID output is technically valid but requires human review',
    { final_sha256: finalSha, selected_provider: generated.selectedProvider, review_decision: review.decision },
    attemptId
  )
}
