import type { BrandContextSnapshot } from '../types/brand-snapshot.js'
import type { LongCreativePlan } from './long-video-planner.js'
import type { SectorPreset } from '../strategy/sector-presets.js'
import type { ICreativeModelProvider } from '../adapters/interfaces.js'

export interface StoryboardScene {
  sceneId: string
  parentJobId: string
  order: number
  flowProjectId: string // Strict isolation: 1 unique Flow project per scene
  durationTargetSec: number
  purpose: string
  visualDescription: string
  voiceoverSegment: string
  referencesRequired: string[]
  environment: string
  productState: string
  characterState?: string
  camera: string
  lighting: string
  motion: string
  audio: string
  negativeConstraints: string[]
  isRoot: boolean
  continuityParentSceneId?: string
}

export interface StoryboardPlan {
  storyboardId: string
  parentJobId: string
  totalScenes: number
  totalDurationSec: number
  scenes: StoryboardScene[]
  createdAt: string
}

export class StoryboardEngine {
  constructor(private creativeModel?: ICreativeModelProvider) {}

  /**
   * Translates LongCreativePlan into an actionable StoryboardPlan (1-8 primary shots).
   * Enforces strict Flow project isolation: parentJobId -> sceneId -> unique flowProjectId.
   */
  async buildStoryboard(
    parentJobId: string,
    longPlan: LongCreativePlan,
    snapshot: BrandContextSnapshot,
    sectorPreset: SectorPreset
  ): Promise<StoryboardPlan> {
    const scenes: StoryboardScene[] = []
    const primaryProduct = snapshot.products.length > 0 ? snapshot.products[0] : null
    const primaryRefs = primaryProduct ? [primaryProduct.asset_id] : []

    const cameraStyles = [
      'Establishing wide-angle dynamic tracking push-in',
      'Smooth medium-shot dolly tracking across primary action',
      'Macro close-up capturing fine material textures and authentic details',
      'Side-angle architectural slider demonstrating practical application',
      'Low-angle confident hero framing locked on tripod',
      'Dynamic orbital arc around hero subject',
      'Subtle slow-motion push with shallow depth of field',
      'Static hero composition with deliberate closing hold',
    ]

    for (let i = 0; i < longPlan.masterVoiceOver.segments.length; i++) {
      const seg = longPlan.masterVoiceOver.segments[i]
      const sceneOrder = i + 1
      const sceneId = `scene_${sceneOrder}_${parentJobId.substring(0, 8)}`
      
      // Strict rule: 1 scene = 1 unique flow_project_id. NEVER share project across scenes.
      const flowProjectId = `flow_proj_${parentJobId.substring(0, 8)}_s${sceneOrder}`
      
      const isRoot = sceneOrder === 1 || sceneOrder === 4 // Scene 1 is primary root; scene 4 can be a fresh root demonstration
      const parentSceneId = isRoot ? undefined : scenes[i - 1]?.sceneId

      const visualDesc = [
        `[Purpose: ${seg.scenePurpose}]`,
        primaryProduct ? `Hero subject ${primaryProduct.name} in authentic context.` : `Authentic commercial setting for ${snapshot.brand_name}.`,
        `Lighting reflects ${sectorPreset.lightingProfile}.`,
        `Movement character: ${sectorPreset.motionCharacter}.`,
      ].join(' ')

      scenes.push({
        sceneId,
        parentJobId,
        order: sceneOrder,
        flowProjectId,
        durationTargetSec: seg.durationTargetSec,
        purpose: seg.scenePurpose,
        visualDescription: visualDesc,
        voiceoverSegment: seg.voiceoverText,
        referencesRequired: [...primaryRefs],
        environment: sectorPreset.description,
        productState: primaryProduct ? `active, pristine ${primaryProduct.name}` : 'brand presence',
        camera: cameraStyles[(sceneOrder - 1) % cameraStyles.length],
        lighting: sectorPreset.lightingProfile,
        motion: sectorPreset.motionCharacter,
        audio: `Voice-over: "${seg.voiceoverText}". Natural foley and ambient bed.`,
        negativeConstraints: [
          ...sectorPreset.negativeVisuals,
          ...snapshot.forbidden_elements,
          'no flickering',
          'no foreign tenant brands',
        ],
        isRoot,
        continuityParentSceneId: parentSceneId,
      })
    }

    return {
      storyboardId: `sb_${parentJobId}_${Date.now()}`,
      parentJobId,
      totalScenes: scenes.length,
      totalDurationSec: longPlan.exactTotalDurationSec,
      scenes,
      createdAt: new Date().toISOString(),
    }
  }
}
