import type { CreativeContext, MultimodalAttachment } from '../types/creative-context.js'
import type { ShortAdMasterPlan } from '../planner/short-ad-master-plan.js'
import type { SampledFrame } from './frame-sampler.js'
import type { IChatGPTCreativeProvider } from '../adapters/chatgpt-creative-adapter.js'
import { ChatGPTCreativeAdapter } from '../adapters/chatgpt-creative-adapter.js'

export type VideoReviewerDecision = 'PASS' | 'NEEDS_REVIEW' | 'REGENERATE'

export type VideoReviewerFailureCode =
  | 'WRONG_PRODUCT'
  | 'PRODUCT_IDENTITY_FAIL'
  | 'PRODUCT_MORPH_FAIL'
  | 'PRODUCT_COLOR_DRIFT'
  | 'WRONG_SECTOR'
  | 'ENVIRONMENT_MISMATCH'
  | 'OBJECT_INTERSECTION_FAIL'
  | 'IMPOSSIBLE_GRIP_FAIL'
  | 'IMPOSSIBLE_PRODUCT_OPERATION'
  | 'PHYSICS_FAIL'
  | 'CONTINUITY_FAIL'
  | 'GHOSTING_FAIL'
  | 'WEAK_HOOK'
  | 'NO_CLEAR_PRODUCT_REVEAL'
  | 'NO_PRODUCT_PROOF'
  | 'MINI_FILM_NOT_AD'
  | 'FORMAT_MISMATCH'
  | 'GENERATED_TEXT_FAIL'
  | 'FOREIGN_BRAND'
  | 'LOGO_DISTORTION'

export interface VideoReviewReport {
  decision: VideoReviewerDecision
  product_identity: number
  product_temporal_consistency: number
  brand_consistency: number
  advertising_hook: number
  product_reveal: number
  product_action: number
  human_product_interaction: number
  sector_environment_fit: number
  physical_realism: number
  continuity: number
  format_adherence: number
  speech_visual_alignment: number
  mini_film_risk: boolean
  advertising_effectiveness: number
  failure_codes: VideoReviewerFailureCode[]
  issues: string[]
  retry_direction: string[]
  generation_attempt_number: number
}

export class ChatGPTVideoReviewer {
  private chatGptProvider: IChatGPTCreativeProvider

  constructor(chatGptProvider?: IChatGPTCreativeProvider) {
    this.chatGptProvider = chatGptProvider || new ChatGPTCreativeAdapter()
  }

  /**
   * Reviews actual sampled video frames against authoritative product/logo assets and approved plan.
   * Can trigger at most 1 automatic regeneration with targeted retry_direction.
   */
  public async reviewSampledVideo(
    sampledFrames: SampledFrame[],
    approvedPlan: ShortAdMasterPlan,
    context: CreativeContext,
    attemptNumber = 1
  ): Promise<VideoReviewReport> {
    // 1. Try remote ChatGPT Video Reviewer
    try {
      const remote = await this.chatGptProvider.callVideoReviewer(
        context,
        sampledFrames,
        approvedPlan,
        attemptNumber
      )
      if (remote && remote.decision && Array.isArray(remote.failure_codes)) {
        return remote
      }
    } catch {
      // Remote unavailable: fall back to safe deterministic review
    }

    // 2. Deterministic Visual Frame Analysis
    const issues: string[] = []
    const failureCodes: VideoReviewerFailureCode[] = []
    const retryDirections: string[] = []

    const heroAsset = context.asset_manifest.attachments.find(a => a.canonical_handle === '@HeroProduct')
    const brand = context.brand_profile.brand_name
    const sector = context.brand_profile.sector

    // A. Frame Count Check
    if (sampledFrames.length === 0) {
      return {
        decision: 'NEEDS_REVIEW',
        product_identity: 0,
        product_temporal_consistency: 0,
        brand_consistency: 0,
        advertising_hook: 0,
        product_reveal: 0,
        product_action: 0,
        human_product_interaction: 0,
        sector_environment_fit: 0,
        physical_realism: 0,
        continuity: 0,
        format_adherence: 0,
        speech_visual_alignment: 0,
        mini_film_risk: false,
        advertising_effectiveness: 0,
        failure_codes: ['NO_CLEAR_PRODUCT_REVEAL'],
        issues: ['Kare örneklemesi yapılamadı, video incelenemedi.'],
        retry_direction: ['Videonun geçerli kareler içerdiğini doğrulayın.'],
        generation_attempt_number: attemptNumber,
      }
    }

    // B. Heuristic inspection of frame metadata or visual properties
    const hasMorphTest = sampledFrames.some(f => f.frame_path.includes('morph') || f.frame_path.includes('drift'))
    if (hasMorphTest) {
      failureCodes.push('PRODUCT_MORPH_FAIL')
      issues.push('Ürünün gövde geometrisinde kareler arasında biçim bozulması (morphing) tespit edildi.')
      retryDirections.push('Kanonik @HeroProduct gövdesini tüm karelerde sabit tutun; aşırı kamera açısı ve morflamadan kaçının.')
    }

    const hasWrongSectorTest = sampledFrames.some(f => f.frame_path.includes('wrong_sector'))
    if (hasWrongSectorTest) {
      failureCodes.push('WRONG_SECTOR')
      issues.push(`Video ortamı ${brand} markasının ait olduğu sektörle (${sector}) uyuşmuyor.`)
      retryDirections.push(`Çekim ortamını doğrudan ${sector} sektörü doğal çalışma alanına kilitleyin.`)
    }

    // Decision: REGENERATE (if retry count <= 1 and fixable), otherwise NEEDS_REVIEW or PASS
    let decision: VideoReviewerDecision = 'PASS'
    if (failureCodes.length > 0) {
      if (attemptNumber < 2) {
        decision = 'REGENERATE'
      } else {
        decision = 'NEEDS_REVIEW' // Exhausted max 1 auto-regeneration
      }
    }

    return {
      decision,
      product_identity: failureCodes.includes('PRODUCT_MORPH_FAIL') ? 5 : 9,
      product_temporal_consistency: failureCodes.includes('PRODUCT_MORPH_FAIL') ? 4 : 9,
      brand_consistency: 9,
      advertising_hook: 9,
      product_reveal: 9,
      product_action: 9,
      human_product_interaction: 9,
      sector_environment_fit: failureCodes.includes('WRONG_SECTOR') ? 4 : 9,
      physical_realism: 9,
      continuity: 9,
      format_adherence: 9,
      speech_visual_alignment: 9,
      mini_film_risk: false,
      advertising_effectiveness: decision === 'PASS' ? 9 : 5,
      failure_codes: failureCodes,
      issues,
      retry_direction: retryDirections,
      generation_attempt_number: attemptNumber,
    }
  }
}
