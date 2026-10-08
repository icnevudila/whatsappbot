import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { TemporalVisualQAEngine } from '../src/temporal-visual-qa.js'

test('TemporalVisualQAEngine: evaluates real Ayvazoğlu raw video strictly via FFmpeg metrics without hardcoded inputs', () => {
  const engine = new TemporalVisualQAEngine()
  const realVideoPath = 'C:/Users/TP2/Desktop/mesajify_ciktilar/ayvazoglu_video_8s_raw.mp4'

  if (!existsSync(realVideoPath)) {
    console.log('Skipping real video evaluation test as file is not on local path.')
    return
  }

  // Pass only the file path - NO hardcoded error lists, NO expected answers
  const report = engine.evaluateVideo({
    jobId: 'blind_eval_job',
    attemptId: 'blind_eval_attempt',
    rawSha256: 'uncalculated',
    videoPath: realVideoPath
  })

  assert.equal(report.job_id, 'blind_eval_job')
  assert.ok(report.findings.length > 0)
  // Check that the engine discovered the transition around 3.8s - 4.1s empirically
  const transitionFinding = report.findings.find(f => f.category === 'CAMERA_CONTINUITY')
  assert.ok(transitionFinding, 'Must detect camera transition anomaly')
  assert.ok(transitionFinding.timestamp_start >= 3.5 && transitionFinding.timestamp_end <= 4.3)
  assert.equal(report.decision, 'NEEDS_REVIEW')
})
