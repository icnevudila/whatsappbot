import type { SimpleV5Brief, SimpleV5ShotPlan, SimpleV5CompiledPrompt } from './types.js'

// Compact shared negatives. Provider-specific compilers use the same factual plan.
export const SIMPLE_V5_STANDARD_NEGATIVES = [
  'duplicate subject',
  'duplicate product',
  'altered product geometry',
  'incorrect product color',
  'warped packaging',
  'warped logo',
  'gibberish typography',
  'floating graphics',
  'holographic interface',
  'unmotivated location change',
  'identity drift',
  'extra fingers',
  'deformed hands',
  'watermark',
  'on-screen subtitles',
  'English speech',
  'English narration',
  'carved or stamped logo on brick',
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
      `[HERO PRODUCT]: Preserve ${brief.heroProductHandle} geometry, material texture, and colors exactly as shown in authoritative reference assets. NO INVENTED PHYSICAL BRANDING.`,
      `[ONE LOCATION]: ${brief.location}, ${brief.lighting}.`,
      `[SHOT 1 (${shotPlan.shot1_hook.timing})]: ${shotPlan.shot1_hook.description}`,
      `[SHOT 2 (${shotPlan.shot2_proof.timing})]: ${shotPlan.shot2_proof.description}`,
      `[SHOT 3 (${shotPlan.shot3_close.timing})]: ${shotPlan.shot3_close.description}`,
      fidelityLock,
      `[CAMERA & PHYSICS]: ${brief.cameraMotion}. Natural gravity, authentic material weight and realistic movement.`,
      '[AUDIO]: Spoken language: Turkish (tr-TR).',
      `Approved dialogue: "${brief.spokenScript}"`,
      'Speak exactly this dialogue once, naturally in Turkish.',
      'No English narration.',
      'No translation.',
      'Natural ambient foley.',
      `[RAW TEXT POLICY]: Clean commercial footage, no on-screen text, no synthetic titles.`,
    ]

    const cinematicPrompt = sections.join('\n')
    const negativePrompt = SIMPLE_V5_STANDARD_NEGATIVES

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
