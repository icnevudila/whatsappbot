import type { BrandContextSnapshot } from '../types/brand-snapshot.js'
import type { ReferenceRegistry } from '../types/reference-registry.js'

export interface FlowAccountCapabilities {
  accountId: string
  supportsR2V: boolean
  maxReferenceImages: number
  supportsI2V: boolean
  supportsExtend: boolean
  supportsMovieScene: boolean
  supportsChain: boolean
  supportsStartEndFrames: boolean // False in current Sept 2026 UI
  preferredModel: string
}

export interface AssetPayload {
  asset_id?: string
  org_id?: string
  role: string
  file_path: string
  sha256?: string
}

export interface GenerateRequest {
  job_id: string
  parent_job_id?: string
  scene_id?: string
  flow_project_id: string // Enforced: unique per scene
  attempt_id: string
  org_id: string
  account_id: string
  prompt: string
  approved_dialogue?: string
  aspect_ratio: string
  model: string
  duration: number
  assets: AssetPayload[]
  expected_reference_ids: string[]
}

export interface GenerateResponse {
  job_id: string
  attempt_id: string
  account_id: string
  flow_project_id: string
  output_path: string
  file_size: number
  elapsed_seconds: float
  expected_ingredient_count: number
  actual_ingredient_count: number
  actual_attached_reference_ids: string[] // Execution report from provider
  verified_assets?: Array<{
    asset_id: string
    org_id: string
    sha256: string
    role: string
    attached_media_id: string
  }>
  attempts?: Array<{
    attempt_number: number
    flow_project_id: string
    status: 'SUCCESS' | 'RETRY' | 'FAILED'
    error?: string
    created_at: string
  }>
  verified: boolean
}

type float = number

export interface IGFlowProvider {
  executeJob(req: GenerateRequest): Promise<GenerateResponse>
  probeCapabilities(accountId: string): Promise<FlowAccountCapabilities>
}

export interface IAIMediaControlAdapter {
  ensureJobRow?(
    jobId: string,
    orgId: string,
    title: string,
    prompt: string,
    durationSeconds?: number,
    model?: string,
    aspectRatio?: string
  ): Promise<void>
  transitionState(
    jobId: string,
    orgId: string,
    fromState: string,
    toState: string,
    message: string,
    payload?: Record<string, unknown>
  ): Promise<void>
  logAuditEvent(
    jobId: string,
    orgId: string,
    eventType: string,
    message: string,
    payload?: Record<string, unknown>
  ): Promise<void>
  updateJobMetadata(jobId: string, metadata: Record<string, unknown>): Promise<void>
}

export interface FfprobeMetadata {
  duration: number
  width: number
  height: number
  fps: number
  vcodec: string
  acodec: string | null
  bitrate?: number
}

export interface ClipNormalizeOptions {
  width: number
  height: number
  fps: number
  aspectRatio: string
}

export interface ConcatOptions {
  crossfadeDurationSec?: number
}

export interface IFFmpegAdapter {
  runFfprobe(filePath: string): Promise<FfprobeMetadata>
  normalizeClip(inputPath: string, outputPath: string, options: ClipNormalizeOptions): Promise<string>
  concatClips(clipPaths: string[], outputPath: string, options?: ConcatOptions): Promise<string>
  applyDeterministicFinishing(
    inputVideoPath: string,
    finishingSpec: any,
    outputPath: string
  ): Promise<string>
}

// --- Creative & Image Provider Abstractions (Approved Refinements) ---

export interface CreativePlanDraft {
  hook: string
  productHeroAction: string
  environment: string
  cameraLanguage: string
  lightingStyle: string
  motionRhythm: string
  audioDirection: string
  closingCTAIntent: string
}

export interface MasterVoiceOverDraft {
  fullScript: string
  scenes: Array<{
    sceneOrder: number
    purpose: string
    durationTargetSec: number
    voiceoverSegment: string
  }>
}

export interface StoryboardDraftScene {
  sceneId: string
  order: number
  durationTarget: number
  purpose: string
  visualDescription: string
  voiceoverSegment: string
  environment: string
  camera: string
  lighting: string
  motion: string
  audio: string
  negativeConstraints: string[]
  isRoot: boolean
  continuityParentSceneId?: string
}

export interface StoryboardDraft {
  conceptSummary: string
  scenes: StoryboardDraftScene[]
}

export interface ICreativeModelProvider {
  generateCreativePlan(snapshot: BrandContextSnapshot, sectorPreset: any): Promise<CreativePlanDraft>
  generateStoryboard(
    snapshot: BrandContextSnapshot,
    masterVO: MasterVoiceOverDraft,
    sectorPreset: any
  ): Promise<StoryboardDraft>
  generateMasterVoiceOver(
    snapshot: BrandContextSnapshot,
    storyArc: string[],
    durationSeconds: number
  ): Promise<MasterVoiceOverDraft>
  compileScenePrompt(
    scene: StoryboardDraftScene,
    snapshot: BrandContextSnapshot,
    registry: ReferenceRegistry,
    continuityState?: any
  ): Promise<string>
}

export interface ImageReferencePayload {
  role: string
  filePath: string
  sha256: string
}

export interface KeyframeGenOptions {
  aspectRatio: string
  width?: number
  height?: number
  model?: string
}

export interface KeyframeGenResult {
  keyframeId: string
  outputPath: string
  sha256: string
  width: number
  height: number
}

export interface IImageGenerationProvider {
  generateKeyframe(
    prompt: string,
    references: ImageReferencePayload[],
    options: KeyframeGenOptions
  ): Promise<KeyframeGenResult>
  generateReferenceComposition(
    brandRefs: ImageReferencePayload[],
    productRefs: ImageReferencePayload[],
    sceneBrief: string,
    options: KeyframeGenOptions
  ): Promise<KeyframeGenResult>
}
