import type {
  FactNormalizerOutput,
  OntologyClassification,
  CreativeStrategyOutput,
  HookPlanOutput,
  ShotPlanOutput,
  ShotItem,
} from './schemas'

export const V5_STANDARD_NEGATIVES = [
  'duplicate subject',
  'duplicate product',
  'altered product geometry',
  'incorrect product color',
  'warped packaging',
  'warped logo',
  'gibberish typography',
  'floating graphics',
  'holographic interface',
  'unmotivated location change',
  'identity drift',
  'extra fingers',
  'deformed hands',
  'unsafe product use',
  'watermark',
  'text, words, letters, typography, logo overlay, graphic box, lower third, subtitles, captions, banner, card',
  'cartoon, 3D animation look, cgi render, uncanny valley',
  'blurry artifacts, low quality, pixelated, amateur video, choppy jumps, abrupt view shifts, jerky camera',
].join(', ')

/**
 * Shot Planner: Generates an 8-second 3-shot cinematic plan with single location continuity
 * and compiles the technical Veo prompt following V5 standards.
 */
export function planShots(
  facts: FactNormalizerOutput,
  ontology: OntologyClassification,
  strategy: CreativeStrategyOutput,
  hook: HookPlanOutput,
  voiceoverText?: string | null,
  cameraModeInput?: 'continuous_take' | 'three_cut',
): ShotPlanOutput {
  const brand = facts.verifiedFacts.brandName || 'Brand'
  const subject = facts.verifiedFacts.offerName || 'the product or service'

  // 1. Determine Camera Mode
  const cameraMode: 'continuous_take' | 'three_cut' =
    cameraModeInput ||
    (strategy.primary === 'sensory_desire' || strategy.primary === 'craftsmanship'
      ? 'continuous_take'
      : 'three_cut')

  // 2. Single Location Determination
  let singleLocation = 'Clean, modern and sunlit commercial setting tailored to the subject'
  if (ontology.offerType === 'food_or_consumable') {
    singleLocation = 'Warm artisan kitchen presentation counter with rustic wooden textures'
  } else if (ontology.offerType === 'digital_product_or_saas') {
    singleLocation = 'Modern sunlit minimalist office desk with natural window light'
  } else if (ontology.offerType === 'property_or_high_consideration_offer') {
    singleLocation = 'Contemporary architectural living space with panoramic glass window'
  } else if (ontology.proofMode === 'scale_or_inventory') {
    singleLocation = 'Organized bright logistics hub and professional outdoor delivery bay'
  } else if (ontology.primaryAffordance === 'apply_spray_mist') {
    singleLocation = 'Sunlit fertile agricultural orchard in golden morning light'
  } else if (ontology.offerType === 'professional_service' || ontology.offerType === 'local_service') {
    singleLocation = 'Professional, immaculate and bright service consultation workspace'
  }

  // 3. Three Shot Kadraj Setup (Adapts to camera mode)
  const isContinuous = cameraMode === 'continuous_take'

  const shot1: ShotItem = {
    shotNumber: 1,
    timing: { from: 0.0, to: 2.2 },
    role: 'visual_hook',
    framing: isContinuous
      ? 'Continuous take: wide-medium framing initiating the continuous slow forward push-in route'
      : 'Tight macro close-up framing',
    subjectAction: hook.visualEventDescription,
    cameraMotion: isContinuous
      ? 'The camera begins a single unbroken slow forward push-in route gliding smoothly toward the active subject'
      : 'Smooth push-in directly toward focal action',
    lightingAndPhysics: 'Natural daylight with soft specular highlights, shallow depth of field (f/1.8)',
  }

  const shot2: ShotItem = {
    shotNumber: 2,
    timing: { from: 2.2, to: 5.8 },
    role: 'proof_or_action',
    framing: isContinuous
      ? 'Continuous take: medium framing maintaining the identical continuous forward push-in route'
      : 'Medium dynamic tracking framing',
    subjectAction: `The focal subject (${subject}) performs its core verified function smoothly in realistic physical environment.`,
    cameraMotion: isContinuous
      ? 'Continuing the exact same slow forward push-in route at uniform speed toward the active subject without any trajectory change or scene interruption'
      : 'Cut to medium framing, steady gimbal tracking maintaining continuous lock on the subject',
    lightingAndPhysics: 'Balanced natural illumination, true-to-life reflections and realistic physics',
  }

  const shot3: ShotItem = {
    shotNumber: 3,
    timing: { from: 5.8, to: 8.0 },
    role: 'hero_close',
    framing: isContinuous
      ? 'Continuous take: close hero framing reaching the destination of the continuous forward push-in route'
      : 'Clean hero wide framing',
    subjectAction: `The subject (${subject}) rests in pristine final state, delivering quiet confidence and satisfaction.`,
    cameraMotion: isContinuous
      ? 'Continuing the exact same slow forward push-in route smoothly into crisp close hero framing to conclude the unbroken take'
      : 'Cut to clean hero wide framing, gentle crane rise revealing complete focal scene',
    lightingAndPhysics: 'Warm rim light, cinematic contrast and clean composition',
  }

  // 4. Brand Identity Mode
  const brandIdentityMode = facts.assets.logoReference
    ? 'reference_locked'
    : facts.verifiedFacts.brandName
    ? 'name_for_voice_and_overlay_only'
    : 'none'

  // 5. Audio Directive (Directly wires generated voiceover text into Veo prompt)
  const cleanVoText = voiceoverText ? voiceoverText.trim().replace(/["']/g, '') : null
  const audioDirective = cleanVoText
    ? `AUDIO: Professional crystal-clear Turkish voiceover: "${cleanVoText}". Accompanying natural ambient foley sound effects matching the physical action, accompanied by modern subtle commercial background rhythm.`
    : `AUDIO: Natural ambient foley sound effects matching the physical action, accompanied by modern subtle commercial background rhythm.`

  // 6. Camera Directive
  const cameraDirective = isContinuous
    ? `CAMERA MOVEMENT: continuous_take - Single unbroken slow forward push-in route maintained across all 8.0 seconds at uniform velocity with zero trajectory changes and zero scene interruption.`
    : `CAMERA MOVEMENT: three_cut - Three distinct controlled camera framings connected by clean cinematic cut transitions.`

  // 7. Assemble Technical Veo English Prompt
  const veoPrompt = [
    `FORMAT: 9:16 vertical commercial video, exactly 8.0 seconds total runtime.`,
    `SUBJECT AND REFERENCE LOCK: Focal subject is "${subject}". ${
      facts.assets.productReference
        ? 'A reference product photo is provided; preserve physical geometry, materials, casing, and colors exactly with zero mutation.'
        : 'Realistic physical proportions and authentic material textures.'
    }`,
    `LOCATION: ${singleLocation}. Strict continuity: single unbroken location, identical lighting setup, zero scene jumping.`,
    `SHOT 1 (0.0s - 2.2s - VISUAL HOOK): ${shot1.framing}. ${shot1.subjectAction}. ${shot1.cameraMotion}.`,
    `SHOT 2 (2.2s - 5.8s - PROOF AND ACTION): ${shot2.framing}. ${shot2.subjectAction}. ${shot2.cameraMotion}.`,
    `SHOT 3 (5.8s - 8.0s - HERO CLOSE): ${shot3.framing}. ${shot3.subjectAction}. ${shot3.cameraMotion}.`,
    cameraDirective,
    `LIGHT AND PHYSICS: Natural lighting, realistic physical gravity and authentic material reflections.`,
    audioDirective,
    `TEXT POLICY: No newly generated text, captions, prices, phone numbers, calls to action, signs or logos. No gibberish words, small text, long campaign copy, subtitles, floating text, handheld signs, desk signs, graphic overlays, banners or lower thirds. Real physical brand identity is allowed: preserve supplied product labels and original logo, and place the brand name only on large clean physical brand surfaces such as product labels, uniforms, vehicle decals, shop/factory entrance signage or hero product nameplates. Use the brand color palette on products, clothing, environment accents and lighting. Do not redesign or invent a logo.`,
    `NEGATIVE CONSTRAINTS: ${V5_STANDARD_NEGATIVES}`,
  ].join('\n')

  return {
    durationSeconds: 8,
    aspectRatio: '9:16',
    cameraMode,
    singleLocation,
    shots: [shot1, shot2, shot3],
    veoEnglishPrompt: veoPrompt,
    negativePrompt: V5_STANDARD_NEGATIVES,
    brandIdentityMode,
    reasonCode: `shotplan_8s_${cameraMode}_${strategy.primary}_location_${ontology.offerType}`,
  }
}
