import type {
  FactNormalizerOutput,
  OntologyClassification,
  CreativeStrategyOutput,
  HookPlanOutput,
  ShotPlanOutput,
  ShotItem,
  ReferenceAssetInput,
} from './schemas.js'

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
  const cameraMode: 'continuous_take' | 'three_cut' =
    cameraModeInput || 'three_cut'

  const fullContext = `${facts.verifiedFacts.offerName || ''} ${facts.verifiedFacts.rawBrief || ''} ${facts.sectorHint || ''} ${facts.verifiedFacts.features.join(' ')} ${facts.verifiedFacts.benefits.join(' ')}`.toLowerCase()

  // 1b. Product Form & Affordance Breakdown (Strictly derived from verified product facts)
  const isBackpackSprayer = Boolean(
    fullContext.match(/(sırt.*(pompa|ilaçlama|pülverizatör|pulverizatör)|sırt.*tipi|backpack.*sprayer)/)
  )
  const isManualPressureSprayer = Boolean(
    !isBackpackSprayer &&
    fullContext.match(/(manuel.*(pompa|ilaçlama|pulverizatör)|basınçlı.*(pompa|tüp|ilaçlama|pulverizatör)|omuz.*askı.*(pompa|tüp)|el.*pompa|pressure.*sprayer)/)
  )
  const isBrickOrMasonry = Boolean(
    fullContext.match(/(tuğla|blok|kiremit|briket|harç|beton blok|masonry|brick)/)
  )
  const isCosmeticOrSkincare = Boolean(
    fullContext.match(/(serum|cilt|yüz bakım|krem|losyon|parfüm|kozmetik|tonik|damlalık|skincare|dropper)/)
  )

  // 2. Single Location Determination (Priority Rule: Explicit brief/context wins over sector presets)
  let singleLocation = 'Clean, modern and sunlit commercial setting tailored to the subject'
  if (fullContext.match(/(sera|cam sera|greenhouse|seracılık)/)) {
    singleLocation = 'Modern, bright glass greenhouse with organized crop rows and vibrant green foliage under natural daylight'
  } else if (fullContext.match(/(banyo|vanity|ayna|lavabo|bathroom|cilt bakım|serum|krem|kozmetik|güzellik)/)) {
    singleLocation = 'Bright, elegant modern bathroom vanity and minimalist skincare setting with soft natural morning light'
  } else if (isBrickOrMasonry || fullContext.match(/(inşaat|tuğla|yapı|harç|şantiye|beton|çimento|kiremit|blok|duvar|jobsite|construction)/)) {
    singleLocation = 'Modern, active construction jobsite and sunlit outdoor building material yard'
  } else if (ontology.offerType === 'food_or_consumable' || fullContext.match(/(burger|döner|pizza|tatlı|kahve|pasta|kebap|köfte|yemek|yiyecek|içecek|çikolata|lezzet|kahvaltı|gıda|restoran|kafe|mutfak|kitchen)/)) {
    singleLocation = 'Warm artisan kitchen presentation counter with rustic wooden textures'
  } else if (ontology.offerType === 'digital_product_or_saas' || fullContext.match(/(yazılım|platform|\bb2b\b|\bveri\b|\bdata\b|\bapi\b|\bcrm\b|\berp\b|dashboard|\bapp\b|bulut|cloud|\bbot\b|otomasyon|ofis|office)/)) {
    singleLocation = 'Modern sunlit minimalist office desk with natural window light'
  } else if (ontology.offerType === 'property_or_high_consideration_offer' || fullContext.match(/(villa|daire|konut|arsa|gayrimenkul|mülk|rezidans|plaza)/)) {
    singleLocation = 'Contemporary architectural living space with panoramic glass window'
  } else if (fullContext.match(/(tarım|çiftlik|tarla|hasat|ziraat|tohum|fide|meyve bahçesi|zeytinlik|elma bahçesi|bağ\b|orchard|vineyard)/)) {
    singleLocation = 'Sunlit fertile agricultural orchard, vibrant olive grove or green nursery in natural morning daylight'
  } else if (fullContext.match(/(bahçe|garden|çim|peyzaj|çiçek|çalı)/)) {
    singleLocation = 'Sunlit lush residential garden with flowering shrub rows and green landscape in soft natural morning daylight'
  } else if (fullContext.match(/(oto\b|araç|araba|detailing|lastik|motor\b|servis|kaporta|boya)/)) {
    singleLocation = 'High-tech automotive detailing bay or scenic sunlit roadway'
  } else if (ontology.proofMode === 'craftsmanship' || fullContext.match(/(atölye|marangoz|usta|ahşap|metal|tamir|alet|matkap|testere|tesisat)/)) {
    singleLocation = 'Organized sunlit craftsman workshop with authentic tool textures and warm illumination'
  } else if (ontology.proofMode === 'scale_or_inventory' && fullContext.match(/\b(toptan|palet|tır\b|koli\b|sevkiyat)\b/)) {
    singleLocation = 'Organized bright logistics hub and professional outdoor delivery bay'
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
  } else if (isBrickOrMasonry || fullContext.includes('inşaat') || fullContext.includes('tuğla')) {
    brandPillar = `Industrial strength and reliable delivery — this brand is the structural backbone of serious construction projects.`
    colorGradeDirective = `COLOR GRADE: Warm industrial amber, rich earth tones, deep material textures, documentary-grade lifted blacks — conveying strength, scale and reliability.`
    musicDirective = `post-industrial orchestral groove with driving percussion, building from sparse at opening to full-bodied at product hero reveal, resolving on brand close`
  } else if (isCosmeticOrSkincare) {
    brandPillar = `Pure radiance and gentle elegance — helping skin feel naturally healthy, nourished and revitalized.`
    colorGradeDirective = `COLOR GRADE: Soft diffused morning daylight, clean pearlescent whites, luminous pastel tones and soft lifted highlights.`
    musicDirective = `gentle modern ambient acoustic melody with light sparkling rhythm, resolving into peaceful elegance on brand close`
  } else if (isBackpackSprayer || isManualPressureSprayer || fullContext.match(/(tarım|bahçe|bağ|fidan|meyve|ilaçlama|sprey|püskürt)/)) {
    brandPillar = `Agricultural precision and reliable performance — helping growers and professionals care for crops effortlessly.`
    colorGradeDirective = `COLOR GRADE: Natural sunlight with rich vibrant foliage greens, warm morning amber, true product colors and clean lifted shadows.`
    musicDirective = `uplifting natural commercial acoustic rhythm with crisp modern beat, building through spray action, resolving cleanly on brand close`
  } else if (strategy.primary === 'scale_and_availability' || ontology.proofMode === 'scale_or_inventory') {
    brandPillar = `Scale and dependability — this brand delivers at volume with consistent quality and speed.`
    colorGradeDirective = `COLOR GRADE: Bold warm-neutral commercial grade, strong material textures, clean highlights — conveying industrial capability and reliability.`
    musicDirective = `confident commercial rhythm building steadily from opening, peaking during product action, resolving cleanly on brand close`
  }

  // 3. Three Shot Kadraj Setup (Adapts to camera mode)
  const isContinuous = cameraMode === 'continuous_take'

  // Shot 1 Action: Immediate hook in genuine product context (0.0s - 2.2s)
  let shot1Action = `${hook.visualEventDescription} A real professional person (clear recognizable face, industry-appropriate attire, confident purposeful body language) is actively visible in the foreground engaging with the product.`
  if (isBackpackSprayer) {
    shot1Action = `The professional operator straps on and wears the ${subject} comfortably on their back via ergonomic shoulder straps (properly worn backpack equipment, fully off the ground), walking forward along the crop rows with confident purposeful posture, holding the spray wand steadily at side. No spraying yet.`
  } else if (isManualPressureSprayer) {
    shot1Action = `The gardener or operator carries the ${subject} by its top ergonomic handle alongside garden beds, with the shoulder strap slung comfortably over one shoulder, holding the lightweight spray lance ready at side. No spraying yet.`
  } else if (isBrickOrMasonry) {
    shot1Action = `The authentic terracotta ${subject} is showcased in clean hero presentation on an organized pallet at the active construction site, with clear focus on its precise geometry and structural durability.`
  } else if (isCosmeticOrSkincare) {
    shot1Action = `In front of the bright morning mirror, the user holds the elegant ${subject}, gently unsealing or inspecting the glass dropper bottle with delicate fingertips. No application yet.`
  } else if (ontology.offerType === 'food_or_consumable') {
    shot1Action = `The artisan chef presents the freshly prepared ${subject} onto the rustic serving counter with warm, appetizing motion.`
  } else if (ontology.offerType === 'digital_product_or_saas') {
    shot1Action = `A professional user sits at a clean sunlit desk, typing a command or clicking to launch the ${subject} dashboard on screen.`
  }

  const shot1: ShotItem = {
    shotNumber: 1,
    timing: { from: 0.0, to: 2.2 },
    role: 'visual_hook',
    framing: isContinuous
      ? 'Continuous take: wide-medium framing initiating the continuous slow forward push-in route'
      : (isBrickOrMasonry ? 'Eye-level 3/4 commercial macro glide framing the hero product' : 'Front 3/4 low-angle tracking commercial framing facing the subject'),
    subjectAction: shot1Action,
    cameraMotion: isContinuous
      ? 'The camera begins a single unbroken slow forward push-in route gliding smoothly toward the active subject'
      : (isBrickOrMasonry ? 'Smooth commercial tracking camera gliding along the crisp edges of the hero product in the morning sun.' : 'Front low-angle camera moving backward ahead of the subject walking forward toward camera, establishing the real environment and human subject before functional action begins.'),
    lightingAndPhysics: 'Natural daylight with soft specular highlights, shallow depth of field (f/1.8)',
  }

  // Shot 2 Action: Functional proof without collapsing camera (2.2s - 5.8s)
  let shot2Action = `Clear proof of core function: The focal subject (${subject}) performs its core verified function smoothly in realistic physical environment.`
  if (isBackpackSprayer) {
    const foliageDesc = fullContext.match(/(sera|greenhouse)/)
      ? 'crop rows and vibrant green foliage'
      : 'vibrant tree leaves and green foliage'
    shot2Action = `Clear proof of core function: The operator actively directs the spray wand toward ${foliageDesc}; an intense, continuous ultra-fine micronized mist spray coats the leaves with glistening fluid droplets. High-angle tight side view captures the fine aerosol spray mist and leaf surface contact in vivid detail. The ${subject} remains recognizable and firmly worn on the back.`
  } else if (isManualPressureSprayer) {
    shot2Action = `Clear proof of core function: The operator depresses the ergonomic trigger lance, releasing a focused, pressurized fine conical spray mist precisely onto target foliage and flowering shrubs. Tight macro side-profile camera follows the crisp spray pattern and clean nozzle dispersion. The ${subject} cylindrical canister rests steadily nearby.`
  } else if (isBrickOrMasonry) {
    shot2Action = `Clear proof of core function: Uniform shrink-wrapped pallets of high-grade construction material (${subject}) are loaded smoothly in the active building site yard, highlighting structural durability and stock volume.`
  } else if (isCosmeticOrSkincare) {
    shot2Action = `Clear proof of core function: The precision glass dropper pipette draws the smooth, translucent fluid and dispenses a single radiant drop onto the skin, gliding smoothly with instant hydrating glow and silky skin absorption. Tight macro beauty camera captures the luminous drop texture and skin glow.`
  } else if (ontology.offerType === 'digital_product_or_saas') {
    shot2Action = `Clear proof of core function: The digital platform (${subject}) performs live radar business scanning on a premium laptop screen with clean glowing pin indicators.`
  } else if (ontology.offerType === 'food_or_consumable') {
    shot2Action = `Clear proof of core function: Tight macro camera captures rich culinary textures, vibrant fresh ingredients, and steam or savory glaze glistening under warm lights.`
  }

  const shot2CameraMotion = isContinuous
    ? ((isBackpackSprayer || isManualPressureSprayer)
        ? 'Continuing the single unbroken slow forward push-in route, holding steady tracking on the active operational proof and foliage without rushing or zooming in prematurely'
        : 'Continuing the single unbroken slow forward push-in route, holding steady tracking on the active operational proof without rushing or zooming in prematurely')
    : 'Cut 1 at 2.2s. Hard cut to tight high-angle side-profile macro tracking camera, focusing closely on the active tool mechanism and material interaction in full function.'

  const shot2: ShotItem = {
    shotNumber: 2,
    timing: { from: 2.2, to: 5.8 },
    role: 'proof_or_action',
    framing: isContinuous
      ? 'Continuous take: medium framing maintaining steady tracking on the active operational proof'
      : 'CUT 1 at 2.2s: Tight high-angle side-profile macro tracking camera',
    subjectAction: shot2Action,
    cameraMotion: shot2CameraMotion,
    lightingAndPhysics: 'Balanced natural illumination, true-to-life reflections and realistic physics',
  }

  const brandHeroAction = brandName
    ? ` Functional action stops completely. The operator is no longer in frame. In the concluding framing (5.8s - 8.0s, lasting a full continuous 2.2 seconds), the camera settles directly and steadily on the canonical product hero. Zero premature zoom before 5.8s; centered and rock-steady: zero rapid rotation, zero extreme perspective, zero motion blur, zero harsh glare, completely unobstructed. Preserve canonical product branding AS-IS.`
    : ' Functional action stops. The subject rests in pristine final state for the concluding 2.2 seconds with Zero premature zoom before 5.8s.'

  const shot3: ShotItem = {
    shotNumber: 3,
    timing: { from: 5.8, to: 8.0 },
    role: 'hero_close',
    framing: isContinuous
      ? (brandName
          ? 'Continuous take: steady macro hero framing reaching the destination of the continuous forward push-in route settling on the primary brand mark and logo'
          : 'Continuous take: close hero framing reaching the destination of the continuous forward push-in route')
      : (brandName ? 'CUT 2 at 5.8s: Static locked-off macro hero packshot centered on the canonical product' : 'CUT 2 at 5.8s: Clean hero wide framing'),
    subjectAction: `The subject (${subject}) rests in pristine final state, delivering quiet confidence and commercial prestige.${brandHeroAction}`,
    cameraMotion: isContinuous
      ? (brandName
          ? `Continuing the exact same slow forward push-in route smoothly into rock-steady close hero framing settling directly on the authentic product to conclude the unbroken take`
          : 'Continuing the exact same slow forward push-in route smoothly into crisp close hero framing to conclude the unbroken take')
      : (brandName
          ? `Cut 2 at 5.8s. Hard cut to static locked-off macro hero camera locked onto the authentic canonical product form, held rock-steadily until 8.0s`
          : 'Cut 2 at 5.8s. Cut to clean hero wide framing revealing complete focal scene'),
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
    ? `CAMERA MOVEMENT: continuous_take - Single unbroken slow forward push-in route maintained across all 8.0 seconds with distinct three-beat pacing: 0.0s–2.2s establishing action hook, 2.2s–5.8s steady operational tracking holding clear visibility of active function${(isBackpackSprayer || isManualPressureSprayer) ? ' and foliage' : ''}, and 5.8s–8.0s final smooth glide settling rock-steadily into hero close-up on physical product branding strictly for the concluding 2.2 seconds. Zero premature zoom before 5.8s.`
    : `CAMERA MOVEMENT: three_cut - Three visually distinct commercial shots connected by two motivated cuts (CUT 1 at approximately 2.2s, CUT 2 at approximately 5.8s). Strict camera perspective separation: Shot 1 is front-facing low angle tracking, Shot 2 is tight high-angle side-profile action, Shot 3 is static locked-off macro packshot. SHOT 1 CAMERA != SHOT 2 CAMERA, SHOT 1 ACTION != SHOT 2 ACTION, SHOT 2 ACTION != SHOT 3 ACTION. Single unbroken location and identical lighting continuity.`

  const brandRevealDirective = brandName
    ? `HERO BRAND FIDELITY (5.8s - 8.0s): Preserve canonical product branding AS-IS. Do NOT repaint, invent, or force fake "${brandName}" lettering onto the product casing unless that exact wording already exists in the canonical reference image. The separate canonical logo reference is respected cleanly for brand identification. In the final framing (5.8s - 8.0s), the camera holds rock-steadily on the canonical product hero: centered at eye level, zero camera shake, zero rapid rotation, zero motion blur, zero distorted letters.`
    : null

  // 7. Assemble Technical Veo English Prompt
  const cleanPeriod = (str: string) => str.trim().replace(/\.+$/, '')
  const veoPrompt = [
    `FORMAT: 9:16 vertical commercial video, exactly 8.0 seconds total runtime.`,
    `BRAND PILLAR AND EMOTIONAL INTENT: ${brandPillar} Every visual, lighting, and audio choice should serve this emotional intent directly.`,
    `SUBJECT AND REFERENCE LOCK: Focal subject is "${subject}". ${
      facts.assets.productReference
        ? 'A reference product photo is provided; preserve physical geometry, materials, casing, and colors exactly with zero mutation.' + (
            (subject.toLowerCase().includes('tuğla') || facts.verifiedFacts.rawBrief.toLowerCase().includes('tuğla'))
              ? ' Specifically, the hero product is a perforated hollow clay brick with core rectangular air chambers on top and vertical ribbed fluting on side walls; DO NOT generate solid stone or unperforated bricks.'
              : isBackpackSprayer
              ? ' Specifically, the hero product is an ergonomic backpack sprayer worn comfortably on the back via shoulder straps; preserve molded tank casing, caps, hose connection, and handheld spray lance exactly. The product is worn on the operator\'s back, NOT placed on the floor as wheeled equipment.'
              : isManualPressureSprayer
              ? ' Specifically, the hero product is a cylindrical manual pressure canister sprayer with top pump plunger handle and single shoulder carrying strap; preserve canister body, pressure pump plunger, flexible hose, and trigger wand exactly. It is carried by single shoulder strap or set on ground beside operator, NOT worn as a dual-strap backpack.'
              : isCosmeticOrSkincare
              ? ' Specifically, the hero product is an elegant cosmetic glass dropper bottle with precision liquid pipette cap and clean label; preserve bottle shape, amber or translucent glass, dropper bulb, and dropper pipette exactly. DO NOT generate spraying equipment, wands, backpacks, or agricultural gear.'
              : ontology.offerType === 'food_or_consumable'
              ? ' Specifically, the hero product is authentic packaged food or fresh consumable; preserve authentic packaging form, label design, rich culinary textures and colors exactly with zero generic industrial gear.'
              : ' Specifically, preserve authentic physical geometry, packaging, and materials of the focal product exactly with zero mutation.'
          )
        : 'Realistic physical proportions and authentic material textures.'
    }`,
    `LOCATION: ${singleLocation}. Strict continuity: single unbroken location, identical lighting setup, zero scene jumping.`,
    `SHOT 1 (0.0s - 2.2s - VISUAL HOOK): ${cleanPeriod(shot1.framing)}. ${cleanPeriod(shot1.subjectAction)}. ${cleanPeriod(shot1.cameraMotion)}.`,
    `SHOT 2 (2.2s - 5.8s - PROOF AND ACTION): ${cleanPeriod(shot2.framing)}. ${cleanPeriod(shot2.subjectAction)}. ${cleanPeriod(shot2.cameraMotion)}.`,
    `SHOT 3 (5.8s - 8.0s - HERO CLOSE): ${cleanPeriod(shot3.framing)}. ${cleanPeriod(shot3.subjectAction)}. ${cleanPeriod(shot3.cameraMotion)}.`,
    ...(brandRevealDirective ? [brandRevealDirective] : []),
    cameraDirective,
    `LIGHT AND PHYSICS: Natural lighting, realistic physical gravity and authentic material reflections. ${colorGradeDirective}`,
    `MUSIC SHAPE: ${musicDirective}.`,
    audioDirective,
    brandName
      ? `TEXT POLICY: RAW VIDEO IS 100% CLEAN OF GENERATIVE TYPOGRAPHY. Strictly NO newly generated advertising text (strictly NO prices, NO discount badges, NO phone numbers, NO website URLs, NO promotional captions, NO subtitles, NO floating letters, NO banners, NO CTA badges). Real physical brand identity on the reference product is preserved AS-IS without modification or newly painted lettering. Do not redraw or invent a logo or casing label.`
      : `TEXT POLICY: RAW VIDEO IS 100% CLEAN OF GENERATIVE TYPOGRAPHY. Strictly NO newly generated advertising text, captions, prices, phone numbers, calls to action, signs, or fake logos. Real physical brand identity is preserved AS-IS without modification or newly painted lettering.`,
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
