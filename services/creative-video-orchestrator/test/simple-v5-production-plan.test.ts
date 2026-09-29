import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSimpleV5ProductionPlan, SimpleV5BriefNormalizer, createBrandContextSnapshot } from '../src/index.js'

function fixture(subtitles: 'auto' | 'off' = 'off') {
  return createBrandContextSnapshot({
    org_id: 'org-plan',
    brand_name: 'Plan Marka',
    sector_profile: 'construction_materials',
    logo_asset_id: 'logo-plan',
    logo_sha256: 'a'.repeat(64),
    products: [{
      product_id: 'product-plan',
      name: 'Plan Tuğla',
      description: 'Yapı tuğlası',
      asset_id: 'asset-plan',
      sha256: 'b'.repeat(64),
    }],
    reference_assets: [{ asset_id: 'environment-plan', role: 'environment', sha256: 'c'.repeat(64) }],
    campaign: { objective: 'Tanıtım', cta: 'İnceleyin', subtitles },
    requested_duration: 8,
    aspect_ratio: '9:16',
  })
}

test('SIMPLE_V5 production plan is deterministic and captures canonical references', () => {
  const snapshot = fixture('off')
  const { brief, shotPlan } = SimpleV5BriefNormalizer.normalize(snapshot)
  const plan = buildSimpleV5ProductionPlan(snapshot, brief, shotPlan)

  assert.equal(plan.plan_version, 'simple-v5-production-plan.v1')
  assert.equal(plan.duration_seconds, 8)
  assert.equal(plan.aspect_ratio, '9:16')
  assert.equal(plan.subtitles.mode, 'off')
  assert.equal(plan.timeline.outro_start_sec, 6)
  assert.equal(plan.timeline.outro_end_sec, 8)
  assert.equal(plan.speech.allow_paraphrase, false)
  assert.deepEqual(plan.reference_assets.map(asset => asset.asset_id), ['logo-plan', 'asset-plan', 'environment-plan'])
})

test('SIMPLE_V5 production plan follows explicit subtitle selection', () => {
  const snapshot = fixture('auto')
  const { brief, shotPlan } = SimpleV5BriefNormalizer.normalize(snapshot)
  const plan = buildSimpleV5ProductionPlan(snapshot, brief, shotPlan)
  assert.equal(plan.subtitles.mode, 'auto')
})
