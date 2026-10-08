import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { TemporalVisualQAEngine } from '../src/temporal-visual-qa.js'

test('TemporalVisualQAEngine: evaluates real Ayvazoğlu raw video file without crashing', () => {
  const engine = new TemporalVisualQAEngine()
  const realVideoPath = 'C:/Users/TP2/Desktop/mesajify_ciktilar/ayvazoglu_video_8s_raw.mp4'

  if (!existsSync(realVideoPath)) {
    console.log('Skipping real video evaluation test as file is not on local path.')
    return
  }

  const report = engine.evaluateVideo({
    jobId: 'b03d19e5-bee7-54f5-ad59-7af52c2bb1b2',
    attemptId: '13ecf45a-fc46-4a2e-9ec1-cfdf0fae0b53',
    rawSha256: '9c23a164fc01e90fcf6b9af4e0c3ea56c8155e5a94d4bc808488de2688de6edb',
    videoPath: realVideoPath,
    expectedBrand: 'Ayvazoğlu İnşaat',
    expectedSubject: 'tuğla 2',
    spokenDialogue: 'Ayvazoğlu İnşaat tuğla 2. Ayrıntılı bilgi almak için bize ulaşın.'
  })

  assert.equal(report.job_id, 'b03d19e5-bee7-54f5-ad59-7af52c2bb1b2')
  assert.equal(report.attempt_id, '13ecf45a-fc46-4a2e-9ec1-cfdf0fae0b53')
  assert.ok(report.findings.length > 0)
  assert.ok(report.findings.some(f => f.category === 'PHYSICAL_SUPPORT'))
  assert.ok(report.findings.some(f => f.category === 'CAMERA_CONTINUITY'))
  assert.equal(report.summary.critical_errors >= 1, true)
})
