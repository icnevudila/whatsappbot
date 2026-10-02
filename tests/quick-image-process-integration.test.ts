import assert from 'node:assert/strict'
import test from 'node:test'
import { processCreativeGeneration } from '../apps/customer/src/lib/creative/process'

test('only server ai_send template uses preserved quick prompt; tenant, kit and stable key reach queued job', async () => {
  const originalFetch = global.fetch
  for (const template of ['ai_send', 'ai_campaign']) {
    let request: any
    let tick = 0
    const row: any = { id: 'request', org_id: 'org', template, status: 'pending', format: 'square', updated_at: 't0',
      payload: { brief: 'Gerçek ürün duyurusu', aspect: '1:1', style: 'minimal', formatId: 'square', textDensity: 'low',
        useLogo: false, products: [], phones: [], socials: [], labels: [], baseCreativeId: null,
        brandKit: { id: 'kit', name: 'Marka', tone: null, colors: {}, fonts: {}, logoPath: null },
        quickSendPrompt: 'EXACT EXISTING QUICK PROMPT' } }
    const db: any = { from(table: string) {
      let update: any
      const chain: any = { select: () => chain, eq: () => chain, in: () => chain,
        update: (value: any) => { update = value; return chain },
        maybeSingle: async () => {
          if (table === 'organizations') return { data: { name: 'Marka', ai_image_mode: 'economic' } }
          assert.equal(table, 'creatives')
          if (update) { Object.assign(row, update, { updated_at: `t${++tick}` }); return { data: { id: row.id, updated_at: row.updated_at } } }
          return { data: { ...row } }
        },
      }; return chain
    } }
    global.fetch = async (url, options) => {
      if (String(url).endsWith('/health')) return Response.json({ status: 'online' })
      assert.equal(options?.method, 'POST')
      request = JSON.parse(String(options?.body))
      return Response.json({ job_id: 'durable-job' }, { status: 202 })
    }
    try {
      const result = await processCreativeGeneration(row.id, db)
      assert.equal(result.pending, true)
      assert.equal(request.tenantId, 'org'); assert.equal(request.requestId, 'request:image:initial')
      assert.equal(request.brandKit.id, 'kit')
      assert.equal(request.prompt === 'EXACT EXISTING QUICK PROMPT', template === 'ai_send')
      assert.equal(row.payload.imageJob.id, 'durable-job')
    } finally { global.fetch = originalFetch }
  }
})

test('selected quick-image logo download failure stops before any production POST', async () => {
  const originalFetch = global.fetch
  let posts = 0
  const row: any = { id: 'request', org_id: 'org', template: 'ai_send', status: 'pending', format: 'square', updated_at: 't0',
    payload: { brief: 'Ürün duyurusu', aspect: '1:1', useLogo: true, products: [], phones: [], socials: [], labels: [],
      brandKit: { id: 'kit', logoPath: 'https://selected.test/logo.png' }, quickSendPrompt: 'EXACT QUICK PROMPT' } }
  const db: any = { from: () => {
    let update: any
    const chain: any = { select: () => chain, eq: () => chain, in: () => chain,
      update: (value: any) => { update = value; return chain },
      maybeSingle: async () => {
        if (update) { Object.assign(row, update); return { data: { id: row.id, updated_at: 't1' } } }
        return { data: { ...row } }
      },
      then: (resolve: any) => resolve({ error: null }),
    }; return chain
  } }
  global.fetch = async (_url, options) => { if (options?.method === 'POST') posts++; return new Response('missing', { status: 404 }) }
  try {
    const result = await processCreativeGeneration('request', db)
    assert.equal(result.ok, false); assert.match(result.error || '', /logosu indirilemedi/)
    assert.equal(posts, 0)
  } finally { global.fetch = originalFetch }
})
