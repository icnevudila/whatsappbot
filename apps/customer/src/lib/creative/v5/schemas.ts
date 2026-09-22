/**
 * MESAJIFY VIDEO ENGINE V5 - CORE SCHEMAS & TYPES
 * Universal, sector-independent ontology and machine-readable data contracts.
 */

import type { CreativeDNASnapshot } from './creative-dna'
import type { SceneContract, CreativeGrammarType } from './scene-contract'
import type { CreativeOptimizationScore, CreativeHistoryItem } from './creative-memory'

// A. Offer Type
export type OfferType =
  | 'physical_product'
  | 'food_or_consumable'
  | 'local_service'
  | 'professional_service'
  | 'digital_product_or_saas'
  | 'venue_or_experience'
  | 'property_or_high_consideration_offer'
  | 'event_or_education'
  | 'unknown'

// B. Campaign Objective
export type CampaignObjective =
  | 'awareness'
  | 'product_demonstration'
  | 'lead_generation'
  | 'quote_request'
  | 'direct_order'
  | 'store_visit'
  | 'appointment_booking'
  | 'launch'
  | 'promotion'
  | 'trust_building'
  | 'retention'

// C. Proof Mode
export type ProofMode =
  | 'product_in_use'
  | 'process'
  | 'scale_or_inventory'
  | 'craftsmanship'
  | 'interface_workflow'
  | 'environment_or_experience'
  | 'human_expertise'
  | 'social_proof_only_if_supplied'
  | 'offer_value'
  | 'none_available'

// D. Primary Value
export type PrimaryValue =
  | 'saves_time'
  | 'reduces_effort'
  | 'improves_control'
  | 'convenience'
  | 'quality_or_craft'
  | 'access_or_discovery'
  | 'speed'
  | 'price_or_value'
  | 'reliability'
  | 'comfort'
  | 'sensory_appeal'
  | 'status_or_design'
  | 'trust_or_safety'
  | 'availability'
  | 'other_verified'

// E. Visual Affordance
export type VisualAffordanceAction =
  | 'toggle_open_close'
  | 'press_trigger_switch'
  | 'pour_drizzle_flow'
  | 'cut_slice_carve'
  | 'lift_stack_haul'
  | 'rotate_unfold_extend'
  | 'apply_spray_mist'
  | 'pack_box_deliver'
  | 'screen_tap_filter_result'
  | 'artisan_expert_touch'
  | 'enter_experience_space'
  | 'material_texture_shift'
  | 'service_process_outcome'
  | 'human_delight_reaction'

// F. Trust and Risk Class
export type TrustAndRiskClass =
  | 'standard'
  | 'high_consideration'
  | 'regulated_health'
  | 'finance_or_investment'
  | 'children_or_sensitive'
  | 'legal_or_professional_claim'

// G. Asset State
export interface AssetState {
  productReference: boolean
  productReferenceUrl?: string | null
  logoReference: boolean
  logoReferenceUrl?: string | null
  locationReference: boolean
  locationReferenceUrl?: string | null
  personReference: boolean
  personReferenceUrl?: string | null
}

// Creative Strategy Archetypes
export type CreativeStrategyType =
  | 'problem_solution'
  | 'product_demonstration'
  | 'result_first'
  | 'process_proof'
  | 'scale_and_availability'
  | 'sensory_desire'
  | 'discovery_or_opportunity'
  | 'convenience'
  | 'craftsmanship'
  | 'trust_and_expertise'
  | 'offer_and_urgency'
  | 'experience_preview'
  | 'comparison_without_unverified_claims'

// Hook Families
export type HookFamily =
  | 'action_begins_immediately'
  | 'transformation_reveal'
  | 'tactile_macro'
  | 'result_first'
  | 'scale_reveal'
  | 'unexpected_perspective'
  | 'interface_event'
  | 'human_reaction'
  | 'process_precision'
  | 'sensory_motion'
  | 'before_after_only_if_truthful_and_safe'

// Hook Candidate for Multi-candidate scoring
export interface HookCandidate {
  id: string
  type: 'action_focused' | 'result_reveal_focused' | 'curiosity_or_scale_focused'
  family: HookFamily
  visualEventDescription: string
  scores: {
    actionSpeed: number         // 1-10: immediate tangible motion <=0.5s
    relevanceToOffer: number     // 1-10: direct tie to verified product/value
    visualImpact: number         // 1-10: striking framing, tactile depth
    physicalPlausibility: number // 1-10: realistic physics, no CGI uncanny valley
    clarityWithoutText: number   // 1-10: communicates clearly with zero dynamic text cards
  }
  totalScore: number
  reason: string
}

// Raw User Input Interface
export interface UserVideoInput {
  brandName?: string | null
  about?: string | null
  sectorHint?: string | null
  brief: string
  customVoiceover?: string | null
  customText?: string | null
  ctaText?: string | null
  ctaDestination?: string | null
  campaignDeadline?: string | null
  deliveryArea?: string | null
  cameraMode?: 'continuous_take' | 'three_cut'
  targetDurationSeconds?: number
  creativeHistory?: CreativeHistoryItem[]
  products?: Array<{
    name: string
    description?: string | null
    price?: string | null
    promo?: string | null
    imageUrl?: string | null
    features?: string[]
  }>
  phones?: Array<{ phone: string; label?: string | null }>
  logoUrl?: string | null
  productImageUrl?: string | null
  referenceImageUrl?: string | null
  brandKit?: {
    name?: string | null
    colors?: {
      primary?: string
      secondary?: string
      accent?: string
      background?: string
      text?: string
    }
    fonts?: {
      primary?: string
      heading?: string
    }
    logoUrl?: string | null
  }
  videoSpeech?: boolean
  style?: string | null
}

// 1. Kilitli Marka Kimliği (Doğrudan Girdiden Taşınır, Model Değiştiremez)
export interface LockedBrandIdentity {
  brandName: string | null
  originalLogoUrl: string | null
  colors: {
    primary?: string
    secondary?: string
    accent?: string
    background?: string
    text?: string
  }
  fonts?: {
    primary?: string
    heading?: string
  }
  isLocked: true
}

// 5. Gerçek Referans Görseli Girişi (Image-to-Video / First Frame)
export interface ReferenceAssetInput {
  hasImageInput: boolean
  imageUrl: string | null
  mode: 'first_frame' | 'product_reference' | 'none'
  motionDirective: string
}

// Structured Percentage & Claim Verification Types
export type PercentageClaimType = 'discount' | 'material_composition' | 'interest_or_financial' | 'specification'

export interface StructuredPercentageFact {
  productName: string | null     // Product name if bound to one, or null if universal
  claimType: PercentageClaimType // 'discount' vs 'material_composition' vs 'specification'
  rate: number                   // e.g. 50, 10
  rawText: string                // e.g. "%50 pamuk", "%10 indirim"
  property?: string | null       // e.g. "pamuk", "yün", "indirim", "iskonto"
  condition?: string | null      // e.g. "toptan alımlarda"
  isWholesale: boolean           // true iff 'toptan' explicitly present
}

export interface StructuredProductFact {
  name: string
  price: string | null
  currency: string | null
  discount: string | null
  discounts: StructuredPercentageFact[]
  materials: StructuredPercentageFact[]
  features: string[]
  benefits: string[]
}

// Normalized Verified Facts
export interface VerifiedFacts {
  brandName: string | null
  offerName: string | null
  offerType: OfferType
  features: string[]
  benefits: string[]
  price: string | null
  currency: string | null
  discount: string | null
  campaignDeadline: string | null
  deliveryArea: string | null
  ctaText: string | null
  ctaDestination: string | null
  phones: string[]
  rawBrief: string
  percentageFacts?: StructuredPercentageFact[]
  materialSpecs?: StructuredPercentageFact[]
  discountOffers?: StructuredPercentageFact[]
  productFacts?: StructuredProductFact[]
  isWholesale?: boolean
}

export interface FactNormalizerOutput {
  verifiedFacts: VerifiedFacts
  campaignObjective: CampaignObjective
  audience: {
    description: string | null
    awarenessLevel: string
  }
  assets: AssetState
  riskClass: TrustAndRiskClass
  unknowns: string[]
  forbiddenClaims: string[]
  sectorHint: string | null
  lockedBrandIdentity?: LockedBrandIdentity
}

// Universal Ontology Classification
export interface OntologyClassification {
  offerType: OfferType
  campaignObjective: CampaignObjective
  proofMode: ProofMode
  primaryValue: PrimaryValue
  primaryAffordance: VisualAffordanceAction
  riskClass: TrustAndRiskClass
  assetState: AssetState
  sectorHint: string | null
  confidence: number
}

// Creative Strategy Output
export interface CreativeStrategyOutput {
  primary: CreativeStrategyType
  secondaryTone?: string | null
  reasonCode: string
}

// Hook Plan Output
export interface HookPlanOutput {
  family: HookFamily
  subjectVisibleBySeconds: number
  meaningfulMotionBySeconds: number
  productOrResultVisible: boolean
  establishingShotOnly: boolean
  relevantToVerifiedValue: boolean
  physicallyPlausible: boolean
  visualEventDescription: string
  reasonCode: string
  candidates: HookCandidate[]
  selectedCandidate: HookCandidate
}

// Shot Plan
export interface ShotItem {
  shotNumber: 1 | 2 | 3
  timing: { from: number; to: number }
  role: 'visual_hook' | 'proof_or_action' | 'hero_close'
  framing: string
  subjectAction: string
  cameraMotion: string
  lightingAndPhysics: string
}

export interface ShotPlanOutput {
  durationSeconds: number
  aspectRatio: '9:16'
  cameraMode: 'continuous_take' | 'three_cut'
  singleLocation: string
  shots: [ShotItem, ShotItem, ShotItem]
  veoEnglishPrompt: string
  negativePrompt: string
  brandIdentityMode: 'reference_locked' | 'name_for_voice_and_overlay_only' | 'none'
  referenceAssetInput?: ReferenceAssetInput
  imageToVideoPrompt?: string
  reasonCode: string
  sceneContracts?: SceneContract[]
  creativeDNA?: CreativeDNASnapshot
  creativeScore?: CreativeOptimizationScore
}

// Turkish Voiceover Output
export interface VoiceoverOutput {
  text: string
  wordCount: number
  syllableCount: number
  estimatedDurationSeconds: number
  safetyMarginSeconds: number
  strategy: string
  voiceCharacter: {
    gender: 'auto' | 'neutral' | 'male' | 'female'
    energy: 'medium' | 'high' | 'calm'
    warmth: 'warm' | 'authoritative' | 'inviting'
    pace: 'confident' | 'deliberate' | 'energetic'
  }
  usesOnlyVerifiedClaims: boolean
  genericCopyCheck: 'pass' | 'repaired' | 'fail'
  reasonCode: string
}

// Overlay Timeline & Subtitles
export interface OverlayItem {
  from: number
  to: number
  type: 'hook' | 'offer' | 'cta' | 'brand' | 'disclaimer'
  text: string
  placement: 'upper_safe_area' | 'center_safe_area' | 'lower_safe_area' | 'auto_safe_area'
}

export interface OverlayPlanOutput {
  overlayTimeline: OverlayItem[]
  subtitles: {
    enabled: boolean
    mode: 'synchronized_voiceover'
    safeArea: '9:16'
    sourceText?: string
  }
  brandWatermarkOrLogoPlacement: {
    enabled: boolean
    sourceAsset: string | null
  }
}

// Validator & Auto Repair
export interface HardFailChecks {
  durationTotalsEightSeconds: boolean
  timelineContinuityValid: boolean
  verticalFormatSpecified: boolean
  cameraModeMatch: boolean
  hasOnePrimaryIdea: boolean
  hasOnePrimaryAction: boolean
  locationContinuityValid: boolean
  identityContinuityValid: boolean
  hasGeneratedDynamicTextInRawVideo: boolean
  hasInventedLogo: boolean
  hasInventedOfferOrFeature: boolean
  hasReferenceConflict: boolean
  voiceoverWithinLimit: boolean
  hookStartsWithRelevantAction: boolean
  firstShotIsNotEstablishingOnly: boolean
  claimsAllowedForRiskClass: boolean
  allOverlayFactsVerified: boolean
  lockedBrandIdentityPreserved?: boolean
}

export interface ValidationOutput {
  status: 'pass' | 'repaired' | 'needs_clarification' | 'blocked'
  checks: HardFailChecks
  hardFails: string[]
  warnings: string[]
  repairedModules?: string[]
  clarificationQuestion?: string | null
  score: number // Analytic score only, not gating boolean pass
}

// 8. Üretilmiş Video Eseri Doğrulama Çıktısı (Prompt doğrulamasından ayrı tutulur)
export interface GeneratedVideoValidationResult {
  status: 'pass' | 'failed' | 'not_checked'
  analysisAvailable: boolean
  checks: {
    textOrLogoHallucinationDetected: boolean | 'not_checked'
    productDriftDetected: boolean | 'not_checked'
    voiceoverMismatchDetected: boolean | 'not_checked'
    durationValid: boolean | 'not_checked'
    brandOrLogoVisible?: boolean | 'not_checked'
    brandNameCorrect?: boolean | 'not_checked'
  }
  notes: string[]
  postProcessLogoRecommended?: boolean
}

// Final Unified Machine-Readable Package Contract
export interface V5FinalOutputPackage {
  normalizedBrief: FactNormalizerOutput
  classification: OntologyClassification
  creativeStrategy: CreativeStrategyOutput
  hookPlan: HookPlanOutput
  shotPlan: ShotPlanOutput
  voiceover: VoiceoverOutput
  veoPrompt: string
  overlayPlan: OverlayPlanOutput
  validation: ValidationOutput
  lockedBrandIdentity: LockedBrandIdentity
  videoArtifactValidation?: GeneratedVideoValidationResult
  sceneContracts?: SceneContract[]
  creativeDNA?: CreativeDNASnapshot
  creativeScore?: CreativeOptimizationScore
}
