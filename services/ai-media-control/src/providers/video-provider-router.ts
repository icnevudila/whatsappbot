export type RequestedVideoProvider = 'AUTO' | 'GEMINI_NATIVE_VIDEO' | 'FLOW_VEO'
export type SelectedVideoProvider = Exclude<RequestedVideoProvider, 'AUTO'>

export type VideoCapabilityState =
  | 'AVAILABLE'
  | 'AVAILABLE_WITH_WARNING'
  | 'NO_QUOTA'
  | 'FEATURE_UNAVAILABLE'
  | 'TEMPORARILY_UNAVAILABLE'
  | 'AUTH_REQUIRED'
  | 'ACCOUNT_CONFIGURATION_REQUIRED'
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
  geminiAccountIds?: string[]
  assets: Array<{
    asset_id: string
    org_id: string
    role: string
    file_path: string
    sha256: string
  }>
  preflightFailureCode?: NonProviderFailureCode
}

export interface VideoCapabilityReport {
  state: VideoCapabilityState
  providerAccountId?: string | null
  checkedAt?: string
  expiresAt?: string
  evidence?: string
  accounts?: string[] | Array<{ providerAccountId?: string; state?: VideoCapabilityState }>
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
  accountsTried?: string[]
  runtimeBlockedAccounts?: string[]
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
  'AUTH_REQUIRED',
  'ACCOUNT_CONFIGURATION_REQUIRED',
])

function isRuntimeBlocked(error: unknown): boolean {
  const code = String((error as any)?.code || '')
  const message = String((error as any)?.message || '')
  return (
    code === 'GEMINI_RUNTIME_BLOCKED' ||
    code.includes('RUNTIME_BLOCKED') ||
    message.includes('RUNTIME_BLOCKED') ||
    code.includes('1040') ||
    message.includes('1040') ||
    code.includes('APPS_ACTIVITY_OFF') ||
    message.includes('APPS_ACTIVITY_OFF') ||
    code === 'ACCOUNT_CONFIGURATION_REQUIRED'
  )
}

function capabilityFromError(error: unknown): VideoCapabilityState {
  const code = String((error as any)?.code || '')
  const message = String((error as any)?.message || '')
  if ((error as any)?.capabilityState && (error as any).capabilityState !== 'UNKNOWN') {
    return (error as any).capabilityState
  }
  if (
    code.includes('ACCOUNT_CONFIGURATION_REQUIRED') ||
    code.includes('APPS_ACTIVITY_OFF') ||
    code.includes('RUNTIME_BLOCKED') ||
    message.includes('RUNTIME_BLOCKED') ||
    code.includes('1040') ||
    message.includes('1040')
  ) {
    return 'ACCOUNT_CONFIGURATION_REQUIRED'
  }
  if (code.includes('NO_QUOTA') || code.includes('CREDIT_LIMIT') || code.includes('RATE_LIMIT')) return 'NO_QUOTA'
  if (code.includes('FEATURE_UNAVAILABLE') || code.includes('CAPABILITY_UNAVAILABLE')) return 'FEATURE_UNAVAILABLE'
  if (
    code.includes('TEMPORARILY_UNAVAILABLE') ||
    code.includes('TIMEOUT') ||
    code.includes('BROWSER_TARGET_CLOSED') ||
    code.includes('NO_ELIGIBLE_WORKER') ||
    message.includes('No READY') ||
    message.includes('NO_ELIGIBLE_WORKER') ||
    message.includes('fetch failed')
  ) {
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

    if (capability.state !== 'AVAILABLE' && capability.state !== 'AVAILABLE_WITH_WARNING') {
      if (requestedProvider === 'AUTO') {
        attemptCounts.FLOW_VEO++
        const flowResult = await this.flow.generate(this.forProvider(this.forFlow(request), 'FLOW_VEO'))
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

    const rawCandidates: unknown[] = (
      request.geminiAccountIds && request.geminiAccountIds.length > 0
        ? request.geminiAccountIds
        : capability.accounts && capability.accounts.length > 0
          ? capability.accounts
          : capability.providerAccountId
            ? [capability.providerAccountId]
            : request.accountId
              ? [request.accountId]
              : ['gemini-9223', 'gemini-9224', 'gemini-9225']
    )

    const geminiCandidates: string[] = rawCandidates
      .map((item: any) => {
        if (typeof item === 'string') return item
        return item?.providerAccountId || item?.accountId || item?.id || null
      })
      .filter((id): id is string => Boolean(id && typeof id === 'string'))

    const accountsTried: string[] = []
    const runtimeBlockedAccounts: string[] = []
    let lastError: unknown = null

    for (let i = 0; i < geminiCandidates.length; i++) {
      const candidateAccount = geminiCandidates[i]
      accountsTried.push(candidateAccount)
      attemptCounts.GEMINI_NATIVE_VIDEO++

      const candidateRequest: VideoGenerationRequest = {
        ...request,
        accountId: candidateAccount,
      }

      try {
        const result = await this.gemini.generate(this.forProvider(candidateRequest, 'GEMINI_NATIVE_VIDEO'))
        return this.complete(
          result,
          requestedProvider,
          capability.state,
          attemptCounts,
          null,
          null,
          accountsTried,
          runtimeBlockedAccounts
        )
      } catch (error) {
        lastError = error
        const classified = capabilityFromError(error)
        const isBlocked = isRuntimeBlocked(error)

        if (isBlocked) {
          runtimeBlockedAccounts.push(candidateAccount)
          // If more Gemini accounts are available in the pool, try the next account
          if (i + 1 < geminiCandidates.length) {
            continue
          }
          // Whole Gemini pool is exhausted -> fallback to Flow on AUTO
          if (requestedProvider === 'AUTO') {
            attemptCounts.FLOW_VEO++
            const flowRequest = this.forProvider(this.forFlow(request), 'FLOW_VEO')
            const flowResult = await this.flow.generate(flowRequest)
            return this.complete(
              flowResult,
              requestedProvider,
              'ACCOUNT_CONFIGURATION_REQUIRED',
              attemptCounts,
              'GEMINI_NATIVE_VIDEO',
              'ACCOUNT_CONFIGURATION_REQUIRED',
              accountsTried,
              runtimeBlockedAccounts
            )
          }
          throw error
        }

        // Other recoverable errors in AUTO mode
        if (requestedProvider === 'AUTO' && (AUTO_FALLBACK_STATES.has(classified) || classified === 'ACCOUNT_CONFIGURATION_REQUIRED')) {
          attemptCounts.FLOW_VEO++
          const flowRequest = this.forProvider(this.forFlow(request), 'FLOW_VEO')
          const flowResult = await this.flow.generate(flowRequest)
          return this.complete(
            flowResult,
            requestedProvider,
            classified,
            attemptCounts,
            'GEMINI_NATIVE_VIDEO',
            classified,
            accountsTried,
            runtimeBlockedAccounts
          )
        }
        throw error
      }
    }

    if (lastError) throw lastError
    throw new ProviderRoutingError('GEMINI_VIDEO_EXHAUSTED', 'All candidate Gemini accounts exhausted')
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

  private forFlow(request: VideoGenerationRequest): VideoGenerationRequest {
    return {
      ...request,
      accountId: (request.accountId && !request.accountId.startsWith('gemini'))
        ? request.accountId
        : (process.env.FLOW_PRIMARY_ACCOUNT_ID || 'account-02'),
    }
  }

  private complete(
    result: VideoProviderResult,
    requestedProvider: RequestedVideoProvider,
    capabilityState: VideoCapabilityState,
    attemptCounts: Record<SelectedVideoProvider, number>,
    fallbackFrom: SelectedVideoProvider | null = null,
    fallbackReason: VideoCapabilityState | null = null,
    accountsTried: string[] = [],
    runtimeBlockedAccounts: string[] = []
  ): ProviderRoutingResult {
    return {
      ...result,
      requestedProvider,
      selectedProvider: result.provider,
      capabilityState,
      fallbackFrom,
      fallbackReason,
      attemptCounts: { ...attemptCounts },
      accountsTried,
      runtimeBlockedAccounts,
    }
  }
}
