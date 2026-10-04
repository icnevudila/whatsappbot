import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { executeWithProgress, type ProviderProgressEvent } from '../src/adapters/provider-progress.js'

test('one execution delivers ordered physical evidence before completion', async () => {
  const identity = { org_id: 'org', job_id: 'job', attempt_id: 'attempt' }
  const events = ['OPENING_PROJECT','ATTACHING_INGREDIENTS','INGREDIENTS_VERIFIED','GENERATING'].map((stage, i) => ({ ...identity, sequence:i+1, stage, observed_at:new Date().toISOString() }))
  let polls = 0
  const server = createServer((req,res) => { res.setHeader('content-type','application/json'); res.end(JSON.stringify({events: polls++ === 0 ? [] : events})) })
  await new Promise<void>(resolve => server.listen(0,'127.0.0.1',resolve))
  const port = (server.address() as { port:number }).port
  let submissions = 0
  const delivered: ProviderProgressEvent[] = []
  try {
    const response = await executeWithProgress(async () => { submissions++; return new Response('{}') }, `http://127.0.0.1:${port}`, identity, async event => { delivered.push(event) })
    assert.equal(response.ok,true)
    assert.equal(submissions,1)
    assert.equal(delivered.length,4)
    polls = 0
    await assert.rejects(executeWithProgress(async () => new Response('{}'), `http://127.0.0.1:${port}`, {...identity,org_id:'foreign'}, async () => {}), /IDENTITY_OR_ORDER_INVALID/)
  } finally { await new Promise<void>(resolve => server.close(() => resolve())) }
})
