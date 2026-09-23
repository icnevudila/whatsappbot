export interface SectorPreset {
  id: string
  name: string
  description: string
  defaultArchetype:
    | 'product_hero'
    | 'ugc'
    | 'cinematic_brand'
    | 'demonstration'
    | 'durability_proof'
    | 'corporate_b2b'
    | 'food_appetite'
    | 'service_workflow'
  typicalPacing: 'fast_energetic' | 'deliberate_confident' | 'fluid_cinematic' | 'macro_detail'
  lightingProfile: string
  cameraLanguage: string
  motionCharacter: string
  soundscapeDefaults: string[]
  mandatoryProofTypes: string[]
  negativeVisuals: string[]
  isCustom?: boolean
}

const DEFAULT_PRESETS: Record<string, SectorPreset> = {
  agriculture_farming: {
    id: 'agriculture_farming',
    name: 'Agriculture & Farming',
    description: 'Precision agricultural equipment, field performance, natural morning sun and genuine soil',
    defaultArchetype: 'demonstration',
    typicalPacing: 'deliberate_confident',
    lightingProfile: 'natural morning sunlight, golden hour rim lighting, authentic outdoor atmosphere with natural wind drift',
    cameraLanguage: 'grounded tracking shots, macro nozzle/product details, heroic low-angle static payoff',
    motionCharacter: 'purposeful steady advancement, realistic liquid spray trajectory obeying wind physics, ergonomic operator grip, realistic hose behavior',
    soundscapeDefaults: ['natural orchard ambience', 'crisp morning breeze', 'fine pressurized mist hiss'],
    mandatoryProofTypes: ['micronized atomized mist coverage', 'rugged ergonomic field operation', 'pressure stability'],
    negativeVisuals: ['unrealistic fluid physics', 'floating machinery', 'synthetic lighting', 'urban studio backdrop', 'floating text', 'impossible pressure physics'],
  },
  agriculture_equipment: {
    id: 'agriculture_farming',
    name: 'Agriculture & Farm Equipment',
    description: 'Precision agricultural equipment, field performance, natural morning sun and genuine soil',
    defaultArchetype: 'demonstration',
    typicalPacing: 'deliberate_confident',
    lightingProfile: 'natural morning sunlight, golden hour rim lighting, authentic outdoor atmosphere with natural wind drift',
    cameraLanguage: 'grounded tracking shots, macro nozzle/product details, heroic low-angle static payoff',
    motionCharacter: 'purposeful steady advancement, realistic liquid spray trajectory obeying wind physics, ergonomic operator grip, realistic hose behavior',
    soundscapeDefaults: ['natural orchard ambience', 'crisp morning breeze', 'fine pressurized mist hiss'],
    mandatoryProofTypes: ['micronized atomized mist coverage', 'rugged ergonomic field operation', 'pressure stability'],
    negativeVisuals: ['unrealistic fluid physics', 'floating machinery', 'synthetic lighting', 'urban studio backdrop', 'floating text', 'impossible pressure physics'],
  },
  physical_product: {
    id: 'physical_product',
    name: 'Physical Consumer Products & Hardware',
    description: 'Tangible physical product showcasing, genuine materials, human interaction and functional utility',
    defaultArchetype: 'product_hero',
    typicalPacing: 'deliberate_confident',
    lightingProfile: 'soft diffused commercial lighting, clean reflections revealing authentic surface textures and finishes',
    cameraLanguage: 'macro orbital glide, clean focus pull to functional components, steady eye-level product lock',
    motionCharacter: 'natural tactile handling, genuine weight distribution, clean mechanical operation',
    soundscapeDefaults: ['modern subtle rhythm bed', 'crisp physical actuation click', 'clean room ambience'],
    mandatoryProofTypes: ['tactile material quality', 'functional component movement', 'seamless everyday handling'],
    negativeVisuals: ['plastic toy look', 'distorted product geometry', 'morphing body colors', 'floating graphics', 'hallucinated buttons'],
  },
  consumer_goods: {
    id: 'consumer_goods',
    name: 'Consumer Packaged Goods & Retail',
    description: 'Hero product focus, vibrant packaging, dynamic lifestyle integration',
    defaultArchetype: 'product_hero',
    typicalPacing: 'fast_energetic',
    lightingProfile: 'clean commercial studio lighting, soft reflections on packaging',
    cameraLanguage: 'dynamic orbital tracking, rhythmic whip pans, clean product hero framing',
    motionCharacter: 'energetic unboxing, dynamic hand grab, enthusiastic lifestyle usage',
    soundscapeDefaults: ['upbeat rhythmic percussion', 'crisp package opening click', 'vibrant modern melody'],
    mandatoryProofTypes: ['distinct packaging typography', 'instant satisfaction usage'],
    negativeVisuals: ['distorted branding', 'crumpled boxes', 'blurry label art'],
  },
  ecommerce_product: {
    id: 'ecommerce_product',
    name: 'E-Commerce & Fast Retail',
    description: 'High-converting fast-paced consumer product demonstration, unboxing and instant satisfaction',
    defaultArchetype: 'product_hero',
    typicalPacing: 'fast_energetic',
    lightingProfile: 'vibrant commercial studio key light, crisp rim accents, clean modern color balance',
    cameraLanguage: 'rapid macro push-in, dynamic rotational pan, crisp tabletop hero frame',
    motionCharacter: 'swift unboxing, dynamic hand interaction, immediate functional payoff',
    soundscapeDefaults: ['upbeat modern commercial beat', 'crisp unboxing texture', 'clean sonic hook'],
    mandatoryProofTypes: ['packaging integrity', 'instant ergonomic utility', 'lifestyle fit'],
    negativeVisuals: ['cluttered background', 'blurry typography on packaging', 'amateur blur', 'warped form factor'],
  },
  construction_materials: {
    id: 'construction_materials',
    name: 'Construction Materials & Building Supplies',
    description: 'Structural integrity, raw texture, masonry durability, genuine job site scale and craftsmanship',
    defaultArchetype: 'durability_proof',
    typicalPacing: 'deliberate_confident',
    lightingProfile: 'high-contrast directional sun, architectural side-lighting emphasizing textures and mortar lines',
    cameraLanguage: 'architectural steady push-in, macro surface texture sweeps, robust low-angle tripod framing',
    motionCharacter: 'weighty structural placement, precise alignment, tactile brick/stone handling, zero artificial levitation',
    soundscapeDefaults: ['active construction site atmosphere', 'solid masonry contact clicks', 'distant industrial breeze'],
    mandatoryProofTypes: ['uniform material texture', 'dimensional accuracy', 'load-bearing structural integrity'],
    negativeVisuals: ['plastic toy bricks', 'cartoon construction', 'glitzy neon glow', 'unrealistic levitation', 'fake embossed typography on stone'],
  },
  construction_material: {
    id: 'construction_materials',
    name: 'Construction Materials & Building Supplies',
    description: 'Structural integrity, raw texture, masonry durability, genuine job site scale and craftsmanship',
    defaultArchetype: 'durability_proof',
    typicalPacing: 'deliberate_confident',
    lightingProfile: 'high-contrast directional sun, architectural side-lighting emphasizing textures and mortar lines',
    cameraLanguage: 'architectural steady push-in, macro surface texture sweeps, robust low-angle tripod framing',
    motionCharacter: 'weighty structural placement, precise alignment, tactile brick/stone handling, zero artificial levitation',
    soundscapeDefaults: ['active construction site atmosphere', 'solid masonry contact clicks', 'distant industrial breeze'],
    mandatoryProofTypes: ['uniform material texture', 'dimensional accuracy', 'load-bearing structural integrity'],
    negativeVisuals: ['plastic toy bricks', 'cartoon construction', 'glitzy neon glow', 'unrealistic levitation', 'fake embossed typography on stone'],
  },
  industrial_equipment: {
    id: 'industrial_equipment',
    name: 'Industrial Machinery & Workshop Equipment',
    description: 'Heavy machinery, workshop precision, metal fabrication, continuous heavy-duty reliability',
    defaultArchetype: 'durability_proof',
    typicalPacing: 'deliberate_confident',
    lightingProfile: 'crisp industrial workshop illumination, specular highlights on polished steel and cast iron',
    cameraLanguage: 'slow industrial dolly, technical component close-up, steady overview of workshop floor',
    motionCharacter: 'mechanical precision, steady automated movement, confident operator guidance',
    soundscapeDefaults: ['rhythmic workshop machinery hum', 'precision metal click', 'deep low-frequency power tone'],
    mandatoryProofTypes: ['mechanical alignment', 'clean continuous operation under load'],
    negativeVisuals: ['sparks without reason', 'dangerous unrealistic operation', 'sci-fi lasers', 'floating HUD overlays'],
  },
  real_estate: {
    id: 'real_estate',
    name: 'Real Estate & Architectural Living',
    description: 'Spacious architectural interiors, natural daylight, genuine room scales and premium materials',
    defaultArchetype: 'cinematic_brand',
    typicalPacing: 'fluid_cinematic',
    lightingProfile: 'soft morning sunlight pouring through floor-to-ceiling windows, natural ambient diffusion',
    cameraLanguage: 'smooth steadicam forward glide, wide architectural framing, elegant vertical tilt-up',
    motionCharacter: 'gentle floating camera, zero sudden jerky moves, serene residential stillness',
    soundscapeDefaults: ['gentle acoustic piano motif', 'subtle ambient breeze', 'quiet premium residential silence'],
    mandatoryProofTypes: ['genuine ceiling height and scale', 'pristine floor reflections', 'natural exterior view connection'],
    negativeVisuals: ['warped perspective lines', 'fisheye distortion', 'floating furniture', 'impossible wall angles'],
  },
  furniture_interior: {
    id: 'furniture_interior',
    name: 'Furniture, Decor & Interior Craft',
    description: 'Tactile wood grain, stitched upholstery, elegant joinery, peaceful domestic comfort',
    defaultArchetype: 'product_hero',
    typicalPacing: 'fluid_cinematic',
    lightingProfile: 'warm domestic interior ambient light, delicate rim highlighting fabric weave and wood texture',
    cameraLanguage: 'macro slow slide along seams and wood edges, relaxing eye-level living room reveal',
    motionCharacter: 'smooth serene transitions, gentle cushions settling under light touch',
    soundscapeDefaults: ['warm acoustic ambience', 'subtle textile brush sound', 'mellow residential atmosphere'],
    mandatoryProofTypes: ['fine upholstery stitching', 'solid wood grain continuity', 'flawless joinery fit'],
    negativeVisuals: ['plastic-looking wood', 'morphing fabric colors', 'floating pillows', 'harsh strobe lighting'],
  },
  food_beverage: {
    id: 'food_beverage',
    name: 'Food & Beverage',
    description: 'Sensory appetite appeal, authentic steam, viscous sauce drizzle, chef craftsmanship and fresh garnish',
    defaultArchetype: 'food_appetite',
    typicalPacing: 'macro_detail',
    lightingProfile: 'warm appetizing key light, glistening backlighting catching rising steam and golden crust',
    cameraLanguage: 'shallow depth-of-field 100mm macro glide, rotational tabletop reveal, appetite-driven hero lock',
    motionCharacter: 'viscous sauce pour, gentle rising aromatic steam, crisp knife slice, delicate plate arrangement',
    soundscapeDefaults: ['sizzling pan texture', 'crisp culinary cut', 'warm intimate restaurant murmur'],
    mandatoryProofTypes: ['authentic food textures', 'rising steam obeying air physics', 'glistening sauce consistency'],
    negativeVisuals: ['plastic artificial food', 'cold blue lighting', 'floating ingredients', 'unhygienic kitchen surfaces', 'morphing dish geometry'],
  },
  food_restaurant: {
    id: 'food_beverage',
    name: 'Food, Dining & Culinary Gastronomy',
    description: 'Sensory appetite appeal, authentic steam, viscous sauce drizzle, chef craftsmanship and fresh garnish',
    defaultArchetype: 'food_appetite',
    typicalPacing: 'macro_detail',
    lightingProfile: 'warm appetizing key light, glistening backlighting catching rising steam and golden crust',
    cameraLanguage: 'shallow depth-of-field 100mm macro glide, rotational tabletop reveal, appetite-driven hero lock',
    motionCharacter: 'viscous sauce pour, gentle rising aromatic steam, crisp knife slice, delicate plate arrangement',
    soundscapeDefaults: ['sizzling pan texture', 'crisp culinary cut', 'warm intimate restaurant murmur'],
    mandatoryProofTypes: ['authentic food textures', 'rising steam obeying air physics', 'glistening sauce consistency'],
    negativeVisuals: ['plastic artificial food', 'cold blue lighting', 'floating ingredients', 'unhygienic kitchen surfaces', 'morphing dish geometry'],
  },
  beauty_cosmetics: {
    id: 'beauty_cosmetics',
    name: 'Beauty, Skincare & Cosmetics',
    description: 'Sensory skincare textures, serum droplets, luminous clean skin, pristine aesthetic minimalism',
    defaultArchetype: 'product_hero',
    typicalPacing: 'macro_detail',
    lightingProfile: 'luminous beauty softbox lighting, pristine clean glass bottle reflections, radiant specular highlights',
    cameraLanguage: 'ultra-macro slow motion, delicate 85mm portrait focus, rotational pedestal glide',
    motionCharacter: 'gentle dropper release, silky emulsion spread, smooth fluid viscosity',
    soundscapeDefaults: ['delicate ethereal chime', 'soft droplet sound', 'clean minimalist atmospheric synth'],
    mandatoryProofTypes: ['dropper precision', 'serum clarity and consistency', 'clean bottle typography'],
    negativeVisuals: ['harsh oily reflections', 'unrealistic skin smoothing blur', 'floating glitter explosions', 'artificial neon makeup'],
  },
  automotive: {
    id: 'automotive',
    name: 'Automotive & Mobility Care',
    description: 'Sleek aerodynamic curves, road presence, dynamic wheel rotation, flawless paint finish',
    defaultArchetype: 'demonstration',
    typicalPacing: 'fast_energetic',
    lightingProfile: 'cinematic roadway golden hour, sunset reflections sweeping across vehicle body panels',
    cameraLanguage: 'low-angle vehicle tracking (Russian arm style), macro tire-wheel rim detail, dynamic chase follow',
    motionCharacter: 'confident acceleration, smooth road compliance, sharp aerodynamic movement',
    soundscapeDefaults: ['deep engine hum', 'smooth tire contact on clean asphalt', 'cinematic rising swell'],
    mandatoryProofTypes: ['crisp metallic paint reflections', 'authentic wheel rotation', 'roadway surface realism'],
    negativeVisuals: ['impossible drift physics', 'distorted car proportions', 'cartoon wheels', 'unrealistic flying debris'],
  },
  software_cloud_b2b: {
    id: 'software_cloud_b2b',
    name: 'Software, Cloud & B2B Solutions',
    description: 'Clean modern workspace, actual UI screens (@SoftwareUI), automated workflow clicks, tangible business metrics',
    defaultArchetype: 'corporate_b2b',
    typicalPacing: 'fluid_cinematic',
    lightingProfile: 'soft diffused daylight, premium architectural minimalist office lighting with clean monitor glow',
    cameraLanguage: 'smooth over-the-shoulder interface glide, macro on clean software actions, confident executive payoff',
    motionCharacter: 'smooth UI mouse navigation, instant clean data transition, decisive professional action',
    soundscapeDefaults: ['subtle modern ambient synth', 'quiet productive office ambience', 'crisp tactile keyboard/UI clicks'],
    mandatoryProofTypes: ['live dashboard metrics', 'seamless notification arrival', 'instant report generation'],
    negativeVisuals: ['cluttered desk', 'fake 3D sci-fi holograms', 'meaningless floating HUD', 'distorted fonts on screen', 'retro terminal screens'],
  },
  saas_software: {
    id: 'software_cloud_b2b',
    name: 'SaaS, Software & Digital Platforms',
    description: 'Clean modern workspace, actual UI screens (@SoftwareUI), automated workflow clicks, tangible business metrics',
    defaultArchetype: 'corporate_b2b',
    typicalPacing: 'fluid_cinematic',
    lightingProfile: 'soft diffused daylight, premium architectural minimalist office lighting with clean monitor glow',
    cameraLanguage: 'smooth over-the-shoulder interface glide, macro on clean software actions, confident executive payoff',
    motionCharacter: 'smooth UI mouse navigation, instant clean data transition, decisive professional action',
    soundscapeDefaults: ['subtle modern ambient synth', 'quiet productive office ambience', 'crisp tactile keyboard/UI clicks'],
    mandatoryProofTypes: ['live dashboard metrics', 'seamless notification arrival', 'instant report generation'],
    negativeVisuals: ['cluttered desk', 'fake 3D sci-fi holograms', 'meaningless floating HUD', 'distorted fonts on screen', 'retro terminal screens'],
  },
  b2b_service: {
    id: 'b2b_service',
    name: 'B2B Professional Services & Consulting',
    description: 'Executive conference room, collaborative teamwork, strategic confidence, handshake and verified agreement',
    defaultArchetype: 'corporate_b2b',
    typicalPacing: 'fluid_cinematic',
    lightingProfile: 'bright architectural daylight, high-end corporate glass wall diffusion, modern boardroom elegance',
    cameraLanguage: 'elegant lateral slider across conference table, medium portrait framing of confident professionals',
    motionCharacter: 'deliberate executive gestures, engaged attentive discussion, decisive nod of partnership',
    soundscapeDefaults: ['confident modern corporate pulse', 'quiet professional room acoustics', 'subtle ambient swell'],
    mandatoryProofTypes: ['professional business environment', 'clear human collaboration', 'credible enterprise delivery'],
    negativeVisuals: ['stiff artificial stock model poses', 'empty lifeless corridors', 'fake high-tech holograms', 'giant fake wall signs'],
  },
  logistics: {
    id: 'logistics',
    name: 'Logistics, Fleet & Supply Chain',
    description: 'Organized warehouse operations, systematic parcel handling, punctual fleet dispatch and reliable delivery',
    defaultArchetype: 'service_workflow',
    typicalPacing: 'fast_energetic',
    lightingProfile: 'bright modern distribution center lighting, outdoor dawn sunlight on fleet dispatch docks',
    cameraLanguage: 'wide tracking shot of organized sorting floor, medium follow shot of courier handover',
    motionCharacter: 'swift purposeful logistics movement, barcode scan confirmation, smooth van departure',
    soundscapeDefaults: ['organized distribution center rhythm', 'swift barcode scanner beep', 'punctual dispatch ambiance'],
    mandatoryProofTypes: ['organized carton labeling', 'systematic sorting accuracy', 'on-time vehicle dispatch'],
    negativeVisuals: ['crushed packages', 'messy disordered warehouses', 'reckless vehicle driving', 'distorted company logos on vans'],
  },
  hospitality: {
    id: 'hospitality',
    name: 'Hospitality, Hotels & Travel Comfort',
    description: 'Warm guest welcome, pristine suite preparation, tranquil resort amenities and attentive service',
    defaultArchetype: 'cinematic_brand',
    typicalPacing: 'fluid_cinematic',
    lightingProfile: 'warm golden sunset lighting across hotel balcony, intimate soft interior chandelier tones',
    cameraLanguage: 'slow sweeping reveal across luxury suite, welcoming eye-level lobby reception entrance',
    motionCharacter: 'unhurried relaxed pace, gracious host gesture, gentle fabric movement in balcony breeze',
    soundscapeDefaults: ['soothing ambient acoustic melody', 'gentle outdoor water fountain', 'soft room acoustics'],
    mandatoryProofTypes: ['crisp immaculate bed linens', 'authentic architectural views', 'welcoming staff presence'],
    negativeVisuals: ['harsh commercial fluorescent lighting', 'crowded chaotic spaces', 'distorted room geometries', 'artificial hotel signs'],
  },
  local_service: {
    id: 'local_service',
    name: 'Local Services, Home Craft & Repair',
    description: 'Skilled local technician, organized tool kit, respectful residential service, immediate problem resolution',
    defaultArchetype: 'service_workflow',
    typicalPacing: 'deliberate_confident',
    lightingProfile: 'authentic residential day lighting, clean portable work lamp illumination on work area',
    cameraLanguage: 'close-up on precise tool usage, smiling handshake with relieved homeowner, steady service van hero shot',
    motionCharacter: 'skillful deliberate hand craftsmanship, tidy tool placement, friendly and respectful demeanor',
    soundscapeDefaults: ['authentic craftsmanship sounds', 'clean tool click', 'warm neighborhood ambient outdoor tone'],
    mandatoryProofTypes: ['neat tool organization', 'flawless repair completion', 'direct customer satisfaction'],
    negativeVisuals: ['messy debris left behind', 'unprofessional scruffy appearance', 'dangerous electrical arcs', 'exaggerated comic clumsiness'],
  },
  generic_commercial: {
    id: 'generic_commercial',
    name: 'Generic Commercial Standard',
    description: 'Universal high-fidelity commercial cinematography for any unclassified sector',
    defaultArchetype: 'cinematic_brand',
    typicalPacing: 'fluid_cinematic',
    lightingProfile: 'balanced three-point commercial lighting, cinematic rim and natural fill',
    cameraLanguage: 'smooth dolly movements, eye-level framing, confident closing brand lock',
    motionCharacter: 'controlled fluid motion, elegant pacing',
    soundscapeDefaults: ['ambient modern music bed', 'subtle environmental atmosphere'],
    mandatoryProofTypes: ['clear product presence', 'tangible consumer benefit'],
    negativeVisuals: ['amateur camera shake', 'low quality compression artifacts', 'warped geometry'],
  },
}

export class SectorPresetRegistry {
  private presets = new Map<string, SectorPreset>()

  constructor() {
    // Load built-in defaults
    for (const [key, preset] of Object.entries(DEFAULT_PRESETS)) {
      this.presets.set(key.toLowerCase(), preset)
    }
  }

  register(preset: SectorPreset): void {
    if (!preset.id || !preset.name) {
      throw new Error('SECTOR_PRESET_INVALID: preset id and name are required.')
    }
    this.presets.set(preset.id.toLowerCase(), {
      ...preset,
      isCustom: true,
    })
  }

  get(sectorId: string): SectorPreset {
    const key = (sectorId || '').trim().toLowerCase()
    // Exact or normalized match
    if (this.presets.has(key)) return this.presets.get(key)!
    
    // Fuzzy sector matching
    if (key.includes('agri') || key.includes('tarim') || key.includes('cift') || key.includes('bahce') || key.includes('hasat')) {
      return this.presets.get('agriculture_farming') || this.presets.get('agriculture_equipment')!
    }
    if (key.includes('construct') || key.includes('insaat') || key.includes('yapi') || key.includes('tugla') || key.includes('beton') || key.includes('cimento')) {
      return this.presets.get('construction_materials') || this.presets.get('construction_material')!
    }
    if (key.includes('food') || key.includes('gida') || key.includes('restoran') || key.includes('yemek') || key.includes('kafe') || key.includes('kahve')) {
      return this.presets.get('food_beverage') || this.presets.get('food_restaurant')!
    }
    if (key.includes('soft') || key.includes('saas') || key.includes('yazilim') || key.includes('cloud') || key.includes('bulut') || key.includes('app')) {
      return this.presets.get('software_cloud_b2b') || this.presets.get('saas_software')!
    }
    if (key.includes('real_estate') || key.includes('emlak') || key.includes('gayrimenkul') || key.includes('konut') || key.includes('villa')) {
      return this.presets.get('real_estate')!
    }
    if (key.includes('furnitur') || key.includes('mobilya') || key.includes('dekor') || key.includes('ic_mimar')) {
      return this.presets.get('furniture_interior')!
    }
    if (key.includes('beauty') || key.includes('kozmetik') || key.includes('bakim') || key.includes('parfum') || key.includes('cilt')) {
      return this.presets.get('beauty_cosmetics')!
    }
    if (key.includes('auto') || key.includes('otomotiv') || key.includes('arac') || key.includes('lastik')) {
      return this.presets.get('automotive')!
    }
    if (key.includes('logistic') || key.includes('lojistik') || key.includes('kargo') || key.includes('nakliye') || key.includes('depo')) {
      return this.presets.get('logistics')!
    }
    if (key.includes('hotel') || key.includes('otel') || key.includes('turizm') || key.includes('konaklama')) {
      return this.presets.get('hospitality')!
    }
    if (key.includes('service') || key.includes('hizmet') || key.includes('tamir') || key.includes('usta') || key.includes('servis')) {
      return this.presets.get('local_service')!
    }
    if (key.includes('b2b') || key.includes('danisman') || key.includes('kurumsal') || key.includes('ajans')) {
      return this.presets.get('b2b_service')!
    }
    if (key.includes('ecom') || key.includes('eticaret') || key.includes('perakende') || key.includes('alisveris')) {
      return this.presets.get('ecommerce_product')!
    }
    if (key.includes('industr') || key.includes('sanayi') || key.includes('imalat') || key.includes('makine') || key.includes('atolye')) {
      return this.presets.get('industrial_equipment')!
    }

    return this.presets.get('physical_product') || this.presets.get('generic_commercial')!
  }

  has(sectorId: string): boolean {
    return this.presets.has((sectorId || '').trim().toLowerCase())
  }

  list(): SectorPreset[] {
    return Array.from(this.presets.values())
  }

  loadFromConfig(presets: SectorPreset[]): void {
    for (const p of presets) {
      this.register(p)
    }
  }
}

export const globalSectorPresetRegistry = new SectorPresetRegistry()
