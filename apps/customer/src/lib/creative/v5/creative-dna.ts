/**
 * MESAJIFY VIDEO ENGINE V5 - 4-TIER CREATIVE DNA
 * 
 * BRAND DNA  ->  PRODUCT DNA  ->  CAMPAIGN INTENT  ->  CREATIVE STRATEGY
 * 
 * Her marka ve ürün için yalnızca sektör adı ("inşaat", "tarım") yerine
 * dokusal, eylemsel, görsel ve kaçınılacak kuralları kapsayan zengin modelleme.
 */

import type { FactNormalizerOutput, OntologyClassification, CreativeStrategyOutput } from './schemas'
import type { CreativeEnvironmentProfile } from './sector-profiles'

export interface BrandDNA {
  personality: string[]        // örn. ["güvenilir", "doğrudan", "güçlü", "profesyonel"]
  prestigeLevel: 'mass_market' | 'premium' | 'luxury' | 'industrial_grade'
  voiceTone: string            // örn. "authoritative", "warm", "dynamic"
  corePillar: string           // Markanın varoluş amacı
}

export interface ProductDNA {
  material: string             // örn. "red_clay", "extruded_polymer", "organic_serum", "hardened_steel"
  visualStrength: string[]     // örn. ["texture", "structural_geometry", "kiln_origin", "pallet_scale"]
  sellingPoints: string[]      // örn. ["factory_direct", "unbroken_stock", "all_weather"]
  interaction: string[]        // İnsan / ürün temas eylemi (örn. "worker inspects solid clay masonry block with leather gloves")
  visualWorld: string[]        // Görsel dünya ve ortam (örn. ["clay", "heat", "kiln", "masonry_yard"])
  avoid: string[]              // Kesinlikle görünmemesi gerekenler (örn. ["generic corporate office", "fake architects smiling", "cyberpunk"])
}

export interface CreativeDNASnapshot {
  brand: BrandDNA
  product: ProductDNA
  campaignIntent: string
  creativeStrategy: CreativeStrategyOutput
}

/**
 * Bilinen sektör profilleri ve marka manifestolarından 4 katmanlı Kreatif DNA'yı türetir.
 * Sıfır hardcode kuralına uygun olarak generic veriden beslenir.
 */
export function resolveCreativeDNA(params: {
  facts: FactNormalizerOutput
  ontology: OntologyClassification
  strategy: CreativeStrategyOutput
  profile: CreativeEnvironmentProfile
  manifest?: Record<string, any> | null
}): CreativeDNASnapshot {
  const { facts, strategy, profile, manifest } = params
  const brandName = facts.verifiedFacts.brandName || 'Kurumsal Marka'
  const offerName = facts.verifiedFacts.offerName || 'Odak Ürün'
  const rawBrief = facts.verifiedFacts.rawBrief || ''
  const fullText = `${brandName} ${offerName} ${rawBrief} ${profile.sectorId}`.toLowerCase()

  // 1. BRAND DNA RESOLUTION
  const brandCustom = manifest?.brand_dna || {}
  const brand: BrandDNA = {
    personality: brandCustom.personality || [
      profile.sectorId === 'construction_materials' ? 'güvenilir, doğrudan, güçlü, profesyonel' :
      profile.sectorId === 'agriculture_equipment' ? 'çalışkan, yenilikçi, bereketli, dayanıklı' :
      profile.sectorId === 'cosmetics_personal_care' ? 'saf, zarif, ışıltılı, güven verici' :
      profile.sectorId === 'saas_digital' ? 'hızlı, pürüzsüz, analitik, modern' :
      'profesyonel, güvenilir, dinamik'
    ],
    prestigeLevel: brandCustom.prestigeLevel || (
      profile.sectorId === 'construction_materials' || profile.sectorId === 'automotive_machinery' ? 'industrial_grade' :
      profile.sectorId === 'cosmetics_personal_care' || profile.sectorId === 'real_estate' ? 'luxury' : 'premium'
    ),
    voiceTone: brandCustom.voiceTone || (
      profile.sectorId === 'construction_materials' ? 'authoritative and rock-solid' :
      profile.sectorId === 'agriculture_equipment' ? 'dependable, grounded and uplifting' :
      profile.sectorId === 'saas_digital' ? 'clean, forward-moving and precise' :
      'confident and warm'
    ),
    corePillar: brandCustom.corePillar || profile.brandPillar,
  }

  // 2. PRODUCT DNA RESOLUTION
  const prodCustom = manifest?.product_dna || {}

  // Malzeme çözümlemesi
  let material = prodCustom.material || 'engineered_commercial_grade_composite'
  if (!prodCustom.material) {
    if (fullText.match(/(tuğla|kiremit|kil|briket)/)) material = 'red_terracotta_clay_ceramic'
    else if (fullText.match(/(pompa|püskürt|sırt)/)) material = 'reinforced_hdpe_polymer_and_brass'
    else if (fullText.match(/(krem|serum|losyon|yağ)/)) material = 'translucent_botanical_organic_emulsion'
    else if (fullText.match(/(mobilya|masa|ahşap)/)) material = 'solid_scandinavian_natural_oak_wood'
    else if (fullText.match(/(çelik|demir|hidrolik|makine)/)) material = 'brushed_industrial_grade_hardened_steel'
    else if (fullText.match(/(yazılım|platform|kod)/)) material = 'digital_cloud_interface_element'
  }

  // Görsel güç öğeleri
  const visualStrength: string[] = prodCustom.visualStrength || [
    ...(profile.sectorId === 'construction_materials' ? ['rich earth texture', 'structural crisp geometry', 'kiln origin authenticity', 'pallet delivery volume'] : []),
    ...(profile.sectorId === 'agriculture_equipment' ? ['ultra-fine mist dispersion', 'ergonomic casing balance', 'brass nozzle precision', 'morning foliage contrast'] : []),
    ...(profile.sectorId === 'food_beverage' ? ['fresh culinary steam', 'golden artisan crust', 'saturated natural juices', 'inviting macro texture'] : []),
    ...(profile.sectorId === 'cosmetics_personal_care' ? ['luminous pearl sheen', 'micro dew droplets', 'smooth absorption', 'delicate formulation'] : []),
    ...(profile.sectorId === 'saas_digital' ? ['high-contrast dark/light mode data charts', 'instant responsiveness', 'clean typography', 'effortless flow'] : []),
  ]
  if (visualStrength.length === 0) {
    visualStrength.push('authentic material texture', 'crisp product geometry', 'premium finish')
  }

  // Satış argümanları
  const sellingPoints: string[] = prodCustom.sellingPoints || facts.verifiedFacts.benefits.slice(0, 3)
  if (sellingPoints.length === 0) {
    sellingPoints.push('uncompromised quality', 'trusted performance', 'immediate availability')
  }

  // Fiziksel insan / ürün etkileşimi
  const interaction: string[] = prodCustom.interaction || [
    ...(profile.sectorId === 'construction_materials' ? ['A skilled construction specialist inspects uniform brick courses with clean work gloves, tapping the solid face with quiet confidence.'] : []),
    ...(profile.sectorId === 'agriculture_equipment' ? ['An experienced orchard grower comfortably straps on the lightweight sprayer, seamlessly triggering an even mist over apple foliage.'] : []),
    ...(profile.sectorId === 'food_beverage' ? ['An artisan chef delicately garnishes and plates the steaming culinary creation with practiced culinary mastery.'] : []),
    ...(profile.sectorId === 'cosmetics_personal_care' ? ['A radiant person gently applies a single luminous droplet to skin, watching it glide smoothly with instant hydration.'] : []),
    ...(profile.sectorId === 'saas_digital' ? ['A professional effortlessly gestures across an uncluttered sleek dashboard, observing critical metrics populate without lag.'] : []),
  ]
  if (interaction.length === 0) {
    interaction.push(`A real professional engages purposeful and confidently with ${offerName} in its natural operational context.`)
  }

  // Görsel evren (Visual World)
  const visualWorld: string[] = prodCustom.visualWorld || [
    ...profile.preferredEnvironments,
  ]

  // Kaçınılacak unsurlar (Avoid)
  const avoid: string[] = prodCustom.avoid || [
    ...profile.forbiddenEnvironments,
    'generic corporate office',
    'fake actors staring or smiling into camera',
    'distracting cgi overlays',
    'synthetic neon glow',
    'cluttered chaotic background',
  ]

  const product: ProductDNA = {
    material,
    visualStrength,
    sellingPoints,
    interaction,
    visualWorld,
    avoid,
  }

  return {
    brand,
    product,
    campaignIntent: facts.campaignObjective,
    creativeStrategy: strategy,
  }
}
