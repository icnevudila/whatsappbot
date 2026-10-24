import test from 'node:test'
import assert from 'node:assert/strict'
import { automaticVideoRelease } from '../src/automatic-video-release.js'

test('successful final review is released without customer checkboxes', () => {
  assert.equal(automaticVideoRelease({decision:'PASS'},true),true)
  assert.equal(automaticVideoRelease({decision:'NEEDS_REVIEW',isSevere:false},true),true)
})
test('missing perceptual evidence and failed speech timing cannot be approved finals', () => {
  assert.equal(automaticVideoRelease({decision:'NEEDS_REVIEW',isSevere:false,details:'No severe failure was proven, but perceptual or audio evidence is incomplete; human review is required.'},true),false)
  assert.equal(automaticVideoRelease({decision:'NEEDS_REVIEW',isSevere:false,audio_report:{passed:false,failureCode:'VOICEOVER_TIMING_FAIL'}},true),false)
  assert.equal(automaticVideoRelease({decision:'PASS',audio_report:{passed:false,failureCode:'VOICEOVER_TIMING_FAIL'}},true),false)
})
test('confirmed severe findings and invalid logo presentation remain blocked', () => {
  assert.equal(automaticVideoRelease({decision:'NEEDS_REVIEW',isSevere:true},true),false)
  assert.equal(automaticVideoRelease({decision:'PASS'},false),false)
  assert.equal(automaticVideoRelease({decision:'REGENERATE',isSevere:true},true),false)
  assert.equal(automaticVideoRelease({decision:'NEEDS_REVIEW'},true),false)
  assert.equal(automaticVideoRelease({decision:'NEEDS_REVIEW',isSevere:false,audio_report:{passed:false,failureCode:'SPOKEN_DIALOGUE_FAIL'}},true),false)
})
