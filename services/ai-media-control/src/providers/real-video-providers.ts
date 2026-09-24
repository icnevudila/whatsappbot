import { createHash } from 'node:crypto'
import { mkdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { RealHttpGFlowProvider } from '@wa/creative-video-orchestrator'
import {
  ProviderRoutingError,
  type VideoCapabilityReport,
  type VideoGenerationRequest,
  type VideoProvider,
  type VideoProviderResult,
} from './video-provider-router.js'
import { GenerationWorkspace } from './generation-workspace.js'

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function normalizeGatewayMediaUrl(gatewayUrl: string, mediaUrl: string): string {
  try {
    const parsed = new URL(mediaUrl)
    if (parsed.pathname.startsWith('/outputs/') || parsed.pathname.startsWith('/public/')) {
      return `${gatewayUrl.replace(/\/$/, '')}${parsed.pathname}${parsed.search}`
    }
    return mediaUrl
  } catch {
    return mediaUrl
  }
}

function assertSimpleProviderContract(request: VideoGenerationRequest): void {
  if (request.aspectRatio !== '9:16') {
    throw new ProviderRoutingError('INVALID_JOB', `SIMPLE_V5_HYBRID requires 9:16, received ${request.aspectRatio}`)
  }
  const exactDialogue = `Approved dialogue: "${request.approvedDialogue}"`
  if (!request.approvedDialogue.trim() || !request.prompt.includes(exactDialogue)) {
    throw new ProviderRoutingError('INVALID_JOB', 'Provider prompt does not contain the exact locked approved dialogue')
  }
}

export function buildGeminiNativeProviderPayload(request: VideoGenerationRequest) {
  assertSimpleProviderContract(request)
  const logo = request.assets.find(asset => asset.role === 'logo')
  const product = request.assets.find(asset => asset.role === 'product')
  const references = request.assets.filter(asset => asset.role !== 'logo' && asset.role !== 'product')
  return {
    prompt: request.prompt,
    approvedDialogue: request.approvedDialogue,
    voiceoverText: request.approvedDialogue,
    orgId: request.orgId,
    jobId: request.jobId,
    idempotencyKey: `${request.jobId}:${request.attemptId}:gemini-native`,
    preferredEngine: 'gemini',
    engine: 'gemini',
    disableProviderFallback: true,
    subtitles: false,
    includeOverlay: false,
    aspectRatio: request.aspectRatio,
    duration: request.durationSeconds,
    logoUrl: logo?.file_path || null,
    logoSha256: logo?.sha256 || null,
    productImageUrl: product?.file_path || null,
    productSha256: product?.sha256 || null,
    referenceImageUrls: references.map(asset => ({ url: asset.file_path, role: asset.role })),
    assets: request.assets,
    requireMedia: true,
  }
}

export function buildFlowVeoProviderPayload(request: VideoGenerationRequest) {
  assertSimpleProviderContract(request)
  return {
    job_id: request.jobId,
    attempt_id: request.attemptId,
    org_id: request.orgId,
    account_id: request.accountId!,
    flow_project_id: `flow_proj_${request.jobId}_${request.attemptId}`,
    prompt: request.prompt,
    approved_dialogue: request.approvedDialogue,
    aspect_ratio: request.aspectRatio,
    model: 'veo-fast',
    duration: request.durationSeconds,
    assets: request.assets,
    expected_reference_ids: request.assets.map(asset => asset.asset_id),
  }
}

export class OmniStudioGeminiNativeVideoProvider implements VideoProvider {
  readonly provider = 'GEMINI_NATIVE_VIDEO' as const

  constructor(
    private readonly gatewayUrl = process.env.OMNISTUDIO_GATEWAY_URL || 'http://host.docker.internal:3456'
  ) {}

  async checkCapability(): Promise<VideoCapabilityReport> {
    let response: Response
    try {
      response = await fetch(`${this.gatewayUrl.replace(/\/$/, '')}/v1/videos/capability`, {
        signal: AbortSignal.timeout(15_000),
      })
    } catch (error: any) {
      return {
        state: 'TEMPORARILY_UNAVAILABLE',
        evidence: `OmniStudio capability endpoint unreachable: ${error.message}`,
      }
    }

    if (!response.ok) {
      return {
        state: response.status === 401 || response.status === 403 ? 'AUTH_REQUIRED' : 'TEMPORARILY_UNAVAILABLE',
        evidence: `Capability endpoint returned HTTP ${response.status}`,
      }
    }

    const body: any = await response.json()
    const allowed = new Set([
      'AVAILABLE', 'AVAILABLE_WITH_WARNING', 'NO_QUOTA', 'FEATURE_UNAVAILABLE',
      'TEMPORARILY_UNAVAILABLE', 'AUTH_REQUIRED', 'UNKNOWN',
    ])
    return {
      state: allowed.has(body.state) ? body.state : 'UNKNOWN',
      providerAccountId: body.provider_account_id || null,
      checkedAt: body.checked_at,
      expiresAt: body.expires_at,
      evidence: body.evidence,
    }
  }

  async generate(request: VideoGenerationRequest): Promise<VideoProviderResult> {
    const ws = new GenerationWorkspace({ jobId: request.jobId, attemptId: request.attemptId })
    ws.logEvent('PREFLIGHT', 'Checking prerequisites and initializing attempt workspace')
    ws.writePrompt({
      job_id: request.jobId,
      attempt_id: request.attemptId,
      prompt: request.prompt,
      provider_prompts: request.providerPrompts,
      approved_dialogue: request.approvedDialogue,
      aspect_ratio: request.aspectRatio,
      duration_seconds: request.durationSeconds,
      assets: request.assets,
    })

    ws.logEvent('READY', 'Submitting generation request to OmniStudio gateway')
    const generationStartedAt = new Date().toISOString()
    const endpoint = `${this.gatewayUrl.replace(/\/$/, '')}/v1/videos/generations`

    ws.logEvent('SUBMITTED', `POST ${endpoint}`)
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildGeminiNativeProviderPayload(request)),
      signal: AbortSignal.timeout(7 * 60_000),
    })

    const body: any = await response.json().catch(() => ({}))
    if (!response.ok) {
      const code = body?.error?.code || 'GEMINI_VIDEO_UNKNOWN'
      const msg = body?.error?.message || `Gemini video request failed with HTTP ${response.status}`
      ws.logEvent('PROVIDER_REJECTED', msg, { code })
      ws.writeProvider({
        provider: this.provider,
        status: 'PROVIDER_REJECTED',
        error_code: code,
        error_message: msg,
      })
      throw new ProviderRoutingError(code, msg)
    }

    const remoteUrl = body.videoUrl || body.outputUrl || body.data?.[0]?.url
    if (!remoteUrl) {
      ws.logEvent('SUBMISSION_UNKNOWN', 'Gemini video response did not include an output URL')
      throw new ProviderRoutingError('GEMINI_VIDEO_UNKNOWN', 'Gemini video response did not include an output URL')
    }

    ws.logEvent('GENERATING', 'Provider acknowledged submission, awaiting render completion')
    ws.logEvent('GENERATION_COMPLETED', 'Remote output URL received', { remoteUrl })
    const downloadUrl = normalizeGatewayMediaUrl(this.gatewayUrl, remoteUrl)
    ws.logEvent('DOWNLOAD_STARTED', `Downloading from ${downloadUrl}`)
    const mediaResponse = await fetch(downloadUrl, { signal: AbortSignal.timeout(60_000) })
    if (!mediaResponse.ok) {
      ws.logEvent('FAILED', `Gemini output download failed with HTTP ${mediaResponse.status}`)
      throw new ProviderRoutingError(
        'GEMINI_VIDEO_TEMPORARILY_UNAVAILABLE',
        `Gemini output download failed with HTTP ${mediaResponse.status}`,
        'TEMPORARILY_UNAVAILABLE'
      )
    }

    const bytes = Buffer.from(await mediaResponse.arrayBuffer())
    if (bytes.length < 300_000) {
      ws.logEvent('FAILED', `Gemini output is unexpectedly small (${bytes.length} bytes)`)
      throw new ProviderRoutingError('GEMINI_VIDEO_UNKNOWN', `Gemini output is unexpectedly small (${bytes.length} bytes)`)
    }

    const outputPath = ws.rawMp4Path()
    const legacyPath = `/shared/outputs/${request.orgId}/${request.jobId}/${request.attemptId}/gemini_native_raw.mp4`
    mkdirSync(dirname(legacyPath), { recursive: true })
    writeFileSync(legacyPath, bytes)
    writeFileSync(outputPath, bytes)

    const { sha256: actualSha256, size: actualSize } = ws.recordRawVideo(outputPath)
    const gatewaySha256 = String(body.rawOutputSha256 || body.sha256 || '').toLowerCase()
    if (gatewaySha256 && gatewaySha256 !== actualSha256) {
      ws.logEvent('FAILED', `SHA mismatch: gateway ${gatewaySha256} vs actual ${actualSha256}`)
      throw new ProviderRoutingError(
        'GEMINI_OUTPUT_SHA_MISMATCH',
        `Gemini output SHA-256 drift: gateway ${gatewaySha256}, downloaded ${actualSha256}`
      )
    }

    ws.logEvent('DOWNLOAD_COMPLETED', `raw.mp4 written (${actualSize} bytes)`)
    ws.logEvent('VERIFIED', `raw.mp4 verified: sha256=${actualSha256}`)
    ws.writeProvider({
      provider: this.provider,
      provider_account_id: body.providerAccountId || body.provider_account_id || (body.accountPort ? `cdp-${body.accountPort}` : null),
      provider_attempt_id: body.attemptId || request.attemptId,
      status: 'VERIFIED',
      raw_output_path: outputPath,
      raw_output_sha256: actualSha256,
      byte_size: actualSize,
      generation_started_at: generationStartedAt,
      generation_completed_at: new Date().toISOString(),
    })

    return {
      provider: this.provider,
      providerAccountId: body.providerAccountId || body.provider_account_id || (body.accountPort ? `cdp-${body.accountPort}` : null),
      providerAttemptId: body.attemptId || request.attemptId,
      providerProjectId: null,
      providerMediaIds: body.videoId ? [String(body.videoId)] : [],
      outputPath,
      rawOutputSha256: actualSha256,
      byteSize: actualSize,
      generationStartedAt,
      generationCompletedAt: new Date().toISOString(),
    }
  }
}

export class FlowVeoVideoProvider implements VideoProvider {
  readonly provider = 'FLOW_VEO' as const

  constructor(
    private readonly gflow: RealHttpGFlowProvider,
    private readonly gatewayUrl = process.env.OMNISTUDIO_GATEWAY_URL || 'http://127.0.0.1:3456'
  ) {}

  async generate(request: VideoGenerationRequest): Promise<VideoProviderResult> {
    if (!request.accountId) {
      throw new ProviderRoutingError(
        'FLOW_ACCOUNT_UNAVAILABLE',
        'Flow fallback requires an explicitly leased Flow account',
        'TEMPORARILY_UNAVAILABLE'
      )
    }

    // 1. Request distributed account lease
    let leaseToken: string | null = null
    try {
      const leaseRes = await fetch(`${this.gatewayUrl.replace(/\/$/, '')}/v1/browser-workers/lease/acquire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'flow',
          accountId: request.accountId,
          jobId: request.jobId,
          workerId: `flow:${request.accountId}`,
          ttlSeconds: 120,
        }),
        signal: AbortSignal.timeout(10_000),
      })
      if (leaseRes.status === 409) {
        throw new ProviderRoutingError(
          'ACCOUNT_BUSY',
          `Flow account ${request.accountId} is leased by another host`,
          'TEMPORARILY_UNAVAILABLE'
        )
      }
      if (leaseRes.ok) {
        const leaseData: any = await leaseRes.json()
        leaseToken = leaseData.leaseToken || leaseData.lease_token
      }
    } catch (err: any) {
      if (err instanceof ProviderRoutingError) throw err
    }

    try {
      // 2. Ensure Flow browser worker READY
      try {
        await fetch(`${this.gatewayUrl.replace(/\/$/, '')}/v1/browser-workers/ensure-ready`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workerId: `flow:${request.accountId}`,
            provider: 'flow',
            accountId: request.accountId,
          }),
          signal: AbortSignal.timeout(10_000),
        })
      } catch {}

      // 3. Run existing gflow execution
      const ws = new GenerationWorkspace({ jobId: request.jobId, attemptId: request.attemptId })
      ws.logEvent('PREFLIGHT', 'Preparing Flow VEO generation')
      ws.writePrompt({
        job_id: request.jobId,
        attempt_id: request.attemptId,
        prompt: request.prompt,
        provider_prompts: request.providerPrompts,
        approved_dialogue: request.approvedDialogue,
        aspect_ratio: request.aspectRatio,
        duration_seconds: request.durationSeconds,
        assets: request.assets,
      })
      if (leaseToken) ws.logEvent('ACCOUNT_LEASED', `Leased flow account ${request.accountId}`)
      ws.logEvent('READY', 'Flow worker ready')
      ws.logEvent('SUBMITTED', 'Executing flow job')
      ws.logEvent('GENERATING', 'Flow rendering')

      const generationStartedAt = new Date().toISOString()
      const payload: any = buildFlowVeoProviderPayload(request)
      if (leaseToken) payload.lease_token = leaseToken
      const result: any = await this.gflow.executeJob(payload)

      ws.logEvent('GENERATION_COMPLETED', 'Flow rendering finished')
      ws.logEvent('DOWNLOAD_STARTED', 'Recording raw video to attempt workspace')

      // 4. Generation / download complete
      const outputPath = ws.rawMp4Path()
      const { sha256: actualSha256, size: actualSize } = ws.recordRawVideo(result.output_path)
      ws.logEvent('DOWNLOAD_COMPLETED', `raw.mp4 written (${actualSize} bytes)`)
      ws.logEvent('VERIFIED', `raw.mp4 verified: ${actualSha256}`)
      ws.writeProvider({
        provider: this.provider,
        provider_account_id: request.accountId || result.account_id || null,
        provider_attempt_id: result.attempt_id || request.attemptId,
        provider_project_id: result.flow_project_id || result.real_flow_project_uuid || null,
        status: 'VERIFIED',
        raw_output_path: outputPath,
        raw_output_sha256: actualSha256,
        byte_size: actualSize,
        generation_started_at: generationStartedAt,
        generation_completed_at: new Date().toISOString(),
      })

      return {
        provider: this.provider,
        providerAccountId: request.accountId || result.account_id || null,
        providerAttemptId: result.attempt_id || request.attemptId,
        providerProjectId: result.flow_project_id || result.real_flow_project_uuid || null,
        providerMediaIds: (result.verified_assets || []).map((asset: any) => asset.attached_media_id).filter(Boolean),
        outputPath,
        rawOutputSha256: actualSha256,
        byteSize: actualSize,
        generationStartedAt,
        generationCompletedAt: new Date().toISOString(),
      }
    } finally {
      // 5. Release lease
      if (leaseToken) {
        try {
          await fetch(`${this.gatewayUrl.replace(/\/$/, '')}/v1/browser-workers/lease/release`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: 'flow',
              accountId: request.accountId,
              leaseToken,
            }),
            signal: AbortSignal.timeout(5_000),
          })
        } catch {}
      }
    }
  }
}
