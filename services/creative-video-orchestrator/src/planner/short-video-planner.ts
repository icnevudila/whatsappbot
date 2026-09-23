import type { BrandContextSnapshot } from '../types/brand-snapshot.js'
import type { ReferenceRegistry } from '../types/reference-registry.js'
import type { FlowAccountCapabilities, ICreativeModelProvider } from '../adapters/interfaces.js'
import type { ShortStrategySubtype } from '../strategy/video-strategy-router.js'
import { buildDeterministicFinishingPlan, type DeterministicFinishingPlan } from '../finishing/deterministic-finishing-plan.js'

export interface ShortCreativePlan {
  planId: string
  strategy: ShortStrategySubtype
  hook: string
  productHeroAction: string
  environment: string
  camera: string
  lighting: string
  motion: string
  audioIntent: string
  closingIntent: string
  promptTemplate: string
  compiledPrompt: string
  expectedReferenceIds: string[]
  finishingPlan: DeterministicFinishingPlan
}

export class ShortVideoPlanner {
  constructor(
    private creativeModel?: ICreativeModelProvider
  ) {}

  /**
   * Plans a high-impact, brand-grounded short commercial.
   * Produces expectedReferenceIds based on active provider capabilities.
   * NOTE: The invariant check (expected === actual) is executed post-generation as an execution gate,
   * NOT inside this planning stage.
   */
  async plan(
    snapshot: BrandContextSnapshot,
    registry: ReferenceRegistry,
    capabilities: FlowAccountCapabilities,
    subtype: ShortStrategySubtype = 'F1_FIDELITY_R2V'
  ): Promise<ShortCreativePlan> {
    const primaryProduct = snapshot.products.length > 0 ? snapshot.products[0] : undefined

    // 1. Gather required reference IDs within provider capability limit
    const maxRefs = capabilities.maxReferenceImages || 2
    const expectedReferenceIds: string[] = []

    if (primaryProduct) {
      expectedReferenceIds.push(primaryProduct.asset_id)
    }

    // Attach logo ref if capability permits and logo asset is present
    if (expectedReferenceIds.length < maxRefs && snapshot.logo_asset_id) {
      expectedReferenceIds.push(snapshot.logo_asset_id)
    }

    // Attach additional reference assets if room
    for (const ref of snapshot.reference_assets) {
      if (expectedReferenceIds.length >= maxRefs) break
      if (!expectedReferenceIds.includes(ref.asset_id)) {
        expectedReferenceIds.push(ref.asset_id)
      }
    }

    // 2. Draft creative concepts via creative model or deterministic rulebase
    let hook = 'Dynamic visual hook introducing the product in an authentic premium setting.'
    let productHeroAction = primaryProduct
      ? `High-precision operational demonstration of ${primaryProduct.name}, highlighting key functional attributes.`
      : 'Hero visual presentation focusing on primary brand value.'
    let environment = snapshot.visual_style.join(', ') || 'Authentic commercial cinematography'
    let camera = 'Cinematic forward dolly with smooth stabilization and macro product focus.'
    let lighting = 'High-contrast commercial lighting with crisp specular rim accents.'
    let motion = 'Purposeful, fluid motion with confident hold on product payoff.'
    let audioIntent = `Upbeat commercial soundscape with crisp foley and closing brand voice: "${snapshot.campaign.cta}".`
    let closingIntent = `Hero lock framing with direct visual prompt for action: ${snapshot.campaign.cta}.`

    if (this.creativeModel) {
      const draft = await this.creativeModel.generateCreativePlan(snapshot, {
        name: snapshot.sector_profile,
        defaultArchetype: 'product_hero',
      })
      hook = draft.hook || hook
      productHeroAction = draft.productHeroAction || productHeroAction
      environment = draft.environment || environment
      camera = draft.cameraLanguage || camera
      lighting = draft.lightingStyle || lighting
      motion = draft.motionRhythm || motion
      audioIntent = draft.audioDirection || audioIntent
      closingIntent = draft.closingCTAIntent || closingIntent
    }

    // 3. Compile prompt template with canonical handles
    const promptTemplate = [
      `[Scene Opening]: ${hook}`,
      primaryProduct ? `[Subject]: @HeroProduct performing ${productHeroAction}` : `[Subject]: ${productHeroAction}`,
      `[Setting & Environment]: ${environment}`,
      `[Cinematography]: ${camera}, ${lighting}`,
      `[Motion]: ${motion}`,
      `[Ending Action]: ${closingIntent}`,
      `[Negative Constraints]: strictly no on-screen text, no typography, no words, no letters, no subtitles, no captions, no watermark, no lower thirds, no distorted branding, no cartoon animation, no amateur blur, strictly clean live-action video footage.`,
    ].join(' | ')

    // Replace canonical handles with vision-grounded descriptors for Veo compiler
    const compiledPrompt = registry.compilePromptWithGrounding(promptTemplate)

    // 4. Attach deterministic finishing specification
    const finishingPlan = buildDeterministicFinishingPlan(snapshot)

    return {
      planId: `scp_${Date.now()}`,
      strategy: subtype,
      hook,
      productHeroAction,
      environment,
      camera,
      lighting,
      motion,
      audioIntent,
      closingIntent,
      promptTemplate,
      compiledPrompt,
      expectedReferenceIds,
      finishingPlan,
    }
  }

  /**
   * Execution Gate: Verifies that expected reference IDs match the actual attached reference IDs
   * reported by GFlowProvider after execution.
   */
  static verifyReferenceExecutionGate(
    expectedReferenceIds: string[],
    actualAttachedReferenceIds: string[]
  ): { passed: boolean; error?: string } {
    if (expectedReferenceIds.length !== actualAttachedReferenceIds.length) {
      return {
        passed: false,
        error: `REFERENCE_MISMATCH_ERROR: Expected ${expectedReferenceIds.length} references [${expectedReferenceIds.join(', ')}], but GFlow attached ${actualAttachedReferenceIds.length} [${actualAttachedReferenceIds.join(', ')}]`,
      }
    }

    const expectedSorted = [...expectedReferenceIds].sort()
    const actualSorted = [...actualAttachedReferenceIds].sort()

    for (let i = 0; i < expectedSorted.length; i++) {
      if (expectedSorted[i] !== actualSorted[i]) {
        return {
          passed: false,
          error: `REFERENCE_INTEGRITY_ERROR: Reference ID mismatch at index ${i}: expected ${expectedSorted[i]}, got ${actualSorted[i]}`,
        }
      }
    }

    return { passed: true }
  }
}
