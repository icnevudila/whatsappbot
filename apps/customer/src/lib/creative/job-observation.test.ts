import test from 'node:test'
import assert from 'node:assert/strict'
import { videoObservationComplete } from './job-observation'

test('completion before output publication keeps observing the same job',()=>{
  assert.equal(videoObservationComplete({state:'GENERATING'}),false)
  assert.equal(videoObservationComplete({state:'COMPLETED',playback_url:null}),false)
  assert.equal(videoObservationComplete({state:'NEEDS_REVIEW',playback_url:null}),false)
  assert.equal(videoObservationComplete({state:'COMPLETED',playback_url:'/api/ai-media/outputs/owned'}),true)
  assert.equal(videoObservationComplete({state:'NEEDS_REVIEW',playback_url:'/api/ai-media/outputs/owned?preview=1'}),true)
  assert.equal(videoObservationComplete({state:'FAILED'}),true)
})
