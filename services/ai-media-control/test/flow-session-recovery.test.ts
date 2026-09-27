import test from 'node:test'
import assert from 'node:assert/strict'
import {
  executeFlowWithSessionRecovery,
  flowSourcePortForAccount,
  isFlowAuthRequiredError,
} from '../src/providers/real-video-providers.js'

test('maps isolated Flow accounts to their verified source browser ports', () => {
  assert.equal(flowSourcePortForAccount('account-03'), 9224)
  assert.equal(flowSourcePortForAccount('account-04'), 9225)
  assert.equal(flowSourcePortForAccount('unknown'), null)
})

test('classifies account chooser and expired Flow sessions as recoverable auth failures', () => {
  assert.equal(isFlowAuthRequiredError({ code: 'FLOW_AUTH_REQUIRED' }), true)
  assert.equal(isFlowAuthRequiredError(new Error('FlowAccountChooserError')), true)
  assert.equal(isFlowAuthRequiredError(new Error('InsufficientCreditsError')), false)
})

test('refreshes the matching source profile and retries an auth failure exactly once', async () => {
  const payloads: any[] = []
  const gflow = {
    async executeJob(payload: any) {
      payloads.push(payload)
      if (payloads.length === 1) {
        const error: any = new Error('Google accountchooser interrupted Flow')
        error.code = 'FLOW_AUTH_REQUIRED'
        throw error
      }
      return { ok: true }
    },
  }
  const requests: Array<{ url: string; body: any }> = []
  const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(input), body: JSON.parse(String(init?.body || '{}')) })
    return new Response(JSON.stringify({
      ok: true,
      results: [{
        accountId: 'account-03',
        ok: true,
        authenticated: true,
        profileSynced: true,
      }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  const result = await executeFlowWithSessionRecovery(
    gflow,
    { job_id: 'job-1', attempt_id: 'attempt-1' },
    'account-03',
    'http://gateway:3456/',
    fetchImpl,
  )

  assert.deepEqual(result, { ok: true })
  assert.equal(requests.length, 1)
  assert.equal(requests[0].url, 'http://gateway:3456/v1/ai-engine/accounts/refresh-flow')
  assert.deepEqual(requests[0].body, { port: 9224 })
  assert.equal(payloads.length, 2)
  assert.equal(payloads[1].is_recovery, true)
})

test('fails closed without a paid retry when source profile repair is not verified', async () => {
  let executions = 0
  const gflow = {
    async executeJob() {
      executions++
      const error: any = new Error('AuthExpiredError')
      error.code = 'FLOW_AUTH_REQUIRED'
      throw error
    },
  }
  const fetchImpl = async () => new Response(JSON.stringify({
    ok: false,
    results: [{ accountId: 'account-04', ok: false, error: 'human login required' }],
  }), { status: 422, headers: { 'Content-Type': 'application/json' } })

  await assert.rejects(
    executeFlowWithSessionRecovery(
      gflow,
      { job_id: 'job-2', attempt_id: 'attempt-2' },
      'account-04',
      'http://gateway:3456',
      fetchImpl,
    ),
    /FLOW_AUTH_REQUIRED: automatic profile repair failed/,
  )
  assert.equal(executions, 1)
})

test('does not repair or retry non-authentication failures', async () => {
  let executions = 0
  let refreshes = 0
  const gflow = {
    async executeJob() {
      executions++
      throw new Error('InsufficientCreditsError')
    },
  }
  const fetchImpl = async () => {
    refreshes++
    return new Response('{}', { status: 500 })
  }

  await assert.rejects(
    executeFlowWithSessionRecovery(
      gflow,
      { job_id: 'job-3', attempt_id: 'attempt-3' },
      'account-03',
      'http://gateway:3456',
      fetchImpl,
    ),
    /InsufficientCreditsError/,
  )
  assert.equal(executions, 1)
  assert.equal(refreshes, 0)
})
