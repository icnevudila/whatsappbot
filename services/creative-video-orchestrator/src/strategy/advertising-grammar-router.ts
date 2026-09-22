import type { BusinessModel, TenantAsset } from '../types/asset-intake.js'
import type { AdvertisingFormat } from './advertising-grammar-registry.js'
import { AdFormatRouter } from './ad-format-router.js'

export interface GrammarMicroBeat {
  start_sec: number
  end_sec: number
  role: 'HOOK' | 'REVEAL' | 'PROOF' | 'BENEFIT' | 'BRAND_CLOSE'
  action_description: string
  editing_instruction: string
}

export interface VoiceAsSpineRule {
  /**
   * Audio/Voice carries the advertisement across as much of the 8s duration as possible.
   * Visual and speech are co-planned on the exact same timeline.
   * Not a mechanical rule ("say something every second"), but natural conversational cadence (2.4-3.2 words/sec)
   * where speech forms the continuous spine of the ad from hook -> proof -> payoff -> end card.
   */
  is_audio_spine: true
  min_timeline_coverage_pct: number
  natural_words_per_second_range: [number, number]
  no_mechanical_padding: true
  kinetic_typography_mode: 'capcut_kinetic_neon'
}

export interface AdvertisingGrammar {
  format: AdvertisingFormat
  primary_goal: string
  visual_rhythm: string
  cut_points: number[]
  micro_beats: GrammarMicroBeat[]
  on_screen_copy_max_levels: number
  target_word_count_range: [number, number]
  voice_as_spine: VoiceAsSpineRule
}

/**
 * ShortAdFormatRouter / AdvertisingGrammarEngine.
 * Determines the advertising grammar before any storyboard or prompt is written.
 *
 * Strict Rules:
 * - Brand names must NEVER be hardcoded.
 * - For physical product promotion / conversion ads, DO NOT default to BRAND_CINEMATIC.
 * - Default toward PERFORMANCE_DEMO or PROBLEM_SOLUTION for physical/conversion products.
 * - Software / SaaS routes to SOFTWARE_DEMO or PROBLEM_SOLUTION.
 */
export class ShortAdFormatRouter extends AdFormatRouter {
  public selectFormat(
    objective: string = 'conversion',
    businessModel: BusinessModel,
    assets: TenantAsset[] = []
  ): AdvertisingFormat {
    const objLower = (objective || '').toLowerCase()

    if (businessModel === 'saas_software') {
      return objLower.includes('problem') ? 'PROBLEM_SOLUTION' : 'SOFTWARE_DEMO'
    }

    if (objLower.includes('before') || objLower.includes('after')) {
      return 'BEFORE_AFTER'
    }

    if (objLower.includes('offer') || objLower.includes('discount') || objLower.includes('price')) {
      return 'OFFER_DRIVEN'
    }

    if (objLower.includes('ugc') || objLower.includes('testimonial') || objLower.includes('customer')) {
      return 'UGC_TESTIMONIAL'
    }

    if (objLower.includes('problem') || objLower.includes('pain')) {
      return 'PROBLEM_SOLUTION'
    }

    if (objLower.includes('brand_awareness') || objLower.includes('prestige') || objLower.includes('lifestyle')) {
      return 'BRAND_CINEMATIC'
    }

    // Default for physical product / ordinary product promotion / conversion:
    // Strictly PERFORMANCE_DEMO (never BRAND_CINEMATIC)
    return 'PERFORMANCE_DEMO'
  }

  public getGrammar(format: AdvertisingFormat): AdvertisingGrammar {
    switch (format) {
      case 'PERFORMANCE_DEMO':
        return {
          format: 'PERFORMANCE_DEMO',
          primary_goal: 'Hook the user immediately, reveal the physical hero product, demonstrate functional power, and close on brand.',
          visual_rhythm: 'Rapid hook (0-0.7s) -> crisp reveal (0.7-2.2s) -> fluid dynamic proof (2.2-4.5s) -> payoff (4.5-6.2s) -> brand close (6.2-8.0s)',
          cut_points: [0.7, 2.2, 4.5, 6.2],
          micro_beats: [
            {
              start_sec: 0.0,
              end_sec: 0.7,
              role: 'HOOK',
              action_description: 'Pattern interrupt: high-energy macro detail / sudden motion',
              editing_instruction: 'Instant visual grip, zero establishing delay'
            },
            {
              start_sec: 0.7,
              end_sec: 2.2,
              role: 'REVEAL',
              action_description: 'Clear product reveal in realistic context',
              editing_instruction: 'Product identity and core form clearly showcased'
            },
            {
              start_sec: 2.2,
              end_sec: 4.5,
              role: 'PROOF',
              action_description: 'Physical product proof: mechanical operation, liquid spray, speed, or tangible output',
              editing_instruction: 'Dynamic proof in action showing real functional power'
            },
            {
              start_sec: 4.5,
              end_sec: 6.2,
              role: 'BENEFIT',
              action_description: 'Benefit and spoken punchline: ease of use, result, operator satisfaction',
              editing_instruction: 'Smooth transition to payoff'
            },
            {
              start_sec: 6.2,
              end_sec: 8.0,
              role: 'BRAND_CLOSE',
              action_description: 'Brand close and verified CTA inheriting the visual tone',
              editing_instruction: 'Seamless end card transition with authoritative logo'
            }
          ],
          on_screen_copy_max_levels: 3,
          target_word_count_range: [18, 24],
          voice_as_spine: {
            is_audio_spine: true,
            min_timeline_coverage_pct: 85,
            natural_words_per_second_range: [2.4, 3.2],
            no_mechanical_padding: true,
            kinetic_typography_mode: 'capcut_kinetic_neon'
          }
        }

      case 'PROBLEM_SOLUTION':
        return {
          format: 'PROBLEM_SOLUTION',
          primary_goal: 'Agitate a recognized friction, present the hero product as the definitive solution, and close on call-to-action.',
          visual_rhythm: 'Friction hook (0-1.5s) -> solution emergence (1.5-3.5s) -> functional proof (3.5-5.8s) -> brand resolve (5.8-8.0s)',
          cut_points: [1.5, 3.5, 5.8],
          micro_beats: [
            { start_sec: 0.0, end_sec: 1.5, role: 'HOOK', action_description: 'Visual friction/struggle', editing_instruction: 'Fast pacing' },
            { start_sec: 1.5, end_sec: 3.5, role: 'REVEAL', action_description: 'Product introduced to resolve problem', editing_instruction: 'Clean lighting transition' },
            { start_sec: 3.5, end_sec: 5.8, role: 'PROOF', action_description: 'Seamless operation and relief', editing_instruction: 'Empowered cadence' },
            { start_sec: 5.8, end_sec: 8.0, role: 'BRAND_CLOSE', action_description: 'Brand close & CTA', editing_instruction: 'Steady resolve' }
          ],
          on_screen_copy_max_levels: 3,
          target_word_count_range: [18, 24],
          voice_as_spine: {
            is_audio_spine: true,
            min_timeline_coverage_pct: 85,
            natural_words_per_second_range: [2.4, 3.2],
            no_mechanical_padding: true,
            kinetic_typography_mode: 'capcut_kinetic_neon'
          }
        }

      case 'SOFTWARE_DEMO':
        return {
          format: 'SOFTWARE_DEMO',
          primary_goal: 'Highlight digital screen interface, seamless workflow resolution, and direct CTA.',
          visual_rhythm: 'Screen problem (0-1.5s) -> UI action click (1.5-4.0s) -> green success result (4.0-6.0s) -> CTA (6.0-8.0s)',
          cut_points: [1.5, 4.0, 6.0],
          micro_beats: [
            { start_sec: 0.0, end_sec: 1.5, role: 'HOOK', action_description: 'Messy data or friction', editing_instruction: 'Urgent cadence' },
            { start_sec: 1.5, end_sec: 4.0, role: 'PROOF', action_description: 'Clean UI action and instant calculation', editing_instruction: 'Crisp macro on screen' },
            { start_sec: 4.0, end_sec: 6.0, role: 'BENEFIT', action_description: 'User relief and green dashboard stats', editing_instruction: 'Satisfying resolution' },
            { start_sec: 6.0, end_sec: 8.0, role: 'BRAND_CLOSE', action_description: 'Platform logo & trial CTA', editing_instruction: 'Clean software brand close' }
          ],
          on_screen_copy_max_levels: 3,
          target_word_count_range: [18, 24],
          voice_as_spine: {
            is_audio_spine: true,
            min_timeline_coverage_pct: 85,
            natural_words_per_second_range: [2.4, 3.2],
            no_mechanical_padding: true,
            kinetic_typography_mode: 'capcut_kinetic_neon'
          }
        }

      default:
        // Generic fallback adhering to strict 3-level copy and 18-24 word tempo
        return {
          format,
          primary_goal: 'Conversion-driven short commercial.',
          visual_rhythm: 'Hook (0-1.5s) -> Action Proof (1.5-5.0s) -> Brand Close (5.0-8.0s)',
          cut_points: [1.5, 5.0],
          micro_beats: [
            { start_sec: 0.0, end_sec: 1.5, role: 'HOOK', action_description: 'Visual hook', editing_instruction: 'Immediate engagement' },
            { start_sec: 1.5, end_sec: 5.5, role: 'PROOF', action_description: 'Product action', editing_instruction: 'Dynamic proof' },
            { start_sec: 5.5, end_sec: 8.0, role: 'BRAND_CLOSE', action_description: 'Brand close', editing_instruction: 'Authoritative close' }
          ],
          on_screen_copy_max_levels: 3,
          target_word_count_range: [18, 24],
          voice_as_spine: {
            is_audio_spine: true,
            min_timeline_coverage_pct: 85,
            natural_words_per_second_range: [2.4, 3.2],
            no_mechanical_padding: true,
            kinetic_typography_mode: 'capcut_kinetic_neon'
          }
        }
    }
  }
}
