import test from 'node:test'
import assert from 'node:assert/strict'
import { isApprovedVideoOutput, isReviewVideoOutput, isApprovedFinalVideoOutput, hasBlockingVideoProblem } from './video-output-approval'

test('legacy approval flag stays strict; final release handles explicit non-severe exceptions', () => {
  for (const verified of [false, true, undefined, null, 'true', 1]) {
    for (const is_approved of [false, true, undefined, null, 'true', 1]) {
      assert.equal(isApprovedVideoOutput({ verified, is_approved }), verified === true && is_approved === true)
    }
  }
})

test('review preview requires an owned validated review output and never grants approval', () => {
  const output = { verified: true, is_approved: false, sha256: 'a'.repeat(64), org_id: 'owned', job_id: 'job' }
  const job = { id: 'job', org_id: 'owned', state: 'NEEDS_REVIEW' }
  assert.equal(isReviewVideoOutput(output, job, 'owned'), true)
  assert.equal(isApprovedVideoOutput(output), false)
  for (const patch of [{ verified: false }, { is_approved: true }, { sha256: '' }, { org_id: 'foreign' }, { job_id: 'other' }]) {
    assert.equal(isReviewVideoOutput({ ...output, ...patch }, job, 'owned'), false)
  }
  for (const patch of [{ state: 'FAILED' }, { state: 'COMPLETED' }, { org_id: 'foreign' }, { id: 'other' }]) {
    assert.equal(isReviewVideoOutput(output, { ...job, ...patch }, 'owned'), false)
  }
  assert.equal(isReviewVideoOutput(output, null, 'owned'), false)
  assert.equal(isReviewVideoOutput(output, job, 'foreign'), false)
})

const final = {verified:true,is_approved:false,duration_seconds:10,width:720,height:1280,sha256:'a'.repeat(64),byte_size:1024,file_path:'/shared/outputs/finished.mp4',visual_qa_report:{reason:'TECHNICAL_VALIDATION_ONLY',technical_checks:[]}}
test('successful final does not require customer editorial confirmation',()=>{
  assert.equal(isApprovedFinalVideoOutput(final),true)
  assert.equal(isApprovedFinalVideoOutput({...final,is_approved:true}),true)
  for(const patch of [{verified:false},{sha256:''},{byte_size:0},{file_path:'raw_video.mp4'},{duration_seconds:8},{width:0},{visual_qa_report:null}]) assert.equal(isApprovedFinalVideoOutput({...final,...patch}),false)
})
test('confirmed serious failures override even an existing approval',()=>{
  for(const report of [{final_qa:{passed:false}},{status:'BLOCKED'},{hardFails:['wrong_product']},{severity:'critical'},{scene_reports:[{passed:false}]},{technical_checks:['hash mismatch']}]) {
    assert.equal(hasBlockingVideoProblem(report),true)
    assert.equal(isApprovedFinalVideoOutput({...final,is_approved:true,visual_qa_report:report}),false)
  }
  assert.equal(hasBlockingVideoProblem({warnings:['minor aesthetic issue'],passed:true}),false)
  const editorial = {combined_review:{passed:false,decision:'NEEDS_REVIEW',isSevere:false,audio_report:{passed:false,failureCode:'VOICEOVER_TIMING_FAIL'}}}
  assert.equal(hasBlockingVideoProblem(editorial),false)
  assert.equal(isApprovedFinalVideoOutput({...final,visual_qa_report:editorial}),true)
  const asrUnavailable = {combined_review:{passed:false,decision:'NEEDS_REVIEW',isSevere:false,audio_report:{passed:false,failureCode:'AUDIO_VERIFICATION_UNAVAILABLE'}}}
  assert.equal(hasBlockingVideoProblem(asrUnavailable),false)
  assert.equal(isApprovedFinalVideoOutput({...final,visual_qa_report:asrUnavailable}),true)
  assert.equal(isApprovedFinalVideoOutput({...final,visual_qa_report:{combined_review:{...editorial.combined_review,isSevere:true}}}),false)
})
