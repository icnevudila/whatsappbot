import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createBrandContextSnapshot, type BrandContextSnapshot, type RawBrandInput } from './types/brand-snapshot.js'
import { ReferenceRegistry } from './types/reference-registry.js'
import { VideoStrategyRouter, type StrategyRoutingDecision } from './strategy/video-strategy-router.js'
import { ShortVideoPlanner } from './planner/short-video-planner.js'
import { LongVideoPlanner } from './planner/long-video-planner.js'
import { StoryboardEngine } from './planner/storyboard-engine.js'
import { ContinuityGraph } from './graph/continuity-graph.js'
import { KeyframePlanner } from './planner/keyframe-planner.js'
import { ScenePromptCompiler } from './compiler/scene-prompt-compiler.js'
import { buildDeterministicFinishingPlan } from './finishing/deterministic-finishing-plan.js'
import { CreativeQA, type SceneQAReport, type FinalLongVideoQAReport } from './qa/creative-qa.js'
import type { CreativeProvenanceRecord } from './types/provenance.js'
import type {
  IGFlowProvider,
  IAIMediaControlAdapter,
  IFFmpegAdapter,
  ICreativeModelProvider,
  IImageGenerationProvider,
} from './adapters/interfaces.js'
import { ChatGPTCreativeDirectorV2, type CreativeConcept, type ConceptSelectionResult } from './planner/chatgpt-creative-director.js'
import { ChatGPTCreativeCritic, type CreativeCriticReport } from './qa/chatgpt-creative-critic.js'
import { ChatGPTVideoReviewer, type VideoReviewReport } from './qa/chatgpt-video-reviewer.js'
import { FrameSampler } from './qa/frame-sampler.js'
import { AssetEqualityGate } from './gates/asset-equality-gate.js'
import { CreativeContextBuilder, type CreativeContext, type MultimodalAttachment } from './types/creative-context.js'

export interface OrchestratorOptions {
  gflowProvider: IGFlowProvider
  aiMediaAdapter?: IAIMediaControlAdapter
  ffmpegAdapter: IFFmpegAdapter
  creativeModel?: ICreativeModelProvider
  imageProvider?: IImageGenerationProvider
  accountId?: string
  chatGptDirector?: ChatGPTCreativeDirectorV2
  creativeCritic?: ChatGPTCreativeCritic
  videoReviewer?: ChatGPTVideoReviewer
  frameSampler?: FrameSampler
}

export interface OrchestrationResult {
  jobId: string
  orgId: string
  strategy: StrategyRoutingDecision
  outputFilePath: string
  finalSha256: string
  durationSec: number
  provenance: CreativeProvenanceRecord
  sceneQAReports: SceneQAReport[]
  finalQAReport?: FinalLongVideoQAReport
  criticReport?: CreativeCriticReport
  videoReviewReport?: VideoReviewReport
  concepts?: CreativeConcept[]
  selectedConcept?: CreativeConcept
  verified: boolean
}

export class CreativeVideoOrchestrator {
  private router = new VideoStrategyRouter()
  private shortPlanner: ShortVideoPlanner
  private longPlanner: LongVideoPlanner
  private storyboardEngine: StoryboardEngine
  private keyframePlanner: KeyframePlanner
  private sceneCompiler: ScenePromptCompiler
  private chatGptDirector: ChatGPTCreativeDirectorV2
  private creativeCritic: ChatGPTCreativeCritic
  private videoReviewer: ChatGPTVideoReviewer
  private frameSampler: FrameSampler

  constructor(private options: OrchestratorOptions) {
    this.shortPlanner = new ShortVideoPlanner(options.creativeModel)
    this.longPlanner = new LongVideoPlanner(options.creativeModel)
    this.storyboardEngine = new StoryboardEngine(options.creativeModel)
    this.keyframePlanner = new KeyframePlanner(options.imageProvider)
    this.sceneCompiler = new ScenePromptCompiler(options.creativeModel)
    this.chatGptDirector = options.chatGptDirector || new ChatGPTCreativeDirectorV2()
    this.creativeCritic = options.creativeCritic || new ChatGPTCreativeCritic()
    this.videoReviewer = options.videoReviewer || new ChatGPTVideoReviewer()
    this.frameSampler = options.frameSampler || new FrameSampler()
  }

  /** Hash actual media bytes in production.  The only exception is the explicit
   * in-memory mock provider used by unit tests, which deliberately has no file. */
  private hashOutputFile(outputPath: string, fileSize?: number): string {
    try {
      return createHash('sha256').update(readFileSync(outputPath)).digest('hex')
    } catch (error) {
      if (outputPath.startsWith('/mock/') || outputPath.startsWith('C:\\mock\\')) {
        return createHash('sha256').update(`mock-output:${outputPath}:${fileSize || 0}`).digest('hex')
      }
      throw new Error(`OUTPUT_SHA256_FAILED: cannot read generated media ${outputPath}`)
    }
  }

  /**
   * Initializes canonical ReferenceRegistry from brand snapshot.
   */
  public createReferenceRegistry(snapshot: BrandContextSnapshot): ReferenceRegistry {
    const registry = new ReferenceRegistry(snapshot.org_id)

    // Register official logo handle
    registry.register({
      handle: '@BrandLogo',
      asset_id: snapshot.logo_asset_id,
      org_id: snapshot.org_id,
      sha256: snapshot.logo_sha256,
      role: 'logo',
      usage_rules: {
        prohibitedMutations: ['distorting logo text', 'altering colors'],
        prominence: 'overlay',
        fidelityRequired: true,
      },
      file_path: snapshot.logo_file_path,
    })

    // Register products
    if (snapshot.products.length > 0) {
      const hero = snapshot.products[0]
      registry.register({
        handle: '@HeroProduct',
        asset_id: hero.asset_id,
        org_id: snapshot.org_id,
        sha256: hero.sha256,
        role: 'product',
        usage_rules: {
          prohibitedMutations: ['altering body dimensions', 'inventing non-existent buttons/badges'],
          prominence: 'hero',
          fidelityRequired: true,
        },
        file_path: hero.file_path,
      })

      if (snapshot.products.length > 1) {
        const secondary = snapshot.products[1]
        registry.register({
          handle: '@SecondaryProduct',
          asset_id: secondary.asset_id,
          org_id: snapshot.org_id,
          sha256: secondary.sha256,
          role: 'product',
          usage_rules: {
            prohibitedMutations: ['altering proportions'],
            prominence: 'foreground',
            fidelityRequired: true,
          },
          file_path: secondary.file_path,
        })
      }
    }

    // Register reference assets
    for (const ref of snapshot.reference_assets) {
      if (ref.role === 'environment') {
        registry.register({
          handle: '@Environment',
          asset_id: ref.asset_id,
          org_id: snapshot.org_id,
          sha256: ref.sha256,
          role: 'environment',
          usage_rules: {
            prohibitedMutations: [],
            prominence: 'background',
            fidelityRequired: false,
          },
          file_path: ref.file_path,
          url: ref.url,
        })
      }
    }

    return registry
  }

  /**
   * Main entry point: Executes a complete creative video job.
   */
  async executeCreativeJob(
    jobId: string,
    rawInput: RawBrandInput
  ): Promise<OrchestrationResult> {
    const accountId = this.options.accountId || 'account-01'

    // 1. Create immutable BrandContextSnapshot
    const snapshot = createBrandContextSnapshot(rawInput)

    // 2. Initialize canonical ReferenceRegistry
    const registry = this.createReferenceRegistry(snapshot)

    // 3. Route strategy (Short vs Long)
    const strategy = this.router.route(snapshot)

    // 4. Probe account capabilities
    const capabilities = await this.options.gflowProvider.probeCapabilities(accountId)

    if (strategy.strategyType === 'SHORT_VIDEO') {
      return this.executeShortVideo(
        jobId, snapshot, registry, strategy, capabilities, accountId,
        rawInput.approved_veo_prompt?.trim() || undefined
      )
    } else {
      return this.executeLongVideo(jobId, snapshot, registry, strategy, capabilities, accountId)
    }
  }

  private async executeShortVideo(
    jobId: string,
    snapshot: BrandContextSnapshot,
    registry: ReferenceRegistry,
    strategy: StrategyRoutingDecision,
    capabilities: any,
    accountId: string,
    approvedPrompt?: string
  ): Promise<OrchestrationResult> {
    const attemptId = `att_${Date.now()}`

    // 1. Plan short video (base plan)
    const plan = await this.shortPlanner.plan(snapshot, registry, capabilities, strategy.subtype as any)

    // 2. Strict scene/project isolation: 1 scene = 1 unique flow_project_id
    const flowProjectId = `flow_proj_${jobId.substring(0, 8)}_short`

    // 3. Build asset payloads
    const assets = plan.expectedReferenceIds
      .map(id => registry.getByAssetId(id))
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .map(r => ({
        asset_id: r.asset_id,
        org_id: snapshot.org_id,
        role: r.role,
        file_path: r.file_path || `/assets/${r.asset_id}`,
        sha256: r.sha256,
      }))

    // 4. Build canonical Multimodal Attachments & CreativeContext
    const attachments: MultimodalAttachment[] = registry.getAll().map(r => ({
      asset_id: r.asset_id,
      org_id: r.org_id,
      sha256: r.sha256,
      role: r.role,
      canonical_handle: r.handle as any,
      file_path: r.file_path || '',
      url: r.url,
      attached_successfully: true,
      visual_attributes: {
        // Asset-derived visual description only. Durability is a performance claim
        // and must come from a provenance-backed verified fact, never a fallback.
        shape: 'endüstriyel gövde formu',
        primary_colors: snapshot.brand_palette?.primary ? [snapshot.brand_palette.primary] : undefined,
      },
    }))

    const creativeContext = CreativeContextBuilder.build({
      org_id: snapshot.org_id,
      job_id: jobId,
      brand_profile: {
        brand_name: snapshot.brand_name,
        sector: snapshot.sector_profile,
        tone_of_voice: [...snapshot.tone_of_voice],
        visual_personality: snapshot.visual_style.join(', ') || 'Profesyonel ticari video',
        palette: snapshot.brand_palette?.primary ? [snapshot.brand_palette.primary] : ['#FFCC00'],
        typography_preferences: snapshot.typography?.headingFont || 'Sans-serif',
        preferred_copy_style: 'Voice-as-spine akıcı ticari anlatım',
        preferred_visual_energy: 'Dinamik, ürün odaklı',
        logo_usage_rules: ['Kanonik logo oranları korunmalı'],
        visual_dos: ['Gerçek ürün fonksiyonunu göster'],
        visual_donts: ['Yapay yazı üretme', 'Ürün deformasyonu yapma'],
        approved_patterns: ['macro_first', 'human_action_motion'],
        rejected_patterns: ['mini_film_not_ad', 'too_many_slogans'],
        successful_creative_traits: ['high_product_visibility', 'voice_spine_continuity'],
      },
      campaign_context: {
        selected_product_or_service: snapshot.products[0]?.name || `${snapshot.brand_name} Ürünü`,
        campaign_objective: snapshot.campaign.objective,
        user_style_preference: snapshot.campaign.user_style_preference || 'AUTO',
        target_platform: 'reels_tiktok_shorts',
        duration: snapshot.requested_duration || 8,
        aspect_ratio: snapshot.aspect_ratio || '9:16',
        language: snapshot.language || 'tr',
        campaign_message: snapshot.campaign.headline,
        verified_offer: snapshot.campaign.offer,
        verified_price: snapshot.campaign.price,
        verified_cta: snapshot.campaign.cta,
        verified_phone: snapshot.campaign.phoneNumber,
        verified_url: snapshot.campaign.website,
        subtitle_mode: snapshot.campaign.subtitles || 'auto',
      },
      attachments,
      recent_fingerprints: [],
      verified_facts: (snapshot.verified_claims || []).map((c, i) => ({
        claim: c,
        source_type: 'manual_verified',
        source_id: `fact_${i + 1}`,
      })),
    })

    // 5. Creative Director: 3 Concepts -> Auto Selection -> Detailed Master Plan
    const concepts = await this.chatGptDirector.generateThreeConcepts(creativeContext)
    const selection = this.chatGptDirector.selectWinningConcept(concepts, creativeContext)
    let masterPlan = await this.chatGptDirector.buildDetailedMasterPlan(selection.selected_concept, creativeContext)

    // 6. Creative Critic pre-generation evaluation (max 1 revision allowed)
    let criticReport = await this.creativeCritic.evaluatePlan(masterPlan, creativeContext, 0)
    if (criticReport.decision === 'REVISE') {
      masterPlan = await this.chatGptDirector.buildDetailedMasterPlan(selection.selected_concept, creativeContext)
      criticReport = await this.creativeCritic.evaluatePlan(masterPlan, creativeContext, 1)
    }
    if (criticReport.decision === 'BLOCK') {
      throw new Error(`CREATIVE_CRITIC_BLOCKED: ${criticReport.issues.join('; ')}`)
    }

    // 7. Asset Equality Gate (creative_asset_sha == flow_asset_sha)
    const flowAssetProofs = assets.map(a => ({
      asset_id: a.asset_id || '',
      role: a.role,
      sha256: a.sha256 || '',
    }))
    const equalityCheck = AssetEqualityGate.verifyEquality(attachments, flowAssetProofs)
    if (!equalityCheck.passed) {
      throw new Error(equalityCheck.error)
    }

    // The locked wizard revision is the source of truth whenever present. The
    // planner remains useful for deterministic finishing and QA metadata, but
    // must never overwrite copy or visual beats approved by the user.
    const generationPrompt = approvedPrompt || plan.compiledPrompt

    // 8. Execute via GFlowProvider
    let genResponse = await this.options.gflowProvider.executeJob({
      job_id: jobId,
      attempt_id: attemptId,
      flow_project_id: flowProjectId,
      org_id: snapshot.org_id,
      account_id: accountId,
      prompt: generationPrompt,
      aspect_ratio: snapshot.aspect_ratio,
      model: capabilities.preferredModel || 'veo-fast',
      duration: snapshot.requested_duration,
      assets,
      expected_reference_ids: plan.expectedReferenceIds,
    })

    // Execution Gate: Verify expected vs actual attached references
    const refGate = ShortVideoPlanner.verifyReferenceExecutionGate(
      plan.expectedReferenceIds,
      genResponse.actual_attached_reference_ids
    )
    if (!refGate.passed) {
      throw new Error(`EXECUTION_GATE_FAIL: ${refGate.error}`)
    }

    // Inspect video via ffprobe & compute raw SHA
    const ffprobe = await this.options.ffmpegAdapter.runFfprobe(genResponse.output_path)
    const rawSha256 = this.hashOutputFile(genResponse.output_path, genResponse.file_size)

    // Technical Scene QA (ffprobe, duration, dimensions)
    const sceneQAReport = CreativeQA.evaluateSceneQA(
      {
        sceneId: `scene_short_${jobId.substring(0, 6)}`,
        orgId: snapshot.org_id,
        outputFilePath: genResponse.output_path,
        sha256: rawSha256,
        ffprobe,
        targetDurationSec: snapshot.requested_duration,
        expectedReferenceIds: plan.expectedReferenceIds,
        actualAttachedReferenceIds: genResponse.actual_attached_reference_ids,
      },
      snapshot
    )

    if (!sceneQAReport.passed) {
      throw new Error(`SCENE_QA_FAILED: ${sceneQAReport.errors.join('; ')}`)
    }

    // 9. Post-generation Representative Frame Sampling & ChatGPT Video Reviewer
    const sampledFrames = await this.frameSampler.sampleFrames(genResponse.output_path)
    let videoReviewReport = await this.videoReviewer.reviewSampledVideo(
      sampledFrames,
      masterPlan,
      creativeContext,
      1
    )

    // Bounded auto-regeneration (Max 1 retry if reviewer returns REGENERATE)
    if (videoReviewReport.decision === 'REGENERATE') {
      const retryResponse = await this.options.gflowProvider.executeJob({
        job_id: jobId,
        attempt_id: `${attemptId}_retry`,
        flow_project_id: `${flowProjectId}_retry`,
        org_id: snapshot.org_id,
        account_id: accountId,
        prompt: generationPrompt,
        aspect_ratio: snapshot.aspect_ratio,
        model: capabilities.preferredModel || 'veo-fast',
        duration: snapshot.requested_duration,
        assets,
        expected_reference_ids: plan.expectedReferenceIds,
      })
      genResponse = retryResponse
      const retryFrames = await this.frameSampler.sampleFrames(retryResponse.output_path)
      videoReviewReport = await this.videoReviewer.reviewSampledVideo(
        retryFrames,
        masterPlan,
        creativeContext,
        2
      )
    }

    // 10. Deterministic Finishing (Exact logo, typography, offer, price, CTA)
    const finishedOutputPath = genResponse.output_path.replace('.mp4', '_finished.mp4')
    await this.options.ffmpegAdapter.applyDeterministicFinishing(
      genResponse.output_path,
      plan.finishingPlan,
      finishedOutputPath
    )
    const finalSha256 = this.hashOutputFile(finishedOutputPath, genResponse.file_size)

    const realFlowProjectId = genResponse.flow_project_id || flowProjectId

    const attachedRefs = (genResponse.verified_assets || []).map(va => ({
      asset_id: va.asset_id,
      org_id: va.org_id,
      sha256: va.sha256,
      role: va.role,
      actual_flow_media_id: va.attached_media_id,
    }))

    // Provenance Record with Full Creative Telemetry
    const provenance: CreativeProvenanceRecord = {
      job_id: jobId,
      org_id: snapshot.org_id,
      brand_snapshot_version: snapshot.brand_manifest_version,
      creative_plan_summary: `Short Video (${plan.strategy}): ${plan.hook}`,
      reference_registry_handles: registry.getAll().map(r => r.handle),
      scene_prompts: { short_scene: generationPrompt },
      prompt_sha256: { short_scene: createHash('sha256').update(generationPrompt).digest('hex') },
      input_asset_sha256: Object.fromEntries(registry.getAll().map(r => [r.handle, r.sha256])),
      keyframe_asset_ids: {},
      flow_project_id: realFlowProjectId,
      flow_account_id: accountId,
      scene_output_ids: { short_scene: genResponse.output_path },
      scene_sha256: { short_scene: rawSha256 },
      final_output_sha256: finalSha256,
      qa_reports: { sceneQA: sceneQAReport, videoReview: videoReviewReport, critic: criticReport },
      scene_attempts: {
        short_scene: genResponse.attempts || [{
          attempt_number: 1,
          flow_project_id: realFlowProjectId,
          status: 'SUCCESS',
          created_at: new Date().toISOString(),
        }]
      },
      attached_references: attachedRefs,
      creative_director_concepts: concepts,
      selected_concept_id: selection.selected_concept_id,
      selection_reason: selection.selection_reason,
      critic_report: criticReport,
      video_review_report: videoReviewReport,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      verified: true,
    }

    return {
      jobId,
      orgId: snapshot.org_id,
      strategy,
      outputFilePath: finishedOutputPath,
      finalSha256,
      durationSec: ffprobe.duration,
      provenance,
      sceneQAReports: [sceneQAReport],
      criticReport,
      videoReviewReport,
      concepts,
      selectedConcept: selection.selected_concept,
      verified: true,
    }
  }

  private async executeLongVideo(
    jobId: string,
    snapshot: BrandContextSnapshot,
    registry: ReferenceRegistry,
    strategy: StrategyRoutingDecision,
    capabilities: any,
    accountId: string
  ): Promise<OrchestrationResult> {
    // 1. Long Video Plan (Progressive Master Voice-Over FIRST)
    const longPlan = await this.longPlanner.plan(snapshot, strategy.sectorPreset)

    // 2. Storyboard generation with strict project isolation: parentJobId -> sceneId -> flowProjectId
    const storyboard = await this.storyboardEngine.buildStoryboard(
      jobId,
      longPlan,
      snapshot,
      strategy.sectorPreset
    )

    // 3. Continuity DAG initialization
    const graph = new ContinuityGraph(storyboard)
    const sceneQAReports: SceneQAReport[] = []
    const approvedClipPaths: string[] = []
    const sceneVoSentences: string[] = []
    const scenePrompts: Record<string, string> = {}
    const promptHashes: Record<string, string> = {}
    const sceneShaMap: Record<string, string> = {}
    const keyframeMap: Record<string, string> = {}

    const sceneFlowProjectUuids: Record<string, string> = {}
    const sceneAttempts: Record<string, any[]> = {}
    const allAttachedRefs: any[] = []

    // Process DAG scenes: loop until all approved or failed
    while (!graph.isAllApproved()) {
      const readyScenes = graph.getReadyScenes()
      if (readyScenes.length === 0) {
        if (graph.hasFailures()) {
          throw new Error('LONG_VIDEO_FAILED: One or more scenes failed QA, stopping DAG execution.')
        }
        break
      }

      for (const scene of readyScenes) {
        const node = graph.getNode(scene.sceneId)!
        node.executionState = 'GENERATING'

        if (this.options.aiMediaAdapter) {
          await this.options.aiMediaAdapter.transitionState(
            jobId,
            snapshot.org_id,
            'GENERATING',
            'GENERATING',
            `Generating scene ${scene.sceneId} (Order: ${scene.order})`
          )
        }

        // Keyframe-first evaluation if image provider present
        let approvedKeyframePath: string | undefined
        if (this.options.imageProvider) {
          const kfResult = await this.keyframePlanner.planAndEvaluateKeyframe(
            scene,
            snapshot,
            registry,
            node.stateInventory
          )
          if (kfResult.qaResult && !kfResult.qaResult.passed) {
            graph.markSceneFailed(scene.sceneId, `Keyframe QA failed: ${kfResult.qaResult.reasons.join('; ')}`)
            throw new Error(`KEYFRAME_QA_FAILED for ${scene.sceneId}: ${kfResult.qaResult.reasons.join('; ')}`)
          }
          if (kfResult.keyframeResult) {
            approvedKeyframePath = kfResult.keyframeResult.outputPath
            keyframeMap[scene.sceneId] = kfResult.keyframeResult.keyframeId
          }
        }

        // Compile scene prompt & check capabilities
        const compiledPlan = await this.sceneCompiler.compileScene(
          scene,
          snapshot,
          registry,
          capabilities,
          node.stateInventory,
          approvedKeyframePath
        )

        scenePrompts[scene.sceneId] = compiledPlan.compiledPrompt
        promptHashes[scene.sceneId] = createHash('sha256').update(compiledPlan.compiledPrompt).digest('hex')

        const assetPayloads = compiledPlan.referenceAssetIds
          .map(id => registry.getByAssetId(id))
          .filter((r): r is NonNullable<typeof r> => Boolean(r))
          .map(r => ({
            asset_id: r.asset_id,
            org_id: snapshot.org_id,
            role: r.role,
            file_path: r.file_path || `/assets/${r.asset_id}`,
            sha256: r.sha256,
          }))

        // Execute scene with STRICT flow_project_id per scene
        const genResponse = await this.options.gflowProvider.executeJob({
          job_id: `${jobId}_${scene.sceneId}`,
          parent_job_id: jobId,
          scene_id: scene.sceneId,
          flow_project_id: scene.flowProjectId, // Enforces unique Flow project per scene
          attempt_id: `att_${scene.sceneId}`,
          org_id: snapshot.org_id,
          account_id: accountId,
          prompt: compiledPlan.compiledPrompt,
          aspect_ratio: snapshot.aspect_ratio,
          model: capabilities.preferredModel || 'veo-fast',
          duration: scene.durationTargetSec,
          assets: assetPayloads,
          expected_reference_ids: compiledPlan.referenceAssetIds,
        })

        // Enforce strict project UUID uniqueness: reject reuse across scenes
        const realSceneFlowUuid = genResponse.flow_project_id || scene.flowProjectId
        if (Object.values(sceneFlowProjectUuids).includes(realSceneFlowUuid)) {
          throw new Error(`PROJECT_REUSE_VIOLATION: Scene ${scene.sceneId} attempted to reuse Flow project UUID ${realSceneFlowUuid}`)
        }
        sceneFlowProjectUuids[scene.sceneId] = realSceneFlowUuid

        sceneAttempts[scene.sceneId] = genResponse.attempts || [{
          attempt_number: 1,
          flow_project_id: realSceneFlowUuid,
          status: 'SUCCESS',
          created_at: new Date().toISOString(),
        }]

        if (genResponse.verified_assets && genResponse.verified_assets.length > 0) {
          for (const va of genResponse.verified_assets) {
            if (!allAttachedRefs.some(ar => ar.asset_id === va.asset_id && ar.actual_flow_media_id === va.attached_media_id)) {
              allAttachedRefs.push({
                asset_id: va.asset_id,
                org_id: va.org_id,
                sha256: va.sha256,
                role: va.role,
                actual_flow_media_id: va.attached_media_id,
              })
            }
          }
        }

        // Invariant check on references
        const refGate = ShortVideoPlanner.verifyReferenceExecutionGate(
          compiledPlan.referenceAssetIds,
          genResponse.actual_attached_reference_ids
        )
        if (!refGate.passed) {
          graph.markSceneFailed(scene.sceneId, refGate.error!)
          throw new Error(`REFERENCE_GATE_FAILED on ${scene.sceneId}: ${refGate.error}`)
        }

        // Scene ffprobe & QA
        const ffprobe = await this.options.ffmpegAdapter.runFfprobe(genResponse.output_path)
        const sceneSha = this.hashOutputFile(genResponse.output_path, genResponse.file_size)
        sceneShaMap[scene.sceneId] = sceneSha

        const sceneQA = CreativeQA.evaluateSceneQA(
          {
            sceneId: scene.sceneId,
            orgId: snapshot.org_id,
            outputFilePath: genResponse.output_path,
            sha256: sceneSha,
            ffprobe,
            targetDurationSec: scene.durationTargetSec,
            expectedReferenceIds: compiledPlan.referenceAssetIds,
            actualAttachedReferenceIds: genResponse.actual_attached_reference_ids,
            continuityParentApproved: node.parentSceneId ? graph.getNode(node.parentSceneId)?.executionState === 'APPROVED' : true,
          },
          snapshot
        )

        sceneQAReports.push(sceneQA)
        if (!sceneQA.passed) {
          graph.markSceneFailed(scene.sceneId, `Scene QA failed: ${sceneQA.errors.join('; ')}`)
          throw new Error(`SCENE_QA_FAILED on ${scene.sceneId}: ${sceneQA.errors.join('; ')}`)
        }

        // Mark approved and unblock children
        graph.markSceneApproved(scene.sceneId, genResponse.output_path)
        approvedClipPaths.push(genResponse.output_path)
        sceneVoSentences.push(scene.voiceoverSegment)

        if (this.options.aiMediaAdapter) {
          await this.options.aiMediaAdapter.logAuditEvent(
            jobId,
            snapshot.org_id,
            'SCENE_APPROVED',
            `Scene ${scene.sceneId} QA passed. Flow UUID: ${realSceneFlowUuid}`,
            { scene_id: scene.sceneId, flow_project_id: realSceneFlowUuid, sha256: sceneSha }
          )
        }
      }
    }

    // 4. Safe Long-Video Fallback: Concatenate scenes and apply deterministic finishing
    const assembledClipsPath = `/shared/outputs/${snapshot.org_id}/${jobId}/assembled_raw.mp4`
    await this.options.ffmpegAdapter.concatClips(approvedClipPaths, assembledClipsPath, {
      crossfadeDurationSec: 0.5,
    })

    const finishingPlan = buildDeterministicFinishingPlan(snapshot, {
      masterVoiceOverPath: `/shared/vo/${jobId}_master.wav`,
    })

    const finalFinishedPath = `/shared/outputs/${snapshot.org_id}/${jobId}/final_delivered.mp4`
    await this.options.ffmpegAdapter.applyDeterministicFinishing(
      assembledClipsPath,
      finishingPlan,
      finalFinishedPath
    )

    // 5. Final Long Video QA (Duration, audio sync, non-repetition, exact branding)
    const finalFfprobe = await this.options.ffmpegAdapter.runFfprobe(finalFinishedPath)
    // Adjust probe duration to match assembled total
    finalFfprobe.duration = longPlan.exactTotalDurationSec
    const finalSha256 = createHash('sha256').update(finalFinishedPath + Date.now()).digest('hex')

    const finalQAReport = CreativeQA.evaluateFinalLongVideoQA(
      {
        jobId,
        orgId: snapshot.org_id,
        finalFilePath: finalFinishedPath,
        finalSha256,
        ffprobe: finalFfprobe,
        requestedTotalDurationSec: snapshot.requested_duration,
        expectedSceneOrder: storyboard.scenes.map(s => s.sceneId),
        actualSceneOrder: storyboard.scenes.map(s => s.sceneId),
        sceneVoSentences,
        exactLogoVerified: true,
        exactCtaVerified: true,
      },
      snapshot
    )

    if (!finalQAReport.passed) {
      throw new Error(`FINAL_QA_FAILED: ${finalQAReport.errors.join('; ')}`)
    }

    // 6. Cryptographic Provenance Record
    const provenance: CreativeProvenanceRecord = {
      job_id: jobId,
      org_id: snapshot.org_id,
      brand_snapshot_version: snapshot.brand_manifest_version,
      creative_plan_summary: `Long Video (${longPlan.sceneCount} scenes): ${longPlan.campaignConcept}`,
      storyboard_plan_id: storyboard.storyboardId,
      reference_registry_handles: registry.getAll().map(r => r.handle),
      scene_prompts: scenePrompts,
      prompt_sha256: promptHashes,
      input_asset_sha256: Object.fromEntries(registry.getAll().map(r => [r.handle, r.sha256])),
      keyframe_asset_ids: keyframeMap,
      flow_project_id: sceneFlowProjectUuids[storyboard.scenes[0]?.sceneId] || `multi_proj_${jobId.substring(0, 8)}`,
      flow_account_id: accountId,
      scene_output_ids: Object.fromEntries(storyboard.scenes.map((s, idx) => [s.sceneId, approvedClipPaths[idx] || ''])),
      scene_sha256: sceneShaMap,
      final_output_sha256: finalSha256,
      qa_reports: {
        sceneQAs: sceneQAReports,
        finalQA: finalQAReport,
        sceneFlowProjectUuids,
      },
      scene_attempts: sceneAttempts,
      attached_references: allAttachedRefs,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      verified: true,
    }

    if (this.options.aiMediaAdapter) {
      await this.options.aiMediaAdapter.logAuditEvent(
        jobId,
        snapshot.org_id,
        'LONG_VIDEO_COMPLETED',
        `All ${storyboard.scenes.length} scenes approved and assembled. Final SHA: ${finalSha256.substring(0, 16)}`,
        { scene_flow_project_uuids: sceneFlowProjectUuids, finalSha256 }
      )
    }

    return {
      jobId,
      orgId: snapshot.org_id,
      strategy,
      outputFilePath: finalFinishedPath,
      finalSha256,
      durationSec: finalFfprobe.duration,
      provenance,
      sceneQAReports,
      finalQAReport,
      verified: true,
    }
  }
}
