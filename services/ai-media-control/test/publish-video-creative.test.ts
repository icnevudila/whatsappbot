import test from 'node:test'
import assert from 'node:assert/strict'
import type { SupabaseClient } from '@supabase/supabase-js'
import { publishVideoCreative } from '../src/publish-video-creative.js'

const input = { jobId: 'job-a', orgId: 'org-a', outputId: 'output-a', approved: true,
  selectedProvider: 'FLOW_VEO', reviewDecision: 'PASS' }

test('publication merges the existing snapshot and scopes the exact tenant mirror', async () => {
  let calls = 0
  const db = { async query(sql: string, params: unknown[]) {
    calls++
    assert.match(sql, /COALESCE\(payload, '\{\}'::jsonb\) \|\| \$5::jsonb/)
    assert.match(sql, /WHERE id = \$1 AND org_id = \$2/)
    assert.doesNotMatch(sql, /INSERT|UPSERT/i)
    assert.deepEqual(params.slice(0,4), ['job-a','org-a','ready','/api/ai-media/outputs/output-a'])
    assert.equal(JSON.parse(params[4] as string).review_required, false)
    return { rowCount: 1 }
  }}
  await publishVideoCreative(db as unknown as SupabaseClient & typeof db, input)
  assert.equal(calls,1)
})

test('missing or foreign mirror cannot become a ghost ready creative', async () => {
  const db = { async query() { return { rowCount: 0 } } }
  await assert.rejects(publishVideoCreative(db as unknown as SupabaseClient & typeof db, input),
    /VIDEO_CREATIVE_PUBLICATION_FAILED/)
})

test('unapproved output is published for review rather than campaign use', async () => {
  const db = { async query(_sql: string, params: unknown[]) {
    assert.equal(params[2], 'needs_review')
    assert.equal(JSON.parse(params[4] as string).review_required, true)
    return { rowCount: 1 }
  }}
  await publishVideoCreative(db as unknown as SupabaseClient & typeof db, {...input, approved:false})
})
