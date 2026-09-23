import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  AdFormatRouter,
  AdvertisingGrammarRegistry,
  FormatVariantSelector,
  CreativeDiversityGuard,
  ShortAdCreativeDirector,
  createJobAssetManifest,
  type CreativeFingerprint,
  type UserStylePreference,
  type AdvertisingFormat,
} from '../src/index.js'

test('AdFormatRouter - maps all 7 UserStylePreferences accurately with explicit selection reasons', () => {
  const router = new AdFormatRouter()

  const preferences: Array<{ pref: UserStylePreference; expectedFormat: AdvertisingFormat }> = [
    { pref: 'FAST_SALES', expectedFormat: 'PERFORMANCE_DEMO' },
    { pref: 'PRODUCT_USAGE', expectedFormat: 'PRODUCT_USAGE' },
    { pref: 'PROBLEM_SOLUTION', expectedFormat: 'PROBLEM_SOLUTION' },
    { pref: 'SOCIAL_UGC', expectedFormat: 'UGC_TESTIMONIAL' },
    { pref: 'PREMIUM', expectedFormat: 'PRODUCT_HERO' },
    { pref: 'OFFER', expectedFormat: 'OFFER_DRIVEN' },
  ]

  for (const { pref, expectedFormat } of preferences) {
    const result = router.routeStyleToFormat(pref, 'sales', 'general', 'physical_product')
    assert.equal(result.ad_format, expectedFormat, `Failed for preference ${pref}`)
    assert.ok(result.selection_reason.length > 10, 'Selection reason must provide clear audit explanation')
    assert.equal(result.fallback_applied, false)
  }
})

test('AdFormatRouter - AUTO preference intelligently resolves based on objective & business model without hardcoding', () => {
  const router = new AdFormatRouter()

  // 1. Physical conversion defaults strictly to PERFORMANCE_DEMO (never BRAND_CINEMATIC)
  const defaultPhys = router.routeStyleToFormat('AUTO', 'conversion', 'retail', 'physical_product')
  assert.equal(defaultPhys.ad_format, 'PERFORMANCE_DEMO')
  assert.ok(defaultPhys.selection_reason.includes('PERFORMANCE_DEMO'))

  // 2. SaaS software routes to SOFTWARE_DEMO
  const saasResult = router.routeStyleToFormat('AUTO', 'conversion', 'b2b', 'saas_software')
  assert.equal(saasResult.ad_format, 'SOFTWARE_DEMO')

  // 3. SaaS with pain points routes to PROBLEM_SOLUTION
  const saasPain = router.routeStyleToFormat('AUTO', 'solve operational pain points', 'b2b', 'saas_software')
  assert.equal(saasPain.ad_format, 'PROBLEM_SOLUTION')

  // 4. Offer / Discount objective routes to OFFER_DRIVEN
  const offerResult = router.routeStyleToFormat('AUTO', 'weekend flash discount', 'retail', 'physical_product')
  assert.equal(offerResult.ad_format, 'OFFER_DRIVEN')

  // 5. UGC / Customer reaction objective routes to UGC_TESTIMONIAL
  const ugcResult = router.routeStyleToFormat('AUTO', 'authentic customer testimonial', 'cosmetics', 'physical_product')
  assert.equal(ugcResult.ad_format, 'UGC_TESTIMONIAL')

  // 6. Brand awareness for physical product routes to PRODUCT_HERO (not abstract mood film)
  const awarenessResult = router.routeStyleToFormat('AUTO', 'brand_awareness', 'fashion', 'physical_product')
  assert.equal(awarenessResult.ad_format, 'PRODUCT_HERO')
})

test('AdvertisingGrammarRegistry - all supported formats define rich variant families and strict television grammar', () => {
  const allFormats = AdvertisingGrammarRegistry.getAllFormats()
  assert.ok(allFormats.length >= 8, `Expected at least 8 formats, got ${allFormats.length}`)

  for (const format of allFormats) {
    const spec = AdvertisingGrammarRegistry.getSpec(format)
    assert.equal(spec.format, format)
    assert.ok(spec.description.length > 10)
    assert.ok(spec.supportedVariants.length >= 2, `Format ${format} must support multiple variant families`)
    assert.ok(spec.supportedVariants.includes(spec.defaultVariant), `Default variant must be in supported variants`)
    assert.equal(spec.structuralStages.length, 5, `Must define all 5 timeline stages for ${format}`)
    assert.ok(spec.targetTotalWords[0] >= 15 && spec.targetTotalWords[1] <= 25, `Speech tempo must target natural 8s range (15-25 words) for ${format}, got ${spec.targetTotalWords}`)
    assert.ok(spec.onScreenCopyMaxLevels <= 3, `On screen copy must not exceed 3 levels for ${format}`)
  }
})

test('FormatVariantSelector - selects contextual variant and rotates to prevent tenant creative fatigue', () => {
  const selector = new FormatVariantSelector()

  // 1. Initial selection for agriculture outdoor gear favors MACRO_FIRST
  const initial = selector.selectVariant('PERFORMANCE_DEMO', 'agriculture', 'physical_product', [], 'org_bofe')
  assert.equal(initial.format_variant, 'MACRO_FIRST')

  // 2. Tenant has recent history with MACRO_FIRST -> selector rotates to another variant
  const history: CreativeFingerprint[] = [
    {
      tenant_id: 'org_bofe',
      ad_format: 'PERFORMANCE_DEMO',
      format_variant: 'MACRO_FIRST',
      hook_type: 'macro_nozzle_spray',
      opening_visual_type: 'product_functional_macro',
      camera_pattern: 'macro_cine_shallow_push',
      environment_type: 'orchard',
      speech_structure: 'HOOK_PROOF_PAYOFF',
      end_card_family: 'minimalist_center',
    },
  ]

  const rotated = selector.selectVariant('PERFORMANCE_DEMO', 'agriculture', 'physical_product', history, 'org_bofe')
  assert.notEqual(rotated.format_variant, 'MACRO_FIRST', 'Must not select the exact same variant back-to-back')
  assert.ok(rotated.selection_reason.includes('Rotated from previous variant'))
})

test('CreativeDiversityGuard - rejects identical back-to-back ads and rotates creative framing while preserving authoritative assets', () => {
  const guard = new CreativeDiversityGuard()
  const spec = AdvertisingGrammarRegistry.getSpec('PERFORMANCE_DEMO')

  const candidate: CreativeFingerprint = {
    tenant_id: 'org_tenant_1',
    ad_format: 'PERFORMANCE_DEMO',
    format_variant: 'MACRO_FIRST',
    hook_type: 'macro_detail',
    opening_visual_type: 'product_functional_macro',
    camera_pattern: 'macro_cine_shallow_push',
    environment_type: 'workshop',
    speech_structure: 'HOOK_PROOF_PAYOFF',
    end_card_family: 'minimalist_center',
  }

  // Identical prior ad
  const history: CreativeFingerprint[] = [{ ...candidate }]

  const evalResult = guard.evaluateDiversity(candidate, history)
  assert.equal(evalResult.isRepetitive, true)
  assert.ok(evalResult.repetitionScore >= 0.6)

  const { fingerprint: diversified, modified, reasons } = guard.guardAndDiversify(
    candidate,
    history,
    spec.supportedVariants
  )

  assert.equal(modified, true)
  assert.notEqual(diversified.format_variant, candidate.format_variant)
  assert.notEqual(diversified.camera_pattern, candidate.camera_pattern)
  assert.ok(reasons.length > 0)

  // Invariant preservation check: tenant identity remains unchanged
  assert.equal(diversified.tenant_id, candidate.tenant_id)
})

test('ShortAdCreativeDirector - end-to-end planFromJobManifest with custom user style preference and subtitles mode', async () => {
  const director = new ShortAdCreativeDirector()

  const manifest = createJobAssetManifest({
    job_id: 'job_test_grammar_01',
    org_id: 'org_test_tenant',
    authoritative_assets: {
      brandLogo: {
        handle: '@BrandLogo',
        assetId: 'logo_01',
        filePath: 'scratch/bofe_logo_pure_transparent.png',
        sha256: '0576350c4d92212bd8c219b4b095cf3bc2060302b978753549ad1d3d95c4d8e8',
        mimeType: 'image/png',
      },
      heroProduct: {
        handle: '@HeroProduct',
        assetId: 'prod_01',
        filePath: 'scratch/bofe_authoritative_product.jpg',
        sha256: 'fd99aabb97b39bb3d0557def0f45725d1e7917203777121e775d99d4c71f8e4c',
        mimeType: 'image/jpeg',
      },
    },
    authoritative_facts: {
      brand_name: 'TestBrand',
      product_name: 'SuperTool 5000',
      description: 'Endüstriyel tork kontrollü montaj aleti.',
      cta: 'Şimdi Keşfedin',
    },
    creative_request: {
      duration_sec: 8,
      aspect_ratio: '9:16',
      language: 'tr-TR',
      objective: 'conversion',
      user_style_preference: 'FAST_SALES',
      subtitles: 'auto',
    },
  })

  assert.equal(manifest.status, 'READY')
  if (manifest.status !== 'READY') return

  const plan = await director.planFromJobManifest(manifest.manifest)

  assert.equal(plan.selected_ad_format, 'PERFORMANCE_DEMO')
  assert.ok(plan.selected_format_variant)
  assert.ok(plan.selection_reason?.includes('FAST_SALES'))
  assert.equal(plan.subtitles_mode, 'auto')
  assert.equal(plan.creative_fingerprint?.tenant_id, 'org_test_tenant')
  assert.equal(plan.beats.length, 5)
  assert.deepEqual(plan.editing_rhythm?.cut_points, director.computeDynamicCutPoints(plan.selected_ad_format, plan.selected_format_variant))

  // Spoken script adheres strictly to 18-24 word Voice-As-Spine
  const words = plan.master_spoken_script?.trim().split(/\s+/).length || 0
  assert.ok(words >= 18 && words <= 24, `Spoken script must be 18-24 words, got ${words}`)
})
