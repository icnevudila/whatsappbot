import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FlowVeoPromptCompiler,
  GeminiVideoPromptCompiler,
  SimpleV5BriefNormalizer,
  createBrandContextSnapshot,
} from '../src/index.js'

function buildSnapshot(options: {
  style?: string
  environment?: string
  motion?: string
  productName?: string
  spokenLine?: string
  verifiedClaims?: string[]
} = {}) {
  const pName = options.productName || 'Ayvazoğlu Tuğla'
  return createBrandContextSnapshot({
    org_id: 'org-test-matrix',
    brand_name: 'Ayvazoğlu İnşaat',
    sector_profile: 'construction_materials',
    logo_asset_id: 'logo-asset-1',
    logo_sha256: 'a'.repeat(64),
    products: [{
      product_id: 'prod-1',
      name: pName,
      description: 'Standart fırınlanmış terracotta yapı tuğlası',
      asset_id: 'prod-asset-1',
      sha256: 'b'.repeat(64),
    }],
    campaign: {
      objective: 'Ürün tanıtımı ve satış',
      cta: 'Ayvazoğlu İnşaat ile iletişime geçin',
      approved_spoken_line: options.spokenLine || `${pName} ile sağlam yapılar için güvenilir çözümler sunuyoruz.`,
      user_style_preference: options.style,
      environment_preset: options.environment,
      motion_style: options.motion,
    },
    verified_claims: options.verifiedClaims || ['Standart yapı tuğlası', 'Doğal terracotta hammadde'],
    requested_duration: 8,
    aspect_ratio: '9:16',
    creative_engine_mode: 'SIMPLE_V5_HYBRID',
  })
}

test('WIZARD AD FORMATS: all 7 ad formats produce distinct visual hooks, proofs, and closes', () => {
  const formats = [
    'AUTO',
    'FAST_SALES',
    'PRODUCT_USAGE',
    'PROBLEM_SOLUTION',
    'PREMIUM',
    'SOCIAL_UGC',
    'OFFER',
  ] as const

  const results = new Map<string, { hook: string; proof: string; close: string; prompt: string }>()

  for (const fmt of formats) {
    const snapshot = buildSnapshot({ style: fmt })
    const { brief, shotPlan } = SimpleV5BriefNormalizer.normalize(snapshot)
    const compiled = FlowVeoPromptCompiler.compile(brief, shotPlan)

    // Verify timing invariant: exactly 3 shots totaling 8 seconds
    assert.equal(shotPlan.shot1_hook.timing, '0.0-2.2s')
    assert.equal(shotPlan.shot2_proof.timing, '2.2-5.8s')
    assert.equal(shotPlan.shot3_close.timing, '5.8-8.0s')

    // Verify format-specific semantics
    if (fmt === 'FAST_SALES') {
      assert.match(shotPlan.shot1_hook.description, /hızlı ürün detayı/i)
      assert.match(shotPlan.shot3_close.description, /temiz CTA alanı/i)
    } else if (fmt === 'PRODUCT_USAGE') {
      assert.match(shotPlan.shot1_hook.description, /kullanım bağlamını/i)
      assert.match(shotPlan.shot2_proof.description, /kesintisiz kullanım adımı/i)
    } else if (fmt === 'PROBLEM_SOLUTION') {
      assert.match(shotPlan.shot1_hook.description, /çalışma bağlamı kurulur/i)
      assert.match(shotPlan.shot3_close.description, /çözüm iddiası eklenmeden/i)
    } else if (fmt === 'PREMIUM') {
      assert.match(shotPlan.shot1_hook.description, /sakin ışık geçişiyle/i)
      assert.match(shotPlan.shot2_proof.description, /prestijli kadraj/i)
    } else if (fmt === 'SOCIAL_UGC') {
      assert.match(shotPlan.shot1_hook.description, /birinci şahıs yaklaşımı/i)
      assert.match(shotPlan.shot2_proof.description, /samimi fakat iddiasız/i)
    } else if (fmt === 'OFFER') {
      assert.match(shotPlan.shot1_hook.description, /okunur kadrajda/i)
      assert.match(shotPlan.shot2_proof.description, /deterministic finishing/i)
    } else if (fmt === 'AUTO') {
      assert.match(shotPlan.shot1_hook.description, /dinamik açılış kadrajında/i)
      assert.match(shotPlan.shot2_proof.description, /gerçek malzeme fiziği/i)
    }

    results.set(fmt, {
      hook: shotPlan.shot1_hook.description,
      proof: shotPlan.shot2_proof.description,
      close: shotPlan.shot3_close.description,
      prompt: compiled.cinematicPrompt,
    })
  }

  // Cross-compare: each format must have a unique hook description
  const hookDescriptions = Array.from(results.values()).map(r => r.hook)
  const uniqueHooks = new Set(hookDescriptions)
  assert.equal(uniqueHooks.size, formats.length, 'Every wizard ad format must produce a unique hook!')

  // Cross-compare: each format must have a unique compiled cinematic prompt
  const prompts = Array.from(results.values()).map(r => r.prompt)
  const uniquePrompts = new Set(prompts)
  assert.equal(uniquePrompts.size, formats.length, 'Every wizard ad format must produce a unique prompt!')
})

test('WIZARD MOTION STYLES: all motion styles produce distinct camera instructions', () => {
  const motions = ['studio_orbit', 'macro_detail', 'real_usage'] as const
  const results = new Map<string, string>()

  for (const motion of motions) {
    const snapshot = buildSnapshot({ motion })
    const { brief, shotPlan } = SimpleV5BriefNormalizer.normalize(snapshot)
    const compiled = FlowVeoPromptCompiler.compile(brief, shotPlan)

    if (motion === 'studio_orbit') {
      assert.match(brief.cameraMotion, /3\/4 vitrin/i)
      assert.match(compiled.cinematicPrompt, /3\/4 vitrin/i)
    } else if (motion === 'macro_detail') {
      assert.match(brief.cameraMotion, /makro/i)
      assert.match(compiled.cinematicPrompt, /makro/i)
    } else if (motion === 'real_usage') {
      assert.match(brief.cameraMotion, /gerçek kullanım adımını takip eden/i)
      assert.match(compiled.cinematicPrompt, /gerçek kullanım adımını takip eden/i)
    }

    results.set(motion, compiled.cinematicPrompt)
  }

  assert.equal(results.size, 3)
  assert.notEqual(results.get('studio_orbit'), results.get('macro_detail'))
  assert.notEqual(results.get('studio_orbit'), results.get('real_usage'))
  assert.notEqual(results.get('macro_detail'), results.get('real_usage'))
})

test('WIZARD ENVIRONMENTS: all environment presets produce distinct location and lighting atmospheres', () => {
  const environments = ['garden', 'studio', 'kitchen', 'office', 'workshop', 'construction'] as const
  const locations = new Set<string>()

  for (const env of environments) {
    const snapshot = buildSnapshot({ environment: env })
    const { brief, shotPlan } = SimpleV5BriefNormalizer.normalize(snapshot)
    const compiled = FlowVeoPromptCompiler.compile(brief, shotPlan)

    locations.add(brief.location)
    assert.match(compiled.cinematicPrompt, new RegExp(brief.location, 'i'))

    if (env === 'garden') assert.match(brief.location, /bahçe|tarla|sera/i)
    if (env === 'studio') assert.match(brief.location, /ürün stüdyosu/i)
    if (env === 'kitchen') assert.match(brief.location, /mutfak/i)
    if (env === 'office') assert.match(brief.location, /ofis/i)
    if (env === 'workshop') assert.match(brief.location, /atölye|fabrika|sanayi/i)
    if (env === 'construction') assert.match(brief.location, /şantiye/i)
  }

  assert.equal(locations.size, environments.length, 'Every environment preset must produce a unique location!')
})

test('WIZARD COMPILER SYMMETRY: FlowVeo and GeminiNative compilers are 100% symmetric across all formats', () => {
  const formats = ['AUTO', 'FAST_SALES', 'PRODUCT_USAGE', 'PROBLEM_SOLUTION', 'PREMIUM', 'SOCIAL_UGC', 'OFFER'] as const

  for (const fmt of formats) {
    const snapshot = buildSnapshot({ style: fmt, motion: 'studio_orbit', environment: 'studio' })
    const { brief, shotPlan } = SimpleV5BriefNormalizer.normalize(snapshot)

    const flow = FlowVeoPromptCompiler.compile(brief, shotPlan)
    const gemini = GeminiVideoPromptCompiler.compile(brief, shotPlan)

    assert.equal(flow.cinematicPrompt, gemini.cinematicPrompt)
    assert.equal(flow.negativePrompt, gemini.negativePrompt)
    assert.equal(flow.voiceoverScript, gemini.voiceoverScript)
    assert.equal(flow.wordCount, gemini.wordCount)
    assert.equal(flow.metrics.instructionCount, gemini.metrics.instructionCount)
  }
})
