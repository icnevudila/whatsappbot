import assert from 'node:assert/strict'
import { test } from 'node:test'
import { RealHttpGFlowProvider } from '../src/adapters/real-adapters.js'

const request = {
  job_id: 'job_1',
  attempt_id: 'attempt_1',
  flow_project_id: 'flow_proj_job_1_short',
  org_id: 'org_1',
  account_id: 'account_1',
  prompt: 'approved prompt',
  aspect_ratio: '9:16' as const,
  model: 'veo-fast',
  duration: 8,
  expected_reference_ids: ['asset_product'],
  assets: [{ asset_id: 'asset_product', org_id: 'org_1', role: 'product', file_path: '/tmp/product.png', sha256: 'a'.repeat(64) }],
}

test('RealHttpGFlowProvider fails closed when Flow omits attachment evidence', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({
    real_flow_project_uuid: '8c4a79f4-8a41-4e37-b65d-1e088c79b951',
    verified_assets: [],
    output_path: '/tmp/output.mp4',
  }), { status: 200 })

  try {
    const provider = new RealHttpGFlowProvider('http://test.invalid')
    await assert.rejects(provider.executeJob(request), /GPT_ASSET_ATTACHMENT_FAILED/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('RealHttpGFlowProvider rejects a Flow attachment with an asset SHA drift', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({
    real_flow_project_uuid: '8c4a79f4-8a41-4e37-b65d-1e088c79b951',
    verified_assets: [{
      asset_id: 'asset_product', org_id: 'org_1', role: 'product',
      sha256: 'b'.repeat(64), attached_media_id: 'media_123',
    }],
    output_path: '/tmp/output.mp4',
  }), { status: 200 })

  try {
    const provider = new RealHttpGFlowProvider('http://test.invalid')
    await assert.rejects(provider.executeJob(request), /CREATIVE_ASSET_DRIFT/)
  } finally {
    globalThis.fetch = originalFetch
  }
})
