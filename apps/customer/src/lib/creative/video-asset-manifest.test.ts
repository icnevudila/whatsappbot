import test from 'node:test'
import assert from 'node:assert/strict'
import type { ResolvedAsset } from './asset-source-resolver'
import { requireDistinctVideoProduct, videoAssetTransportSource } from './video-asset-manifest'

const image = (overrides: Partial<ResolvedAsset> = {}): ResolvedAsset => ({
  data: Buffer.from('decoded-image'), mimeType: 'image/png', sourceType: 'public_brand',
  resolvedUrl: '/brand/logo.png', sha256: 'a'.repeat(64), ...overrides,
})

test('Vercel-local static reference becomes an absolute source for the production worker', () => {
  assert.equal(videoAssetTransportSource(image(), 'https://app.mesajify.com'), 'https://app.mesajify.com/brand/logo.png')
})
test('tenant storage source remains unchanged', () => {
  const url = 'https://storage.example/storage/v1/object/public/creatives/org/product.png'
  assert.equal(videoAssetTransportSource(image({ sourceType: 'storage', resolvedUrl: url }), 'https://app.mesajify.com'), url)
})
test('different URLs carrying identical logo/product bytes fail before a job is published', () => {
  assert.throws(() => requireDistinctVideoProduct(image(), image({ resolvedUrl: 'https://cdn.example/product.png' })), /PRODUCT_REFERENCE_IS_LOGO/)
  assert.doesNotThrow(() => requireDistinctVideoProduct(image(), image({ sha256: 'b'.repeat(64) })))
})
