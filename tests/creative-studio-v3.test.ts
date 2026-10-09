import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { campaignFactsError, parseCampaignMoney } from '../apps/customer/src/lib/creative/campaign-facts'
import { buildCreativePromptV3 } from '../apps/customer/src/lib/creative/director/brief-v3'
import { compileHistoricalV5 } from '../services/creative-video-orchestrator/src/historical-v5/compiler'
import type { CreativeSnapshot } from '../apps/customer/src/lib/creative/types'
import { canReviewImage, imagePublicationStatus, isImageReviewApproved } from '../apps/customer/src/lib/creative/image-review'

test('V3 images require explicit review with tenant-owned decoded receipt; legacy publication unchanged', () => {
  assert.equal(imagePublicationStatus({creativeDirectorVersion:'V3'}),'needs_review')
  assert.equal(imagePublicationStatus({}),'ready')
  const receipt = {orgId:'org-a',creativeId:'creative-a',decodedImage:true,sha256:'a'.repeat(64),size:100,storagePath:'org-a/image.png',mimeType:'image/png'}
  const input = {orgId:'org-a',creativeId:'creative-a',receipt,storagePath:receipt.storagePath}
  assert.equal(canReviewImage(input),true)
  assert.equal(canReviewImage({...input,orgId:'org-b'}),false)
  assert.equal(canReviewImage({...input,receipt:{...receipt,decodedImage:false}}),false)
  assert.equal(canReviewImage({...input,receipt:{...receipt,sha256:'unknown'}}),false)
  assert.equal(canReviewImage({...input,storagePath:'org-b/image.png'}),false)
  const payload = {creativeDirectorVersion:'V3',imageOutputReceipt:receipt,imageHumanReview:{source:'CUSTOMER_EXPLICIT_REVIEW',identityConfirmed:true,commerceConfirmed:true,reviewerId:'user-a',reviewedAt:'2026-10-09T18:00:00Z',sha256:receipt.sha256}}
  assert.equal(isImageReviewApproved(payload),true)
  assert.equal(isImageReviewApproved({...payload,imageHumanReview:null}),false)
  assert.equal(isImageReviewApproved({...payload,imageHumanReview:{...payload.imageHumanReview,sha256:'b'.repeat(64)}}),false)
  assert.equal(isImageReviewApproved({...payload,imageHumanReview:{...payload.imageHumanReview,commerceConfirmed:false}}),false)
})

test('Turkish money and discount validation fail closed before either provider', () => {
  for (const [raw, amount] of [['1.250,50 TL',1250.5],['1.250 TL',1250],['1250.50',1250.5],['₺250',250]] as const)
    assert.equal(parseCampaignMoney(raw),amount)
  for (const raw of ['100-200 TL','bedava','1,250.00','-50','0','NaN']) assert.equal(parseCampaignMoney(raw),null)
  const facts = {objective:'SALES_OFFER',headline:'Siparişinizi oluşturun',cta:'Bize Yazın',price:'800 TL',oldPrice:'1.000 TL',offer:'%20 indirim'}
  assert.equal(campaignFactsError(facts),null)
  assert.match(campaignFactsError({...facts,offer:'%30 indirim'})!,/uyuşmuyor/)
  assert.match(campaignFactsError({...facts,price:'',offer:''})!,/fiyat veya/)
  assert.match(campaignFactsError({...facts,oldPrice:'700 TL'})!,/yüksek/)
  assert.equal(campaignFactsError({objective:'BRAND_AWARENESS'}),null)
})

test('V3 brief preserves exact commerce, color roles and product identity across independent sectors', () => {
  for (const [name,sector] of [['Bofe Pompa','Tarım'],['Tuğla','İnşaat'],['Döner','Gıda restoran'],['Gül','Çiçek'],['CRM','SaaS yazılım'],['Rulman','Endüstri'],['Seramik Fincan','Yeni bağımsız işletme']]) {
    const snapshot = { companyName:'Katalog İşletmesi',brief:'Doğrulanmış tanıtım',objective:'SALES_OFFER',
      customHeadline:'Benim düzenlediğim başlık',cta:'Benim çağrım',style:'modern',textDensity:'low',aspect:'1:1',
      sector, phones:[],socials:[], brandKit:{name:'Kit Adı',colors:{primary:'#026009',secondary:'#fff',accent:'#b4fe00',text:'#111111',background:'#ffffff'},fonts:{heading:'Inter'},logoPath:'canonical/logo.png'},
      products:[{id:'canonical-product',name,imageUrl:'canonical/product.png',price:'800 TL',oldPrice:'1.000 TL',promo:'%20 indirim'}],
    } as CreativeSnapshot
    const result = buildCreativePromptV3(snapshot)
    assert.match(result.prompt,/800 TL/)
    assert.match(result.prompt,/Benim çağrım/)
    assert.match(result.prompt,/Benim düzenlediğim başlık/)
    assert.match(result.prompt,/#026009/)
    assert.match(result.prompt,/Katalog İşletmesi/)
    assert.doesNotMatch(result.prompt,/ELEGANT_RETAIL|red clay|olive oil|4-ZONE/)
    assert.match(result.prompt,/NOT_VERIFIED/)
  }
})

test('V3 video keeps one physically supported subject and 3 beats; legacy remains three-cut', () => {
  for (const name of ['Tuğla', 'Sırt İlaçlama Pompası', 'Bağımsız Seramik Fincan']) {
    const input={brandName:'Bağımsız İşletme',brief:`${name} tanıtımı`,products:[{name,imageUrl:'canonical/product.png'}],logoUrl:'canonical/logo.png',videoSpeech:true}
    const dialogue='Ürünü yakından inceleyin, bilgi almak için bize yazın.'
    const legacy=compileHistoricalV5(input,dialogue)
    const candidate=compileHistoricalV5({...input,creativeDirectorVersion:'V3'},dialogue)
    assert.equal(legacy.shotPlan.cameraMode,'three_cut')
    assert.equal(candidate.shotPlan.cameraMode,'continuous_take')
    assert.deepEqual(candidate.shotPlan.shots.map(s=>[s.timing.from,s.timing.to]),[[0,2.2],[2.2,5.8],[5.8,8]])
    assert.match(candidate.veoPrompt,/PHYSICAL ACTION CONTRACT:/)
    assert.match(candidate.veoPrompt,/NOT_IMPLEMENTED/)
    assert.doesNotMatch(candidate.shotPlan.shots.map(s=>s.subjectAction).join(' '),/pallets.*loaded|operator is no longer|dispenses.*hydrating|radar business/)
    assert.equal(candidate.veoPrompt.split(dialogue).length-1,1)
    assert.equal(candidate.overlayPlan.subtitles.sourceText,dialogue)
  }
})

test('real embedded PostgreSQL: concurrent render INSERTs, tenant isolation and retry uniqueness', async () => {
  const db = new PGlite()
  try {
    await db.exec(`create schema if not exists public; create table public.jobs (
      id bigint generated always as identity primary key, org_id uuid not null,
      type text not null, payload jsonb not null, status text not null default 'pending');`)
    await db.exec(readFileSync(new URL('../supabase/migrations/20261009190000_creative_render_active_unique.sql',import.meta.url),'utf8'))
    const orgA='00000000-0000-4000-8000-000000000001', orgB='00000000-0000-4000-8000-000000000002'
    const insert=(org:string)=>db.query("insert into jobs(org_id,type,payload) values($1,'creative.render',$2) returning id",[org,JSON.stringify({creative_id:'same-creative'})])
    const concurrent=await Promise.allSettled(Array.from({length:12},()=>insert(orgA)))
    assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1)
    assert.equal(concurrent.filter(r=>r.status==='rejected' && (r.reason as any).code==='23505').length,11)
    await insert(orgB)
    assert.equal((await db.query('select * from jobs')).rows.length,2)
    await db.query("update jobs set status='failed' where org_id=$1",[orgA])
    await insert(orgA)
    await assert.rejects(insert(orgA),(e:any)=>e.code==='23505')
    assert.equal((await db.query("select * from jobs where status='pending' and org_id=$1",[orgA])).rows.length,1)
  } finally { await db.close() }
})
