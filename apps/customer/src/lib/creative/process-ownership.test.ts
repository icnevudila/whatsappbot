import test from 'node:test'
import assert from 'node:assert/strict'
import {processCreativeGeneration} from './process'
test('privileged reconciliation rejects a creative outside the authorized tenant before any write or provider call',async()=>{
  let writes=0
  const query={select(){return this},eq(){return this},async maybeSingle(){return {data:{id:'creative',org_id:'foreign-org',payload:{}},error:null}},update(){writes++;throw new Error('unexpected write')}}
  const result=await processCreativeGeneration('creative',{from(){return query}} as any,'authorized-org')
  assert.equal(result.ok,false)
  assert.equal(result.error,'Kayıt bulunamadı.')
  assert.equal(writes,0)
})
