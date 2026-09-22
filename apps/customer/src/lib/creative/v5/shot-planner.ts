import type {
  FactNormalizerOutput,
  OntologyClassification,
  CreativeStrategyOutput,
  HookPlanOutput,
  ShotPlanOutput,
  ShotItem,
  ReferenceAssetInput,
} from './schemas'
import { resolveCreativeEnvironmentProfile } from './sector-profiles'
import { V5_STANDARD_NEGATIVES, V5_STANDARD_NEGATIVES_LIST } from './constants'
import { resolveCreativeDNA } from './creative-dna'
import { buildSceneContracts, compileSceneContractsToVeo } from './scene-contract'
import { evaluateCreativeMemory, type CreativeHistoryItem } from './creative-memory'

export { V5_STANDARD_NEGATIVES, V5_STANDARD_NEGATIVES_LIST }

/**
 * Shot Planner: Generates an 8-second 3-shot cinematic plan with single location continuity
 * and compiles the technical Veo English prompt following V5 standards.
 */
export function planShots(
  facts: FactNormalizerOutput,
  ontology: OntologyClassification,
  strategy: CreativeStrategyOutput,
  hook: HookPlanOutput,
  voiceoverText?: string | null,
  cameraModeInput?: 'continuous_take' | 'three_cut',
  history?: CreativeHistoryItem[],
  targetDurationSeconds?: number,
): ShotPlanOutput {
  const brand = facts.verifiedFacts.brandName || 'Brand'
  const brandName = facts.verifiedFacts.brandName
  const subject = facts.verifiedFacts.offerName || 'the product or service'

  // 1. Determine Camera Mode: Commercials default to dynamic 'three_cut' (Hook -> Action -> Brand Hero Close)
  // Only use continuous_take if explicitly requested or if an exact product reference image is provided.
  const cameraMode: 'continuous_take' | 'three_cut' =
    cameraModeInput ||
    (facts.assets.productReference
      ? 'continuous_take'
      : 'three_cut')

  // 2. Generic Sector & Environment Profile Resolution
  const profile = resolveCreativeEnvironmentProfile({
    sectorHint: facts.sectorHint,
    offerName: facts.verifiedFacts.offerName,
    rawBrief: facts.verifiedFacts.rawBrief,
  })

  // 2a. 4-Tier Creative DNA Resolution (Brand DNA -> Product DNA -> Intent -> Strategy)
  const dna = resolveCreativeDNA({
    facts,
    ontology,
    strategy,
    profile,
    manifest: (facts.lockedBrandIdentity as any) || null,
  })

  // 2b. Creative History & Repetition Memory Evaluation
  const creativeScore = evaluateCreativeMemory(history, {
    hookType: hook.family,
    environment: profile.preferredEnvironments[0] || 'commercial_setting',
    heroShot: 'close_macro',
    cameraLanguage: [cameraMode],
    storyArchetype: strategy.primary,
    lighting: 'natural_daylight',
  })

  // 2c. Dual Creative Grammar & Machine-Readable Scene Contracts
  const { grammarType, contracts } = buildSceneContracts({
    dna,
    targetDurationSeconds: targetDurationSeconds || 8,
    offerName: subject,
    brandName: brandName || null,
    hookDescription: hook.visualEventDescription,
    cameraMode,
  })

  // 2d. Location Determination (Generic Profile & DNA Driven)
  let singleLocation = dna.product.visualWorld[0] || profile.preferredEnvironments[0] || 'Clean, modern and sunlit commercial setting tailored to the subject'
  if (!profile.preferredEnvironments || profile.preferredEnvironments.length === 0) {
    if (ontology.offerType === 'food_or_consumable') {
      singleLocation = 'Warm artisan kitchen presentation counter with rustic wooden textures'
    } else if (ontology.offerType === 'digital_product_or_saas') {
      singleLocation = 'Modern sunlit minimalist office desk with natural window light'
    } else if (ontology.offerType === 'property_or_high_consideration_offer') {
      singleLocation = 'Contemporary architectural living space with panoramic glass window'
    } else if (ontology.proofMode === 'scale_or_inventory') {
      singleLocation = 'Organized bright logistics hub and professional outdoor delivery bay'
    } else if (ontology.offerType === 'professional_service' || ontology.offerType === 'local_service') {
      singleLocation = 'Professional, immaculate and bright service consultation workspace'
    }
  }

  // 2e. Brand Pillar & Color Grade (Generic Profile & DNA Driven)
  const brandPillar = dna.brand.corePillar || profile.brandPillar || `Reliable quality and professional delivery — a trusted brand in its category.`
  const colorGradeDirective = profile.colorGradeDirective || `COLOR GRADE: Warm-neutral commercial grade, accurate product colors, clean lifted blacks — premium brand visual identity.`
  const musicDirective = profile.musicDirective || `subtle modern commercial groove starting sparse, building at midpoint, peaking on the brand reveal, then resolving to silence`

  // 3. Three Shot Kadraj Setup (Adapts to camera mode)
  const isContinuous = cameraMode === 'continuous_take'

  const shot1Action = contracts[0]?.action_description || (profile.preferredUsageContext[0]
    ? profile.preferredUsageContext[0].replace(/\{subject\}/g, subject)
    : `${hook.visualEventDescription} A real professional person (clear recognizable face, industry-appropriate attire, confident purposeful body language) is actively and prominently visible in the foreground engaging with the product or activity.`)

  const shot1: ShotItem = {
    shotNumber: 1,
    timing: { from: 0.0, to: 2.2 },
    role: 'visual_hook',
    framing: isContinuous
      ? 'Continuous take: wide-medium framing initiating the continuous slow forward push-in route'
      : 'Wide dynamic establishing commercial framing with natural ambient motion',
    subjectAction: shot1Action,
    cameraMotion: isContinuous
      ? 'The camera begins a single unbroken slow forward push-in route gliding smoothly toward the active subject'
      : 'Smooth dynamic commercial push-in capturing the active environment and initial visual hook',
    lightingAndPhysics: 'Natural daylight with soft specular highlights, shallow depth of field (f/1.8)',
  }

  // Dynamic Shot 2 Action tailored via Profile & Contracts
  const shot2Action = contracts[1]?.action_description || (profile.preferredUsageContext[1]
    ? profile.preferredUsageContext[1].replace(/\{subject\}/g, subject)
    : `The focal subject (${subject}) performs its core verified function smoothly in realistic physical environment.`)

  const shot2: ShotItem = {
    shotNumber: 2,
    timing: { from: 2.2, to: 5.8 },
    role: 'proof_or_action',
    framing: isContinuous
      ? 'Continuous take: medium framing maintaining the identical continuous forward push-in route'
      : 'Medium dynamic tracking commercial framing',
    subjectAction: shot2Action,
    cameraMotion: isContinuous
      ? 'Continuing the exact same slow forward push-in route at uniform speed toward the active subject without any trajectory change or scene interruption'
      : 'Cut to medium dynamic framing, steady tracking following the core commercial activity',
    lightingAndPhysics: 'Balanced natural illumination, true-to-life reflections and realistic physics',
  }

  const brandHeroAction = brandName
    ? ` In the concluding framing (5.8s - 8.0s, lasting a full continuous 2.2 seconds), the camera settles directly and steadily on the authentic brand mark "${brandName}" and original corporate logo. The brand name and logo are prominently displayed at an easily readable size on the focal physical surface (product casing, clean engraved metal plaque, or corporate entrance). Fully visible and centered: zero rapid rotation, zero extreme perspective, zero motion blur, zero harsh glare, completely unobstructed by hands or objects.`
    : ''

  const shot3SubjectAction = `The subject (${subject}) rests in pristine final state, delivering quiet confidence and commercial prestige.${brandHeroAction}`

  const shot3: ShotItem = {
    shotNumber: 3,
    timing: { from: 5.8, to: 8.0 },
    role: 'hero_close',
    framing: isContinuous
      ? (brandName
          ? 'Continuous take: steady macro hero framing reaching the destination of the continuous forward push-in route settling on the primary brand mark and logo'
          : 'Continuous take: close hero framing reaching the destination of the continuous forward push-in route')
      : (brandName ? 'Crisp steady macro hero framing centered on the primary brand mark and logo' : 'Clean hero wide framing'),
    subjectAction: shot3SubjectAction,
    cameraMotion: isContinuous
      ? (brandName
          ? `Continuing the exact same slow forward push-in route smoothly into rock-steady close hero framing settling directly on the authentic brand mark "${brandName}" and logo to conclude the unbroken take`
          : 'Continuing the exact same slow forward push-in route smoothly into crisp close hero framing to conclude the unbroken take')
      : (brandName
          ? `Cut to clean hero framing, gentle crane rise settling rock-steadily on the authentic brand mark "${brandName}" and logo`
          : 'Cut to clean hero wide framing, gentle crane rise revealing complete focal scene'),
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
    ? `AUDIO: Professional crystal-clear Turkish male commercial narrator delivers the following line EXACTLY ONCE between 0.5s and 5.5s with zero repetition, zero looping, zero echo, and zero re-entry: \"${cleanVoText}\". The narration ends cleanly and conclusively before 5.5 seconds. From 5.5s to 8.0s: compelling modern commercial music groove and natural ambient foley sounds carry the remaining seconds to a polished, confident conclusion — zero voice, zero narration rerun.`
    : `AUDIO: No voiceover. Natural ambient foley sound effects matching the physical action, accompanied by modern subtle commercial background rhythm throughout all 8 seconds.`

  // 6. Camera Directive
  const cameraDirective = isContinuous
    ? `CAMERA MOVEMENT: continuous_take - Single unbroken slow forward push-in route maintained across all 8.0 seconds at uniform velocity with zero trajectory changes and zero scene interruption.`
    : `CAMERA MOVEMENT: three_cut - Three distinct controlled camera framings connected by clean cinematic cut transitions.`

  const brandSurface = 'clean durable surface on the product casing or polished entrance plaque'

  const brandRevealDirective = brandName
    ? `MANDATORY VISUAL BRAND IDENTITY (5.8s - 8.0s): The verified brand name "${brandName}" and authentic corporate logo mark are mandatory on-screen visual elements directly in the video. In the final framing (5.8s - 8.0s), the camera settles rock-steadily on the authentic logo and bold letters: "${brandName}" displayed prominently on ${brandSurface}. Rock-steady framing, centered at eye level: zero camera shake, zero rapid rotation, zero motion blur, zero distorted letters.`
    : null

  const negativeConstraints = profile.forbiddenEnvironments && profile.forbiddenEnvironments.length > 0
    ? `${V5_STANDARD_NEGATIVES}, ${profile.forbiddenEnvironments.join(', ')}`
    : V5_STANDARD_NEGATIVES

  // 7. Assemble Technical Veo English Prompt
  const isBrandFilm = (targetDurationSeconds || 8) >= 20
  const veoPrompt = isBrandFilm
    ? compileSceneContractsToVeo({
        contracts,
        grammarType,
        dna,
        brandName: brandName || null,
        offerName: subject,
        audioDirective,
        cameraMode,
        hasProductReference: Boolean(facts.assets.productReference),
        antiRepetitionDirectives: creativeScore.antiRepetitionDirectives,
      })
    : [
        `FORMAT: 9:16 vertical commercial video, exactly 8.0 seconds total runtime.`,
        `BRAND PILLAR AND EMOTIONAL INTENT: ${brandPillar} Every visual, lighting, and audio choice should serve this emotional intent directly.`,
        `SUBJECT AND REFERENCE LOCK: Focal subject is "${subject}". ${
          facts.assets.productReference
            ? 'A reference product photo is provided; preserve physical geometry, materials, casing, and colors exactly with zero mutation.'
            : `Material specification: ${dna.product.material}. Visual strengths: ${dna.product.visualStrength.join(', ')}.`
        }`,
        `LOCATION: ${singleLocation}. Strict continuity: single unbroken location, identical lighting setup, zero scene jumping.`,
        `SHOT 1 (${shot1.timing.from.toFixed(1)}s - ${shot1.timing.to.toFixed(1)}s - VISUAL HOOK): ${shot1.framing}. ${shot1.subjectAction}. ${shot1.cameraMotion}.`,
        `SHOT 2 (${shot2.timing.from.toFixed(1)}s - ${shot2.timing.to.toFixed(1)}s - PROOF AND ACTION): ${shot2.framing}. ${shot2.subjectAction}. ${shot2.cameraMotion}.`,
        `SHOT 3 (${shot3.timing.from.toFixed(1)}s - ${shot3.timing.to.toFixed(1)}s - HERO CLOSE): ${shot3.framing}. ${shot3.subjectAction}. ${shot3.cameraMotion}.`,
        ...(brandRevealDirective ? [brandRevealDirective] : []),
        cameraDirective,
        `LIGHT AND PHYSICS: Natural lighting, realistic physical gravity and authentic material reflections. ${colorGradeDirective}`,
        `MUSIC SHAPE: ${musicDirective}.`,
        audioDirective,
        brandName
          ? `TEXT POLICY: No newly generated text or promotional advertising copy (strictly NO prices, NO discount badges, NO phone numbers, NO website URLs, NO promotional captions, NO subtitles, NO floating letters, NO banners, NO CTA badges). The verified brand name "${brandName}", the original corporate logo, and pre-existing product labels are MANDATORY on-screen visual elements directly in the video. Real physical brand identity is strictly preserved: pre-existing printed labels and authentic branding on reference products remain as-is without modification. Do not redesign or invent a logo.`
          : `TEXT POLICY: No newly generated text, captions, prices, phone numbers, calls to action, signs, or fake logos. No gibberish words, small text, long campaign copy, subtitles, floating text, handheld signs, desk signs, graphic overlays, banners or lower thirds. Real physical brand identity is strictly preserved: pre-existing printed labels and authentic branding on reference products remain as-is without modification. Brand name appears only on natural physical surfaces (uniforms, vehicle decals, entrance signage, or product nameplates) matching the brand palette. Do not redesign or invent a logo.`,
        ...(creativeScore.antiRepetitionDirectives && creativeScore.antiRepetitionDirectives.length > 0
          ? creativeScore.antiRepetitionDirectives.map((d) => `CREATIVE DIVERSITY DIRECTIVE: ${d}`)
          : []),
        `NEGATIVE CONSTRAINTS: ${negativeConstraints}`,
      ].join('\n')

  const referenceAssetInput: ReferenceAssetInput = {
    hasImageInput: Boolean(facts.assets.productReference),
    imageUrl: facts.assets.productReferenceUrl || null,
    mode: facts.assets.productReference ? 'product_reference' : 'none',
    motionDirective: facts.assets.productReference
      ? 'Preserve physical product geometry, label, and packaging exactly as shown in the reference image. Motion is continuous camera movement and physical lighting interaction around the locked subject.'
      : 'Maintain realistic physical proportions and verified specifications.',
  }

  const imageToVideoPrompt = facts.assets.productReference
    ? `IMAGE-TO-VIDEO: Anchor to provided product reference image. Zero alteration of product packaging, color, or printed label. 8-second continuous take camera movement revealing realistic physical interaction in ${singleLocation}.`
    : undefined

  return {
    durationSeconds: targetDurationSeconds || 8,
    aspectRatio: '9:16',
    cameraMode,
    singleLocation,
    shots: [shot1, shot2, shot3],
    veoEnglishPrompt: veoPrompt,
    negativePrompt: negativeConstraints,
    brandIdentityMode,
    referenceAssetInput,
    imageToVideoPrompt,
    reasonCode: `shotplan_8s_${cameraMode}_${strategy.primary}_location_${ontology.offerType}`,
    sceneContracts: contracts,
    creativeDNA: dna,
    creativeScore,
  }
}
