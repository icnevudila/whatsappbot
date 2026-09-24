import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FlowVeoPromptCompiler,
  GeminiVideoPromptCompiler,
  SimpleV5BriefNormalizer,
  createBrandContextSnapshot,
} from '../src/index.js'

function fixture(approvedSpokenLine?: string) {
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
  assert.match(gemini.cinematicPrompt, /Spoken language: Turkish \(tr-TR\)\./)
  assert.match(gemini.cinematicPrompt, /No translation to English\./)
  assert.match(gemini.cinematicPrompt, /Speak the approved Turkish line exactly once\./)
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
