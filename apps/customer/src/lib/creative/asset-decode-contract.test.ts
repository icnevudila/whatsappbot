import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { resolveAssetSource } from './asset-source-resolver'

test('actual pixels, dimensions, MIME and byte hash are required', async () => {
  const bytes = await sharp({ create: { width: 16, height: 12, channels: 3, background: '#00a884' } }).png().toBuffer()
  const original = globalThis.fetch
  globalThis.fetch = async () => new Response(bytes, { headers: { 'content-type': 'image/jpeg' } })
  try {
    const asset = await resolveAssetSource('https://assets.example/incorrect.jpg')
    assert.ok(asset)
    assert.equal(asset.mimeType, 'image/png')
    assert.equal(asset.width, 16)
    assert.equal(asset.height, 12)
    assert.equal(asset.decode, 'success')
    assert.equal(asset.sha256, createHash('sha256').update(bytes).digest('hex'))
  } finally { globalThis.fetch = original }
})

test('image MIME cannot make corrupt bytes a valid reference', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async () => new Response(Buffer.alloc(100, 65), { headers: { 'content-type': 'image/png' } })
  try { assert.equal(await resolveAssetSource('https://assets.example/corrupt.png'), null) }
  finally { globalThis.fetch = original }
})

test('foreign storage namespace is rejected before any network request', async () => {
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { calls++; throw new Error('network must not run') }
  try {
    await assert.rejects(resolveAssetSource('https://storage.example/storage/v1/object/public/creatives/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/product.png', {
      tenantId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    }), /CROSS_ORG_CONTAMINATION/)
    assert.equal(calls, 0)
  } finally { globalThis.fetch = original }
})

test('unconfigured filesystem paths cannot be read as assets', async () => {
  const prior = process.env.MEDIA_ASSET_FILESYSTEM_ROOTS
  delete process.env.MEDIA_ASSET_FILESYSTEM_ROOTS
  try { assert.equal(await resolveAssetSource(process.execPath), null) }
  finally { if (prior === undefined) delete process.env.MEDIA_ASSET_FILESYSTEM_ROOTS; else process.env.MEDIA_ASSET_FILESYSTEM_ROOTS = prior }
})
