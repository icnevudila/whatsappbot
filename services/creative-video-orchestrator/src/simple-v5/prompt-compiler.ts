import type { SimpleV5Brief, SimpleV5ShotPlan, SimpleV5CompiledPrompt } from './types.js'

// Compact shared negatives. Provider-specific compilers use the same factual plan.
export const SIMPLE_V5_STANDARD_NEGATIVES = [
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
  'floating bricks',
  'magic hovering bricks',
  'brick on bare brick without mortar',
  'unmotivated location change',
  'identity drift',
  'extra fingers',
  'deformed hands',
  'watermark',
  'on-screen subtitles',
  'English speech',
  'English narration',
].join(', ')

import { resolveProductFidelityContract, formatFidelityLockSection } from './fidelity-contract.js'

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

    const sections: string[] = [
      `[FORMAT]: ${brief.durationSeconds.toFixed(1)}-second vertical commercial video, 9:16 aspect ratio.`,
      `[SINGLE CONCEPT]: ${brief.primaryIdea}`,
      `[HERO PRODUCT SUBJECT ISOLATION]: Focus strictly and exclusively on the foreground physical product item from @HeroProduct. Completely ignore, decouple, and discard any background, floor, shelves, retail interior, or warehouse environment present in @HeroProduct reference photo. Place the product exclusively within [ONE LOCATION]: ${brief.location}.`,
      `[HERO PRODUCT]: Preserve ${brief.heroProductHandle} geometry, material texture, and colors exactly as shown in authoritative reference assets.`,
      `[CANONICAL BRAND IDENTITY]: ZERO FLOATING LOGOS IN SKY OR AIR. No synthetic text overlays, no floating boxes or watermark badges. Apply canonical brand identity diegetically: clearly visible on product packaging, on logistics transport pallets, on background delivery vehicles/trucks, or on the worker's safety vest matching @BrandLogo.`,
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
    ]

    const cinematicPrompt = sections.join('\n')

    // Context-sensitive negatives for reference background leakage prevention
    const locLower = (brief.location || '').toLowerCase()
    const isOutdoorOrNatural = locLower.includes('bahçe') || locLower.includes('tarla') || locLower.includes('tarım') || locLower.includes('şantiye') || locLower.includes('sera') || locLower.includes('arazi') || locLower.includes('açık')
    const backgroundLeakageNegatives = isOutdoorOrNatural
      ? ', indoor warehouse, storage shelves, industrial metal shelving, retail store shelves, interior concrete room, indoor storage, commercial depot'
      : ''

    const negativePrompt = `${SIMPLE_V5_STANDARD_NEGATIVES}${backgroundLeakageNegatives}`

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
