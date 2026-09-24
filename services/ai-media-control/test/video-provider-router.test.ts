import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ProviderRoutingError,
  VideoProviderRouter,
  type VideoCapabilityState,
  type VideoGenerationRequest,
  type VideoProvider,
} from '../src/providers/video-provider-router.js'

const request: VideoGenerationRequest = {
  jobId: 'job-1',
  attemptId: 'attempt-1',
  orgId: 'org-1',
  prompt: 'compact provider prompt',
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
