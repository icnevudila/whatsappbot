/**
 * MESAJIFY VIDEO ENGINE V5 - GENERIC SECTOR & CREATIVE ENVIRONMENT PROFILES
 * 
 * 300+ Firma ve Çok Kiracılı Mimari İlkesi:
 * Uygulama kodunda (shot-planner, ontology-analyzer, hook-selector) hiçbir marka veya sektöre
 * özel if/else kontrolü (isAgriOrSprayer, tuğla kontrolü vb.) BULUNMAZ.
 * 
 * Tüm lokasyonlar, yasaklı ortamlar, marka direkleri, renk şemaları ve müzik direktifleri
 * bu generic profil motoru üzerinden çözülür. Herhangi bir firma kendi Brand Manifest'inde
 * özel "creative_environment_profile" tanımlayarak bu kuralları kod değiştirmeden ezebilir.
 */

import type { VisualAffordanceAction, ProofMode, PrimaryValue } from './schemas'

export type CreativeEnvironmentProfile = {
  sectorId: string
  label: string
  preferredEnvironments: string[]
  forbiddenEnvironments: string[]
  preferredUsageContext: string[]
  brandPillar: string
  colorGradeDirective: string
  musicDirective: string
  defaultAffordance?: VisualAffordanceAction
  defaultProofMode?: ProofMode
  defaultPrimaryValue?: PrimaryValue
  actionHookTemplate?: string
}

export const BUILTIN_SECTOR_PROFILES: Record<string, CreativeEnvironmentProfile> = {
  agriculture_equipment: {
    sectorId: 'agriculture_equipment',
    label: 'Tarım, Bahçe & Ziraat Ekipmanları',
    preferredEnvironments: [
      'Sunlit fertile agricultural orchard with lush green fruit trees and natural orchard soil under warm morning sunlight',
      'Vibrant commercial greenhouse with healthy vegetable crops under diffuse natural daylight',
      'Expansive sunlit agricultural field with clean rows of crops under open skies',
    ],
    forbiddenEnvironments: [
      'warehouse',
      'storage facility',
      'logistics center',
      'factory interior',
      'shipping pallets',
      'cardboard boxes',
      'delivery trucks',
      'concrete loading dock',
      'industrial forklift',
      'indoor loading bay',
      'dark indoors',
      'artificial studio backdrop',
      'indoor retail store',
    ],
    preferredUsageContext: [
      'Outdoors in a sunlit green agricultural orchard or lush garden with ripe fruit trees. A professional grower wearing practical outdoor attire is actively operating the spraying equipment ({subject}), with a fine, even mist spray visible in the morning sunlight over vibrant foliage.',
      'Active outdoor agricultural operation in a healthy orchard or greenhouse setting with natural morning illumination.',
    ],
    brandPillar: 'Agricultural excellence and dependable crop care — high-performance farm and garden equipment trusted by growers.',
    colorGradeDirective: 'COLOR GRADE: Vivid natural outdoor green tones, warm sunlit golden morning highlights, crisp authentic foliage textures, clean lifted shadows.',
    musicDirective: 'uplifting organic acoustic commercial rhythm with light inspiring percussion, building steadily, resolving cleanly on brand close',
    defaultAffordance: 'apply_spray_mist',
    defaultProofMode: 'product_in_use',
    defaultPrimaryValue: 'reliability',
    actionHookTemplate: 'Güneşli, bereketli bir meyve bahçesinde {subject} nozülünden fışkıran mikronize ince sis bulutu ağaç yapraklarını homojen kaplarken profesyonel bahçe/tarım bakımı 0.3 saniyede devreye girer.',
  },

  construction_materials: {
    sectorId: 'construction_materials',
    label: 'Yapı, İnşaat Malzemeleri & Şantiye',
    preferredEnvironments: [
      'Modern, immaculate brick manufacturing facility and sunlit outdoor dispatch loading yard',
      'Active contemporary architectural construction site under bright natural daylight',
      'Organized high-grade building material staging area with clean structural elements',
    ],
    forbiddenEnvironments: [
      'dark messy basement',
      'abandoned dilapidated ruins',
      'messy unorganized rubble',
      'low resolution grainy textures',
      'unlicensed hazardous worker depiction',
    ],
    preferredUsageContext: [
      'Modern structural building yard or architectural site. A skilled construction professional inspects high-precision materials ({subject}), demonstrating robust structural integrity and precision finish.',
    ],
    brandPillar: 'Industrial strength and reliable delivery — this brand is the structural backbone of serious construction projects.',
    colorGradeDirective: 'COLOR GRADE: Warm industrial amber, rich earth tones, deep material textures, documentary-grade lifted blacks — conveying strength, scale and reliability.',
    musicDirective: 'post-industrial orchestral groove with driving percussion, building from sparse at opening to full-bodied at product hero reveal, resolving on brand close',
    defaultAffordance: 'lift_stack_haul',
    defaultProofMode: 'product_in_use',
    defaultPrimaryValue: 'reliability',
    actionHookTemplate: 'Sevkiyata ve uygulamaya hazır {subject} birimlerinin nizami yerleşim anı ve dinamik yapısal sağlamlığı ilk karede başlar.',
  },

  food_beverage: {
    sectorId: 'food_beverage',
    label: 'Gıda, Restoran & Gurme Tüketim',
    preferredEnvironments: [
      'Warm artisan kitchen presentation counter with rustic wooden textures and soft morning window light',
      'Contemporary vibrant culinary bistro dining space with elegant ambient lighting',
    ],
    forbiddenEnvironments: [
      'sterile laboratory',
      'industrial dirty factory',
      'cold gray concrete',
      'unappetizing artificial lighting',
    ],
    preferredUsageContext: [
      'An artisan chef or culinary presenter freshly prepares and serves the appetizing food item ({subject}) with sensory texture and rich aroma.',
    ],
    brandPillar: 'Freshness and craft — this product is made with care and should feel delicious and inviting.',
    colorGradeDirective: 'COLOR GRADE: Warm artisan amber tones, rich saturated food colors, soft lifted highlights — appetizing and inviting.',
    musicDirective: 'warm acoustic guitar with light percussion starting gentle, building through product interaction, resolving warmly',
    defaultAffordance: 'pour_drizzle_flow',
    defaultProofMode: 'product_in_use',
    defaultPrimaryValue: 'sensory_appeal',
    actionHookTemplate: 'Yakın planda taptaze {subject} iştah kabartan formu ve zengin dokusuyla servise hazır hale gelirken lezzet hareketi 0.3 saniyede başlar.',
  },

  saas_digital: {
    sectorId: 'saas_digital',
    label: 'SaaS, Yazılım & Dijital Servisler',
    preferredEnvironments: [
      'Modern sunlit minimalist office desk with natural window light, sleek workstation, and subtle warm indoor plants',
      'Contemporary tech collaborative studio workspace with crisp architectural lines',
    ],
    forbiddenEnvironments: [
      'messy cluttered industrial floor',
      'dirt and outdoor mud',
      'outdated CRT screens',
      'gloomy dark spaces',
    ],
    preferredUsageContext: [
      'A focused professional effortlessly navigates the modern digital workflow, seamlessly accomplishing high-value results with instant responsiveness.',
    ],
    brandPillar: 'Precision and ease — this platform removes friction and makes complex work feel effortless.',
    colorGradeDirective: 'COLOR GRADE: Cool-neutral with clean whites and precise midtones — modern tech-product visual identity.',
    musicDirective: 'minimal electronic motif, clean and forward-moving, entering at product reveal and building confidently',
    defaultAffordance: 'screen_tap_filter_result',
    defaultProofMode: 'interface_workflow',
    defaultPrimaryValue: 'reduces_effort',
    actionHookTemplate: 'Minimalist arayüzde bir dokunuşla filtrelenmiş {subject} akışı gecikmesiz olarak ekranda listelenir.',
  },

  real_estate: {
    sectorId: 'real_estate',
    label: 'Gayrimenkul, Mimarlık & Konut',
    preferredEnvironments: [
      'Contemporary architectural living space with panoramic glass window, sun-drenched oak floors, and elegant bespoke furnishings',
      'Sunlit luxury residential exterior with manicured modern landscape and architectural symmetry',
    ],
    forbiddenEnvironments: [
      'cramped dark rooms',
      'peeling paint and dilapidated walls',
      'cluttered storage spaces',
      'industrial loading bays',
    ],
    preferredUsageContext: [
      'A graceful camera move glides through pristine architectural vistas, highlighting spacious light, premium materials, and panoramic scenery.',
    ],
    brandPillar: 'Prestige, tranquility and architectural excellence — a sanctuary designed for inspired living.',
    colorGradeDirective: 'COLOR GRADE: Bright architectural neutral, soft natural highlights, expansive dynamic range, pristine whites.',
    musicDirective: 'cinematic ambient neo-classical piano with lush gentle strings, swelling with elegance, resolving gracefully',
    defaultAffordance: 'enter_experience_space',
    defaultProofMode: 'environment_or_experience',
    defaultPrimaryValue: 'status_or_design',
    actionHookTemplate: 'Geniş açılı sinematik perspektifle {subject} yaşam alanının ferah mimari detayları ve doğal gün ışığı ilk saniyede açığa çıkar.',
  },

  cosmetics_personal_care: {
    sectorId: 'cosmetics_personal_care',
    label: 'Kozmetik, Cilt Bakımı & Parfüm',
    preferredEnvironments: [
      'Minimalist sunlit marble vanity or high-end beauty studio with soft diffused rim lighting and subtle water ripples',
      'Pure organic botanic botanical sanctuary with morning dew droplets and soft pastel accents',
    ],
    forbiddenEnvironments: [
      'harsh direct midday glare',
      'dirty industrial workshop',
      'plastic factory clutter',
      'greasy unpolished surfaces',
    ],
    preferredUsageContext: [
      'Smooth micro-focus movement showing the delicate texture, pure formulation, and instant radiance upon application of {subject}.',
    ],
    brandPillar: 'Purity, radiance and confidence — science and nature harmonized for timeless personal care.',
    colorGradeDirective: 'COLOR GRADE: Soft luminous skin-tone highlights, clean pastels, delicate pearl sheen, high-key elegant aesthetic.',
    musicDirective: 'soft ethereal ambient beat with delicate acoustic glimmers, airy and uplifting, resolving softly',
    defaultAffordance: 'artisan_expert_touch',
    defaultProofMode: 'product_in_use',
    defaultPrimaryValue: 'sensory_appeal',
    actionHookTemplate: 'Işıltılı ve pürüzsüz dokusuyla {subject} formülünün tazeleyici zarafeti ilk karede büyüleyici bir yakın çekimle başlar.',
  },

  furniture_interior: {
    sectorId: 'furniture_interior',
    label: 'Mobilya, Dekorasyon & İç Mekan',
    preferredEnvironments: [
      'Tastefully designed modern Scandinavian living room or luxury interior salon with warm afternoon sunbeams and artisanal textured rugs',
      'Contemporary interior design studio displaying pristine handcrafted furnishings',
    ],
    forbiddenEnvironments: [
      'cluttered dusty warehouse',
      'factory assembly line with sparks',
      'sterile medical clinic',
      'outdoor construction mud',
    ],
    preferredUsageContext: [
      'A discerning homeowner or designer settles comfortably into the ergonomic, masterfully crafted furnishing ({subject}), feeling the tactile luxury of the materials.',
    ],
    brandPillar: 'Comfort, aesthetic mastery and enduring craftsmanship — transforming every room into a timeless sanctuary.',
    colorGradeDirective: 'COLOR GRADE: Warm organic earthy tones, rich wood grain saturation, tactile textile highlights, cozy ambient softness.',
    musicDirective: 'lo-fi acoustic jazz lounge rhythm, warm and sophisticated, building gentle momentum, resolving comfortably',
    defaultAffordance: 'artisan_expert_touch',
    defaultProofMode: 'product_in_use',
    defaultPrimaryValue: 'comfort',
    actionHookTemplate: 'Özenle tasarlanmış iç mekanda {subject} ergonomik zarafeti ve üst düzey malzeme dokusu ilk karede odaklanır.',
  },

  automotive_machinery: {
    sectorId: 'automotive_machinery',
    label: 'Otomotiv, Endüstriyel Ekipman & Makine',
    preferredEnvironments: [
      'State-of-the-art brightly lit clean engineering facility or pristine automotive showroom service bay',
      'Dynamic asphalt roadway or open testing grounds under clear cinematic sky',
    ],
    forbiddenEnvironments: [
      'rusty junk yard',
      'hazardous dark grease pits',
      'unlit dangerous spaces',
      'grainy shaky visuals',
    ],
    preferredUsageContext: [
      'An expert technician or driver operates the precision-engineered equipment ({subject}) with seamless control and unmistakable mechanical responsiveness.',
    ],
    brandPillar: 'Power, precision and ultimate reliability — engineered to outperform under the toughest demands.',
    colorGradeDirective: 'COLOR GRADE: Metallic cool-tones, deep high-contrast graphite blacks, crisp chrome reflections, punchy automotive grade.',
    musicDirective: 'driving modern synth-bass with metallic percussion accents, energizing and assertive, resolving decisively on brand lockup',
    defaultAffordance: 'press_trigger_switch',
    defaultProofMode: 'product_in_use',
    defaultPrimaryValue: 'reliability',
    actionHookTemplate: 'Hassas mühendislikle üretilmiş {subject} güçlü mekanik performansı ve dinamik tepki hızı 0.3 saniyede devreye girer.',
  },

  veterinary_pet: {
    sectorId: 'veterinary_pet',
    label: 'Veteriner, Evcil Hayvan & Pet Bakım',
    preferredEnvironments: [
      'Modern, warm and inviting veterinary wellness clinic or cheerful sunlit green park with happy healthy animals',
      'Bright, immaculate pet care suite with soothing pastel colors and clean natural sunlight',
    ],
    forbiddenEnvironments: [
      'cold intimidating cages',
      'scary medical instruments',
      'dark distressed environments',
      'industrial slaughterhouses',
    ],
    preferredUsageContext: [
      'A caring veterinary professional or loving pet parent gently cares for a lively, energetic pet with warmth and compassionate expertise.',
    ],
    brandPillar: 'Compassionate care, health and joyful companionship — because your pets deserve the finest treatment.',
    colorGradeDirective: 'COLOR GRADE: Warm inviting pastels, gentle sunlit natural saturation, soft friendly highlights, clean clinical whites.',
    musicDirective: 'cheerful acoustic whistle and ukulele groove, warm and affectionate, building happy momentum, resolving warmly',
    defaultAffordance: 'artisan_expert_touch',
    defaultProofMode: 'human_expertise',
    defaultPrimaryValue: 'trust_or_safety',
    actionHookTemplate: 'Sevgi dolu ve profesyonel ortamda {subject} ile sağlanan özenli bakım ve evcil dostumuzun neşeli tepkisi ilk karede başlar.',
  },

  general_commercial: {
    sectorId: 'general_commercial',
    label: 'Genel Ticari & Kurumsal Perakende',
    preferredEnvironments: [
      'Clean, modern and sunlit commercial setting tailored to the subject with warm balanced natural light',
      'Contemporary well-organized showroom or customer interaction boutique',
    ],
    forbiddenEnvironments: [
      'dark unlit corners',
      'blurry low-contrast spaces',
      'unorganized clutter',
    ],
    preferredUsageContext: [
      'A real professional person engages actively and purposefully with {subject} in its natural commercial context.',
    ],
    brandPillar: 'Reliable quality and professional delivery — a trusted brand in its category.',
    colorGradeDirective: 'COLOR GRADE: Warm-neutral commercial grade, accurate product colors, clean lifted blacks — premium brand visual identity.',
    musicDirective: 'subtle modern commercial groove starting sparse, building at midpoint, peaking on the brand reveal, then resolving to silence',
    defaultAffordance: 'toggle_open_close',
    defaultProofMode: 'product_in_use',
    defaultPrimaryValue: 'quality_or_craft',
    actionHookTemplate: '{subject} ilk karede merkezdedir; ana fonksiyonel hareket 0.3 saniyede gecikmesiz başlar.',
  },
}

const SECTOR_ALIASES: Record<string, string> = {
  veteriner: 'veterinary_pet',
  veterinerlik: 'veterinary_pet',
  pet: 'veterinary_pet',
  tarim: 'agriculture_equipment',
  tarım: 'agriculture_equipment',
  ziraat: 'agriculture_equipment',
  bahce: 'agriculture_equipment',
  bahçe: 'agriculture_equipment',
  sera: 'agriculture_equipment',
  insaat: 'construction_materials',
  inşaat: 'construction_materials',
  yapi: 'construction_materials',
  yapı: 'construction_materials',
  gida: 'food_beverage',
  gıda: 'food_beverage',
  restoran: 'food_beverage',
  yazilim: 'saas_digital',
  yazılım: 'saas_digital',
  dijital: 'saas_digital',
  saas: 'saas_digital',
  emlak: 'real_estate',
  gayrimenkul: 'real_estate',
  kozmetik: 'cosmetics_personal_care',
  mobilya: 'furniture_interior',
  otomotiv: 'automotive_machinery',
  makine: 'automotive_machinery',
}

/**
 * Dinamik olarak organizasyonun veya ürünün sektör profilini çözer.
 * Kod seviyesinde sıfır marka bağımlılığı vardır.
 */
export function resolveCreativeEnvironmentProfile(params: {
  orgId?: string | null
  sectorHint?: string | null
  offerName?: string | null
  rawBrief?: string | null
  customProfile?: Partial<CreativeEnvironmentProfile> | null
  manifestSector?: string | null
}): CreativeEnvironmentProfile {
  // 1. Organizasyona özel doğrudan tanımlanmış custom profil varsa en yüksek önceliğe sahiptir
  if (params.customProfile && params.customProfile.preferredEnvironments && params.customProfile.preferredEnvironments.length > 0) {
    const base = BUILTIN_SECTOR_PROFILES.general_commercial
    return {
      ...base,
      ...params.customProfile,
      sectorId: params.customProfile.sectorId || 'custom_tenant_profile',
      label: params.customProfile.label || 'Özel Kurumsal Profil',
      preferredEnvironments: params.customProfile.preferredEnvironments || base.preferredEnvironments,
      forbiddenEnvironments: params.customProfile.forbiddenEnvironments || base.forbiddenEnvironments,
      preferredUsageContext: params.customProfile.preferredUsageContext || base.preferredUsageContext,
      brandPillar: params.customProfile.brandPillar || base.brandPillar,
      colorGradeDirective: params.customProfile.colorGradeDirective || base.colorGradeDirective,
      musicDirective: params.customProfile.musicDirective || base.musicDirective,
    }
  }

  // 2. Doğrudan sektör kimliği veya bilinen sektör rumuzu eşleşmesi
  const explicitSector = (params.manifestSector || params.sectorHint || '').toLowerCase().trim()
  if (explicitSector) {
    if (BUILTIN_SECTOR_PROFILES[explicitSector]) {
      return BUILTIN_SECTOR_PROFILES[explicitSector]
    }
    for (const [alias, secId] of Object.entries(SECTOR_ALIASES)) {
      if (explicitSector === alias || explicitSector.includes(alias)) {
        return BUILTIN_SECTOR_PROFILES[secId]
      }
    }
  }

  // 3. Taksonomi bazlı dinamik sektör analizi
  const fullContext = `${explicitSector} ${params.offerName || ''} ${params.rawBrief || ''}`.toLowerCase()

  if (fullContext.match(/(veteriner|klinik|hayvan|pet|köpek|kedi|mama|aşı|pet shop)/i)) {
    return BUILTIN_SECTOR_PROFILES.veterinary_pet
  }
  if (fullContext.match(/(tarım|ziraat|bahçe|çiftlik|ilaçlama|bağ|sera|fidan|hasat|sulama|püskürt|akülü sırt|sırt pompası|ilaçlama pompası)/i)) {
    return BUILTIN_SECTOR_PROFILES.agriculture_equipment
  }
  if (fullContext.match(/(inşaat|şantiye|tuğla|çimento|yapı malzeme|harç|briket|kiremit|yalıtım|beton|iskele)/i)) {
    return BUILTIN_SECTOR_PROFILES.construction_materials
  }
  if (fullContext.match(/(gıda|restoran|yemek|lezzet|gurme|tatlı|pasta|börek|kahve|\bçay\b|içecek|\bet\b|kebap|unlu mamul)/i)) {
    return BUILTIN_SECTOR_PROFILES.food_beverage
  }
  if (fullContext.match(/(yazılım|saas|\bapp\b|uygulama|dijital|platform|otomasyon|crm|erp|bulut|cloud|\bapi\b)/i)) {
    return BUILTIN_SECTOR_PROFILES.saas_digital
  }
  if (fullContext.match(/(gayrimenkul|emlak|konut|villa|daire|arsa|rezidans|mimarlık|proje satış)/i)) {
    return BUILTIN_SECTOR_PROFILES.real_estate
  }
  if (fullContext.match(/(kozmetik|parfüm|cilt bakım|krem|serum|makyaj|güzellik|şampuan|losyon)/i)) {
    return BUILTIN_SECTOR_PROFILES.cosmetics_personal_care
  }
  if (fullContext.match(/(mobilya|koltuk|masa|sandalye|yatak|dolap|dekorasyon|iç mekan|ahşap mobilya)/i)) {
    return BUILTIN_SECTOR_PROFILES.furniture_interior
  }
  if (fullContext.match(/(otomotiv|araç|\boto\b|araba|motor|yedek parça|lastik|tamir|servis|makine|endüstriyel|hidrolik|sanayi)/i)) {
    return BUILTIN_SECTOR_PROFILES.automotive_machinery
  }

  // 4. Varsayılan güvenli ticari profil
  return BUILTIN_SECTOR_PROFILES.general_commercial
}
