import type {
  FactNormalizerOutput,
  OntologyClassification,
  CreativeStrategyOutput,
  HookPlanOutput,
  ShotPlanOutput,
  ShotItem,
  ReferenceAssetInput,
} from './schemas'

export const V5_STANDARD_NEGATIVES = [
  'fake logos',
  'additional brands',
  'misspelled brand name',
  'distorted logo',
  'altered lettering',
  'promotional captions',
  'price tags',
  'subtitles',
  'additional logos',
  'invented brand names',
  'generated captions',
  'promotional badges',
  'extra products',
  'invented accessories',
  'altered packaging',
  'distorted labels',
  'product deformation',
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
  'fake phone numbers, fake URLs, discount badges, graphic overlays, lower thirds, floating banners, text cards',
  'cartoon, 3D animation look, cgi render, uncanny valley',
  'spinning laptop, rotating laptop, turntable spin, rotating table, motorized rotation, spinning gadget, 360 degree turntable, levitating objects',
  'blurry artifacts, low quality, pixelated, amateur video, choppy jumps, abrupt view shifts, jerky camera',
].join(', ')

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

  // 2. Single Location Determination
  let singleLocation = 'Clean, modern and sunlit commercial setting tailored to the subject'
  if (ontology.offerType === 'food_or_consumable') {
    singleLocation = 'Warm artisan kitchen presentation counter with rustic wooden textures'
  } else if (ontology.offerType === 'digital_product_or_saas') {
    singleLocation = 'Modern sunlit minimalist office desk with natural window light'
  } else if (ontology.offerType === 'property_or_high_consideration_offer') {
    singleLocation = 'Contemporary architectural living space with panoramic glass window'
  } else if (ontology.proofMode === 'scale_or_inventory' || ontology.offerType === 'physical_product') {
    if (
      facts.sectorHint?.includes('inşaat') ||
      facts.sectorHint?.includes('tuğla') ||
      facts.verifiedFacts.offerName?.toLowerCase().includes('tuğla') ||
      facts.verifiedFacts.rawBrief.toLowerCase().includes('tuğla')
    ) {
      singleLocation = 'Modern, immaculate brick manufacturing facility and sunlit outdoor dispatch loading yard'
    } else {
      singleLocation = 'Organized bright logistics hub and professional outdoor delivery bay'
    }
  } else if (ontology.primaryAffordance === 'apply_spray_mist') {
    singleLocation = 'Sunlit fertile agricultural orchard in golden morning light'
  } else if (ontology.offerType === 'professional_service' || ontology.offerType === 'local_service') {
    singleLocation = 'Professional, immaculate and bright service consultation workspace'
  }

  // 2b. Brand Pillar & Color Grade (derived from sector/strategy — per SurePrompts best practice)
  let brandPillar = `Reliable quality and professional delivery — a trusted brand in its category.`
  let colorGradeDirective = `COLOR GRADE: Warm-neutral commercial grade, accurate product colors, clean lifted blacks — premium brand visual identity.`
  let musicDirective = `subtle modern commercial groove starting sparse, building at midpoint, peaking on the brand reveal, then resolving to silence`

  if (ontology.offerType === 'food_or_consumable') {
    brandPillar = `Freshness and craft — this product is made with care and should feel delicious and inviting.`
    colorGradeDirective = `COLOR GRADE: Warm artisan amber tones, rich saturated food colors, soft lifted highlights — appetizing and inviting.`
    musicDirective = `warm acoustic guitar with light percussion starting gentle, building through product interaction, resolving warmly`
  } else if (ontology.offerType === 'digital_product_or_saas') {
    brandPillar = `Precision and ease — this platform removes friction and makes complex work feel effortless.`
    colorGradeDirective = `COLOR GRADE: Cool-neutral with clean whites and precise midtones — modern tech-product visual identity.`
    musicDirective = `minimal electronic motif, clean and forward-moving, entering at product reveal and building confidently`
  } else if (
    facts.sectorHint?.includes('inşaat') ||
    facts.sectorHint?.includes('tuğla') ||
    facts.verifiedFacts.offerName?.toLowerCase().includes('tuğla') ||
    facts.verifiedFacts.rawBrief.toLowerCase().includes('tuğla')
  ) {
    brandPillar = `Industrial strength and reliable delivery — this brand is the structural backbone of serious construction projects.`
    colorGradeDirective = `COLOR GRADE: Warm industrial amber, rich earth tones, deep material textures, documentary-grade lifted blacks — conveying strength, scale and reliability.`
    musicDirective = `post-industrial orchestral groove with driving percussion, building from sparse at opening to full-bodied at product hero reveal, resolving on brand close`
  } else if (strategy.primary === 'scale_and_availability' || ontology.proofMode === 'scale_or_inventory') {
    brandPillar = `Scale and dependability — this brand delivers at volume with consistent quality and speed.`
    colorGradeDirective = `COLOR GRADE: Bold warm-neutral commercial grade, strong material textures, clean highlights — conveying industrial capability and reliability.`
    musicDirective = `confident commercial rhythm building steadily from opening, peaking during product action, resolving cleanly on brand close`
  }

  // 3. Three Shot Kadraj Setup (Adapts to camera mode)
  const isContinuous = cameraMode === 'continuous_take'

  const shot1: ShotItem = {
    shotNumber: 1,
    timing: { from: 0.0, to: 2.2 },
    role: 'visual_hook',
    framing: isContinuous
      ? 'Continuous take: wide-medium framing initiating the continuous slow forward push-in route'
      : 'Wide dynamic establishing commercial framing with natural ambient motion',
    subjectAction: `${hook.visualEventDescription} A real professional person (clear recognizable face, industry-appropriate attire, confident purposeful body language) is actively and prominently visible in the foreground engaging with the product or activity.`,
    cameraMotion: isContinuous
      ? 'The camera begins a single unbroken slow forward push-in route gliding smoothly toward the active subject'
      : 'Smooth dynamic commercial push-in capturing the active environment and initial visual hook',
    lightingAndPhysics: 'Natural daylight with soft specular highlights, shallow depth of field (f/1.8)',
  }

  // Dynamic Shot 2 Action tailored to sector/offer
  let shot2Action = `The focal subject (${subject}) performs its core verified function smoothly in realistic physical environment.`
  if (facts.verifiedFacts.offerName?.toLowerCase().includes('tuğla') || facts.verifiedFacts.rawBrief.toLowerCase().includes('tuğla')) {
    shot2Action = `Uniform shrink-wrapped pallets of high-grade construction material (${subject}) are loaded smoothly by an active yellow forklift in the sunlit factory yard, highlighting structural durability and stock volume.`
  } else if (ontology.primaryAffordance === 'apply_spray_mist') {
    shot2Action = `The equipment (${subject}) operates smoothly, releasing an ultra-fine micronized mist spray over verdant orchard foliage.`
  } else if (ontology.offerType === 'digital_product_or_saas') {
    shot2Action = `The digital platform (${subject}) performs live radar business scanning on a premium laptop screen with clean glowing pin indicators. The laptop rests firmly stationary and flat on the desk with zero rotation or spinning.`
  }

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

  const shot3: ShotItem = {
    shotNumber: 3,
    timing: { from: 5.8, to: 8.0 },
    role: 'hero_close',
    framing: isContinuous
      ? (brandName
          ? 'Continuous take: steady macro hero framing reaching the destination of the continuous forward push-in route settling on the primary brand mark and logo'
          : 'Continuous take: close hero framing reaching the destination of the continuous forward push-in route')
      : (brandName ? 'Crisp steady macro hero framing centered on the primary brand mark and logo' : 'Clean hero wide framing'),
    subjectAction: `The subject (${subject}) rests in pristine final state, delivering quiet confidence and commercial prestige.${brandHeroAction}`,
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

  const isAyvaz = brand.toLowerCase().includes('ayvazoğlu') || brand.toLowerCase().includes('ayvazoglu');
  const logoDetail = isAyvaz
    ? ' (minimalist red line-art roof symbol with central upward arrow, and bold uppercase text: "AYVAZOĞLU")'
    : '';

  const brandRevealDirective = brandName
    ? `MANDATORY VISUAL BRAND IDENTITY (5.8s - 8.0s): The verified brand name "${brandName}" and authentic corporate logo mark${logoDetail} are mandatory on-screen visual elements directly in the video. In the final framing (5.8s - 8.0s), the camera settles rock-steadily on a prominent, clean, large brushed steel entrance plaque or office reception sign displaying the authentic logo and bold letters: "${isAyvaz ? 'AYVAZOĞLU' : brandName}". Rock-steady framing, centered at eye level: zero camera shake, zero rapid rotation, zero motion blur, zero distorted letters.`
    : null

  // 7. Assemble Technical Veo English Prompt
  const veoPrompt = [
    `FORMAT: 9:16 vertical commercial video, exactly 8.0 seconds total runtime.`,
    `BRAND PILLAR AND EMOTIONAL INTENT: ${brandPillar} Every visual, lighting, and audio choice should serve this emotional intent directly.`,
    `SUBJECT AND REFERENCE LOCK: Focal subject is "${subject}". ${
      facts.assets.productReference
        ? 'A reference product photo is provided; preserve physical geometry, materials, casing, and colors exactly with zero mutation.' + (
            (subject.toLowerCase().includes('tuğla') || facts.verifiedFacts.rawBrief.toLowerCase().includes('tuğla'))
              ? ' Specifically, the hero product is a perforated hollow clay brick with core rectangular air chambers on top and vertical ribbed fluting on side walls; DO NOT generate solid stone or unperforated bricks.'
              : ''
          )
        : 'Realistic physical proportions and authentic material textures.'
    }`,
    `LOCATION: ${singleLocation}. Strict continuity: single unbroken location, identical lighting setup, zero scene jumping.`,
    `SHOT 1 (0.0s - 2.2s - VISUAL HOOK): ${shot1.framing}. ${shot1.subjectAction}. ${shot1.cameraMotion}.`,
    `SHOT 2 (2.2s - 5.8s - PROOF AND ACTION): ${shot2.framing}. ${shot2.subjectAction}. ${shot2.cameraMotion}.`,
    `SHOT 3 (5.8s - 8.0s - HERO CLOSE): ${shot3.framing}. ${shot3.subjectAction}. ${shot3.cameraMotion}.`,
    ...(brandRevealDirective ? [brandRevealDirective] : []),
    cameraDirective,
    `LIGHT AND PHYSICS: Natural lighting, realistic physical gravity and authentic material reflections. ${colorGradeDirective}`,
    `MUSIC SHAPE: ${musicDirective}.`,
    audioDirective,
    brandName
      ? `TEXT POLICY: No newly generated text or promotional advertising copy (strictly NO prices, NO discount badges, NO phone numbers, NO website URLs, NO promotional captions, NO subtitles, NO floating letters, NO banners, NO CTA badges). The verified brand name "${brandName}", the original corporate logo, and pre-existing product labels are MANDATORY on-screen visual elements directly in the video. Real physical brand identity is strictly preserved: pre-existing printed labels and authentic branding on reference products remain as-is without modification. Do not redesign or invent a logo.`
      : `TEXT POLICY: No newly generated text, captions, prices, phone numbers, calls to action, signs, or fake logos. No gibberish words, small text, long campaign copy, subtitles, floating text, handheld signs, desk signs, graphic overlays, banners or lower thirds. Real physical brand identity is strictly preserved: pre-existing printed labels and authentic branding on reference products remain as-is without modification. Brand name appears only on natural physical surfaces (uniforms, vehicle decals, entrance signage, or product nameplates) matching the brand palette. Do not redesign or invent a logo.`,
    `NEGATIVE CONSTRAINTS: ${V5_STANDARD_NEGATIVES}`,
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
    durationSeconds: 8,
    aspectRatio: '9:16',
    cameraMode,
    singleLocation,
    shots: [shot1, shot2, shot3],
    veoEnglishPrompt: veoPrompt,
    negativePrompt: V5_STANDARD_NEGATIVES,
    brandIdentityMode,
    referenceAssetInput,
    imageToVideoPrompt,
    reasonCode: `shotplan_8s_${cameraMode}_${strategy.primary}_location_${ontology.offerType}`,
  }
}
