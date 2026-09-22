import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LongVideoPlanner } from '../src/planner/long-video-planner.js'
import { StoryboardEngine } from '../src/planner/storyboard-engine.js'
import { createBrandContextSnapshot } from '../src/types/brand-snapshot.js'
import { globalSectorPresetRegistry } from '../src/strategy/sector-presets.js'

test('LongVideoPlanner - generates progressive Master Voice-Over with zero repetition', async () => {
  const snapshot = createBrandContextSnapshot({
    org_id: 'org_test_long',
    brand_name: 'Ayvazoğlu İnşaat',
    sector_profile: 'construction_materials',
    logo_asset_id: 'logo_ayvaz',
    logo_sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    products: [
      {
        product_id: 'prod_brick',
        name: 'Ayvazoğlu Dayanıklı Tuğla',
        description: 'Taşıyıcı ve bölme tuğlası',
        asset_id: 'asset_brick',
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      },
    ],
    campaign: { objective: 'Commercial Trust', cta: 'Fiyat Teklifi İsteyin' },
    requested_duration: 40,
    output_type: 'LONG_VIDEO',
  })

  const preset = globalSectorPresetRegistry.get('construction_materials')
  const planner = new LongVideoPlanner()
  const longPlan = await planner.plan(snapshot, preset)

  assert.equal(longPlan.exactTotalDurationSec, 40)
  assert.equal(longPlan.sceneCount, 5)
  assert.equal(longPlan.masterVoiceOver.segments.length, 5)

  // Verify non-overlapping and NO duplicate sentences
  const seenTexts = new Set<string>()
  for (const seg of longPlan.masterVoiceOver.segments) {
    assert.ok(seg.voiceoverText.length > 10)
    assert.ok(!seenTexts.has(seg.voiceoverText), `Sentence repeated: ${seg.voiceoverText}`)
    seenTexts.add(seg.voiceoverText)
  }
})

test('StoryboardEngine - enforces strict flow_project_id isolation per scene', async () => {
  const snapshot = createBrandContextSnapshot({
    org_id: 'org_test_long',
    brand_name: 'Ayvazoğlu İnşaat',
    sector_profile: 'construction_materials',
    logo_asset_id: 'logo_ayvaz',
    logo_sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    campaign: { objective: 'Commercial Trust', cta: 'Teklif Alın' },
    requested_duration: 35,
    output_type: 'LONG_VIDEO',
  })

  const preset = globalSectorPresetRegistry.get('construction_materials')
  const planner = new LongVideoPlanner()
  const longPlan = await planner.plan(snapshot, preset)

  const parentJobId = 'job_ayvaz_long_12345'
  const engine = new StoryboardEngine()
  const storyboard = await engine.buildStoryboard(parentJobId, longPlan, snapshot, preset)

  assert.equal(storyboard.parentJobId, parentJobId)
  assert.equal(storyboard.scenes.length, longPlan.sceneCount)

  // Verify that EVERY scene has its own unique flowProjectId
  const projectIds = new Set<string>()
  for (const scene of storyboard.scenes) {
    assert.ok(scene.flowProjectId.includes(parentJobId.substring(0, 8)))
    assert.ok(scene.flowProjectId.includes(`_s${scene.order}`))
    assert.ok(!projectIds.has(scene.flowProjectId), `Duplicate flowProjectId across scenes: ${scene.flowProjectId}`)
    projectIds.add(scene.flowProjectId)
  }
})
