import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { loadFinishingCheckpoint } from '../src/finishing-checkpoint.js'

test('processing checkpoint requires the same tenant, locked speech, references and actual bytes', async () => {
  const base = mkdtempSync(join(tmpdir(), 'finishing-checkpoint-'))
  try {
    const dir = join(base, 'job', 'attempt'); mkdirSync(dir, { recursive: true })
    const path = join(dir, 'raw.mp4'); const bytes = Buffer.alloc(2048, 17); writeFileSync(path, bytes)
    const hash = createHash('sha256').update(bytes).digest('hex')
    const brief = { spokenScript: 'Onaylı Türkçe metin', heroProductSha: 'product', heroProductId: 'owned', aspectRatio: '9:16', durationSeconds: 8 }
    const assets = [{ role: 'logo', sha256: 'logo' }, { role: 'product', sha256: 'product' }]
    const record = { id: 'attempt', org_id: 'tenant', job_id: 'job', metadata: {
      diagnostics: { common_plan: { brief: { ...brief } } }, finishing_checkpoint_assets: assets,
      provider_attempt_history: [{ outputPath: path, rawOutputSha256: hash, combinedReview: { decision: 'PASS' } }],
    } }
    const filters: any[] = []
    const query: any = { select() { return this }, eq(...args: any[]) { filters.push(args); return this }, order() { return this }, limit() { return this }, async maybeSingle() { return { data: record } } }
    const db = { from() { return query } }
    const job = { id: 'job', org_id: 'tenant', retry_count: 1, raw_output_sha256: hash }
    assert.equal((await loadFinishingCheckpoint(db, job, brief, assets, base))?.sourceAttemptId, 'attempt')
    assert.ok(filters.some(item => item[0] === 'org_id' && item[1] === 'tenant'))
    assert.equal(await loadFinishingCheckpoint(db, { ...job, retry_count: 0 }, brief, assets, base), null)
    await assert.rejects(loadFinishingCheckpoint(db, { ...job, org_id: 'foreign' }, brief, assets, base), /CHECKPOINT_INVALID/)
    await assert.rejects(loadFinishingCheckpoint(db, job, { ...brief, spokenScript: 'Changed' }, assets, base), /CHECKPOINT_INVALID/)
    await assert.rejects(loadFinishingCheckpoint(db, job, brief, [{ role: 'logo', sha256: 'wrong' }], base), /CHECKPOINT_INVALID/)
    writeFileSync(path, Buffer.alloc(2048, 18))
    await assert.rejects(loadFinishingCheckpoint(db, job, brief, assets, base), /CHECKPOINT_INVALID/)
    writeFileSync(path, bytes)
    const outside = join(base, 'outside.mp4'); writeFileSync(outside, bytes)
    record.metadata.provider_attempt_history[0].outputPath = outside
    await assert.rejects(loadFinishingCheckpoint(db, job, brief, assets, base), /CHECKPOINT_INVALID/)
  } finally { rmSync(base, { recursive: true, force: true }) }
})
