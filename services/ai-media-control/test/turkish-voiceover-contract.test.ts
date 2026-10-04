import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildFlowVeoProviderPayload,
  buildGeminiNativeProviderPayload,
} from '../src/providers/real-video-providers.js'
import type { VideoGenerationRequest } from '../src/providers/video-provider-router.js'

function createSampleRequest(overrides: Partial<VideoGenerationRequest> = {}): VideoGenerationRequest {
  const sentence = 'Bofe şarjlı sırt pompasıyla ilaçlamayı kolaylaştırın, işinizi daha hızlı ve kontrollü tamamlayın.'
  const prompt = [
    'FORMAT: 9:16 vertical commercial video, runtime 8.0s.',
    'SUBJECT: Bofe agricultural sprayer.',
    'VOICEOVER — TURKISH (tr-TR), EXACTLY ONCE:',
    `“${sentence}”`,
    'Speak this exact Turkish sentence once between 0.5s and 5.5s.',
    'Do not translate it.',
    'No English narration.',
    'No other spoken words.',
    'After the voiceover ends, music only.',
    `Approved dialogue: "${sentence}"`,
  ].join('\n')

  return {
    jobId: 'job-tr-voiceover-1',
    attemptId: 'att-tr-voiceover-1',
    orgId: 'org-bofe',
    prompt,
    approvedDialogue: sentence,
    aspectRatio: '9:16',
    durationSeconds: 8,
    accountId: 'account-03',
    assets: [
      {
        asset_id: 'logo-1',
        org_id: 'org-bofe',
        role: 'logo',
        file_path: '/path/to/logo.png',
        sha256: 'a'.repeat(64),
      },
      {
        asset_id: 'prod-1',
        org_id: 'org-bofe',
        role: 'product',
        file_path: '/path/to/prod.png',
        sha256: 'b'.repeat(64),
      },
    ],
    ...overrides,
  }
}

test('Turkish Voiceover Contract: valid tr-TR + Turkish sentence -> PASS', () => {
  const req = createSampleRequest()
  const payload = buildFlowVeoProviderPayload(req)
  assert.equal(payload.voiceover_language, 'tr-TR')
  assert.equal(payload.voiceover_text, req.approvedDialogue)
  assert.ok(payload.prompt.includes(req.approvedDialogue))
})

test('Turkish Voiceover Contract: missing voiceover_text -> reject before provider', () => {
  const req = createSampleRequest({ approvedDialogue: '' })
  assert.throws(
    () => buildFlowVeoProviderPayload(req),
    (err: any) => err.code === 'VOICEOVER_REQUIRED'
  )
})

test('Turkish Voiceover Contract: empty voiceover_text -> reject', () => {
  const req = createSampleRequest({ approvedDialogue: '   ' })
  assert.throws(
    () => buildFlowVeoProviderPayload(req),
    (err: any) => err.code === 'VOICEOVER_REQUIRED'
  )
})

test('Turkish Voiceover Contract: placeholder voiceover_text -> reject', () => {
  for (const placeholder of ['TODO', 'placeholder', '[Turkish voiceover]', 'Turkish voiceover']) {
    const req = createSampleRequest({ approvedDialogue: placeholder })
    assert.throws(
      () => buildFlowVeoProviderPayload(req),
      (err: any) => err.code === 'VOICEOVER_REQUIRED'
    )
  }
})

test('Turkish Voiceover Contract: English-only voiceover -> reject', () => {
  const englishSentence = 'Make your agricultural spraying easy with the best electric backpack sprayer.'
  const prompt = [
    'FORMAT: 9:16 vertical commercial video, runtime 8.0s.',
    'VOICEOVER — TURKISH (tr-TR), EXACTLY ONCE:',
    `“${englishSentence}”`,
    'Speak this exact Turkish sentence once between 0.5s and 5.5s.',
    'Do not translate it.',
    'No English narration.',
  ].join('\n')

  const req = createSampleRequest({
    approvedDialogue: englishSentence,
    prompt,
  })
  assert.throws(
    () => buildFlowVeoProviderPayload(req),
    (err: any) => err.code === 'TURKISH_VOICEOVER_REQUIRED'
  )
})

test('Turkish Voiceover Contract: finalized provider prompt missing exact sentence -> reject', () => {
  const req = createSampleRequest({
    prompt: [
      'FORMAT: 9:16 vertical commercial video, runtime 8.0s.',
      'VOICEOVER — TURKISH (tr-TR), EXACTLY ONCE:',
      '“Bambaşka bir cümle buraya yazıldı.”',
      'Speak this exact Turkish sentence once between 0.5s and 5.5s.',
      'Do not translate it.',
      'No English narration.',
    ].join('\n'),
  })
  assert.throws(
    () => buildFlowVeoProviderPayload(req),
    (err: any) => err.code === 'TURKISH_VOICEOVER_REQUIRED'
  )
})

test('Turkish Voiceover Contract: prompt contains translation instruction -> reject', () => {
  const sentence = 'Bofe şarjlı sırt pompasıyla ilaçlamayı kolaylaştırın, işinizi daha hızlı ve kontrollü tamamlayın.'
  const req = createSampleRequest({
    prompt: [
      'FORMAT: 9:16 vertical commercial video, runtime 8.0s.',
      'VOICEOVER — TURKISH (tr-TR), EXACTLY ONCE:',
      `“${sentence}”`,
      'Speak this exact Turkish sentence once between 0.5s and 5.5s.',
      'Translate to English if necessary.',
      'No English narration.',
    ].join('\n'),
  })
  assert.throws(
    () => buildFlowVeoProviderPayload(req),
    (err: any) => err.code === 'TURKISH_VOICEOVER_REQUIRED'
  )
})
