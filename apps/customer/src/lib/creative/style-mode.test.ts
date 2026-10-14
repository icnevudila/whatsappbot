import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeStyleMode, styleModeDirective } from './style-mode'
import { buildCreativePrompt } from './prompt'
import { buildImagePromptV2 } from './v2/image-prompt-v2'
import { adaptLegacyDraftToV2 } from './v2/adapter'
import { buildDeterministicFallbackPlan } from './v2/ai-planner'
import { inheritVariationContext } from './variation-context'
import { selectVisualDiversityPlan } from './visual-diversity'
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

test('defaults to SMART_CAMPAIGN and valid explicit modes normalize accurately', () => {
  for (const value of [undefined, null, '', 'unknown']) assert.equal(normalizeStyleMode(value), 'SMART_CAMPAIGN')
  assert.equal(normalizeStyleMode('SMART_CAMPAIGN'), 'SMART_CAMPAIGN')
  assert.equal(normalizeStyleMode('SHOWSTOPPER_CAMPAIGN'), 'SHOWSTOPPER_CAMPAIGN')
  assert.equal(normalizeStyleMode('grand_campaign'), 'SHOWSTOPPER_CAMPAIGN')
  assert.equal(normalizeStyleMode('REAL_LIFE_CAMPAIGN'), 'REAL_LIFE_CAMPAIGN')
  assert.equal(normalizeStyleMode('real_life'), 'REAL_LIFE_CAMPAIGN')
  assert.equal(normalizeStyleMode('PREMIUM_SHOWCASE'), 'PREMIUM_SHOWCASE')
  assert.equal(normalizeStyleMode('professional'), 'PREMIUM_SHOWCASE')

  const restored = adaptLegacyDraftToV2({styleMode:'SHOWSTOPPER_CAMPAIGN',productIds:['p1']}, ['p1'])
  assert.equal(restored.styleMode, 'SHOWSTOPPER_CAMPAIGN')
  assert.equal(restored.heroProductId, 'p1')
})

test('planner fallback honors smart ad mode direction without changing video or inventing an offer', () => {
  const input = {brandName:'Bofe',productName:'Pompa',objective:'PRODUCT_INTRO',stylePreset:'AUTO',styleMode:'SHOWSTOPPER_CAMPAIGN'} as const
  const image = buildDeterministicFallbackPlan({...input,mediaType:'IMAGE'})
  assert.match(image.scene.composition,/Büyük/)
  assert.equal(image.copy.price_tag,undefined)
  assert.equal(image.copy.discount_badge,undefined)
  const video = buildDeterministicFallbackPlan({...input,mediaType:'VIDEO'})
  assert.match(video.scene.composition,/dengeli reklam/)
})

test('each image compiler honors the 4 modes and retains supplied copy and direction', () => {
  for (const mode of ['LEGACY_SIMPLE','OVER_DIRECTED_DESIGNER','V3'] as const) {
    const smart = buildCreativePrompt({...snapshot,styleMode:'SMART_CAMPAIGN'}, {mode}).prompt
    const show = buildCreativePrompt({...snapshot,styleMode:'SHOWSTOPPER_CAMPAIGN'}, {mode}).prompt
    const real = buildCreativePrompt({...snapshot,styleMode:'REAL_LIFE_CAMPAIGN'}, {mode}).prompt
    const prem = buildCreativePrompt({...snapshot,styleMode:'PREMIUM_SHOWCASE'}, {mode}).prompt

    assert.match(smart, /Smart Adaptive Commercial Campaign/)
    assert.match(smart, /original aspect ratio as a flat, front-facing panel/)
    assert.doesNotMatch(smart, /Integrate dynamic communication energy: floating/)
    assert.match(show, /Showstopper Grand Commercial Campaign/)
    assert.match(real, /Authentic Real-Life Commercial/)
    assert.match(prem, /Premium Showcase Commercial/)

    for (const prompt of [smart, show, real, prem]) {
      assert.ok(prompt.includes(snapshot.customHeadline!))
      assert.ok(prompt.includes(snapshot.instruction!))
      assert.match(prompt, /explicit user design request takes precedence/)
      assert.match(prompt, /canonical product\/logo identity/)
    }
  }
})

test('user meta scene instruction like bol bol yazı olsun is sanitized and treated as technical guidance', () => {
  const metaSnapshot = {
    ...snapshot,
    instruction: 'bol bol yazı olsun ve ürün sağda dursun',
  }
  const result = buildCreativePrompt(metaSnapshot)
  assert.match(result.prompt, /TECHNICAL TYPOGRAPHY DENSITY/)
  assert.match(result.prompt, /ürün sağda dursun/)
  assert.match(result.negative, /no literal transcription of user instructions/)
})

test('locked-copy V2 also receives the mode without requiring a generated plan', () => {
  const compiled = buildImagePromptV2({brandName:'Bofe',productName:'Pompa',
    stylePreset:'AUTO',styleMode:'SMART_CAMPAIGN',format:'STORY_9_16',hasLogoRef:true,hasProductRef:true})
  assert.match(compiled.prompt, /Smart Adaptive Commercial Campaign/)
})

test('variation inherits parent mode or changes it explicitly without inheriting job state', () => {
  const parent = {...snapshot,styleMode:'SMART_CAMPAIGN',imageJob:{id:'old-job'}} as CreativePayload
  const inherited = inheritVariationContext({},parent)
  assert.equal(inherited.styleMode,'SMART_CAMPAIGN')
  assert.equal(inherited.imageJob,undefined)
  assert.equal(inheritVariationContext({styleMode:'SHOWSTOPPER_CAMPAIGN'},parent).styleMode,'SHOWSTOPPER_CAMPAIGN')
})

test('smart variation rotates composition family for new_composition and enhances for enhance', () => {
  const parentPlan = selectVisualDiversityPlan({
    requestKey: 'initial-key',
    subject: 'software',
    styleMode: 'campaign_bold',
  })
  assert.ok(parentPlan)

  const newCompPlan = selectVisualDiversityPlan({
    requestKey: 'var-key-1',
    subject: 'software',
    generationType: 'variation',
    variationMode: 'new_composition',
    parent: parentPlan,
  })
  assert.ok(newCompPlan)
  assert.notEqual(newCompPlan.family, parentPlan.family, 'New composition MUST not repeat parent family')

  const enhancedPlan = selectVisualDiversityPlan({
    requestKey: 'var-key-2',
    subject: 'software',
    generationType: 'variation',
    variationMode: 'enhance',
    parent: parentPlan,
  })
  assert.ok(enhancedPlan)
  assert.equal(enhancedPlan.family, parentPlan.family, 'Enhance mode MUST keep parent family')
  assert.equal(enhancedPlan.enhancement, true)
})
