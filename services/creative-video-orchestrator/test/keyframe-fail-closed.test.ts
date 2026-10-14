import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { RealImageGenerationProvider } from '../src/adapters/real-adapters.js'

test('real keyframe provider cannot publish a synthetic success on failure, or omit tenant/reference identity', async () => {
  const originalFetch = globalThis.fetch
  const oldDirectory = process.env.SHARED_OUTPUTS_DIR
  const root = mkdtempSync(join(tmpdir(), 'keyframe-audit-'))
  process.env.SHARED_OUTPUTS_DIR = root
  const provider = new RealImageGenerationProvider('https://fixture.invalid')
  const options = { aspectRatio: '9:16', tenantId: 'tenant-a' }
  let calls = 0
  try {
    globalThis.fetch = async () => { calls++; throw new Error('offline') }
    await assert.rejects(provider.generateKeyframe('Neutral fixture', [], { aspectRatio: '9:16' }), /KEYFRAME_TENANT_REQUIRED/)
    assert.equal(calls, 0)
    await assert.rejects(provider.generateKeyframe('Neutral fixture', [], options), /KEYFRAME_GENERATION_FAILED/)
    assert.deepEqual(readdirSync(root), [])
    globalThis.fetch = async () => Response.json({ data: [{ b64_json: Buffer.from('KEYFRAME:fake-success').toString('base64') }] })
    await assert.rejects(provider.generateKeyframe('Neutral fixture', [], options), /KEYFRAME_GENERATION_FAILED/)
    assert.deepEqual(readdirSync(root), [])
    const asset = join(root, 'product.png')
    const bytes = Buffer.from('89504e470d0a1a0a' + '00'.repeat(40), 'hex')
    writeFileSync(asset, bytes)
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    calls = 0
    globalThis.fetch = async (_url, init) => {
      calls++
      const body = JSON.parse(String(init?.body))
      assert.equal(body.tenant_id, 'tenant-a')
      assert.equal(body.expected_reference_count, 1)
      assert.equal(body.referenceImages[0].sha256, sha256)
      assert.equal(body.referenceImages[0].data, bytes.toString('base64'))
      return new Response('', { status: 503 })
    }
    await assert.rejects(provider.generateKeyframe('Neutral fixture', [{ role: 'product', filePath: asset, sha256: '0'.repeat(64) }], options), /KEYFRAME_REFERENCE_SHA_MISMATCH/)
    assert.equal(calls, 0)
    await assert.rejects(provider.generateKeyframe('Neutral fixture', [{ role: 'product', filePath: asset, sha256 }], options), /KEYFRAME_GENERATION_FAILED/)
    assert.equal(calls, 1)
    assert.deepEqual(readdirSync(root), ['product.png'])
  } finally {
    globalThis.fetch = originalFetch
    if (oldDirectory === undefined) delete process.env.SHARED_OUTPUTS_DIR
    else process.env.SHARED_OUTPUTS_DIR = oldDirectory
    rmSync(root, { recursive: true, force: true })
  }
})
