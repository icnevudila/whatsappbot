import { normalizeFacts } from './core/fact-normalizer.js'
import { analyzeOntology } from './core/ontology-analyzer.js'
import { selectCreativeStrategy } from './core/strategy-selector.js'
import { selectHook } from './core/hook-selector.js'
import { writeVoiceover, estimateSpeechDuration } from './core/voiceover-writer.js'
import { planShots } from './core/shot-planner.js'
import { compileOverlay, buildCommercialTypographyAss } from './core/overlay-compiler.js'
import { validateAndRepair } from './core/validator.js'
import type { UserVideoInput } from './core/schemas.js'

export const HISTORICAL_VIDEO_CREATIVE_TREE = '6f4541db624f82a13c964c77dd421b15046465a1'

/** Historical creative chain, separate from SIMPLE_V5. The speech contract is
 * deliberately injected once after historical repairs so that no old fallback
 * or later director instruction can introduce a second approved dialogue. */
export function compileHistoricalV5(input: UserVideoInput, approvedDialogue: string) {
  const dialogue = approvedDialogue.trim()
  if (!dialogue || /[\r\n]/.test(dialogue)) throw new Error('HISTORICAL_V5_APPROVED_DIALOGUE_REQUIRED')
  const facts = normalizeFacts(input)
  const classification = analyzeOntology(facts)
  const creativeStrategy = selectCreativeStrategy(classification)
  const hookPlan = selectHook(classification, facts)
  let voiceover = writeVoiceover(facts, classification, creativeStrategy)
  let shotPlan = planShots(facts, classification, creativeStrategy, hookPlan, voiceover.text, input.cameraMode)
  const overlayPlan = compileOverlay(facts, classification, voiceover)
  const validation = validateAndRepair(facts, classification, hookPlan, shotPlan, voiceover, overlayPlan)
  voiceover = validation.repairedVoiceover || voiceover
  shotPlan = validation.repairedShotPlan || shotPlan
  const speech = `AUDIO: Professional crystal-clear native Turkish male commercial narrator speaks EXACTLY ONCE. No speech before 0.5s. Start at 0.5s, target completion 5.25s, last spoken word strictly before 5.5s: ${JSON.stringify(dialogue)}. No paraphrase, translation, English narration, repetition, looping, echo or voice re-entry. After narration, only the original scene ambience, foley and commercial music continue to 8.0s.`
  const veoPrompt = shotPlan.veoEnglishPrompt.replace(/^AUDIO:.*$/m, speech)
  if (!veoPrompt.includes(speech)) throw new Error('HISTORICAL_V5_AUDIO_DIRECTIVE_MISSING')
  overlayPlan.subtitles.sourceText = dialogue
  if (overlayPlan.commercialTypography) {
    overlayPlan.assContent = buildCommercialTypographyAss(
      overlayPlan.commercialTypography.beat1,
      overlayPlan.commercialTypography.beat2,
      overlayPlan.commercialTypography.beat3,
    )
  }
  const speechEstimate = estimateSpeechDuration(dialogue)
  return {
    historical_tree_sha: HISTORICAL_VIDEO_CREATIVE_TREE,
    creative_engine: 'HISTORICAL_V5',
    normalizedBrief: facts,
    classification,
    creativeStrategy,
    hookPlan,
    voiceover: { ...voiceover, text: dialogue, wordCount: dialogue.split(/\s+/).length, syllableCount: speechEstimate.syllableCount, estimatedDurationSeconds: speechEstimate.durationSeconds, safetyMarginSeconds: speechEstimate.safetyMarginSeconds },
    shotPlan: { ...shotPlan, veoEnglishPrompt: veoPrompt },
    veoPrompt,
    overlayPlan,
    validation: validation.validation,
    speech_timeline: { start_sec: 0.5, target_end_sec: 5.25, end_before_sec: 5.5, text: dialogue },
  }
}
