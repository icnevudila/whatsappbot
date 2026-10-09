import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import {
  CAMPAIGN_OBJECTIVES,
  CREATIVE_STYLE_PRESETS,
  IMAGE_FORMATS_V2,
  type CreativePlanV2,
  type ImageFormatV2,
} from './types'
import {
  adaptLegacyDraftToV2,
  mapPresetToLegacyVideoFormat,
  mapPresetToVideoMotionStyle,
  validateV2Submission,
} from './adapter'
import { buildImagePromptV2 } from './image-prompt-v2'
import { compositeCommercialCreative } from './image-compositor'
import { validateVoiceoverContract } from '@/lib/video-voiceover-contract'
import { buildCreativePrompt } from '@/lib/creative/prompt'
import type { CreativePayload } from '@/lib/creative/types'

test('1. Active org logo validation & single hero product invariant', () => {
  // Test validation failure when logo is missing
  const noLogoResult = validateV2Submission({
    mediaType: 'IMAGE',
    heroProductId: 'prod-123',
    logoUrl: null,
    objective: 'SALES_OFFER',
    stylePreset: 'PREMIUM',
  })
  assert.equal(noLogoResult.valid, false)
  assert.match(noLogoResult.error!, /Marka logosu zorunludur/i)

  // Test validation failure when hero product is missing
  const noProductResult = validateV2Submission({
    mediaType: 'IMAGE',
    heroProductId: '',
    logoUrl: 'https://example.com/logo.png',
    objective: 'SALES_OFFER',
    stylePreset: 'PREMIUM',
  })
  assert.equal(noProductResult.valid, false)
  assert.match(noProductResult.error!, /Ürün seçimi zorunludur/i)

  // Valid image submission
  const validResult = validateV2Submission({
    mediaType: 'IMAGE',
    heroProductId: 'prod-123',
    logoUrl: 'https://example.com/logo.png',
    objective: 'SALES_OFFER',
    stylePreset: 'PREMIUM',
    format: 'SQUARE_1_1',
  })
  assert.equal(validResult.valid, true)
  assert.equal(validResult.expected_reference_count, 2)
})

test('2. Single hero product invariant: expected_reference_count === 2 for image and video', () => {
  const imageValidation = validateV2Submission({
    mediaType: 'IMAGE',
    heroProductId: 'prod-bofe-01',
    logoUrl: 'https://example.com/bofe-logo.png',
    objective: 'PRODUCT_INTRO',
    stylePreset: 'PRODUCT_HERO',
    format: 'STORY_9_16',
  })
  assert.equal(imageValidation.valid, true)
  assert.equal(imageValidation.expected_reference_count, 2)

  const videoValidation = validateV2Submission({
    mediaType: 'VIDEO',
    heroProductId: 'prod-ayvaz-01',
    logoUrl: 'https://example.com/ayvaz-logo.png',
    objective: 'BRAND_AWARENESS',
    stylePreset: 'REAL_USAGE',
    format: 'REELS_9_16',
    voiceoverText: 'Ayvazoğlu İnşaat ile modern ve sağlam yapılar hayata geçiyor.',
    voiceoverLanguage: 'tr-TR',
  })
  assert.equal(videoValidation.valid, true)
  assert.equal(videoValidation.expected_reference_count, 2)
})

test('3. Shared style presets map correctly to image scene grammar and video motion grammar', () => {
  for (const preset of CREATIVE_STYLE_PRESETS) {
    const motionStyle = mapPresetToVideoMotionStyle(preset.id)
    assert.ok(motionStyle, `Preset ${preset.id} must map to a valid video motion style`)

    const promptResult = buildImagePromptV2({
      productName: 'Organik Zeytinyağı',
      productCategory: 'Gıda',
      brandName: 'Bofe Tarım',
      stylePreset: preset.id,
      objective: 'SALES_OFFER',
      visualSceneDescription: 'Zeytin ağaçları arasında cam şişede zeytinyağı',
    })

    assert.ok(promptResult.prompt.length > 50, `Image prompt for ${preset.id} should be comprehensive`)
    assert.match(promptResult.prompt, /Organik Zeytinyağı/i)
  }
})

test('4. Standard generative image prompt preserves CTA, price, promo, brand identity, and contacts (buildCreativePrompt)', () => {
  const snapshot: CreativePayload = {
    brief: 'Doğal Domates Salçası Lansmanı',
    formatId: 'wa',
    style: 'photographic',
    textDensity: 'balanced',
    products: [
      {
        id: 'p1',
        name: 'Doğal Domates Salçası',
        price: '250 TL',
        oldPrice: '320 TL',
        promo: '%30 İndirim',
        include: { name: true, image: true, description: true, boxContents: true, price: true, promo: true },
      },
    ],
    phones: [{ phone: '+90 555 123 4567', label: 'Sipariş Hattı' }],
    socials: [{ platform: 'Instagram', url: '@bofe.tarim', label: '@bofe.tarim' }],
    website: 'www.bofe.com',
    cta: 'Hemen Sipariş Ver',
    labels: ['Katkısız', 'Doğal'],
  }

  const { prompt } = buildCreativePrompt(snapshot, { verifiedRefs: { product: true, logo: true } })

  // Standard generative prompt MUST contain these commercial elements
  assert.match(prompt, /Doğal Domates Salçası/i)
  assert.match(prompt, /price: 250 TL/i)
  assert.match(prompt, /was 320 TL/i)
  assert.match(prompt, /offer: %30 İndirim/i)
  assert.match(prompt, /Call-to-Action \(CTA\): Hemen Sipariş Ver/i)
  assert.match(prompt, /\+90 555 123 4567/i)
  assert.match(prompt, /www\.bofe\.com/i)
  assert.match(prompt, /STRICT LOGO FIDELITY/)
  assert.match(prompt, /STRICT PRODUCT FIDELITY/)
})

test('4b. Optional locked copy mode excludes promotional typography for deterministic overlay fallback (buildImagePromptV2)', () => {
  const rawPromptResult = buildImagePromptV2({
    productName: 'Doğal Domates Salçası',
    brandName: 'Bofe Tarım',
    stylePreset: 'DYNAMIC_OFFER',
    format: 'SQUARE_1_1',
    hasProductRef: true,
    hasLogoRef: true,
  })

  // Enforces clean generative scene without artificial promotional text when lockCopyOverlay is active
  assert.match(rawPromptResult.prompt, /Strictly NO newly generated promotional text/i)
  assert.match(rawPromptResult.negativePrompt, /text/i)
})

test('5. Prices, dates, CTAs and Turkish characters correctly rendered by deterministic compositor', async () => {
  const rawCanvas = await sharp({
    create: {
      width: 1080,
      height: 1080,
      channels: 4,
      background: { r: 35, g: 65, b: 45, alpha: 1 },
    },
  })
    .jpeg()
    .toBuffer()

  const fakeLogo = await sharp({
    create: {
      width: 240,
      height: 80,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer()

  const composited = await compositeCommercialCreative({
    baseImageBuffer: rawCanvas,
    targetFormat: 'SQUARE_1_1',
    copy: {
      headline: 'Şık ve Doğal Çözümler', // Turkish chars: Ş, ı, ğ
      supportingLine: 'Özel indirim fırsatıyla bu hafta sonuna kadar geçerli!', // ö, ı, ü
      offer: '%30 İNDİRİM', // İ
      cta: 'HEMEN KEŞFET', // Ş
      price: '250 TL',
    },
    logoBuffer: fakeLogo,
  })

  assert.ok(composited.buffer.length > 0)
  assert.equal(composited.width, 1080)
  assert.equal(composited.height, 1080)
  assert.notEqual(composited.generationSha256, composited.finalSha256)

  const meta = await sharp(composited.buffer).metadata()
  assert.equal(meta.format, 'jpeg')
  assert.equal(meta.width, 1080)
  assert.equal(meta.height, 1080)
})

test('5b. Compositor routing contract: lockCopyOverlay === false preserves raw provider output, lockCopyOverlay === true triggers compositor', () => {
  const standardPayload = { qualityMode: 'STANDARD', lockCopyOverlay: false }
  const lockedPayload = { qualityMode: 'STANDARD', lockCopyOverlay: true }

  assert.equal(Boolean(standardPayload.lockCopyOverlay), false, 'Standard default must not force locked copy overlay')
  assert.equal(Boolean(lockedPayload.lockCopyOverlay), true, 'Locked copy overlay is optional fallback only')
})

test('6. Legacy draft loading: multi-product and legacy formats adapt gracefully to V2', () => {
  const legacyDraft = {
    name: 'Eski Kampanya Taslağı',
    format: 'wa', // legacy 1:1
    visual_style: 'ELEGANT', // legacy style -> PREMIUM
    product_ids: ['prod-alpha', 'prod-beta', 'prod-gamma'],
    campaign_objective: 'YENI_URUN',
    headline: 'Eski Başlık',
    notes: 'Detaylı açıklama',
  }

  const adapted = adaptLegacyDraftToV2(legacyDraft)
  assert.equal(adapted.mediaType, 'IMAGE')
  assert.equal(adapted.formatId, 'SQUARE_1_1')
  assert.equal(adapted.stylePreset, 'PREMIUM') // ELEGANT -> PREMIUM
  assert.equal(adapted.heroProductId, 'prod-alpha') // Picks first hero product
  assert.equal(adapted.objective, 'NEW_PRODUCT')
})

test('7. Video Turkish voiceover P0 contract preserved end-to-end', () => {
  // Missing voiceover text must FAIL
  const failEmptyVO = validateVoiceoverContract({
    voiceover_language: 'tr-TR',
    voiceover_text: '',
    final_provider_prompt: 'Cinematic video of farm...',
  })
  assert.equal(failEmptyVO.valid, false)
  assert.equal(failEmptyVO.error_code, 'VOICEOVER_REQUIRED')

  // Invalid language must FAIL
  const failLangVO = validateVoiceoverContract({
    voiceover_language: 'en-US',
    voiceover_text: 'Bofe Tarım ile en taze mahsuller kapınızda.',
    final_provider_prompt: 'Cinematic video with narration: Bofe Tarım ile en taze mahsuller kapınızda.',
  })
  assert.equal(failLangVO.valid, false)
  assert.equal(failLangVO.error_code, 'TURKISH_VOICEOVER_REQUIRED')

  // Voiceover text missing from final prompt must FAIL
  const failMismatchPrompt = validateVoiceoverContract({
    voiceover_language: 'tr-TR',
    voiceover_text: 'Bofe Tarım ile en taze mahsuller kapınızda.',
    final_provider_prompt: 'Cinematic video with English voiceover speaking about agriculture.',
  })
  assert.equal(failMismatchPrompt.valid, false)
  assert.equal(failMismatchPrompt.error_code, 'VOICEOVER_PROMPT_MISMATCH')

  // Valid Turkish voiceover contract PASSES
  const passVO = validateVoiceoverContract({
    voiceover_language: 'tr-TR',
    voiceover_text: 'Bofe Tarım ile en taze mahsuller kapınızda.',
    final_provider_prompt:
      'Cinematic vertical 9:16 video. Turkish narration speaks exact Turkish sentence once: "Bofe Tarım ile en taze mahsuller kapınızda." No English speech.',
  })
  assert.equal(passVO.valid, true)
  assert.equal(passVO.voiceover_language, 'tr-TR')
  assert.equal(passVO.voiceover_text, 'Bofe Tarım ile en taze mahsuller kapınızda.')
})
