import test from 'node:test'
import assert from 'node:assert/strict'
import { detailRenderState, hasConfirmedRenderResult, renderRemainingText, isUncertainImageFailure } from '../apps/customer/src/lib/creative/detail-render-state'

test('failed database state immediately hides stale busy spinner and reports actual failure',()=>{
  const state=detailRenderState({status:'failed',busyRender:true,localError:null,error:'operation aborted timeout',livePublicUrl:null})
  assert.equal(state.spinning,false);assert.equal(state.ready,false);assert.equal(state.error,'operation aborted timeout')
})
test('failed new attempt cannot be shown as ready by a stale previous URL',()=>{
  const state=detailRenderState({status:'failed',busyRender:true,livePublicUrl:'https://old.test/a.png',error:'failure'})
  assert.equal(state.spinning,false);assert.equal(state.ready,false)
})
test('expired estimate never claims completed output',()=>{
  assert.match(renderRemainingText(0),/henüz doğrulanmadı/)
  assert.match(renderRemainingText(-10),/henüz doğrulanmadı/)
  assert.doesNotMatch(renderRemainingText(0),/tamamlandı|0 sn/)
})
test('HTTP success or ready without actual artifact is not output confirmation',()=>{
  assert.equal(hasConfirmedRenderResult({}),false)
  assert.equal(hasConfirmedRenderResult({ready:true,publicUrl:null}),false)
  assert.equal(hasConfirmedRenderResult({ready:true,publicUrl:'https://output.test/a.png'}),true)
})
test('legacy timeout cannot authorize retry as a proven failed provider generation',()=>{
  assert.equal(isUncertainImageFailure('OmniStudio operation aborted timeout'),true)
  assert.equal(isUncertainImageFailure('fetch failed ECONNRESET'),true)
  assert.equal(isUncertainImageFailure('Üretim zaman aşımına uğradı'),true)
  assert.equal(isUncertainImageFailure('Ürün referansı eksik'),false)
})

test('a ready database label without a real file is not ready',()=>{
  assert.equal(detailRenderState({status:'ready',busyRender:false,publicUrl:null}).ready,false)
  assert.equal(detailRenderState({status:'ready',busyRender:false,publicUrl:'https://output.test/a.png'}).ready,true)
})
