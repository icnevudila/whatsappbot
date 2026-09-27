import type { SimpleV5Brief, SimpleV5ShotPlan, SimpleV5CompiledPrompt } from './types.js'

export const SIMPLE_V5_STANDARD_NEGATIVES = [
  // ── Product geometry ──────────────────────────────────────────────────────
  'duplicate subject',
  'duplicate product',
  'altered product geometry',
  'holes on side surfaces',
  'perforations on multiple faces',
  'double axis holes',
  'perpendicular holes',
  'holes on top and front simultaneously',
  'incorrect product color',
  'warped packaging',
  'warped logo',
  // ── Typography & branding ─────────────────────────────────────────────────
  'gibberish typography',
  'misspelled company name',
  'floating graphics',
  'floating logo',
  'sky logo',
  'air text',
  'billboard in sky',
  'synthetic logo badge',
  'floating title text',
  'banner in sky',
  'holographic interface',
  'doubled letters',
  'repeated consonants',
  'stretched typography',
  'mangled lettering on vehicles',
  // ── On-screen text contamination ──────────────────────────────────────────
  'watermark',
  'on-screen subtitles',
  'English speech',
  'English narration',
  // ── Universal anatomy & limb integrity (ALL sectors) ─────────────────────
  // These errors appear regardless of product category whenever a human is in frame.
  'disembodied hand',
  'floating hand without body',
  'severed forearm entering frame edge',
  'disembodied floating arm',
  'disconnected limb',
  'phantom limb',
  'bodyless hand',
  'extra fingers',
  'deformed hands',
  'six fingers',
  'fused fingers',
  // ── Universal tool & attachment integrity (ALL sectors) ──────────────────
  // Veo can clone attachments regardless of the product type.
  'duplicate tool',
  'cloned attachment',
  'two identical tools',
  'duplicate nozzle',
  'phantom hose',
  'extra cable',
  // ── Universal physics & object stability (ALL sectors) ────────────────────
  'floating object in mid-air',
  'object defying gravity',
  'unmotivated location change',
  'identity drift',
].join(', ')

import { resolveProductFidelityContract, formatFidelityLockSection } from './fidelity-contract.js'

/**
 * Universal Diegetic Branding Engine.
 * Formulates sector-aware physical branding placement and character-level anti-stutter/anti-hallucination
 * constraints for ANY Turkish or international brand name.
 */
export function buildUniversalDiegeticBranding(brandName: string, location: string): {
  brandingDirective: string
  dynamicNegatives: string[]
} {
  const cleanBrand = (brandName || '').trim() || 'İşletmemiz'
  const loc = (location || '').toLowerCase()

  // 1. Sector-appropriate realistic surface targeting
  let surfaces = 'on commercial transport vehicles, worker workwear, or product packaging'
  if (loc.includes('şantiye') || loc.includes('inşaat') || loc.includes('yapı')) {
    surfaces = 'on commercial fleet vehicle doors, worker safety vest, or pallet packaging'
  } else if (loc.includes('tarla') || loc.includes('bahçe') || loc.includes('tarım') || loc.includes('sera')) {
    surfaces = 'on agricultural utility vehicles, field worker overalls, or equipment tanks'
  } else if (loc.includes('kafe') || loc.includes('restoran') || loc.includes('mutfak') || loc.includes('fırın') || loc.includes('döner')) {
    surfaces = 'on barista/chef aprons, storefront plaques, or takeout packaging'
  } else if (loc.includes('klinik') || loc.includes('sağlık') || loc.includes('laboratuvar')) {
    surfaces = 'on reception desk plaque or doctor/practitioner lab coats'
  } else if (loc.includes('mağaza') || loc.includes('butik') || loc.includes('moda') || loc.includes('tekstil')) {
    surfaces = 'on boutique shopping bags, garment tags, or store display signage'
  }

  // 2. Strict character-level anti-mutation directive
  const brandingDirective = `[CANONICAL BRAND IDENTITY]: ZERO FLOATING LOGOS IN SKY OR AIR. No synthetic floating text overlays, no floating boxes or watermark badges. Apply canonical brand identity diegetically in the physical scene: authentic corporate emblem from @BrandLogo matching exact brand "${cleanBrand}". When visible ${surfaces}, render strictly as a neat, compact, centered corporate badge (preserve natural 1:1 or 2:1 aspect ratio, strictly avoiding horizontal letter stretching across large backgrounds or vehicle sides). Exactly spell "${cleanBrand}" letter-for-letter with strictly single letters, zero repeated or doubled consonants.`

  // 3. Dynamic negative constraints protecting against character stutter / doubling
  const dynamicNegatives: string[] = [
    `misspelled ${cleanBrand}`,
    'stretched typography',
    'doubled letters',
    'repeated consonants',
    'letter stutter',
    'mangled lettering on vehicles',
    'scrambled brand typography',
  ]

  // Automatically detect and protect Turkish special characters (ğ, ş, ü, ö, ç, ı)
  const turkishSpecials = ['ğ', 'Ğ', 'ş', 'Ş', 'ü', 'Ü', 'ö', 'Ö', 'ç', 'Ç', 'ı', 'İ']
  for (const char of turkishSpecials) {
    if (cleanBrand.includes(char)) {
      dynamicNegatives.push(`doubled ${char}`, `repeated ${char}`)
    }
  }

  return { brandingDirective, dynamicNegatives }
}

/**
 * SimpleV5PromptCompiler.
 * Formulates a short, concrete Veo prompt following the legacy V4/V5 single-concept structure
 * with non-negotiable Product Fidelity Contract enforcement.
 * Strips all internal QA jargon, provenance essays, and repeated negative walls.
 */
export class SimpleV5PromptCompiler {
  public static compile(brief: SimpleV5Brief, shotPlan: SimpleV5ShotPlan): SimpleV5CompiledPrompt {
    const fidelityReport = brief.fidelityReport || resolveProductFidelityContract({
      product: {
        name: brief.subject,
        product_id: brief.heroProductId,
        asset_id: brief.heroProductId,
        sha256: brief.heroProductSha,
        product_fidelity_contract: brief.productFidelityContract,
      },
    })

    const fidelityLock = formatFidelityLockSection(fidelityReport.contract)
    const { brandingDirective, dynamicNegatives } = buildUniversalDiegeticBranding(brief.brandName, brief.location)

    const sections: string[] = [
      `[FORMAT]: ${brief.durationSeconds.toFixed(1)}-second vertical commercial video, 9:16 aspect ratio.`,
      `[SINGLE CONCEPT]: ${brief.primaryIdea}`,
      `[HERO PRODUCT SUBJECT ISOLATION]: Focus strictly and exclusively on the foreground physical product item from @HeroProduct. Completely ignore, decouple, and discard any background, tables, office furniture, workshop desks, floor, shelves, retail interior, or warehouse depot environment present in @HeroProduct reference photo. Place the product exclusively within [ONE LOCATION]: ${brief.location}.`,
      brief.productPresentationDirective ? `[PRODUCT PRESENTATION]: ${brief.productPresentationDirective}` : '',
      `[HERO PRODUCT]: Preserve ${brief.heroProductHandle} geometry, material texture, and colors exactly as shown in authoritative reference assets.`,
      brandingDirective,
      `[ONE LOCATION]: ${brief.location}, ${brief.lighting}.`,
      `[CONTINUOUS CINEMATIC TAKE]: A single uninterrupted ${brief.durationSeconds.toFixed(1)}-second commercial take with seamless 35mm fluid camera movement. ${shotPlan.shot1_hook.description} ${shotPlan.shot2_proof.description} ${shotPlan.shot3_close.description} NO CUTS, NO ABRUPT HARD JUMPS, SINGLE UNBROKEN CAMERA FLOW.`,
      fidelityLock,
      `[CAMERA & PHYSICS]: ${brief.cameraMotion}. Natural gravity, authentic material weight and realistic movement.`,
      '[AUDIO]: Spoken language: Turkish (tr-TR).',
      `Approved dialogue: "${brief.spokenScript}"`,
      'Speak exactly this dialogue once, naturally in Turkish.',
      'No English narration.',
      'No translation.',
      'Natural ambient realistic environmental foley. SILENT ON-SET CINEMATIC TAKE, ZERO ON-SCREEN SUBTITLES, ZERO ON-SCREEN CAPTIONS.',
      `[RAW TEXT POLICY]: Clean commercial footage, no on-screen text, no synthetic titles.`,
    ].filter(Boolean)

    const cinematicPrompt = sections.join('\n')

    // Context-sensitive negatives for reference background leakage prevention
    const domainNegs = brief.domainNegatives || []
    const locLower = (brief.location || '').toLowerCase()
    const isOutdoorOrNatural =
      brief.operationalDomain === 'AGRICULTURE_NATURE' ||
      brief.operationalDomain === 'CONSTRUCTION_STRUCTURAL' ||
      locLower.includes('bahçe') ||
      locLower.includes('tarla') ||
      locLower.includes('tarım') ||
      locLower.includes('şantiye') ||
      locLower.includes('sera') ||
      locLower.includes('arazi') ||
      locLower.includes('açık')

    const extraOutdoorNegs = isOutdoorOrNatural
      ? [
          'indoor warehouse',
          'storage shelves',
          'industrial metal shelving',
          'retail store shelves',
          'interior concrete room',
          'indoor storage',
          'commercial depot',
          'garage workbench',
          'ceiling pipes',
          'fluorescent lights',
          'indoor tabletop',
          'office desk',
        ]
      : []

    const combinedNegs = Array.from(new Set([
      ...SIMPLE_V5_STANDARD_NEGATIVES.split(', ').map(s => s.trim()),
      ...domainNegs,
      ...extraOutdoorNegs,
      ...dynamicNegatives,
    ])).filter(Boolean)

    const negativePrompt = combinedNegs.join(', ')

    const metrics = {
      charCount: cinematicPrompt.length,
      instructionCount: 11, // Added [PRODUCT FIDELITY LOCK]
      negativeCount: SIMPLE_V5_STANDARD_NEGATIVES.split(', ').length,
      actionCount: 1, // Exactly 1 primary action
      locationCount: 1, // Exactly 1 location
      llmCallCountBeforeVeo: 0, // Deterministic zero-LLM path!
    }

    return {
      cinematicPrompt,
      negativePrompt,
      voiceoverScript: brief.spokenScript,
      wordCount: brief.spokenWordCount,
      fidelity: {
        applied: true,
        canonicalAssetSha: brief.heroProductSha || '',
        productId: brief.heroProductId || '',
        ruleCount: fidelityReport.ruleCount,
        contract: fidelityReport.contract,
      },
      metrics,
    }
  }
}

export class GeminiVideoPromptCompiler {
  public static compile(brief: SimpleV5Brief, shotPlan: SimpleV5ShotPlan): SimpleV5CompiledPrompt {
    return SimpleV5PromptCompiler.compile(brief, shotPlan)
  }
}

export class FlowVeoPromptCompiler {
  public static compile(brief: SimpleV5Brief, shotPlan: SimpleV5ShotPlan): SimpleV5CompiledPrompt {
    return SimpleV5PromptCompiler.compile(brief, shotPlan)
  }
}
