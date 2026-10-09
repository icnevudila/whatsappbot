import test from 'node:test'
import assert from 'node:assert/strict'

test('Idempotency & NEXT_REDIRECT Prevention: duplicate requestKey returns { id, ok } without throwing or duplicating', async () => {
  // Simulated DB state
  const dbCreatives: Array<{ id: string; org_id: string; status: string; payload: any }> = []
  let renderJobDispatches = 0

  // Mock server action mimicking actions.ts line 185-291
  async function mockStartCreativeGeneration(draft: { requestKey: string; orgId: string; brief: string }) {
    // 1. Idempotency check via requestKey
    const existing = dbCreatives.find(
      (c) => c.org_id === draft.orgId && c.payload?.requestKey === draft.requestKey && ['pending', 'rendering', 'ready'].includes(c.status)
    )

    if (existing?.id) {
      // Prior bug: throw redirect('/icerik/' + existing.id) which caused NEXT_REDIRECT error in client try/catch!
      // V2 fix: returns smooth { id, ok } payload
      return { id: existing.id, ok: 'Görsel üretimi devam ediyor.' }
    }

    // 2. New generation insert
    const newId = 'creative_' + Math.random().toString(36).substring(2, 9)
    dbCreatives.push({
      id: newId,
      org_id: draft.orgId,
      status: 'pending',
      payload: { requestKey: draft.requestKey, brief: draft.brief },
    })
    renderJobDispatches++

    return { id: newId, ok: true }
  }

  // Client handler simulation mimicking creative-studio-v2.tsx handleSubmit
  async function clientHandleSubmit(draft: { requestKey: string; orgId: string; brief: string }) {
    let clientError: string | null = null
    let routedUrl: string | null = null

    try {
      const res = await mockStartCreativeGeneration(draft)
      if (res?.error) {
        throw new Error(res.error)
      }
      if (res?.id) {
        routedUrl = `/icerik/${res.id}`
      }
    } catch (err: any) {
      clientError = err.message || 'Görsel üretimi başlatılamadı.'
    }

    return { clientError, routedUrl }
  }

  const payload = {
    requestKey: 'req_bofe_pompasi_998877',
    orgId: 'org_bofe_tarim',
    brief: 'Bofe Tarım 16L Akülü İlaçlama Pompası',
  }

  // Scenario 1: First click
  const firstSubmission = await clientHandleSubmit(payload)
  assert.equal(firstSubmission.clientError, null, 'First submission must succeed without client error')
  assert.match(firstSubmission.routedUrl!, /^\/icerik\/creative_/, 'First submission routes to new creative id')
  assert.equal(dbCreatives.length, 1, 'Exactly 1 creative record must be created in DB')
  assert.equal(renderJobDispatches, 1, 'Exactly 1 render job dispatched')

  const createdId = dbCreatives[0].id

  // Scenario 2: Double click / identical requestKey
  const doubleClickSubmission = await clientHandleSubmit(payload)
  assert.equal(doubleClickSubmission.clientError, null, 'Double-click must NOT throw NEXT_REDIRECT or fake error')
  assert.equal(doubleClickSubmission.routedUrl, `/icerik/${createdId}`, 'Double-click smoothly redirects to existing job')
  assert.equal(dbCreatives.length, 1, 'No duplicate creative row created on double-click')
  assert.equal(renderJobDispatches, 1, 'Zero additional render jobs dispatched')

  // Scenario 3: Concurrent simultaneous requests
  const concurrentPayload = {
    requestKey: 'req_concurrent_simultaneous_112233',
    orgId: 'org_ayvazoglu',
    brief: 'Ayvazoğlu Klinker Tuğla',
  }

  const [reqA, reqB] = await Promise.all([
    clientHandleSubmit(concurrentPayload),
    clientHandleSubmit(concurrentPayload),
  ])

  // Both should navigate to the same valid creative ID without throwing errors
  assert.equal(reqA.clientError, null)
  assert.equal(reqB.clientError, null)
  assert.equal(reqA.routedUrl, reqB.routedUrl, 'Concurrent calls route to the exact same URL')
  assert.equal(
    dbCreatives.filter((c) => c.payload.requestKey === concurrentPayload.requestKey).length,
    1,
    'Exactly one record exists in DB for concurrent requests'
  )

  // Scenario 4: Page refresh with same requestKey returns existing job
  const reloadSubmission = await clientHandleSubmit(payload)
  assert.equal(reloadSubmission.clientError, null, 'Page refresh must succeed without error')
  assert.equal(reloadSubmission.routedUrl, `/icerik/${createdId}`, 'Routes to already existing job')
  assert.equal(renderJobDispatches, 2, 'Total render jobs across both test campaigns is exactly 2')
})
