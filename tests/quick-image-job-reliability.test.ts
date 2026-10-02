import assert from 'node:assert/strict'
import test from 'node:test'
import { continueQuickImageJob, ensureQuickImageRecord, ownsQuickImage, quickImageIdentity } from '../apps/customer/src/lib/creative/quick-image-job'

const identity = quickImageIdentity({ brief: 'Gerçek ürün duyurusu', brandKitId: 'kit', style: 'urun' })
const row = { id: 'request', org_id: 'org', created_by: 'member', source: 'ai', template: 'ai_send',
  format: 'square', status: 'pending', payload: { quickSendIdentity: identity } }

function dbFixture(existing: any = null, concurrent: any = null) {
  let stored = existing; let inserts = 0; let executed = 0
  const db = { from(table: string) {
    assert.equal(table, 'creatives')
    let insertion: any = null
    const chain: any = {
      select: () => chain, eq: () => chain,
      insert: (value: any) => { inserts++; insertion = value; return chain },
      maybeSingle: async () => {
        if (insertion) {
          executed++
          if (concurrent) { stored = concurrent; return { data: null, error: { code: '23505' } } }
          stored = insertion; return { data: { id: insertion.id }, error: null }
        }
        return { data: stored, error: null }
      },
    }; return chain
  } }
  return { db, counters: () => ({ inserts, executed }) }
}

test('quick image durable row is committed once; repeated polling reuses its identity', async () => {
  const fixture = dbFixture()
  await ensureQuickImageRecord(fixture.db, row, identity)
  await ensureQuickImageRecord(fixture.db, row, identity)
  assert.deepEqual(fixture.counters(), { inserts: 1, executed: 1 })
})

test('UUID collision must match tenant, creator, template, source and brief identity', async () => {
  for (const alteration of [{ org_id: 'other' }, { created_by: 'other' }, { template: 'wizard' },
    { source: 'upload' }, { payload: { quickSendIdentity: 'changed-brief' } }]) {
    const fixture = dbFixture({ ...row, ...alteration })
    await assert.rejects(ensureQuickImageRecord(fixture.db, row, identity), /IDENTITY_CONFLICT/)
    assert.equal(fixture.counters().inserts, 0)
  }
  assert.equal(ownsQuickImage(row, 'org', 'member', identity), true)
})

test('concurrent insert conflict resumes only the matching immutable request, never overwrites', async () => {
  const valid = dbFixture(null, row)
  assert.equal((await ensureQuickImageRecord(valid.db, row, identity)).id, row.id)
  const invalid = dbFixture(null, { ...row, created_by: 'other' })
  await assert.rejects(ensureQuickImageRecord(invalid.db, row, identity), /IDENTITY_CONFLICT/)
  assert.equal(invalid.counters().executed, 1)
})

test('database observation failure cannot authorize insertion or generation', async () => {
  let inserts = 0
  const chain: any = { select: () => chain, eq: () => chain,
    insert: () => { inserts++; return chain }, maybeSingle: async () => ({ data: null, error: new Error('lost') }) }
  await assert.rejects(ensureQuickImageRecord({ from: () => chain }, row, identity), /RECORD_UNCERTAIN/)
  assert.equal(inserts, 0)
})

test('request identity changes for changed instructions, selected kit or style', () => {
  assert.notEqual(identity, quickImageIdentity({ brief: 'Başka ürün', brandKitId: 'kit', style: 'urun' }))
  assert.notEqual(identity, quickImageIdentity({ brief: 'Gerçek ürün duyurusu', brandKitId: 'other', style: 'urun' }))
  assert.notEqual(identity, quickImageIdentity({ brief: 'Gerçek ürün duyurusu', brandKitId: 'kit', style: 'minimal' }))
})

test('pending quick route contract preserves identity; completed response retains synchronous onApply URL', async () => {
  const filters: any[] = []
  const chain: any = { select: () => chain, eq: (field: string, value: string) => { filters.push([field, value]); return chain },
    maybeSingle: async () => ({ data: { public_url: 'https://storage.test/result.webp', brand_kit_id: 'kit', payload: { provider: 'omnistudio' } } }) }
  const db = { from: () => chain }
  const pending = await continueQuickImageJob(db, 'request', 'org', async () => ({ ok: true, pending: true }))
  assert.equal(pending.status, 202); assert.equal(pending.body.creativeId, 'request'); assert.equal(filters.length, 0)
  const ready = await continueQuickImageJob(db, 'request', 'org', async () => ({ ok: true, ready: true, publicUrl: 'https://storage.test/result.webp' }))
  assert.equal(ready.status, 200); assert.equal(ready.body.url, 'https://storage.test/result.webp')
  assert.deepEqual(filters, [['id', 'request'], ['org_id', 'org']])
})

test('HTTP success without confirmed output never returns a usable URL or authorizes a new attempt', async () => {
  const result = await continueQuickImageJob({}, 'request', 'org', async () => ({ ok: true, ready: true }))
  assert.equal(result.status, 202); assert.equal(result.body.url, undefined)
  const uncertain = await continueQuickImageJob({}, 'request', 'org', async () => ({ ok: false, error: 'uncertain' }))
  assert.equal(uncertain.status, 502); assert.equal(uncertain.body.canRetryNew, false)
})

test('only authoritative non-ambiguous failure permits an explicit new attempt', async () => {
  for (const [payload, error, allowed] of [
    [{}, 'Seçilen marka logosu indirilemedi; üretim başlatılmadı.', true],
    [{}, 'operation aborted timeout', false],
    [{ imageReconciliationRequired: true }, 'Uzlaştırma gerekli', false],
    [{ imageDirectIntent: { requestId: 'request' } }, 'Sağlayıcı sonucu belirsiz', false],
    [{ imageSubmissionUncertain: true }, 'Bağlantı koptu', false],
    [{ imageSubmitIntent: { requestId: 'request' } }, 'Legacy failure', false],
    [{ imageJob: { id: 'job', gatewayUrl: 'gateway' } }, 'Legacy failure', false],
    [{ imageJob: { id: 'job', gatewayUrl: 'gateway' }, imageTerminalFailure: { kind: 'PROVIDER_FAILED', jobId: 'job', gatewayUrl: 'gateway' } }, 'Provider rejected job', true],
    [{ imageJob: { id: 'job', gatewayUrl: 'gateway' }, imageTerminalFailure: { kind: 'PROVIDER_FAILED', jobId: 'other', gatewayUrl: 'gateway' } }, 'Provider rejected job', false],
  ] as const) {
    const chain: any = { select: () => chain, eq: () => chain,
      maybeSingle: async () => ({ data: { status: 'failed', payload, error } }) }
    const result = await continueQuickImageJob({ from: () => chain }, 'request', 'org', async () => ({ ok: false, error }))
    assert.equal(result.body.canRetryNew, allowed)
  }
})
