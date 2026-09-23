import type { OptionalReferenceStyleProfile } from '../types/creative-context.js'

export interface ReferenceVideoAnalysisInput {
  reference_id: string
  video_path_or_url: string
  duration_sec?: number
  has_human_actor?: boolean
  energy_rating?: 'calm' | 'dynamic' | 'rapid' | 'macro_intense'
  tags?: string[]
}

export class ReferenceStyleAnalyzer {
  /**
   * Analyzes an optional reference commercial ad to extract pacing, camera energy,
   * and structural tendencies without copying any protected brand, product, character, or dialogue.
   */
  public analyzeReferenceAd(input: ReferenceVideoAnalysisInput): OptionalReferenceStyleProfile {
    const isRapid = input.tags?.includes('fast') || input.energy_rating === 'rapid'
    const isMacro = input.tags?.includes('macro') || input.energy_rating === 'macro_intense'

    const cameraEnergy = input.energy_rating || (isRapid ? 'rapid' : isMacro ? 'macro_intense' : 'dynamic')
    const shotFrequency = isRapid ? 6 : isMacro ? 5 : 4
    const approxDuration = 8.0 / shotFrequency

    return {
      reference_id: input.reference_id,
      hook_style: isMacro ? 'macro_texture_reveal' : isRapid ? 'rapid_action_impact' : 'product_in_action',
      first_frame_style: isMacro ? 'close_up_product_detail' : 'wide_natural_action',
      shot_frequency: shotFrequency,
      approximate_shot_duration: Math.round(approxDuration * 10) / 10,
      camera_energy: cameraEnergy,
      human_presence: input.has_human_actor ?? true,
      product_screen_time_ratio: isMacro ? 0.85 : 0.65,
      speech_density: isRapid ? 'high_energy' : 'continuous',
      subtitle_density: 'line_by_line',
      lighting_style: isMacro ? 'high_contrast_studio_rim' : 'natural_commercial_daylight',
      transition_style: isRapid ? 'whip_pan_fast_cut' : 'smooth_axial_cut',
      ending_style: 'clean_product_hero_hold',
      non_copying_directive:
        'DO NOT copy the reference ad’s brand, product, characters, wording, distinctive creative expression, or exact scene sequence. Use ONLY high-level pacing, production characteristics, and stylistic tendencies.',
    }
  }
}
