import test from 'node:test'
import assert from 'node:assert/strict'
import { JobState, transitionJob } from '../src/state-machine.js'
function fixture(count: number | undefined) {
  const operations: any[] = []
  return {operations,db:{from(table: string) {
    const op: any = {table,filters:[]}; operations.push(op)
    const chain: any = {update(value: any){op.update=value;return chain},
      eq(key: string,value: any){op.filters.push([key,value]);return chain},
      insert(value: any){op.insert=value;return Promise.resolve({error:null})},
      then(resolve: any,reject: any){return Promise.resolve({error:null,count}).then(resolve,reject)}}
    return chain
  }}}
}
test('state transition never removes tenant/state CAS after zero or unknown match',async()=>{
  for(const count of [0,undefined]) {
    const f=fixture(count)
    await assert.rejects(transitionJob(f.db as any,'job','org',JobState.PENDING,JobState.NEEDS_REVIEW,'fixture'),/STATE_TRANSITION_CONFLICT/)
    assert.equal(f.operations.length,1)
    assert.deepEqual(f.operations[0].filters,[['id','job'],['org_id','org'],['state','PENDING']])
  }
})
test('owned transition clears review lease and emits audit only after matched update',async()=>{
  const f=fixture(1)
  await transitionJob(f.db as any,'job','org',JobState.PENDING,JobState.NEEDS_REVIEW,'fixture')
  assert.equal(f.operations[0].update.lease_account_id,null)
  assert.equal(f.operations[1].table,'ai_media_events')
})
