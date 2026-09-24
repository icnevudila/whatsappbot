export type RequestedVideoProvider = 'AUTO' | 'GEMINI_NATIVE_VIDEO' | 'FLOW_VEO'
export type SelectedVideoProvider = Exclude<RequestedVideoProvider, 'AUTO'>

export type VideoCapabilityState =
  | 'AVAILABLE'
  | 'NO_QUOTA'
  | 'FEATURE_UNAVAILABLE'
  | 'TEMPORARILY_UNAVAILABLE'
  | 'AUTH_REQUIRED'
  | 'UNKNOWN'

export type NonProviderFailureCode =
  | 'INVALID_ASSET'
  | 'INVALID_JOB'
  | 'TENANT_MISMATCH'
  | 'WRONG_PRODUCT'
  | 'POLICY_REJECTED'
  | 'USER_CANCELLED'
  | 'FACTUAL_GATE_FAILURE'
  | 'UNSAFE_REQUEST'

export interface VideoCapabilityReport {
  state: VideoCapabilityState
  providerAccountId?: string | null
  checkedAt?: string
  expiresAt?: string
  evidence?: string
}

export interface VideoGenerationRequest {
  jobId: string
  attemptId: string
  orgId: string
  prompt: string
  providerPrompts?: Partial<Record<SelectedVideoProvider, string>>
  approvedDialogue: string
  aspectRatio: '9:16'
  durationSeconds: number
  accountId?: string
  assets: Array<{
    asset_id: string
    org_id: string
    role: string
    file_path: string
    sha256: string
  }>
  preflightFailureCode?: NonProviderFailureCode
}

export interface VideoProviderResult {
  provider: SelectedVideoProvider
  providerAccountId?: string | null
  providerAttemptId: string
  providerProjectId?: string | null
  providerMediaIds?: string[]
  outputPath: string
  rawOutputSha256: string
  byteSize: number
  generationStartedAt: string
  generationCompletedAt: string
}

export interface VideoProvider {
  readonly provider: SelectedVideoProvider
  checkCapability?(request: VideoGenerationRequest): Promise<VideoCapabilityReport>
  generate(request: VideoGenerationRequest): Promise<VideoProviderResult>
}

export interface ProviderRoutingResult extends VideoProviderResult {
  requestedProvider: RequestedVideoProvider
  selectedProvider: SelectedVideoProvider
  capabilityState: VideoCapabilityState
  fallbackFrom?: SelectedVideoProvider | null
  fallbackReason?: VideoCapabilityState | null
  attemptCounts: Record<SelectedVideoProvider, number>
}

export class ProviderRoutingError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly capabilityState: VideoCapabilityState = 'UNKNOWN'
  ) {
    super(message)
    this.name = 'ProviderRoutingError'
  }
}

const AUTO_FALLBACK_STATES = new Set<VideoCapabilityState>([
  'NO_QUOTA',
  'FEATURE_UNAVAILABLE',
  'TEMPORARILY_UNAVAILABLE',
])

function capabilityFromError(error: unknown): VideoCapabilityState {
  const code = String((error as any)?.code || '')
  if (code.includes('NO_QUOTA') || code.includes('CREDIT_LIMIT') || code.includes('RATE_LIMIT')) return 'NO_QUOTA'
  if (code.includes('FEATURE_UNAVAILABLE') || code.includes('CAPABILITY_UNAVAILABLE')) return 'FEATURE_UNAVAILABLE'
  if (code.includes('TEMPORARILY_UNAVAILABLE') || code.includes('TIMEOUT') || code.includes('BROWSER_TARGET_CLOSED')) {
    return 'TEMPORARILY_UNAVAILABLE'
  }
  if (code.includes('AUTH_REQUIRED') || code.includes('SESSION_EXPIRED')) return 'AUTH_REQUIRED'
  return 'UNKNOWN'
}

export class VideoProviderRouter {
  constructor(
    private readonly gemini: VideoProvider,
    private readonly flow: VideoProvider
  ) {
    if (gemini.provider !== 'GEMINI_NATIVE_VIDEO') {
      throw new Error('Gemini provider adapter has an invalid provider identity')
    }
    if (flow.provider !== 'FLOW_VEO') {
      throw new Error('Flow provider adapter has an invalid provider identity')
    }
  }

  async execute(
    requestedProvider: RequestedVideoProvider,
    request: VideoGenerationRequest
  ): Promise<ProviderRoutingResult> {
    const attemptCounts: Record<SelectedVideoProvider, number> = {
      GEMINI_NATIVE_VIDEO: 0,
      FLOW_VEO: 0,
    }

    if (request.preflightFailureCode) {
      throw new ProviderRoutingError(
        request.preflightFailureCode,
        `Provider routing blocked by preflight failure: ${request.preflightFailureCode}`
      )
    }

    if (requestedProvider === 'FLOW_VEO') {
      attemptCounts.FLOW_VEO++
      const result = await this.flow.generate(this.forProvider(request, 'FLOW_VEO'))
      return this.complete(result, requestedProvider, 'UNKNOWN', attemptCounts)
    }

    const capability = this.gemini.checkCapability
      ? await this.gemini.checkCapability(request)
      : { state: 'UNKNOWN' as const }

    if (capability.state !== 'AVAILABLE') {
      if (requestedProvider === 'AUTO' && AUTO_FALLBACK_STATES.has(capability.state)) {
        attemptCounts.FLOW_VEO++
        const flowResult = await this.flow.generate(this.forProvider(request, 'FLOW_VEO'))
        return this.complete(
          flowResult,
          requestedProvider,
          capability.state,
          attemptCounts,
          'GEMINI_NATIVE_VIDEO',
          capability.state
        )
      }

      throw new ProviderRoutingError(
        `GEMINI_VIDEO_${capability.state}`,
        `Gemini Native Video is not usable: ${capability.state}`,
        capability.state
      )
    }

    try {
      attemptCounts.GEMINI_NATIVE_VIDEO++
      const result = await this.gemini.generate(this.forProvider(request, 'GEMINI_NATIVE_VIDEO'))
      return this.complete(result, requestedProvider, capability.state, attemptCounts)
    } catch (error) {
      const classified = capabilityFromError(error)
      if (requestedProvider === 'AUTO' && AUTO_FALLBACK_STATES.has(classified)) {
        attemptCounts.FLOW_VEO++
        const flowResult = await this.flow.generate(this.forProvider(request, 'FLOW_VEO'))
        return this.complete(
          flowResult,
          requestedProvider,
          classified,
          attemptCounts,
          'GEMINI_NATIVE_VIDEO',
          classified
        )
      }
      throw error
    }
  }

  private forProvider(
    request: VideoGenerationRequest,
    provider: SelectedVideoProvider
  ): VideoGenerationRequest {
    return {
      ...request,
      prompt: request.providerPrompts?.[provider] || request.prompt,
    }
  }

  private complete(
    result: VideoProviderResult,
    requestedProvider: RequestedVideoProvider,
    capabilityState: VideoCapabilityState,
    attemptCounts: Record<SelectedVideoProvider, number>,
    fallbackFrom: SelectedVideoProvider | null = null,
    fallbackReason: VideoCapabilityState | null = null
  ): ProviderRoutingResult {
    return {
      ...result,
      requestedProvider,
      selectedProvider: result.provider,
      capabilityState,
      fallbackFrom,
      fallbackReason,
      attemptCounts: { ...attemptCounts },
    }
  }
}
