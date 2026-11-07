import test from 'node:test'
import assert from 'node:assert/strict'
import { parseJobScope, scopeJobQuery } from '../src/job-scope.js'

test('unset release scope retains normal scheduling; empty/malformed scope fails closed',()=>{
  assert.equal(parseJobScope(undefined),null)
  for(const raw of ['',',','all','id;DROP TABLE']) assert.throws(()=>parseJobScope(raw),/INVALID_AI_MEDIA_JOB_ALLOWLIST/)
})
test('release scope selects exact identities and cannot include an old pending job',()=>{
  const id='8aade834-2aed-545b-a77b-e4a91b2b2a55'
  const previous=process.env.AI_MEDIA_JOB_ALLOWLIST
  process.env.AI_MEDIA_JOB_ALLOWLIST=` ${id},${id} `
  try {
    let filter:unknown
    const query={in(column:string,ids:string[]){filter={column,ids};return this}}
    assert.equal(scopeJobQuery(query),query)
    assert.deepEqual(filter,{column:'id',ids:[id]})
  } finally {if(previous===undefined) delete process.env.AI_MEDIA_JOB_ALLOWLIST;else process.env.AI_MEDIA_JOB_ALLOWLIST=previous}
})
