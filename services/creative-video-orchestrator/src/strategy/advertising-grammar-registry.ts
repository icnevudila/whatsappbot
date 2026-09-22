import type { BusinessModel } from '../types/asset-intake.js'

export type AdvertisingFormat =
  | 'PERFORMANCE_DEMO'
  | 'PROBLEM_SOLUTION'
  | 'PRODUCT_USAGE'
  | 'UGC_TESTIMONIAL'
  | 'OFFER_DRIVEN'
  | 'PRODUCT_HERO'
  | 'BRAND_CINEMATIC'
  | 'SOFTWARE_DEMO'
  | 'BEFORE_AFTER'

export type PerformanceDemoVariant =
  | 'MACRO_FIRST'
  | 'HUMAN_ACTION_FIRST'
  | 'RESULT_FIRST'
  | 'RAPID_DETAIL_CUTS'
  | 'DEMO_FIRST'

export type ProblemSolutionVariant =
  | 'FRICTION_FIRST'
  | 'FRUSTRATION_TO_RELIEF'
  | 'BEFORE_AFTER_CONTRAST'
  | 'DAILY_STRUGGLE'

export type ProductUsageVariant =
  | 'STEP_BY_STEP'
  | 'IN_SITU_WORKFLOW'
  | 'LIFESTYLE_INTEGRATION'
  | 'EFFORTLESS_APPLICATION'

export type UgcTestimonialVariant =
  | 'CREATOR_UNBOX_SHOW'
  | 'PASSING_THE_SMART_TIP'
  | 'AUTHENTIC_REACTION'
  | 'CREATOR_FIELD_TEST'

export type OfferDrivenVariant =
  | 'PRICE_DROP_CALLOUT'
  | 'LIMITED_TIME_DEAL'
  | 'BUNDLE_VALUE'
  | 'SEASONAL_SAVINGS'

export type ProductHeroVariant =
  | 'STUDIO_LIGHT_SWEEP'
  | 'HERO_EXPLODED_TECH'
  | 'SCULPTURAL_PEDESTAL'
  | 'MONOLITH_ROTATION'

export type BrandCinematicVariant =
  | 'ATMOSPHERIC_TEXTURE'
  | 'EMOTIONAL_JOURNEY'
  | 'ORIGIN_HERITAGE'
  | 'POETIC_MOTION'

export type SoftwareDemoVariant =
  | 'INTERFACE_GLIDE'
  | 'METRIC_COUNTUP_REVEAL'
  | 'FLOW_AUTOMATION_POP'
  | 'CROSS_DEVICE_HANDOFF'

export type BeforeAfterVariant =
  | 'SIDE_BY_SIDE_SPLIT'
  | 'WIPE_TRANSITION'
  | 'PAIN_TO_GLORY'
  | 'TIME_LAPSE_CHANGE'

export type FormatVariant =
  | PerformanceDemoVariant
  | ProblemSolutionVariant
  | ProductUsageVariant
  | UgcTestimonialVariant
  | OfferDrivenVariant
  | ProductHeroVariant
  | BrandCinematicVariant
  | SoftwareDemoVariant
  | BeforeAfterVariant

export interface BeatRoleContract {
  stage: 'HOOK' | 'PRODUCT_REVEAL' | 'PROOF_OR_DEMO' | 'PAYOFF' | 'BRAND_CLOSE'
  timeWindow: { start: number; end: number }
  function: string
  cinematic_role: string
}

export interface FormatGrammarSpec {
  format: AdvertisingFormat
  description: string
  supportedVariants: FormatVariant[]
  defaultVariant: FormatVariant
  structuralStages: BeatRoleContract[]
  cutPoints: number[]
  voiceCadenceWordsPerSec: [number, number]
  targetTotalWords: [number, number]
  onScreenCopyMaxLevels: number
  safeZoneRule: string
}

export class AdvertisingGrammarRegistry {
  private static specs: Map<AdvertisingFormat, FormatGrammarSpec> = new Map([
    [
      'PERFORMANCE_DEMO',
      {
        format: 'PERFORMANCE_DEMO',
        description: 'Conversion-driven demonstration of physical operational power, liquid dynamics, or mechanical speed.',
        supportedVariants: [
          'MACRO_FIRST',
          'HUMAN_ACTION_FIRST',
          'RESULT_FIRST',
          'RAPID_DETAIL_CUTS',
          'DEMO_FIRST'
        ],
        defaultVariant: 'MACRO_FIRST',
        structuralStages: [
          { stage: 'HOOK', timeWindow: { start: 0.0, end: 0.7 }, function: 'Pattern interrupt, high-energy opening detail', cinematic_role: 'Extreme macro or sudden motion' },
          { stage: 'PRODUCT_REVEAL', timeWindow: { start: 0.7, end: 2.2 }, function: 'Authoritative product profile in authentic context', cinematic_role: 'Fluid dolly-out / medium profile' },
          { stage: 'PROOF_OR_DEMO', timeWindow: { start: 2.2, end: 4.5 }, function: 'Physical mechanical output, liquid spray, or operation in action', cinematic_role: '50mm steady tracking on action output' },
          { stage: 'PAYOFF', timeWindow: { start: 4.5, end: 6.2 }, function: 'Demonstrated outcome, operator satisfaction, completion head nod', cinematic_role: '35mm wide angle reveal' },
          { stage: 'BRAND_CLOSE', timeWindow: { start: 6.2, end: 8.0 }, function: 'Frame-hold background continuation with authoritative logo & CTA', cinematic_role: 'Atmospheric depth hold, soft wash' },
        ],
        cutPoints: [0.7, 2.2, 4.5, 6.2],
        voiceCadenceWordsPerSec: [2.4, 3.2],
        targetTotalWords: [18, 24],
        onScreenCopyMaxLevels: 3,
        safeZoneRule: 'Bottom safe zone MarginV 240-280, never occluding nozzle, spray path or face.'
      }
    ],
    [
      'PROBLEM_SOLUTION',
      {
        format: 'PROBLEM_SOLUTION',
        description: 'Agitates recognized friction, immediately introduces hero product as the definitive resolution, and closes with verified CTA.',
        supportedVariants: [
          'FRICTION_FIRST',
          'FRUSTRATION_TO_RELIEF',
          'BEFORE_AFTER_CONTRAST',
          'DAILY_STRUGGLE'
        ],
        defaultVariant: 'FRICTION_FIRST',
        structuralStages: [
          { stage: 'HOOK', timeWindow: { start: 0.0, end: 1.5 }, function: 'Visual friction, struggle or pain point in workflow', cinematic_role: 'Rapid tight framing with urgency' },
          { stage: 'PRODUCT_REVEAL', timeWindow: { start: 1.5, end: 3.2 }, function: 'Product introduced effortlessly eliminating struggle', cinematic_role: 'Clean contrast light reveal' },
          { stage: 'PROOF_OR_DEMO', timeWindow: { start: 3.2, end: 5.5 }, function: 'Smooth operational flow and visible relief', cinematic_role: 'Fluid tracking on ease of use' },
          { stage: 'PAYOFF', timeWindow: { start: 5.5, end: 6.5 }, function: 'Clean completion and time/effort saved', cinematic_role: 'Steady wide angle satisfaction' },
          { stage: 'BRAND_CLOSE', timeWindow: { start: 6.5, end: 8.0 }, function: 'Brand resolve & verified call to action', cinematic_role: 'Clean brand end card' },
        ],
        cutPoints: [1.5, 3.2, 5.5, 6.5],
        voiceCadenceWordsPerSec: [2.4, 3.2],
        targetTotalWords: [18, 24],
        onScreenCopyMaxLevels: 3,
        safeZoneRule: 'Bottom safe zone MarginV 240, zero occlusion of problem-to-solution transition.'
      }
    ],
    [
      'PRODUCT_USAGE',
      {
        format: 'PRODUCT_USAGE',
        description: 'Highlights practical, ergonomic in-situ handling and step-by-step workflow ease.',
        supportedVariants: [
          'STEP_BY_STEP',
          'IN_SITU_WORKFLOW',
          'LIFESTYLE_INTEGRATION',
          'EFFORTLESS_APPLICATION'
        ],
        defaultVariant: 'IN_SITU_WORKFLOW',
        structuralStages: [
          { stage: 'HOOK', timeWindow: { start: 0.0, end: 1.2 }, function: 'Hands-on engagement, picking up or wearing product', cinematic_role: 'Dynamic ergonomic interaction' },
          { stage: 'PRODUCT_REVEAL', timeWindow: { start: 1.2, end: 3.0 }, function: 'Full product assembly, strap fit, or clean setup', cinematic_role: 'Medium tracking shot' },
          { stage: 'PROOF_OR_DEMO', timeWindow: { start: 3.0, end: 5.2 }, function: 'Continuous effortless task execution in real environment', cinematic_role: 'Eye-level natural motion' },
          { stage: 'PAYOFF', timeWindow: { start: 5.2, end: 6.4 }, function: 'Task cleanly completed without strain', cinematic_role: 'Relaxed confident operator' },
          { stage: 'BRAND_CLOSE', timeWindow: { start: 6.4, end: 8.0 }, function: 'Brand trust close & verified CTA', cinematic_role: 'Seamless background continuation' },
        ],
        cutPoints: [1.2, 3.0, 5.2, 6.4],
        voiceCadenceWordsPerSec: [2.4, 3.2],
        targetTotalWords: [18, 24],
        onScreenCopyMaxLevels: 3,
        safeZoneRule: 'Bottom safe zone MarginV 240.'
      }
    ],
    [
      'UGC_TESTIMONIAL',
      {
        format: 'UGC_TESTIMONIAL',
        description: 'Authentic creator or operator peer-to-peer recommendation with candid handheld perspective.',
        supportedVariants: [
          'CREATOR_UNBOX_SHOW',
          'PASSING_THE_SMART_TIP',
          'AUTHENTIC_REACTION',
          'CREATOR_FIELD_TEST'
        ],
        defaultVariant: 'PASSING_THE_SMART_TIP',
        structuralStages: [
          { stage: 'HOOK', timeWindow: { start: 0.0, end: 1.4 }, function: 'Candid creator eye-contact hook and authentic problem callout', cinematic_role: 'Slight handheld warmth, eye level' },
          { stage: 'PRODUCT_REVEAL', timeWindow: { start: 1.4, end: 3.0 }, function: 'Showing product to camera with genuine peer enthusiasm', cinematic_role: 'Organic camera push-in' },
          { stage: 'PROOF_OR_DEMO', timeWindow: { start: 3.0, end: 5.4 }, function: 'Creator operating equipment and narrating immediate result', cinematic_role: 'Over-the-shoulder action capture' },
          { stage: 'PAYOFF', timeWindow: { start: 5.4, end: 6.5 }, function: 'Creator satisfaction head nod and direct recommendation', cinematic_role: 'Smiling authentic direct address' },
          { stage: 'BRAND_CLOSE', timeWindow: { start: 6.5, end: 8.0 }, function: 'Creator holding product with official brand card overlay', cinematic_role: 'Warm authentic close' },
        ],
        cutPoints: [1.4, 3.0, 5.4, 6.5],
        voiceCadenceWordsPerSec: [2.4, 3.2],
        targetTotalWords: [18, 24],
        onScreenCopyMaxLevels: 3,
        safeZoneRule: 'Bottom safe zone MarginV 260.'
      }
    ],
    [
      'OFFER_DRIVEN',
      {
        format: 'OFFER_DRIVEN',
        description: 'Time-sensitive conversion ad highlighting authorized seasonal promotions, bundles, or price advantage.',
        supportedVariants: [
          'PRICE_DROP_CALLOUT',
          'LIMITED_TIME_DEAL',
          'BUNDLE_VALUE',
          'SEASONAL_SAVINGS'
        ],
        defaultVariant: 'SEASONAL_SAVINGS',
        structuralStages: [
          { stage: 'HOOK', timeWindow: { start: 0.0, end: 1.2 }, function: 'Urgent value opportunity hook with dynamic product punch-in', cinematic_role: 'High-contrast punchy entrance' },
          { stage: 'PRODUCT_REVEAL', timeWindow: { start: 1.2, end: 2.8 }, function: 'Hero product presented with verified offer context', cinematic_role: 'Clean profile rotation' },
          { stage: 'PROOF_OR_DEMO', timeWindow: { start: 2.8, end: 5.0 }, function: 'Product excellence proving exceptional value for investment', cinematic_role: 'Dynamic work proof' },
          { stage: 'PAYOFF', timeWindow: { start: 5.0, end: 6.2 }, function: 'Urgent call to seize verified campaign deal', cinematic_role: 'Energy escalation' },
          { stage: 'BRAND_CLOSE', timeWindow: { start: 6.2, end: 8.0 }, function: 'Official verified CTA with authoritative brand logo', cinematic_role: 'Authoritative commercial packshot' },
        ],
        cutPoints: [1.2, 2.8, 5.0, 6.2],
        voiceCadenceWordsPerSec: [2.4, 3.2],
        targetTotalWords: [18, 24],
        onScreenCopyMaxLevels: 3,
        safeZoneRule: 'Bottom safe zone MarginV 240, zero invented discounts.'
      }
    ],
    [
      'PRODUCT_HERO',
      {
        format: 'PRODUCT_HERO',
        description: 'Sculptural, pristine showcase emphasizing industrial design, component engineering, and build quality.',
        supportedVariants: [
          'STUDIO_LIGHT_SWEEP',
          'HERO_EXPLODED_TECH',
          'SCULPTURAL_PEDESTAL',
          'MONOLITH_ROTATION'
        ],
        defaultVariant: 'STUDIO_LIGHT_SWEEP',
        structuralStages: [
          { stage: 'HOOK', timeWindow: { start: 0.0, end: 1.5 }, function: 'Sleek specular highlight tracing across hero surface contours', cinematic_role: 'Slow cinematic macro sweep' },
          { stage: 'PRODUCT_REVEAL', timeWindow: { start: 1.5, end: 3.5 }, function: 'Dramatic un-obscured full product reveal with pristine rim light', cinematic_role: 'Graceful pedestal orbit' },
          { stage: 'PROOF_OR_DEMO', timeWindow: { start: 3.5, end: 5.5 }, function: 'Precision mechanism close-up, engineered switches, and fit-and-finish', cinematic_role: 'Macro component focus' },
          { stage: 'PAYOFF', timeWindow: { start: 5.5, end: 6.5 }, function: 'Monumental locked composition reflecting engineering prestige', cinematic_role: 'Heroic upward angle' },
          { stage: 'BRAND_CLOSE', timeWindow: { start: 6.5, end: 8.0 }, function: 'Diegetic surface brand mark transitioning to clean brand card', cinematic_role: 'Minimalist luxury end card' },
        ],
        cutPoints: [1.5, 3.5, 5.5, 6.5],
        voiceCadenceWordsPerSec: [2.2, 2.8],
        targetTotalWords: [16, 22],
        onScreenCopyMaxLevels: 2,
        safeZoneRule: 'Bottom safe zone MarginV 220.'
      }
    ],
    [
      'BRAND_CINEMATIC',
      {
        format: 'BRAND_CINEMATIC',
        description: 'Atmospheric prestige commercial evoking heritage, dedication, and elevated emotional resonance.',
        supportedVariants: [
          'ATMOSPHERIC_TEXTURE',
          'EMOTIONAL_JOURNEY',
          'ORIGIN_HERITAGE',
          'POETIC_MOTION'
        ],
        defaultVariant: 'ATMOSPHERIC_TEXTURE',
        structuralStages: [
          { stage: 'HOOK', timeWindow: { start: 0.0, end: 1.8 }, function: 'Poetic atmospheric establishing shot bathed in golden haze', cinematic_role: 'Slow anamorphic pull' },
          { stage: 'PRODUCT_REVEAL', timeWindow: { start: 1.8, end: 3.8 }, function: 'Product integrated naturally into majestic environment', cinematic_role: 'Atmospheric depth framing' },
          { stage: 'PROOF_OR_DEMO', timeWindow: { start: 3.8, end: 5.8 }, function: 'Quiet mastery and timeless human dedication in the landscape', cinematic_role: 'Lyrical slow tracking' },
          { stage: 'PAYOFF', timeWindow: { start: 5.8, end: 6.8 }, function: 'Enduring bond between craftsman, land, and quality', cinematic_role: 'Wide horizon hold' },
          { stage: 'BRAND_CLOSE', timeWindow: { start: 6.8, end: 8.0 }, function: 'Understated prestigious brand close and heritage resolve', cinematic_role: 'Continuation fade into brand hallmark' },
        ],
        cutPoints: [1.8, 3.8, 5.8, 6.8],
        voiceCadenceWordsPerSec: [2.0, 2.6],
        targetTotalWords: [16, 20],
        onScreenCopyMaxLevels: 2,
        safeZoneRule: 'Bottom safe zone MarginV 200.'
      }
    ],
    [
      'SOFTWARE_DEMO',
      {
        format: 'SOFTWARE_DEMO',
        description: 'Crisp digital product showcase highlighting user interface fluidity, verified metric calculation, and workflow speed.',
        supportedVariants: [
          'INTERFACE_GLIDE',
          'METRIC_COUNTUP_REVEAL',
          'FLOW_AUTOMATION_POP',
          'CROSS_DEVICE_HANDOFF'
        ],
        defaultVariant: 'INTERFACE_GLIDE',
        structuralStages: [
          { stage: 'HOOK', timeWindow: { start: 0.0, end: 1.3 }, function: 'Urgent business bottleneck or messy data screen state', cinematic_role: 'Tight macro on screen friction' },
          { stage: 'PRODUCT_REVEAL', timeWindow: { start: 1.3, end: 3.0 }, function: 'Clean interface enters, single-click automated flow initiated', cinematic_role: 'Smooth UI pan with crisp typography' },
          { stage: 'PROOF_OR_DEMO', timeWindow: { start: 3.0, end: 5.2 }, function: 'Real-time calculation, green checkmarks, verified analytics pop', cinematic_role: 'Macro UI action and metric surge' },
          { stage: 'PAYOFF', timeWindow: { start: 5.2, end: 6.4 }, function: 'Executive relief, clean executive dashboard summary', cinematic_role: 'Confident modern office framing' },
          { stage: 'BRAND_CLOSE', timeWindow: { start: 6.4, end: 8.0 }, function: 'Platform logo & verified start/trial CTA', cinematic_role: 'Minimalist tech end card' },
        ],
        cutPoints: [1.3, 3.0, 5.2, 6.4],
        voiceCadenceWordsPerSec: [2.5, 3.3],
        targetTotalWords: [18, 24],
        onScreenCopyMaxLevels: 3,
        safeZoneRule: 'Bottom safe zone MarginV 240.'
      }
    ],
    [
      'BEFORE_AFTER',
      {
        format: 'BEFORE_AFTER',
        description: 'Direct comparison demonstrating stark contrast between past pain/inefficiency and present product mastery.',
        supportedVariants: [
          'SIDE_BY_SIDE_SPLIT',
          'WIPE_TRANSITION',
          'PAIN_TO_GLORY',
          'TIME_LAPSE_CHANGE'
        ],
        defaultVariant: 'WIPE_TRANSITION',
        structuralStages: [
          { stage: 'HOOK', timeWindow: { start: 0.0, end: 1.5 }, function: 'Visualizing legacy difficulty or inferior outcome', cinematic_role: 'Desaturated or agitated camera framing' },
          { stage: 'PRODUCT_REVEAL', timeWindow: { start: 1.5, end: 3.5 }, function: 'Dynamic wipe or side-by-side transition revealing hero product', cinematic_role: 'Luminance and motion boost transition' },
          { stage: 'PROOF_OR_DEMO', timeWindow: { start: 3.5, end: 5.5 }, function: 'Flawless product performance vs flawed alternative', cinematic_role: 'Clean high-fidelity comparison' },
          { stage: 'PAYOFF', timeWindow: { start: 5.5, end: 6.8 }, function: 'Drastic visual difference and operator satisfaction', cinematic_role: 'Bright radiant payoff' },
          { stage: 'BRAND_CLOSE', timeWindow: { start: 6.8, end: 8.0 }, function: 'Brand logo and upgrade CTA', cinematic_role: 'Bold authoritative brand close' },
        ],
        cutPoints: [1.5, 3.5, 5.5, 6.8],
        voiceCadenceWordsPerSec: [2.4, 3.2],
        targetTotalWords: [18, 24],
        onScreenCopyMaxLevels: 3,
        safeZoneRule: 'Bottom safe zone MarginV 240.'
      }
    ]
  ])

  public static getSpec(format: AdvertisingFormat): FormatGrammarSpec {
    const spec = this.specs.get(format)
    if (!spec) {
      return this.specs.get('PERFORMANCE_DEMO')!
    }
    return spec
  }

  public static getAllFormats(): AdvertisingFormat[] {
    return Array.from(this.specs.keys())
  }
}
