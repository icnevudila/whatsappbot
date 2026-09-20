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
  'blurry artifacts, low quality, pixelated, amateur video, jump cuts, jerky camera',
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
): ShotPlanOutput {
  const brand = facts.verifiedFacts.brandName || 'Brand'
  const subject = facts.verifiedFacts.offerName || 'the product or service'

  // 1. Single Location Determination
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

  // 2. Three Shot Kadraj Setup
  const shot1: ShotItem = {
    shotNumber: 1,
    timing: { from: 0.0, to: 2.2 },
    role: 'visual_hook',
    framing: 'Macro 100mm close-up',
    subjectAction: hook.visualEventDescription,
    cameraMotion: 'Subtle smooth push-in directly toward focal action',
    lightingAndPhysics: 'Natural daylight with soft specular highlights, shallow depth of field (f/1.8)',
  }

  const shot2: ShotItem = {
    shotNumber: 2,
    timing: { from: 2.2, to: 5.8 },
    role: 'proof_or_action',
    framing: 'Medium dynamic tracking',
    subjectAction: `The focal subject (${subject}) performs its core verified function smoothly in realistic physical environment.`,
    cameraMotion: 'Steady gimbal tracking maintaining continuous lock on the subject',
    lightingAndPhysics: 'Balanced natural illumination, true-to-life reflections and realistic physics',
  }

  const shot3: ShotItem = {
    shotNumber: 3,
    timing: { from: 5.8, to: 8.0 },
    role: 'hero_close',
    framing: 'Clean hero medium-wide',
    subjectAction: `The subject (${subject}) rests in pristine final state, delivering quiet confidence and satisfaction.`,
    cameraMotion: 'Gentle crane rise revealing complete focal scene',
    lightingAndPhysics: 'Warm rim light, cinematic contrast and clean composition',
  }

  // 3. Brand Identity Mode
  const brandIdentityMode = facts.assets.logoReference
    ? 'reference_locked'
    : facts.verifiedFacts.brandName
    ? 'name_for_voice_and_overlay_only'
    : 'none'

  // 4. Assemble Technical Veo English Prompt
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
    `CAMERA MOVEMENT: One continuous smooth camera motion with zero abrupt jump cuts.`,
    `LIGHT AND PHYSICS: Natural lighting, realistic physical gravity and authentic material reflections.`,
    `AUDIO: Natural ambient foley sound effects matching the physical action, accompanied by modern subtle commercial background rhythm.`,
    `TEXT POLICY: No newly generated text, captions, prices, phone numbers, calls to action, signs or logos. Preserve only text and branding already visible on a supplied reference asset; do not redesign or invent it.`,
    `NEGATIVE CONSTRAINTS: ${V5_STANDARD_NEGATIVES}`,
  ].join('\n')

  return {
    durationSeconds: 8,
    aspectRatio: '9:16',
    singleLocation,
    shots: [shot1, shot2, shot3],
    veoEnglishPrompt: veoPrompt,
    negativePrompt: V5_STANDARD_NEGATIVES,
    brandIdentityMode,
    reasonCode: `shotplan_8s_${strategy.primary}_location_${ontology.offerType}`,
  }
}
