import test from 'node:test'
import assert from 'node:assert/strict'
import { buildBrandKitImagePrompt } from './brand-kit-image-prompt'
import { requiredImageAssets } from './required-image-assets'
import { STYLE_MODES } from './style-mode'
import { buildCreativePrompt } from './prompt'
import type { CreativeSnapshot } from './types'

export const sample: CreativeSnapshot={imagePromptVersion:'BRAND_KIT_V1',promotionMode:'brand',companyName:'Veri Burada',companyAbout:'İl ve sektöre göre işletme listeleri.',
  brief:'İşletmeleri keşfedin.',customHeadline:'Bir şehir. Binlerce olasılık.',customSupporting:'İl ve sektör seçin.',style:'auto',styleMode:'SMART_CAMPAIGN',formatId:'feed',aspect:'4:5',textDensity:'low',
  useLogo:true,labels:['CSV listeleri'],cta:'Örnek listeleri incele',address:'Bursa',website:'veriburada.com',dateRange:'4–10 Kasım',customText:null,
  phones:[{id:'1',label:'Bilgi',phone:'+905550001122'}],socials:[{id:'2',platform:'instagram',label:null,url:'https://instagram.com/veriburada'}],
  brandKit:{id:'kit',name:'Veri Burada',tone:'Net',colors:{primary:'#006B45',accent:'#9AD439'},fonts:{heading:'Inter'},logoPath:'/logo.png'},products:[],baseCreativeId:null,
  deliveryInfo:'Online teslim',stockInfo:'Seçili listeler',urgencyInfo:'Bu hafta',primaryBenefits:['İl ve sektör seçimi']}
test('exactly two visible modes; logo-only introduces an offering without fabricated assets',()=>{
  assert.deepEqual(STYLE_MODES.map(x=>x.id),['SMART_CAMPAIGN','SHOWSTOPPER_CAMPAIGN'])
  const result=buildBrandKitImagePrompt(sample)
  assert.match(result.prompt,/product photo is optional/)
  assert.ok(result.prompt.length<3500)
  for(const text of ['#006B45','#9AD439','Bir şehir. Binlerce olasılık.','İl ve sektör seçin.','Örnek listeleri incele','veriburada.com','+905550001122','Bursa','4–10 Kasım','Online teslim','Seçili listeler','Bu hafta','İl ve sektör seçimi']) assert.ok(result.prompt.includes(text),text)
})
test('campaign emphasizes actions and retains offering price, promotion and details',()=>{
  const product={id:'p',name:'Pompa',description:'10 litre',boxContents:'Lans',imageUrl:null,price:'999 TL',oldPrice:'1200 TL',promo:'Sezon fırsatı',extra:'Bilgi alın',include:{name:true,image:true,description:true,boxContents:true,price:true,promo:true}}
  const result=buildBrandKitImagePrompt({...sample,promotionMode:'offering',styleMode:'SHOWSTOPPER_CAMPAIGN',products:[product]})
  for(const text of ['product campaign','CTA hierarchy','999 TL','1200 TL','Sezon fırsatı','10 litre','Lans','Bilgi alın']) assert.ok(result.prompt.includes(text),text)
  assert.match(result.prompt,/energetic retail campaign/)
  assert.match(result.prompt,/dimensional\/extruded lettering/)
  assert.match(result.prompt,/Never add fake discount badges/)
  assert.doesNotMatch(result.prompt,/No default desk\/coffee\/plant/)
  assert.equal(requiredImageAssets({useLogo:true,hasLogo:true,hasProductReference:false,hasValidBase:false,optionalProductReference:true}).ready,true)
  assert.equal(requiredImageAssets({useLogo:true,hasLogo:false,hasProductReference:false,hasValidBase:false,optionalProductReference:true}).ready,false)
})
test('missing logo or palette cannot silently generate a different identity',()=>{
  assert.throws(()=>buildBrandKitImagePrompt({...sample,useLogo:false}),/LOGO/)
  assert.throws(()=>buildBrandKitImagePrompt({...sample,brandKit:{...sample.brandKit!,colors:{primary:'invalid'}}}),/COLORS/)
})
test('the production compiler selects the compact brief even when old director mode is requested',()=>{
  const compiled=buildCreativePrompt(sample,{mode:'V3'})
  assert.deepEqual(compiled,buildBrandKitImagePrompt(sample))
  assert.match(compiled.prompt,/Logo swapping must NOT/)
  assert.doesNotMatch(compiled.prompt,/Upper Canvas|Central Hero|SCENE & COLLABORATION/)
})
test('identical brief and headline are sent only once without dropping distinct copy',()=>{
  const same=buildBrandKitImagePrompt({...sample,brief:sample.customHeadline!}).prompt
  assert.equal(same.split(sample.customHeadline!).length-1,1)
  const different=buildBrandKitImagePrompt({...sample,brief:'Yeni sezon ürünleri'}).prompt
  assert.ok(different.includes('Yeni sezon ürünleri'))
})
