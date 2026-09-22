import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ShortVideoPlanner } from '../src/planner/short-video-planner.js'
import { ReferenceRegistry } from '../src/types/reference-registry.js'
import { createBrandContextSnapshot } from '../src/types/brand-snapshot.js'
import type { FlowAccountCapabilities } from '../src/adapters/interfaces.js'

test('ShortVideoPlanner - builds creative plan and expected references within capability limits', async () => {
  const snapshot = createBrandContextSnapshot({
    org_id: 'org_test_short',
    brand_name: 'Bofe Tarım',
    sector_profile: 'agriculture_farming',
    logo_asset_id: 'asset_logo_bofe',
    logo_sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    logo_file_path: '/assets/bofe_logo.png',
    products: [
      {
        product_id: 'prod_bofe_pump',
        name: 'Bofe 16L Akülü Sırt Pompası',
        description: 'Tarım ilaçlama pompası',
        asset_id: 'asset_prod_pump',
        sha256: 'c1d2e3f4a5b60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
        file_path: '/assets/pump.jpg',
      },
    ],
    campaign: { objective: 'Sales', cta: 'Hemen Sipariş Verin' },
    requested_duration: 8,
    output_type: 'SHORT_VIDEO',
  })

  const registry = new ReferenceRegistry(snapshot.org_id)
  registry.register({
    handle: '@HeroProduct',
    asset_id: 'asset_prod_pump',
    org_id: snapshot.org_id,
    sha256: 'c1d2e3f4a5b60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    role: 'product',
    usage_rules: { prohibitedMutations: [], prominence: 'hero', fidelityRequired: true },
    file_path: '/assets/pump.jpg',
  })
  registry.register({
    handle: '@BrandLogo',
    asset_id: 'asset_logo_bofe',
    org_id: snapshot.org_id,
    sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    role: 'logo',
    usage_rules: { prohibitedMutations: [], prominence: 'overlay', fidelityRequired: true },
    file_path: '/assets/bofe_logo.png',
  })

  const capabilities: FlowAccountCapabilities = {
    accountId: 'account-01',
    supportsR2V: true,
    maxReferenceImages: 2, // Allows 2 references
    supportsI2V: true,
    supportsExtend: false,
    supportsMovieScene: false,
    supportsChain: false,
    supportsStartEndFrames: false,
    preferredModel: 'veo-fast',
  }

  const planner = new ShortVideoPlanner()
  const plan = await planner.plan(snapshot, registry, capabilities, 'F1_FIDELITY_R2V')

  assert.equal(plan.strategy, 'F1_FIDELITY_R2V')
  assert.equal(plan.expectedReferenceIds.length, 2)
  assert.ok(plan.expectedReferenceIds.includes('asset_prod_pump'))
  assert.ok(plan.expectedReferenceIds.includes('asset_logo_bofe'))
  assert.ok(plan.compiledPrompt.length > 0)
  assert.ok(plan.finishingPlan.verified)
})

test('ShortVideoPlanner - verifyReferenceExecutionGate enforces expected vs actual attached references', () => {
  // Pass case: exact match
  const passResult = ShortVideoPlanner.verifyReferenceExecutionGate(
    ['asset_ref_1', 'asset_ref_2'],
    ['asset_ref_2', 'asset_ref_1']
  )
  assert.equal(passResult.passed, true)

  // Fail case: count mismatch
  const failCount = ShortVideoPlanner.verifyReferenceExecutionGate(
    ['asset_ref_1', 'asset_ref_2'],
    ['asset_ref_1']
  )
  assert.equal(failCount.passed, false)
  assert.ok(failCount.error?.includes('REFERENCE_MISMATCH_ERROR'))

  // Fail case: content mismatch
  const failMismatch = ShortVideoPlanner.verifyReferenceExecutionGate(
    ['asset_ref_1', 'asset_ref_2'],
    ['asset_ref_1', 'asset_foreign_id']
  )
  assert.equal(failMismatch.passed, false)
  assert.ok(failMismatch.error?.includes('REFERENCE_INTEGRITY_ERROR'))
})
