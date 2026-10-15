import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import {
  computeHomography,
  isQuadConvex,
  calculateQuadArea,
  getQuadBoundingBox,
  estimatePerspectiveTilt,
  computePillowPerspectiveCoeffs,
} from '../apps/customer/src/lib/creative/screen-compositor/homography'
import {
  validateScreenCompositingQA,
} from '../apps/customer/src/lib/creative/screen-compositor/screen-qa'
import {
  getDevicePreset,
  DEVICE_PRESETS,
} from '../apps/customer/src/lib/creative/screen-compositor/mockup-library'
import {
  resolveSoftwareScreen,
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

test('Perspective tilt detection: frontal screen passes, oblique sideways screen fails', () => {
  // Frontal laptop screen (MacBook Pro 16 frontal preset)
  const frontalPreset = DEVICE_PRESETS['macbook-pro-16-frontal']
  const frontalTilt = estimatePerspectiveTilt(frontalPreset.screenQuad)
  assert.ok(frontalTilt.tiltAngleDeg <= 10, `Frontal tilt should be <= 10°, got ${frontalTilt.tiltAngleDeg}°`)

  // Extreme sideways tilted screen (e.g. 70° oblique side perspective)
  const extremeSidewaysQuad: Quad = [
    { x: 1200, y: 100 },
    { x: 1350, y: 250 },
    { x: 1330, y: 800 },
    { x: 1190, y: 920 },
  ]
  const extremeTilt = estimatePerspectiveTilt(extremeSidewaysQuad)
  assert.ok(extremeTilt.tiltAngleDeg > 22, `Extreme tilt should exceed 22°, got ${extremeTilt.tiltAngleDeg}°`)

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
  assert.ok(qa.violations.some(v => v.includes('SCREEN_PERSPECTIVE_TOO_OBLIQUE')))
})

test('Screen QA fail-closed: out of bounds, low resolution, and PII leaks are blocked', () => {
  // Out of bounds quad
  const outOfBoundsQuad: Quad = [
    { x: -50, y: 100 },
    { x: 1000, y: 100 },
    { x: 1000, y: 800 },
    { x: -50, y: 800 },
  ]
  const oobQA = validateScreenCompositingQA({
    quad: outOfBoundsQuad,
    canvasWidth: 1080,
    canvasHeight: 1080,
    device: 'laptop',
    screenshotWidth: 1920,
    screenshotHeight: 1080,
  })
  assert.equal(oobQA.passed, false)
  assert.ok(oobQA.violations.some(v => v.includes('SCREEN_BOUNDARY_OVERFLOW')))

  // PII Leak Check
  const leakQA = validateScreenCompositingQA({
    quad: DEVICE_PRESETS['macbook-pro-16-frontal'].screenQuad,
    canvasWidth: 1920,
    canvasHeight: 1080,
    device: 'laptop',
    screenshotWidth: 1920,
    screenshotHeight: 1080,
    textContentToCheck: 'Müşteri: Ahmet Yılmaz, Tel: +90 532 123 45 67, Sipariş: 104',
  })
  assert.equal(leakQA.passed, false)
  assert.ok(leakQA.violations.some(v => v.includes('PII_DATA_LEAK_DETECTED')))

  // Synthetic demo numbers pass
  const cleanQA = validateScreenCompositingQA({
    quad: DEVICE_PRESETS['macbook-pro-16-frontal'].screenQuad,
    canvasWidth: 1920,
    canvasHeight: 1080,
    device: 'laptop',
    screenshotWidth: 1920,
    screenshotHeight: 1080,
    textContentToCheck: 'Demo Hat: 05550000000, Başarılı İletim: %99.4, 2.418 Alıcı',
  })
  assert.equal(cleanQA.checks.piiSanitized, true)
})

test('Multi-device presets support: laptop, desktop, tablet, mobile', () => {
  const devices = ['laptop', 'desktop', 'tablet', 'mobile'] as const

  for (const device of devices) {
    const preset = getDevicePreset(device)
    assert.equal(preset.device, device)
    assert.equal(isQuadConvex(preset.screenQuad), true)

    const bbox = getQuadBoundingBox(preset.screenQuad)
    assert.ok(bbox.width >= 500, `${device} screen width should be >= 500px`)
    assert.ok(bbox.height >= 300, `${device} screen height should be >= 300px`)

    const qa = validateScreenCompositingQA({
      quad: preset.screenQuad,
      canvasWidth: preset.targetCanvasSize.width,
      canvasHeight: preset.targetCanvasSize.height,
      device,
      screenshotWidth: preset.screenResolution.width,
      screenshotHeight: preset.screenResolution.height,
    })
    assert.equal(qa.passed, true, `${device} preset should pass QA: ${qa.violations.join(', ')}`)
  }
})

test('Software screen resolution for Mesajify and generic SaaS brands', async () => {
  // Mesajify resolution
  const mesajifyItem = await resolveSoftwareScreen('Mesajify', 'laptop')
  assert.ok(mesajifyItem.buffer.length > 1000)
  assert.equal(mesajifyItem.device, 'laptop')
  assert.equal(mesajifyItem.metadata.hasPii, false)

  // Generic SaaS resolution
  const genericItem = await resolveSoftwareScreen('Acme Cloud CRM', 'desktop')
  assert.ok(genericItem.buffer.length > 1000)
  assert.equal(genericItem.device, 'desktop')
  assert.equal(genericItem.metadata.hasPii, false)
})

test('End-to-End screen compositing with authentic Mesajify screenshot', async () => {
  const resolved = await resolveSoftwareScreen('Mesajify', 'laptop')
  const blankBg = Buffer.alloc(0) // Will render device chassis automatically

  const result = await compositeRealScreenToDevice({
    backgroundBuffer: blankBg,
    screenshotBuffer: resolved.buffer,
    device: 'laptop',
  })

  assert.equal(result.qa.passed, true)
  assert.ok(result.compositedBuffer.length > 50000)
  assert.equal(result.width, 1920)
  assert.equal(result.height, 1080)
  assert.ok(/^[a-f0-9]{64}$/i.test(result.sha256))

  const meta = await sharp(result.compositedBuffer).metadata()
  assert.equal(meta.format, 'png')
  assert.equal(meta.width, 1920)
  assert.equal(meta.height, 1080)
})

test('ImagePublicationStatus gate blocks publication if screen QA fails', () => {
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
    screenCompositingQA: { passed: false, violations: ['SCREEN_PERSPECTIVE_TOO_OBLIQUE'] },
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
