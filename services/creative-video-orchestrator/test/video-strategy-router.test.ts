import { test } from 'node:test'
import assert from 'node:assert/strict'
import { VideoStrategyRouter } from '../src/strategy/video-strategy-router.js'
import { SectorPresetRegistry, globalSectorPresetRegistry } from '../src/strategy/sector-presets.js'
import { createBrandContextSnapshot } from '../src/types/brand-snapshot.js'

test('VideoStrategyRouter - routes <=15s to SHORT_VIDEO and >15s to LONG_VIDEO', () => {
  const router = new VideoStrategyRouter()

  const shortSnapshot = createBrandContextSnapshot({
    org_id: 'org_1',
    brand_name: 'Test Brand',
    sector_profile: 'consumer_goods',
    logo_asset_id: 'logo_1',
    logo_sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    campaign: { objective: 'Sales', cta: 'Satın Al' },
    requested_duration: 8,
    output_type: 'AUTO',
  })

  const shortDecision = router.route(shortSnapshot)
  assert.equal(shortDecision.strategyType, 'SHORT_VIDEO')
  assert.equal(shortDecision.targetDurationSeconds, 8)
  assert.equal(shortDecision.estimatedSceneCount, 1)

  const longSnapshot = createBrandContextSnapshot({
    org_id: 'org_1',
    brand_name: 'Test Brand',
    sector_profile: 'construction_materials',
    logo_asset_id: 'logo_1',
    logo_sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    campaign: { objective: 'Commercial Trust', cta: 'Fiyat Teklifi Al' },
    requested_duration: 40,
    output_type: 'AUTO',
  })

  const longDecision = router.route(longSnapshot)
  assert.equal(longDecision.strategyType, 'LONG_VIDEO')
  assert.equal(longDecision.targetDurationSeconds, 40)
  assert.equal(longDecision.estimatedSceneCount, 5)
  assert.equal(longDecision.sectorPreset.defaultArchetype, 'durability_proof')
})

test('VideoStrategyRouter - dynamic runtime sector preset overrides (no code deploy needed)', () => {
  const customRegistry = new SectorPresetRegistry()
  const router = new VideoStrategyRouter(customRegistry)

  // Dynamically add a new 301st sector: "specialty_coffee_roasting"
  customRegistry.register({
    id: 'specialty_coffee_roasting',
    name: 'Specialty Coffee Roastery',
    description: 'Artisanal single-origin coffee roasting, rich aroma and sensory craft',
    defaultArchetype: 'food_appetite',
    typicalPacing: 'macro_detail',
    lightingProfile: 'warm golden cafe backlighting, aromatic steam catching sunlight',
    cameraLanguage: 'macro slow-motion pour, rotational reveal of glossy roasted beans',
    motionCharacter: 'delicate pour-over bloom, tactile bean cascade',
    soundscapeDefaults: ['coffee bean crackle', 'gentle hot water pour', 'cozy cafe acoustic'],
    mandatoryProofTypes: ['crema richness', 'golden brown bean consistency'],
    negativeVisuals: ['instant coffee powder', 'cold sterile lighting', 'commercial vending machine'],
  })

  const customSnapshot = createBrandContextSnapshot({
    org_id: 'org_coffee_301',
    brand_name: 'Artisan Roast Co.',
    sector_profile: 'specialty_coffee_roasting',
    logo_asset_id: 'logo_coffee',
    logo_sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    campaign: { objective: 'Subscription', cta: 'Hemen Sipariş Ver' },
    requested_duration: 10,
    output_type: 'SHORT_VIDEO',
  })

  const decision = router.route(customSnapshot)
  assert.equal(decision.sectorPreset.id, 'specialty_coffee_roasting')
  assert.equal(decision.sectorPreset.defaultArchetype, 'food_appetite')
  assert.ok(decision.sectorPreset.isCustom)
})
