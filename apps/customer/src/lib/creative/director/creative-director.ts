/**
 * MESAJIFY CREATIVE STUDIO — CREATIVE DIRECTOR ENGINE
 *
 * Synthesizes structured, designer-grade Art Direction Plans before prompt building.
 * Integrates 20 Archetypes, Sector DNA, Creative Memory, and strict Anti-Generic Rules.
 */

import { getArchetype, listArchetypeIds, type ArchetypeGrammar } from './archetypes'
import { classifySector, type SectorDna } from './sector-dna'
import { recordCreativeMemory, selectFreshArchetype } from './creative-memory'
import { completeText } from '../../ai/text'
import { describeColor } from '../prompt'
import { inferCommercialGrammar, type CommercialGrammarDefinition } from './commercial-poster-grammar'

export interface BrandDnaPlan {
  brand_name: string
  tone: string
  palette: {
    primary?: string
    secondary?: string
    accent?: string
    text?: string
    background?: string
    naturalLanguageDescription: string
  }
  typography: {
    headingFont?: string
    bodyFont?: string
    personality: string
  }
  logo_rules: {
    placement: string
    fidelity: 'STRICT_CANONICAL_PRESERVE'
    allow_redraw: false
  }
  visual_personality: string
  background_preference: string
  accent_usage: string
}

export interface ArtDirectionPlan {
  concept_name: string
  creative_archetype: string
  visual_hook: string

  brand_dna: BrandDnaPlan
  commercial_grammar?: CommercialGrammarDefinition

  composition: {
    grid: string
    focal_point: string
    product_scale: string
    product_position: string
    human_position: string
    negative_space: string
    crop_strategy: string
    depth_layers: string[]
  }

  art_direction: {
    visual_language: string
    material_language: string
    lighting: string
    background_treatment: string
    color_treatment: string
    contrast_strategy: string
    texture: string
    atmosphere: string
  }

  graphic_language: {
    shapes: string[]
    frames: string[]
    lines: string[]
    panels: string[]
    glow: string
    grain: string
    decorative_motifs: string[]
  }

  typography_direction: {
    headline_character: string
    hierarchy: string
    alignment: string
    density: string
    style_feel: string
  }

  human_direction: {
    enabled: boolean
    role: string
    wardrobe: string
    pose: string
    interaction: string
    expression: string
  }

  product_direction: {
    hero_behavior: string
    interaction: string
    scale: string
    reflection_shadow: string
    do_not_modify: string[]
  }

  product_dominance?: {
    priority: 'PRIMARY'
    target_visual_share: '40-55%'
    full_silhouette_preferred: boolean
    human_role: 'NONE' | 'SECONDARY' | 'SUPPORTING'
    context_role: 'SUPPORTING' | 'BACKGROUND'
    occlusion_policy: 'MINIMAL'
    standalone_hero_preferred: boolean
  }

  anti_generic_rules: string[]
  sector_dna: {
    sectorId: string
    nameTr: string
  }
}

export interface ArtDirectorInput {
  orgId: string
  brandName?: string
  brandTone?: string | null
  brandColors?: {
    primary?: string
    secondary?: string
    accent?: string
    text?: string
    background?: string
    [key: string]: string | undefined
  } | null
  brandFonts?: {
    heading?: string
    body?: string
    [key: string]: string | undefined
  } | null
  brandLogoPath?: string | null
  brandInstructions?: string | null
  productName: string
  productDescription?: string | null
  category?: string | null
  objective?: string
  stylePreset?: string
  format?: string
  headline?: string | null
  offer?: string | null
  cta?: string | null
  campaignDetail?: string | null
  qualityMode?: 'STANDARD' | 'DESIGNER'
  forcedArchetype?: string | null
}

const ANTI_GENERIC_STANDARD_RULES = [
  'Never center the product on a generic blank background with empty space',
  'No generic pastel/rainbow gradients',
  'No random neon lighting or disco glow',
  'No excessive floating 3D icons or fake web badges',
  'No fake UI elements or clickable buttons painted into the scene',
  'No generic smiling stock photo poses holding tools incorrectly',
  'No repeated golden-hour clichés without sector motivation',
  'No cluttered decorative visual noise',
]

/**
 * Generates a full designer-grade Art Direction Plan.
 */
export async function generateArtDirectionPlan(
  input: ArtDirectorInput,
): Promise<ArtDirectionPlan> {
  const sector = classifySector({
    productName: input.productName,
    productDescription: input.productDescription || undefined,
    brandName: input.brandName,
    category: input.category || undefined,
    brief: input.campaignDetail || input.headline || undefined,
  })

  // Select Archetype respecting Creative Memory
  let archetypeId = input.forcedArchetype
  if (!archetypeId) {
    if (sector.isPhysicalProduct) {
      // Physical products MUST prioritize product/material dominance over lifestyle/cinematic sprawl
      if (input.stylePreset === 'REAL_USAGE') {
        archetypeId = selectFreshArchetype(input.orgId, ['HYBRID_PRODUCT_USAGE', 'PRODUCT_COMMERCE_HERO'])
      } else if (input.stylePreset === 'PREMIUM' && sector.sectorId === 'CONSTRUCTION') {
        archetypeId = selectFreshArchetype(input.orgId, ['MATERIAL_COMMERCE_HERO', 'PRODUCT_COMMERCE_HERO', 'ARCHITECTURAL_PRESTIGE'])
      } else if (sector.sectorId === 'CONSTRUCTION') {
        archetypeId = selectFreshArchetype(input.orgId, ['MATERIAL_COMMERCE_HERO', 'PRODUCT_COMMERCE_HERO', 'MATERIAL_TEXTURE_HERO'])
      } else {
        archetypeId = selectFreshArchetype(input.orgId, ['PRODUCT_COMMERCE_HERO', 'MATERIAL_TEXTURE_HERO', 'HYBRID_PRODUCT_USAGE'])
      }
    } else {
      // If style preset maps closely:
      if (input.stylePreset === 'PRODUCT_HERO') {
        archetypeId = selectFreshArchetype(input.orgId, ['CINEMATIC_PRODUCT_HERO', 'STUDIO_PEDESTAL', 'MATERIAL_TEXTURE_HERO'])
      } else if (input.stylePreset === 'REAL_USAGE') {
        archetypeId = selectFreshArchetype(input.orgId, ['REAL_WORLD_USAGE', 'ORGANIC_LIFESTYLE', 'INDUSTRIAL_POWER'])
      } else if (input.stylePreset === 'PREMIUM') {
        archetypeId = selectFreshArchetype(input.orgId, ['EDITORIAL_LUXURY', 'PREMIUM_MONOCHROME', 'ARCHITECTURAL_PRESTIGE'])
      } else if (input.stylePreset === 'DYNAMIC_OFFER') {
        archetypeId = selectFreshArchetype(input.orgId, ['BOLD_RETAIL', 'MAXIMALIST_PROMO', 'HIGH_ENERGY_PERFORMANCE', 'SOCIAL_FIRST_BOLD'])
      } else {
        archetypeId = selectFreshArchetype(input.orgId, sector.preferredArchetypes)
      }
    }
  }

  const archetype = getArchetype(archetypeId)

  // In STANDARD mode with quick requirements, we can construct the deterministic plan immediately
  // In DESIGNER mode, we consult the custom AI service for tailored concept nuances, falling back gracefully
  try {
    const aiPlan = await requestAiArtDirection({
      input,
      sector,
      archetype,
    })
    if (aiPlan) {
      if (sector.isPhysicalProduct && !aiPlan.product_dominance) {
        aiPlan.product_dominance = {
          priority: 'PRIMARY',
          target_visual_share: '40-55%',
          full_silhouette_preferred: true,
          human_role: aiPlan.human_direction?.enabled ? 'SUPPORTING' : 'NONE',
          context_role: 'BACKGROUND',
          occlusion_policy: 'MINIMAL',
          standalone_hero_preferred: true,
        }
      }
      recordCreativeMemory({
        orgId: input.orgId,
        archetype: aiPlan.creative_archetype,
        environment: aiPlan.art_direction.background_treatment,
        compositionGrid: aiPlan.composition.grid,
        visualHook: aiPlan.visual_hook,
        humanRole: aiPlan.human_direction.enabled ? aiPlan.human_direction.role : undefined,
        colorTreatment: aiPlan.art_direction.color_treatment,
        backgroundTreatment: aiPlan.art_direction.background_treatment,
        createdAt: new Date().toISOString(),
      })
      return aiPlan
    }
  } catch (error) {
    console.warn('[CreativeDirector] AI service consultation failed, using deterministic grammar plan:', error)
  }

  // Deterministic Art Direction Plan construction
  const plan = buildDeterministicPlan(input, sector, archetype)

  recordCreativeMemory({
    orgId: input.orgId,
    archetype: plan.creative_archetype,
    environment: plan.art_direction.background_treatment,
    compositionGrid: plan.composition.grid,
    visualHook: plan.visual_hook,
    humanRole: plan.human_direction.enabled ? plan.human_direction.role : undefined,
    colorTreatment: plan.art_direction.color_treatment,
    backgroundTreatment: plan.art_direction.background_treatment,
    createdAt: new Date().toISOString(),
  })

  return plan
}

export function buildBrandDna(
  input: ArtDirectorInput,
  archetype: ArchetypeGrammar,
  sector: SectorDna,
): BrandDnaPlan {
  const brandName = input.brandName?.trim() || 'İşletme'
  const tone = input.brandTone?.trim() || 'Profesyonel kurumsal'

  const primaryHex = input.brandColors?.primary || '#111111'
  const secondaryHex = input.brandColors?.secondary || '#4b5563'
  const accentHex = input.brandColors?.accent || '#2563eb'
  const textHex = input.brandColors?.text || '#ffffff'
  const bgHex = input.brandColors?.background || '#0f172a'

  const primaryDesc = describeColor(primaryHex) || 'corporate core tone'
  const secondaryDesc = describeColor(secondaryHex) || 'supporting neutral'
  const accentDesc = describeColor(accentHex) || 'focal accent'
  const textDesc = describeColor(textHex) || 'high-contrast text'
  const bgDesc = describeColor(bgHex) || 'grounded dark tone'

  const naturalLanguageDescription = [
    `Authoritative Brand Palette: Primary=${primaryDesc}`,
    input.brandColors?.secondary ? `Secondary=${secondaryDesc}` : null,
    input.brandColors?.accent ? `Accent=${accentDesc}` : null,
    input.brandColors?.background ? `Background Tone=${bgDesc}` : null,
    input.brandColors?.text ? `Typography Contrast=${textDesc}` : null,
  ].filter(Boolean).join(', ')

  const headingFont = input.brandFonts?.heading || 'Inter'
  const bodyFont = input.brandFonts?.body || 'Inter'

  const isCorporateRestrained = /kurumsal|mimari|mühendis|ciddi|prestij|güvenilir|resmi|professional/i.test(tone)

  const typographyPersonality = `${headingFont}-inspired commercial hierarchy. Authoritative weight, clean kerning, disciplined geometric proportion, mobile-first legibility.`

  const visualPersonality = isCorporateRestrained
    ? `Disciplined, high-trust, engineered clarity reflecting ${tone}. Restrained lighting, authentic materials, strictly no frivolous glow or unmotivated visual noise.`
    : `Dynamic, high-impact commercial authority reflecting ${tone}. Sharp contrast, focused energy, conversion-driven visual hierarchy.`

  const backgroundPreference = `Deeply anchored in ${bgDesc} and ${secondaryDesc} tones integrated seamlessly with authentic ${sector.physicalEnvironment.primaryScene}.`

  const accentUsage = `Reserve ${accentDesc} strictly for high-priority visual anchors: CTA pill button, offer badge highlight, and subtle architectural/lighting rim accents.`

  return {
    brand_name: brandName,
    tone,
    palette: {
      primary: primaryHex,
      secondary: secondaryHex,
      accent: accentHex,
      text: textHex,
      background: bgHex,
      naturalLanguageDescription,
    },
    typography: {
      headingFont,
      bodyFont,
      personality: typographyPersonality,
    },
    logo_rules: {
      placement: 'Dominant top header or top corner with generous protective margins and pristine contrast',
      fidelity: 'STRICT_CANONICAL_PRESERVE',
      allow_redraw: false,
    },
    visual_personality: visualPersonality,
    background_preference: backgroundPreference,
    accent_usage: accentUsage,
  }
}

function buildDeterministicPlan(
  input: ArtDirectorInput,
  sector: SectorDna,
  archetype: ArchetypeGrammar,
): ArtDirectionPlan {
  const brandName = input.brandName || 'Markamız'
  const brand_dna = buildBrandDna(input, archetype, sector)
  const commercial_grammar = inferCommercialGrammar({
    productName: input.productName,
    productDescription: input.productDescription,
    category: input.category,
    sectorId: sector.sectorId,
    objective: input.objective,
    stylePreset: input.stylePreset,
  })
  const isHumanLikely = archetype.id === 'REAL_WORLD_USAGE' || archetype.id === 'ORGANIC_LIFESTYLE' || archetype.id === 'EDITORIAL_LUXURY' || archetype.id === 'SOCIAL_FIRST_BOLD'
  const isCorporateRestrained = /kurumsal|mimari|mühendis|ciddi|prestij|güvenilir|resmi|professional/i.test(brand_dna.tone)

  return {
    concept_name: `${brandName} ${archetype.name} Campaign`,
    creative_archetype: archetype.id,
    visual_hook: `${input.productName}, ${sector.physicalEnvironment.primaryScene} içerisinde ${archetype.composition.focalPoint}`,

    brand_dna,
    commercial_grammar,

    composition: {
      grid: archetype.composition.grid,
      focal_point: archetype.composition.focalPoint,
      product_scale: archetype.composition.productScale,
      product_position: archetype.composition.productPosition,
      human_position: archetype.composition.humanPosition,
      negative_space: archetype.composition.negativeSpace,
      crop_strategy: archetype.composition.cropStrategy,
      depth_layers: [
        sector.physicalEnvironment.depthElements[0] || archetype.composition.depthLayers[0],
        `${input.productName} in crisp focus`,
        sector.physicalEnvironment.depthElements[2] || archetype.composition.depthLayers[2],
        sector.physicalEnvironment.depthElements[3] || archetype.composition.depthLayers[3],
      ],
    },

    art_direction: {
      visual_language: `${archetype.artDirection.visualLanguage}. Sector authenticity: ${sector.physicalEnvironment.primaryScene}.`,
      material_language: `${archetype.artDirection.materialLanguage}. Authentic product casing realism, preserving exact reference product manufacturing materials and casing details without alteration.`,
      lighting: `${archetype.artDirection.lighting}. Physics: ${sector.physicalEnvironment.lightingPhysics}.`,
      background_treatment: `${brand_dna.background_preference} with ${archetype.artDirection.backgroundTreatment}. Environmental surroundings and ground textures: ${sector.physicalEnvironment.materialTextures.join(', ')}.`,
      color_treatment: `${brand_dna.palette.naturalLanguageDescription}. Archetype contrast strategy: ${archetype.artDirection.contrastStrategy}. ARCHETYPE MUST NOT OVERRIDE BRAND PALETTE.`,
      contrast_strategy: archetype.artDirection.contrastStrategy,
      texture: archetype.artDirection.texture,
      atmosphere: `${archetype.artDirection.atmosphere}. Atmospheric accents: ${sector.physicalEnvironment.atmosphericEffects.join(', ')}.`,
    },

    graphic_language: {
      shapes: archetype.graphicLanguage.shapes,
      frames: archetype.graphicLanguage.frames,
      lines: archetype.graphicLanguage.lines,
      panels: archetype.graphicLanguage.panels,
      glow: isCorporateRestrained ? 'Restrained, natural light bloom only, no synthetic neon glow' : archetype.graphicLanguage.glow,
      grain: archetype.graphicLanguage.grain,
      decorative_motifs: archetype.graphicLanguage.decorativeMotifs,
    },

    typography_direction: {
      headline_character: `${brand_dna.typography.personality} - ${archetype.typographyDirection.headlineCharacter}`,
      hierarchy: archetype.typographyDirection.hierarchy,
      alignment: archetype.typographyDirection.alignment,
      density: archetype.typographyDirection.density,
      style_feel: `${brand_dna.typography.headingFont}-like typography feel with ${archetype.typographyDirection.styleFeel}`,
    },

    human_direction: {
      enabled: isHumanLikely,
      role: sector.humanInteraction.typicalRole,
      wardrobe: sector.humanInteraction.attire,
      pose: archetype.composition.humanPosition,
      interaction: sector.humanInteraction.authenticAction,
      expression: 'Focused, authentic, professional, confident',
    },

    product_direction: {
      hero_behavior: archetype.composition.productPosition,
      interaction: `${input.productName} is the undisputed commercial anchor`,
      scale: archetype.composition.productScale,
      reflection_shadow: 'Realistic physical cast shadow adhering to the key light vector with ambient occlusion',
      do_not_modify: ['Original product proportions', 'Authentic casing color', 'Component geometry', 'Manufacturer markings'],
    },

    product_dominance: sector.isPhysicalProduct
      ? {
          priority: 'PRIMARY',
          target_visual_share: '40-55%',
          full_silhouette_preferred: true,
          human_role: isHumanLikely ? 'SUPPORTING' : 'NONE',
          context_role: 'BACKGROUND',
          occlusion_policy: 'MINIMAL',
          standalone_hero_preferred: true,
        }
      : undefined,

    anti_generic_rules: [
      ...ANTI_GENERIC_STANDARD_RULES,
      'Never replace or override the authoritative Brand Kit palette with random generic archetype colors',
      'Never redraw, recolor, stylize, or invent a fake brand logo mark',
      'Never invent unverified trust badges, guarantee claims, or reseller seals (e.g. Orijinal Ürün, Yetkili Satıcı, 50 Yıl Garanti)',
      ...archetype.antiGenericRules,
      ...sector.antiGenericDirectives,
    ],
    sector_dna: {
      sectorId: sector.sectorId,
      nameTr: sector.nameTr,
    },
  }
}

async function requestAiArtDirection(params: {
  input: ArtDirectorInput
  sector: SectorDna
  archetype: ArchetypeGrammar
}): Promise<ArtDirectionPlan | null> {
  const prompt = [
    `You are an Executive Creative Director and Art Director at a high-end commercial advertising agency.`,
    `Develop a bespoke ART DIRECTION PLAN for an advertising campaign.`,
    ``,
    `Brand: ${params.input.brandName || 'İşletme'}`,
    `Tone: ${params.input.brandTone || 'Professional commercial'}`,
    `Product: ${params.input.productName}`,
    `Description: ${params.input.productDescription || 'N/A'}`,
    `Objective: ${params.input.objective || 'PRODUCT_INTRO'}`,
    `Sector: ${params.sector.nameTr} (${params.sector.sectorId})`,
    `Assigned Archetype: ${params.archetype.name} (${params.archetype.id})`,
    ``,
    `Archetype Grammar reference:`,
    `- Composition: ${params.archetype.composition.grid}, ${params.archetype.composition.focalPoint}`,
    `- Lighting: ${params.archetype.artDirection.lighting}`,
    `- Material language: ${params.archetype.artDirection.materialLanguage}`,
    ``,
    `Sector Environmental DNA:`,
    `- Scene: ${params.sector.physicalEnvironment.primaryScene}`,
    `- Material Textures: ${params.sector.physicalEnvironment.materialTextures.join(', ')}`,
    `- Lighting Physics: ${params.sector.physicalEnvironment.lightingPhysics}`,
    ``,
    `STRICT REQUIREMENT: Respond ONLY with a valid JSON object matching the ArtDirectionPlan schema.`,
    `Do not include markdown fences or explanation. Make concrete, highly specific artistic decisions.`,
    `Reject generic clichés like "modern premium background with product in center".`,
  ].join('\n')

  const system =
    'You are an Executive Commercial Art Director. Return strictly valid raw JSON representing the ArtDirectionPlan.'
  let rawText: string | null = null
  try {
    const aiPromise = completeText(system, prompt)
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500))
    rawText = await Promise.race([aiPromise, timeoutPromise])
  } catch {
    return null
  }

  if (!rawText) return null

  const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim()
  const parsed = JSON.parse(cleaned) as ArtDirectionPlan

  if (!parsed.concept_name || !parsed.composition || !parsed.art_direction) {
    return null
  }

  if (!parsed.brand_dna) {
    parsed.brand_dna = buildBrandDna(params.input, params.archetype, params.sector)
  }

  // Ensure sector DNA is attached
  parsed.sector_dna = {
    sectorId: params.sector.sectorId,
    nameTr: params.sector.nameTr,
  }

  return parsed
}

/**
 * Resolves the ArtDirectionPlan synchronously at the exact moment of submission.
 * Guaranteed to complete in <1ms without network calls.
 * If precomputed AI plan is available, freezes and uses it (AI_PRECOMPUTED).
 * Otherwise creates a high-fidelity deterministic Designer plan (DETERMINISTIC_FALLBACK).
 */
export function resolveArtDirectionPlanAtSubmission({
  input,
  precomputedPlan,
}: {
  input: ArtDirectorInput
  precomputedPlan?: ArtDirectionPlan | null
}): { plan: ArtDirectionPlan; source: 'AI_PRECOMPUTED' | 'DETERMINISTIC_FALLBACK' } {
  if (
    precomputedPlan &&
    typeof precomputedPlan === 'object' &&
    Boolean(precomputedPlan.concept_name) &&
    Boolean(precomputedPlan.composition) &&
    Boolean(precomputedPlan.art_direction)
  ) {
    return { plan: precomputedPlan, source: 'AI_PRECOMPUTED' }
  }

  const sector = classifySector({
    productName: input.productName,
    productDescription: input.productDescription || undefined,
    brandName: input.brandName,
    category: input.category || undefined,
    brief: input.campaignDetail || input.headline || undefined,
  })

  let archetypeId = input.forcedArchetype
  if (!archetypeId) {
    if (sector.isPhysicalProduct) {
      if (input.stylePreset === 'REAL_USAGE') {
        archetypeId = selectFreshArchetype(input.orgId, ['HYBRID_PRODUCT_USAGE', 'PRODUCT_COMMERCE_HERO'])
      } else if (input.stylePreset === 'PREMIUM' && sector.sectorId === 'CONSTRUCTION') {
        archetypeId = selectFreshArchetype(input.orgId, ['MATERIAL_COMMERCE_HERO', 'PRODUCT_COMMERCE_HERO', 'ARCHITECTURAL_PRESTIGE'])
      } else if (sector.sectorId === 'CONSTRUCTION') {
        archetypeId = selectFreshArchetype(input.orgId, ['MATERIAL_COMMERCE_HERO', 'PRODUCT_COMMERCE_HERO', 'MATERIAL_TEXTURE_HERO'])
      } else {
        archetypeId = selectFreshArchetype(input.orgId, ['PRODUCT_COMMERCE_HERO', 'MATERIAL_TEXTURE_HERO', 'HYBRID_PRODUCT_USAGE'])
      }
    } else {
      if (input.stylePreset === 'PRODUCT_HERO') {
        archetypeId = selectFreshArchetype(input.orgId, ['CINEMATIC_PRODUCT_HERO', 'STUDIO_PEDESTAL', 'MATERIAL_TEXTURE_HERO'])
      } else if (input.stylePreset === 'REAL_USAGE') {
        archetypeId = selectFreshArchetype(input.orgId, ['REAL_WORLD_USAGE', 'ORGANIC_LIFESTYLE', 'INDUSTRIAL_POWER'])
      } else if (input.stylePreset === 'PREMIUM') {
        archetypeId = selectFreshArchetype(input.orgId, ['EDITORIAL_LUXURY', 'PREMIUM_MONOCHROME', 'ARCHITECTURAL_PRESTIGE'])
      } else if (input.stylePreset === 'DYNAMIC_OFFER') {
        archetypeId = selectFreshArchetype(input.orgId, ['BOLD_RETAIL', 'MAXIMALIST_PROMO', 'HIGH_ENERGY_PERFORMANCE', 'SOCIAL_FIRST_BOLD'])
      } else {
        archetypeId = selectFreshArchetype(input.orgId, sector.preferredArchetypes)
      }
    }
  }

  const archetype = getArchetype(archetypeId)
  const plan = buildDeterministicPlan(input, sector, archetype)

  return { plan, source: 'DETERMINISTIC_FALLBACK' }
}

