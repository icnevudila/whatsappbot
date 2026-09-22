export type BeatPurpose =
  | 'HOOK'
  | 'PRODUCT_PROOF'
  | 'PAYOFF'
  | 'PRODUCT_TRUTH'
  | 'ACTION_PROOF'
  | 'REVEAL'
  | 'BENEFIT'
  | 'BRAND_CLOSE'

export interface MasterPlanBeat {
  start: number // e.g. 0.0
  end: number   // e.g. 2.0
  purpose: BeatPurpose
  visual_action: string
  product_action: string
  actor_action: string
  environment: string
  camera: string
  lighting: string
  physics_constraints: string[]
  voiceover?: string
  dialogue?: string
  sfx: string
  ambience: string
}

export type LogoStrategy =
  | 'DIEGETIC_BRANDING'
  | 'GRAPHIC_OVERLAY'
  | 'END_CARD'
  | 'DIEGETIC_BRANDING + END_CARD'
  | 'GRAPHIC_OVERLAY + END_CARD'
  | 'DIEGETIC_BRANDING + GRAPHIC_OVERLAY + END_CARD'
  | 'DIEGETIC_SURFACE'
  | 'MIXED'

export interface DiegeticBrandingItem {
  surface_type: string // e.g. "tank_emboss", "uniform_patch", "crate_stencil"
  visibility_window: { start: number; end: number }
  description: string
}

export interface OverlayPlanItem {
  type: 'lower_third' | 'product_badge' | 'price_tag'
  start_sec: number
  end_sec: number
  text_line_1: string
  text_line_2?: string
  accent_color: string
  bg_color: string
  mobile_safe_zone: boolean
}

import type { AdvertisingFormat, FormatVariant } from '../strategy/advertising-grammar-registry.js'
import type { CreativeFingerprint } from '../strategy/creative-diversity-guard.js'
import type { SubtitleMode } from '../types/job-asset-manifest.js'

export interface MasterEndCardPlan {
  start_sec: number
  end_sec: number
  template_family: string
  headline: string
  offer?: string
  price?: string
  cta_text: string
  website_or_phone: string
  background_color: string
  accent_color: string
  visual_transition?: 'footage_frame_hold' | 'silhouette_continuation' | 'darkened_wash' | 'background_continuation'
}

export type SpeechMode = 'native_veo_dialogue' | 'external_voiceover'

export interface SpokenLineItem {
  start: number
  end: number
  speaker: string
  text: string
  delivery_style?: string
}

export interface SpeechTimelineItem {
  start_sec: number
  end_sec: number
  exact_text: string
  speaker: string
  delivery: string
  corresponding_visual_beat: string
}

export interface EditingRhythmPlan {
  cut_points: number[]
  visual_rhythm: string
  hook_frame: string
  product_reveal_frame: string
  proof_frame: string
  payoff_frame: string
  brand_close_frame: string
}

export interface OnScreenCopyPlan {
  hook?: string
  benefit_or_proof?: string
  brand_or_cta?: string
}

export interface AudioPlan {
  spoken_language: 'tr-TR' | string
  speech_mode: SpeechMode
  exact_spoken_lines: SpokenLineItem[]
  speech_timeline?: SpeechTimelineItem[]
  master_spoken_script?: string
  allow_paraphrase: false
  allow_translation: false
  allow_extra_dialogue: false
  ambient_audio_description?: string
  sound_effects_description?: string
}

export interface ShortAdMasterPlan {
  plan_id?: string
  brand_name?: string
  ad_format?: AdvertisingFormat
  selected_ad_format?: AdvertisingFormat
  selected_format_variant?: FormatVariant
  selection_reason?: string
  creative_fingerprint?: CreativeFingerprint
  subtitles_mode?: SubtitleMode
  creative_idea: string
  advertising_hook: string
  product_truth: string
  audience_value: string
  story_arc: string
  beats: MasterPlanBeat[]
  audio_plan: AudioPlan
  master_spoken_script?: string
  speech_timeline?: SpeechTimelineItem[]
  editing_rhythm?: EditingRhythmPlan
  on_screen_copy?: OnScreenCopyPlan
  voiceover_script: string
  subtitle_plan: Array<{ start: number; end: number; text: string }>
  logo_strategy: LogoStrategy
  diegetic_branding_plan: DiegeticBrandingItem[]
  overlay_plan: OverlayPlanItem[]
  end_card_plan: MasterEndCardPlan
  negative_constraints: string[]
  canonical_asset_handles: string[]
  veo_generation_intent: string
}

// Backward-compatible alias for existing imports
export type TimedBeat = MasterPlanBeat
