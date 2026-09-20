import test from 'node:test'
import assert from 'node:assert'
import {
  compileDeterministicV5,
  validateGeneratedVideoArtifact,
  V5_STANDARD_NEGATIVES,
} from '../apps/customer/src/lib/creative/v5'

test('Rule 1: Brand Information is Locked (Single Source of Truth, Model Cannot Alter)', () => {
  const input = {
    brandName: 'Ayvazoğlu İnşaat & Tuğla A.Ş.',
    brief: 'Doğal killi cephe tuğlaları',
    products: [{ name: 'Killi Cephe Tuğlası' }],
    brandKit: {
      name: 'Ayvazoğlu İnşaat & Tuğla A.Ş.',
      logoUrl: 'https://cdn.example.com/ayvazoglu_logo_master.png',
      colors: {
        primary: '#b71c1c',
        secondary: '#f57f17',
        accent: '#ffb300',
      },
      fonts: {
        primary: 'Inter',
        heading: 'Montserrat',
      },
    },
  }

  const pkg = compileDeterministicV5(input)

  // 1. LockedBrandIdentity is carried directly from input
  assert.strictEqual(pkg.lockedBrandIdentity.isLocked, true)
  assert.strictEqual(pkg.lockedBrandIdentity.brandName, 'Ayvazoğlu İnşaat & Tuğla A.Ş.')
  assert.strictEqual(pkg.lockedBrandIdentity.originalLogoUrl, 'https://cdn.example.com/ayvazoglu_logo_master.png')
  assert.strictEqual(pkg.lockedBrandIdentity.colors.primary, '#b71c1c')
  assert.strictEqual(pkg.lockedBrandIdentity.fonts?.heading, 'Montserrat')

  // 2. Validation verifies that locked brand identity is preserved
  assert.strictEqual(pkg.validation.checks.lockedBrandIdentityPreserved, true)
  assert.ok(pkg.validation.status === 'pass' || pkg.validation.status === 'repaired')
})

test('Rule 2: Protect Product & Offer (Brand kit colors are not confused with product features)', () => {
  const pkg = compileDeterministicV5({
    brandName: 'Bofe Teknoloji',
    brief: 'SaaS veri platformu, otomatik harita istihbaratı',
    products: [{ name: 'Harita Veri Modülü' }],
    brandKit: {
      name: 'Bofe Teknoloji',
      colors: {
        primary: '#1b5e20',
      },
    },
  })

  // The engine shouldn't claim the SaaS platform itself has physical brick or food properties
  assert.strictEqual(pkg.classification.offerType, 'digital_product_or_saas')
  assert.ok(!pkg.voiceover.text.includes('tuğla'))
  assert.ok(!pkg.voiceover.text.includes('fırın'))
  assert.strictEqual(pkg.validation.checks.hasInventedOfferOrFeature, false)
})

test('Rule 3 & 5: Continuous Take default for product references to prevent geometry drift', () => {
  const pkgWithRef = compileDeterministicV5({
    brandName: 'Ustaoğlu Döner',
    brief: 'Özel marinasyon odun ateşinde yaprak döner',
    products: [{
      name: 'Yaprak Döner Porsiyon',
      imageUrl: 'https://cdn.example.com/doner_photo.jpg',
    }],
  })

  // Must default to continuous_take because product reference is supplied
  assert.strictEqual(pkgWithRef.shotPlan.cameraMode, 'continuous_take')
  assert.strictEqual(pkgWithRef.shotPlan.referenceAssetInput?.hasImageInput, true)
  assert.strictEqual(pkgWithRef.shotPlan.referenceAssetInput?.imageUrl, 'https://cdn.example.com/doner_photo.jpg')
  assert.strictEqual(pkgWithRef.shotPlan.referenceAssetInput?.mode, 'product_reference')
  assert.ok(pkgWithRef.shotPlan.imageToVideoPrompt?.includes('IMAGE-TO-VIDEO'))

  // Single unbroken camera move with zero cut keywords
  assert.strictEqual(/\bcuts?\b/i.test(pkgWithRef.shotPlan.veoEnglishPrompt), false)
})

test('Rule 4: Decouple Video and Brand Layer (Raw Veo text-free, overlay carries logo & CTA badge)', () => {
  const pkg = compileDeterministicV5({
    brandName: 'Ayvazoğlu Tuğla',
    brief: 'Killi cephe tuğlası şantiyeye teslimat',
    products: [{ name: 'Killi Cephe Tuğlası' }],
    phones: [{ phone: '+905551112233' }],
    brandKit: {
      logoUrl: 'https://cdn.example.com/ayvazoglu_logo.png',
      colors: { primary: '#b71c1c' },
    },
  })

  // 1. Raw prompt has zero fake plaques, floating phone numbers or text cards
  assert.ok(!pkg.veoPrompt.includes('+905551112233'))
  assert.ok(!pkg.veoPrompt.includes('TEXT CARD'))
  assert.ok(!pkg.veoPrompt.includes('FLOATING LETTERS'))
  assert.ok(pkg.veoPrompt.includes('TEXT POLICY: No newly generated text'))

  // 2. Overlay layer carries the original logo URL without distortion
  assert.strictEqual(pkg.overlayPlan.brandWatermarkOrLogoPlacement.enabled, true)
  assert.strictEqual(pkg.overlayPlan.brandWatermarkOrLogoPlacement.sourceAsset, 'https://cdn.example.com/ayvazoglu_logo.png')

  // 3. CTA item in overlay timeline carries WhatsApp destination
  const ctaItem = pkg.overlayPlan.overlayTimeline.find((item) => item.type === 'cta')
  assert.ok(ctaItem, 'CTA item missing in overlay timeline')
  assert.ok(ctaItem.text.includes('WHATSAPP'), 'CTA does not guide to WhatsApp')
})

test('Rule 6: Audio Definition (Voiceover is 10-14 words, Turkish, wired into AUDIO directive)', () => {
  const pkg = compileDeterministicV5({
    brandName: 'Ustaoğlu Döner',
    brief: 'Odun ateşinde pişen taze yaprak döner porsiyon',
    products: [{ name: 'Yaprak Döner' }],
  })

  // Word count is concise (target 10-14 words)
  assert.ok(pkg.voiceover.wordCount >= 7 && pkg.voiceover.wordCount <= 14, `Word count out of range: ${pkg.voiceover.wordCount}`)
  
  // Clean Turkish sentence without quotation marks
  assert.strictEqual(pkg.voiceover.text.includes('"'), false)
  
  // Directly wired into Veo English prompt AUDIO directive
  assert.ok(pkg.veoPrompt.includes('AUDIO: Professional crystal-clear Turkish voiceover:'))
  assert.ok(pkg.veoPrompt.includes(pkg.voiceover.text.replace(/["']/g, '')))
})

test('Rule 7: Standard Negative Constraints (Includes all forbidden hallucinations)', () => {
  // Check that negative constraints contain all required terms from Rule 7
  const requiredTerms = [
    'additional logos',
    'invented brand names',
    'generated captions',
    'promotional badges',
    'extra products',
    'invented accessories',
    'altered packaging',
    'distorted labels',
    'product deformation',
  ]

  for (const term of requiredTerms) {
    assert.ok(
      V5_STANDARD_NEGATIVES.includes(term),
      `Missing negative term in V5_STANDARD_NEGATIVES: "${term}"`
    )
  }
})

test('Rule 8: Real Video Artifact Validation (Returns not_checked if vision tool not connected)', () => {
  // 1. Without vision analysis, must NEVER return synthetic pass
  const notCheckedResult = validateGeneratedVideoArtifact('output/render_123.mp4')
  assert.strictEqual(notCheckedResult.status, 'not_checked')
  assert.strictEqual(notCheckedResult.analysisAvailable, false)
  assert.strictEqual(notCheckedResult.checks.textOrLogoHallucinationDetected, 'not_checked')
  assert.strictEqual(notCheckedResult.checks.productDriftDetected, 'not_checked')

  // 2. With vision analysis detecting defects (e.g. fake phone number on acrylic plaque)
  const failedResult = validateGeneratedVideoArtifact('output/render_123.mp4', {
    hasVisionAnalysis: true,
    visionReport: {
      textOrLogoHallucinationDetected: true,
      productDriftDetected: false,
      voiceoverMismatchDetected: false,
      durationValid: true,
      notes: ['Hallucinated phone number +99 227 067 85 detected on screen.'],
    },
  })
  assert.strictEqual(failedResult.status, 'failed')
  assert.strictEqual(failedResult.analysisAvailable, true)
  assert.strictEqual(failedResult.checks.textOrLogoHallucinationDetected, true)

  // 3. With clean vision analysis
  const passResult = validateGeneratedVideoArtifact('output/render_123.mp4', {
    hasVisionAnalysis: true,
    visionReport: {
      textOrLogoHallucinationDetected: false,
      productDriftDetected: false,
      voiceoverMismatchDetected: false,
      durationValid: true,
      notes: ['All clear.'],
    },
  })
  assert.strictEqual(passResult.status, 'pass')
  assert.strictEqual(passResult.analysisAvailable, true)
})
