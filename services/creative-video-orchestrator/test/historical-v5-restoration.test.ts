import test from 'node:test'
import assert from 'node:assert/strict'
import { compileHistoricalV5 } from '../src/historical-v5/compiler.js'
import { buildHistoricalDirectorPrompt } from '../src/historical-v5/director-prompt.js'
import { finalizeHistoricalProviderPrompt } from '../src/historical-v5/provider-prompt.js'

const approved = 'Ürünümüzü yakından inceleyin, siparişinizi oluşturmak için bugün bize yazın.'
const input = {
  brandName: 'Bofe',
  brief: 'Bofe Otomatik Şarjlı Akülü Sırt İlaçlama Pompası tanıtım ve sipariş filmi.',
  ctaText: 'Bizimle İletişime Geçin',
  products: [{name:'Bofe 16L Şarjlı Sırt Pompası',description:'Bahçe ve tarım arazilerinde mikronize püskürtme sağlayan sırt pompası.',imageUrl:'https://canonical.example/product.jpg'}],
  logoUrl:'https://canonical.example/logo.png',
  videoSpeech:true,
}

test('historical camera structure enforces three distinct shots with motivated cuts', () => {
  const result = compileHistoricalV5(input, approved)
  assert.equal(result.creative_engine, 'HISTORICAL_V5')
  assert.equal(result.shotPlan.cameraMode, 'three_cut')
  assert.deepEqual(result.shotPlan.shots.map(s=>[s.timing.from,s.timing.to]),[[0,2.2],[2.2,5.8],[5.8,8]])
  assert.match(result.shotPlan.shots[0].cameraMotion,/Front low-angle camera moving backward|Smooth dynamic wide tracking forward/)
  assert.match(result.shotPlan.shots[1].subjectAction,/micronized mist spray/)
  assert.match(result.shotPlan.shots[1].framing,/CUT 1 at 2\.2s/)
  assert.match(result.shotPlan.shots[2].framing,/CUT 2 at 5\.8s/)
  assert.match(result.veoPrompt,/CAMERA MOVEMENT: three_cut - Three visually distinct commercial shots connected by two motivated cuts/)
  assert.match(result.veoPrompt,/CUT 1 at approximately 2\.2s/)
  assert.match(result.veoPrompt,/CUT 2 at approximately 5\.8s/)
  assert.equal(result.veoPrompt.split(approved).length-1,1)
  assert.match(result.veoPrompt,/Start at 0.5s, target completion 5.25s.*strictly before 5.5s/)
  assert.equal(result.overlayPlan.subtitles.sourceText,approved)
  assert.ok(result.overlayPlan.commercialTypography)
  assert.equal(result.overlayPlan.commercialTypography.beat1, 'KOLAY VE PRATİK KULLANIM')
  assert.equal(result.overlayPlan.commercialTypography.beat2, '16 LİTRE GENİŞ DEPO HACMİ')
  assert.match(result.overlayPlan.commercialTypography.beat3, /BOFE · BİZİMLE İLETİŞİME GEÇİN/)
  assert.match(result.overlayPlan.assContent || '', /Dialogue: 0,0:00:00\.30,0:00:02\.00,CommercialHook/)
  assert.match(result.overlayPlan.assContent || '', /Dialogue: 0,0:00:02\.40,0:00:05\.50,CommercialBenefit/)
  assert.match(result.overlayPlan.assContent || '', /Dialogue: 0,0:00:06\.00,0:00:08\.00,CommercialBrandClose/)
})

test('historical camera defaults to three_cut across brands without brand-specific bias', () => {
  for (const brandName of ['Bofe','Başka Marka','Ayvazoğlu İnşaat']) {
    const r=compileHistoricalV5({...input,brandName},approved)
    assert.equal(r.shotPlan.cameraMode,'three_cut')
    assert.ok(!r.veoPrompt.includes('minimalist red line-art roof symbol'))
  }
})

test('an unrelated product uses the same historical chain without sprayer or brand-specific geometry', () => {
  const r=compileHistoricalV5({...input,brandName:'Yeni Kahve',brief:'Kahvenin hazırlanışını gösterin.',products:[{name:'Çekirdek Kahve',description:'Kavrulmuş kahve çekirdekleri.',imageUrl:'https://canonical.example/coffee.jpg'}]},approved)
  assert.equal(r.shotPlan.cameraMode,'three_cut')
  assert.doesNotMatch(r.shotPlan.shots[1].subjectAction,/spray|lance|hose/)
  assert.equal(r.speech_timeline.text,approved)
})

test('historical director requests one visual prompt with original scene cadence, not three concepts', () => {
  const p=buildHistoricalDirectorPrompt({brandName:'Yeni Marka',productName:'Ürün',compiledPrompt:'ORIGINAL_COMPILED_SEED',logoVisualDescription:'Canonical black wordmark',sector:'Tarım',sceneAtmosphere:'Doğal kullanım alanı'})
  assert.match(p,/ORIGINAL_COMPILED_SEED/)
  assert.match(p,/0.0s - 2.0s/)
  assert.match(p,/2.0s - 5.5s/)
  assert.match(p,/SADECE doğrudan Google Veo/)
  assert.doesNotMatch(p,/GENERATED_3_CONCEPTS|SIMPLE_V5_HYBRID/)
})

test('final prompt preserves historical visual paragraphs while replacing conflicting voice', () => {
  const visual='CAMERA: three_cut - Three distinct commercial shots connected by cut transitions.\n\nSHOT 1: Start with authentic product action.\n\nSHOT 3: Close on the same product.'
  const r=finalizeHistoricalProviderPrompt(visual+'\n\nAUDIO: Old price dialogue, 0.4 to 7.3 seconds.\n\nNEGATIVE CONSTRAINTS: no duplicate product.',approved)
  assert.ok(r.startsWith(visual))
  assert.doesNotMatch(r,/Old price dialogue|7.3 seconds/)
  assert.equal(r.split(approved).length-1,1)
  assert.equal(r.split('@HeroProduct').length-1,1)
  assert.equal(r.split('@BrandLogo').length-1,1)
  assert.match(r,/strictly before 5.5s/)
  assert.throws(()=>finalizeHistoricalProviderPrompt('A prompt with no recognized camera instructions.',approved),/CAMERA_MODE_MISSING/)
})

test('agricultural sprayer derives agricultural orchard environment and backpack affordance without warehouse', () => {
  const result = compileHistoricalV5(input, approved)
  assert.match(result.veoPrompt, /Sunlit fertile agricultural orchard, vibrant olive grove or green nursery/)
  assert.doesNotMatch(result.veoPrompt, /logistics hub|warehouse|delivery bay|entrance plaque/)
  assert.match(result.veoPrompt, /backpack sprayer worn comfortably on the back/i)
  assert.match(result.veoPrompt, /directs the spray wand toward vibrant tree leaves and green foliage/)
  assert.match(result.veoPrompt, /Zero premature zoom before 5.8s/)
  assert.match(result.veoPrompt, /concluding framing \(5\.8s - 8\.0s, lasting a full continuous 2\.2 seconds\)/)
})

test('construction brick derives construction jobsite without sprayer keywords or warehouse', () => {
  const brickInput = {
    brandName: 'Ayvazoğlu Tuğla',
    brief: 'Yüksek kaliteli delikli killi cephe tuğlaları tanıtımı.',
    ctaText: 'Fiyat Teklifi Alın',
    products: [{ name: 'Delikli Killi Tuğla', description: 'İnşaat cepheleri için yüksek mukavemetli pişmiş kil tuğla.', imageUrl: 'https://canonical.example/brick.jpg' }],
    logoUrl: 'https://canonical.example/logo.png',
    videoSpeech: true,
  }
  const result = compileHistoricalV5(brickInput, approved)
  assert.match(result.veoPrompt, /construction jobsite and sunlit outdoor building material yard/)
  assert.doesNotMatch(result.veoPrompt, /orchard|olive grove|sprayer|spray wand|logistics hub/)
  assert.match(result.veoPrompt, /perforated hollow clay brick/)
  assert.match(result.veoPrompt, /Zero premature zoom before 5.8s/)
})
