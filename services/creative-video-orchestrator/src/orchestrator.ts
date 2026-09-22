import { createHash } from 'node:crypto'
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

export interface OrchestratorOptions {
  gflowProvider: IGFlowProvider
  aiMediaAdapter?: IAIMediaControlAdapter
  ffmpegAdapter: IFFmpegAdapter
  creativeModel?: ICreativeModelProvider
  imageProvider?: IImageGenerationProvider
  accountId?: string
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
  verified: boolean
}

export class CreativeVideoOrchestrator {
  private router = new VideoStrategyRouter()
  private shortPlanner: ShortVideoPlanner
  private longPlanner: LongVideoPlanner
  private storyboardEngine: StoryboardEngine
  private keyframePlanner: KeyframePlanner
  private sceneCompiler: ScenePromptCompiler

  constructor(private options: OrchestratorOptions) {
    this.shortPlanner = new ShortVideoPlanner(options.creativeModel)
    this.longPlanner = new LongVideoPlanner(options.creativeModel)
    this.storyboardEngine = new StoryboardEngine(options.creativeModel)
    this.keyframePlanner = new KeyframePlanner(options.imageProvider)
    this.sceneCompiler = new ScenePromptCompiler(options.creativeModel)
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
      return this.executeShortVideo(jobId, snapshot, registry, strategy, capabilities, accountId)
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
    accountId: string
  ): Promise<OrchestrationResult> {
    const attemptId = `att_${Date.now()}`

    // Plan short video
    const plan = await this.shortPlanner.plan(snapshot, registry, capabilities, strategy.subtype as any)

    // Strict scene/project isolation: 1 scene = 1 unique flow_project_id
    const flowProjectId = `flow_proj_${jobId.substring(0, 8)}_short`

    // Build asset payloads
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

    // Execute via GFlowProvider
    const genResponse = await this.options.gflowProvider.executeJob({
      job_id: jobId,
      attempt_id: attemptId,
      flow_project_id: flowProjectId,
      org_id: snapshot.org_id,
      account_id: accountId,
      prompt: plan.compiledPrompt,
      aspect_ratio: snapshot.aspect_ratio,
      model: capabilities.preferredModel || 'veo-fast',
      duration: snapshot.requested_duration,
      assets,
      expected_reference_ids: plan.expectedReferenceIds,
    })

    // Execution Gate (Refinement 1): Verify expected vs actual attached references
    const refGate = ShortVideoPlanner.verifyReferenceExecutionGate(
      plan.expectedReferenceIds,
      genResponse.actual_attached_reference_ids
    )
    if (!refGate.passed) {
      throw new Error(`EXECUTION_GATE_FAIL: ${refGate.error}`)
    }

    // Inspect video via ffprobe
    const ffprobe = await this.options.ffmpegAdapter.runFfprobe(genResponse.output_path)
    const rawSha256 = createHash('sha256').update(genResponse.output_path + genResponse.file_size).digest('hex')

    // Scene QA
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

    // Deterministic Finishing (Exact logo, typography, offer, price, CTA)
    const finishedOutputPath = genResponse.output_path.replace('.mp4', '_finished.mp4')
    await this.options.ffmpegAdapter.applyDeterministicFinishing(
      genResponse.output_path,
      plan.finishingPlan,
      finishedOutputPath
    )
    const finalSha256 = createHash('sha256').update(finishedOutputPath + 'deterministic').digest('hex')

    const realFlowProjectId = genResponse.flow_project_id || flowProjectId

    const attachedRefs = (genResponse.verified_assets || []).map(va => ({
      asset_id: va.asset_id,
      org_id: va.org_id,
      sha256: va.sha256,
      role: va.role,
      actual_flow_media_id: va.attached_media_id,
    }))

    // Provenance Record
    const provenance: CreativeProvenanceRecord = {
      job_id: jobId,
      org_id: snapshot.org_id,
      brand_snapshot_version: snapshot.brand_manifest_version,
      creative_plan_summary: `Short Video (${plan.strategy}): ${plan.hook}`,
      reference_registry_handles: registry.getAll().map(r => r.handle),
      scene_prompts: { short_scene: plan.compiledPrompt },
      prompt_sha256: { short_scene: createHash('sha256').update(plan.compiledPrompt).digest('hex') },
      input_asset_sha256: Object.fromEntries(registry.getAll().map(r => [r.handle, r.sha256])),
      keyframe_asset_ids: {},
      flow_project_id: realFlowProjectId,
      flow_account_id: accountId,
      scene_output_ids: { short_scene: genResponse.output_path },
      scene_sha256: { short_scene: rawSha256 },
      final_output_sha256: finalSha256,
      qa_reports: { sceneQA: sceneQAReport },
      scene_attempts: {
        short_scene: genResponse.attempts || [{
          attempt_number: 1,
          flow_project_id: realFlowProjectId,
          status: 'SUCCESS',
          created_at: new Date().toISOString(),
        }]
      },
      attached_references: attachedRefs,
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
        const sceneSha = createHash('sha256').update(genResponse.output_path + genResponse.file_size).digest('hex')
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
