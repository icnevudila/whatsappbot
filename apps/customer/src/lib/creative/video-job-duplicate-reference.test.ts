import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { NextRequest } from 'next/server'
import { createVideoJob } from './video-job-service'

test('real video POST rejects identical logo/product pixels without persisting a revision, job or asset', async () => {
  const bytes = await sharp({create:{width:24,height:24,channels:3,background:'#008069'}}).png().toBuffer()
  const originalFetch = globalThis.fetch
  let mutations = 0
  const supabase = { from(table: string) {
    const query: any = {
      select() { return this }, eq() { return this }, in() { return this }, gte() { return this }, order() { return this }, limit() { return this },
      single() { return Promise.resolve({ data: { monthly_video_quota: 100 }, error: null }) },
      maybeSingle() { return Promise.resolve({data: table === 'org_products' ? {id:'product-fixture',name:'Fixture ürün',description:null}
        : table === 'org_product_images' ? {public_url:'https://fixture.invalid/product.png'}
        : table === 'organizations' ? {logo_path:'https://fixture.invalid/logo.png'} : null, error:null}) },
      insert() { mutations++; throw new Error('Unexpected persistence before asset validation') },
      then(resolve: any) { return Promise.resolve({ count: 0, data: [], error: null }).then(resolve) },
    }
    assert.ok(['organizations', 'ai_media_jobs', 'org_products', 'org_product_images', 'brand_kits', 'accounts', 'org_social_accounts'].includes(table), 'Only quota/catalog/contact reads may precede asset validation')
    return query
  }}
  globalThis.fetch = async () => new Response(bytes, {headers:{'content-type':'image/png'}})
  try {
    const req = new NextRequest('https://app.mesajify.com/api/ai-media/jobs', {
      method: 'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({
        title:'QA duplicate asset',creativeEngineMode:'SIMPLE_V5_HYBRID',
        speechTimeline:[{start_sec:0.5,end_sec:5.25,exact_text:'Ürün hakkında ayrıntılı bilgi almak için bizimle iletişime geçin.'}],
        authoritativeFacts:{product_id:'product-fixture',approved_spoken_line:'Ürün hakkında ayrıntılı bilgi almak için bizimle iletişime geçin.',
          product_fidelity_contract:{must_preserve:['shape'],forbidden_mutations:['redesign']}},
        logoAsset:{url:'https://fixture.invalid/logo.png'},productAsset:{url:'https://fixture.invalid/product.png'},
      }),
    })
    const response = await createVideoJob(req,{userId:'fixture-user',org:{id:'fixture-org',role:'owner'},supabase} as any)
    const body = await response.json()
    assert.equal(response.status,400)
    assert.equal(body.code,'PRODUCT_REFERENCE_IS_LOGO')
    assert.equal(mutations,0)
  } finally { globalThis.fetch = originalFetch }
})
