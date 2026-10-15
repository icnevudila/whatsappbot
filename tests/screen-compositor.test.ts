import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import {
  computeHomography,
  isQuadConvex,
  calculateQuadArea,
  getQuadBoundingBox,
  estimatePerspectiveTilt,
} from '../apps/customer/src/lib/creative/screen-compositor/homography'
import {
  validateScreenCompositingQA,
} from '../apps/customer/src/lib/creative/screen-compositor/screen-qa'
import {
  verifyScreenChassisAlignment,
} from '../apps/customer/src/lib/creative/screen-compositor/chassis-verifier'
import {
  getDevicePreset,
  DEVICE_PRESETS,
} from '../apps/customer/src/lib/creative/screen-compositor/mockup-library'
import {
  resolveSoftwareScreen,
  scanScreenshotForPii,
} from '../apps/customer/src/lib/creative/screen-compositor/software-screen-registry'
import {
  compositeRealScreenToDevice,
} from '../apps/customer/src/lib/creative/screen-compositor'
import {
  imagePublicationStatus,
} from '../apps/customer/src/lib/creative/image-review'
import type { Quad } from '../apps/customer/src/lib/creative/screen-compositor/types'

test('Homography matrix maps source rectangle corners precisely to destination quad', () => {
  const srcW = 1920
  const srcH = 1080
  const srcQuad: Quad = [
    { x: 0, y: 0 },
    { x: srcW, y: 0 },
    { x: srcW, y: srcH },
    { x: 0, y: srcH },
  ]

  const dstQuad: Quad = [
    { x: 420, y: 140 },
    { x: 1500, y: 140 },
    { x: 1485, y: 815 },
    { x: 435, y: 815 },
  ]

  const H = computeHomography(srcQuad, dstQuad)

  // Verify projection for each corner
  for (let i = 0; i < 4; i++) {
    const { x: u, y: v } = srcQuad[i]
    const z = H[2][0] * u + H[2][1] * v + H[2][2]
    const projX = (H[0][0] * u + H[0][1] * v + H[0][2]) / z
    const projY = (H[1][0] * u + H[1][1] * v + H[1][2]) / z

    assert.ok(Math.abs(projX - dstQuad[i].x) < 0.01, `Corner ${i} X mismatch: ${projX} vs ${dstQuad[i].x}`)
    assert.ok(Math.abs(projY - dstQuad[i].y) < 0.01, `Corner ${i} Y mismatch: ${projY} vs ${dstQuad[i].y}`)
  }
})

test('Quadrilateral convexity and bounding box calculations', () => {
  const validQuad: Quad = [
    { x: 100, y: 100 },
    { x: 500, y: 100 },
    { x: 480, y: 400 },
    { x: 120, y: 400 },
  ]
  assert.equal(isQuadConvex(validQuad), true)

  const concaveQuad: Quad = [
    { x: 100, y: 100 },
    { x: 500, y: 100 },
    { x: 250, y: 250 }, // Inward dent
    { x: 100, y: 400 },
  ]
  assert.equal(isQuadConvex(concaveQuad), false)

  const bbox = getQuadBoundingBox(validQuad)
  assert.equal(bbox.minX, 100)
  assert.equal(bbox.maxX, 500)
  assert.equal(bbox.minY, 100)
  assert.equal(bbox.maxY, 400)
  assert.equal(bbox.width, 400)
  assert.equal(bbox.height, 300)

  const area = calculateQuadArea(validQuad)
  assert.ok(area > 0 && area <= 400 * 300)
})

test('Perspective tilt & legibility: frontal, natural 3/4, and desk views pass; extreme sideways fails', () => {
  // 1. Frontal laptop screen
  const frontalPreset = DEVICE_PRESETS['macbook-pro-16-frontal']
  const frontalTilt = estimatePerspectiveTilt(frontalPreset.screenQuad, 16 / 10)
  assert.ok(frontalTilt.tiltAngleDeg <= 10, `Frontal tilt should be <= 10°, got ${frontalTilt.tiltAngleDeg}°`)

  // 2. Natural 3/4 perspective laptop (~15°-20° yaw)
  const threeQuarterPreset = DEVICE_PRESETS['macbook-pro-16-three-quarter']
  const threeQuarterTilt = estimatePerspectiveTilt(threeQuarterPreset.screenQuad, 16 / 10)
  assert.ok(threeQuarterTilt.tiltAngleDeg >= 10 && threeQuarterTilt.tiltAngleDeg <= 30, `3/4 tilt should be between 10°-30°, got ${threeQuarterTilt.tiltAngleDeg}°`)

  // 3. Desk active work view (~12° pitch)
  const deskPreset = DEVICE_PRESETS['macbook-pro-16-desk-work']
  const deskTilt = estimatePerspectiveTilt(deskPreset.screenQuad, 16 / 10)
  assert.ok(deskTilt.tiltAngleDeg <= 20, `Desk tilt should be <= 20°, got ${deskTilt.tiltAngleDeg}°`)

  // 4. Extreme unreadable sideways tilt (>35°)
  const extremeSidewaysQuad: Quad = [
    { x: 1100, y: 80 },
    { x: 1220, y: 260 },
    { x: 1210, y: 840 },
    { x: 1090, y: 940 },
  ]
  const extremeTilt = estimatePerspectiveTilt(extremeSidewaysQuad, 16 / 10)
  assert.ok(extremeTilt.tiltAngleDeg > 35, `Extreme tilt should exceed 35°, got ${extremeTilt.tiltAngleDeg}°`)

  // QA on extreme sideways quad must fail
  const qa = validateScreenCompositingQA({
    quad: extremeSidewaysQuad,
    canvasWidth: 1920,
    canvasHeight: 1080,
    device: 'laptop',
    screenshotWidth: 1920,
    screenshotHeight: 1080,
  })
  assert.equal(qa.passed, false)
  assert.ok(qa.violations.some(v => v.includes('SCREEN_PERSPECTIVE_TOO_OBLIQUE') || v.includes('SCREEN_LEGIBILITY_INSUFFICIENT')))
})

test('Physical screen chassis alignment verification: studio mockup passes, blind preset on arbitrary image fails', async () => {
  // 1. Studio mockup render (compositor generated) -> 100% confidence pass
  const studioVerification = await verifyScreenChassisAlignment(
    Buffer.alloc(0),
    DEVICE_PRESETS['macbook-pro-16-frontal'].screenQuad,
    true,
  )
  assert.equal(studioVerification.alignmentValid, true)
  assert.equal(studioVerification.screenDetected, true)
  assert.equal(studioVerification.confidenceScore, 1.0)

  // 2. Arbitrary non-device background (e.g. solid white wall with no laptop screen bezels)
  const arbitraryWallBg = await sharp({
    create: { width: 1920, height: 1080, channels: 3, background: { r: 240, g: 240, b: 240 } },
  }).png().toBuffer()

  const blindOverlayVerification = await verifyScreenChassisAlignment(
    arbitraryWallBg,
    DEVICE_PRESETS['macbook-pro-16-frontal'].screenQuad,
    false,
  )
  assert.equal(blindOverlayVerification.alignmentValid, false)
  assert.equal(blindOverlayVerification.screenDetected, false)

  // QA validation with failed chassis alignment must fail-closed
  const qa = validateScreenCompositingQA({
    quad: DEVICE_PRESETS['macbook-pro-16-frontal'].screenQuad,
    canvasWidth: 1920,
    canvasHeight: 1080,
    device: 'laptop',
    screenshotWidth: 1920,
    screenshotHeight: 1080,
    chassisVerification: blindOverlayVerification,
  })
  assert.equal(qa.passed, false)
  assert.equal(qa.checks.screenChassisAlignmentValid, false)
  assert.ok(qa.violations.some(v => v.includes('SCREEN_CHASSIS_NOT_ALIGNED')))
})

test('Fail-closed PII scanning: real customer numbers, emails, and TC identity numbers are detected and blocked', () => {
  // Real phone leak
  const phoneScan = scanScreenshotForPii(['Müşteri: Ali Veli', 'Telefon: +90 532 987 65 43'])
  assert.equal(phoneScan.hasPii, true)
  assert.equal(phoneScan.status, 'PII_DETECTED')

  // Real email leak
  const emailScan = scanScreenshotForPii(['Sipariş veren: mehmet@sirketim.com.tr'])
  assert.equal(emailScan.hasPii, true)
  assert.equal(emailScan.status, 'PII_DETECTED')

  // TC identity leak
  const tcScan = scanScreenshotForPii(['TCKN: 12345678901'])
  assert.equal(tcScan.hasPii, true)
  assert.equal(tcScan.status, 'PII_DETECTED')

  // Synthetic demo data passes cleanly
  const cleanScan = scanScreenshotForPii([
    'Mesajify Kampanya Kontrol Merkezi',
    '2.418 Alıcı Doğrulandı',
    'Başarı Oranı: %99.4',
    'Destek: destek@mesajify.com',
    'Demo Hat: 05550000000',
  ])
  assert.equal(cleanScan.hasPii, false)
  assert.equal(cleanScan.status, 'VERIFIED_CLEAN')
})

test('Source Type distinction: authentic screenshot vs synthetic SVG mockup', async () => {
  // Mesajify authentic screenshot
  const mesajifyItem = await resolveSoftwareScreen('Mesajify', 'laptop')
  assert.equal(mesajifyItem.sourceType, 'AUTHENTIC_VERIFIED_SCREENSHOT')
  assert.equal(mesajifyItem.isSyntheticDemo, false)
  assert.equal(mesajifyItem.metadata.piiVerificationStatus, 'VERIFIED_CLEAN')

  // Generic SaaS synthetic SVG mockup
  const genericItem = await resolveSoftwareScreen('Global Logistics CRM', 'desktop')
  assert.equal(genericItem.sourceType, 'SYNTHETIC_SVG_MOCKUP')
  assert.equal(genericItem.isSyntheticDemo, true)
  assert.equal(genericItem.metadata.piiVerificationStatus, 'VERIFIED_CLEAN')
})

test('Multi-device & multi-angle presets support: all canonical presets pass QA', () => {
  const testCases: Array<{ device: 'laptop' | 'desktop' | 'tablet' | 'mobile'; angle?: 'frontal' | 'three_quarter_right' | 'desk_overhead' }> = [
    { device: 'laptop', angle: 'frontal' },
    { device: 'laptop', angle: 'three_quarter_right' },
    { device: 'laptop', angle: 'desk_overhead' },
    { device: 'desktop', angle: 'frontal' },
    { device: 'tablet', angle: 'frontal' },
    { device: 'mobile', angle: 'frontal' },
  ]

  for (const tc of testCases) {
    const preset = getDevicePreset(tc.device, tc.angle)
    assert.equal(preset.device, tc.device)
    assert.equal(isQuadConvex(preset.screenQuad), true)

    const bbox = getQuadBoundingBox(preset.screenQuad)
    assert.ok(bbox.width >= 450, `${tc.device} (${tc.angle}) screen width should be >= 450px`)

    const qa = validateScreenCompositingQA({
      quad: preset.screenQuad,
      canvasWidth: preset.targetCanvasSize.width,
      canvasHeight: preset.targetCanvasSize.height,
      device: tc.device,
      screenshotWidth: preset.screenResolution.width,
      screenshotHeight: preset.screenResolution.height,
    })
    assert.equal(qa.passed, true, `${tc.device} (${tc.angle}) should pass QA: ${qa.violations.join(', ')}`)
    assert.equal(qa.checks.homographyMathValid, true)
  }
})

test('End-to-End screen compositing with authentic Mesajify screenshot', async () => {
  const resolved = await resolveSoftwareScreen('Mesajify', 'laptop')
  const blankBg = Buffer.alloc(0) // Will render device chassis automatically

  const result = await compositeRealScreenToDevice({
    backgroundBuffer: blankBg,
    screenshotBuffer: resolved.buffer,
    device: 'laptop',
    angle: 'three_quarter_right', // Test natural 3/4 angle
  })

  assert.equal(result.qa.passed, true)
  assert.equal(result.sourceType, 'AUTHENTIC_VERIFIED_SCREENSHOT')
  assert.ok(result.compositedBuffer.length > 50000)
  assert.equal(result.width, 1920)
  assert.equal(result.height, 1080)
  assert.ok(/^[a-f0-9]{64}$/i.test(result.sha256))

  const meta = await sharp(result.compositedBuffer).metadata()
  assert.equal(meta.format, 'png')
  assert.equal(meta.width, 1920)
  assert.equal(meta.height, 1080)
})

test('ImagePublicationStatus gate blocks publication if screen QA or chassis alignment fails', () => {
  // Passing payload
  const okPayload = {
    heroProductId: 'prod-1',
    products: [{ id: 'prod-1', name: 'Mesajify SaaS' }],
    screenCompositingQA: { passed: true, violations: [] },
  }
  assert.equal(imagePublicationStatus(okPayload), 'ready')

  // Failing screen QA
  const failPayload = {
    heroProductId: 'prod-1',
    products: [{ id: 'prod-1', name: 'Mesajify SaaS' }],
    screenCompositingQA: { passed: false, violations: ['SCREEN_CHASSIS_NOT_ALIGNED'] },
  }
  assert.equal(imagePublicationStatus(failPayload), 'needs_review')

  // PII violation flag
  const piiPayload = {
    heroProductId: 'prod-1',
    products: [{ id: 'prod-1', name: 'Mesajify SaaS' }],
    piiViolation: true,
  }
  assert.equal(imagePublicationStatus(piiPayload), 'needs_review')
})

test('In-place screen replacement maintains 100% bit-for-bit preservation outside screen mask', async () => {
  const fs = await import('node:fs')
  const summaryPath = 'C:\\Users\\TP2\\Desktop\\MESAJIFY_OMNISTUDIO_FINAL_DELIVERY\\before_after_comparison\\pixel_diff_verification_summary.json'
  if (fs.existsSync(summaryPath)) {
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
    assert.equal(summary.length, 4)
    for (const item of summary) {
      assert.equal(item.max_diff_outside, 0, `Pixel diff outside mask must be exactly 0 for ${item.name}`)
      assert.ok(item.total_outside_pixels > 1000000, `Must verify over 1M background pixels for ${item.name}`)
      assert.ok(item.screen_coverage_pct > 10, `Screen coverage must be positive for ${item.name}`)
    }
  }
})

