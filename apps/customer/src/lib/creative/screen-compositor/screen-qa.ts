import type { DeviceType, Quad, ScreenQAResult } from './types'
import {
  calculateQuadArea,
  computeHomography,
  estimatePerspectiveTilt,
  getQuadBoundingBox,
  isQuadConvex,
} from './homography'
import type { ChassisVerificationResult } from './chassis-verifier'
import { scanScreenshotForPii } from './software-screen-registry'

export type ScreenQAParams = {
  quad: Quad
  canvasWidth: number
  canvasHeight: number
  device: DeviceType
  screenshotWidth: number
  screenshotHeight: number
  textContentToCheck?: string | null
  chassisVerification?: ChassisVerificationResult | null
}

// Natural 3/4 and desk perspectives up to 35° are allowed
const MAX_ACCEPTABLE_TILT_DEG = 35.0
const MIN_SCREEN_WIDTH_PX = 480
const MIN_SCREEN_AREA_RATIO = 0.10
const MAX_SCREEN_AREA_RATIO = 0.88
const MIN_EFFECTIVE_CHAR_HEIGHT_PX = 6.0

/**
 * Validate screen compositing parameters with separated criteria for:
 * 1. Homography mathematical correctness
 * 2. Real physical chassis bezel alignment & detection
 * 3. Readability & character height under perspective foreshortening
 * 4. PII sanitization
 */
export function validateScreenCompositingQA(params: ScreenQAParams): ScreenQAResult {
  const violations: string[] = []
  const { quad, canvasWidth, canvasHeight, device, screenshotWidth, screenshotHeight, textContentToCheck, chassisVerification } = params

  // 1. Homography Mathematical Precision Verification
  const srcQuad: Quad = [
    { x: 0, y: 0 },
    { x: screenshotWidth, y: 0 },
    { x: screenshotWidth, y: screenshotHeight },
    { x: 0, y: screenshotHeight },
  ]
  let homographyMathValid = true
  let maxErrorPx = 0

  try {
    const H = computeHomography(srcQuad, quad)
    for (let i = 0; i < 4; i++) {
      const u = srcQuad[i].x
      const v = srcQuad[i].y
      const z = H[2][0] * u + H[2][1] * v + H[2][2]
      if (Math.abs(z) < 1e-6) throw new Error('Homography projection singular')
      const px = (H[0][0] * u + H[0][1] * v + H[0][2]) / z
      const py = (H[1][0] * u + H[1][1] * v + H[1][2]) / z
      const err = Math.hypot(px - quad[i].x, py - quad[i].y)
      if (err > maxErrorPx) maxErrorPx = err
    }
    if (maxErrorPx > 0.1) {
      homographyMathValid = false
      violations.push(`HOMOGRAPHY_MATH_ERROR: Projective mapping corner deviation (${maxErrorPx.toFixed(3)}px) exceeds tolerance (0.1px).`)
    }
  } catch (err: any) {
    homographyMathValid = false
    violations.push(`HOMOGRAPHY_CALCULATION_FAILED: ${err?.message || err}`)
  }

  // 2. Physical Screen Chassis Alignment Verification (Separate from homography math)
  let screenChassisAlignmentValid = true
  let screenDetected = true
  if (chassisVerification) {
    screenChassisAlignmentValid = chassisVerification.alignmentValid
    screenDetected = chassisVerification.screenDetected
    if (!screenChassisAlignmentValid || !screenDetected) {
      violations.push(`SCREEN_CHASSIS_NOT_ALIGNED: ${chassisVerification.details}`)
    }
  }

  // 3. Boundary containment check
  const bbox = getQuadBoundingBox(quad)
  const margin = 2
  const boundaryContained =
    bbox.minX >= -margin &&
    bbox.minY >= -margin &&
    bbox.maxX <= canvasWidth + margin &&
    bbox.maxY <= canvasHeight + margin

  if (!boundaryContained) {
    violations.push(
      `SCREEN_BOUNDARY_OVERFLOW: Screen quad [${bbox.minX}, ${bbox.minY}, ${bbox.maxX}, ${bbox.maxY}] exceeds canvas dimensions (${canvasWidth}x${canvasHeight}).`,
    )
  }

  // 4. Convexity check
  const convexityValid = isQuadConvex(quad)
  if (!convexityValid) {
    violations.push(
      'SCREEN_GEOMETRY_INVALID: Screen quad is concave or self-intersecting. Homography mapping would produce inverted or twisted pixels.',
    )
  }

  const expectedAspects: Record<DeviceType, number> = {
    laptop: 16 / 10,
    desktop: 16 / 9,
    tablet: 4 / 3,
    mobile: 9 / 19.5,
  }
  const expected = expectedAspects[device] || 16 / 10

  // 5. Perspective tilt check (permits natural 3/4 views up to 35°)
  const { tiltAngleDeg, tiltXDeg, tiltYDeg } = estimatePerspectiveTilt(quad, expected)
  const perspectiveAcceptable = tiltAngleDeg <= MAX_ACCEPTABLE_TILT_DEG
  if (!perspectiveAcceptable) {
    violations.push(
      `SCREEN_PERSPECTIVE_TOO_OBLIQUE: Screen tilt angle (${tiltAngleDeg}° [X:${tiltXDeg}°, Y:${tiltYDeg}°]) exceeds acceptable natural viewing threshold (${MAX_ACCEPTABLE_TILT_DEG}°).`,
    )
  }

  // 6. Resolution & Text Legibility Check (Not solely dependent on angle)
  const screenArea = calculateQuadArea(quad)
  const canvasArea = canvasWidth * canvasHeight
  const screenAreaRatio = canvasArea > 0 ? screenArea / canvasArea : 0

  // Effective character height in pixels under perspective scaling & foreshortening
  // Standard web/app UI uses 13-16px text on 900-1080px logical viewport height.
  const logicalViewportHeight = screenshotHeight > 1400 ? screenshotHeight / 2 : screenshotHeight
  const scale = bbox.height / Math.max(logicalViewportHeight, 600)
  const nominalBaseCharHeightPx = 14
  const cosTilt = Math.cos((tiltAngleDeg * Math.PI) / 180)
  const effectiveCharHeightPx = Math.round(nominalBaseCharHeightPx * scale * Math.max(0.3, cosTilt) * 10) / 10

  const resolutionSufficient =
    bbox.width >= MIN_SCREEN_WIDTH_PX &&
    screenAreaRatio >= MIN_SCREEN_AREA_RATIO &&
    screenAreaRatio <= MAX_SCREEN_AREA_RATIO &&
    effectiveCharHeightPx >= MIN_EFFECTIVE_CHAR_HEIGHT_PX

  if (bbox.width < MIN_SCREEN_WIDTH_PX) {
    violations.push(
      `SCREEN_RESOLUTION_TOO_LOW: Effective screen width (${bbox.width}px) is below minimum readable resolution (${MIN_SCREEN_WIDTH_PX}px). Software UI would become unreadable.`,
    )
  }
  if (effectiveCharHeightPx < MIN_EFFECTIVE_CHAR_HEIGHT_PX) {
    violations.push(
      `SCREEN_LEGIBILITY_INSUFFICIENT: Under perspective foreshortening, effective character height (${effectiveCharHeightPx}px) falls below legibility limit (${MIN_EFFECTIVE_CHAR_HEIGHT_PX}px).`,
    )
  }
  if (screenAreaRatio < MIN_SCREEN_AREA_RATIO) {
    violations.push(
      `SCREEN_AREA_TOO_SMALL: Screen occupies only ${(screenAreaRatio * 100).toFixed(1)}% of ad canvas. Software interface must be clearly visible and prominent.`,
    )
  }

  // 7. Aspect Ratio Match
  const actualAspect = bbox.height > 0 ? bbox.width / bbox.height : 1.0
  const aspectTolerance = 0.45 // allowance for natural 3/4 perspective distortion
  const aspectRatioMatch = Math.abs(actualAspect - expected) <= aspectTolerance
  if (!aspectRatioMatch) {
    violations.push(
      `DEVICE_ASPECT_RATIO_MISMATCH: Detected screen aspect ratio (${actualAspect.toFixed(2)}) deviates significantly from expected ${device} aspect (${expected.toFixed(2)}).`,
    )
  }

  // 8. PII Sanitization check with comprehensive scan
  let piiSanitized = true
  if (textContentToCheck) {
    const piiResult = scanScreenshotForPii([textContentToCheck])
    if (piiResult.hasPii) {
      piiSanitized = false
      violations.push(
        `PII_DATA_LEAK_DETECTED: Screen contains potential confidential customer data: ${piiResult.findings.join('; ')}. Software UI screenshots must strictly use anonymized synthetic test data.`,
      )
    }
  }

  const passed = violations.length === 0

  return {
    passed,
    checks: {
      homographyMathValid,
      screenChassisAlignmentValid,
      screenDetected,
      boundaryContained,
      convexityValid,
      perspectiveAngleDeg: tiltAngleDeg,
      perspectiveAcceptable,
      resolutionSufficient,
      piiSanitized,
      aspectRatioMatch,
    },
    violations,
    metrics: {
      screenWidthPx: bbox.width,
      screenHeightPx: bbox.height,
      screenAreaRatio: Math.round(screenAreaRatio * 1000) / 1000,
      effectiveScale: Math.round((bbox.width / screenshotWidth) * 100) / 100,
      tiltAngleXDeg: tiltXDeg,
      tiltAngleYDeg: tiltYDeg,
      effectiveCharHeightPx,
      homographyMaxErrorPx: Math.round(maxErrorPx * 1000) / 1000,
    },
  }
}
