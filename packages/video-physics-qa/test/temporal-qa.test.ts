import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { TemporalVisualQAEngine } from '../src/temporal-visual-qa.js'

test('TemporalVisualQAEngine: returns NOT_VERIFIED on missing or corrupt video file', () => {
  const engine = new TemporalVisualQAEngine()
  const report = engine.evaluateVideo({
    jobId: 'missing_job',
    attemptId: 'missing_att',
    rawSha256: 'none',
    videoPath: 'C:/non_existent_video_path.mp4'
  })

  assert.equal(report.decision, 'NOT_VERIFIED')
  assert.ok(report.failure_reason?.includes('VIDEO_FILE_NOT_FOUND'))
  assert.equal(report.categories.SCENE_TRANSITION?.decision, 'NOT_VERIFIED')
  assert.equal(report.categories.SCENE_TRANSITION?.score, null)
  assert.equal(report.categories.PHYSICAL_SUPPORT?.decision, 'NOT_VERIFIED')
})

test('TemporalVisualQAEngine: evaluates real Ayvazoğlu video with honest transition anomaly', () => {
  const engine = new TemporalVisualQAEngine()
  const realVideoPath = process.env.MESAJIFY_AYVAZOGLU_RAW_PATH || 'C:/Users/TP2/Desktop/mesajify_ciktilar/ayvazoglu_video_8s_raw.mp4'

  if (!existsSync(realVideoPath)) {
    throw new Error(`CRITICAL_TEST_FAILURE: Required fixture missing: ${realVideoPath}`)
  }

  const report = engine.evaluateVideo({
    jobId: 'ayvazoglu_raw_eval',
    attemptId: 'att_01',
    rawSha256: '9c23a164fc01e90fcf6b9af4e0c3ea56c8155e5a94d4bc808488de2688de6edb',
    videoPath: realVideoPath
  })

  // 1. Should flag empirical transition anomaly around 3.9s
  assert.equal(report.decision, 'NEEDS_REVIEW')
  const finding = report.findings.find(f => f.category === 'SCENE_TRANSITION')
  assert.ok(finding, 'Must find empirical scene transition anomaly')
  assert.ok(finding.evidence.includes('POSSIBLE_TRANSITION_ANOMALY'))
  assert.ok(finding.timestamp_start >= 3.6 && finding.timestamp_end <= 4.2)

  // 2. Must NOT claim fake 95 score or PASS on unverified physical support
  assert.equal(report.categories.PHYSICAL_SUPPORT?.decision, 'NOT_VERIFIED')
  assert.equal(report.categories.PHYSICAL_SUPPORT?.score, null)
  assert.equal(report.categories.PRODUCT_FIDELITY?.decision, 'NOT_VERIFIED')
  assert.equal(report.categories.BRAND_FIDELITY?.decision, 'NOT_VERIFIED')
})
