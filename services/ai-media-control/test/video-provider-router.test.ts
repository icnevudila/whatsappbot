import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ProviderRoutingError,
  VideoProviderRouter,
  type VideoCapabilityState,
  type VideoGenerationRequest,
  type VideoProvider,
} from '../src/providers/video-provider-router.js'
import {
  buildFlowVeoProviderPayload,
  buildGeminiNativeProviderPayload,
} from '../src/providers/real-video-providers.js'
import { matchesExpectedAspect } from '../src/validator.js'

const approvedDialogue = 'Ayvazoğlu İnşaat yapı tuğlasını gerçek çalışma ortamında yakından ve net gösteriyor.'
const exactPrompt = `[FORMAT]: 8.0-second vertical commercial video, 9:16 aspect ratio.\n[AUDIO]: Spoken language: Turkish (tr-TR).\nApproved dialogue: "${approvedDialogue}"\nSpeak exactly this dialogue once, naturally in Turkish.\nNo English narration.\nNo translation.`

const request: VideoGenerationRequest = {
  jobId: 'job-1',
  attemptId: 'attempt-1',
  orgId: 'org-1',
  prompt: exactPrompt,
  approvedDialogue,
  aspectRatio: '9:16',
  durationSeconds: 8,
  assets: [],
}

function providers(
  capability: VideoCapabilityState,
  geminiErrorCode?: string
): { gemini: VideoProvider; flow: VideoProvider; calls: { gemini: number; flow: number } } {
  const calls = { gemini: 0, flow: 0 }
  const gemini: VideoProvider = {
    provider: 'GEMINI_NATIVE_VIDEO',
    async checkCapability() {
      return { state: capability, providerAccountId: 'gemini-account-1' }
    },
    async generate() {
      calls.gemini++
      if (geminiErrorCode) {
        throw new ProviderRoutingError(geminiErrorCode, geminiErrorCode)
      }
      return {
        provider: 'GEMINI_NATIVE_VIDEO',
        providerAccountId: 'gemini-account-1',
        providerAttemptId: 'gemini-attempt-1',
        outputPath: '/mock/gemini.mp4',
        rawOutputSha256: 'a'.repeat(64),
        byteSize: 500_000,
        generationStartedAt: '2026-09-24T10:00:00.000Z',
        generationCompletedAt: '2026-09-24T10:01:00.000Z',
      }
    },
  }
  const flow: VideoProvider = {
    provider: 'FLOW_VEO',
    async generate() {
      calls.flow++
      return {
        provider: 'FLOW_VEO',
        providerAccountId: 'flow-account-1',
        providerAttemptId: 'flow-attempt-1',
        providerProjectId: 'flow-project-1',
        outputPath: '/mock/flow.mp4',
        rawOutputSha256: 'b'.repeat(64),
        byteSize: 500_000,
        generationStartedAt: '2026-09-24T10:00:00.000Z',
        generationCompletedAt: '2026-09-24T10:01:00.000Z',
      }
    },
  }
  return { gemini, flow, calls }
}

test('Gemini AVAILABLE selects Gemini and never calls Flow', async () => {
  const { gemini, flow, calls } = providers('AVAILABLE')
  const result = await new VideoProviderRouter(gemini, flow).execute('AUTO', request)
  assert.equal(result.selectedProvider, 'GEMINI_NATIVE_VIDEO')
  assert.equal(calls.gemini, 1)
  assert.equal(calls.flow, 0)
  assert.equal(result.attemptCounts.FLOW_VEO, 0)
})

for (const state of ['NO_QUOTA', 'FEATURE_UNAVAILABLE'] as const) {
  test(`Gemini ${state} selects Flow with explicit fallback provenance`, async () => {
    const { gemini, flow, calls } = providers(state)
    const result = await new VideoProviderRouter(gemini, flow).execute('AUTO', request)
    assert.equal(result.selectedProvider, 'FLOW_VEO')
    assert.equal(result.fallbackFrom, 'GEMINI_NATIVE_VIDEO')
    assert.equal(result.fallbackReason, state)
    assert.equal(calls.gemini, 0)
    assert.equal(calls.flow, 1)
  })
}

for (const failureCode of ['INVALID_JOB', 'POLICY_REJECTED', 'TENANT_MISMATCH'] as const) {
  test(`${failureCode} calls neither provider`, async () => {
    const { gemini, flow, calls } = providers('AVAILABLE')
    const router = new VideoProviderRouter(gemini, flow)
    await assert.rejects(
      router.execute('AUTO', { ...request, preflightFailureCode: failureCode }),
      (error: any) => error.code === failureCode
    )
    assert.equal(calls.gemini, 0)
    assert.equal(calls.flow, 0)
  })
}

test('ambiguous Gemini error does not blindly bypass to Flow', async () => {
  const { gemini, flow, calls } = providers('AVAILABLE', 'GEMINI_VIDEO_UNKNOWN')
  const router = new VideoProviderRouter(gemini, flow)
  await assert.rejects(router.execute('AUTO', request), /GEMINI_VIDEO_UNKNOWN/)
  assert.equal(calls.gemini, 1)
  assert.equal(calls.flow, 0)
})

test('temporary Gemini execution outage may fallback once to Flow', async () => {
  const { gemini, flow, calls } = providers('AVAILABLE', 'GEMINI_VIDEO_TEMPORARILY_UNAVAILABLE')
  const result = await new VideoProviderRouter(gemini, flow).execute('AUTO', request)
  assert.equal(result.selectedProvider, 'FLOW_VEO')
  assert.equal(result.fallbackReason, 'TEMPORARILY_UNAVAILABLE')
  assert.equal(calls.gemini, 1)
  assert.equal(calls.flow, 1)
})

test('provider-specific syntax is selected without changing the routing plan', async () => {
  const seen: Record<string, string> = {}
  const gemini: VideoProvider = {
    provider: 'GEMINI_NATIVE_VIDEO',
    async checkCapability() { return { state: 'AVAILABLE' } },
    async generate(providerRequest) {
      seen.gemini = providerRequest.prompt
      return {
        provider: 'GEMINI_NATIVE_VIDEO',
        providerAttemptId: 'gemini-attempt',
        outputPath: '/mock/gemini.mp4',
        rawOutputSha256: 'a'.repeat(64),
        byteSize: 500_000,
        generationStartedAt: '2026-09-24T10:00:00.000Z',
        generationCompletedAt: '2026-09-24T10:01:00.000Z',
      }
    },
  }
  const flow: VideoProvider = {
    provider: 'FLOW_VEO',
    async generate(providerRequest) {
      seen.flow = providerRequest.prompt
      throw new Error('Flow must not be called')
    },
  }
  await new VideoProviderRouter(gemini, flow).execute('AUTO', {
    ...request,
    providerPrompts: {
      GEMINI_NATIVE_VIDEO: 'common facts; Gemini syntax',
      FLOW_VEO: 'common facts; Flow syntax',
    },
  })
  assert.equal(seen.gemini, 'common facts; Gemini syntax')
  assert.equal(seen.flow, undefined)
})

test('real Gemini and Flow provider payloads preserve vertical format and exact locked dialogue', () => {
  const assets = [{
    asset_id: 'product-1',
    org_id: 'org-1',
    role: 'product',
    file_path: '/locked/product.png',
    sha256: 'c'.repeat(64),
  }]
  const providerRequest = { ...request, accountId: 'flow-1', assets }
  const gemini = buildGeminiNativeProviderPayload(providerRequest)
  const flow = buildFlowVeoProviderPayload(providerRequest)

  assert.equal(gemini.aspectRatio, '9:16')
  assert.equal(gemini.approvedDialogue, approvedDialogue)
  assert.equal(gemini.voiceoverText, approvedDialogue)
  assert.equal(gemini.prompt, exactPrompt)
  assert.equal(flow.aspect_ratio, '9:16')
  assert.equal(flow.approved_dialogue, approvedDialogue)
  assert.equal(flow.prompt, exactPrompt)
})

test('real provider payload builders fail closed on a missing dialogue lock', () => {
  assert.throws(
    () => buildGeminiNativeProviderPayload({ ...request, prompt: '[FORMAT]: 8.0-second vertical commercial video, 9:16 aspect ratio.' }),
    /exact locked approved dialogue/
  )
})

test('SIMPLE ffprobe expectation accepts portrait output and rejects landscape output', () => {
  assert.equal(matchesExpectedAspect(1080, 1920, request.aspectRatio), true)
  assert.equal(matchesExpectedAspect(1920, 1080, request.aspectRatio), false)
})
