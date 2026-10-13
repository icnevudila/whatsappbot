import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeStyleMode, styleModeDirective } from './style-mode'
import { buildCreativePrompt } from './prompt'
import { buildImagePromptV2 } from './v2/image-prompt-v2'
import { adaptLegacyDraftToV2 } from './v2/adapter'
import { buildDeterministicFallbackPlan } from './v2/ai-planner'
import { inheritVariationContext } from './variation-context'
import type { CreativeSnapshot, CreativePayload } from './types'

const snapshot: CreativeSnapshot = {
  brief: '16L Akülü Sırt Tipi İlaçlama Pompası', style: 'auto', formatId: 'wa', aspect: '1:1',
  textDensity: 'balanced', useLogo: true, labels: [], cta: 'Hemen İnceleyin',
  address: null, website: null, dateRange: null, customText: null, phones: [], socials: [],
  brandKit: null, baseCreativeId: null, instruction: 'Zeytinlikte ürünü sağda göster.',
  customHeadline: 'Bahçeniz İçin Hazır', sector: 'Tarım',
  products: [{id:'p1',name:'16L Akülü Sırt Tipi İlaçlama Pompası',description:null,
    boxContents:null,imageUrl:'https://example.com/product.png',price:null,oldPrice:null,
    promo:null,extra:null,include:{name:true,description:true,price:true,promo:true,image:true,boxContents:false}}],
}

test('legacy drafts default to balanced and valid explicit modes survive restore', () => {
  for (const value of [undefined, null, '', 'unknown']) assert.equal(normalizeStyleMode(value), 'balanced_modern')
  const restored = adaptLegacyDraftToV2({styleMode:'campaign_bold',productIds:['p1']}, ['p1'])
  assert.equal(restored.styleMode, 'campaign_bold')
  assert.equal(restored.heroProductId, 'p1')
})

test('planner fallback honors campaign direction without changing video or inventing an offer', () => {
  const input = {brandName:'Bofe',productName:'Pompa',objective:'PRODUCT_INTRO',stylePreset:'AUTO',styleMode:'campaign_bold'} as const
  const image = buildDeterministicFallbackPlan({...input,mediaType:'IMAGE'})
  assert.match(image.scene.composition,/Büyük başlık/)
  assert.equal(image.copy.price_tag,undefined)
  assert.equal(image.copy.discount_badge,undefined)
  const video = buildDeterministicFallbackPlan({...input,mediaType:'VIDEO'})
  assert.match(video.scene.composition,/dengeli reklam/)
})

test('each image compiler honors the mode and retains supplied copy and direction', () => {
  for (const mode of ['LEGACY_SIMPLE','OVER_DIRECTED_DESIGNER','V3'] as const) {
    const balanced = buildCreativePrompt({...snapshot,styleMode:'balanced_modern'}, {mode}).prompt
    const bold = buildCreativePrompt({...snapshot,styleMode:'campaign_bold'}, {mode}).prompt
    assert.match(balanced, /Balanced modern advertising/)
    assert.match(bold, /Energetic professional campaign poster/)
    for (const prompt of [balanced,bold]) {
      assert.ok(prompt.includes(snapshot.customHeadline!))
      assert.ok(prompt.includes(snapshot.instruction!))
      assert.match(prompt, /explicit user design request takes precedence/)
      assert.match(prompt, /canonical product\/logo identity/)
    }
  }
})

test('locked-copy V2 also receives the mode without requiring a generated plan', () => {
  const compiled = buildImagePromptV2({brandName:'Bofe',productName:'Pompa',
    stylePreset:'AUTO',styleMode:'campaign_bold',format:'STORY_9_16',hasLogoRef:true,hasProductRef:true})
  assert.match(compiled.prompt, /Energetic professional campaign poster/)
})

test('variation inherits parent mode or changes it explicitly without inheriting job state', () => {
  const parent = {...snapshot,styleMode:'campaign_bold',imageJob:{id:'old-job'}} as CreativePayload
  const inherited = inheritVariationContext({},parent)
  assert.equal(inherited.styleMode,'campaign_bold')
  assert.equal(inherited.imageJob,undefined)
  assert.equal(inheritVariationContext({styleMode:'balanced_modern'},parent).styleMode,'balanced_modern')
})

test('campaign direction limits mockups to actual screenshots and supplied offer facts', () => {
  const direction = styleModeDirective('campaign_bold')
  assert.match(direction,/ONLY when present/)
  assert.match(direction,/authentic supplied screenshot/)
  assert.match(direction,/never invent UI, metrics, customer messages or features/)
})
