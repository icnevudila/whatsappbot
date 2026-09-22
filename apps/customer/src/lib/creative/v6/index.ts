/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * MASTER ORCHESTRATOR & ENTRYPOINT (V6 HARDENED)
 * 
 * Pipeline Akışı:
 * INPUT -> FACT RESOLVER -> CREATIVE DNA -> STRATEGIC PROMISE ->
 * 5 DIVERSE CONCEPTS -> CONCEPT TOURNAMENT -> DIRECTOR TREATMENT -> GRAMMAR ROUTER ->
 * DYNAMIC BEAT SHEET -> CAUSE/EFFECT GRAPH -> SCENE CONTRACTS V2 -> SCENE VALIDATOR ->
 * CONFIGURABLE VISIBILITY BUDGETS -> DETERMINISTIC PROMPT COMPILER -> AUDIO PLAN ->
 * QUALITY GATE -> CALL GRAPH AUDIT TRACE
 */

import type {
  ResolvedCreativeFacts,
  CreativeDNA,
  StrategicPromise,
  TournamentResult,
  DirectorTreatment,
  StoryBeat,
  CauseEffectLink,
  SceneContractV2,
  AudioPlan,
  V6FeatureFlags,
  V6FinalProductionPackage,
  CreativeFingerprint
} from './creative-types'

import { resolveFacts, type RawCreativeInput } from './fact-resolver'
import { deriveCreativeDNA } from './creative-dna'
import { formulateStrategicPromise } from './strategic-promise'
import { generateCreativeConcepts, validateConceptDiversity } from './concept-generator'
import { runConceptTournament } from './concept-tournament'
import { formulateDirectorTreatment } from './director-treatment'
import { routeCommercialGrammar } from './grammar-router'
import { generateBeatSheet } from './beat-sheet'
import { buildCauseEffectGraph } from './cause-effect-graph'
import { globalCreativeMemory } from './creative-memory'
import { buildSceneContractsV2 } from './scene-contract'
import { validateSceneContracts } from './scene-validator'
import { auditProductVisibility, type ProductVisibilityConfig } from './product-visibility'
import { auditBrandVisibility } from './brand-visibility'
import { compileValidatedSceneContractsToVeo } from './prompt-compiler'
import { buildAudioPlan, verifyAudioDurationGate, type AudioLoudnessPreset } from './audio-plan'
import { evaluateProductionQualityGate } from './final-quality-gate'
import { evaluateDirectorQA } from './director-qa'
import { verifyArtifactProvenance } from './artifact-provenance'
import { CallGraphTracer } from './call-graph-tracker'

export * from './creative-types'
export * from './fact-resolver'
export * from './creative-dna'
export * from './strategic-promise'
export * from './concept-generator'
export * from './concept-tournament'
export * from './director-treatment'
export * from './grammar-router'
export * from './beat-sheet'
export * from './cause-effect-graph'
export * from './creative-memory'
export * from './scene-contract'
export * from './scene-validator'
export * from './product-visibility'
export * from './brand-visibility'
export * from './transition-engine'
export * from './prompt-compiler'
export * from './director-qa'
export * from './artifact-provenance'
export * from './audio-plan'
export * from './final-quality-gate'
export * from './runtime-gpt-prompt'
export * from './call-graph-tracker'

export const DEFAULT_V6_FEATURE_FLAGS: V6FeatureFlags = {
  CREATIVE_DIRECTOR_V6_ENABLED: process.env.CREATIVE_DIRECTOR_V6_ENABLED !== 'false',
  DIRECTOR_TWO_PASS_ENABLED: process.env.DIRECTOR_TWO_PASS_ENABLED === 'true',
  DIRECTOR_VISUAL_QA_ENABLED: process.env.DIRECTOR_VISUAL_QA_ENABLED !== 'false',
  DIRECTOR_CANDIDATES_ENABLED: process.env.DIRECTOR_CANDIDATES_ENABLED !== 'false',
  TTS_MASTER_ENABLED: process.env.TTS_MASTER_ENABLED !== 'false',
  LEGACY_CREATIVE_FALLBACK_ENABLED: process.env.LEGACY_CREATIVE_FALLBACK_ENABLED !== 'false',
}

export function compileAutonomousCommercialV6(
  input: RawCreativeInput,
  options: {
    history?: CreativeFingerprint[]
    flags?: Partial<V6FeatureFlags>
    cameraMode?: 'continuous_take' | 'directed_cuts'
    sceneCountOverride?: number
    loudnessPreset?: AudioLoudnessPreset
    visibilityConfig?: ProductVisibilityConfig
    jobId?: string
  } = {}
): V6FinalProductionPackage {
  const flags: V6FeatureFlags = { ...DEFAULT_V6_FEATURE_FLAGS, ...(options.flags || {}) }
  const jobId = options.jobId || `v6_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const tracer = new CallGraphTracer(jobId)

  // 1. Fact Resolver (Normalizes facts without hallucination)
  const facts = resolveFacts(input)
  tracer.recordStep('fact-resolver', 'resolveFacts', `Facts normalized for ${facts.brandName} (${facts.product.name})`, {
    brand: facts.brandName,
    product: facts.product.name,
    sector: facts.sectorFacts.sectorProfileId,
  })

  // 2. 4-Tier Creative DNA (Brand, Product, Campaign, Context)
  const dna = deriveCreativeDNA(facts)
  tracer.recordStep('creative-dna', 'deriveCreativeDNA', `4-Tier DNA derived: ${dna.brand.premiumLevel} / ${dna.campaign.objective}`, {
    personality: dna.brand.personality,
    materials: dna.product.materials,
  })

  // 3. Strategic Promise (Singular core belief + evidence)
  const promise = formulateStrategicPromise(facts, dna)
  tracer.recordStep('strategic-promise', 'formulateStrategicPromise', `Strategic Promise: "${promise.statement.slice(0, 50)}..."`, {
    before: promise.viewerBeliefBefore,
    after: promise.viewerBeliefAfter,
  })

  // 4. Creative Memory Evaluation (Anti-Repetition)
  const memoryEval = globalCreativeMemory.evaluateMemory(
    facts.orgId,
    10,
    options.history
  )
  tracer.recordStep('creative-memory', 'evaluateMemory', `Memory evaluated: Novelty score ${memoryEval.noveltyScore}/100`, {
    avoidPatterns: memoryEval.avoidRecentPatterns,
  })

  // 5. 5 Dynamic & Diverse Creative Concepts
  const candidates = generateCreativeConcepts(facts, dna, promise)
  const diversity = validateConceptDiversity(candidates)
  tracer.recordStep('concept-generator', 'generateCreativeConcepts', `Generated 5 concepts (Diversity: ${diversity.isDiverse ? 'PASS' : 'WARN'})`, {
    concepts: candidates.map(c => c.name),
    maxPairwiseSimilarity: diversity.pairwiseSimilarityMax,
  })

  // 6. Concept Tournament (Weighted selection & penalty application)
  const tournament = runConceptTournament(candidates, facts, dna, promise, memoryEval)
  const selectedConcept = tournament.winner
  tracer.recordStep('concept-tournament', 'runConceptTournament', `Tournament winner: "${selectedConcept.name}" (Score: ${tournament.winnerScore.totalScore})`, {
    winnerId: selectedConcept.id,
    allScores: tournament.allScores.map(s => `${s.conceptId}: ${s.totalScore}`),
  })

  // 7. Director Treatment (Directorial philosophy, motifs, lighting, editing)
  const treatment = formulateDirectorTreatment(selectedConcept, facts, dna, promise)
  tracer.recordStep('director-treatment', 'formulateDirectorTreatment', `Treatment formulated: ${treatment.directorIntent.slice(0, 50)}...`)

  // 8. Dynamic Grammar Router
  const grammarPlan = routeCommercialGrammar(facts.campaign.durationSeconds, {
    hasExactProductReference: facts.product.referenceAssetIds.length > 0,
    campaignObjective: facts.campaign.objective,
    sectorHint: facts.sectorFacts.sectorProfileId,
  })
  tracer.recordStep('grammar-router', 'routeCommercialGrammar', `Routed to ${grammarPlan.grammarType} (Allowed scenes: ${grammarPlan.allowedSceneCounts.join(',')})`)

  // 9. Story Beat Sheet (Dynamic Short Performance / Sector-Specific Long Form)
  const beatSheet = generateBeatSheet({
    facts,
    dna,
    promise,
    treatment,
    targetDurationSeconds: facts.campaign.durationSeconds,
    concept: selectedConcept,
    sceneCountOverride: options.sceneCountOverride,
  })
  tracer.recordStep('beat-sheet', 'generateBeatSheet', `Generated ${beatSheet.length} dynamic story beats`, {
    beats: beatSheet.map(b => `${b.id}[${b.type}]: ${b.startSec}-${b.endSec}s`),
  })

  // 10. Cause / Effect Graph
  const causeEffectGraph = buildCauseEffectGraph(beatSheet)
  tracer.recordStep('cause-effect-graph', 'buildCauseEffectGraph', `Linked ${causeEffectGraph.length} causal transitions`)

  // 11. Scene Contracts V2
  const initialContracts = buildSceneContractsV2({
    facts,
    dna,
    treatment,
    beats: beatSheet,
    links: causeEffectGraph,
    cameraMode: options.cameraMode || grammarPlan.cameraModePreferred,
  })
  tracer.recordStep('scene-contract', 'buildSceneContractsV2', `Built ${initialContracts.length} SceneContractV2 specifications`)

  // 12. Scene Validator (Scene Necessity Test & DECORATIVE_SHOT Pruning)
  const sceneValidation = validateSceneContracts(initialContracts, facts.campaign.durationSeconds)
  tracer.recordStep('scene-validator', 'validateSceneContracts', `Scene validation passed: ${sceneValidation.validatedScenes.length} active scenes`)

  // 13. Configurable Product & Dynamic Brand Visibility Budgets
  const productAudit = auditProductVisibility(
    sceneValidation.validatedScenes,
    grammarPlan.grammarType,
    options.visibilityConfig || { campaignObjective: facts.campaign.objective }
  )
  const brandAudit = auditBrandVisibility(
    sceneValidation.validatedScenes,
    grammarPlan.grammarType,
    { hasLogoAsset: Boolean(facts.brandFacts.logoUrl) }
  )
  tracer.recordStep('product-visibility', 'auditProductVisibility', `Product exposure: ${productAudit.totalDirectExposurePercent}% (Target: ${productAudit.targetExposureMin}-${productAudit.targetExposureMax}%)`)
  tracer.recordStep('brand-visibility', 'auditBrandVisibility', `Brand strategy: ${brandAudit.exactLogoStrategy} (Exposure: ${brandAudit.totalBrandExposurePercent}%)`)

  // 14. Deterministic Prompt Compiler (Validated contracts -> Veo English prompt)
  const veoPrompt = compileValidatedSceneContractsToVeo({
    scenes: sceneValidation.validatedScenes,
    facts,
    dna,
    targetDurationSeconds: facts.campaign.durationSeconds,
    grammarType: grammarPlan.grammarType,
    cameraMode: options.cameraMode || grammarPlan.cameraModePreferred,
  })
  tracer.recordStep('prompt-compiler', 'compileValidatedSceneContractsToVeo', `Compiled deterministic Veo prompt (${veoPrompt.length} chars)`)

  // 15. Audio Plan & Mastering Targets (Configurable Presets)
  const audioPlan = buildAudioPlan({
    facts,
    dna,
    treatment,
    durationSeconds: facts.campaign.durationSeconds,
    customVoiceover: facts.campaign.customVoiceover,
    loudnessPreset: options.loudnessPreset || 'social',
  })
  tracer.recordStep('audio-plan', 'buildAudioPlan', `Audio plan: ${audioPlan.wordCount} words, preset ${audioPlan.loudnessTarget.preset} (${audioPlan.loudnessTarget.integratedLufs} LUFS)`)

  // 16. Production Quality Gate
  evaluateProductionQualityGate({
    sceneValidation,
    productAudit,
    brandAudit,
  })
  tracer.recordStep('final-quality-gate', 'evaluateProductionQualityGate', 'Production quality gate approved')

  return {
    facts,
    dna,
    promise,
    conceptTournament: tournament,
    directorTreatment: treatment,
    beatSheet,
    causeEffectGraph,
    sceneContracts: sceneValidation.validatedScenes,
    veoPrompt,
    audioPlan,
    featureFlags: flags,
    grammarType: grammarPlan.grammarType,
    targetDurationSeconds: facts.campaign.durationSeconds,
    callGraphTrace: tracer.getTrace(),
    version: '6.0.0',
  }
}
