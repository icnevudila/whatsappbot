import test from 'node:test'
import assert from 'node:assert/strict'
import { automaticVideoRelease } from '../src/automatic-video-release.js'

test('successful final review is released without customer checkboxes', () => {
  assert.equal(automaticVideoRelease({decision:'PASS'},true),true)
  assert.equal(automaticVideoRelease({decision:'NEEDS_REVIEW',isSevere:false},true),true)
  assert.equal(automaticVideoRelease({decision:'NEEDS_REVIEW',isSevere:false,audio_report:{passed:false,failureCode:'VOICEOVER_TIMING_FAIL'}},true),true)
})
test('confirmed severe findings and invalid logo presentation remain blocked', () => {
  assert.equal(automaticVideoRelease({decision:'NEEDS_REVIEW',isSevere:true},true),false)
  assert.equal(automaticVideoRelease({decision:'PASS'},false),false)
  assert.equal(automaticVideoRelease({decision:'REGENERATE',isSevere:true},true),false)
  assert.equal(automaticVideoRelease({decision:'NEEDS_REVIEW'},true),false)
  assert.equal(automaticVideoRelease({decision:'NEEDS_REVIEW',isSevere:false,audio_report:{passed:false,failureCode:'SPOKEN_DIALOGUE_FAIL'}},true),false)
})
