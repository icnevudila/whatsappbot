import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { persistedVideoUrl, verifiedVideoResponse } from './video-delivery'

test('delivery uses persisted nested final path and rejects traversal or guessed identities', () => {
  assert.equal(persistedVideoUrl('/shared/outputs/org/job/attempt/final.mp4', 'https://gateway.example'), 'https://gateway.example/outputs/org/job/attempt/final.mp4')
  assert.equal(persistedVideoUrl('/shared/outputs/job_finished.mp4', 'https://gateway.example/'), 'https://gateway.example/outputs/job_finished.mp4')
  for (const path of ['', '../other.mp4', '/shared/outputs/org/../other.mp4', 'job.mp4?raw=1', 'job\\other.mp4']) {
    assert.equal(persistedVideoUrl(path, 'https://gateway.example'), null)
  }
})

test('entire file SHA and byte count required even for a byte-range request', async () => {
  const bytes = Buffer.from('canonical final video')
  const evidence = { sha256: createHash('sha256').update(bytes).digest('hex'), byte_size: bytes.length }
  assert.equal(verifiedVideoResponse(bytes, evidence).status, 200)
  const range = verifiedVideoResponse(bytes, evidence, 'bytes=2-5')
  assert.equal(range.status, 206)
  assert.equal(await range.text(), 'noni')
  assert.equal(await verifiedVideoResponse(bytes, evidence, 'bytes=-5').text(), 'video')
  assert.equal(verifiedVideoResponse(bytes, evidence, 'bytes=999-').status, 416)
  assert.equal(verifiedVideoResponse(Buffer.from('tampered'), evidence, 'bytes=0-1').status, 502)
  assert.equal(verifiedVideoResponse(bytes, { ...evidence, sha256: '0'.repeat(64) }).status, 502)
  assert.equal(verifiedVideoResponse(bytes, { ...evidence, byte_size: bytes.length + 1 }).status, 502)
})
