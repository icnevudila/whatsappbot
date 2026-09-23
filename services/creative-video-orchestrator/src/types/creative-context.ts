import type { AdvertisingFormat } from '../strategy/advertising-grammar-registry.js'
import type { CreativeFingerprint } from '../strategy/creative-diversity-guard.js'
import type { SubtitleMode } from './job-asset-manifest.js'

export interface MultimodalAttachment {
  asset_id: string
  org_id: string
  sha256: string
  role: 'logo' | 'hero_product' | 'product_detail' | 'software_ui' | 'extra_reference' | string
  canonical_handle: '@BrandLogo' | '@HeroProduct' | '@ProductDetail' | '@SoftwareUI' | '@ExtraReference' | string
  file_path: string
  url?: string
  provider_attachment_id?: string
  media_id?: string
  attached_successfully: boolean
  visual_attributes?: {
    shape?: string
    proportions?: string
    primary_colors?: string[]
    visible_handles?: boolean
    visible_controls?: boolean
    packaging?: string
    important_geometry?: string
  }
}

export interface JobAssetManifestContext {
  manifest_version: string
  org_id: string
  job_id: string
  expected_asset_count: number
  attached_asset_count: number
  attachments: MultimodalAttachment[]
  all_attached: boolean
}

export interface BrandCreativeProfile {
  brand_name: string
  sector: string
  tone_of_voice: string[]
  visual_personality: string
  palette: string[]
  typography_preferences: string
  preferred_copy_style: string
  preferred_visual_energy: string
  logo_usage_rules: string[]
  visual_dos: string[]
  visual_donts: string[]
  approved_patterns: string[]
  rejected_patterns: string[]
  successful_creative_traits: string[]
}

export interface VerifiedFact {
  claim: string
  source_type: 'catalog' | 'manual_verified' | 'offer_spec' | 'campaign_brief'
  source_id: string
  unverified_warning?: string
}

export interface CampaignCreativeContext {
  selected_product_or_service: string
  campaign_objective: string
  user_style_preference: string
  target_platform: string
  duration: number
  aspect_ratio: string
  language: string
  campaign_message?: string
  verified_offer?: string
  verified_price?: string
  verified_cta?: string
  verified_phone?: string
  verified_url?: string
  user_notes?: string
  subtitle_mode: SubtitleMode
}

export interface OptionalReferenceStyleProfile {
  reference_id: string
  hook_style: string
  first_frame_style: string
  shot_frequency: number // shots per 8s
  approximate_shot_duration: number // seconds
  camera_energy: 'calm' | 'dynamic' | 'rapid' | 'macro_intense'
  human_presence: boolean
  product_screen_time_ratio: number // 0.0 to 1.0
  speech_density: 'sparse' | 'continuous' | 'high_energy'
  subtitle_density: 'minimal' | 'line_by_line' | 'off'
  lighting_style: string
  transition_style: string
  ending_style: string
  non_copying_directive: string
}

export interface UserCreativePreferences {
  style_preference?: string
  pacing?: 'auto' | 'fast' | 'cinematic'
  voice_gender?: 'male' | 'female' | 'auto'
  color_accents?: string[]
}

export interface CreativeContext {
  org_id: string
  job_id: string
  campaign_id?: string
  brand_profile: BrandCreativeProfile
  campaign_context: CampaignCreativeContext
  asset_manifest: JobAssetManifestContext
  recent_fingerprints: CreativeFingerprint[]
  user_preferences: UserCreativePreferences
  verified_facts: VerifiedFact[]
  reference_style_profile?: OptionalReferenceStyleProfile
}

export class CreativeContextBuilder {
  public static build(params: {
    org_id: string
    job_id: string
    campaign_id?: string
    brand_profile: BrandCreativeProfile
    campaign_context: CampaignCreativeContext
    attachments: MultimodalAttachment[]
    recent_fingerprints?: CreativeFingerprint[]
    user_preferences?: UserCreativePreferences
    verified_facts?: VerifiedFact[]
    reference_style_profile?: OptionalReferenceStyleProfile
  }): CreativeContext {
    const expected = params.attachments.length
    const attached = params.attachments.filter(a => a.attached_successfully).length

    if (expected !== attached) {
      throw new Error(
        `GPT_ASSET_ATTACHMENT_FAILED: Expected ${expected} assets to attach to GPT context, but only ${attached} attached successfully.`
      )
    }

    return {
      org_id: params.org_id,
      job_id: params.job_id,
      campaign_id: params.campaign_id,
      brand_profile: params.brand_profile,
      campaign_context: params.campaign_context,
      asset_manifest: {
        manifest_version: '2026.09',
        org_id: params.org_id,
        job_id: params.job_id,
        expected_asset_count: expected,
        attached_asset_count: attached,
        attachments: params.attachments,
        all_attached: expected === attached,
      },
      recent_fingerprints: params.recent_fingerprints || [],
      user_preferences: params.user_preferences || {},
      verified_facts: params.verified_facts || [],
      reference_style_profile: params.reference_style_profile,
    }
  }
}
