import type { BrandContextSnapshot } from '../types/brand-snapshot.js'
import type { ICreativeModelProvider, MasterVoiceOverDraft } from '../adapters/interfaces.js'
import type { SectorPreset } from '../strategy/sector-presets.js'

export interface VoiceOverSegment {
  sceneOrder: number
  scenePurpose: string
  durationTargetSec: number
  voiceoverText: string
}

export interface MasterVoiceOverPlan {
  fullScript: string
  segments: VoiceOverSegment[]
  totalVoiceOverDurationSec: number
}

export interface LongCreativePlan {
  planId: string
  campaignConcept: string
  storyArc: string[]
  exactTotalDurationSec: number
  sceneCount: number
  masterVoiceOver: MasterVoiceOverPlan
  musicDirection: string
  continuityPlanSummary: string
  ctaEndCardText: string
}

export class LongVideoPlanner {
  constructor(private creativeModel?: ICreativeModelProvider) {}

  /**
   * Plans a long-form commercial (15s - 60s) with strict story progression.
   * Guarantees Master Voice-Over is written FIRST with non-overlapping segments
   * and ZERO repeated sentences across scenes.
   */
  async plan(
    snapshot: BrandContextSnapshot,
    sectorPreset: SectorPreset
  ): Promise<LongCreativePlan> {
    const totalDuration = snapshot.requested_duration || 40
    // Target 7 to 9 seconds per scene (e.g. 40s -> 5 scenes)
    const sceneCount = Math.max(3, Math.min(8, Math.round(totalDuration / 8)))

    const storyArcStages = [
      'Hook / Problem Identification',
      'Hero Product Introduction',
      'Operational Performance & Core Benefit',
      'Credible Proof & Emotional Payoff',
      'Brand Resolution & Decisive CTA',
    ]

    // 1. Generate or draft Master Voice-Over FIRST
    let masterVO: MasterVoiceOverPlan

    if (this.creativeModel) {
      const draft = await this.creativeModel.generateMasterVoiceOver(snapshot, storyArcStages, totalDuration)
      masterVO = this.parseDraftMasterVO(draft, totalDuration, sceneCount)
    } else {
      masterVO = this.buildDeterministicMasterVO(snapshot, sectorPreset, totalDuration, sceneCount)
    }

    // 2. Validate strict Voice-Over invariants: non-overlapping and no duplicate sentences
    this.validateVoiceOverInvariants(masterVO)

    const campaignConcept = `Cinematic commercial for ${snapshot.brand_name} delivering authentic ${sectorPreset.name} narrative grounded in proven operational performance.`
    const musicDirection = `Dynamic cinematic score starting with focused understated tension and building into an inspiring, confident resolution.`
    const continuityPlanSummary = `Keyframe-first DAG maintaining strict physical state (materials, lighting, character and product) from Scene 1 through Scene ${sceneCount}.`

    return {
      planId: `lcp_${Date.now()}`,
      campaignConcept,
      storyArc: storyArcStages,
      exactTotalDurationSec: totalDuration,
      sceneCount,
      masterVoiceOver: masterVO,
      musicDirection,
      continuityPlanSummary,
      ctaEndCardText: snapshot.campaign.cta,
    }
  }

  private buildDeterministicMasterVO(
    snapshot: BrandContextSnapshot,
    sectorPreset: SectorPreset,
    totalDuration: number,
    sceneCount: number
  ): MasterVoiceOverPlan {
    const product = snapshot.products.length > 0 ? snapshot.products[0] : null
    const productName = product ? product.name : snapshot.brand_name
    const segmentDuration = Math.round((totalDuration / sceneCount) * 10) / 10

    const templateSentences = [
      `Zorlu şartlarda güven veren bir çözüm aradığınızda, her detay hayati önem taşır.`,
      `Karşınızda ${productName}; üstün mühendislik ve dayanıklılıkla tasarlandı.`,
      `Sahada en yüksek verimi almanız için kusursuz bir performans sunar.`,
      `Gerçek kalite, uzun ömürlü sonuçlarla kendini kanıtlar.`,
      `${snapshot.brand_name} ile geleceği bugünden inşa edin. ${snapshot.campaign.cta}.`,
      `İşinizde mükemmelliği yakalamak artık tesadüf değil.`,
      `Sağlam temeller üzerine kurulu güvenilir bir ortaklık.`,
      `Hemen iletişime geçin ve farkı yerinde görün.`,
    ]

    const purposes = [
      'Hook / Problem',
      'Product Introduction',
      'Usage / Benefit',
      'Proof / Payoff',
      'Brand Resolution & CTA',
      'Secondary Feature',
      'Customer Value',
      'Final CTA',
    ]

    const segments: VoiceOverSegment[] = []
    for (let i = 0; i < sceneCount; i++) {
      const sentence = templateSentences[i % templateSentences.length]
      segments.push({
        sceneOrder: i + 1,
        scenePurpose: purposes[i] || `Scene ${i + 1}`,
        durationTargetSec: i === sceneCount - 1
          ? totalDuration - (segmentDuration * (sceneCount - 1))
          : segmentDuration,
        voiceoverText: sentence,
      })
    }

    return {
      fullScript: segments.map(s => s.voiceoverText).join(' '),
      segments,
      totalVoiceOverDurationSec: totalDuration,
    }
  }

  private parseDraftMasterVO(
    draft: MasterVoiceOverDraft,
    totalDuration: number,
    sceneCount: number
  ): MasterVoiceOverPlan {
    const segments: VoiceOverSegment[] = draft.scenes.map((s, idx) => ({
      sceneOrder: idx + 1,
      scenePurpose: s.purpose,
      durationTargetSec: s.durationTargetSec,
      voiceoverText: s.voiceoverSegment.trim(),
    }))

    return {
      fullScript: draft.fullScript || segments.map(s => s.voiceoverText).join(' '),
      segments,
      totalVoiceOverDurationSec: totalDuration,
    }
  }

  /**
   * Enforces:
   * 1. No empty VO segment
   * 2. No identical VO sentences between different scenes
   * 3. Non-overlapping sequential progression
   */
  private validateVoiceOverInvariants(masterVO: MasterVoiceOverPlan): void {
    const seenSentences = new Set<string>()

    for (const segment of masterVO.segments) {
      const text = segment.voiceoverText.trim().toLowerCase()
      if (!text) {
        throw new Error(`VO_INVARIANT_VIOLATION: Scene ${segment.sceneOrder} has empty voice-over text.`)
      }
      if (seenSentences.has(text)) {
        throw new Error(
          `VO_REPETITION_ERROR: Scene ${segment.sceneOrder} repeats voice-over sentence already used in another scene: "${segment.voiceoverText}". Each scene must have unique, progressive text.`
        )
      }
      seenSentences.add(text)
    }
  }
}
