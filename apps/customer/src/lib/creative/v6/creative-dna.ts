/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * 4-TIER CREATIVE DNA ENGINE (V6)
 * 
 * 1. BRAND DNA
 * 2. PRODUCT DNA
 * 3. CAMPAIGN DNA
 * 4. AUDIENCE / CONTEXT DNA
 * 
 * SIFIR HARDCODE KURALI:
 * Kod içerisinde marka adı (Bofe, Ayvazoğlu vb.) if/else'leri yer alamaz.
 * Her karar ontoloji, sektör profili ve varlık verilerinden türetilir.
 */

import type { ResolvedCreativeFacts, CreativeDNA } from './creative-types'

export function deriveCreativeDNA(facts: ResolvedCreativeFacts): CreativeDNA {
  const fullText = `${facts.brandName} ${facts.product.name} ${facts.product.factualDescription} ${facts.sectorFacts.sectorProfileId}`.toLowerCase()

  // 1. BRAND DNA
  const sector = facts.sectorFacts.sectorProfileId
  const isIndustrial = sector === 'construction_materials' || sector === 'automotive_machinery'
  const isLuxury = sector === 'real_estate' || sector === 'cosmetics_personal_care'
  const isTech = sector === 'saas_digital'

  const premiumLevel = isIndustrial ? 'industrial_grade' : isLuxury ? 'luxury' : isTech ? 'premium' : 'mid'

  const brand: CreativeDNA['brand'] = {
    personality: facts.brandFacts.personality.length > 0 ? facts.brandFacts.personality : [
      'güvenilir', 'uzman', 'doğrudan', 'çözüm odaklı'
    ],
    communicationTone: facts.brandFacts.tone.length > 0 ? facts.brandFacts.tone : [
      isIndustrial ? 'authoritative and grounded' : isTech ? 'sharp and modern' : 'warm and trustworthy'
    ],
    visualCharacter: [
      isIndustrial ? 'tactile, structural, weight and geometric authenticity' :
      isLuxury ? 'luminous, high-contrast, macro elegance and refined materials' :
      'clean commercial clarity, authentic natural daylight'
    ],
    premiumLevel,
    brandBehaviors: [
      'Delivers tangible capability with quiet confidence.',
      'Refrains from bombastic advertising slogans.',
      'Anchors identity in functional craftsmanship.',
    ],
    avoid: [
      'generic corporate office smiling at camera',
      'cheap digital neon effects',
      'distorted typography and hallucinated logos',
      'fictional corporate badge overlays',
    ],
    corePillar: `${facts.brandName} delivers verified quality and dependable operational standards in its field.`,
  }

  // 2. PRODUCT DNA
  // Malzeme analizi (Sıfır hardcode, genel fiziksel ontoloji)
  const materials: string[] = []
  if (fullText.match(/\b(tuğla|kiremit|kil|seramik|briket|harç|beton)\b/i)) {
    materials.push('red_terracotta_clay_ceramic', 'dense_fired_mineral_composite')
  } else if (fullText.match(/\b(pompa|püskürt|sisleme|hortum|nozul|rezervuar|depo)\b/i)) {
    materials.push('reinforced_hdpe_polymer', 'machined_brass_nozzle')
  } else if (fullText.match(/\b(serum|krem|losyon|yağ|esans)\b/i)) {
    materials.push('translucent_botanical_emulsion', 'amber_glass_dropper')
  } else if (fullText.match(/\b(çelik|demir|hidrolik|piston|rulman)\b/i)) {
    materials.push('brushed_hardened_industrial_steel')
  } else if (fullText.match(/\b(ahşap|meşe|ceviz|doğal masa)\b/i)) {
    materials.push('solid_natural_grained_timber')
  } else if (fullText.match(/\b(yazılım|bulut|kod|api|dashboard|panel)\b/i)) {
    materials.push('high_contrast_vector_interface')
  } else {
    materials.push('commercial_grade_engineered_material')
  }

  const visualStrengths = [
    `${materials[0]} natural physical texture`,
    'authentic operational geometry',
    'precise functional tolerance',
  ]

  const authenticInteractions = facts.sectorFacts.authenticActions.map(action => 
    action.replace(/\{subject\}/g, facts.product.name)
  )

  const product: CreativeDNA['product'] = {
    materials,
    physicalStrengths: facts.product.physicalAttributes.length > 0
      ? facts.product.physicalAttributes
      : ['verified structural integrity', 'engineered reliability'],
    visualStrengths,
    authenticInteractions,
    transformations: [
      `from raw operational readiness to accomplished verified result with ${facts.product.name}`
    ],
    proofOpportunities: facts.sectorFacts.credibleProofTypes,
    visualWorld: facts.sectorFacts.physicalWorld,
    avoid: [
      ...facts.sectorFacts.forbiddenVisuals,
      'fake laboratory white void',
      'plastic CGI imitation look',
      'unrealistic gravity defying spins',
    ],
  }

  // 3. CAMPAIGN DNA
  const campaign: CreativeDNA['campaign'] = {
    objective: facts.campaign.objective,
    primaryMessage: facts.campaign.offer || facts.product.factualDescription.slice(0, 100),
    offer: facts.campaign.offer,
    cta: facts.campaign.cta || 'Detaylı Bilgi ve Sipariş',
    format: `${facts.campaign.aspectRatio} vertical commercial video`,
    durationSeconds: facts.campaign.durationSeconds,
  }

  // 4. CONTEXT / AUDIENCE DNA
  const context: CreativeDNA['context'] = {
    audienceNeed: [
      'Unbroken certainty of quality without operational surprises.',
      'Immediate delivery or implementation capability.',
      'Transparent, professional partnership.',
    ],
    credibleSituations: facts.sectorFacts.physicalWorld,
    desiredViewerResponse: [
      'Bu firmanın işini şansa bırakmadığını ve tam aradığım kalitede olduğunu anladım.',
      'Hemen doğrudan iletişime geçmeliyim.',
    ],
  }

  return {
    brand,
    product,
    campaign,
    context,
  }
}
