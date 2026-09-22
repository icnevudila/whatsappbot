import type { BrandContextSnapshot } from '../types/brand-snapshot.js'
import { globalSectorPresetRegistry, type SectorPreset } from './sector-presets.js'

export type VideoStrategyType = 'SHORT_VIDEO' | 'LONG_VIDEO'
export type ShortStrategySubtype = 'F1_FIDELITY_R2V' | 'F2_KEYFRAME_I2V'
export type LongStrategySubtype = 'LONG_STORYBOARD_DAG'

export interface StrategyRoutingDecision {
  strategyType: VideoStrategyType
  subtype: ShortStrategySubtype | LongStrategySubtype
  sectorPreset: SectorPreset
  estimatedSceneCount: number
  targetDurationSeconds: number
  rationale: string
}

export class VideoStrategyRouter {
  constructor(private presetRegistry = globalSectorPresetRegistry) {}

  route(snapshot: BrandContextSnapshot): StrategyRoutingDecision {
    const sectorPreset = this.presetRegistry.get(snapshot.sector_profile)
    const duration = snapshot.requested_duration || 8
    const outputType = snapshot.output_type || 'AUTO'

    let strategyType: VideoStrategyType
    if (outputType === 'SHORT_VIDEO') {
      strategyType = 'SHORT_VIDEO'
    } else if (outputType === 'LONG_VIDEO') {
      strategyType = 'LONG_VIDEO'
    } else {
      // AUTO mode: <= 15s is SHORT, > 15s is LONG
      strategyType = duration <= 15 ? 'SHORT_VIDEO' : 'LONG_VIDEO'
    }

    if (strategyType === 'SHORT_VIDEO') {
      // If product has strict prohibited mutations or high fidelity requirement, use F1 R2V
      // If cinematic style or complex composition is requested, use F2 Keyframe -> I2V
      const hasProductRef = snapshot.products.length > 0 && snapshot.products[0].sha256
      const wantsCinematicKeyframe =
        snapshot.visual_style.some(s => s.toLowerCase().includes('cinematic') || s.toLowerCase().includes('keyframe'))
      
      const subtype: ShortStrategySubtype = (wantsCinematicKeyframe && hasProductRef)
        ? 'F2_KEYFRAME_I2V'
        : 'F1_FIDELITY_R2V'

      return {
        strategyType: 'SHORT_VIDEO',
        subtype,
        sectorPreset,
        estimatedSceneCount: 1,
        targetDurationSeconds: duration,
        rationale: `Selected Short Video [${subtype}] for ${duration}s duration under sector ${sectorPreset.name}.`,
      }
    } else {
      // Long video: 15s - 60s
      // Typical scene count: 1 scene every 6 to 10 seconds (e.g. 35-40s -> 4 to 5 scenes)
      const estimatedSceneCount = Math.max(2, Math.min(8, Math.round(duration / 8)))

      return {
        strategyType: 'LONG_VIDEO',
        subtype: 'LONG_STORYBOARD_DAG',
        sectorPreset,
        estimatedSceneCount,
        targetDurationSeconds: duration,
        rationale: `Selected Long Video Storyboard DAG (${estimatedSceneCount} scenes) for ${duration}s total duration under sector ${sectorPreset.name}.`,
      }
    }
  }
}
