import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FlowVeoPromptCompiler,
  GeminiVideoPromptCompiler,
  SimpleV5BriefNormalizer,
  createBrandContextSnapshot,
  resolveProductFidelityContract,
  UNIVERSAL_FIDELITY_CONTRACT,
  AYVAZOGLU_TUGLA_FIDELITY_CONTRACT,
  sanitizeCreativeDirectionAgainstFidelity,
} from '../src/index.js'

test('Product without custom contract -> universal fidelity defaults injected', () => {
  const genericSnapshot = createBrandContextSnapshot({
    org_id: 'org-generic',
    brand_name: 'Bofe Tarım',
    sector_profile: 'agriculture',
    logo_asset_id: 'logo-1',
    logo_sha256: 'a'.repeat(64),
    products: [{
      product_id: 'pump-1',
      name: 'İlaçlama Pompası',
      description: 'Tarım tipi ilaçlama pompası',
      asset_id: 'pump-asset-1',
      sha256: 'c'.repeat(64),
    }],
    campaign: {
      objective: 'Pompayı tanıt',
      cta: 'İletişime geçin',
      approved_spoken_line: 'Bofe İlaçlama Pompası tarlada yüksek performans ve güven sunuyor.',
    },
    requested_duration: 8,
    aspect_ratio: '9:16',
    creative_engine_mode: 'SIMPLE_V5_HYBRID',
  })

  const { brief, shotPlan } = SimpleV5BriefNormalizer.normalize(genericSnapshot)
  const compiled = FlowVeoPromptCompiler.compile(brief, shotPlan)

  assert.equal(compiled.fidelity.applied, true)
  assert.equal(compiled.fidelity.productId, 'pump-1')
  assert.equal(compiled.fidelity.canonicalAssetSha, 'c'.repeat(64))

  // Must contain universal defaults
  assert.match(compiled.cinematicPrompt, /\[PRODUCT FIDELITY LOCK\]/)
  assert.match(compiled.cinematicPrompt, /preserve overall silhouette/)
  assert.match(compiled.cinematicPrompt, /preserve visible functional geometry/)
  assert.match(compiled.cinematicPrompt, /do not invent structural details on unseen surfaces/)
  assert.match(compiled.cinematicPrompt, /no geometry drift between shots/)
  assert.match(compiled.cinematicPrompt, /same physical product identity across entire video/)
})

test('Product with custom contract -> defaults + custom rules compiled', () => {
  const customSnapshot = createBrandContextSnapshot({
    org_id: 'org-device',
    brand_name: 'TechCorp',
    sector_profile: 'technology',
    logo_asset_id: 'logo-1',
    logo_sha256: 'a'.repeat(64),
    products: [{
      product_id: 'device-1',
      name: 'Smart Probe',
      description: 'Precision measurement device',
      asset_id: 'device-asset-1',
      sha256: 'd'.repeat(64),
      product_fidelity_contract: {
        must_preserve: ['cylindrical sensor tip geometry', 'metallic silver finish'],
        surface_rules: ['no additional buttons on top dome'],
        forbidden_mutations: ['square tip morphing', 'color shift to brass'],
        safe_camera_rules: ['avoid extreme macro blur on digital readout'],
        allowed_actions: ['held by lab technician in gloved hand'],
      },
    }],
    campaign: {
      objective: 'Cihaz tanıtımı',
      cta: 'İletişime geçin',
      approved_spoken_line: 'Smart Probe laboratuvar ortamında hassas ölçüm ve stabil sonuç sağlar.',
    },
    requested_duration: 8,
    aspect_ratio: '9:16',
    creative_engine_mode: 'SIMPLE_V5_HYBRID',
  })

  const { brief, shotPlan } = SimpleV5BriefNormalizer.normalize(customSnapshot)
  const compiled = FlowVeoPromptCompiler.compile(brief, shotPlan)

  assert.equal(compiled.fidelity.applied, true)
  assert.match(compiled.cinematicPrompt, /cylindrical sensor tip geometry/)
  assert.match(compiled.cinematicPrompt, /metallic silver finish/)
  assert.match(compiled.cinematicPrompt, /no additional buttons on top dome/)
  assert.match(compiled.cinematicPrompt, /square tip morphing/)
  assert.match(compiled.cinematicPrompt, /color shift to brass/)
  assert.match(compiled.cinematicPrompt, /held by lab technician in gloved hand/)
})

test('Ayvazoglu brick -> "side faces contain no holes or cavities" present', () => {
  const ayvazSnapshot = createBrandContextSnapshot({
    org_id: '4a58b0dd-0931-4901-880a-686457d15010',
    brand_name: 'Ayvazoğlu İnşaat',
    sector_profile: 'construction',
    logo_asset_id: 'logo-ayvaz',
    logo_sha256: '6684125d169d5c7ef07162e5cc41e1bab285eec3a44271d886334801cb416e11',
    products: [{
      product_id: 'brick-ayvaz',
      name: 'Ayvazoğlu Tuğla',
      description: 'Standart kapıya teslim kırmızı tuğla',
      asset_id: 'ayvaz-brick-asset',
      sha256: 'ef1e48809c7f706db6f03459b2378e3cb23346a3378dd97ae92712556720f5c2',
      file_path: '/shared/outputs/inputs/4a58b0dd-0931-4901-880a-686457d15010/ayvazoglu_canonical_brick.jpg',
    }],
    campaign: {
      objective: 'Tuğla tanıtımı',
      cta: 'İletişime geçin',
      approved_spoken_line: 'Ayvazoğlu Tuğla. Sağlam yapılar için güvenilir çözüm.',
    },
    requested_duration: 8,
    aspect_ratio: '9:16',
    creative_engine_mode: 'SIMPLE_V5_HYBRID',
  })

  const { brief, shotPlan } = SimpleV5BriefNormalizer.normalize(ayvazSnapshot)
  const compiled = FlowVeoPromptCompiler.compile(brief, shotPlan)

  assert.equal(compiled.fidelity.applied, true)
  assert.match(compiled.cinematicPrompt, /rectangular clay brick silhouette/)
  assert.match(compiled.cinematicPrompt, /terracotta red-orange color/)
  assert.match(compiled.cinematicPrompt, /openings exist only on the top face/)
  assert.match(compiled.cinematicPrompt, /side faces remain solid vertical ribbed clay surfaces/)
  assert.match(compiled.cinematicPrompt, /side faces contain no holes or cavities/)
  assert.match(compiled.cinematicPrompt, /side holes/)
  assert.match(compiled.cinematicPrompt, /side perforations/)
  assert.match(compiled.cinematicPrompt, /worker picks up brick/)
  assert.match(compiled.cinematicPrompt, /professional wall placement/)
})

test('Both Gemini and Flow prompts -> same fidelity contract included', () => {
  const ayvazSnapshot = createBrandContextSnapshot({
    org_id: '4a58b0dd-0931-4901-880a-686457d15010',
    brand_name: 'Ayvazoğlu İnşaat',
    sector_profile: 'construction',
    logo_asset_id: 'logo-ayvaz',
    logo_sha256: '6684125d169d5c7ef07162e5cc41e1bab285eec3a44271d886334801cb416e11',
    products: [{
      product_id: 'brick-ayvaz',
      name: 'Ayvazoğlu Tuğla',
      description: 'Standart kapıya teslim kırmızı tuğla',
      asset_id: 'ayvaz-brick-asset',
      sha256: 'ef1e48809c7f706db6f03459b2378e3cb23346a3378dd97ae92712556720f5c2',
    }],
    campaign: {
      objective: 'Tuğla tanıtımı',
      cta: 'İletişime geçin',
      approved_spoken_line: 'Ayvazoğlu Tuğla. Sağlam yapılar için güvenilir çözüm.',
    },
    requested_duration: 8,
    aspect_ratio: '9:16',
    creative_engine_mode: 'SIMPLE_V5_HYBRID',
  })

  const { brief, shotPlan } = SimpleV5BriefNormalizer.normalize(ayvazSnapshot)
  const gemini = GeminiVideoPromptCompiler.compile(brief, shotPlan)
  const flow = FlowVeoPromptCompiler.compile(brief, shotPlan)

  assert.equal(gemini.cinematicPrompt, flow.cinematicPrompt)
  assert.equal(gemini.fidelity.ruleCount, flow.fidelity.ruleCount)
  assert.equal(gemini.fidelity.ruleCount > 10, true)
  assert.match(gemini.cinematicPrompt, /\[PRODUCT FIDELITY LOCK\]/)
  assert.match(flow.cinematicPrompt, /\[PRODUCT FIDELITY LOCK\]/)
})

test('Creative instruction conflicts with fidelity -> fidelity rule preserved', () => {
  const contract = AYVAZOGLU_TUGLA_FIDELITY_CONTRACT
  const conflictingCreativeDirection = 'Dramatic camera push-in while worker tries to add side holes and show extra cavities on the brick.'
  const sanitized = sanitizeCreativeDirectionAgainstFidelity(conflictingCreativeDirection, contract)

  // Conflicting creative instruction to create side holes must be neutralized
  assert.equal(sanitized.includes('add side holes'), false)
  assert.equal(sanitized.includes('show extra cavities'), false)

  // Contract surface rules remain authoritative
  assert.equal(contract.surface_rules.includes('side faces contain no holes or cavities'), true)
  assert.equal(contract.forbidden_mutations.includes('side holes'), true)
})
