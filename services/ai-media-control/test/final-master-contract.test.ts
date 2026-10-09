import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { assertFinalMasterContract } from '../src/final-master-contract.js'
import { publishImmutableVideoFile } from '../src/immutable-video-publication.js'

test('customer master requires 8s raw, 10s final, vertical minimum resolution and different hashes', () => {
  const raw = { duration: 8 }, final = { duration: 10, width: 720, height: 1280 }
  const rawSha = 'a'.repeat(64), finalSha = 'b'.repeat(64)
  assert.doesNotThrow(() => assertFinalMasterContract(raw, final, rawSha, finalSha))
  assert.throws(() => assertFinalMasterContract(raw, { ...final, duration: 8 }, rawSha, finalSha), /FINAL_MASTER_DURATION/)
  assert.throws(() => assertFinalMasterContract({ duration: 7 }, final, rawSha, finalSha), /RAW_VEO_DURATION/)
  assert.throws(() => assertFinalMasterContract(raw, { ...final, height: 720 }, rawSha, finalSha), /RESOLUTION/)
  assert.throws(() => assertFinalMasterContract(raw, final, rawSha, rawSha), /IDENTITY/)
})

test('immutable attempt files preserve both raw/final and reject overwriting an existing identity', () => {
  const dir = mkdtempSync(join(tmpdir(), 'video-publication-'))
  try {
    const source = join(dir, 'source.mp4')
    writeFileSync(source, 'attempt-one')
    const first = publishImmutableVideoFile(source, dir, 'job', 'attempt-one', 'finished')
    assert.equal(publishImmutableVideoFile(source, dir, 'job', 'attempt-one', 'finished'), first)
    assert.notEqual(publishImmutableVideoFile(source, dir, 'job', 'attempt-one', 'raw'), first)
    writeFileSync(source, 'attempt-two')
    assert.throws(() => publishImmutableVideoFile(source, dir, 'job', 'attempt-one', 'finished'))
    const second = publishImmutableVideoFile(source, dir, 'job', 'attempt-two', 'finished')
    assert.equal(readFileSync(first, 'utf8'), 'attempt-one')
    assert.equal(readFileSync(second, 'utf8'), 'attempt-two')
    assert.throws(() => publishImmutableVideoFile(source, dir, '../foreign', 'attempt', 'finished'), /IDENTITY/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
