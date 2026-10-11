import test from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { promotionPolicyError, promotionMode, BRAND_VIDEO_UNAVAILABLE } from '../apps/customer/src/lib/creative/promotion-policy'
import { requiredImageAssets } from '../apps/customer/src/lib/creative/required-image-assets'
import { ownsStudioDraft } from '../apps/customer/src/lib/creative/draft-ownership'
import { buildCreativePromptV3 } from '../apps/customer/src/lib/creative/director/brief-v3'
import { createVideoJob } from '../apps/customer/src/lib/creative/video-job-service'
import type { CreativeSnapshot } from '../apps/customer/src/lib/creative/types'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import * as crypto from 'node:crypto'
import * as policy from '../apps/customer/src/lib/creative/promotion-policy'
import * as campaignFacts from '../apps/customer/src/lib/creative/campaign-facts'
import * as creativeTypes from '../apps/customer/src/lib/creative/types'
import * as wizardTypes from '../apps/customer/src/app/(panel)/icerik/wizard-types'

test('Actual server action accepts brand logo-only snapshot without catalog mutation; offering still requires true reference',async()=>{
  const orgId='00000000-0000-4000-8000-000000000001'
  const inserted:Array<Record<string,any>>=[],queued:Array<unknown>=[]
  const supabase={from(table:string){
    const query:any={select(){return this},eq(){return this},contains(){return this},in(){return this},order(){return this},limit(){return this},gte(){return this},
      insert(row:Record<string,unknown>){assert.equal(table,'creatives','Brand must not create fake catalog/product-knowledge rows');inserted.push(row);return this},
      single:async()=>({data:{id:'new-creative'},error:null}),
      maybeSingle:async()=>({data:table==='brand_kits'?{id:'verified-kit',name:'Verified Brand',colors:{primary:'#2f5bff'},fonts:{},tone:null,logo_path:`${orgId}/logo.png`}
        :table==='organizations'?{name:'Server Verified Brand',about:'Server Verified Company Facts',logo_path:`${orgId}/logo.png`,monthly_video_quota:5}:null,error:null}),
      then(resolve:(value:unknown)=>unknown){return Promise.resolve({data:[],count:0,error:null}).then(resolve)},
    };return query
  }}
  const aliases:Record<string,unknown>={
    'next/server':{after:()=>{}},'next/cache':{revalidatePath:()=>{}},'next/navigation':{redirect:()=>{}},'node:crypto':crypto,
    '@/lib/jobs':{enqueueJob:async(value:unknown)=>{queued.push(value);return {error:null}}},
    '@/lib/creative/campaign-facts':campaignFacts,'@/lib/creative/types':creativeTypes,'./wizard-types':wizardTypes,
    '@/lib/creative/promotion-policy':policy,'@/lib/creative/required-image-assets':{requiredImageAssets},
    '@/lib/org':{isOrgAdminRole:(role:string)=>role==='admin',requireActiveOrg:async()=>({userId:'verified-user',org:{id:orgId,name:'Verified Brand',role:'admin'},supabase})},
    '@/lib/ai/image':{hasImageProvider:()=>true},'@/lib/creative/prompt':{deriveVerifiedCampaignData:()=>({})},
    '@/lib/ai/campaign-message':{generateCampaignWhatsAppMessage:()=>''},
  }
  const src=readFileSync('apps/customer/src/app/(panel)/icerik/actions.ts','utf8')
  const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  const exports:Record<string,any>={}
  vm.runInNewContext(js,{exports,console,FormData,Date,process:{env:{NODE_ENV:'production'}},require:(name:string)=>aliases[name] || {}})
  const form=new FormData();form.set('draft',JSON.stringify({promotionMode:'brand',brief:'Doğrulanmış marka tanıtımı',useLogo:true,productIds:[],formatId:'wa'}))
  const result=await exports.startCreativeGeneration(null,form)
  assert.equal(result.id,'new-creative');assert.equal(inserted.length,1);assert.equal(queued.length,1)
  const payload=inserted[0].payload
  assert.equal(payload.promotionMode,'brand');assert.equal(payload.products.length,0)
  assert.equal(payload.companyName,'Server Verified Brand');assert.equal(payload.companyAbout,'Server Verified Company Facts')
  assert.equal(payload.objective,'BRAND_AWARENESS');assert.equal(payload.useLogo,true)
  const physical=new FormData();physical.set('draft',JSON.stringify({promotionMode:'offering',brief:'Gerçek ürün tanıtımı',useLogo:true,productIds:[],formatId:'wa'}))
  assert.match((await exports.startCreativeGeneration(null,physical)).error,/gerçek arayüz|Ürün fotoğrafı/)
  assert.equal(inserted.length,1);assert.equal(queued.length,1)
})

test('Only explicit brand mode permits logo-only; missing logo and physical offering still fail',()=>{
  const input={mode:'brand' as const,video:false,hasLogo:true,hasOfferingReference:false,hasOfferingSelection:false,hasBase:false}
  assert.equal(promotionPolicyError(input),null)
  assert.ok(promotionPolicyError({...input,hasLogo:false}))
  assert.ok(promotionPolicyError({...input,mode:'offering'}))
  assert.equal(promotionPolicyError({...input,mode:'offering',hasOfferingReference:true}),null)
  assert.equal(promotionMode('BRAND_AWARENESS'),'offering')
  assert.ok(requiredImageAssets({useLogo:true,hasLogo:true,hasProductReference:false,hasValidBase:false,promotionMode:'brand'}).ready)
  assert.ok(!requiredImageAssets({useLogo:true,hasLogo:true,hasProductReference:false,hasValidBase:false,promotionMode:'offering'}).ready)
})
test('Brand cannot smuggle products/base refs; provider contract blocks logo-only video',()=>{
  const input={mode:'brand' as const,video:false,hasLogo:true,hasOfferingReference:false,hasOfferingSelection:false,hasBase:false}
  assert.ok(promotionPolicyError({...input,hasOfferingSelection:true}))
  assert.ok(promotionPolicyError({...input,hasBase:true}))
  assert.equal(promotionPolicyError({...input,video:true}),BRAND_VIDEO_UNAVAILABLE)
})
test('Brand drafts survive reload only for the same tenant and with no fake product identity',()=>{
  assert.ok(ownsStudioDraft({orgId:'a',promotionMode:'brand',heroProductId:''},'a',[]))
  assert.ok(!ownsStudioDraft({orgId:'b',promotionMode:'brand',heroProductId:''},'a',[]))
  assert.ok(!ownsStudioDraft({orgId:'a',promotionMode:'brand',heroProductId:'fake'},'a',['fake']))
})
test('Brand prompt treats logo as identity, no invented product; true company facts retained',()=>{
  const snapshot={promotionMode:'brand',companyName:'Fixture SaaS',companyAbout:'Kayıtlı işletme açıklaması',brief:'Markamızı tanıtın',
    style:'modern',aspect:'1:1',products:[],baseCreativeId:null,useLogo:true,phones:[],socials:[],objective:'BRAND_AWARENESS'} as unknown as CreativeSnapshot
  const result=buildCreativePromptV3(snapshot)
  assert.match(result.prompt,/NOT a product photograph/);assert.match(result.prompt,/"productDNA":null/)
  assert.match(result.prompt,/Kayıtlı işletme açıklaması/)
  assert.throws(()=>buildCreativePromptV3({...snapshot,products:[{id:'fake'}] as any}),/BRAND_REFERENCE_CONFLICT/)
})
test('Actual video create API refuses brand before catalog/quota/write/provider calls',async()=>{
  const req=new NextRequest('https://app.invalid/api/ai-media/jobs',{method:'POST',body:JSON.stringify({promotionMode:'brand'})})
  const response=await createVideoJob(req,{userId:'fixture',org:{id:'tenant',role:'owner'},supabase:{from(){throw new Error('No DB calls allowed')}}} as any)
  assert.equal(response.status,422);assert.equal((await response.json()).error,BRAND_VIDEO_UNAVAILABLE)
})
