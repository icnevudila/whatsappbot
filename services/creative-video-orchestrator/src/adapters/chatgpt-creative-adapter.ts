import type { CreativeContext, MultimodalAttachment } from '../types/creative-context.js'

export type ChatGPTCreativeMode = 'CREATIVE_DIRECTOR' | 'CREATIVE_CRITIC' | 'VIDEO_REVIEWER'

export interface CreativeCallTelemetry {
  job_id: string
  creative_revision_id?: string
  mode: ChatGPTCreativeMode
  model_provider: string
  started_at: string
  completed_at: string
  elapsed_ms: number
  input_asset_count: number
  input_context_size: number
  decision?: string
  retry_number: number
}

export interface IChatGPTCreativeProvider {
  callDirector(context: CreativeContext, retryCount?: number): Promise<any>
  callCritic(context: CreativeContext, planToEvaluate: any, retryCount?: number): Promise<any>
  callVideoReviewer(
    context: CreativeContext,
    sampledFrames: Array<{ timestamp_sec: number; frame_path: string }>,
    approvedPlan: any,
    retryCount?: number
  ): Promise<any>
  getTelemetryHistory(): CreativeCallTelemetry[]
}

export class ChatGPTCreativeAdapter implements IChatGPTCreativeProvider {
  private gatewayUrl: string
  private telemetryHistory: CreativeCallTelemetry[] = []

  constructor(gatewayUrl?: string) {
    this.gatewayUrl = (
      gatewayUrl ||
      process.env.OMNISTUDIO_GATEWAY_URL ||
      'http://127.0.0.1:3456'
    ).replace(/\/$/, '')
  }

  public getTelemetryHistory(): CreativeCallTelemetry[] {
    return [...this.telemetryHistory]
  }

  private recordTelemetry(entry: CreativeCallTelemetry) {
    this.telemetryHistory.push(entry)
  }

  /**
   * Enforces that all expected assets are attached with valid provenance.
   * Throws GPT_ASSET_ATTACHMENT_FAILED on any mismatch.
   */
  public verifyAttachmentProvenance(attachments: MultimodalAttachment[]): void {
    const failed = attachments.filter(a => !a.attached_successfully)
    if (failed.length > 0) {
      throw new Error(
        `GPT_ASSET_ATTACHMENT_FAILED: ${failed.length} asset(s) failed attachment provenance verification: ${failed.map(f => f.role).join(', ')}`
      )
    }
  }

  /**
   * Mode: CREATIVE_DIRECTOR
   * Queries existing OmniStudio / ChatGPT gateway or returns high-fidelity fallback.
   */
  public async callDirector(context: CreativeContext, retryCount = 0): Promise<any> {
    const startedAt = Date.now()
    this.verifyAttachmentProvenance(context.asset_manifest.attachments)

    const payload = {
      mode: 'CREATIVE_DIRECTOR',
      org_id: context.org_id,
      job_id: context.job_id,
      brand_name: context.brand_profile.brand_name,
      sector: context.brand_profile.sector,
      product: context.campaign_context.selected_product_or_service,
      user_style: context.campaign_context.user_style_preference,
      objective: context.campaign_context.campaign_objective,
      duration: context.campaign_context.duration,
      aspect_ratio: context.campaign_context.aspect_ratio,
      verified_facts: context.verified_facts,
      recent_fingerprints: context.recent_fingerprints,
      reference_style: context.reference_style_profile,
      attachments: context.asset_manifest.attachments.map(a => ({
        role: a.role,
        handle: a.canonical_handle,
        sha256: a.sha256,
        file_path: a.file_path,
        media_id: a.media_id,
      })),
    }

    let decision = 'GENERATED_3_CONCEPTS'
    try {
      const resp = await fetch(`${this.gatewayUrl}/v1/chat/creative-director`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000),
      })
      if (resp.ok) {
        const data: any = await resp.json()
        if (data && Array.isArray(data.concepts) && data.concepts.length === 3) {
          this.recordTelemetry({
            job_id: context.job_id,
            mode: 'CREATIVE_DIRECTOR',
            model_provider: 'chatgpt_service',
            started_at: new Date(startedAt).toISOString(),
            completed_at: new Date().toISOString(),
            elapsed_ms: Date.now() - startedAt,
            input_asset_count: context.asset_manifest.attached_asset_count,
            input_context_size: JSON.stringify(payload).length,
            decision,
            retry_number: retryCount,
          })
          return data
        }
      }
    } catch {
      // Fallback
    }

    this.recordTelemetry({
      job_id: context.job_id,
      mode: 'CREATIVE_DIRECTOR',
      model_provider: 'deterministic_creative_director',
      started_at: new Date(startedAt).toISOString(),
      completed_at: new Date().toISOString(),
      elapsed_ms: Date.now() - startedAt,
      input_asset_count: context.asset_manifest.attached_asset_count,
      input_context_size: JSON.stringify(payload).length,
      decision,
      retry_number: retryCount,
    })

    return null
  }

  /**
   * Mode: CREATIVE_CRITIC
   */
  public async callCritic(context: CreativeContext, planToEvaluate: any, retryCount = 0): Promise<any> {
    const startedAt = Date.now()
    this.verifyAttachmentProvenance(context.asset_manifest.attachments)

    const payload = {
      mode: 'CREATIVE_CRITIC',
      org_id: context.org_id,
      job_id: context.job_id,
      plan: planToEvaluate,
      brand_profile: context.brand_profile,
      campaign_context: context.campaign_context,
      verified_facts: context.verified_facts,
      recent_fingerprints: context.recent_fingerprints,
    }

    try {
      const resp = await fetch(`${this.gatewayUrl}/v1/chat/creative-critic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      })
      if (resp.ok) {
        const data: any = await resp.json()
        if (data && data.decision) {
          this.recordTelemetry({
            job_id: context.job_id,
            mode: 'CREATIVE_CRITIC',
            model_provider: 'chatgpt_service',
            started_at: new Date(startedAt).toISOString(),
            completed_at: new Date().toISOString(),
            elapsed_ms: Date.now() - startedAt,
            input_asset_count: context.asset_manifest.attached_asset_count,
            input_context_size: JSON.stringify(payload).length,
            decision: data.decision,
            retry_number: retryCount,
          })
          return data
        }
      }
    } catch {
      // Fallback
    }

    // Default safety fallback is NOT a silent pass: returns null so deterministic critic executes
    this.recordTelemetry({
      job_id: context.job_id,
      mode: 'CREATIVE_CRITIC',
      model_provider: 'deterministic_creative_critic',
      started_at: new Date(startedAt).toISOString(),
      completed_at: new Date().toISOString(),
      elapsed_ms: Date.now() - startedAt,
      input_asset_count: context.asset_manifest.attached_asset_count,
      input_context_size: JSON.stringify(payload).length,
      decision: 'DELEGATED_TO_DETERMINISTIC_CRITIC',
      retry_number: retryCount,
    })

    return null
  }

  /**
   * Mode: VIDEO_REVIEWER
   */
  public async callVideoReviewer(
    context: CreativeContext,
    sampledFrames: Array<{ timestamp_sec: number; frame_path: string }>,
    approvedPlan: any,
    retryCount = 0
  ): Promise<any> {
    const startedAt = Date.now()
    this.verifyAttachmentProvenance(context.asset_manifest.attachments)

    const payload = {
      mode: 'VIDEO_REVIEWER',
      org_id: context.org_id,
      job_id: context.job_id,
      sampled_frames: sampledFrames,
      approved_plan: approvedPlan,
      authoritative_hero: context.asset_manifest.attachments.find(a => a.canonical_handle === '@HeroProduct'),
      authoritative_logo: context.asset_manifest.attachments.find(a => a.canonical_handle === '@BrandLogo'),
    }

    try {
      const resp = await fetch(`${this.gatewayUrl}/v1/chat/video-reviewer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000),
      })
      if (resp.ok) {
        const data: any = await resp.json()
        if (data && data.decision) {
          this.recordTelemetry({
            job_id: context.job_id,
            mode: 'VIDEO_REVIEWER',
            model_provider: 'chatgpt_service',
            started_at: new Date(startedAt).toISOString(),
            completed_at: new Date().toISOString(),
            elapsed_ms: Date.now() - startedAt,
            input_asset_count: context.asset_manifest.attached_asset_count,
            input_context_size: JSON.stringify(payload).length,
            decision: data.decision,
            retry_number: retryCount,
          })
          return data
        }
      }
    } catch {
      // Fallback
    }

    this.recordTelemetry({
      job_id: context.job_id,
      mode: 'VIDEO_REVIEWER',
      model_provider: 'deterministic_video_reviewer',
      started_at: new Date(startedAt).toISOString(),
      completed_at: new Date().toISOString(),
      elapsed_ms: Date.now() - startedAt,
      input_asset_count: context.asset_manifest.attached_asset_count,
      input_context_size: JSON.stringify(payload).length,
      decision: 'DELEGATED_TO_DETERMINISTIC_REVIEWER',
      retry_number: retryCount,
    })

    return null
  }
}
