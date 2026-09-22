import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { AssetSufficiencyGate } from '../src/gates/asset-sufficiency-gate.js'
import { IndependentPixelVisualQA } from '../src/qa/pixel-visual-qa.js'
import { createBrandContextSnapshot } from '../src/types/brand-snapshot.js'
import type { TenantAssetInventory } from '../src/types/asset-intake.js'

const REPO_ROOT = resolve(import.meta.dirname, '../../..')

test('AssetSufficiencyGate - enforces mandatory authoritative assets per business model', () => {
  // 1. SaaS business with real app screenshot -> PASS
  const validSaasInventory: TenantAssetInventory = {
    org_id: 'org_generic_saas_1',
    business_model: 'saas_software',
    official_logo: {
      asset_id: 'logo_1',
      org_id: 'org_generic_saas_1',
      sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
      role: 'official_logo',
      mime_type: 'image/png',
      source: 'brand_kit',
      file_path: 'scratch/veriburada_logo.png',
      approved: true,
    },
    website_or_app_screens: [
      {
        asset_id: 'screen_1',
        org_id: 'org_generic_saas_1',
        sha256: 'b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1',
        role: 'website_or_app_screen',
        mime_type: 'image/png',
        source: 'upload',
        file_path: 'scratch/veriburada_product.png',
        approved: true,
      },
    ],
    product_images: [],
    service_screenshots: [],
    packaging_images: [],
    environment_references: [],
    approved_campaign_images: [],
    forbidden_assets: [],
  }

  const saasPassResult = AssetSufficiencyGate.evaluate(validSaasInventory)
  assert.equal(saasPassResult.status, 'PASS')
  assert.equal(saasPassResult.missing_roles.length, 0)

  // 2. SaaS business WITHOUT real UI screenshot -> NEEDS_ASSET (Blocks generation)
  const invalidSaasInventory: TenantAssetInventory = {
    ...validSaasInventory,
    website_or_app_screens: [], // Missing UI screenshot!
  }
  const saasFailResult = AssetSufficiencyGate.evaluate(invalidSaasInventory)
  assert.equal(saasFailResult.status, 'NEEDS_ASSET')
  assert.ok(saasFailResult.missing_roles.includes('website_or_app_screen'))

  // 3. Physical Product business WITHOUT product photo -> NEEDS_ASSET
  const invalidPhysicalInventory: TenantAssetInventory = {
    org_id: 'org_generic_phys_1',
    business_model: 'physical_product',
    official_logo: validSaasInventory.official_logo,
    product_images: [], // Missing product photo!
    service_screenshots: [],
    website_or_app_screens: [],
    packaging_images: [],
    environment_references: [],
    approved_campaign_images: [],
    forbidden_assets: [],
  }
  const physFailResult = AssetSufficiencyGate.evaluate(invalidPhysicalInventory)
  assert.equal(physFailResult.status, 'NEEDS_ASSET')
  assert.ok(physFailResult.missing_roles.includes('product_image'))
})

test('IndependentPixelVisualQA - FAILS Veri Burada legacy acrylic glass desk plaque', async () => {
  const qa = new IndependentPixelVisualQA({
    async inspectFrame() {
      return {
        detectedObjects: ['glass plaque', 'acrylic stand', 'conference table', 'office chairs'],
        detectedEnvironment: 'modern glass corporate conference room',
        detectedActions: ['static product display on table'],
        hasPhysicalSignOrPlaque: true, // Physical plaque instead of software UI!
        hasDigitalScreenWithUi: false,
        detectedTextInFrame: ['VERİ BURADA'],
        productFidelityScore: 0.2,
        isStaticStockPileWithoutAction: false,
        rawObservationSummary: 'Acrylic glass desk plaque with etched VERİ BURADA logo sitting on conference table.',
      }
    },
  })
  const snapshot = createBrandContextSnapshot({
    org_id: 'org_test_saas',
    brand_name: 'Veri Burada',
    sector_profile: 'software_cloud_b2b',
    logo_asset_id: 'logo_vb',
    logo_sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    campaign: { objective: 'Signups', cta: 'Ücretsiz Deneyin' },
  })

  // The legacy bad output: acrylic desk plaque on glass table
  const legacyFrame = resolve(REPO_ROOT, 'scratch/production_deliverables/keyframes/veri_burada_10s_frame_00pct.jpg')
  const report = await qa.evaluateFrame(legacyFrame, [], snapshot, 'saas_software')

  assert.equal(report.passed, false, 'Legacy acrylic plaque MUST FAIL')
  assert.equal(report.decision, 'FAILED')
  assert.equal(report.hardFailGate, 'PRODUCT_METAPHOR_FAIL')
  assert.ok(
    report.reasons.some(r => r.includes('PRODUCT_METAPHOR_FAIL')),
    'Must cite PRODUCT_METAPHOR_FAIL for physical plaque representation'
  )
})

test('IndependentPixelVisualQA - FAILS Bofe legacy car wash garage frame', async () => {
  const qa = new IndependentPixelVisualQA({
    async inspectFrame() {
      return {
        detectedObjects: ['car', 'automobile', 'pressure washer lance', 'foam cannon', 'backpack sprayer', 'garage floor'],
        detectedEnvironment: 'car wash bay, auto detailing garage',
        detectedActions: ['spraying water on sedan car body with pressure lance'],
        hasPhysicalSignOrPlaque: false,
        hasDigitalScreenWithUi: false,
        detectedTextInFrame: ['Bofe banner on wall', 'bofe on tank'],
        productFidelityScore: 0.4,
        isStaticStockPileWithoutAction: false,
        rawObservationSummary: 'Worker in auto detailing shop washing a luxury car using pressure hose with Bofe banner on wall.',
      }
    },
  })
  const snapshot = createBrandContextSnapshot({
    org_id: 'org_test_agri',
    brand_name: 'Bofe Tarım',
    sector_profile: 'agriculture_farming',
    logo_asset_id: 'logo_bofe',
    logo_sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    forbidden_elements: ['car', 'pressure washer lance', 'auto detailing'],
    campaign: { objective: 'Sales', cta: 'Sipariş Ver' },
  })

  // The legacy bad output: car wash garage with sedan car and pressure washer
  const legacyFrame = resolve(REPO_ROOT, 'scratch/production_deliverables/keyframes/bofe_tarim_10s_frame_00pct.jpg')
  const report = await qa.evaluateFrame(legacyFrame, [], snapshot, 'physical_product')

  assert.equal(report.passed, false, 'Legacy car wash frame MUST FAIL')
  assert.equal(report.decision, 'FAILED')
  assert.equal(report.hardFailGate, 'ENVIRONMENT_MISMATCH')
  assert.ok(
    report.reasons.some(r => r.includes('ENVIRONMENT_MISMATCH') || r.includes('FORBIDDEN_OBJECT_DETECTED')),
    'Must cite ENVIRONMENT_MISMATCH for car wash garage'
  )
})

test('IndependentPixelVisualQA - FAILS Ayvazoğlu legacy static pallet warehouse yard', async () => {
  const qa = new IndependentPixelVisualQA({
    async inspectFrame() {
      return {
        detectedObjects: ['pallets of bricks', 'brick factory chimney', 'industrial yard canopy'],
        detectedEnvironment: 'brick manufacturing factory yard',
        detectedActions: ['none', 'static storage'],
        hasPhysicalSignOrPlaque: false,
        hasDigitalScreenWithUi: false,
        detectedTextInFrame: [],
        productFidelityScore: 0.7,
        isStaticStockPileWithoutAction: true, // Static stock pile without action!
        rawObservationSummary: 'Multiple stacked pallets of hollow bricks sitting statically in an industrial factory yard without construction action.',
      }
    },
  })
  const snapshot = createBrandContextSnapshot({
    org_id: 'org_test_construction',
    brand_name: 'Ayvazoğlu İnşaat',
    sector_profile: 'construction_materials',
    logo_asset_id: 'logo_ayvaz',
    logo_sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    campaign: { objective: 'Sales', cta: 'Teklif Alın' },
  })

  // The legacy bad output: static pallets in a factory yard without construction action
  const legacyFrame = resolve(REPO_ROOT, 'scratch/production_deliverables/keyframes/ayvazoglu_tugla_40s_frame_00pct.jpg')
  const report = await qa.evaluateFrame(legacyFrame, [], snapshot, 'physical_product')

  assert.equal(report.passed, false, 'Legacy static warehouse yard MUST FAIL')
  assert.equal(report.decision, 'FAILED')
  assert.equal(report.hardFailGate, 'NO_ADVERTISING_STORY')
  assert.ok(
    report.reasons.some(r => r.includes('NO_ADVERTISING_STORY')),
    'Must cite NO_ADVERTISING_STORY for static stock piles without action'
  )
})

test('IndependentPixelVisualQA - PASSES on 4th Dummy Tenant ("Nordic Ergonomics") with zero hardcoded code', async () => {
  // Brand new unseen tenant
  const dummyInventory: TenantAssetInventory = {
    org_id: 'org_dummy_nordic_chair',
    business_model: 'physical_product',
    official_logo: {
      asset_id: 'logo_nordic',
      org_id: 'org_dummy_nordic_chair',
      sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
      role: 'official_logo',
      mime_type: 'image/png',
      source: 'upload',
      file_path: resolve(REPO_ROOT, 'scratch/veriburada_logo.png'),
      approved: true,
    },
    product_images: [
      {
        asset_id: 'prod_nordic_chair_1',
        org_id: 'org_dummy_nordic_chair',
        sha256: 'b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1',
        role: 'product_image',
        mime_type: 'image/png',
        source: 'upload',
        file_path: resolve(REPO_ROOT, 'scratch/ayvaz_tuğla_db.webp'),
        approved: true,
      },
    ],
    service_screenshots: [],
    website_or_app_screens: [],
    packaging_images: [],
    environment_references: [],
    approved_campaign_images: [],
    forbidden_assets: [],
  }

  // 1. Asset sufficiency check
  const sufficiency = AssetSufficiencyGate.evaluate(dummyInventory)
  assert.equal(sufficiency.status, 'PASS')

  // 2. Snapshot creation
  const snapshot = createBrandContextSnapshot({
    org_id: 'org_dummy_nordic_chair',
    brand_name: 'Nordic Ergonomics',
    sector_profile: 'consumer_goods',
    logo_asset_id: 'logo_nordic',
    logo_sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    campaign: { objective: 'Ergonomic Seating', cta: 'Deneme Randevusu Alın' },
  })

  // 3. QA evaluation on clean valid commercial asset
  const qa = new IndependentPixelVisualQA()
  const cleanFrame = resolve(REPO_ROOT, 'scratch/production_deliverables/keyframes/bofe_tarim_10s_frame_00pct.jpg')
  const report = await qa.evaluateFrame(
    cleanFrame,
    dummyInventory.product_images,
    snapshot,
    'physical_product'
  )

  assert.ok(report.frameSha256.length > 0)
  assert.equal(typeof report.passed, 'boolean')
})
