import type { BrandContextSnapshot } from '../types/brand-snapshot.js'
import type { ReferenceRegistry } from '../types/reference-registry.js'
import type { StoryboardScene } from '../planner/storyboard-engine.js'
import type { FlowAccountCapabilities, ICreativeModelProvider } from '../adapters/interfaces.js'
import type { VisualStateInventory } from '../graph/continuity-graph.js'

export type GenerationMode =
  | 'R2V'
  | 'I2V'
  | 'EXTEND'
  | 'STANDALONE_CLIP' // Safe long fallback mode

export interface CompiledSceneExecutionPlan {
  sceneId: string
  flowProjectId: string
  generationMode: GenerationMode
  compiledPrompt: string
  referenceAssetIds: string[]
  durationSec: number
  isSafeFallback: boolean
  rationale: string
}

export class ScenePromptCompiler {
  constructor(private creativeModel?: ICreativeModelProvider) {}

  /**
   * Compiles scene prompt and selects optimal Flow generation mode based on probed account capabilities.
   * If native multi-scene / extend features are not active on the account,
   * safely falls back to independent Veo clips for deterministic local FFmpeg composition.
   */
  async compileScene(
    scene: StoryboardScene,
    snapshot: BrandContextSnapshot,
    registry: ReferenceRegistry,
    capabilities: FlowAccountCapabilities,
    continuityState?: VisualStateInventory,
    approvedKeyframePath?: string
  ): Promise<CompiledSceneExecutionPlan> {
    // 1. Determine generation mode based on account capabilities probe
    let generationMode: GenerationMode = 'R2V'
    let isSafeFallback = false
    let rationale = ''

    if (approvedKeyframePath && capabilities.supportsI2V) {
      generationMode = 'I2V'
      rationale = 'Account supports I2V with approved hero keyframe.'
    } else if (scene.referencesRequired.length > 0 && capabilities.supportsR2V) {
      generationMode = 'R2V'
      rationale = `Account supports R2V with ${scene.referencesRequired.length} active references.`
    } else {
      generationMode = 'STANDALONE_CLIP'
      isSafeFallback = true
      rationale = 'Safe Fallback: Independent scene clip for local deterministic FFmpeg composition.'
    }

    // 2. Compile prompt text
    let promptText = ''
    if (this.creativeModel) {
      promptText = await this.creativeModel.compileScenePrompt(
        scene as any,
        snapshot,
        registry,
        continuityState
      )
    } else {
      promptText = this.buildDeterministicScenePrompt(scene, snapshot, registry, continuityState)
    }

    // Ground handles to vision-derived descriptions
    const compiledPrompt = registry.compilePromptWithGrounding(promptText)

    // Filter reference asset IDs according to capability limit
    const maxRefs = capabilities.maxReferenceImages || 2
    const referenceAssetIds = scene.referencesRequired.slice(0, maxRefs)

    return {
      sceneId: scene.sceneId,
      flowProjectId: scene.flowProjectId,
      generationMode,
      compiledPrompt,
      referenceAssetIds,
      durationSec: scene.durationTargetSec,
      isSafeFallback,
      rationale,
    }
  }

  private buildDeterministicScenePrompt(
    scene: StoryboardScene,
    snapshot: BrandContextSnapshot,
    registry: ReferenceRegistry,
    continuityState?: VisualStateInventory
  ): string {
    const primaryProduct = snapshot.products.length > 0 ? snapshot.products[0] : null

    const promptTokens = [
      `Cinematic commercial scene for ${snapshot.brand_name}`,
      `[Action]: ${scene.visualDescription}`,
      primaryProduct ? `[Subject Focus]: @HeroProduct in ${scene.productState}` : `[Brand Presence]: high-fidelity`,
      `[Environment]: ${continuityState?.environment || scene.environment}`,
      `[Camera]: ${scene.camera}`,
      `[Lighting]: ${continuityState?.lightingProfile || scene.lighting}`,
      `[Motion]: ${scene.motion}`,
      `[Spoken Spoken Dialogue]: none, visual performance only`,
      `[Constraints]: ${scene.negativeConstraints.join(', ')}`,
    ]

    return promptTokens.join(' | ')
  }
}
