import type { DeviceType, Quad, ScreenQAResult } from './types'
import {
  calculateQuadArea,
  estimatePerspectiveTilt,
  getQuadBoundingBox,
  isQuadConvex,
} from './homography'

export type ScreenQAParams = {
  quad: Quad
  canvasWidth: number
  canvasHeight: number
  device: DeviceType
  screenshotWidth: number
  screenshotHeight: number
  textContentToCheck?: string | null
}

const MAX_ACCEPTABLE_TILT_DEG = 22.0
const MIN_SCREEN_WIDTH_PX = 600
const MIN_SCREEN_AREA_RATIO = 0.12 // Screen must occupy at least 12% of the ad image
const MAX_SCREEN_AREA_RATIO = 0.85 // Leave room for environment/mockup/branding

/**
 * Common Turkish real phone regex patterns (excluding 555-01xx fictitious range)
 */
const REAL_TR_PHONE_REGEX = /(?:(?:\+90|0090)\s*5\d{2}\s*\d{3}\s*\d{2}\s*\d{2}|05\d{2}\s*\d{3}\s*\d{2}\s*\d{2})/g
const DUMMY_PHONE_REGEX = /(?:555\s*01\d{2}|500\s*00\d{2}|555\s*12\d{2}|05550000000)/

/**
 * Validate screen compositing parameters with fail-closed QA.
 */
export function validateScreenCompositingQA(params: ScreenQAParams): ScreenQAResult {
  const violations: string[] = []
  const { quad, canvasWidth, canvasHeight, device, textContentToCheck } = params

  // 1. Boundary containment check
  const bbox = getQuadBoundingBox(quad)
  const margin = 2 // 2px margin tolerance
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

  // 2. Convexity check
  const convexityValid = isQuadConvex(quad)
  if (!convexityValid) {
    violations.push(
      'SCREEN_GEOMETRY_INVALID: Screen quad is concave or self-intersecting. Homography mapping would produce inverted or twisted pixels.',
    )
  }

  const expectedAspects: Record<DeviceType, number> = {
    laptop: 16 / 10, // MacBook Pro 16:10
    desktop: 16 / 9, // Studio Display 16:9
    tablet: 4 / 3, // iPad Pro 4:3 (1.33)
    mobile: 9 / 19.5, // Modern Smartphone (0.46)
  }
  const expected = expectedAspects[device] || 16 / 10

  // 3. Perspective tilt check (crucial for legibility & avoiding awkward sideways laptops)
  const { tiltAngleDeg, tiltXDeg, tiltYDeg } = estimatePerspectiveTilt(quad, expected)
  const perspectiveAcceptable = tiltAngleDeg <= MAX_ACCEPTABLE_TILT_DEG
  if (!perspectiveAcceptable) {
    violations.push(
      `SCREEN_PERSPECTIVE_TOO_OBLIQUE: Screen tilt angle (${tiltAngleDeg}° [X:${tiltXDeg}°, Y:${tiltYDeg}°]) exceeds acceptable legibility threshold (${MAX_ACCEPTABLE_TILT_DEG}°). Sideways or extreme angled screens are strictly rejected.`,
    )
  }

  // 4. Resolution and area sufficiency
  const screenArea = calculateQuadArea(quad)
  const canvasArea = canvasWidth * canvasHeight
  const screenAreaRatio = canvasArea > 0 ? screenArea / canvasArea : 0

  const resolutionSufficient =
    bbox.width >= MIN_SCREEN_WIDTH_PX &&
    screenAreaRatio >= MIN_SCREEN_AREA_RATIO &&
    screenAreaRatio <= MAX_SCREEN_AREA_RATIO

  if (bbox.width < MIN_SCREEN_WIDTH_PX) {
    violations.push(
      `SCREEN_RESOLUTION_TOO_LOW: Effective screen width (${bbox.width}px) is below minimum readable resolution (${MIN_SCREEN_WIDTH_PX}px). Software UI would become unreadable.`,
    )
  }
  if (screenAreaRatio < MIN_SCREEN_AREA_RATIO) {
    violations.push(
      `SCREEN_AREA_TOO_SMALL: Screen occupies only ${(screenAreaRatio * 100).toFixed(1)}% of ad canvas. Software interface must be clearly visible and prominent.`,
    )
  }

  // 5. Aspect Ratio Match
  const actualAspect = bbox.height > 0 ? bbox.width / bbox.height : 1.0
  const aspectTolerance = 0.35 // allowance for 3D perspective distortion
  const aspectRatioMatch = Math.abs(actualAspect - expected) <= aspectTolerance
  if (!aspectRatioMatch) {
    violations.push(
      `DEVICE_ASPECT_RATIO_MISMATCH: Detected screen aspect ratio (${actualAspect.toFixed(2)}) deviates significantly from expected ${device} aspect (${expected.toFixed(2)}).`,
    )
  }

  // 6. PII Sanitization check
  let piiSanitized = true
  if (textContentToCheck) {
    const matches = textContentToCheck.match(REAL_TR_PHONE_REGEX)
    if (matches && matches.length > 0) {
      // Check if matches are non-dummy
      const realMatches = matches.filter((m) => !DUMMY_PHONE_REGEX.test(m))
      if (realMatches.length > 0) {
        piiSanitized = false
        violations.push(
          `PII_DATA_LEAK_DETECTED: Screen contains potential real customer phone numbers: ${realMatches.join(', ')}. Software UI screenshots must strictly use anonymized synthetic test data.`,
        )
      }
    }
  }

  const passed = violations.length === 0

  return {
    passed,
    checks: {
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
      effectiveScale: Math.round((bbox.width / params.screenshotWidth) * 100) / 100,
      tiltAngleXDeg: tiltXDeg,
      tiltAngleYDeg: tiltYDeg,
    },
  }
}
