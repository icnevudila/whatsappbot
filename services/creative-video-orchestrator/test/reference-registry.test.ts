import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ReferenceRegistry } from '../src/types/reference-registry.js'

test('ReferenceRegistry - registers and resolves canonical handles correctly', () => {
  const registry = new ReferenceRegistry('org_tenant_1')

  registry.register({
    handle: '@HeroProduct',
    asset_id: 'prod_brick_1',
    org_id: 'org_tenant_1',
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    role: 'product',
    usage_rules: {
      prohibitedMutations: ['change shape'],
      prominence: 'hero',
      fidelityRequired: true,
    },
    aiBrief: {
      type: 'product',
      shape: 'rectangular solid brick',
      body_color: 'terracotta red',
      material: ['fired clay'],
      proportions: '190x90x50 mm',
      distinctive_details: ['fine porous clay texture', 'clean sharp chamfered edges'],
      prohibited_mutations: ['plastic sheen', 'rounded toy corners'],
    },
  })

  assert.ok(registry.has('@HeroProduct'))
  const ref = registry.get('@HeroProduct')
  assert.equal(ref?.asset_id, 'prod_brick_1')
  assert.equal(ref?.role, 'product')

  // Validate prompt handles
  const prompt1 = 'Scene featuring @HeroProduct under natural sunlight'
  const validation1 = registry.validatePromptHandles(prompt1)
  assert.equal(validation1.valid, true)
  assert.deepEqual(validation1.referencedHandles, ['@HeroProduct'])

  const prompt2 = 'Scene featuring @UnregisteredObject in studio'
  const validation2 = registry.validatePromptHandles(prompt2)
  assert.equal(validation2.valid, false)
  assert.deepEqual(validation2.missingHandles, ['@UnregisteredObject'])

  // Validate grounding replacement
  const grounded = registry.compilePromptWithGrounding(prompt1)
  assert.ok(!grounded.includes('@HeroProduct'))
  assert.ok(grounded.includes('rectangular solid brick'))
  assert.ok(grounded.includes('terracotta red'))
})

test('ReferenceRegistry - enforces tenant isolation (throws on foreign org asset)', () => {
  const registry = new ReferenceRegistry('org_tenant_1')

  assert.throws(() => {
    registry.register({
      handle: '@HeroProduct',
      asset_id: 'prod_foreign',
      org_id: 'org_tenant_999', // Foreign tenant!
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      role: 'product',
      usage_rules: { prohibitedMutations: [], prominence: 'hero', fidelityRequired: true },
    })
  }, /SECURITY_VIOLATION: Asset org_id org_tenant_999 does not match registry org_id org_tenant_1/)
})
