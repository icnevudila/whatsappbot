import { test } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { compositeCommercialCreative } from './image-compositor'

test('DeterministicImageCompositor renders valid target dimensions, hashes, and Turkish text', async () => {
  // Create a 500x500 dummy base image
  const baseDummy = await sharp({
    create: { width: 500, height: 500, channels: 3, background: { r: 60, g: 90, b: 120 } },
  })
    .jpeg()
    .toBuffer()

  // Create a 200x50 dummy logo
  const logoDummy = await sharp({
    create: { width: 200, height: 50, channels: 4, background: { r: 0, g: 128, b: 105, alpha: 1 } },
  })
    .png()
    .toBuffer()

  const result = await compositeCommercialCreative({
    baseImageBuffer: baseDummy,
    logoBuffer: logoDummy,
    targetFormat: 'SQUARE_1_1',
    brandPalette: { primary: '#008069', accent: '#00a884' },
    copy: {
      headline: 'Ayvazoğlu Tuğla ile Sağlam Yapılar',
      supportingLine: 'Şantiyenize doğrudan toptan teslimat avantajı ve garantili dayanıklılık.',
      price: '249 TL',
      oldPrice: '399 TL',
      offer: 'Özel İndirim',
      cta: 'Şimdi Sipariş Ver',
      dateRange: 'Ekim 2026 Kampanyası',
    },
    layout: {
      logoPosition: 'top_left',
      textSafeZone: 'top_third',
    },
  })

  assert.equal(result.width, 1080)
  assert.equal(result.height, 1080)
  assert.equal(result.mimeType, 'image/jpeg')
  assert.ok(result.buffer.length > 50000, 'Composited buffer should contain real JPEG bytes')
  assert.match(result.generationSha256, /^[a-f0-9]{64}$/)
  assert.match(result.finalSha256, /^[a-f0-9]{64}$/)
  assert.notEqual(result.generationSha256, result.finalSha256, 'Final SHA256 must differ from raw generation SHA256')

  // Inspect the composited image using sharp
  const meta = await sharp(result.buffer).metadata()
  assert.equal(meta.width, 1080)
  assert.equal(meta.height, 1080)
  assert.equal(meta.format, 'jpeg')
})

test('DeterministicImageCompositor supports 9:16 and 4:5 ratios without logo', async () => {
  const baseDummy = await sharp({
    create: { width: 400, height: 600, channels: 3, background: { r: 100, g: 50, b: 30 } },
  })
    .jpeg()
    .toBuffer()

  const result916 = await compositeCommercialCreative({
    baseImageBuffer: baseDummy,
    logoBuffer: null,
    targetFormat: 'STORY_9_16',
    copy: {
      headline: 'Bofe Şarjlı Sırt Pompası',
      supportingLine: 'Bahçenizde yüksek verimli ve homojen ilaçlama.',
      cta: 'Hemen Al',
    },
  })

  assert.equal(result916.width, 1080)
  assert.equal(result916.height, 1920)

  const result45 = await compositeCommercialCreative({
    baseImageBuffer: baseDummy,
    logoBuffer: null,
    targetFormat: 'PORTRAIT_4_5',
    copy: {
      headline: 'Veriburada Bulut Paneli',
      supportingLine: 'Müşteri portföyünüzü taze ve güncel verilerle büyütün.',
      cta: 'Ücretsiz Dene',
    },
  })

  assert.equal(result45.width, 1080)
  assert.equal(result45.height, 1350)
})
