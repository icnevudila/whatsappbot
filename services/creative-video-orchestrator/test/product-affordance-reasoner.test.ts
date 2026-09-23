import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ProductAffordanceReasoner,
  productAffordanceReasoner,
  ShortAdCreativeDirector,
  createBrandContextSnapshot,
} from '../src/index.js'

test('ProductAffordanceReasoner - Bofe Tarım Sprayer infers orchard/field and strictly forbids factory/warehouse/hardhat', async () => {
  const reasoner = new ProductAffordanceReasoner()
  const report = await reasoner.reasonAffordance({
    brandName: 'Bofe Tarım',
    productName: 'Bofe 16L Akülü Sırt Pompası',
    productDescription: 'Bahçe ve zeytinlikler için şarjlı tarımsal pülverizatör ilaçlama pompası',
  })

  assert.equal(report.detectedSector, 'agriculture_farming')
  assert.ok(
    report.naturalEnvironment.includes('bahçe') ||
    report.naturalEnvironment.includes('zeytinlik') ||
    report.naturalEnvironment.includes('tarla'),
    `Expected agricultural environment, got: ${report.naturalEnvironment}`
  )
  assert.ok(report.actorRole.includes('Çiftçi') || report.actorRole.includes('Bahçıvan'))
  assert.ok(report.negativeEnvironmentConstraints.includes('no factory'))
  assert.ok(report.negativeEnvironmentConstraints.includes('no warehouse'))
  assert.ok(report.negativeEnvironmentConstraints.includes('no construction hardhat'))
  assert.ok(report.negativeEnvironmentConstraints.includes('no reflective safety vest'))
  assert.ok(report.negativeEnvironmentConstraints.includes('no concrete industrial floor'))
})

test('ProductAffordanceReasoner - Ayvazoğlu Brick infers construction site and forbids farmland/orchard', async () => {
  const reasoner = new ProductAffordanceReasoner()
  const report = await reasoner.reasonAffordance({
    brandName: 'Ayvazoğlu İnşaat',
    productName: '18 Delikli Killi Blok Tuğla',
    productDescription: 'Yüksek mukavemetli fırınlanmış duvar yapı malzemesi',
  })

  assert.equal(report.detectedSector, 'industrial_construction')
  assert.ok(
    report.naturalEnvironment.includes('şantiye') ||
    report.naturalEnvironment.includes('yapı') ||
    report.naturalEnvironment.includes('inşaat'),
    `Expected construction environment, got: ${report.naturalEnvironment}`
  )
  assert.ok(report.actorRole.includes('Usta') || report.actorRole.includes('Mühendis'))
  assert.ok(report.negativeEnvironmentConstraints.includes('no farmland'))
  assert.ok(report.negativeEnvironmentConstraints.includes('no orchard'))
})

test('ProductAffordanceReasoner - Veri Burada SaaS infers office/desktop and forbids mud/factory', async () => {
  const reasoner = new ProductAffordanceReasoner()
  const report = await reasoner.reasonAffordance({
    brandName: 'Veri Burada',
    productName: 'B2B Firma Bulma ve İstihbarat Platformu',
    productDescription: 'Google Haritalar işletme verisi ve CRM entegrasyonu yazılımı',
  })

  assert.equal(report.detectedSector, 'b2b_tech_data')
  assert.ok(
    report.naturalEnvironment.includes('ofis') ||
    report.naturalEnvironment.includes('laptop') ||
    report.naturalEnvironment.includes('çalışma'),
    `Expected office environment, got: ${report.naturalEnvironment}`
  )
  assert.ok(report.negativeEnvironmentConstraints.includes('no farmland'))
  assert.ok(report.negativeEnvironmentConstraints.includes('no mud'))
  assert.ok(report.negativeEnvironmentConstraints.includes('no factory floor'))
})

test('ShortAdCreativeDirector - embeds dynamic affordance negative constraints into masterPlan', async () => {
  const director = new ShortAdCreativeDirector()
  const snapshot = createBrandContextSnapshot({
    org_id: 'org_bofe_test',
    brand_name: 'Bofe Tarım',
    sector_profile: 'agriculture_equipment',
    logo_asset_id: 'logo_bofe',
    logo_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    products: [
      {
        product_id: 'prod_bofe_16l',
        name: 'Bofe 16L Akülü Sırt Pompası',
        description: 'Meyve bahçeleri için tarımsal şarjlı ilaçlama pompası',
        asset_id: 'asset_bofe_16l',
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      },
    ],
    campaign: {
      cta: 'Şimdi Sipariş Ver',
    },
  })

  const masterPlan = await director.planCommercial(snapshot, 'physical_product', [])
  
  // Verify negative constraints include anti-factory protections
  assert.ok(masterPlan.negative_constraints.includes('no factory'))
  assert.ok(masterPlan.negative_constraints.includes('no warehouse'))
  assert.ok(masterPlan.negative_constraints.includes('no construction hardhat'))
  assert.ok(masterPlan.negative_constraints.includes('no reflective safety vest'))
})
