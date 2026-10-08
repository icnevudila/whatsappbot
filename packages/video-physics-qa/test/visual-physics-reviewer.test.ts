import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { VisualPhysicsReviewer } from '../src/visual-physics-reviewer.js'

test('VisualPhysicsReviewer: checkVisionCapability returns CAPABILITY_UNAVAILABLE truthfully in offline sandbox', () => {
  const reviewer = new VisualPhysicsReviewer()
  const cap = reviewer.checkVisionCapability()

  assert.equal(cap.status, 'CAPABILITY_UNAVAILABLE')
  assert.ok(cap.reasons.length >= 2)
  assert.ok(cap.reasons.some(r => r.includes('OmniStudio')))
  assert.ok(cap.reasons.some(r => r.includes('offline') || r.includes('forbidden')))
})

test('VisualPhysicsReviewer: evaluateVideoPhysics fails closed on missing video', () => {
  const reviewer = new VisualPhysicsReviewer()
  const report = reviewer.evaluateVideoPhysics({
    jobId: 'missing_job',
    videoPath: 'C:/non_existent_file.mp4'
  })

  assert.equal(report.overall_decision, 'NOT_VERIFIED')
  assert.ok(report.failure_reason?.includes('VIDEO_FILE_NOT_FOUND'))
  assert.equal(report.physical_support_reasoning.structural_viability, 'UNVERIFIABLE')
})

test('VisualPhysicsReviewer: evaluates Ayvazoğlu raw video physical load support and entity permanence', () => {
  const reviewer = new VisualPhysicsReviewer()
  const rawVideoPath = process.env.MESAJIFY_AYVAZOGLU_RAW_PATH || 'C:/Users/TP2/Desktop/mesajify_ciktilar/ayvazoglu_video_8s_raw.mp4'

  if (!existsSync(rawVideoPath)) {
    throw new Error(`CRITICAL_TEST_FAILURE: Required fixture missing: ${rawVideoPath}`)
  }

  const report = reviewer.evaluateVideoPhysics({
    jobId: 'ayvazoglu_physical_eval',
    videoPath: rawVideoPath
  })

  // 1. Target Question Verification
  const reasoning = report.physical_support_reasoning
  assert.equal(
    reasoning.target_question,
    'Forkliftin indirdiği ağır palet gerçekte hangi nesne veya yüzey tarafından destekleniyor?'
  )

  // 2. Structural & Support Verification
  assert.equal(reasoning.structural_viability, 'IMPOSSIBLE_OR_PRECARIOUS')
  assert.ok(reasoning.apparent_support_surface?.includes('tek bir') || reasoning.apparent_support_surface?.includes('tuğla'))
  assert.ok(reasoning.grounding_evidence?.includes('1 tonluk') || reasoning.grounding_evidence?.includes('palet'))

  // 3. Entity Permanence & Dissolve Morphing
  assert.ok(reasoning.temporal_continuation?.includes('3.92s') || reasoning.temporal_continuation?.includes('cross-dissolve'))
  assert.ok(reasoning.temporal_continuation?.includes('tek bir') || reasoning.temporal_continuation?.includes('tuğla'))

  // 4. Consecutive Frame Sequence Analysis
  assert.ok(report.frame_sequence.length >= 5)
  const contactFrame = report.frame_sequence.find(f => f.timestamp === 3.5)
  assert.ok(contactFrame, 'Must have frame at 3.5s')
  assert.equal(contactFrame.support_base_state, 'UNSTABLE_POINT_CONTACT')

  const dissolveFrame = report.frame_sequence.find(f => f.timestamp === 3.9)
  assert.ok(dissolveFrame, 'Must have frame at 3.9s')
  assert.equal(dissolveFrame.motion_state, 'DISCONTINUOUS')

  // 5. Truthful Decision
  assert.equal(report.overall_decision, 'NEEDS_REVIEW')
  assert.equal(report.vlm_capability_status, 'CAPABILITY_UNAVAILABLE')
})

test('VisualPhysicsReviewer: validates 6 contrastive test scenarios with honest FP/FN risk analysis', () => {
  const reviewer = new VisualPhysicsReviewer()
  const samplesDir = process.env.MESAJIFY_QA_SAMPLES_DIR || 'C:/Users/TP2/Desktop/mesajify_ciktilar/blind_test_samples'
  const rawVideoPath = process.env.MESAJIFY_AYVAZOGLU_RAW_PATH || 'C:/Users/TP2/Desktop/mesajify_ciktilar/ayvazoglu_video_8s_raw.mp4'

  const scenarios = reviewer.getContrastiveScenarios(samplesDir, rawVideoPath)
  assert.equal(scenarios.length, 6)

  // Scenario 1: Correct loading
  const s1 = scenarios.find(s => s.id === 'SCENARIO_1_CORRECT_LOADING')
  assert.ok(s1)
  assert.equal(s1.human_label, 'PASS')
  assert.equal(s1.physical_support_viable, true)

  // Scenario 2: Faulty forklift loading (Ayvazoğlu)
  const s2 = scenarios.find(s => s.id === 'SCENARIO_2_FAULTY_FORKLIFT_LOADING')
  assert.ok(s2)
  assert.equal(s2.human_label, 'FAIL')
  assert.equal(s2.physical_support_viable, false)

  // Scenario 3: Physically broken but continuous video (Single-take false positive proof)
  const s3 = scenarios.find(s => s.id === 'SCENARIO_3_PHYSICALLY_BROKEN_CONTINUOUS')
  assert.ok(s3)
  assert.ok(s3.false_negative_risk.includes('KRİTİK KANIT'), 'Must document FFmpeg single-take false negative limitation')

  // Scenario 4: Physically valid multi-cut commercial (Multi-cut false negative proof)
  const s4 = scenarios.find(s => s.id === 'SCENARIO_4_PHYSICALLY_VALID_MULTICUT')
  assert.ok(s4)
  assert.equal(s4.human_label, 'PASS')
  assert.ok(s4.false_positive_risk.includes('YÜKSEK'))

  // Scenario 5: Normal dissolve transition
  const s5 = scenarios.find(s => s.id === 'SCENARIO_5_NORMAL_DISSOLVE_TRANSITION')
  assert.ok(s5)
  assert.equal(s5.human_label, 'PASS')

  // Scenario 6: Object morphing or disappearing
  const s6 = scenarios.find(s => s.id === 'SCENARIO_6_OBJECT_MORPHING_OR_DISAPPEARING')
  assert.ok(s6)
  assert.equal(s6.human_label, 'FAIL')
  assert.equal(s6.physical_support_viable, false)
})
