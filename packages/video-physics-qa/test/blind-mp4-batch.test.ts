import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { TemporalVisualQAEngine } from '../src/temporal-visual-qa.js'

interface HumanGroundTruth {
  filename: string
  humanLabel: 'PASS' | 'NEEDS_REVIEW' | 'FAIL'
  sceneDescription: string
  hasGhostingOrDissolve: boolean
}

// 5 Verified Human-Labeled Real MP4 Fixtures
const groundTruthCatalog: HumanGroundTruth[] = [
  {
    filename: 'sample_veriburada.mp4',
    humanLabel: 'PASS',
    sceneDescription: 'Continuous, single unbroken tech screen take without scene cuts',
    hasGhostingOrDissolve: false
  },
  {
    filename: 'sample_2ac51fc9.mp4',
    humanLabel: 'PASS',
    sceneDescription: 'Normal stable commercial shot with opening camera settling',
    hasGhostingOrDissolve: false
  },
  {
    filename: 'sample_b3fcc6a6.mp4',
    humanLabel: 'NEEDS_REVIEW',
    sceneDescription: 'Brick commercial with mid-video cut and outro transition',
    hasGhostingOrDissolve: true
  },
  {
    filename: 'sample_bofe_canary.mp4',
    humanLabel: 'NEEDS_REVIEW',
    sceneDescription: 'Multi-frame gradual blend transitions during agricultural action',
    hasGhostingOrDissolve: true
  },
  {
    filename: 'sample_d8560985.mp4',
    humanLabel: 'NEEDS_REVIEW',
    sceneDescription: 'Multiple rapid scene transitions requiring continuity review',
    hasGhostingOrDissolve: true
  }
]

test('Human-Validated Real MP4 Benchmark: tests 5 distinct real videos fail-closed without missing fixtures', () => {
  const engine = new TemporalVisualQAEngine()
  const samplesDir = 'C:/Users/TP2/Desktop/mesajify_ciktilar/blind_test_samples'

  if (!existsSync(samplesDir)) {
    throw new Error(`CRITICAL_TEST_FAILURE: Benchmark directory does not exist: ${samplesDir}`)
  }

  const results: Record<string, any> = {}
  let matchesHumanLabel = 0

  for (const item of groundTruthCatalog) {
    const fullPath = join(samplesDir, item.filename)
    if (!existsSync(fullPath)) {
      throw new Error(`CRITICAL_TEST_FAILURE: Required benchmark fixture file missing: ${item.filename}`)
    }

    const report = engine.evaluateVideo({
      jobId: `bench_${item.filename}`,
      attemptId: 'bench_att',
      rawSha256: 'uncalculated',
      videoPath: fullPath,
    })

    const agreement = report.decision === item.humanLabel
    if (agreement) matchesHumanLabel++

    results[item.filename] = {
      decision: report.decision,
      humanLabel: item.humanLabel,
      agreement,
      findingsCount: report.findings.length,
      sceneTransitionDecision: report.categories.SCENE_TRANSITION?.decision,
      unverifiedPhysicalSupport: report.categories.PHYSICAL_SUPPORT?.decision === 'NOT_VERIFIED'
    }
  }

  console.log('Human Ground Truth Benchmark Results:', JSON.stringify(results, null, 2))
  assert.equal(matchesHumanLabel, 5, 'All 5 human-validated test samples must match ground truth')
})
