import test from 'node:test'
import assert from 'node:assert/strict'
import { isApprovedVideoOutput, isApprovedFinalVideoOutput, isReviewVideoOutput } from './video-output-approval'

test('editorial review is advisory but technical validation must be the boolean true', () => {
  for (const verified of [false, true, undefined, null, 'true', 1]) {
    for (const is_approved of [false, true, undefined, null, 'true', 1]) {
      assert.equal(isApprovedVideoOutput({ verified, is_approved }), verified === true)
    }
  }
})

test('review preview requires an owned validated review output and never grants approval', () => {
  const output = { verified: true, is_approved: false, sha256: 'a'.repeat(64), org_id: 'owned', job_id: 'job' }
  const job = { id: 'job', org_id: 'owned', state: 'NEEDS_REVIEW' }
  assert.equal(isReviewVideoOutput(output, job, 'owned'), true)
  assert.equal(isApprovedVideoOutput(output), true)
  for (const patch of [{ verified: false }, { is_approved: true }, { sha256: '' }, { org_id: 'foreign' }, { job_id: 'other' }]) {
    assert.equal(isReviewVideoOutput({ ...output, ...patch }, job, 'owned'), false)
  }
  for (const patch of [{ state: 'FAILED' }, { state: 'COMPLETED' }, { org_id: 'foreign' }, { id: 'other' }]) {
    assert.equal(isReviewVideoOutput(output, { ...job, ...patch }, 'owned'), false)
  }
  assert.equal(isReviewVideoOutput(output, null, 'owned'), false)
  assert.equal(isReviewVideoOutput(output, job, 'foreign'), false)
})

test('removing editorial gate never accepts raw or malformed final masters', () => {
 const final = {verified:true,is_approved:false,duration_seconds:10,width:720,height:1280}
 assert.equal(isApprovedFinalVideoOutput(final),true)
 for(const patch of [{verified:false},{duration_seconds:8},{duration_seconds:NaN},{width:400},{height:400},{width:1280,height:720}]) assert.equal(isApprovedFinalVideoOutput({...final,...patch}),false)
})
