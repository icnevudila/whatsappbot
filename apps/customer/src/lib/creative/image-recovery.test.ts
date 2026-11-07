import test from 'node:test'
import assert from 'node:assert/strict'
import {recoverableImageReceipt} from './image-recovery'
const receipt={id:'job-one',gatewayUrl:'https://gateway.test',queuedAt:'2026-11-07T09:00:00Z'}
test('timed-out observation resumes the accepted identity only with reconciliation evidence',()=>{
  assert.equal(recoverableImageReceipt({imageJob:receipt}),receipt)
  assert.equal(recoverableImageReceipt({lastImageJob:receipt,imageReconciliationRequired:true}),receipt)
  assert.equal(recoverableImageReceipt({lastImageJob:receipt}),null)
})
test('malformed recovery pointers cannot authorize generation from polling',()=>{
  for(const value of [null,{}, {lastImageJob:{},imageReconciliationRequired:true},
    {imageJob:{...receipt,id:''}},{imageJob:{...receipt,gatewayUrl:'file:///secret'}},
    {imageJob:{...receipt,queuedAt:'invalid'}}]) assert.equal(recoverableImageReceipt(value),null)
})
