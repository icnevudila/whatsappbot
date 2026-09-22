import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CreativeVideoOrchestrator } from '../src/orchestrator.js'
import {
  MockGFlowProvider,
  MockFFmpegAdapter,
  MockCreativeModelProvider,
  MockImageGenerationProvider,
} from '../src/adapters/mock-providers.js'
import { ReferenceRegistry } from '../src/types/reference-registry.js'
import { ShortVideoPlanner } from '../src/planner/short-video-planner.js'
import type { RawBrandInput } from '../src/types/brand-snapshot.js'

test('Fail-Closed Gate: Foreign tenant asset is rejected by ReferenceRegistry', () => {
  const registry = new ReferenceRegistry('org_tenant_a')
  assert.throws(
    () => {
      registry.register({
        handle: '@BrandLogo',
        asset_id: 'asset_foreign',
        org_id: 'org_tenant_b', // WRONG TENANT
        sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        role: 'logo',
        usage_rules: { prohibitedMutations: [], prominence: 'overlay', fidelityRequired: true },
      })
    },
    (err: any) => {
      assert.ok(err.message.includes('SECURITY_VIOLATION'))
      return true
    }
  )
})

test('Fail-Closed Gate: Reference gate fails on missing or mismatched asset count', () => {
  const result = ShortVideoPlanner.verifyReferenceExecutionGate(
    ['asset_1', 'asset_2'],
    ['asset_1'] // Missing 1 asset
  )
  assert.equal(result.passed, false)
  assert.ok(result.error?.includes('REFERENCE_MISMATCH_ERROR'))
})

test('Fail-Closed Gate: Reference gate fails on asset ID mismatch', () => {
  const result = ShortVideoPlanner.verifyReferenceExecutionGate(
    ['asset_1', 'asset_2'],
    ['asset_1', 'asset_impostor'] // Impostor asset
  )
  assert.equal(result.passed, false)
  assert.ok(result.error?.includes('REFERENCE_INTEGRITY_ERROR'))
})

test('Fail-Closed Gate: Project reuse across different scenes triggers PROJECT_REUSE_VIOLATION', async () => {
  // Setup a mock GFlow provider that illegally returns the SAME Flow project UUID for multiple scenes
  class ReusingGFlowProvider extends MockGFlowProvider {
    async executeJob(req: any) {
      const res = await super.executeJob(req)
      res.flow_project_id = 'flow_static_reused_uuid_12345'
      return res
    }
  }

  const orchestrator = new CreativeVideoOrchestrator({
    gflowProvider: new ReusingGFlowProvider(),
    ffmpegAdapter: new MockFFmpegAdapter(),
    creativeModel: new MockCreativeModelProvider(),
    imageProvider: new MockImageGenerationProvider(),
  })

  const longInput: RawBrandInput = {
    org_id: 'org_ayvazoglu',
    brand_name: 'Ayvazoğlu İnşaat',
    sector_profile: 'construction_materials',
    brand_description: 'Tuğla ve yapı malzemeleri',
    brand_palette: { primary: '#D32F2F', accent: '#FF9800' },
    typography: { headingFont: 'Roboto', primaryColor: '#FFFFFF' },
    tone_of_voice: ['solid', 'industrial'],
    visual_style: ['brick factory at dawn'],
    logo_asset_id: 'logo_ayvaz',
    logo_sha256: '5d4fdea186ab57d962cdad0713e915f1d52931aa67f4a193e6aa7fe33d852f04',
    products: [
      {
        product_id: 'prod_brick',
        name: 'Kırmızı Kil Tuğla',
        description: 'Taşıyıcı tuğla',
        asset_id: 'asset_brick',
        sha256: 'de3e1167239923f47c193128958965bf305606fba7a4a967208616f34386512c',
      },
    ],
    campaign: {
      objective: 'Commercial brand film',
      offer: 'Standard',
      cta: 'Bize Ulaşın',
      target_audience: 'Contractors',
    },
    aspect_ratio: '9:16',
    requested_duration: 35, // Routes to LONG_VIDEO (>15s)
  }

  await assert.rejects(
    async () => {
      await orchestrator.executeCreativeJob('job_test_reuse', longInput)
    },
    (err: any) => {
      assert.ok(err.message.includes('PROJECT_REUSE_VIOLATION'))
      return true
    }
  )
})
