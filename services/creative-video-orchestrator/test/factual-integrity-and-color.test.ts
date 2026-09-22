import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  createBrandContextSnapshot,
  FactualIntegrityGate,
  IndependentPixelVisualQA,
  createJobAssetManifest,
  ShortAdCreativeDirector,
  VeoPromptCompiler,
  DeterministicCampaignTextRenderer,
} from '../src/index.js'

test('FactualIntegrityGate - unverified phone inserted only at compositor/end-card stage -> TEST MUST FAIL', () => {
  const snapshot = createBrandContextSnapshot({
    org_id: 'org_bofe',
    brand_name: 'Bofe Tarım',
    sector_profile: 'agriculture_equipment',
    logo_asset_id: 'logo_bofe',
    logo_sha256: '0576350c4d92212bd8c219b4b095cf3bc2060302b978753549ad1d3d95c4d8e8',
    campaign: {
      objective: 'Brand Awareness',
      headline: 'Bofe Şarjlı Sırt Pompası 16L',
      cta: 'Bofe Güvencesiyle',
      // NOTICE: No verified phone number!
    },
    unverified_facts: ['0850 123 45 67', 'www.bofe.com'],
  })

  // Simulated rogue compositor injection of unverified phone
  const rogueEndCard = {
    headline: 'Bofe Tarım',
    ctaText: 'Bofe Güvencesiyle',
    contactInfo: '0850 123 45 67',
    filterComplexSnippet: "drawtext=text='0850 123 45 67'",
  }

  const report = FactualIntegrityGate.validateCompositorSpec(
    { endCard: rogueEndCard },
    snapshot
  )

  assert.equal(report.passed, false)
  assert.equal(report.hardFailGate, 'UNVERIFIED_PHONE_LEAKAGE')
  assert.ok(report.violations.some(v => v.unverifiedValue.includes('0850')))
})

test('FactualIntegrityGate - unverified claim inserted only in Veo prompt -> TEST MUST FAIL', () => {
  const snapshot = createBrandContextSnapshot({
    org_id: 'org_bofe',
    brand_name: 'Bofe Tarım',
    sector_profile: 'agriculture_equipment',
    logo_asset_id: 'logo_bofe',
    logo_sha256: '0576350c4d92212bd8c219b4b095cf3bc2060302b978753549ad1d3d95c4d8e8',
    campaign: {
      objective: 'Brand Awareness',
      headline: 'Bofe Şarjlı Sırt Pompası 16L',
      cta: 'Bofe Güvencesiyle',
    },
    unverified_facts: ['mikronize', 'homojen sis', 'without leaking', 'yorulmadan'],
    verified_claims: ['16L Hazne', 'Pirinç Püskürtme Borusu'],
  })

  // Prompt containing unverified performance claim "without leaking" and "homojen sis"
  const roguePrompt =
    'Cinematic shot of farmer in orchard. The sprayer operates with true fluid atomization without leaking and homojen sis covering leaves.'

  const report = FactualIntegrityGate.validateVeoPrompt(roguePrompt, snapshot)

  assert.equal(report.passed, false)
  assert.equal(report.hardFailGate, 'UNVERIFIED_CLAIM_LEAKAGE')
  assert.ok(
    report.violations.some(v => v.unverifiedValue === 'without leaking' || v.unverifiedValue === 'homojen sis')
  )
})

test('IndependentPixelVisualQA - canonical product color disagreement -> TEST MUST FAIL / NEEDS_REVIEW', async () => {
  // Test with custom VisionInspector detecting color discrepancy between generated frame and @HeroProduct
  const mockColorDisagreementInspector = {
    async inspectFrame() {
      return {
        detectedObjects: ['sprayer', 'farmer'],
        detectedEnvironment: 'orchard',
        detectedActions: ['spraying'],
        hasPhysicalSignOrPlaque: false,
        hasDigitalScreenWithUi: false,
        detectedTextInFrame: [],
        productFidelityScore: 0.90,
        isStaticStockPileWithoutAction: false,
        colorDisagreement: true,
        detectedProductColor: 'yellow',
        canonicalColorMismatchReason:
          'Canonical reference (@HeroProduct) is turquoise/cyan tank with grey base, but generated frame produced bright yellow body.',
        rawObservationSummary: 'Observed yellow sprayer instead of canonical cyan/turquoise sprayer.',
      }
    },
  }

  const qa = new IndependentPixelVisualQA(mockColorDisagreementInspector)
  const snapshot = createBrandContextSnapshot({
    org_id: 'org_bofe',
    brand_name: 'Bofe Tarım',
    sector_profile: 'agriculture_equipment',
    logo_asset_id: 'logo_bofe',
    logo_sha256: '0576350c4d92212bd8c219b4b095cf3bc2060302b978753549ad1d3d95c4d8e8',
    campaign: {
      objective: 'Brand Awareness',
      headline: 'Bofe 16L',
      cta: 'Bofe Güvencesiyle',
    },
  })

  // Write a valid JPEG buffer to temp file to pass magic byte checks
  const tmpPath = 'test_color_frame.jpg'
  const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, 0xff, 0xd9])
  const { writeFileSync, unlinkSync } = await import('node:fs')
  writeFileSync(tmpPath, validJpeg)

  try {
    const report = await qa.evaluateFrame(tmpPath, [], snapshot, 'physical_product')

    assert.equal(report.passed, false)
    assert.equal(report.decision, 'FAILED')
    assert.equal(report.hardFailGate, 'COLOR_DISAGREEMENT')
    assert.ok(report.reasons.some(r => r.includes('COLOR_DISAGREEMENT')))
  } finally {
    try { unlinkSync(tmpPath) } catch {}
  }
})

test('JobAssetManifest - USE PROVIDED ASSETS OR FAIL CLOSED (NEEDS_ASSET / NEEDS_FACT)', () => {
  // 1. Missing @BrandLogo -> NEEDS_ASSET
  const missingLogoResult = createJobAssetManifest({
    job_id: 'job_001',
    org_id: 'org_bofe',
    authoritative_assets: {
      heroProduct: {
        handle: '@HeroProduct',
        assetId: 'prod_bofe_01',
        filePath: 'scratch/bofe_authoritative_product.jpg',
        sha256: 'fd99aabb97b39bb3d0557def0f45725d1e7917203777121e775d99d4c71f8e4c',
        mimeType: 'image/jpeg',
      },
    },
    authoritative_facts: {
      brand_name: 'Bofe',
      product_name: 'Bofe 16L Akülü Sırt Pompası',
    },
  })
  assert.equal(missingLogoResult.status, 'NEEDS_ASSET')
  if (missingLogoResult.status === 'NEEDS_ASSET') {
    assert.deepEqual(missingLogoResult.missingAssets, ['@BrandLogo'])
  }

  // 2. Missing @HeroProduct in physical product -> NEEDS_ASSET
  const missingProductResult = createJobAssetManifest({
    job_id: 'job_002',
    org_id: 'org_bofe',
    authoritative_assets: {
      brandLogo: {
        handle: '@BrandLogo',
        assetId: 'logo_bofe_01',
        filePath: 'services/omnistudio/gateway/bofe_logo_official_white.png',
        sha256: '0576350c4d92212bd8c219b4b095cf3bc2060302b978753549ad1d3d95c4d8e8',
        mimeType: 'image/png',
      },
    },
    authoritative_facts: {
      brand_name: 'Bofe',
      product_name: 'Bofe 16L Akülü Sırt Pompası',
    },
    business_model: 'physical_product',
  })
  assert.equal(missingProductResult.status, 'NEEDS_ASSET')
  if (missingProductResult.status === 'NEEDS_ASSET') {
    assert.deepEqual(missingProductResult.missingAssets, ['@HeroProduct'])
  }

  // 3. Complete Authoritative Manifest -> READY and plans cleanly without hallucination
  const readyResult = createJobAssetManifest({
    job_id: 'job_bofe_canary_01',
    org_id: 'org_bofe',
    authoritative_assets: {
      brandLogo: {
        handle: '@BrandLogo',
        assetId: 'logo_bofe_01',
        filePath: 'services/omnistudio/gateway/bofe_logo_official_white.png',
        sha256: '0576350c4d92212bd8c219b4b095cf3bc2060302b978753549ad1d3d95c4d8e8',
        mimeType: 'image/png',
      },
      heroProduct: {
        handle: '@HeroProduct',
        assetId: 'prod_bofe_01',
        filePath: 'scratch/bofe_authoritative_product.jpg',
        sha256: 'fd99aabb97b39bb3d0557def0f45725d1e7917203777121e775d99d4c71f8e4c',
        mimeType: 'image/jpeg',
      },
    },
    authoritative_facts: {
      brand_name: 'Bofe',
      product_name: 'Bofe 16L Akülü Sırt Pompası',
      description: '16 litre kapasiteli şarjlı sırt tipi ilaçlama pompası.',
      approved_spoken_line: 'İşinizi hızlandıran güç, şimdi yanınızda.',
      cta: 'Bofe Güvencesiyle',
      // No phone, no url, no price provided -> MUST NOT BE INVENTED
    },
  })
  assert.equal(readyResult.status, 'READY')
  if (readyResult.status === 'READY') {
    assert.ok(readyResult.manifest.manifest_sha256)
  }
})

test('CreativeQA - evaluateDiegeticLogoQA handles KEEP_GENERATED_DIEGETIC_LOGO vs DIEGETIC_SURFACE_RESTORE', async () => {
  const { CreativeQA } = await import('../src/index.js')

  // Case 1: High fidelity generated logo -> KEEP_GENERATED_DIEGETIC_LOGO
  const highFidelityReport = CreativeQA.evaluateDiegeticLogoQA({
    sceneId: 'scene_bofe_01',
    hasNaturalBrandingSurface: true,
    surfaceType: 'equipment_panel',
    generatedLogoFidelityScore: 0.92,
    surfaceTrackable: true,
  })
  assert.equal(highFidelityReport.decision, 'KEEP_GENERATED_DIEGETIC_LOGO')
  assert.equal(highFidelityReport.passed, true)
  assert.equal(highFidelityReport.surfaceRestoreRequired, false)

  // Case 2: Corrupted logo (< 85%) on trackable equipment panel -> DIEGETIC_SURFACE_RESTORE
  const restoreReport = CreativeQA.evaluateDiegeticLogoQA({
    sceneId: 'scene_bofe_01',
    hasNaturalBrandingSurface: true,
    surfaceType: 'equipment_panel',
    generatedLogoFidelityScore: 0.65,
    surfaceTrackable: true,
  })
  assert.equal(restoreReport.decision, 'DIEGETIC_SURFACE_RESTORE')
  assert.equal(restoreReport.passed, true)
  assert.equal(restoreReport.surfaceRestoreRequired, true)

  // Case 3: Corrupted logo on non-trackable surface -> LOGO_FIDELITY_FAIL
  const failReport = CreativeQA.evaluateDiegeticLogoQA({
    sceneId: 'scene_bofe_01',
    hasNaturalBrandingSurface: true,
    surfaceType: 'equipment_panel',
    generatedLogoFidelityScore: 0.50,
    surfaceTrackable: false,
  })
  assert.equal(failReport.decision, 'LOGO_FIDELITY_FAIL')
  assert.equal(failReport.passed, false)
  assert.equal(failReport.surfaceRestoreRequired, false)
})

