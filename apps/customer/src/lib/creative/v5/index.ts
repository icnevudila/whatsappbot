/**
 * MESAJIFY VIDEO ENGINE V5 - MAIN COMPILER ENTRYPOINT
 * Sector-independent, modular pipeline.
 */

import type { UserVideoInput, V5FinalOutputPackage } from './schemas'
import { normalizeFacts } from './fact-normalizer'
import { analyzeOntology } from './ontology-analyzer'
import { selectCreativeStrategy } from './strategy-selector'
import { selectHook } from './hook-selector'
import { planShots } from './shot-planner'
import { writeVoiceover } from './voiceover-writer'
import { compileOverlay } from './overlay-compiler'
import { validateAndRepair } from './validator'
import { completeText } from '../../ai/text'
import type { AiKeyBag } from '../../ai/config'

export * from './schemas'
export { normalizeFacts } from './fact-normalizer'
export { analyzeOntology } from './ontology-analyzer'
export { selectCreativeStrategy } from './strategy-selector'
export { selectHook } from './hook-selector'
export { planShots, V5_STANDARD_NEGATIVES } from './shot-planner'
export { writeVoiceover, validateClaims, verifyPercentageClaim, countTurkishSyllables, estimateSpeechDuration } from './voiceover-writer'
export { compileOverlay, deriveHookHeadline } from './overlay-compiler'
export { validateAndRepair, validateGeneratedVideoArtifact } from './validator'

/**
 * Deterministic V5 Video Compiler Pipeline
 * Fully executes the modular chain with zero runtime external dependencies.
 */
export function compileDeterministicV5(input: UserVideoInput): V5FinalOutputPackage {
  // 1. Fact Normalizer (Extracts facts, preserves ctaText, deadline, deliveryArea)
  const facts = normalizeFacts(input)

  // 2. Offer & Objective Analyzer (Universal Ontology)
  const ontology = analyzeOntology(facts)

  // 3. Creative Strategy Selector
  const strategy = selectCreativeStrategy(ontology)

  // 4. Hook Selector (3 dynamic candidates scored on 5 criteria, zero stereotypes)
  const hook = selectHook(ontology, facts)

  // 5. Turkish Voiceover Writer (Target 8-13 words, real claim validation, syllable duration)
  let voiceover = writeVoiceover(facts, ontology, strategy)
  if (input.customVoiceover && input.customVoiceover.trim().length > 5) {
    const cleanUserVo = input.customVoiceover.trim().replace(/["']/g, '')
    const wc = cleanUserVo.split(/\s+/).length
    voiceover = {
      ...voiceover,
      text: cleanUserVo,
      wordCount: wc,
      estimatedDurationSeconds: Math.min(7.0, Math.max(2.0, wc * 0.45)),
    }
  }

  // 6. Shot Planner (8s 3-kadraj + single location + VO wired into Veo prompt AUDIO directive + cameraMode)
  let shotPlan = planShots(facts, ontology, strategy, hook, voiceover.text, input.cameraMode)

  // 7. Overlay & Subtitle Compiler (2-4 word benefit headline, decoupled text layer)
  const overlay = compileOverlay(facts, ontology, voiceover)

  // 8. Deterministic Hard-Fail Validator & Modular Auto-Repair
  const validationResult = validateAndRepair(facts, ontology, hook, shotPlan, voiceover, overlay)

  if (validationResult.repairedVoiceover && (!input.customVoiceover || input.customVoiceover.trim().length <= 5)) {
    voiceover = validationResult.repairedVoiceover
  }
  if (validationResult.repairedShotPlan) {
    shotPlan = validationResult.repairedShotPlan
  }

  // 9. Unconditionally synchronize final voiceover across prompt, subtitles and package
  const finalVoClean = voiceover.text.replace(/["']/g, '').trim()
  overlay.subtitles.sourceText = voiceover.text

  if (shotPlan.veoEnglishPrompt.includes('AUDIO:')) {
    shotPlan.veoEnglishPrompt = shotPlan.veoEnglishPrompt.replace(
      /AUDIO: Professional crystal-clear Turkish voiceover: "[^"]*"/,
      `AUDIO: Professional crystal-clear Turkish voiceover: "${finalVoClean}"`
    )
  }
  const veoPrompt = shotPlan.veoEnglishPrompt

  // 10. Final Output Package
  return {
    normalizedBrief: facts,
    classification: ontology,
    creativeStrategy: strategy,
    hookPlan: hook,
    shotPlan,
    voiceover,
    veoPrompt,
    overlayPlan: overlay,
    validation: validationResult.validation,
    lockedBrandIdentity: facts.lockedBrandIdentity || {
      brandName: facts.verifiedFacts.brandName || null,
      originalLogoUrl: facts.assets.logoReferenceUrl || null,
      colors: {},
      fonts: undefined,
      isLocked: true,
    },
    videoArtifactValidation: undefined,
  }
}

/**
 * AI-Assisted V5 Compiler (Gemini / AI integration) with deterministic fallback.
 */
export async function compileVideoEngineV5(
  input: UserVideoInput,
  bag?: AiKeyBag | null,
): Promise<V5FinalOutputPackage> {
  const deterministicOutput = compileDeterministicV5(input)

  // If status is needs_clarification or blocked, return immediately without wasting tokens
  if (deterministicOutput.validation.status === 'needs_clarification' || deterministicOutput.validation.status === 'blocked') {
    return deterministicOutput
  }

  // If AI API key is available, run prompt refinement through Gemini
  try {
    const systemPrompt = `ROL: Sen Mesajify Video Engine V5 Prompt Compiler'sın.
KURAL: Veo ham videosunda sıfır metin kuralı geçerlidir. 8 saniyelik tek lokasyon 3 kadrajlı (0-2.2s, 2.2-5.8s, 5.8-8.0s) sinematik çekim oluştur.
Türkçe seslendirme en fazla 16 kelimedir, devrik olamaz.
Girdi nesnesini zenginleştirerek JSON formatında döndür.`

    const userPrompt = `Girdi: ${JSON.stringify(deterministicOutput, null, 2)}`

    const rawResponse = await completeText(systemPrompt, userPrompt, {
      ...bag,
      preferredTextProvider: 'google',
    })

    const clean = rawResponse.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(clean) as V5FinalOutputPackage
    if (parsed.veoPrompt && parsed.voiceover?.text) {
      return parsed
    }
  } catch (err) {
    // Zero-downtime graceful fallback to deterministic engine
  }

  return deterministicOutput
}
