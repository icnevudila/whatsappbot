import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { TemporalVisualQAEngine } from '../src/temporal-visual-qa.js'

test('Blind MP4 Batch Evaluation: tests 5 unseen historical MP4s without prompt hints', () => {
  const engine = new TemporalVisualQAEngine()
  const samplesDir = 'C:/Users/TP2/Desktop/mesajify_ciktilar/blind_test_samples'

  if (!existsSync(samplesDir)) {
    console.log('Skipping blind MP4 batch test as samples folder does not exist.')
    return
  }

  const files = [
    'sample_bofe_canary.mp4',
    'sample_veriburada.mp4',
    'sample_b3fcc6a6.mp4',
    'sample_d8560985.mp4',
    'sample_2ac51fc9.mp4'
  ]

  const results: Record<string, any> = {}

  for (const f of files) {
    const fullPath = join(samplesDir, f)
    if (!existsSync(fullPath)) continue

    const report = engine.evaluateVideo({
      jobId: `blind_${f}`,
      attemptId: 'blind_att',
      rawSha256: 'uncalculated',
      videoPath: fullPath,
    })

    results[f] = {
      decision: report.decision,
      findingsCount: report.findings.length,
      categories: Object.fromEntries(
        Object.entries(report.categories).map(([k, v]) => [k, v?.decision])
      ),
      summary: report.summary
    }
  }

  console.log('Blind test results:', JSON.stringify(results, null, 2))
  assert.equal(Object.keys(results).length, 5)
  // Veriburada is a continuous smooth tech screen video -> should have 0 cuts and PASS
  if (results['sample_veriburada.mp4']) {
    assert.equal(results['sample_veriburada.mp4'].decision, 'PASS')
  }
})
