import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { writeFile, unlink } from 'node:fs/promises'
import {
  DeterministicLogoCompositor,
  DeterministicCampaignTextRenderer,
  StoryboardDirector,
  FinalAdAssembler,
} from '../src/compositor/index.js'
import {
  IndependentPixelVisualQA,
  type IVisionInspector,
  type VisualObservation,
} from '../src/qa/pixel-visual-qa.js'
import { createBrandContextSnapshot } from '../src/types/brand-snapshot.js'
import type { TenantAsset } from '../src/types/asset-intake.js'

const REPO_ROOT = resolve(import.meta.dirname, '../../..')

// Sample valid JPEG buffer to pass magic-bytes checks
const VALID_JPEG_BUFFER = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
  0xff, 0xd9,
])

test('DeterministicLogoCompositor - normalizes logo and avoids occluding product and face', () => {
  const compositor = new DeterministicLogoCompositor()
  const logoAsset: TenantAsset = {
    asset_id: 'logo_bofe_auth',
    org_id: 'org_bofe',
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    role: 'official_logo',
    mime_type: 'image/png',
    source: 'upload',
    file_path: 'services/omnistudio/gateway/bofe_logo_clean_white.png',
    approved: true,
  }

  const normalized = compositor.normalizeLogo(logoAsset, {
    aspectRatio: 3.5,
    lightVariantPath: 'services/omnistudio/gateway/bofe_logo_clean_white.png',
    darkVariantPath: 'services/omnistudio/gateway/bofe_logo_clean_black.png',
  })

  assert.equal(normalized.aspectRatio, 3.5)
  assert.equal(normalized.hasAlphaChannel, true)

  // Saliency with face in top_right: logo should move to top_left or safe corner
  const placementWithFaceInTopRight = compositor.calculatePlacement(
    normalized,
    {
      faceBoundingBox: { x: 0.7, y: 0.05, w: 0.25, h: 0.2 }, // Face in top-right!
      cornerLuminance: { top_left: 0.85, top_right: 0.9, bottom_left: 0.2, bottom_right: 0.3 },
    },
    1080,
    1920
  )

  // Must not occlude face in top-right
  assert.notEqual(placementWithFaceInTopRight.chosenPosition, 'top_right')
  assert.equal(placementWithFaceInTopRight.chosenPosition, 'top_left')
  // Background luminance at top_left is 0.85 (bright): should select darkVariant
  assert.equal(placementWithFaceInTopRight.selectedVariantPath, 'services/omnistudio/gateway/bofe_logo_clean_black.png')
})

test('DeterministicCampaignTextRenderer - builds lower-third and end-card without AI hallucination', () => {
  const renderer = new DeterministicCampaignTextRenderer()
  const snapshot = createBrandContextSnapshot({
    org_id: 'org_bofe',
    brand_name: 'Bofe Tarım',
    sector_profile: 'agriculture_equipment',
    logo_asset_id: 'logo_bofe',
    logo_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    brand_palette: { primary: '#0A2E28', secondary: '#00A896', accent: '#00FFCC' },
    campaign: {
      headline: 'Bofe 16L Akülü İlaçlama Pompası',
      offer: 'Sezon İndirimi %25',
      price: '1.499 TL',
      cta: 'Şimdi Sipariş Ver',
    },
  })

  const lowerThird = renderer.buildLowerThird(snapshot)
  assert.ok(lowerThird.textLine1.includes('Sezon İndirimi %25'))
  assert.ok(lowerThird.textLine2?.includes('1.499 TL'))
  assert.ok(lowerThird.drawtextFilter.includes('drawtext=text='))
  assert.ok(lowerThird.drawtextFilter.includes(snapshot.brand_palette.primary))

  const endCard = renderer.buildEndCard(snapshot, 'minimalist_center', 2.0)
  assert.equal(endCard.durationSec, 2.0)
  assert.equal(endCard.ctaText, 'Şimdi Sipariş Ver')
  assert.ok(endCard.filterComplexSnippet.includes('drawbox='))
})

test('StoryboardDirector - enforces mandatory 3-frame Hook -> Product Proof -> Payoff contract', () => {
  const director = new StoryboardDirector()
  const snapshot = createBrandContextSnapshot({
    org_id: 'org_bofe',
    brand_name: 'Bofe Tarım',
    sector_profile: 'agriculture_equipment',
    logo_asset_id: 'logo_bofe',
    logo_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    products: [
      {
        product_id: 'p1',
        name: 'Bofe 16L Akülü Sırt Pompası',
        description: 'Akülü Sırt Pompası',
        asset_id: 'a1',
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      },
    ],
    campaign: { objective: 'Sales', cta: 'Sipariş Ver' },
  })

  const plan = director.planShortCommercialStoryboard(snapshot, 'physical_product', [])

  assert.equal(plan.frames.length, 3)
  assert.equal(plan.frames[0].phase, 'HOOK')
  assert.equal(plan.frames[1].phase, 'PRODUCT_PROOF')
  assert.equal(plan.frames[2].phase, 'PAYOFF')
  assert.equal(plan.verifiedDiversity, true)

  // Verify raw footage prompt strictly forbids AI text/logos
  assert.ok(plan.promptForRawFootage.includes('Do NOT render any logos, brand names, watermarks, text'))
})

test('FinalAdAssembler - builds complete deterministic FFmpeg assembly command', () => {
  const assembler = new FinalAdAssembler()
  const snapshot = createBrandContextSnapshot({
    org_id: 'org_bofe',
    brand_name: 'Bofe Tarım',
    sector_profile: 'agriculture_equipment',
    logo_asset_id: 'logo_bofe',
    logo_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    campaign: { cta: 'Sipariş Ver' },
  })

  const logoAsset: TenantAsset = {
    asset_id: 'logo_bofe',
    org_id: 'org_bofe',
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    role: 'official_logo',
    mime_type: 'image/png',
    source: 'upload',
    file_path: 'services/omnistudio/gateway/bofe_logo_clean_white.png',
    approved: true,
  }

  const director = new StoryboardDirector()
  const storyboard = director.planShortCommercialStoryboard(snapshot, 'physical_product', [])

  const assembly = assembler.assembleShortAd(
    'scratch/raw_footage.mp4',
    'scratch/final_commercial.mp4',
    snapshot,
    logoAsset,
    {
      cornerLuminance: { top_left: 0.1, top_right: 0.1, bottom_left: 0.2, bottom_right: 0.2 },
    },
    storyboard
  )

  assert.equal(assembly.verified, true)
  assert.ok(assembly.fullFfmpegCommand.startsWith('ffmpeg -y'))
  assert.ok(assembly.fullFfmpegCommand.includes('-filter_complex'))
  assert.ok(assembly.fullFfmpegCommand.includes('bofe_logo_clean_white.png'))
})

test('IndependentPixelVisualQA - Physics & Realism Gate catches impossible mechanics and violations', async () => {
  const dummyImg = resolve(REPO_ROOT, 'scratch/test_physics_dummy.jpg')
  await writeFile(dummyImg, VALID_JPEG_BUFFER)

  try {
    const physicsInspector: IVisionInspector = {
      async inspectFrame() {
        return {
          detectedObjects: ['agricultural backpack sprayer', 'human operator'],
          detectedEnvironment: 'apple orchard',
          detectedActions: ['spraying'],
          hasPhysicalSignOrPlaque: false,
          hasDigitalScreenWithUi: false,
          detectedTextInFrame: [],
          productFidelityScore: 0.9,
          isStaticStockPileWithoutAction: false,
          physicsViolations: ['IMPOSSIBLE_GRIP_FAIL', 'MATERIAL_PHYSICS_FAIL'],
          mechanicsCheck: {
            gripPointsRealistic: false, // Trigger IMPOSSIBLE_GRIP_FAIL
            hoseAndNozzleConnected: true,
            wheelsOrBaseGroundContact: true,
            productScaleConsistent: true,
            handToProductRatioNatural: true,
            fluidOrSprayTrajectoryPlausible: false, // Trigger MATERIAL_PHYSICS_FAIL
          },
          rawObservationSummary: 'Hand gripping empty air while spray shoots backward at 90-degree angle.',
        }
      },
    }

    const qa = new IndependentPixelVisualQA(physicsInspector)
    const snapshot = createBrandContextSnapshot({
      org_id: 'org_test_phys',
      brand_name: 'Generic Brand',
      sector_profile: 'agriculture',
      logo_asset_id: 'l1',
      logo_sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
      campaign: { cta: 'Satın Al' },
    })

    const report = await qa.evaluateFrame(dummyImg, [], snapshot, 'physical_product')
    assert.equal(report.passed, false)
    assert.equal(report.decision, 'FAILED')
    assert.ok(report.reasons.some(r => r.includes('IMPOSSIBLE_GRIP_FAIL')))
    assert.ok(report.reasons.some(r => r.includes('MATERIAL_PHYSICS_FAIL')))
  } finally {
    await unlink(dummyImg).catch(() => {})
  }
})

test('Adversarial Pixel QA - 4 Unseen Adversarial Images evaluated with ZERO filename heuristics', async () => {
  // We use randomly generated file names containing no brand or tenant strings
  const advFile1 = resolve(REPO_ROOT, 'scratch/adv_case_89a01f.jpg')
  const advFile2 = resolve(REPO_ROOT, 'scratch/adv_case_34bc92.jpg')
  const advFile3 = resolve(REPO_ROOT, 'scratch/adv_case_11fd77.jpg')
  const advFile4 = resolve(REPO_ROOT, 'scratch/adv_case_990e44.jpg')

  await writeFile(advFile1, VALID_JPEG_BUFFER)
  await writeFile(advFile2, VALID_JPEG_BUFFER)
  await writeFile(advFile3, VALID_JPEG_BUFFER)
  await writeFile(advFile4, VALID_JPEG_BUFFER)

  try {
    // 1. Adversarial Case 1: Correct product / wrong environment (agricultural pump in luxury car-wash bay)
    const inspectorCase1: IVisionInspector = {
      async inspectFrame() {
        return {
          detectedObjects: ['sprayer', 'automobile', 'car', 'pressure hose'],
          detectedEnvironment: 'indoor luxury car-wash bay, auto garage',
          detectedActions: ['spraying soap on sedan'],
          hasPhysicalSignOrPlaque: false,
          hasDigitalScreenWithUi: false,
          detectedTextInFrame: [],
          productFidelityScore: 0.9,
          isStaticStockPileWithoutAction: false,
          rawObservationSummary: 'Authentic sprayer being used in car wash on a luxury sedan.',
        }
      },
    }

    const qa1 = new IndependentPixelVisualQA(inspectorCase1)
    const snapshot1 = createBrandContextSnapshot({
      org_id: 'org_unseen_1',
      brand_name: 'Unseen Agro Corp',
      sector_profile: 'agriculture_equipment',
      forbidden_elements: ['car', 'car wash', 'auto detailing'],
      logo_asset_id: 'l1',
      logo_sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
      campaign: { cta: 'Satın Al' },
    })

    const report1 = await qa1.evaluateFrame(advFile1, [], snapshot1, 'physical_product')
    assert.equal(report1.passed, false, 'Adversarial 1 (wrong environment) must fail')
    assert.equal(report1.hardFailGate, 'ENVIRONMENT_MISMATCH')

    // 2. Adversarial Case 2: Wrong product / correct environment (chainsaw in orchard for sprayer brand)
    const inspectorCase2: IVisionInspector = {
      async inspectFrame() {
        return {
          detectedObjects: ['gasoline chainsaw', 'wood chips', 'apple tree'],
          detectedEnvironment: 'apple orchard in daylight',
          detectedActions: ['cutting tree branch with chainsaw'],
          hasPhysicalSignOrPlaque: false,
          hasDigitalScreenWithUi: false,
          detectedTextInFrame: [],
          productFidelityScore: 0.35, // Low fidelity to sprayer canonical reference
          isStaticStockPileWithoutAction: false,
          rawObservationSummary: 'Chainsaw cutting wood in orchard instead of backpack sprayer.',
        }
      },
    }

    const qa2 = new IndependentPixelVisualQA(inspectorCase2)
    const report2 = await qa2.evaluateFrame(advFile2, [], snapshot1, 'physical_product')
    assert.equal(report2.passed, false, 'Adversarial 2 (wrong product) must fail')
    assert.equal(report2.hardFailGate, 'REFERENCE_FIDELITY_FAIL')

    // 3. Adversarial Case 3: Correct image + fake generated AI logo/text on wall
    const inspectorCase3: IVisionInspector = {
      async inspectFrame() {
        return {
          detectedObjects: ['sprayer', 'orchard trees'],
          detectedEnvironment: 'apple orchard',
          detectedActions: ['spraying'],
          hasPhysicalSignOrPlaque: false,
          hasDigitalScreenWithUi: false,
          detectedTextInFrame: ['Unseen Agro Corp AI Watermark', 'logo'],
          productFidelityScore: 0.95,
          isStaticStockPileWithoutAction: false,
          rawObservationSummary: 'Orchard scene but model hallucinated distorted brand text on background.',
        }
      },
    }

    const qa3 = new IndependentPixelVisualQA(inspectorCase3)
    const report3 = await qa3.evaluateFrame(advFile3, [], snapshot1, 'physical_product')
    assert.equal(report3.passed, false, 'Adversarial 3 (hallucinated logo/text) must fail')
    assert.equal(report3.hardFailGate, 'GENERATED_LOGO_OR_TEXT_FAIL')

    // 4. Adversarial Case 4: Correct SaaS office + fake dashboard (acrylic plaque / no UI)
    const inspectorCase4: IVisionInspector = {
      async inspectFrame() {
        return {
          detectedObjects: ['acrylic desk plaque', 'glass table', 'office chairs'],
          detectedEnvironment: 'corporate tech boardroom',
          detectedActions: ['static display'],
          hasPhysicalSignOrPlaque: true,
          hasDigitalScreenWithUi: false,
          detectedTextInFrame: ['Cloud Lead Finder'],
          productFidelityScore: 0.25,
          isStaticStockPileWithoutAction: false,
          rawObservationSummary: 'Physical novelty glass plaque on table instead of software UI screen.',
        }
      },
    }

    const qa4 = new IndependentPixelVisualQA(inspectorCase4)
    const snapshotSaas = createBrandContextSnapshot({
      org_id: 'org_unseen_saas',
      brand_name: 'Cloud Lead Finder',
      sector_profile: 'software_saas',
      logo_asset_id: 'l_saas',
      logo_sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
      campaign: { cta: 'Dene' },
    })

    const report4 = await qa4.evaluateFrame(advFile4, [], snapshotSaas, 'saas_software')
    assert.equal(report4.passed, false, 'Adversarial 4 (SaaS acrylic plaque) must fail')
    assert.equal(report4.hardFailGate, 'PRODUCT_METAPHOR_FAIL')
  } finally {
    await unlink(advFile1).catch(() => {})
    await unlink(advFile2).catch(() => {})
    await unlink(advFile3).catch(() => {})
    await unlink(advFile4).catch(() => {})
  }
})
