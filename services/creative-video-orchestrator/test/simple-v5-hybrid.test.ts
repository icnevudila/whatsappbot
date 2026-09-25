import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FlowVeoPromptCompiler,
  GeminiVideoPromptCompiler,
  SimpleV5BriefNormalizer,
  createBrandContextSnapshot,
} from '../src/index.js'

function fixture(
  approvedSpokenLine?: string,
  options: { style?: string; environment?: string; motion?: string } = {},
) {
  return createBrandContextSnapshot({
    org_id: 'org-ayvazoglu',
    brand_name: 'Ayvazoğlu İnşaat',
    sector_profile: 'construction_materials',
    logo_asset_id: 'logo-1',
    logo_sha256: 'a'.repeat(64),
    products: [{
      product_id: 'brick-1',
      name: 'Ayvazoğlu Tuğla',
      description: 'Standart yapı tuğlası',
      asset_id: 'brick-asset-1',
      sha256: 'b'.repeat(64),
    }],
    campaign: {
      objective: 'Seçili ürünü tanıt',
      cta: 'Detayları inceleyin',
      approved_spoken_line: approvedSpokenLine,
      user_style_preference: options.style,
      environment_preset: options.environment,
      motion_style: options.motion,
    },
    verified_claims: ['Standart yapı tuğlası'],
    requested_duration: 8,
    aspect_ratio: '9:16',
    creative_engine_mode: 'SIMPLE_V5_HYBRID',
  })
}

test('SIMPLE_V5_HYBRID compiles one shared factual plan for Gemini and Flow', () => {
  const { brief, shotPlan } = SimpleV5BriefNormalizer.normalize(
    fixture('Ayvazoğlu İnşaat yapı tuğlasını gerçek çalışma ortamında yakından ve net gösteriyor.')
  )
  const gemini = GeminiVideoPromptCompiler.compile(brief, shotPlan)
  const flow = FlowVeoPromptCompiler.compile(brief, shotPlan)

  assert.equal(gemini.cinematicPrompt, flow.cinematicPrompt)
  assert.equal(gemini.voiceoverScript, flow.voiceoverScript)
  assert.equal(gemini.metrics.actionCount, 1)
  assert.equal(gemini.metrics.locationCount, 1)
  assert.equal(gemini.metrics.llmCallCountBeforeVeo, 0)
  assert.equal(brief.aspectRatio, '9:16')
  assert.match(gemini.cinematicPrompt, /^\[FORMAT\]: 8\.0-second vertical commercial video, 9:16 aspect ratio\./)
  assert.match(gemini.cinematicPrompt, /Spoken language: Turkish \(tr-TR\)\./)
  assert.match(gemini.cinematicPrompt, /Approved dialogue: "Ayvazoğlu İnşaat yapı tuğlasını gerçek çalışma ortamında yakından ve net gösteriyor\."/)
  assert.match(gemini.cinematicPrompt, /Speak exactly this dialogue once, naturally in Turkish\./)
  assert.match(gemini.cinematicPrompt, /No translation\./)
})

test('SIMPLE_V5_HYBRID overrides a legacy 16:9 request with the vertical contract', () => {
  const legacyLandscape = structuredClone(
    fixture('Ayvazoğlu İnşaat yapı tuğlasını gerçek çalışma ortamında yakından ve net gösteriyor.')
  ) as any
  legacyLandscape.aspect_ratio = '16:9'
  const { brief, shotPlan } = SimpleV5BriefNormalizer.normalize(legacyLandscape)
  const compiled = GeminiVideoPromptCompiler.compile(brief, shotPlan)
  assert.equal(brief.aspectRatio, '9:16')
  assert.doesNotMatch(compiled.cinematicPrompt, /16:9/)
})

test('SIMPLE_V5_HYBRID neutral fallback invents no performance claim', () => {
  const { brief } = SimpleV5BriefNormalizer.normalize(fixture())
  assert.equal(brief.spokenWordCount, 12)
  assert.doesNotMatch(brief.spokenScript, /dayanıklılık|performans|yüksek verim|güvencesiyle/i)
})

test('SIMPLE_V5_HYBRID fails closed instead of truncating overlong approved speech', () => {
  assert.throws(
    () => SimpleV5BriefNormalizer.normalize(fixture('Bu özellikle uzun onaylı konuşma metni anlamı sessizce değiştirecek biçimde kesilmemeli ve video üretimine eksik bir cümle olarak kesinlikle gönderilmemelidir bugün')),
    /SIMPLE_V5_SPEECH_TOO_LONG/
  )
})

test('SIMPLE_V5_HYBRID rejects unverified legacy marketing formulas', () => {
  assert.throws(
    () => SimpleV5BriefNormalizer.normalize(fixture('Ayvazoğlu İnşaat ile yüksek verim ve hızlı sevkiyat şimdi sizinle buluşuyor.')),
    /SIMPLE_V5_UNVERIFIED_SPEECH/
  )
})

test('SIMPLE_V5_HYBRID requires a locked selected product/service', () => {
  const snapshot = createBrandContextSnapshot({
    org_id: 'org-empty',
    brand_name: 'Marka',
    sector_profile: 'commercial',
    logo_asset_id: 'logo',
    logo_sha256: 'a'.repeat(64),
    products: [],
    campaign: { objective: 'Tanıtım', cta: 'İnceleyin' },
  })
  assert.throws(() => SimpleV5BriefNormalizer.normalize(snapshot), /SIMPLE_V5_SELECTED_PRODUCT_REQUIRED/)
})

test('SIMPLE_V5_HYBRID makes selected creative types materially different without changing timing', () => {
  const approvedLine = 'Ayvazoğlu Tuğla gerçek çalışma ortamında referansına sadık biçimde gösteriliyor.'
  const usage = SimpleV5BriefNormalizer.normalize(fixture(approvedLine, {
    style: 'PRODUCT_USAGE',
    environment: 'construction',
    motion: 'real_usage',
  }))
  const premium = SimpleV5BriefNormalizer.normalize(fixture(approvedLine, {
    style: 'PREMIUM',
    environment: 'studio',
    motion: 'macro_detail',
  }))

  assert.notEqual(usage.shotPlan.shot1_hook.description, premium.shotPlan.shot1_hook.description)
  assert.notEqual(usage.shotPlan.shot2_proof.description, premium.shotPlan.shot2_proof.description)
  assert.equal(usage.shotPlan.shot1_hook.timing, premium.shotPlan.shot1_hook.timing)
  assert.match(usage.brief.location, /şantiye/i)
  assert.match(premium.brief.location, /stüdyo/i)
  assert.match(premium.brief.cameraMotion, /makro/i)
})
