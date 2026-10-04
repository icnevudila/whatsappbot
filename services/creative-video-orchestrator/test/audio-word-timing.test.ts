import test from 'node:test'
import assert from 'node:assert/strict'
import { AudioIntegrityGate, verifySpeechWindow } from '../src/qa/audio-integrity-gate.js'
const window = { startSec: 0.5, endBeforeSec: 5.5 }
const words = [{ word: 'Ürünü', start: 0.5, end: 1.0 }, { word: 'inceleyin.', start: 1.1, end: 5.25 }]
test('complete timing proves the strict speech window', () => {
  const report = verifySpeechWindow('Ürünü inceleyin.', words, window)
  assert.equal(report.passed, true)
  assert.equal(report.speechEndSec, 5.25)
})
test('missing, partial, invalid or overlapping timing cannot pass', () => {
  for (const evidence of [undefined, [], words.slice(0, 1), [{ ...words[0], end: NaN }, words[1]], [words[0], { ...words[1], start: 0.9 }]]) {
    assert.equal(verifySpeechWindow('Ürünü inceleyin.', evidence, window).failureCode, 'AUDIO_VERIFICATION_UNAVAILABLE')
  }
})
test('speech ending exactly at 5.5 or starting early fails', () => {
  assert.equal(verifySpeechWindow('Ürünü inceleyin.', [words[0], { ...words[1], end: 5.5 }], window).failureCode, 'VOICEOVER_TIMING_FAIL')
  assert.equal(verifySpeechWindow('Ürünü inceleyin.', [{ ...words[0], start: 0.49 }, words[1]], window).failureCode, 'VOICEOVER_TIMING_FAIL')
})
test('raw gate rejects missing evidence and repeated narration', async () => {
  const req = { rawVideoPath: '/mock', expectedDialogue: 'Ürünü inceleyin.', isMock: true, mockTranscript: 'Ürünü inceleyin.', speechWindow: window }
  assert.equal((await AudioIntegrityGate.evaluateRawVeoAudio(req)).failureCode, 'AUDIO_VERIFICATION_UNAVAILABLE')
  assert.equal((await AudioIntegrityGate.evaluateRawVeoAudio({ ...req, mockWords: words })).passed, true)
  assert.equal((await AudioIntegrityGate.evaluateRawVeoAudio({ ...req, mockWords: words, mockTranscript: 'Ürünü inceleyin. Ürünü inceleyin.' })).failureCode, 'SPOKEN_DIALOGUE_FAIL')
})
