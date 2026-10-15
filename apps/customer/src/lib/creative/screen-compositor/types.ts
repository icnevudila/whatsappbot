export type Point2D = {
  x: number
  y: number
}

/**
 * 4-Corner Quadrilateral representing the screen area in clockwise order:
 * [0]: Top-Left (TL)
 * [1]: Top-Right (TR)
 * [2]: Bottom-Right (BR)
 * [3]: Bottom-Left (BL)
 */
export type Quad = [Point2D, Point2D, Point2D, Point2D]

export type DeviceType = 'laptop' | 'desktop' | 'tablet' | 'mobile'

export type DeviceAngle = 'frontal' | 'three_quarter_right' | 'three_quarter_left' | 'desk_overhead'

export type DeviceMockupPreset = {
  id: string
  device: DeviceType
  angle: DeviceAngle
  name: string
  aspectRatio: string
  screenResolution: { width: number; height: number }
  targetCanvasSize: { width: number; height: number }
  screenQuad: Quad
  cornerRadius: number
  bezelThickness: number
  glareOpacity: number
  chassisColor: string
}

export type ScreenSourceType = 'AUTHENTIC_VERIFIED_SCREENSHOT' | 'SYNTHETIC_SVG_MOCKUP'

export type PiiVerificationStatus = 'VERIFIED_CLEAN' | 'PII_DETECTED' | 'UNVERIFIED'

export type ScreenQAChecks = {
  homographyMathValid: boolean
  screenChassisAlignmentValid: boolean
  screenDetected: boolean
  boundaryContained: boolean
  convexityValid: boolean
  perspectiveAngleDeg: number
  perspectiveAcceptable: boolean
  resolutionSufficient: boolean
  piiSanitized: boolean
  aspectRatioMatch: boolean
}

export type ScreenQAResult = {
  passed: boolean
  checks: ScreenQAChecks
  violations: string[]
  metrics: {
    screenWidthPx: number
    screenHeightPx: number
    screenAreaRatio: number
    effectiveScale: number
    tiltAngleXDeg: number
    tiltAngleYDeg: number
    effectiveCharHeightPx: number
    homographyMaxErrorPx: number
  }
}

export type ScreenCompositorInput = {
  backgroundBuffer: Buffer
  screenshotBuffer: Buffer
  device: DeviceType
  angle?: DeviceAngle
  customQuad?: Quad | null
  glareIntensity?: number
  cornerRadius?: number
  sanitizePii?: boolean
  requireChassisVerification?: boolean
}

export type ScreenCompositorResult = {
  compositedBuffer: Buffer
  width: number
  height: number
  device: DeviceType
  sourceType: ScreenSourceType
  qa: ScreenQAResult
  sha256: string
}

export type SoftwareScreenItem = {
  id: string
  title: string
  description: string
  device: DeviceType
  sourceType: ScreenSourceType
  isSyntheticDemo: boolean
  buffer: Buffer
  metadata: {
    sourceUrl?: string
    isDemoData: boolean
    hasPii: boolean
    piiVerificationStatus: PiiVerificationStatus
    dpi: number
    resolution: { width: number; height: number }
  }
}
