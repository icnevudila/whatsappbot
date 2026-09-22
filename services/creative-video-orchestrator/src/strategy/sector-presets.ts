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
    description: 'Precision agricultural equipment, field performance, outdoor natural sun',
    defaultArchetype: 'demonstration',
    typicalPacing: 'deliberate_confident',
    lightingProfile: 'natural morning sunlight, golden hour rim lighting, authentic outdoor atmosphere',
    cameraLanguage: 'grounded tracking shots, macro nozzle/product details, heroic low-angle static payoff',
    motionCharacter: 'purposeful steady advancement, fine mist dispersion, realistic equipment handling',
    soundscapeDefaults: ['natural orchard ambience', 'crisp morning breeze', 'fine pressurized mist hiss'],
    mandatoryProofTypes: ['micronized atomized mist coverage', 'rugged ergonomic field operation'],
    negativeVisuals: ['car detailing', 'pressure washer lance', 'foam cannon', 'urban studio backdrop'],
  },
  construction_materials: {
    id: 'construction_materials',
    name: 'Construction Materials & Building Supplies',
    description: 'Structural integrity, raw texture, masonry durability, job site credibility',
    defaultArchetype: 'durability_proof',
    typicalPacing: 'deliberate_confident',
    lightingProfile: 'high-contrast directional sun, architectural side-lighting emphasizing textures and mortar lines',
    cameraLanguage: 'architectural steady push-in, macro surface texture sweeps, robust locked tripod framing',
    motionCharacter: 'weighty structural placement, precise alignment, tactile brick/stone handling',
    soundscapeDefaults: ['active construction site atmosphere', 'solid masonry contact clicks', 'subtle breeze'],
    mandatoryProofTypes: ['uniform clay texture', 'dimensional accuracy', 'load-bearing structural integrity'],
    negativeVisuals: ['plastic toy bricks', 'cartoon construction', 'glitzy neon glow', 'unrealistic levitation'],
  },
  software_cloud_b2b: {
    id: 'software_cloud_b2b',
    name: 'Software, Cloud & B2B Solutions',
    description: 'Clean modern corporate, focused workspace, frictionless workflow, tangible business impact',
    defaultArchetype: 'corporate_b2b',
    typicalPacing: 'fluid_cinematic',
    lightingProfile: 'soft diffused daylight, premium architectural minimalist office lighting',
    cameraLanguage: 'smooth gimbal glide, over-the-shoulder interface focus, elegant modern dolly',
    motionCharacter: 'smooth UI transitions, confident decisive professional interactions',
    soundscapeDefaults: ['subtle modern ambient synth', 'quiet productive office ambience', 'crisp UI clicks'],
    mandatoryProofTypes: ['live dashboard metrics', 'seamless multi-channel notification flow'],
    negativeVisuals: ['cluttered desk', 'distorted 3D holograms', 'fictional retro server rooms'],
  },
  food_beverage: {
    id: 'food_beverage',
    name: 'Food & Beverage',
    description: 'Sensory appetite appeal, fresh ingredients, steam/sizzle details',
    defaultArchetype: 'food_appetite',
    typicalPacing: 'macro_detail',
    lightingProfile: 'warm appetizing key light, glistening backlighting on steam and texture',
    cameraLanguage: 'slow-motion macro glide, rotational tabletop reveal, appetite-driven hero lock',
    motionCharacter: 'delicate pour, sizzling heat, crisp slicing action',
    soundscapeDefaults: ['crisp kitchen sizzle', 'subtle acoustic rhythm', 'natural culinary sounds'],
    mandatoryProofTypes: ['steaming fresh texture', 'golden crispy surface'],
    negativeVisuals: ['cold dull lighting', 'artificial plastic food look', 'unhygienic kitchen surfaces'],
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

  /**
   * Registers or overrides a sector preset dynamically at runtime.
   * Can be called from DB loaders or config without code changes or deployments.
   */
  register(preset: SectorPreset): void {
    if (!preset.id || !preset.name) {
      throw new Error('SECTOR_PRESET_INVALID: preset id and name are required.')
    }
    this.presets.set(preset.id.toLowerCase(), {
      ...preset,
      isCustom: true,
    })
  }

  /**
   * Retrieves a sector preset by ID or falls back to generic_commercial.
   */
  get(sectorId: string): SectorPreset {
    const key = (sectorId || '').trim().toLowerCase()
    return this.presets.get(key) || this.presets.get('generic_commercial')!
  }

  has(sectorId: string): boolean {
    return this.presets.has((sectorId || '').trim().toLowerCase())
  }

  list(): SectorPreset[] {
    return Array.from(this.presets.values())
  }

  /**
   * Batch load from external JSON / DB config
   */
  loadFromConfig(presets: SectorPreset[]): void {
    for (const p of presets) {
      this.register(p)
    }
  }
}

export const globalSectorPresetRegistry = new SectorPresetRegistry()
