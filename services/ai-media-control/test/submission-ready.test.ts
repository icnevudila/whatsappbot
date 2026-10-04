import test from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { isSubmissionPublished, expireUnpublishedSubmissions, repairSubmissionExpiryAudits } from '../src/submission-ready.js'
test('staged or malformed submissions never enter provider processing', () => {
  for (const value of [false, null, 'false', 'true', 0, 1]) assert.equal(isSubmissionPublished({video_submission_ready:value}), false)
  assert.equal(isSubmissionPublished({video_submission_ready:true}), true)
})
test('existing legacy pending jobs remain compatible without a staged marker', () => {
  assert.equal(isSubmissionPublished({creative_engine_mode:'SIMPLE_V5_HYBRID'}), true)
  assert.equal(isSubmissionPublished(null), true)
})

function fixture(options: { publishedDuringUpdate?: boolean, queryError?: boolean, auditError?: boolean } = {}) {
  const filters: any[] = []
  const events: any[] = []
  let updates = 0
  const job = { id:'job', org_id:'org', metadata:{ video_submission_ready:false, video_submission_deadline_at:'2026-10-02T10:00:00.000Z' } }
  const db = { from(table: string) {
    let updating = false
    const chain: any = {
      select() { return updating ? Promise.resolve({ data:options.publishedDuringUpdate ? [] : [{id:'job'}], error:null }) : chain },
      eq(key: string, value: unknown) { filters.push([key,value]); return chain },
      lte() { return chain },
      order() { return chain },
      limit() { return Promise.resolve({data:[job], error:options.queryError ? {message:'fixture'} : null}) },
      update() { updating = true; updates++; return chain },
      insert(event: any) { events.push(event); return Promise.resolve({error:options.auditError ? {message:'fixture'} : null}) },
    }
    assert.ok(['ai_media_jobs','ai_media_events'].includes(table))
    return chain
  } }
  return {db, filters, events, get updates() {return updates}}
}

test('expired staging is fenced by tenant, state, ready flag and deadline and audited', async () => {
  const f = fixture()
  assert.equal(await expireUnpublishedSubmissions(f.db,new Date('2026-10-02T11:00:00Z')),1)
  for (const key of ['id','org_id','state','metadata->>video_submission_ready','metadata->>video_submission_deadline_at'])
    assert.ok(f.filters.some(([field]) => field === key))
  assert.equal(f.events[0].to_state,'NEEDS_REVIEW')
})
test('simultaneous publication wins without being overwritten or falsely audited', async () => {
  const f = fixture({publishedDuringUpdate:true})
  assert.equal(await expireUnpublishedSubmissions(f.db,new Date('2026-10-02T11:00:00Z')),0)
  assert.equal(f.events.length,0)
})
test('unexpired submission is not updated', async () => {
  const f = fixture()
  assert.equal(await expireUnpublishedSubmissions(f.db,new Date('2026-10-02T09:00:00Z')),0)
  assert.equal(f.updates,0)
})
test('database and audit failures are not reported as successful expiry', async () => {
  await assert.rejects(expireUnpublishedSubmissions(fixture({queryError:true}).db),/QUERY_FAILED/)
  await assert.rejects(expireUnpublishedSubmissions(fixture({auditError:true}).db),/AUDIT_FAILED/)
})

test('durable audit marker retries insertion after failure and acknowledges duplicate receipt safely', async () => {
  const metadata = {video_submission_expiry_audit_pending:true,video_submission_deadline_at:'2026-10-02T10:00:00Z'}
  const job = {id:'job',org_id:'org',metadata}
  let fail = true
  let acknowledgements = 0
  const ids: string[] = []
  const db = {from(table: string) {
    let updating = false
    const chain: any = {
      eq() {return chain},order() {return chain},
      select() {return updating ? Promise.resolve({data:[{id:'job'}],error:null}) : chain},
      limit() {return Promise.resolve({data:[job],error:null})},
      update(value: any) {updating = true; assert.equal(value.metadata.video_submission_expiry_audit_pending,false); acknowledgements++; return chain},
      insert(value: any) {assert.equal(table,'ai_media_events'); ids.push(value.id); return Promise.resolve({error:fail ? {message:'offline'} : {code:'23505'}})},
    }
    return chain
  }}
  await assert.rejects(repairSubmissionExpiryAudits(db),/AUDIT_FAILED/)
  assert.equal(acknowledgements,0)
  fail = false
  await repairSubmissionExpiryAudits(db)
  assert.equal(ids[0],ids[1])
  assert.equal(acknowledgements,1)
})

test('installed Supabase HTTP builder sends snapshot JSON, never object-string coercion', async () => {
  const snapshot = {video_submission_ready:false,video_submission_deadline_at:'2026-10-02T10:00:00Z'}
  let observed: URL | undefined
  const client = createClient('https://example.invalid','fixture-only',{global:{fetch:async(input: any) => {
    observed = new URL(typeof input === 'string' ? input : input.url)
    return new Response('[]',{status:200,headers:{'content-type':'application/json'}})
  }}})
  const {error} = await client.from('ai_media_jobs').update({state:'NEEDS_REVIEW'})
    .eq('metadata',JSON.stringify(snapshot)).select('id')
  assert.equal(error,null)
  assert.equal(observed?.searchParams.get('metadata'),`eq.${JSON.stringify(snapshot)}`)
})
