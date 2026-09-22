import type {
  IGFlowProvider,
  IAIMediaControlAdapter,
  IFFmpegAdapter,
  ICreativeModelProvider,
  IImageGenerationProvider,
  GenerateRequest,
  GenerateResponse,
  FlowAccountCapabilities,
  FfprobeMetadata,
  ClipNormalizeOptions,
  ConcatOptions,
  CreativePlanDraft,
  MasterVoiceOverDraft,
  StoryboardDraft,
  StoryboardDraftScene,
  ImageReferencePayload,
  KeyframeGenOptions,
  KeyframeGenResult,
} from './interfaces.js'
import type { BrandContextSnapshot } from '../types/brand-snapshot.js'
import type { ReferenceRegistry } from '../types/reference-registry.js'
import { createHash } from 'node:crypto'

export class MockGFlowProvider implements IGFlowProvider {
  public executedJobs: GenerateRequest[] = []
  public simulatedDuration = 8.0

  constructor(
    public capabilities: FlowAccountCapabilities = {
      accountId: 'account-mock-01',
      supportsR2V: true,
      maxReferenceImages: 2,
      supportsI2V: true,
      supportsExtend: false,
      supportsMovieScene: false,
      supportsChain: false,
      supportsStartEndFrames: false,
      preferredModel: 'veo-fast',
    }
  ) {}

  async executeJob(req: GenerateRequest): Promise<GenerateResponse> {
    this.executedJobs.push(req)
    const hash = createHash('sha256').update(req.prompt + req.flow_project_id).digest('hex')

    // Simulate attached references matching what was requested
    const actualAttached = [...req.expected_reference_ids]

    return {
      job_id: req.job_id,
      attempt_id: req.attempt_id,
      account_id: req.account_id,
      flow_project_id: req.flow_project_id,
      output_path: `/mock/outputs/${req.org_id}/${req.job_id}/${req.job_id}.mp4`,
      file_size: 5242880,
      elapsed_seconds: 12.4,
      expected_ingredient_count: req.expected_reference_ids.length,
      actual_ingredient_count: actualAttached.length,
      actual_attached_reference_ids: actualAttached,
      verified: true,
    }
  }

  async probeCapabilities(accountId: string): Promise<FlowAccountCapabilities> {
    return { ...this.capabilities, accountId }
  }
}

export class MockAIMediaControlAdapter implements IAIMediaControlAdapter {
  public stateTransitions: Array<{ jobId: string; from: string; to: string; message: string }> = []
  public auditEvents: Array<{ jobId: string; eventType: string; message: string }> = []
  public metadataUpdates: Array<{ jobId: string; metadata: Record<string, unknown> }> = []

  async transitionState(
    jobId: string,
    orgId: string,
    fromState: string,
    toState: string,
    message: string,
    payload?: Record<string, unknown>
  ): Promise<void> {
    this.stateTransitions.push({ jobId, from: fromState, to: toState, message })
  }

  async logAuditEvent(
    jobId: string,
    orgId: string,
    eventType: string,
    message: string,
    payload?: Record<string, unknown>
  ): Promise<void> {
    this.auditEvents.push({ jobId, eventType, message })
  }

  async updateJobMetadata(jobId: string, metadata: Record<string, unknown>): Promise<void> {
    this.metadataUpdates.push({ jobId, metadata })
  }
}

export class MockFFmpegAdapter implements IFFmpegAdapter {
  public simulatedDuration = 8.0

  async runFfprobe(filePath: string): Promise<FfprobeMetadata> {
    return {
      duration: this.simulatedDuration,
      width: 1080,
      height: 1920,
      fps: 24,
      vcodec: 'h264',
      acodec: 'aac',
      bitrate: 4500000,
    }
  }

  async normalizeClip(inputPath: string, outputPath: string, options: ClipNormalizeOptions): Promise<string> {
    return outputPath
  }

  async concatClips(clipPaths: string[], outputPath: string, options?: ConcatOptions): Promise<string> {
    return outputPath
  }

  async applyDeterministicFinishing(inputVideoPath: string, finishingSpec: any, outputPath: string): Promise<string> {
    return outputPath
  }
}

export class MockCreativeModelProvider implements ICreativeModelProvider {
  async generateCreativePlan(snapshot: BrandContextSnapshot, sectorPreset: any): Promise<CreativePlanDraft> {
    return {
      hook: `Dynamic opening capturing authentic ${snapshot.sector_profile} performance.`,
      productHeroAction: `Hero demonstration of ${snapshot.brand_name} precision.`,
      environment: `Authentic commercial setting.`,
      cameraLanguage: `Cinematic steady tracking with macro product focus.`,
      lightingStyle: `Crisp natural illumination with golden highlights.`,
      motionRhythm: `Confident, deliberate, and high-impact.`,
      audioDirection: `Upbeat modern ambient with clear message payoff.`,
      closingCTAIntent: `${snapshot.campaign.cta}`,
    }
  }

  async generateMasterVoiceOver(
    snapshot: BrandContextSnapshot,
    storyArc: string[],
    durationSeconds: number
  ): Promise<MasterVoiceOverDraft> {
    const sceneCount = Math.max(3, Math.min(8, Math.round(durationSeconds / 8)))
    const segDur = durationSeconds / sceneCount

    const scenes = [
      {
        sceneOrder: 1,
        purpose: 'Hook',
        durationTargetSec: segDur,
        voiceoverSegment: `${snapshot.brand_name} ile tanışın, her zorlu görevde yanınızda.`,
      },
      {
        sceneOrder: 2,
        purpose: 'Product Introduction',
        durationTargetSec: segDur,
        voiceoverSegment: `Özenle geliştirilen formülü ve üstün dayanıklılığıyla fark yaratır.`,
      },
      {
        sceneOrder: 3,
        purpose: 'Usage & Benefit',
        durationTargetSec: segDur,
        voiceoverSegment: `Sahada en yüksek verimi sağlayarak işinizi kolaylaştırır.`,
      },
      {
        sceneOrder: 4,
        purpose: 'Proof & Payoff',
        durationTargetSec: segDur,
        voiceoverSegment: `Gerçek kalite, uzun ömürlü sonuçlarla kendini kanıtlar.`,
      },
      {
        sceneOrder: 5,
        purpose: 'Brand Closure & CTA',
        durationTargetSec: segDur,
        voiceoverSegment: `Hemen arayın ve avantajlı fiyatlardan yararlanın. ${snapshot.campaign.cta}.`,
      },
    ].slice(0, sceneCount)

    return {
      fullScript: scenes.map(s => s.voiceoverSegment).join(' '),
      scenes,
    }
  }

  async generateStoryboard(
    snapshot: BrandContextSnapshot,
    masterVO: MasterVoiceOverDraft,
    sectorPreset: any
  ): Promise<StoryboardDraft> {
    return {
      conceptSummary: `Storyboard for ${snapshot.brand_name}`,
      scenes: masterVO.scenes.map((s, idx) => ({
        sceneId: `scene_${idx + 1}`,
        order: idx + 1,
        durationTarget: s.durationTargetSec,
        purpose: s.purpose,
        visualDescription: `Cinematic visualization for ${s.purpose}`,
        voiceoverSegment: s.voiceoverSegment,
        environment: 'commercial setting',
        camera: 'dolly push-in',
        lighting: 'cinematic key',
        motion: 'fluid',
        audio: s.voiceoverSegment,
        negativeConstraints: ['no artifacts'],
        isRoot: idx === 0,
        continuityParentSceneId: idx === 0 ? undefined : `scene_${idx}`,
      })),
    }
  }

  async compileScenePrompt(
    scene: StoryboardDraftScene,
    snapshot: BrandContextSnapshot,
    registry: ReferenceRegistry,
    continuityState?: any
  ): Promise<string> {
    return `Cinematic commercial for ${snapshot.brand_name} | ${scene.visualDescription} | ${scene.camera}`
  }
}

export class MockImageGenerationProvider implements IImageGenerationProvider {
  async generateKeyframe(
    prompt: string,
    references: ImageReferencePayload[],
    options: KeyframeGenOptions
  ): Promise<KeyframeGenResult> {
    const hash = createHash('sha256').update(prompt).digest('hex')
    return {
      keyframeId: `kf_${hash.substring(0, 10)}`,
      outputPath: `/mock/keyframes/${hash.substring(0, 10)}.png`,
      sha256: hash,
      width: options.width || 1080,
      height: options.height || 1920,
    }
  }

  async generateReferenceComposition(
    brandRefs: ImageReferencePayload[],
    productRefs: ImageReferencePayload[],
    sceneBrief: string,
    options: KeyframeGenOptions
  ): Promise<KeyframeGenResult> {
    return this.generateKeyframe(sceneBrief, [...brandRefs, ...productRefs], options)
  }
}
