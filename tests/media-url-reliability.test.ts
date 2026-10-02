import test from 'node:test'
import assert from 'node:assert/strict'
import { getSafeMediaUrl } from '../apps/customer/src/lib/media-url'

test('legacy HTTP output becomes usable HTTPS without changing the filename', () => {
  assert.equal(getSafeMediaUrl('http://167.233.201.31:3456/outputs/img_job_old.png'),'https://media.167.233.201.31.nip.io/outputs/img_job_old.png')
  assert.equal(getSafeMediaUrl('/outputs/afiş%20bir.png'),'https://media.167.233.201.31.nip.io/outputs/afi%C5%9F%20bir.png')
})
test('tenant-scoped and external storage URLs are never rewritten to another source', () => {
  for (const url of ['/api/ai-media/outputs/authorized-id?thumb=1','https://storage.example/outputs/product.png','https://storage.example/storage/v1/object/public/org-a/a.png']) assert.equal(getSafeMediaUrl(url),url)
})
test('malformed or nested output paths do not become file proxy requests', () => {
  for (const url of ['/outputs/a/b.png','/outputs/a%2Fb.png','/outputs/%ZZ.png']) assert.equal(getSafeMediaUrl(url),url)
  assert.equal(getSafeMediaUrl(null),undefined)
})
