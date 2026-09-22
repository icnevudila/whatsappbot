import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CreativeQA } from '../src/qa/creative-qa.js'
import { createBrandContextSnapshot } from '../src/types/brand-snapshot.js'

test('CreativeQA - evaluateSceneQA passes on valid scene output', () => {
  const snapshot = createBrandContextSnapshot({
    org_id: 'org_bofe',
    brand_name: 'Bofe Tarım',
    sector_profile: 'agriculture_farming',
    logo_asset_id: 'logo_bofe',
    logo_sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    forbidden_elements: ['car', 'pressure washer'],
    campaign: { objective: 'Sales', cta: 'Sipariş Ver' },
    requested_duration: 8,
  })

  const report = CreativeQA.evaluateSceneQA(
    {
      sceneId: 'scene_1',
      orgId: 'org_bofe',
      outputFilePath: '/outputs/org_bofe/scene_1.mp4',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      ffprobe: {
        duration: 8.05,
        width: 1080,
        height: 1920,
        fps: 24,
        vcodec: 'h264',
        acodec: 'aac',
      },
      targetDurationSec: 8,
      expectedReferenceIds: ['asset_1'],
      actualAttachedReferenceIds: ['asset_1'],
      detectedTextInFrames: ['Bofe Tarım'],
    },
    snapshot
  )

  assert.equal(report.passed, true)
  assert.equal(report.errors.length, 0)
  assert.equal(report.technicalOk, true)
  assert.equal(report.assetOk, true)
  assert.equal(report.visualOk, true)
  assert.equal(report.textOk, true)
})

test('CreativeQA - evaluateSceneQA fails-closed on tenant breach or foreign brand leakage', () => {
  const snapshot = createBrandContextSnapshot({
    org_id: 'org_bofe',
    brand_name: 'Bofe Tarım',
    sector_profile: 'agriculture_farming',
    logo_asset_id: 'logo_bofe',
    logo_sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    forbidden_elements: ['car'],
    campaign: { objective: 'Sales', cta: 'Sipariş Ver' },
  })

  // 1. Foreign brand leakage in OCR text
  const reportLeakage = CreativeQA.evaluateSceneQA(
    {
      sceneId: 'scene_1',
      orgId: 'org_bofe',
      outputFilePath: '/outputs/org_bofe/scene_1.mp4',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      ffprobe: { duration: 8.0, width: 1080, height: 1920, fps: 24, vcodec: 'h264', acodec: 'aac' },
      targetDurationSec: 8,
      expectedReferenceIds: ['asset_1'],
      actualAttachedReferenceIds: ['asset_1'],
      detectedTextInFrames: ['Ayvazoğlu Tuğla'], // Foreign brand detected!
    },
    snapshot
  )

  assert.equal(reportLeakage.passed, false)
  assert.equal(reportLeakage.textOk, false)
  assert.ok(reportLeakage.errors.some(e => e.includes('FOREIGN_BRAND_LEAKAGE')))

  // 2. Tenant ID mismatch
  const reportTenant = CreativeQA.evaluateSceneQA(
    {
      sceneId: 'scene_1',
      orgId: 'org_foreign_tenant',
      outputFilePath: '/outputs/scene_1.mp4',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      ffprobe: { duration: 8.0, width: 1080, height: 1920, fps: 24, vcodec: 'h264', acodec: 'aac' },
      targetDurationSec: 8,
      expectedReferenceIds: [],
      actualAttachedReferenceIds: [],
    },
    snapshot
  )

  assert.equal(reportTenant.passed, false)
  assert.equal(reportTenant.assetOk, false)
  assert.ok(reportTenant.errors.some(e => e.includes('TENANT_BREACH')))
})

test('CreativeQA - evaluateFinalLongVideoQA catches duration mismatch, VO repetition, or missing logo', () => {
  const snapshot = createBrandContextSnapshot({
    org_id: 'org_ayvaz',
    brand_name: 'Ayvazoğlu İnşaat',
    sector_profile: 'construction_materials',
    logo_asset_id: 'logo_ayvaz',
    logo_sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    campaign: { objective: 'Sales', cta: 'Teklif Alın' },
    requested_duration: 40,
  })

  // 1. VO Repetition failure
  const reportVoRepetition = CreativeQA.evaluateFinalLongVideoQA(
    {
      jobId: 'job_1',
      orgId: 'org_ayvaz',
      finalFilePath: '/outputs/final.mp4',
      finalSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      ffprobe: { duration: 40.0, width: 1080, height: 1920, fps: 24, vcodec: 'h264', acodec: 'aac' },
      requestedTotalDurationSec: 40,
      expectedSceneOrder: ['s1', 's2', 's3'],
      actualSceneOrder: ['s1', 's2', 's3'],
      sceneVoSentences: [
        'Kaliteli tuğla sağlam yapıdır.',
        'Kaliteli tuğla sağlam yapıdır.', // Duplicate VO sentence!
        'Hemen teklif alın.',
      ],
      exactLogoVerified: true,
      exactCtaVerified: true,
    },
    snapshot
  )

  assert.equal(reportVoRepetition.passed, false)
  assert.equal(reportVoRepetition.audioVoSyncOk, false)
  assert.ok(reportVoRepetition.errors.some(e => e.includes('FINAL_VO_REPETITION')))

  // 2. Missing Exact Logo failure
  const reportMissingLogo = CreativeQA.evaluateFinalLongVideoQA(
    {
      jobId: 'job_1',
      orgId: 'org_ayvaz',
      finalFilePath: '/outputs/final.mp4',
      finalSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      ffprobe: { duration: 40.0, width: 1080, height: 1920, fps: 24, vcodec: 'h264', acodec: 'aac' },
      requestedTotalDurationSec: 40,
      expectedSceneOrder: ['s1', 's2'],
      actualSceneOrder: ['s1', 's2'],
      sceneVoSentences: ['Cümle 1', 'Cümle 2'],
      exactLogoVerified: false, // Logo missing!
      exactCtaVerified: true,
    },
    snapshot
  )

  assert.equal(reportMissingLogo.passed, false)
  assert.equal(reportMissingLogo.brandingOk, false)
  assert.ok(reportMissingLogo.errors.some(e => e.includes('FINAL_BRANDING_MISSING')))
})
