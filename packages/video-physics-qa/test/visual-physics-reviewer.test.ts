import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import {
  VisualPhysicsReviewer,
  HUMAN_GROUND_TRUTH_AYVAZOGLU_AUDIT
} from '../src/visual-physics-reviewer.js'

test('VisualPhysicsReviewer: evaluateVideoPhysics truthfully returns NOT_IMPLEMENTED on any existing MP4 regardless of filename', () => {
  const reviewer = new VisualPhysicsReviewer()
  const realVideoPath = process.env.MESAJIFY_AYVAZOGLU_RAW_PATH || 'C:/Users/TP2/Desktop/mesajify_ciktilar/ayvazoglu_video_8s_raw.mp4'

  if (!existsSync(realVideoPath)) {
    throw new Error(`CRITICAL_TEST_FAILURE: Required fixture missing: ${realVideoPath}`)
  }

  // Test 1: Video with 'ayvazoglu' in name
  const report1 = reviewer.evaluateVideoPhysics({
    jobId: 'job_01',
    videoPath: realVideoPath
  })

  assert.equal(report1.automated_physics_qa, 'NOT_IMPLEMENTED')
  assert.equal(report1.vlm_capability, 'UNAVAILABLE')
  assert.equal(report1.frames_semantically_analyzed, 0)
  assert.equal(report1.overall_decision, 'NOT_VERIFIED')
  assert.ok(report1.failure_reason?.includes('AUTOMATED_PHYSICS_QA_NOT_IMPLEMENTED'))

  // Test 2: Any other sample MP4 without 'ayvazoglu' in name
  const samplePath = 'C:/Users/TP2/Desktop/mesajify_ciktilar/blind_test_samples/sample_veriburada.mp4'
  if (existsSync(samplePath)) {
    const report2 = reviewer.evaluateVideoPhysics({
      jobId: 'job_02',
      videoPath: samplePath
    })

    // Must be IDENTICAL: Automated physics QA is NOT implemented for either video!
    assert.equal(report2.automated_physics_qa, 'NOT_IMPLEMENTED')
    assert.equal(report2.vlm_capability, 'UNAVAILABLE')
    assert.equal(report2.frames_semantically_analyzed, 0)
    assert.equal(report2.overall_decision, 'NOT_VERIFIED')
  }
})

test('VisualPhysicsReviewer: evaluateVideoPhysics fails closed on missing video path', () => {
  const reviewer = new VisualPhysicsReviewer()
  const report = reviewer.evaluateVideoPhysics({
    jobId: 'missing_job',
    videoPath: 'C:/non_existent_file.mp4'
  })

  assert.equal(report.overall_decision, 'NOT_VERIFIED')
  assert.ok(report.failure_reason?.includes('VIDEO_FILE_NOT_FOUND'))
  assert.equal(report.automated_physics_qa, 'NOT_IMPLEMENTED')
})

test('VisualPhysicsReviewer: human ground truth audit is strictly separated and attributed to human director', () => {
  const audit = HUMAN_GROUND_TRUTH_AYVAZOGLU_AUDIT

  assert.equal(audit.audited_by, 'human_director')
  assert.equal(audit.target_question, 'Forkliftin indirdiği ağır palet gerçekte hangi nesne veya yüzey tarafından destekleniyor?')
  assert.equal(audit.structural_viability, 'IMPOSSIBLE_OR_PRECARIOUS')
  assert.ok(audit.grounding_evidence.includes('insan gözlemci tarafından tespit edilmiştir'))
})

test('VisualPhysicsReviewer: contrastive scenarios explicitly declare automated physics as NOT_IMPLEMENTED', () => {
  const reviewer = new VisualPhysicsReviewer()
  const samplesDir = process.env.MESAJIFY_QA_SAMPLES_DIR || 'C:/Users/TP2/Desktop/mesajify_ciktilar/blind_test_samples'
  const rawVideoPath = process.env.MESAJIFY_AYVAZOGLU_RAW_PATH || 'C:/Users/TP2/Desktop/mesajify_ciktilar/ayvazoglu_video_8s_raw.mp4'

  const scenarios = reviewer.getContrastiveScenarios(samplesDir, rawVideoPath)
  assert.equal(scenarios.length, 6)

  for (const s of scenarios) {
    assert.equal(s.automated_physics_decision, 'NOT_IMPLEMENTED')
  }

  // Demonstrates the critical blind spot of FFmpeg:
  const s3 = scenarios.find(s => s.id === 'SCENARIO_3_PHYSICALLY_BROKEN_CONTINUOUS')
  assert.ok(s3)
  assert.ok(s3.false_negative_risk.includes('KRİTİK KANIT'))
})
