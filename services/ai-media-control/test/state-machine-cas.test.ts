import test from 'node:test'
import assert from 'node:assert/strict'
import { JobState, transitionJob } from '../src/state-machine.js'
import { leaseJob } from '../src/queue.js'
function fixture(data: boolean | null, error: any = null) {
  const operations: any[] = []
  return { operations, db: { async rpc(name: string, args: any) { operations.push({name,args}); return {data,error} } } }
}
test('state transition rejects a lost CAS and never falls back to unscoped update', async () => {
  const f = fixture(false)
  await assert.rejects(transitionJob(f.db as any, 'job', 'org', JobState.PENDING, JobState.NEEDS_REVIEW, 'fixture'), /STATE_TRANSITION_CONFLICT/)
  assert.equal(f.operations.length, 1)
  assert.equal(f.operations[0].args.p_org_id, 'org')
  assert.equal(f.operations[0].args.p_from, 'PENDING')
})
test('state and audit failure stops worker advancement', async () => {
  const f = fixture(null, {message:'audit unavailable'})
  await assert.rejects(transitionJob(f.db as any, 'job','org',JobState.PENDING,JobState.NEEDS_REVIEW,'fixture'), /STATE_AUDIT_TRANSACTION_FAILED/)
})
test('owned transition includes its attempt and physical evidence in atomic call', async () => {
  const f = fixture(true)
  await transitionJob(f.db as any,'job','org',JobState.ATTACHING_INGREDIENTS,JobState.INGREDIENTS_VERIFIED,'fixture',{physical:2},'attempt')
  assert.equal(f.operations[0].args.p_attempt_id,'attempt')
  assert.deepEqual(f.operations[0].args.p_payload,{physical:2})
})
test('only a committed lease with audit can start processing', async () => {
  for (const value of [false,null]) assert.equal(await leaseJob(fixture(value).db as any,'job','worker','account'),false)
  assert.equal(await leaseJob(fixture(true).db as any,'job','worker','account'),true)
  assert.equal(await leaseJob(fixture(null,{message:'audit failed'}).db as any,'job','worker','account'),false)
})
