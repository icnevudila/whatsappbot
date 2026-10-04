import test from 'node:test'
import assert from 'node:assert/strict'
import { sqlFilterColumn, sqlScalarOr } from '../src/db-filter.js'
test('JSON text paths are quoted as keys, not unbound SQL identifiers', () => {
  assert.equal(sqlFilterColumn('metadata->>video_submission_ready'),"metadata->>'video_submission_ready'")
  assert.equal(sqlFilterColumn('org_id'),'org_id')
  assert.throws(()=>sqlFilterColumn('id;DROP TABLE jobs'),/INVALID/)
})
test('publication OR is parameterized and retains legacy missing-field compatibility', () => {
  const params: unknown[] = ['PENDING']
  assert.equal(sqlScalarOr('metadata->>video_submission_ready.is.null,metadata->>video_submission_ready.eq.true',params),
    "(metadata->>'video_submission_ready' IS NULL OR metadata->>'video_submission_ready' = $2)")
  assert.deepEqual(params,['PENDING','true'])
  assert.throws(()=>sqlScalarOr('id.eq.true);DROP TABLE jobs',[]),/UNSUPPORTED/)
})
