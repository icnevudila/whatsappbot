import type { BrandContextSnapshot } from '../types/brand-snapshot.js'
import type { BusinessModel, TenantAsset } from '../types/asset-intake.js'

export type StoryboardPhase = 'HOOK' | 'PRODUCT_PROOF' | 'PAYOFF'

export interface ShortStoryboardFrame {
  phase: StoryboardPhase
  timeWindowSec: { start: number; end: number }
  semanticPurpose: string
  cinematicDescription: string
  canonicalReferenceHandle: '@BrandLogo' | '@HeroProduct' | '@ProductDetail' | '@SoftwareUI' | '@EnvironmentReference' | '@ApprovedHeroFrame'
  expectedAction: string
  cameraMotion: string
  lightingMood: string
  negativeConstraints: string[]
}

export interface ShortStoryboardPlan {
  storyboardId: string
  totalDurationSec: number
  businessModel: BusinessModel
  frames: [ShortStoryboardFrame, ShortStoryboardFrame, ShortStoryboardFrame] // Exactly 3 mandatory phases
  verifiedDiversity: boolean
  promptForRawFootage: string
}

/**
 * Storyboard Director for 8-second Short Commercials.
 * Enforces the strict rule:
 * NO VEO / GENERATION CALL IS PERMITTED WITHOUT AN APPROVED 3-FRAME STORYBOARD
 * (HOOK -> PRODUCT PROOF -> PAYOFF).
 * Rejects identical crops or static angles masquerading as a storyboard.
 */
export class StoryboardDirector {
  /**
   * Plans the mandatory 3-frame storyboard before raw video generation.
   */
  public planShortCommercialStoryboard(
    snapshot: BrandContextSnapshot,
    businessModel: BusinessModel,
    assets: TenantAsset[]
  ): ShortStoryboardPlan {
    const totalDuration = snapshot.requested_duration || 8.0

    // Hook Frame (0.0s - 2.0s): Problem, tension, or dynamic entrance
    const hookFrame: ShortStoryboardFrame = {
      phase: 'HOOK',
      timeWindowSec: { start: 0.0, end: 2.0 },
      semanticPurpose: 'Immediate visual grab, establish context without logo clutter',
      cinematicDescription: this.compileHookDescription(snapshot, businessModel),
      canonicalReferenceHandle: businessModel === 'saas_software' ? '@SoftwareUI' : '@EnvironmentReference',
      expectedAction: businessModel === 'saas_software'
        ? 'Professional executive looking at messy complex data, frustrated'
        : businessModel === 'physical_product'
        ? 'Lush agricultural fruit tree foliage facing pest challenge in morning light'
        : 'Active construction foundation requiring precision structural materials',
      cameraMotion: 'Dynamic push-in with shallow depth of field',
      lightingMood: 'High contrast, dramatic morning directional light',
      negativeConstraints: ['no artificial logos', 'no floating text', 'no acrylic plaques'],
    }

    // Product Proof Frame (2.0s - 5.5s): Authentic canonical product or UI in action
    const proofFrame: ShortStoryboardFrame = {
      phase: 'PRODUCT_PROOF',
      timeWindowSec: { start: 2.0, end: 5.5 },
      semanticPurpose: 'Authentic product in action, proving core value proposition',
      cinematicDescription: this.compileProofDescription(snapshot, businessModel),
      canonicalReferenceHandle: businessModel === 'saas_software' ? '@SoftwareUI' : '@HeroProduct',
      expectedAction: businessModel === 'saas_software'
        ? 'Crisp real dashboard UI on laptop screen filtering verified customer pins instantly'
        : businessModel === 'physical_product'
        ? 'Farmer smoothly operating battery sprayer misting fine atomized droplets onto leaves'
        : 'Skilled mason placing clean terracotta hollow brick with trowel onto fresh mortar line',
      cameraMotion: 'Slow lateral tracking shot following the action',
      lightingMood: 'Crisp, natural daylight with rich authentic textures',
      negativeConstraints: ['no logo hallucination', 'no distorted hands', 'no impossible wand disconnection'],
    }

    // Payoff Frame (5.5s - 8.0s): Result payoff leading into deterministic brand close
    const payoffFrame: ShortStoryboardFrame = {
      phase: 'PAYOFF',
      timeWindowSec: { start: 5.5, end: totalDuration },
      semanticPurpose: 'Satisfying payoff and clean transition to deterministic brand end card',
      cinematicDescription: this.compilePayoffDescription(snapshot, businessModel),
      canonicalReferenceHandle: '@HeroProduct',
      expectedAction: businessModel === 'saas_software'
        ? 'Executive smiles in modern office as dashboard shows conversion graph surging upward'
        : businessModel === 'physical_product'
        ? 'Healthy radiant orchard canopy glistening with fine dew under golden hour sunlight'
        : 'Solid, perfectly aligned brick wall standing proud under blue sky on completed structure',
      cameraMotion: 'Elevating pedestal shot pulling back smoothly',
      lightingMood: 'Warm golden hour, triumphant clarity',
      negativeConstraints: ['no AI drawn logo on screen', 'no hallucinated watermark'],
    }

    const frames: [ShortStoryboardFrame, ShortStoryboardFrame, ShortStoryboardFrame] = [
      hookFrame,
      proofFrame,
      payoffFrame,
    ]

    // Verify semantic diversity (reject duplicate static stills)
    const isDiverse = this.verifySemanticDiversity(frames)
    if (!isDiverse) {
      throw new Error('[StoryboardDirector] FAILED: Storyboard lacks semantic diversity across Hook, Proof, and Payoff.')
    }

    // Compile minimal-delta prompt strictly for raw cinematic footage (no logos, no typography)
    const promptForRawFootage = this.compileRawFootagePrompt(snapshot, frames)

    return {
      storyboardId: `sb_${Date.now()}`,
      totalDurationSec: totalDuration,
      businessModel,
      frames,
      verifiedDiversity: isDiverse,
      promptForRawFootage,
    }
  }

  /**
   * Rejects storyboard if any 2 frames share the same action or description (preventing static crop clones).
   */
  public verifySemanticDiversity(frames: [ShortStoryboardFrame, ShortStoryboardFrame, ShortStoryboardFrame]): boolean {
    const actions = new Set(frames.map(f => f.expectedAction.toLowerCase()))
    const purposes = new Set(frames.map(f => f.semanticPurpose.toLowerCase()))
    return actions.size === 3 && purposes.size === 3
  }

  private compileHookDescription(snapshot: BrandContextSnapshot, businessModel: BusinessModel): string {
    return `Cinematic 9:16 macro shot opening in authentic ${snapshot.sector_profile} environment.`
  }

  private compileProofDescription(snapshot: BrandContextSnapshot, businessModel: BusinessModel): string {
    const prodName = snapshot.products[0]?.name || 'canonical product'
    return `Hero shot showcasing @HeroProduct (${prodName}) performing authentic work with precision.`
  }

  private compilePayoffDescription(snapshot: BrandContextSnapshot, businessModel: BusinessModel): string {
    return `Triumphant resolution showing flawless results in ${snapshot.sector_profile}, preparing clean focal space for brand closing.`
  }

  private compileRawFootagePrompt(
    snapshot: BrandContextSnapshot,
    frames: [ShortStoryboardFrame, ShortStoryboardFrame, ShortStoryboardFrame]
  ): string {
    return [
      `A professional cinematic commercial short ad, vertical 9:16 aspect ratio.`,
      `Hook (0-2s): ${frames[0].expectedAction}. ${frames[0].cameraMotion}.`,
      `Product in Action (2-5.5s): ${frames[1].expectedAction}. Preserve @HeroProduct shape, materials, and form exactly. ${frames[1].cameraMotion}.`,
      `Payoff (5.5-8s): ${frames[2].expectedAction}. ${frames[2].cameraMotion}, golden hour lighting.`,
      `CRITICAL DIRECTIVE: Do NOT render any logos, brand names, watermarks, text, or typography in the video frame. All branding is applied deterministically post-generation.`,
    ].join(' ')
  }
}
