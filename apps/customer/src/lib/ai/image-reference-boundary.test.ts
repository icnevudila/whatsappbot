import test from 'node:test'
import assert from 'node:assert/strict'
import {generateImage} from './image'
test('independent expected references block zero or partial payload before any provider request',async()=>{
  const original=globalThis.fetch;let calls=0
  globalThis.fetch=async()=>{calls++;throw new Error('unexpected provider request')}
  try {
    for(const refs of [[],[{data:Buffer.from('fixture'),mimeType:'image/png',role:'logo' as const}]])
      await assert.rejects(generateImage('approved','1:1',null,refs,{expectedReferenceCount:2}),/REFERENCE_PREFLIGHT_MISMATCH/)
    assert.equal(calls,0)
  } finally {globalThis.fetch=original}
})
