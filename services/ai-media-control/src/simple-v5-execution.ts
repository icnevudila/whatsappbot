import { createHash } from 'node:crypto'
import { statSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  AudioIntegrityGate,
  CanonicalLogoGate,
  ChatGPTVideoReviewer,
  CreativeContextBuilder,
  FactualIntegrityGate,
  FlowVeoPromptCompiler,
  FrameSampler,
  GeminiVideoPromptCompiler,
  LogoPresentationGate,
  RealFFmpegAdapter,
  RealHttpGFlowProvider,
  SimpleV5BriefNormalizer,
  SimpleV5SevereReviewer,
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

function buildReviewInputs(job: any, snapshot: ReturnType<typeof createBrandContextSnapshot>, assets: ProviderAsset[], brief: any, shotPlan: any) {
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
      subtitle_mode: 'off',
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
      exact_spoken_lines: [{ start: 2.2, end: 7.2, speaker: 'narrator', text: brief.spokenScript }],
      allow_paraphrase: false,
      allow_translation: false,
      allow_extra_dialogue: false,
    },
    voiceover_script: brief.spokenScript,
    subtitle_plan: [],
    logo_strategy: 'GRAPHIC_OVERLAY',
    diegetic_branding_plan: [],
    overlay_plan: [],
    end_card_plan: { start_sec: 8, end_sec: 8, template_family: 'none', headline: '', cta_text: '', website_or_phone: '', background_color: '#000000', accent_color: '#000000' },
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
  shotPlan: any
) {
  const frameSampler = new FrameSampler()
  const frames = await frameSampler.sampleFrames(result.outputPath, {
    output_dir: join('/shared/outputs', job.org_id, job.id, 'qa', `simple-review-${attemptNumber}`),
  })
  const audioReport = await AudioIntegrityGate.evaluateRawVeoAudio({
    rawVideoPath: result.outputPath,
    expectedLanguage: 'tr',
  })
  const { context, plan } = buildReviewInputs(job, snapshot, assets, brief, shotPlan)
  const videoReport = await new ChatGPTVideoReviewer().reviewSampledVideo(frames, plan, context, attemptNumber)
  return SimpleV5SevereReviewer.evaluateSevereErrorsOnly({ audioReport, videoReport, sampledFrames: frames.map(frame => frame.frame_path) })
}

export async function runSimpleV5HybridExecution(options: SimpleExecutionOptions): Promise<void> {
  const { supabase, gflowEngineUrl, job, accountId, attemptId, startTime, rawInput, assets } = options
  const snapshot = createBrandContextSnapshot({ ...rawInput, creative_engine_mode: 'SIMPLE_V5_HYBRID' })
  const { brief, shotPlan } = SimpleV5BriefNormalizer.normalize(snapshot)
  const geminiCompiled = GeminiVideoPromptCompiler.compile(brief, shotPlan)
  const flowCompiled = FlowVeoPromptCompiler.compile(brief, shotPlan)
  const geminiPrompt = providerPrompt(geminiCompiled)
  const flowPrompt = providerPrompt(flowCompiled)

  for (const exactPrompt of [geminiPrompt, flowPrompt]) {
    const factual = FactualIntegrityGate.validateVeoPrompt(exactPrompt, snapshot)
    if (!factual.passed) {
      throw new Error(`FACTUAL_INTEGRITY_FAIL: ${factual.violations.map(item => item.unverifiedValue).join(', ')}`)
    }
  }

  const requestedProvider = (job.requested_provider || job.metadata?.requested_provider || 'AUTO') as RequestedVideoProvider
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
    max_automatic_regenerations: 1,
  }
  await supabase.from('ai_media_jobs').update({
    creative_engine_mode: 'SIMPLE_V5_HYBRID',
    requested_provider: requestedProvider,
    metadata: { ...(job.metadata || {}), simple_v5_diagnostics: diagnostics },
  }).eq('id', job.id)

  await transitionJob(supabase, job.id, job.org_id, JobState.PREPARING_ENV, JobState.OPENING_PROJECT, 'Opening selected video provider session', { requested_provider: requestedProvider }, attemptId)
  await transitionJob(supabase, job.id, job.org_id, JobState.OPENING_PROJECT, JobState.ATTACHING_INGREDIENTS, `Preparing ${assets.length} locked canonical assets`, {}, attemptId)
  await transitionJob(supabase, job.id, job.org_id, JobState.ATTACHING_INGREDIENTS, JobState.INGREDIENTS_VERIFIED, `Verified ${assets.length} locked canonical asset references`, {}, attemptId)
  await transitionJob(supabase, job.id, job.org_id, JobState.INGREDIENTS_VERIFIED, JobState.GENERATING, 'Generating one SIMPLE_V5_HYBRID video from the common creative plan', {}, attemptId)

  const router = new VideoProviderRouter(
    new OmniStudioGeminiNativeVideoProvider(),
    new FlowVeoVideoProvider(new RealHttpGFlowProvider(gflowEngineUrl))
  )
  const request: VideoGenerationRequest = {
    jobId: job.id,
    attemptId,
    orgId: job.org_id,
    prompt: geminiPrompt,
    providerPrompts: { GEMINI_NATIVE_VIDEO: geminiPrompt, FLOW_VEO: flowPrompt },
    approvedDialogue: brief.spokenScript,
    aspectRatio: brief.aspectRatio,
    durationSeconds: brief.durationSeconds,
    accountId,
    assets,
  }

  let generated = await router.execute(requestedProvider, request)
  let review = await reviewOnce(generated, 1, job, snapshot, assets, brief, shotPlan)
  const providerAttemptHistory: Array<Record<string, unknown>> = [{
    ...generated,
    combinedReview: review,
  }]
  let automaticRegenerations = 0
  if (review.decision === 'REGENERATE') {
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
    review = await reviewOnce(generated, 2, job, snapshot, assets, brief, shotPlan)
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

  await transitionJob(supabase, job.id, job.org_id, JobState.GENERATING, JobState.POLLING_FLOW, `${generated.selectedProvider} generation completed; collecting provider output`, { selected_provider: generated.selectedProvider }, attemptId)
  await transitionJob(supabase, job.id, job.org_id, JobState.POLLING_FLOW, JobState.DOWNLOADING_MEDIA, 'Collecting generated MP4 from selected provider', {}, attemptId)
  await transitionJob(supabase, job.id, job.org_id, JobState.DOWNLOADING_MEDIA, JobState.MEDIA_DOWNLOADED, `Raw media saved with SHA-256 ${generated.rawOutputSha256}`, { output_path: generated.outputPath }, attemptId)

  const ffmpeg = new RealFFmpegAdapter()
  const logoCheck = CanonicalLogoGate.verifyLogo(snapshot)
  if (!logoCheck.passed || !logoCheck.logoPath || !logoCheck.logoSha256) {
    throw new Error(`CANONICAL_LOGO_GATE_FAIL: ${logoCheck.error || 'canonical logo unavailable'}`)
  }
  const rawProbe = await ffmpeg.runFfprobe(generated.outputPath)
  const logoPresentation = LogoPresentationGate.evaluateLogoPresentation({
    logoFilePath: logoCheck.logoPath,
    videoWidth: rawProbe.width,
    videoHeight: rawProbe.height,
    overlayWidthPx: 160,
    overlayMarginX: 32,
    overlayMarginY: 32,
  })
  const presentationNeedsReview = !logoPresentation.passed
  const finishedPath = generated.outputPath.replace(/\.mp4$/i, '_finished.mp4')
  await ffmpeg.applyDeterministicFinishing(
    generated.outputPath,
    presentationNeedsReview ? {} : { brandLogoPath: logoCheck.logoPath, brandLogoSha: logoCheck.logoSha256 },
    finishedPath
  )

  await transitionJob(supabase, job.id, job.org_id, JobState.MEDIA_DOWNLOADED, JobState.FFPROBE_INSPECTING, 'Inspecting final video streams with ffprobe', {}, attemptId)
  await transitionJob(supabase, job.id, job.org_id, JobState.FFPROBE_INSPECTING, JobState.SHA256_VERIFYING, 'Computing final output SHA-256', {}, attemptId)
  await transitionJob(supabase, job.id, job.org_id, JobState.SHA256_VERIFYING, JobState.VISUAL_QA_EVALUATING, 'Recording combined severe-error review and duration-aware QA frames', {}, attemptId)

  const qaDir = join('/shared/outputs', job.org_id, job.id, attemptId, 'qa')
  const validation = await validateOutput(finishedPath, brief.aspectRatio, 3, 15, qaDir)
  if (!validation.verified) {
    throw new Error(`Validation failed: ${validation.errors.join('; ')}`)
  }
  const finalSha = sha256File(finishedPath)
  if (finalSha !== validation.sha256) {
    throw new Error('FINAL_SHA_MISMATCH: independent final output hashes differ')
  }

  const approved = review.decision === 'PASS' && !presentationNeedsReview
  const { data: outRow } = await supabase.from('ai_media_outputs').insert({
    job_id: job.id,
    org_id: job.org_id,
    attempt_id: attemptId,
    file_path: finishedPath,
    sha256: finalSha,
    byte_size: statSync(finishedPath).size,
    duration_seconds: validation.ffprobe.duration,
    width: validation.ffprobe.width,
    height: validation.ffprobe.height,
    fps: validation.ffprobe.fps,
    vcodec: validation.ffprobe.vcodec,
    acodec: validation.ffprobe.acodec,
    visual_qa_score: null,
    visual_qa_report: { combined_review: review, logo_presentation: logoPresentation, provider: providerRecord, automatic_regenerations: automaticRegenerations },
    qa_frame_10_url: validation.qaFramePaths.frame10,
    qa_frame_50_url: validation.qaFramePaths.frame50,
    qa_frame_90_url: validation.qaFramePaths.frame90,
    verified: true,
    is_approved: approved,
    delivered_at: approved ? new Date().toISOString() : null,
  }).select('id').single()

  await supabase.from('ai_media_attempts').update({
    status: approved ? 'completed' : 'needs_review',
    finished_at: new Date().toISOString(),
  }).eq('id', attemptId)

  if (outRow?.id) {
    await supabase.from('creatives').upsert({
      id: job.id,
      org_id: job.org_id,
      title: job.title || 'Kampanya Videosu',
      format: 'video',
      status: approved ? 'ready' : 'review',
      source: 'ai',
      public_url: `/api/ai-media/outputs/${outRow.id}`,
      payload: { creative_engine_mode: 'SIMPLE_V5_HYBRID', selected_provider: generated.selectedProvider },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
  }

  const finalState = approved ? JobState.COMPLETED : JobState.NEEDS_REVIEW
  await transitionJob(
    supabase,
    job.id,
    job.org_id,
    JobState.VISUAL_QA_EVALUATING,
    finalState,
    approved
      ? `SIMPLE_V5_HYBRID completed in ${Math.round((Date.now() - startTime) / 1000)}s`
      : 'SIMPLE_V5_HYBRID output is technically valid but requires human review',
    { final_sha256: finalSha, selected_provider: generated.selectedProvider, review_decision: review.decision },
    attemptId
  )
}
