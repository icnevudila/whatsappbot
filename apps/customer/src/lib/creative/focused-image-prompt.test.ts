import test from 'node:test'
import assert from 'node:assert/strict'
import {buildFocusedImagePrompt} from './focused-image-prompt'
import {buildBrandKitImagePrompt} from './brand-kit-image-prompt'
import type {CreativeSnapshot} from './types'
const sample:CreativeSnapshot={brief:'Instagram kampanyası oluştur.',style:'auto',formatId:'feed',aspect:'4:5',textDensity:'balanced',useLogo:true,labels:[],cta:'Bilgi alın',address:null,website:'example.com',dateRange:null,customText:null,phones:[],socials:[],brandKit:{id:'k',name:'Örnek',colors:{primary:'#112233'},fonts:{},logoPath:'/logo.png'},products:[{id:'p',name:'Kavanoz',description:'450 g',boxContents:null,imageUrl:'/jar.png',price:'300 TL',oldPrice:null,promo:null,extra:null,include:{name:true,image:true,description:true,boxContents:false,price:false,promo:false}}],baseCreativeId:null}
test('focused experiment preserves the exact factual and reference brief while removing competing art prescriptions',()=>{
 for(const mode of ['SMART_CAMPAIGN','SHOWSTOPPER_CAMPAIGN','CONCEPT_CAMPAIGN'] as const){
  const s={...sample,styleMode:mode}
  const {artDirection:_discard,...expected}=JSON.parse(buildBrandKitImagePrompt(s).prompt.split('\n').at(-1)!)
  const result=buildFocusedImagePrompt(s)
  assert.deepEqual(JSON.parse(result.prompt.split('\n').at(-1)!),expected)
  assert.ok(result.prompt.length<buildBrandKitImagePrompt(s).prompt.length/2)
  assert.ok(!result.prompt.includes('300 TL'))
 }
})
test('selected scene and revision constraints survive the focused path',()=>{
 const s={...sample,generationType:'revision',baseCreativeId:'parent',creativePlan:{source:'AI',scene:{environment:'Kil kıvrımları',composition:'Referans ürün merkezde'}}}
 const result=buildFocusedImagePrompt(s)
 assert.deepEqual(JSON.parse(result.prompt.split('\n').at(-1)!).plannedScene,s.creativePlan.scene)
 assert.match(result.prompt,/yalnız istenen değişikliği/)
})
