import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import type { VideoQAReport, QAFinding } from './types.js'

export interface VideoQAEvaluationOptions {
  jobId: string
  attemptId: string
  rawSha256: string
  videoPath: string
  tempDir?: string
}

export class TemporalVisualQAEngine {
  private version = '1.1.0-truthful-shadow'

  public evaluateVideo(options: VideoQAEvaluationOptions): VideoQAReport {
    const findings: QAFinding[] = []
    const evaluatedAt = new Date().toISOString()

    // 1. File existence validation
    if (!options.videoPath || !existsSync(options.videoPath)) {
      return {
        job_id: options.jobId,
        attempt_id: options.attemptId,
        raw_sha256: options.rawSha256,
        reviewer_version: this.version,
        evaluated_at: evaluatedAt,
        decision: 'NOT_VERIFIED',
        failure_reason: `VIDEO_FILE_NOT_FOUND: Video file not accessible at path: ${options.videoPath}`,
        categories: {
          SCENE_TRANSITION: { decision: 'NOT_VERIFIED', score: null, issues: ['File missing'] },
          CAMERA_CONTINUITY: { decision: 'NOT_VERIFIED', score: null, issues: ['File missing'] },
          PHYSICAL_SUPPORT: { decision: 'NOT_VERIFIED', score: null, issues: ['File missing'] },
          ACTION_CAUSALITY: { decision: 'NOT_VERIFIED', score: null, issues: ['File missing'] },
          PRODUCT_FIDELITY: { decision: 'NOT_VERIFIED', score: null, issues: ['File missing'] },
          BRAND_FIDELITY: { decision: 'NOT_VERIFIED', score: null, issues: ['File missing'] }
        },
        findings: [{
          category: 'SCENE_TRANSITION',
          severity: 'CRITICAL',
          confidence: 1.0,
          timestamp_start: 0,
          timestamp_end: 0,
          evidence: `File not found on filesystem: ${options.videoPath}`
        }],
        summary: {
          critical_errors: 1,
          warning_count: 0,
          requires_human_review: true,
        }
      }
    }

    // 2. ffprobe integrity & duration validation
    const probeResult = this.probeVideo(options.videoPath)
    if (!probeResult.valid) {
      return {
        job_id: options.jobId,
        attempt_id: options.attemptId,
        raw_sha256: options.rawSha256,
        reviewer_version: this.version,
        evaluated_at: evaluatedAt,
        decision: 'NOT_VERIFIED',
        failure_reason: `FFPROBE_ANALYSIS_FAILED: ${probeResult.error || 'Video container damaged or unreadable'}`,
        categories: {
          SCENE_TRANSITION: { decision: 'NOT_VERIFIED', score: null, issues: [probeResult.error || 'Corrupt media'] },
          CAMERA_CONTINUITY: { decision: 'NOT_VERIFIED', score: null, issues: [probeResult.error || 'Corrupt media'] },
          PHYSICAL_SUPPORT: { decision: 'NOT_VERIFIED', score: null, issues: ['Unanalyzable video'] },
          ACTION_CAUSALITY: { decision: 'NOT_VERIFIED', score: null, issues: ['Unanalyzable video'] },
          PRODUCT_FIDELITY: { decision: 'NOT_VERIFIED', score: null, issues: ['Unanalyzable video'] },
          BRAND_FIDELITY: { decision: 'NOT_VERIFIED', score: null, issues: ['Unanalyzable video'] }
        },
        findings: [{
          category: 'SCENE_TRANSITION',
          severity: 'CRITICAL',
          confidence: 1.0,
          timestamp_start: 0,
          timestamp_end: 0,
          evidence: `ffprobe failed: ${probeResult.error}`
        }],
        summary: {
          critical_errors: 1,
          warning_count: 0,
          requires_human_review: true,
        }
      }
    }

    const duration = probeResult.duration

    // 3. Empirical FFmpeg Scene Transition Analysis (Calculated strictly from pixel delta metadata)
    const transitionResult = this.detectSceneTransitions(options.videoPath)
    if (!transitionResult.success) {
      return {
        job_id: options.jobId,
        attempt_id: options.attemptId,
        raw_sha256: options.rawSha256,
        reviewer_version: this.version,
        evaluated_at: evaluatedAt,
        decision: 'NOT_VERIFIED',
        failure_reason: `FFMPEG_TRANSITION_DETECTION_FAILED: ${transitionResult.error}`,
        categories: {
          SCENE_TRANSITION: { decision: 'NOT_VERIFIED', score: null, issues: [transitionResult.error || 'FFmpeg failed'] },
          CAMERA_CONTINUITY: { decision: 'NOT_VERIFIED', score: null, issues: ['Not analyzed'] },
          PHYSICAL_SUPPORT: { decision: 'NOT_VERIFIED', score: null, issues: ['Requires 3D/VLM vision model'] },
          ACTION_CAUSALITY: { decision: 'NOT_VERIFIED', score: null, issues: ['Requires 3D/VLM vision model'] },
          PRODUCT_FIDELITY: { decision: 'NOT_VERIFIED', score: null, issues: ['Requires reference feature embedding'] },
          BRAND_FIDELITY: { decision: 'NOT_VERIFIED', score: null, issues: ['Requires logo OCR / embedding'] }
        },
        findings: [{
          category: 'SCENE_TRANSITION',
          severity: 'CRITICAL',
          confidence: 1.0,
          timestamp_start: 0,
          timestamp_end: 0,
          evidence: `FFmpeg execution error: ${transitionResult.error}`
        }],
        summary: {
          critical_errors: 1,
          warning_count: 0,
          requires_human_review: true,
        }
      }
    }

    const transitions = transitionResult.transitions

    // 4. Truthful Evaluation of Scene Transitions:
    // - Clean cuts (score >= 0.20): Normal, motivated cinematic cuts are completely valid (PASS / INFO).
    // - Subtle gradual blend (0.04 <= score < 0.20 across sequential frames): Flagged cautiously as POSSIBLE_TRANSITION_ANOMALY (NEEDS_REVIEW).
    // - Never claim definitive physical law violation purely from scene scores!
    let slowBlendCount = 0
    for (const transition of transitions) {
      if (transition.timestamp > 0.5) {
        if (transition.isSlowBlendOrDissolve) {
          slowBlendCount++
          findings.push({
            category: 'SCENE_TRANSITION',
            severity: 'WARNING',
            confidence: transition.confidence,
            timestamp_start: Math.max(0, Number((transition.timestamp - 0.2).toFixed(2))),
            timestamp_end: Number((transition.timestamp + 0.2).toFixed(2)),
            evidence: `POSSIBLE_TRANSITION_ANOMALY: Multi-frame gradual dissolve/ghosting pattern detected at ${transition.timestamp.toFixed(2)}s (scene delta score: ${transition.score.toFixed(3)}). Insufficient evidence for definitive physics violation; flagged for human review.`,
            suggested_correction: 'Review transition frame blend; use deliberate hard cut or continuous take if ghosting is visually distracting.'
          })
        }
      }
    }

    const warningCount = findings.filter(f => f.severity === 'WARNING').length
    const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length

    // Truthful Decision Policy:
    // 1. Critical errors -> FAIL
    // 2. Warnings (gradual blend / dissolve anomaly) -> NEEDS_REVIEW
    // 3. Clean transitions (PASS), but physics unverified -> overall creative QA is NOT_VERIFIED
    let decision: import('./types.js').QADecision = 'NOT_VERIFIED'
    if (criticalCount > 0) {
      decision = 'FAIL'
    } else if (warningCount > 0) {
      decision = 'NEEDS_REVIEW'
    } else {
      // Scene transition passed, but physical support/causality unverified
      decision = 'NOT_VERIFIED'
    }

    return {
      job_id: options.jobId,
      attempt_id: options.attemptId,
      raw_sha256: options.rawSha256,
      reviewer_version: this.version,
      evaluated_at: evaluatedAt,
      decision,
      categories: {
        // SCENE_TRANSITION is genuinely measured via FFmpeg scene filter
        SCENE_TRANSITION: {
          decision: slowBlendCount > 0 ? 'NEEDS_REVIEW' : 'PASS',
          score: slowBlendCount > 0 ? 70 : 100,
          issues: findings.filter(f => f.category === 'SCENE_TRANSITION').map(f => f.evidence)
        },
        // CAMERA_CONTINUITY: Only measured in terms of cut stability
        CAMERA_CONTINUITY: {
          decision: slowBlendCount > 0 ? 'NEEDS_REVIEW' : 'PASS',
          score: slowBlendCount > 0 ? 75 : 95,
          issues: findings.filter(f => f.category === 'CAMERA_CONTINUITY').map(f => f.evidence)
        },
        // Categories that require Visual AI (VLM) / 3D tracking are truthfully marked NOT_VERIFIED
        PHYSICAL_SUPPORT: {
          decision: 'NOT_VERIFIED',
          score: null,
          issues: ['Requires multi-frame VLM vision reasoning; 2D pixel delta alone cannot verify structural load capacity.']
        },
        ACTION_CAUSALITY: {
          decision: 'NOT_VERIFIED',
          score: null,
          issues: ['Requires semantic action segmentation to distinguish motivated cinematic cut from narrative break.']
        },
        PRODUCT_FIDELITY: {
          decision: 'NOT_VERIFIED',
          score: null,
          issues: ['Requires feature embedding comparison with reference asset.']
        },
        BRAND_FIDELITY: {
          decision: 'NOT_VERIFIED',
          score: null,
          issues: ['Requires diegetic logo presence OCR and vector matching.']
        }
      },
      findings,
      summary: {
        critical_errors: criticalCount,
        warning_count: warningCount,
        requires_human_review: decision !== 'PASS'
      }
    }
  }

  private probeVideo(path: string): { valid: boolean; duration: number; error?: string } {
    try {
      const res = spawnSync('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        path
      ], { timeout: 10000, encoding: 'utf-8' })

      if (res.status !== 0) {
        return { valid: false, duration: 0, error: res.stderr || 'ffprobe exited with non-zero status' }
      }

      const dur = parseFloat((res.stdout || '').trim())
      if (!Number.isFinite(dur) || dur <= 0) {
        return { valid: false, duration: 0, error: 'ffprobe reported zero or non-finite duration' }
      }

      return { valid: true, duration: dur }
    } catch (err: any) {
      return { valid: false, duration: 0, error: err.message || 'ffprobe execution failed' }
    }
  }

  private detectSceneTransitions(path: string): {
    success: boolean
    error?: string
    transitions: Array<{ timestamp: number; score: number; isSlowBlendOrDissolve: boolean; confidence: number }>
  } {
    try {
      const res = spawnSync('ffmpeg', [
        '-i', path,
        '-vf', 'select=gt(scene\\,0.04),metadata=print:file=-',
        '-f', 'null', '-'
      ], { timeout: 20000, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 })

      // Fail-closed on ANY non-zero exit code
      if (res.status !== 0) {
        return {
          success: false,
          error: res.stderr || `ffmpeg exited with non-zero exit code (${res.status})`,
          transitions: []
        }
      }

      const out = res.stdout || ''
      const lines = out.split(/\r?\n/)
      const rawTransitions: Array<{ timestamp: number; score: number }> = []

      let currentPtsTime = 0.0
      for (const line of lines) {
        if (line.includes('pts_time:')) {
          const match = line.match(/pts_time:([0-9.]+)/)
          if (match) currentPtsTime = parseFloat(match[1])
        }
        if (line.includes('lavfi.scene_score=')) {
          const match = line.match(/lavfi\.scene_score=([0-9.]+)/)
          if (match) {
            const score = parseFloat(match[1])
            rawTransitions.push({ timestamp: currentPtsTime, score })
          }
        }
      }

      // Group transitions to avoid false-positive ghosting on isolated single-frame score
      const transitions: Array<{ timestamp: number; score: number; isSlowBlendOrDissolve: boolean; confidence: number }> = []
      for (let i = 0; i < rawTransitions.length; i++) {
        const curr = rawTransitions[i]
        const prev = rawTransitions[i - 1]
        const next = rawTransitions[i + 1]

        const hasNeighborInWindow =
          (prev && Math.abs(curr.timestamp - prev.timestamp) <= 0.4) ||
          (next && Math.abs(curr.timestamp - next.timestamp) <= 0.4)

        const isLowMid = curr.score >= 0.04 && curr.score < 0.20
        const isSlowBlend = isLowMid && Boolean(hasNeighborInWindow)

        // Drop isolated single-frame low-mid spikes as transient motion/lighting jitter
        if (isLowMid && !hasNeighborInWindow) {
          continue
        }

        transitions.push({
          timestamp: curr.timestamp,
          score: curr.score,
          isSlowBlendOrDissolve: isSlowBlend,
          confidence: isSlowBlend ? 0.85 : 0.95
        })
      }

      return { success: true, transitions }
    } catch (err: any) {
      return { success: false, error: err.message, transitions: [] }
    }
  }
}
