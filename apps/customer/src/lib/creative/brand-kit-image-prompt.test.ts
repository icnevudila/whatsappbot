import test from 'node:test'
import assert from 'node:assert/strict'
import { buildBrandKitImagePrompt } from './brand-kit-image-prompt'
import { requiredImageAssets } from './required-image-assets'
import { STYLE_MODES, normalizeImageStyleMode, normalizeStyleMode } from './style-mode'
import { buildCreativePrompt } from './prompt'
import type { CreativeSnapshot } from './types'

export const sample: CreativeSnapshot={imagePromptVersion:'BRAND_KIT_V1',promotionMode:'brand',companyName:'Veri Burada',companyAbout:'İl ve sektöre göre işletme listeleri.',
  brief:'İşletmeleri keşfedin.',customHeadline:'Bir şehir. Binlerce olasılık.',customSupporting:'İl ve sektör seçin.',style:'auto',styleMode:'SMART_CAMPAIGN',formatId:'feed',aspect:'4:5',textDensity:'low',
  useLogo:true,labels:['CSV listeleri'],cta:'Örnek listeleri incele',address:'Bursa',website:'veriburada.com',dateRange:'4–10 Kasım',customText:null,
  phones:[{id:'1',label:'Bilgi',phone:'+905550001122'}],socials:[{id:'2',platform:'instagram',label:null,url:'https://instagram.com/veriburada'}],
  brandKit:{id:'kit',name:'Veri Burada',tone:'Net',colors:{primary:'#006B45',accent:'#9AD439'},fonts:{heading:'Inter'},logoPath:'/logo.png'},products:[],baseCreativeId:null,
  deliveryInfo:'Online teslim',stockInfo:'Seçili listeler',urgencyInfo:'Bu hafta',primaryBenefits:['İl ve sektör seçimi']}
test('three visible modes; logo-only introduces an offering without fabricated assets',()=>{
  assert.deepEqual(STYLE_MODES.map(x=>x.id),['SMART_CAMPAIGN','SHOWSTOPPER_CAMPAIGN','CONCEPT_CAMPAIGN'])
  const result=buildBrandKitImagePrompt(sample)
  assert.match(result.prompt,/Without a product photo/)
  assert.ok(result.prompt.length<10000, 'one bounded production brief, not the legacy director stack')
  for(const text of ['#006B45','#9AD439','Bir şehir. Binlerce olasılık.','İl ve sektör seçin.','Örnek listeleri incele','veriburada.com','+905550001122','Bursa','4–10 Kasım','Online teslim','Seçili listeler','Bu hafta','İl ve sektör seçimi']) assert.ok(result.prompt.includes(text),text)
})

test('mode contract separates advertising goals and keeps exact hero references and revision scope',()=>{
 const products=[{id:'first',name:'Kupa',description:null,boxContents:null,imageUrl:'https://example.com/first.jpg',price:null,oldPrice:null,promo:null,extra:null,include:{name:true,image:true,description:false,boxContents:false,price:false,promo:false}},{id:'hero',name:'Tabak',description:null,boxContents:null,imageUrl:'https://example.com/hero.jpg',price:null,oldPrice:null,promo:null,extra:null,include:{name:true,image:true,description:false,boxContents:false,price:false,promo:false}}]
 const contracts=['SMART_CAMPAIGN','SHOWSTOPPER_CAMPAIGN','CONCEPT_CAMPAIGN'].map(styleMode=>JSON.parse(buildBrandKitImagePrompt({...sample,styleMode:styleMode as CreativeSnapshot['styleMode'],products,heroProductId:'hero'}).prompt.split('\n').at(-1)!).artDirection)
 assert.deepEqual(contracts.map(c=>c.mode),['brand','campaign','concept'])
 assert.equal(new Set(contracts.map(c=>c.intent)).size,3)
 for(const contract of contracts){assert.equal(contract.identity.heroProductId,'hero');assert.deepEqual(contract.identity.referenceProductIds,['first','hero']);assert.match(contract.production.facts,/excluded price/);assert.match(contract.production.review,/not evidence/)}
 const revision=JSON.parse(buildBrandKitImagePrompt({...sample,generationType:'revision',baseCreativeId:'parent'}).prompt.split('\n').at(-1)!).artDirection
 assert.match(revision.revision,/preserve everything else/)
})

test('concept choice survives normalization and preserves product facts without manufacturing claims',()=>{
  assert.equal(normalizeStyleMode('CONCEPT_CAMPAIGN'),'CONCEPT_CAMPAIGN')
  assert.equal(normalizeImageStyleMode('CONCEPT_CAMPAIGN'),'CONCEPT_CAMPAIGN')
  assert.equal(normalizeImageStyleMode('unknown'),'SMART_CAMPAIGN')
  const product={id:'honey',name:'Çiçek balı',description:'450 g, cam kavanoz',boxContents:null,imageUrl:'https://example.com/jar.jpg',price:null,oldPrice:null,promo:null,extra:null,include:{name:true,image:true,description:true,boxContents:false,price:false,promo:false}}
  const result=buildCreativePrompt({...sample,styleMode:'CONCEPT_CAMPAIGN',products:[product],customHeadline:'Sofranızda bir kaşık mutluluk.'})
  const brief=JSON.parse(result.prompt.split('\n').at(-1)!)
  assert.match(result.prompt,/CONCEPT ADVERTISING/)
  assert.match(result.prompt,/exact supplied packaging/)
  assert.match(result.prompt,/At most three compact supporting fact medallions/)
  assert.match(result.prompt,/never invent organic\/health/)
  assert.equal(brief.requiredProductInformation[0].description,'450 g, cam kavanoz')
  assert.equal(brief.copy.commerce[0].price,undefined)
  assert.doesNotMatch(result.negative,/icon-feature strip/)
  assert.equal(normalizeImageStyleMode('REAL_LIFE_CAMPAIGN'),'SMART_CAMPAIGN')
})
test('campaign emphasizes actions and retains offering price, promotion and details',()=>{
  const product={id:'p',name:'Pompa',description:'10 litre',boxContents:'Lans',imageUrl:null,price:'999 TL',oldPrice:'1200 TL',promo:'Sezon fırsatı',extra:'Bilgi alın',include:{name:true,image:true,description:true,boxContents:true,price:true,promo:true}}
  const result=buildBrandKitImagePrompt({...sample,promotionMode:'offering',styleMode:'SHOWSTOPPER_CAMPAIGN',products:[product]})
  for(const text of ['product campaign','CTA hierarchy','999 TL','1200 TL','Sezon fırsatı','10 litre','Lans','Bilgi alın']) assert.ok(result.prompt.includes(text),text)
  assert.match(result.prompt,/energetic retail campaign/)
  assert.match(result.prompt,/dimensional\/extruded lettering/)
  assert.match(result.prompt,/never add fake discount badges/i)
  assert.match(result.prompt,/ONE memorable visual idea/)
  assert.match(result.prompt,/rather than six equal feature cards/)
  assert.doesNotMatch(result.prompt,/No default desk\/coffee\/plant/)
  const serialized=JSON.parse(result.prompt.split('\n').at(-1)!)
  assert.equal(serialized.requiredProductInformation[0].description,'10 litre')
  assert.equal(serialized.copy.commerce[0].price,'999 TL')
  assert.equal(serialized.copy.commerce[0].offer,'Sezon fırsatı')
  assert.match(result.prompt,/Every distinct fact in requiredProductInformation/)
  assert.match(result.prompt,/instead of printing both the source paragraph and repeated badges/)
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

test('a short customer command stays context while the model receives visual art direction',()=>{
  const result=buildCreativePrompt({...sample,brief:'Instagram kampanyası oluştur.',customHeadline:null,customSupporting:null,cta:null})
  const data=JSON.parse(result.prompt.split('\n').at(-1)!)
  assert.equal(data.request,'Instagram kampanyası oluştur.')
  assert.equal(data.copy.brief,undefined)
  assert.match(result.prompt,/not mandatory printed copy/)
  assert.match(result.prompt,/Low text density means fewer words, NOT low visual ambition/)
  assert.match(result.prompt,/commissioned photograph grounded in the actual material/)
  assert.match(result.prompt,/never impose one on every brand/)
})

test('density and offering intent survive the production compiler without becoming printed copy',()=>{
  for (const density of ['low','balanced','detailed'] as const) {
    const result=buildCreativePrompt({...sample,textDensity:density,offeringKind:'software'})
    const brief=JSON.parse(result.prompt.split('\n').at(-1)!)
    assert.deepEqual(brief.format,{aspect:'4:5',textDensity:density,offeringKind:'software',promotionMode:'brand'})
    assert.match(result.prompt,/TEXT DENSITY/)
    assert.match(result.prompt,/no fabricated UI/)
    assert.match(result.prompt,/Direction and brand background are context, not printed copy/)
  }
})

test('the selected AI scene reaches the active compiler without importing a generic fallback',()=>{
  const scene={environment:'Terracotta mimari avlu',composition:'Önde gerçek tuğla; arkada ışıklı kemer',lighting:'Soldan gelen gün ışığı'}
  const prompt=buildCreativePrompt({...sample,creativePlan:{source:'AI',scene}}).prompt
  assert.deepEqual(JSON.parse(prompt.split('\n').at(-1)!).plannedScene,scene)
  const fallback=buildCreativePrompt({...sample,creativePlan:{source:'DETERMINISTIC_FALLBACK',scene}}).prompt
  assert.equal(JSON.parse(fallback.split('\n').at(-1)!).plannedScene,undefined)
})

test('campaign focus uses supplied commerce or delivery facts and respects excluded price fields',()=>{
  const product={id:'p',name:'Tuğla',description:null,boxContents:null,imageUrl:null,price:'999 TL',oldPrice:null,promo:'%10 indirim',extra:null,include:{name:true,image:false,description:false,boxContents:false,price:true,promo:true}}
  const compile=(p:typeof product)=>JSON.parse(buildCreativePrompt({...sample,styleMode:'SHOWSTOPPER_CAMPAIGN',deliveryInfo:'3 gün içinde teslim',products:[p]}).prompt.split('\n').at(-1)!).campaignFocus
  assert.deepEqual(compile(product),{kind:'offer',text:'%10 indirim'})
  assert.deepEqual(compile({...product,include:{...product.include,promo:false}}),{kind:'price',text:'999 TL'})
  assert.deepEqual(compile({...product,include:{...product.include,promo:false,price:false}}),{kind:'delivery',text:'3 gün içinde teslim'})
})

test('professional direction cannot replace factual completeness, product identity or revision intent',()=>{
  const s={...sample,generationType:'revision',baseCreativeId:'parent',instruction:'Yalnız başlığı değiştir.',textDensity:'low' as const}
  const result=buildBrandKitImagePrompt(s)
  assert.match(result.prompt,/change only the requested details/)
  assert.match(result.prompt,/Every distinct fact in requiredProductInformation/)
  assert.match(result.prompt,/real product photograph overrides prose/)
  assert.match(result.prompt,/Never invent offers, prices, contacts, specifications, awards or certifications/)
  assert.match(result.prompt,/PRODUCTION FLOOR/)
  assert.match(result.negative,/fake awards\/certifications\/UI/)
  const brief=JSON.parse(result.prompt.split('\n').at(-1)!)
  assert.equal(brief.direction,s.instruction)
  assert.equal(brief.copy.headline,s.customHeadline)
  assert.equal(brief.copy.phones[0].phone,s.phones[0].phone)
})
