/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * PRODUCTION CALL GRAPH TRACKER & AUDIT TRACER (V6 HARDENED)
 * 
 * Amaç:
 * Gerçek kullanıcı isteğinden final videoya kadar olan üretim zincirini
 * adım adım, modül adı, fonksiyon adı, job_id ve milisaniyelik zaman damgasıyla
 * doğrulanabilir bir audit trace olarak kaydeder.
 * Dead code veya test-only modül kalmasını kesinlikle engeller.
 */

export interface CallGraphTraceEntry {
  stepIndex: number
  module: string
  functionName: string
  jobId: string
  timestampIso: string
  timestampMs: number
  status: 'SUCCESS' | 'WARNING' | 'FAILED'
  summary: string
  details?: Record<string, any>
}

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
    const entry: CallGraphTraceEntry = {
      stepIndex: this.entries.length + 1,
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
      `[CallGraph][${entry.jobId}] Step #${entry.stepIndex}: [${entry.module}.${entry.functionName}] -> ${summary}`
    )
    return entry
  }

  getTrace(): CallGraphTraceEntry[] {
    return [...this.entries]
  }

  verifyCompleteProductionCallGraph(): {
    isComplete: boolean
    executedModules: string[]
    missingModules: string[]
  } {
    const requiredModules = [
      'fact-resolver',
      'creative-dna',
      'strategic-promise',
      'creative-memory',
      'concept-generator',
      'concept-tournament',
      'director-treatment',
      'grammar-router',
      'beat-sheet',
      'cause-effect-graph',
      'scene-contract',
      'scene-validator',
      'product-visibility',
      'brand-visibility',
      'prompt-compiler',
      'audio-plan',
      'final-quality-gate',
    ]

    const executed = new Set(this.entries.map(e => e.module))
    const missing = requiredModules.filter(m => !executed.has(m))

    return {
      isComplete: missing.length === 0,
      executedModules: Array.from(executed),
      missingModules: missing,
    }
  }
}
