/**
 * MESAJIFY CREATIVE STUDIO — SECTOR DNA ENGINE
 *
 * Automatic classification of business sector and injection of realistic
 * physical depth, authentic materials, lighting, and environmental context.
 *
 * Strictly NO hard-coded company names — pure context and linguistic analysis.
 */

export interface SectorDna {
  sectorId: string
  nameTr: string
  preferredArchetypes: string[]
  isPhysicalProduct?: boolean
  productDominanceRequired?: boolean
  physicalEnvironment: {
    primaryScene: string
    depthElements: string[]
    materialTextures: string[]
    lightingPhysics: string
    atmosphericEffects: string[]
  }
  humanInteraction: {
    typicalRole: string
    attire: string
    authenticAction: string
  }
  brandPaletteMood: {
    recommendedHarmonies: string[]
    avoidColors: string[]
  }
  antiGenericDirectives: string[]
}

export const SECTOR_DNA_REGISTRY: Record<string, SectorDna> = {
  AGRICULTURE: {
    sectorId: 'AGRICULTURE',
    nameTr: 'Tarım, Bahçe & Çiftlik',
    isPhysicalProduct: true,
    productDominanceRequired: true,
    preferredArchetypes: ['PRODUCT_COMMERCE_HERO', 'HYBRID_PRODUCT_USAGE', 'MATERIAL_TEXTURE_HERO', 'ORGANIC_LIFESTYLE', 'REAL_WORLD_USAGE'],
    physicalEnvironment: {
      primaryScene: 'Lush Anatolian orchard, fertile terraced olive grove, modern greenhouse, or sunlit harvest field',
      depthElements: ['Foreground dew-covered foliage or micro water-droplets', 'Hero equipment/produce in sharp focus', 'Rich dark soil furrow lines', 'Distant rolling hills or modern greenhouse steel frames'],
      materialTextures: ['Rich agricultural loam soil', 'Natural sunlit orchard foliage', 'Sun-cured weathered timber', 'Organic earth and field textures'],
      lightingPhysics: 'Warm low-angle sun with authentic micro-droplet scattering (Tyndall effect) and golden rim highlights on leaves and machinery',
      atmosphericEffects: ['Fine atomized water spray / mist from nozzle', 'Morning sun vapor rising from warm moist earth', 'Airborne pollen or gentle dust motes in sunbeams'],
    },
    humanInteraction: {
      typicalRole: 'Skilled agricultural specialist or third-generation grower',
      attire: 'Authentic canvas field jacket, durable work gloves, clean utility boots',
      authenticAction: 'Inspecting leaf health, adjusting precision brass nozzle, harvesting ripe produce with care',
    },
    brandPaletteMood: {
      recommendedHarmonies: ['Olive green', 'Sunlit ochre', 'Terracotta', 'Deep earth brown'],
      avoidColors: ['Cold sterile hospital cyan', 'Artificial neon pink', 'Fake cyber purple'],
    },
    antiGenericDirectives: [
      'No plastic fake leaves or studio green paper cutouts',
      'No clean models in evening wear pretending to farm',
      'No generic stock tractors from American flat prairies when portraying Mediterranean orchards',
    ],
  },

  CONSTRUCTION: {
    sectorId: 'CONSTRUCTION',
    nameTr: 'İnşaat, Yapı & Mimarlık',
    isPhysicalProduct: true,
    productDominanceRequired: true,
    preferredArchetypes: ['MATERIAL_COMMERCE_HERO', 'PRODUCT_COMMERCE_HERO', 'ARCHITECTURAL_PRESTIGE', 'INDUSTRIAL_POWER', 'MATERIAL_TEXTURE_HERO'],
    physicalEnvironment: {
      primaryScene: 'Prestige architectural jobsite, high-end facade installation, clean precast factory, or executive showroom',
      depthElements: ['Foreground razor-sharp brick/clinker texture', 'Precision laser level guideline', 'Structural steel rebar or scaffolding grid in midground', 'Sunlit architectural skyline or tower crane silhouetted against deep sky'],
      materialTextures: ['Kiln-fired clinker brick with tactile iron-spot variation', 'Honed precast concrete with natural aggregate', 'Powder-coated architectural aluminum', 'Smooth cement mortar joints'],
      lightingPhysics: 'Dramatic late-afternoon solar raking light casting deep structural shadow reveals across masonry joints and metal seams',
      atmosphericEffects: ['Fine airborne stone cutting mist or ambient dust motes in sunbeams', 'Sun glinting off structural glass corners and polished masonry edges'],
    },
    humanInteraction: {
      typicalRole: 'Licensed structural engineer, master facade installer, or project architect',
      attire: 'High-visibility premium technical vest, modern safety helmet (baret), calibrated digital tablet or blueprints',
      authenticAction: 'Checking masonry plumb line with precision spirit level, reviewing facade alignment against structural grid',
    },
    brandPaletteMood: {
      recommendedHarmonies: ['Basalt charcoal', 'Brick terracotta', 'Safety gold', 'Architectural stone grey'],
      avoidColors: ['Pastel candy pink', 'Sleepy washed-out beige with zero contrast', 'Electric rave neon'],
    },
    antiGenericDirectives: [
      'No crooked AI bricks with melting mortar or impossible geometry',
      'No cartoon miniature 3D houses or plastic toy hardhats',
      'No models holding tools backwards or without required jobsite safety attire',
    ],
  },

  TECH_SAAS: {
    sectorId: 'TECH_SAAS',
    nameTr: 'Yazılım, Teknoloji & Dijital',
    preferredArchetypes: ['MODERN_TECH_GLASS', 'FUTURISTIC_DATA', 'CLEAN_CORPORATE', 'SOCIAL_FIRST_BOLD'],
    physicalEnvironment: {
      primaryScene: 'State-of-the-art dark-mode command center, sleek architectural tech hub, or zero-gravity floating UI studio',
      depthElements: ['Floating semi-transparent UI metric pill in near foreground', 'Hero software dashboard on sleek borderless hardware display', 'Layered frosted glass analytics cards', 'Subtle architectural ambient reflections of city lights'],
      materialTextures: ['Anti-reflective matte obsidian glass', 'Anodized aerospace aluminum (Space Grey)', 'Subsurface scattering on translucent UI acrylic', 'Laser-etched silicon wafer patterns'],
      lightingPhysics: 'Controlled luminous screen glow illuminating keyboard and desk surface, combined with high-CRI soft directional edge rim lighting',
      atmosphericEffects: ['Subtle volumetric light shafts through glass partition', 'Optical lens bloom along glowing data vectors and status indicators'],
    },
    humanInteraction: {
      typicalRole: 'Principal software engineer, data architect, or tech founder',
      attire: 'Minimalist high-quality dark crewneck, technical watch, focused modern presence',
      authenticAction: 'Interpreting real-time conversion metrics on screen, reviewing system architecture diagram with colleague',
    },
    brandPaletteMood: {
      recommendedHarmonies: ['Vibrant tech emerald #10B981', 'Electric indigo #6366F1', 'Deep void dark #0B0F19', 'Cyan optic #06B6D4'],
      avoidColors: ['Muddy brown', 'Faded dull sepia', 'Tacky 90s primary red/yellow/blue clown mixes'],
    },
    antiGenericDirectives: [
      'No 1990s green Matrix binary code cascades (010101)',
      'No cartoon robot mascots with antenna and blinking eyes',
      'No fake abstract floating gear icons that signify nothing',
    ],
  },

  FOOD_BEVERAGE: {
    sectorId: 'FOOD_BEVERAGE',
    nameTr: 'Gıda, Restoran & Gastronomi',
    preferredArchetypes: ['FOOD_APPETITE', 'MATERIAL_TEXTURE_HERO', 'ORGANIC_LIFESTYLE', 'MAXIMALIST_PROMO'],
    physicalEnvironment: {
      primaryScene: 'Bustling artisanal open kitchen, warm bistro dining table, rustic olive-wood cutting surface, or marble pastry counter',
      depthElements: ['Foreground sprinkle of fresh sea salt crystals or chopped herbs', 'Hero plated dish in succulent razor-sharp focus', 'Rising aromatic steam plume illuminated from behind', 'Warm blurred restaurant bokeh and wine glasses'],
      materialTextures: ['Charred wood-fired crust', 'Glistening virgin olive oil sheen', 'Melted cheese stretch', 'Craggy sea salt flakes', 'Glazed ceramic plate craquelure'],
      lightingPhysics: 'Warm 3200K rim back-lighting creating mouthwatering specular highlights on glazes and sauces while making rising steam luminous',
      atmosphericEffects: ['Delicate swirling hot steam plume', 'Micro-droplets of sizzling oil or citrus zest burst', 'Fine dusting of flour or pulverized spice'],
    },
    humanInteraction: {
      typicalRole: 'Executive chef, master baker, or passionate home host',
      attire: 'Crisp charcoal or white chef apron, rolled sleeves, professional culinary demeanor',
      authenticAction: 'Drizzling finishing olive oil from copper spout, garnishing with fresh basil sprig, serving piping hot plate',
    },
    brandPaletteMood: {
      recommendedHarmonies: ['Warm appetite amber #D97706', 'Rich burgundy wine #881337', 'Fresh herb green #15803D', 'Warm ivory cream #FEF3C7'],
      avoidColors: ['Cold sterile hospital blue', 'Unnatural neon purple', 'Dirty desaturated gray'],
    },
    antiGenericDirectives: [
      'No plastic-looking CGI burgers with rubber tomatoes',
      'No cold unappetizing bluish lighting on warm cooked dishes',
      'No fake clip-art forks, knives, or cartoon chef hats',
    ],
  },

  HEALTH_CLINICAL: {
    sectorId: 'HEALTH_CLINICAL',
    nameTr: 'Sağlık, Klinik & Medikal',
    preferredArchetypes: ['CLINICAL_PREMIUM', 'CLEAN_CORPORATE', 'ORGANIC_LIFESTYLE'],
    physicalEnvironment: {
      primaryScene: 'Pristine aesthetic clinic, high-end dental suite, modern dermatological studio, or state-of-the-art laboratory',
      depthElements: ['Crisp foreground product on frosted glass plinth', 'Soft white-on-white architectural reveal', 'Gentle clinical depth gradient', 'Sun-drenched floor-to-ceiling privacy glass'],
      materialTextures: ['Silica glass', 'Titanium medical instruments', 'Flawless white composite stone', 'Microscopic water hydration droplets'],
      lightingPhysics: 'Diffuse shadowless high-CRI clinical daylight with delicate pure-white rim accents projecting hygienic perfection and calming safety',
      atmosphericEffects: ['Microscopic aerosol hydration mist', 'Pure crystalline specular reflections on sterile glass and chrome surfaces'],
    },
    humanInteraction: {
      typicalRole: 'Board-certified dental specialist, aesthetic dermatologist, or compassionate clinician',
      attire: 'Modern fitted medical coat in pure white or soft slate, surgical loupes, calm confident smile',
      authenticAction: 'Explaining a treatment plan with digital 3D model, gently applying skincare serum with pipette',
    },
    brandPaletteMood: {
      recommendedHarmonies: ['Medical cyan #0EA5E9', 'Mint eucalyptus #10B981', 'Pristine pure white #FFFFFF', 'Warm platinum #E2E8F0'],
      avoidColors: ['Alarming hazard red', 'Sickly yellow-green', 'Dark depressive black'],
    },
    antiGenericDirectives: [
      'No frightening blood, needles, or painful surgical tools',
      'No cheesy 3D cartoon teeth with smiling faces',
      'No crowded cluttered layouts creating patient anxiety',
    ],
  },

  FASHION_RETAIL: {
    sectorId: 'FASHION_RETAIL',
    nameTr: 'Moda, Tekstil & Butik',
    preferredArchetypes: ['EDITORIAL_LUXURY', 'MAGAZINE_COVER', 'COLLAGE_CAMPAIGN', 'SOCIAL_FIRST_BOLD'],
    physicalEnvironment: {
      primaryScene: 'High-fashion editorial cyclorama, Paris Haussmannian apartment, brutalist concrete showroom, or vibrant urban streetscape',
      depthElements: ['Foreground soft fabric drape or motion blur', 'In-focus hero garment / footwear / accessory', 'Structured shadow pattern across floor', 'Curated architectural background tones'],
      materialTextures: ['Heavyweight cotton twill', 'Brushed suede', 'Full-grain calfskin leather', 'Polished metal hardware', 'Flowing silk habotai'],
      lightingPhysics: 'High-fashion editorial lighting: giant octabank key combined with crisp directional kicker rim light sculpting garment silhouette',
      atmosphericEffects: ['Dynamic fabric motion in wind', 'Subtle fine film grain and high-fashion optical lens halation'],
    },
    humanInteraction: {
      typicalRole: 'High-fashion model or confident streetwear trendsetter',
      attire: 'Impeccably tailored seasonal hero outfit with deliberate styling balance',
      authenticAction: 'Striking an assertive high-fashion editorial pose, buttoning tailored jacket, striding forward with conviction',
    },
    brandPaletteMood: {
      recommendedHarmonies: ['Monochrome black & white', 'Warm camel #C19A6B', 'Rich cobalt #1D4ED8', 'Sartorial olive #3F4F38'],
      avoidColors: ['Cheap neon novelty colors', 'Muddy desaturated beige'],
    },
    antiGenericDirectives: [
      'No stiff unnatural mannequin stock photo poses',
      'No distorted fabric folds or melted AI buttons',
      'No generic supermarket discount tags over the model’s body',
    ],
  },

  AUTOMOTIVE_LOGISTICS: {
    sectorId: 'AUTOMOTIVE_LOGISTICS',
    nameTr: 'Otomotiv, Lojistik & Araç',
    preferredArchetypes: ['HIGH_ENERGY_PERFORMANCE', 'INDUSTRIAL_POWER', 'CINEMATIC_PRODUCT_HERO', 'BOLD_RETAIL'],
    physicalEnvironment: {
      primaryScene: 'Wet asphalt racetrack at dusk, modern distribution logistics hub, high-tech automotive detailing bay, or scenic mountain pass',
      depthElements: ['Wet asphalt reflections and tire water spray in foreground', 'Razor-sharp vehicle/part in dynamic three-quarter hero pose', 'Motion-blurred background landscape or high-bay logistics racks', 'Dramatic twilight horizon or industrial floodlights'],
      materialTextures: ['Multi-stage automotive clear-coat gloss', 'Raw forged carbon fiber weave', 'Perforated leather upholstery', 'Treaded vulcanized rubber'],
      lightingPhysics: 'Long sweeping studio strip-box reflections highlighting aerodynamic shoulder lines, paired with illuminated LED headlights and tail light streaks',
      atmosphericEffects: ['Fine tire water mist / road spray', 'Warm heat haze above asphalt', 'Dynamic light trails from passing vehicles'],
    },
    humanInteraction: {
      typicalRole: 'Automotive test driver, master technician, or logistics fleet commander',
      attire: 'Technical racing suit or clean automotive master technician uniform',
      authenticAction: 'Gripping leather steering wheel at apex of turn, inspecting ceramic brake caliper with digital micrometer',
    },
    brandPaletteMood: {
      recommendedHarmonies: ['Carbon asphalt #111827', 'Racing red #DC2626', 'Electric cobalt #2563EB', 'Liquid silver #94A3B8'],
      avoidColors: ['Pastel baby pink', 'Faded vintage floral tones', 'Limp desaturated olive'],
    },
    antiGenericDirectives: [
      'No warped AI wheels with impossible spoke counts',
      'No floating cars without natural contact shadows on pavement',
      'No generic stock steering wheels missing brand logos',
    ],
  },

  BEAUTY_COSMETICS: {
    sectorId: 'BEAUTY_COSMETICS',
    nameTr: 'Kozmetik, Bakım & Parfüm',
    preferredArchetypes: ['EDITORIAL_LUXURY', 'STUDIO_PEDESTAL', 'MATERIAL_TEXTURE_HERO', 'ORGANIC_LIFESTYLE'],
    physicalEnvironment: {
      primaryScene: 'Sun-drenched marble bathroom vanity, minimalist Parisian fragrance pedestal, or organic water-ripple studio stage',
      depthElements: ['Gentle water surface ripple in foreground', 'Flawless glass bottle / jar in razor-sharp focus with liquid refraction', 'Textured botanical ingredient (damask rose petal, aloe vera slice)', 'Soft neutral plaster wall with window shadow pattern'],
      materialTextures: ['Heavy optical perfume glass', 'Frosted matte acrylic', 'Viscous serum droplets', 'Crushed botanical petals', 'Honed rose marble'],
      lightingPhysics: 'Ethereal back-lighting refracting through liquid fragrance or serum, casting prismatic caustic patterns on the stone surface below',
      atmosphericEffects: ['Microscopic water mist / aerosol spray', 'Suspended micro-bubbles inside clear serum bottle', 'Soft golden sunbeam illumination'],
    },
    humanInteraction: {
      typicalRole: 'Skincare muse with glowing, healthy bare skin',
      attire: 'Minimalist neutral robe, hair tucked naturally, clean radiant presence',
      authenticAction: 'Applying single drop of golden serum to cheekbone, inhaling natural fragrance with closed eyes',
    },
    brandPaletteMood: {
      recommendedHarmonies: ['Warm champagne #F5E6D3', 'Blush rose #E2A7A1', 'Earthy terracotta #C87D65', 'Pure cream #FFFDF9'],
      avoidColors: ['Harsh neon green', 'Industrial dirty darks', 'Aggressive garish reds'],
    },
    antiGenericDirectives: [
      'No fake airbrushed plastic skin with missing pores',
      'No cartoon cosmetic tubes without realistic material reflections',
      'No tacky discount starbursts ruining high-end luxury cosmetics',
    ],
  },

  GENERAL_COMMERCIAL: {
    sectorId: 'GENERAL_COMMERCIAL',
    nameTr: 'Genel Ticaret & Hizmet',
    preferredArchetypes: ['CINEMATIC_PRODUCT_HERO', 'BOLD_RETAIL', 'STUDIO_PEDESTAL', 'REAL_WORLD_USAGE', 'CLEAN_CORPORATE'],
    physicalEnvironment: {
      primaryScene: 'Contemporary commercial showroom, elegant architectural retail space, or versatile studio stage',
      depthElements: ['Subtle foreground framing elements', 'Hero commercial offer / product in sharp focus', 'Balanced contextual midground', 'Clean atmospheric background with appropriate depth of field'],
      materialTextures: ['Matte composite surfaces', 'Polished metal accents', 'Natural architectural wood', 'Crisp branded packaging'],
      lightingPhysics: 'Balanced 3-point commercial advertising lighting with soft natural shadows and crisp edge separation',
      atmosphericEffects: ['Subtle optical lens flare on specular highlights', 'Crisp clean commercial clarity'],
    },
    humanInteraction: {
      typicalRole: 'Confident professional or satisfied customer',
      attire: 'Modern smart-casual or professional business attire',
      authenticAction: 'Engaging with the product or service with natural satisfaction',
    },
    brandPaletteMood: {
      recommendedHarmonies: ['Deep navy #0F172A', 'Vibrant emerald #059669', 'Crisp white #FFFFFF', 'Warm charcoal #334155'],
      avoidColors: ['Over-saturated rainbow clashes', 'Muddy drab brown'],
    },
    antiGenericDirectives: [
      'No centered product floating on an empty generic gradient',
      'No fake stock photo smiles with unnatural expressions',
      'No unaligned text elements or tacky clip-art icons',
    ],
  },
}

// Static precompiled regexes for sub-millisecond sector classification
const AGRI_REGEX = /tarım|bahçe|çiftlik|pompa|ilaçlama|gübre|tohum|fide|hasat|zeytin|sera|traktör|toprak|sulama|ziraat|bağ|bostan|meyve|sebze|organik/
const CONST_REGEX = /inşaat|yapı|tuğla|klinker|beton|çimento|mimarlık|cephe|şantiye|demir|çelik|seramik|fayans|mermer|boya|çatı|yalıtım|harç|taş/
const SAAS_REGEX = /yazılım|app|uygulama|saas|bulut|cloud|crm|erp|dashboard|api|veritabanı|ai|yapay zeka|otomasyon|b2b|dijital|analitik|platform|kod/
const FOOD_REGEX = /döner|kebap|burger|pizza|restoran|kafe|cafe|lokanta|yemek|tatlı|kahve|lahmacun|fırın|lezzet|gurme|şef|makarna|ızgara|paket servis|menü/
const HEALTH_REGEX = /diş|klinik|poliklinik|doktor|hastane|sağlık|medikal|implant|ortodonti|estetik|dermatoloji|tedavi|eczane|hekim|hasta|göz|saç ekim/
const FASHION_REGEX = /giyim|elbise|butik|tekstil|ayakkabı|çanta|moda|pantolon|gömlek|ceket|mont|kıyafet|takı|aksesuar|deri|butik/
const AUTO_REGEX = /otomobil|araç|araba|lastik|jant|motor|oto|servis|detailing|kargo|lojistik|nakliye|filo|yedek parça|yağ|bakım/
const COSMETICS_REGEX = /kozmetik|parfüm|krem|serum|bakım|makyaj|ruj|cilt|güzellik|kolonya|losyon|şampuan|maske|esans/

/**
 * Automatically classifies business sector using product name, description,
 * campaign brief, and brand context without hardcoding company names.
 */
export function classifySector(input: {
  productName?: string
  productDescription?: string
  brief?: string
  brandName?: string
  category?: string
}): SectorDna {
  const text = [
    input.productName || '',
    input.productDescription || '',
    input.brief || '',
    input.category || '',
    input.brandName || '',
  ]
    .join(' ')
    .toLowerCase()

  if (AGRI_REGEX.test(text)) return SECTOR_DNA_REGISTRY.AGRICULTURE
  if (CONST_REGEX.test(text)) return SECTOR_DNA_REGISTRY.CONSTRUCTION
  if (SAAS_REGEX.test(text)) return SECTOR_DNA_REGISTRY.TECH_SAAS
  if (FOOD_REGEX.test(text)) return SECTOR_DNA_REGISTRY.FOOD_BEVERAGE
  if (HEALTH_REGEX.test(text)) return SECTOR_DNA_REGISTRY.HEALTH_CLINICAL
  if (FASHION_REGEX.test(text)) return SECTOR_DNA_REGISTRY.FASHION_RETAIL
  if (AUTO_REGEX.test(text)) return SECTOR_DNA_REGISTRY.AUTOMOTIVE_LOGISTICS
  if (COSMETICS_REGEX.test(text)) return SECTOR_DNA_REGISTRY.BEAUTY_COSMETICS

  return SECTOR_DNA_REGISTRY.GENERAL_COMMERCIAL
}
