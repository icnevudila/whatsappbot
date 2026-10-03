/**
 * MESAJIFY CREATIVE STUDIO — CREATIVE DIRECTOR ENGINE
 *
 * Synthesizes structured, designer-grade Art Direction Plans before prompt building.
 * Integrates 20 Archetypes, Sector DNA, Creative Memory, and strict Anti-Generic Rules.
 */

import { getArchetype, listArchetypeIds, type ArchetypeGrammar } from './archetypes'
import { classifySector, type SectorDna } from './sector-dna'
import { recordCreativeMemory, selectFreshArchetype } from './creative-memory'
import { completeText } from '@/lib/ai/text'

export interface ArtDirectionPlan {
  concept_name: string
  creative_archetype: string
  visual_hook: string

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
  brandColors?: { primary?: string; accent?: string; secondary?: string } | null
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

function buildDeterministicPlan(
  input: ArtDirectorInput,
  sector: SectorDna,
  archetype: ArchetypeGrammar,
): ArtDirectionPlan {
  const brandName = input.brandName || 'Markamız'
  const isHumanLikely = archetype.id === 'REAL_WORLD_USAGE' || archetype.id === 'ORGANIC_LIFESTYLE' || archetype.id === 'EDITORIAL_LUXURY' || archetype.id === 'SOCIAL_FIRST_BOLD'

  return {
    concept_name: `${brandName} ${archetype.name} Campaign`,
    creative_archetype: archetype.id,
    visual_hook: `${input.productName}, ${sector.physicalEnvironment.primaryScene} içerisinde ${archetype.composition.focalPoint}`,

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
      material_language: `${archetype.artDirection.materialLanguage}, ${sector.physicalEnvironment.materialTextures.join(', ')}.`,
      lighting: `${archetype.artDirection.lighting}. Physics: ${sector.physicalEnvironment.lightingPhysics}.`,
      background_treatment: `${sector.physicalEnvironment.primaryScene} with ${archetype.artDirection.backgroundTreatment}.`,
      color_treatment: archetype.artDirection.colorTreatment,
      contrast_strategy: archetype.artDirection.contrastStrategy,
      texture: `${archetype.artDirection.texture}, ${sector.physicalEnvironment.materialTextures[0] || 'tactile surface realism'}.`,
      atmosphere: `${archetype.artDirection.atmosphere}. Atmospheric accents: ${sector.physicalEnvironment.atmosphericEffects.join(', ')}.`,
    },

    graphic_language: {
      shapes: archetype.graphicLanguage.shapes,
      frames: archetype.graphicLanguage.frames,
      lines: archetype.graphicLanguage.lines,
      panels: archetype.graphicLanguage.panels,
      glow: archetype.graphicLanguage.glow,
      grain: archetype.graphicLanguage.grain,
      decorative_motifs: archetype.graphicLanguage.decorativeMotifs,
    },

    typography_direction: {
      headline_character: archetype.typographyDirection.headlineCharacter,
      hierarchy: archetype.typographyDirection.hierarchy,
      alignment: archetype.typographyDirection.alignment,
      density: archetype.typographyDirection.density,
      style_feel: archetype.typographyDirection.styleFeel,
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

    anti_generic_rules: [
      ...ANTI_GENERIC_STANDARD_RULES,
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
  const rawText = await completeText(system, prompt)

  if (!rawText) return null

  const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim()
  const parsed = JSON.parse(cleaned) as ArtDirectionPlan

  if (!parsed.concept_name || !parsed.composition || !parsed.art_direction) {
    return null
  }

  // Ensure sector DNA is attached
  parsed.sector_dna = {
    sectorId: params.sector.sectorId,
    nameTr: params.sector.nameTr,
  }

  return parsed
}
