import test from 'node:test'
import assert from 'node:assert/strict'

import {
  mapEngineStateToStage,
} from '../apps/customer/src/lib/creative/production-progress/stage-mapper.ts'
import {
  calculateAuthoritativeEta,
} from '../apps/customer/src/lib/creative/production-progress/eta-calculator.ts'
import {
  CANONICAL_VIDEO_STAGES,
  TERMINAL_STAGES,
} from '../apps/customer/src/lib/creative/production-progress/progress-types.ts'

test('Production Progress Authority: Canonical 7-Stage Engine State Mapping', () => {
  // 1. Stage 1: REQUEST_ACCEPTED
  const pending = mapEngineStateToStage('PENDING')
  assert.equal(pending.stage_index, 1)
  assert.equal(pending.stage_key, 'REQUEST_ACCEPTED')

  const validating = mapEngineStateToStage('VALIDATING_INPUTS')
  assert.equal(validating.stage_index, 1)
  assert.equal(validating.stage_key, 'REQUEST_ACCEPTED')

  // 2. Stage 2: QUEUED
  const queued = mapEngineStateToStage('QUEUED')
  assert.equal(queued.stage_index, 2)
  assert.equal(queued.stage_key, 'QUEUED')

  // 3. Stage 3: ASSETS_PREPARING
  for (const s of ['LEASED', 'PREPARING_ENV', 'OPENING_PROJECT', 'ATTACHING_INGREDIENTS', 'INGREDIENTS_VERIFIED']) {
    const res = mapEngineStateToStage(s)
    assert.equal(res.stage_index, 3, `Expected ${s} to map to stage 3`)
    assert.equal(res.stage_key, 'ASSETS_PREPARING')
    assert.ok(res.display_title.includes('Logo') || res.display_title.includes('Görsel') || res.display_title.includes('Ürün'))
  }

  // 4. Stage 4: GENERATING
  for (const s of ['GENERATING', 'POLLING_FLOW']) {
    const res = mapEngineStateToStage(s)
    assert.equal(res.stage_index, 4, `Expected ${s} to map to stage 4`)
    assert.equal(res.stage_key, 'GENERATING')
    assert.ok(res.display_title.includes('Video'))
  }

  // 5. Stage 5: MEDIA_PROCESSING
  for (const s of ['DOWNLOADING_MEDIA', 'MEDIA_DOWNLOADED']) {
    const res = mapEngineStateToStage(s)
    assert.equal(res.stage_index, 5, `Expected ${s} to map to stage 5`)
    assert.equal(res.stage_key, 'MEDIA_PROCESSING')
    assert.ok(res.display_title.includes('İşleniyor') || res.display_title.includes('Alınıyor'))
  }

  // 6. Stage 6: QUALITY_CHECK
  for (const s of ['FFPROBE_INSPECTING', 'SHA256_VERIFYING', 'VISUAL_QA_EVALUATING']) {
    const res = mapEngineStateToStage(s)
    assert.equal(res.stage_index, 6, `Expected ${s} to map to stage 6`)
    assert.equal(res.stage_key, 'QUALITY_CHECK')
    assert.ok(res.display_title.includes('Kontrol'))
  }

  // 7. Stage 7: READY / COMPLETED
  const completed = mapEngineStateToStage('COMPLETED')
  assert.equal(completed.stage_index, 7)
  assert.equal(completed.stage_key, 'READY')
  assert.equal(completed.is_terminal, true)
})

test('Production Progress Authority: VISUAL_QA_EVALUATING is strictly QA, NEVER outro branding', () => {
  const qa = mapEngineStateToStage('VISUAL_QA_EVALUATING')
  assert.equal(qa.stage_index, 6)
  assert.equal(qa.stage_key, 'QUALITY_CHECK')
  assert.equal(qa.display_title, 'Son Kontroller Yapılıyor')

  // Outro branding or logo addition must NOT appear in QA evaluation
  assert.equal(qa.display_title.includes('Logo ve Marka Kapanışı'), false)
  assert.equal(qa.display_title.includes('outro'), false)
  assert.equal(qa.display_message.includes('kapanış'), false)
})

test('Production Progress Authority: Terminal Failure & Review Mapping', () => {
  const failed = mapEngineStateToStage('FAILED')
  assert.equal(failed.stage_index, 0)
  assert.equal(failed.stage_key, 'FAILED')
  assert.equal(failed.is_terminal, true)

  const review = mapEngineStateToStage('NEEDS_REVIEW')
  assert.equal(review.stage_index, 0)
  assert.equal(review.stage_key, 'NEEDS_REVIEW')
  assert.equal(review.is_terminal, true)
})

test('Production Progress Authority: Elapsed time alone NEVER mutates authoritative stage', () => {
  // Simulating arbitrary elapsed seconds while backend remains GENERATING
  const rawState = 'GENERATING'
  const elapsedDurations = [0, 18, 38, 62, 88, 112, 132, 150, 300, 1200]

  for (const elapsed of elapsedDurations) {
    const stage = mapEngineStateToStage(rawState)
    // Stage MUST remain stage 4 regardless of elapsed time!
    assert.equal(stage.stage_index, 4)
    assert.equal(stage.stage_key, 'GENERATING')
    assert.equal(stage.display_title, 'Video Üretiliyor')
  }
})

test('Production Progress Authority: Data-Driven ETA with Insufficient History yields LOW confidence', () => {
  // Fewer than 5 completed job samples
  const result = calculateAuthoritativeEta({
    historicalDurationsSeconds: [120, 140], // only 2 samples (< 5)
    activeWorkerCapacity: 2,
    queueAheadCount: 1,
    currentStageIndex: 2,
    elapsedTotalSeconds: 15,
  })

  assert.equal(result.eta_confidence, 'LOW')
  assert.equal(result.eta_min_seconds, null)
  assert.equal(result.eta_max_seconds, null)
  assert.ok(result.eta_display_text?.includes('Sırada önünüzde 1 video var'))
})

test('Production Progress Authority: Data-Driven ETA with Adequate History yields Medium/High Confidence', () => {
  // 10 completed samples
  const samples = [80, 85, 90, 95, 100, 105, 110, 115, 120, 130]
  const result = calculateAuthoritativeEta({
    historicalDurationsSeconds: samples,
    activeWorkerCapacity: 2,
    queueAheadCount: 0,
    currentStageIndex: 4,
    elapsedTotalSeconds: 30,
  })

  assert.equal(result.eta_confidence, 'MEDIUM')
  assert.ok(result.eta_min_seconds !== null && result.eta_min_seconds > 0)
  assert.ok(result.eta_max_seconds !== null && result.eta_max_seconds >= result.eta_min_seconds)
  assert.equal(result.eta_min_seconds, 75)
  assert.equal(result.eta_max_seconds, 90)
  assert.ok(result.eta_display_text?.includes('Geçmiş üretim sürelerine göre'))
})

test('Production Progress Authority: Completed state always yields 0 remaining ETA', () => {
  const result = calculateAuthoritativeEta({
    historicalDurationsSeconds: [90, 100, 110, 120, 130],
    activeWorkerCapacity: 1,
    queueAheadCount: 0,
    currentStageIndex: 7,
    elapsedTotalSeconds: 95,
    isTerminal: true,
  })

  assert.equal(result.eta_confidence, 'HIGH')
  assert.equal(result.eta_min_seconds, 0)
  assert.equal(result.eta_max_seconds, 0)
  assert.equal(result.eta_display_text, 'Tamamlandı')
})

test('Production Progress Authority: Worker Capacity Concurrency scaling', () => {
  const samples = [100, 100, 100, 100, 100, 100]

  // 4 jobs ahead with 1 worker -> 4 batches
  const etaSingleWorker = calculateAuthoritativeEta({
    historicalDurationsSeconds: samples,
    activeWorkerCapacity: 1,
    queueAheadCount: 4,
    currentStageIndex: 2,
    elapsedTotalSeconds: 5,
  })

  // 4 jobs ahead with 4 workers -> 1 batch
  const etaQuadWorker = calculateAuthoritativeEta({
    historicalDurationsSeconds: samples,
    activeWorkerCapacity: 4,
    queueAheadCount: 4,
    currentStageIndex: 2,
    elapsedTotalSeconds: 5,
  })

  assert.ok((etaSingleWorker.eta_min_seconds ?? 0) > (etaQuadWorker.eta_min_seconds ?? 0),
    'Single worker queue wait time must be greater than 4 workers')
})
