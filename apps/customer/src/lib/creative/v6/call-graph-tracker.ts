/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * PRODUCTION CALL GRAPH TRACKER & AUDIT TRACER (V6 HARDENED)
 * 
 * 39 Adımlı Tam Üretim Zinciri (Fact Resolver -> Flow -> Visual QA -> TTS -> creative.READY):
 * Dead code veya test-only mock kalmasını kesinlikle engeller.
 * Her adım modül, fonksiyon, jobId, milisaniyelik zaman damgası ve durum içerir.
 */

export interface CallGraphTraceEntry {
  stepIndex: number
  stepCode: string
  module: string
  functionName: string
  jobId: string
  timestampIso: string
  timestampMs: number
  status: 'SUCCESS' | 'WARNING' | 'FAILED'
  summary: string
  details?: Record<string, any>
}

export interface ProductionStepDefinition {
  stepIndex: number
  stepCode: string
  module: string
  functionName: string
  description: string
  phase: 'CREATIVE_DECISION' | 'ENGINE_EXECUTION' | 'POST_PRODUCTION_AND_QA'
}

export const PRODUCTION_39_STEPS: readonly ProductionStepDefinition[] = [
  // Creative Decision Pipeline (Adım 1 - 21)
  { stepIndex: 1, stepCode: 'REQ_RECEIVE', module: 'gateway-ingress', functionName: 'receiveCustomerRequest', description: 'customer request received', phase: 'CREATIVE_DECISION' },
  { stepIndex: 2, stepCode: 'TENANT_RESOLVE', module: 'tenant-resolver', functionName: 'resolveTenantBrand', description: 'tenant / brand resolution', phase: 'CREATIVE_DECISION' },
  { stepIndex: 3, stepCode: 'SECTOR_FACTS', module: 'fact-resolver', functionName: 'resolveSectorFacts', description: 'sector fact resolution', phase: 'CREATIVE_DECISION' },
  { stepIndex: 4, stepCode: 'CREATIVE_DNA', module: 'creative-dna', functionName: 'extractCreativeDNA', description: 'creative dna extraction', phase: 'CREATIVE_DECISION' },
  { stepIndex: 5, stepCode: 'STRATEGIC_PROMISE', module: 'strategic-promise', functionName: 'formulateStrategicPromise', description: 'strategic promise derivation', phase: 'CREATIVE_DECISION' },
  { stepIndex: 6, stepCode: 'MEMORY_LOAD', module: 'creative-memory', functionName: 'evaluateMemory', description: 'memory load & anti-repetition check', phase: 'CREATIVE_DECISION' },
  { stepIndex: 7, stepCode: 'CONCEPT_GEN', module: 'concept-generator', functionName: 'generateCreativeConcepts', description: 'concept generation (5 candidates)', phase: 'CREATIVE_DECISION' },
  { stepIndex: 8, stepCode: 'DIVERSITY_VAL', module: 'concept-generator', functionName: 'validateConceptDiversity', description: 'diversity validation', phase: 'CREATIVE_DECISION' },
  { stepIndex: 9, stepCode: 'TOURNAMENT_SCORE', module: 'concept-tournament', functionName: 'runConceptTournament', description: 'concept tournament scoring', phase: 'CREATIVE_DECISION' },
  { stepIndex: 10, stepCode: 'WINNER_SELECT', module: 'concept-tournament', functionName: 'selectWinningConcept', description: 'winning concept selection', phase: 'CREATIVE_DECISION' },
  { stepIndex: 11, stepCode: 'DIRECTOR_TREATMENT', module: 'director-treatment', functionName: 'formulateDirectorTreatment', description: 'director treatment generation', phase: 'CREATIVE_DECISION' },
  { stepIndex: 12, stepCode: 'GRAMMAR_ROUTING', module: 'grammar-router', functionName: 'routeCommercialGrammar', description: 'grammar routing (short vs full commercial)', phase: 'CREATIVE_DECISION' },
  { stepIndex: 13, stepCode: 'BEAT_DERIVATION', module: 'beat-sheet', functionName: 'generateBeatSheet', description: 'beat sheet derivation', phase: 'CREATIVE_DECISION' },
  { stepIndex: 14, stepCode: 'TIMING_SOLVER', module: 'beat-sheet', functionName: 'solveDynamicBeatTimings', description: 'dynamic beat timing solver', phase: 'CREATIVE_DECISION' },
  { stepIndex: 15, stepCode: 'CAUSE_EFFECT', module: 'cause-effect-graph', functionName: 'buildCauseEffectGraph', description: 'cause-effect graph verification', phase: 'CREATIVE_DECISION' },
  { stepIndex: 16, stepCode: 'SCENE_CONTRACTS', module: 'scene-contract', functionName: 'buildSceneContractsV2', description: 'scene contract generation', phase: 'CREATIVE_DECISION' },
  { stepIndex: 17, stepCode: 'NEGATIVE_CONSTRAINTS', module: 'scene-contract', functionName: 'compileNegativeConstraints', description: 'negative constraints compilation', phase: 'CREATIVE_DECISION' },
  { stepIndex: 18, stepCode: 'CAMERA_LIGHTING', module: 'scene-contract', functionName: 'designCameraAndLighting', description: 'camera / lighting design', phase: 'CREATIVE_DECISION' },
  { stepIndex: 19, stepCode: 'AUDIO_PLAN', module: 'audio-plan', functionName: 'buildAudioPlan', description: 'audio narrative plan', phase: 'CREATIVE_DECISION' },
  { stepIndex: 20, stepCode: 'PROMPT_COMPILER', module: 'prompt-compiler', functionName: 'compileValidatedSceneContractsToVeo', description: 'prompt compilation (veo3 ready)', phase: 'CREATIVE_DECISION' },
  { stepIndex: 21, stepCode: 'QUALITY_GATE_PRE', module: 'final-quality-gate', functionName: 'evaluateProductionQualityGate', description: 'quality gate pre-render check', phase: 'CREATIVE_DECISION' },

  // Flow Engine Execution Pipeline (Adım 22 - 31)
  { stepIndex: 22, stepCode: 'INGREDIENT_PREP', module: 'flow-adapter', functionName: 'prepareIngredientAssets', description: 'ingredient preparation (official logo hash + crop)', phase: 'ENGINE_EXECUTION' },
  { stepIndex: 23, stepCode: 'FLOW_SESSION', module: 'flow-adapter', functionName: 'acquireFlowSession', description: 'flow engine session acquisition', phase: 'ENGINE_EXECUTION' },
  { stepIndex: 24, stepCode: 'TILE_SELECT', module: 'flow-adapter', functionName: 'selectOrCreateTile', description: 'tile selection / creation', phase: 'ENGINE_EXECUTION' },
  { stepIndex: 25, stepCode: 'ATTACHMENT_CONFIRM', module: 'flow-adapter', functionName: 'confirmIngredientAttachment', description: 'ingredient attachment confirmation', phase: 'ENGINE_EXECUTION' },
  { stepIndex: 26, stepCode: 'PROMPT_INJECT', module: 'flow-adapter', functionName: 'injectVeoPrompt', description: 'prompt injection to flow', phase: 'ENGINE_EXECUTION' },
  { stepIndex: 27, stepCode: 'GEN_TRIGGER', module: 'flow-adapter', functionName: 'triggerGeneration', description: 'generation trigger', phase: 'ENGINE_EXECUTION' },
  { stepIndex: 28, stepCode: 'FLOW_POLL', module: 'flow-adapter', functionName: 'pollFlowStatus', description: 'flow status polling loop', phase: 'ENGINE_EXECUTION' },
  { stepIndex: 29, stepCode: 'COMPLETION_DETECT', module: 'flow-adapter', functionName: 'detectCompletion', description: 'completion detection', phase: 'ENGINE_EXECUTION' },
  { stepIndex: 30, stepCode: 'ASSET_DOWNLOAD', module: 'flow-adapter', functionName: 'downloadVideoAsset', description: 'video asset download', phase: 'ENGINE_EXECUTION' },
  { stepIndex: 31, stepCode: 'SHA256_VERIFY', module: 'flow-adapter', functionName: 'verifySha256Checksum', description: 'sha256 checksum verification', phase: 'ENGINE_EXECUTION' },

  // Visual QA, Audio Mastering & Storage Closure (Adım 32 - 39)
  { stepIndex: 32, stepCode: 'VISUAL_QA', module: 'director-qa', functionName: 'performFiveKeyframeAnalysis', description: 'visual qa (5-frame analysis: 0, 25, 50, 75, 95)', phase: 'POST_PRODUCTION_AND_QA' },
  { stepIndex: 33, stepCode: 'BRAND_OVERLAY', module: 'post-production', functionName: 'enforceOfficialBrandOverlay', description: 'official logo / brand overlay enforcement', phase: 'POST_PRODUCTION_AND_QA' },
  { stepIndex: 34, stepCode: 'TTS_VOICEOVER', module: 'audio-mastering', functionName: 'generateEdgeTtsVoiceover', description: 'edge-tts voiceover generation', phase: 'POST_PRODUCTION_AND_QA' },
  { stepIndex: 35, stepCode: 'SUBTITLE_ALIGN', module: 'post-production', functionName: 'alignSubtitleTimings', description: 'subtitle timing alignment', phase: 'POST_PRODUCTION_AND_QA' },
  { stepIndex: 36, stepCode: 'FFMPEG_MASTER', module: 'audio-mastering', functionName: 'masterAudioEbuR128', description: 'ffmpeg mastering (EBU R128 -14 LUFS / -1 dBTP)', phase: 'POST_PRODUCTION_AND_QA' },
  { stepIndex: 37, stepCode: 'STORAGE_UPLOAD', module: 'artifact-provenance', functionName: 'writeStorageAndProvenanceRecord', description: 'storage upload / artifact provenance write', phase: 'POST_PRODUCTION_AND_QA' },
  { stepIndex: 38, stepCode: 'CREATIVE_READY', module: 'lifecycle-controller', functionName: 'transitionToCreativeReady', description: 'creative.READY state transition', phase: 'POST_PRODUCTION_AND_QA' },
  { stepIndex: 39, stepCode: 'AUDIT_SEALED', module: 'call-graph-tracker', functionName: 'sealAuditTrace', description: 'audit trace sealed', phase: 'POST_PRODUCTION_AND_QA' },
] as const

export class CallGraphTracer {
  private entries: CallGraphTraceEntry[] = []
  private jobId: string

  constructor(jobId: string) {
    this.jobId = String(jobId || 'job_default').trim()
  }

  recordStep(
    moduleName: string,
    functionName: string,
    summary: string,
    details?: Record<string, any>,
    status: 'SUCCESS' | 'WARNING' | 'FAILED' = 'SUCCESS'
  ): CallGraphTraceEntry {
    const now = Date.now()
    const nextIndex = this.entries.length + 1
    const matchingDef = PRODUCTION_39_STEPS.find(s => s.module === moduleName && s.functionName === functionName) ||
      PRODUCTION_39_STEPS[nextIndex - 1]

    const stepCode = matchingDef ? matchingDef.stepCode : `STEP_${nextIndex}`

    const entry: CallGraphTraceEntry = {
      stepIndex: nextIndex,
      stepCode,
      module: moduleName,
      functionName,
      jobId: this.jobId,
      timestampIso: new Date(now).toISOString(),
      timestampMs: now,
      status,
      summary,
      details,
    }
    this.entries.push(entry)
    console.log(
      `[CallGraph][${entry.jobId}] Step #${entry.stepIndex} [${entry.stepCode}] [${entry.module}.${entry.functionName}] -> ${summary}`
    )
    return entry
  }

  recordStepByDef(
    stepDefIndex: number,
    summary: string,
    details?: Record<string, any>,
    status: 'SUCCESS' | 'WARNING' | 'FAILED' = 'SUCCESS'
  ): CallGraphTraceEntry {
    const def = PRODUCTION_39_STEPS.find(s => s.stepIndex === stepDefIndex)
    if (!def) {
      return this.recordStep('custom-module', `customStep_${stepDefIndex}`, summary, details, status)
    }
    return this.recordStep(def.module, def.functionName, summary, details, status)
  }

  getTrace(): CallGraphTraceEntry[] {
    return [...this.entries]
  }

  verifyProductionAuditTrace(mode: 'creative_compilation' | 'end_to_end_production' = 'creative_compilation'): {
    isComplete: boolean
    totalExecuted: number
    requiredCount: number
    missingSteps: string[]
    executedSteps: string[]
  } {
    const targetSteps = mode === 'creative_compilation'
      ? PRODUCTION_39_STEPS.slice(0, 21)
      : PRODUCTION_39_STEPS

    const executedModulesAndFuncs = new Set(this.entries.map(e => `${e.module}.${e.functionName}`))
    const missing = targetSteps
      .filter(s => !executedModulesAndFuncs.has(`${s.module}.${s.functionName}`))
      .map(s => `#${s.stepIndex} [${s.stepCode}]: ${s.description}`)

    return {
      isComplete: missing.length === 0,
      totalExecuted: this.entries.length,
      requiredCount: targetSteps.length,
      missingSteps: missing,
      executedSteps: this.entries.map(e => `#${e.stepIndex} [${e.stepCode}]: ${e.summary}`),
    }
  }

  // Geriye dönük uyumluluk
  verifyCompleteProductionCallGraph(): {
    isComplete: boolean
    executedModules: string[]
    missingModules: string[]
  } {
    const executed = new Set(this.entries.map(e => e.module))
    const required = Array.from(new Set(PRODUCTION_39_STEPS.slice(0, 21).map(s => s.module)))
    const missing = required.filter(m => !executed.has(m))
    return {
      isComplete: missing.length === 0,
      executedModules: Array.from(executed),
      missingModules: missing,
    }
  }
}
