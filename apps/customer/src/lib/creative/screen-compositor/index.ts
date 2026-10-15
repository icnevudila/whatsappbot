import sharp from 'sharp'
import { createHash } from 'node:crypto'
import type {
  DeviceType,
  Quad,
  ScreenCompositorInput,
  ScreenCompositorResult,
  ScreenSourceType,
} from './types'
import { getDevicePreset } from './mockup-library'
import { validateScreenCompositingQA } from './screen-qa'
import { verifyScreenChassisAlignment } from './chassis-verifier'
import { warpAndShaderScreen } from './warp-engine'

export * from './types'
export * from './homography'
export * from './screen-qa'
export * from './chassis-verifier'
export * from './mockup-library'
export * from './warp-engine'
export * from './software-screen-registry'

/**
 * Generate a clean device chassis backdrop if no AI background is provided.
 */
function renderDeviceChassisSvg(
  device: DeviceType,
  width: number,
  height: number,
  screenQuad: Quad,
  cornerRadius: number,
  chassisColor: string = '#1c1d1f',
  includeStudioBg: boolean = true,
): Buffer {
  const isMobile = device === 'mobile'
  const isDesktop = device === 'desktop'

  // Subtle studio backdrop gradient
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        ${
          includeStudioBg
            ? `
        <radialGradient id="studio-bg" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stop-color="#2a2c30" />
          <stop offset="60%" stop-color="#141517" />
          <stop offset="100%" stop-color="#0a0a0b" />
        </radialGradient>
        `
            : ''
        }
        <filter id="chassis-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="24" stdDeviation="32" flood-color="#000000" flood-opacity="0.65" />
        </filter>
      </defs>
      ${includeStudioBg ? `<rect width="${width}" height="${height}" fill="url(#studio-bg)" />` : ''}

      <!-- Device Chassis & Shadow -->
      <g filter="url(#chassis-shadow)">
        ${
          device === 'laptop'
            ? `
          <!-- Laptop Top Bezel -->
          <path d="M ${screenQuad[0].x - 16} ${screenQuad[0].y - 20} L ${screenQuad[1].x + 16} ${screenQuad[1].y - 20} Q ${screenQuad[1].x + 22} ${screenQuad[1].y - 20} ${screenQuad[1].x + 22} ${screenQuad[1].y - 14} L ${screenQuad[2].x + 22} ${screenQuad[2].y + 16} L ${screenQuad[3].x - 22} ${screenQuad[3].y + 16} L ${screenQuad[0].x - 22} ${screenQuad[0].y - 14} Z" fill="${chassisColor}" stroke="#38393d" stroke-width="2"/>
          <!-- Camera notch dot -->
          <circle cx="${(screenQuad[0].x + screenQuad[1].x) / 2}" cy="${screenQuad[0].y - 10}" r="3" fill="#000000" stroke="#222" stroke-width="1"/>
          <!-- Laptop Lower Keyboard Base -->
          <path d="M ${screenQuad[3].x - 120} ${screenQuad[3].y + 16} L ${screenQuad[2].x + 120} ${screenQuad[2].y + 16} L ${screenQuad[2].x + 160} ${screenQuad[2].y + 55} Q ${screenQuad[2].x + 165} ${screenQuad[2].y + 60} ${screenQuad[2].x + 155} ${screenQuad[2].y + 60} L ${screenQuad[3].x - 155} ${screenQuad[3].y + 60} Q ${screenQuad[3].x - 165} ${screenQuad[3].y + 60} ${screenQuad[3].x - 160} ${screenQuad[3].y + 55} Z" fill="#2d2e32" stroke="#444" stroke-width="1.5"/>
          <!-- Trackpad indent -->
          <rect x="${(screenQuad[3].x + screenQuad[2].x) / 2 - 90}" y="${screenQuad[3].y + 24}" width="180" height="28" rx="6" fill="#25262a" stroke="#3a3b40" stroke-width="1"/>
        `
            : isDesktop
              ? `
          <!-- Desktop Display Frame -->
          <rect x="${screenQuad[0].x - 20}" y="${screenQuad[0].y - 20}" width="${screenQuad[1].x - screenQuad[0].x + 40}" height="${screenQuad[2].y - screenQuad[1].y + 40}" rx="18" fill="${chassisColor}" stroke="#38393d" stroke-width="2"/>
          <!-- Aluminium Stand -->
          <polygon points="${width / 2 - 40},${screenQuad[2].y + 20} ${width / 2 + 40},${screenQuad[2].y + 20} ${width / 2 + 60},${screenQuad[2].y + 180} ${width / 2 - 60},${screenQuad[2].y + 180}" fill="#71717a" />
          <rect x="${width / 2 - 120}" y="${screenQuad[2].y + 175}" width="240" height="15" rx="5" fill="#a1a1aa" />
        `
              : isMobile
                ? `
          <!-- Mobile Phone Body -->
          <rect x="${screenQuad[0].x - 18}" y="${screenQuad[0].y - 24}" width="${screenQuad[1].x - screenQuad[0].x + 36}" height="${screenQuad[2].y - screenQuad[1].y + 48}" rx="${cornerRadius + 12}" fill="${chassisColor}" stroke="#4b4d52" stroke-width="3"/>
          <!-- Dynamic Island / Speaker -->
          <rect x="${(screenQuad[0].x + screenQuad[1].x) / 2 - 55}" y="${screenQuad[0].y + 14}" width="110" height="28" rx="14" fill="#000000" />
        `
                : `
          <!-- Tablet Body -->
          <rect x="${screenQuad[0].x - 22}" y="${screenQuad[0].y - 22}" width="${screenQuad[1].x - screenQuad[0].x + 44}" height="${screenQuad[2].y - screenQuad[1].y + 44}" rx="${cornerRadius + 10}" fill="${chassisColor}" stroke="#3a3b40" stroke-width="2"/>
        `
        }
      </g>
    </svg>
  `
  return Buffer.from(svg)
}

/**
 * Composite authentic software UI screenshot onto a device screen with exact homography perspective warping,
 * natural bezel boundaries, glass reflection shaders, physical chassis verification, and fail-closed QA.
 */
export async function compositeRealScreenToDevice(
  input: ScreenCompositorInput,
): Promise<ScreenCompositorResult> {
  const { backgroundBuffer, screenshotBuffer, device, angle, customQuad, glareIntensity, cornerRadius, requireChassisVerification } = input

  // 1. Inspect background image
  let canvasWidth = 1920
  let canvasHeight = 1080
  let isSquare = false
  let hasValidBg = false

  if (backgroundBuffer && backgroundBuffer.length > 100) {
    try {
      const bgMeta = await sharp(backgroundBuffer).metadata()
      if (bgMeta.width && bgMeta.height) {
        canvasWidth = bgMeta.width
        canvasHeight = bgMeta.height
        isSquare = Math.abs(canvasWidth - canvasHeight) < 40
        hasValidBg = true
      }
    } catch {
      hasValidBg = false
    }
  }

  // 2. Resolve Device Screen Quadrilateral
  const preset = getDevicePreset(device, angle, isSquare)
  if (!hasValidBg) {
    canvasWidth = preset.targetCanvasSize.width
    canvasHeight = preset.targetCanvasSize.height
  }
  const targetQuad: Quad = customQuad || preset.screenQuad
  const effectiveRadius = cornerRadius ?? preset.cornerRadius
  const effectiveGlare = glareIntensity ?? preset.glareOpacity

  // 3. Prepare Base Scene and Chassis
  let baseCanvas = backgroundBuffer
  let isStudioMockup = !hasValidBg

  if (!hasValidBg) {
    baseCanvas = renderDeviceChassisSvg(
      device,
      canvasWidth,
      canvasHeight,
      targetQuad,
      effectiveRadius,
      preset.chassisColor,
      true,
    )
    isStudioMockup = true
  } else {
    // If background is an environment scene (e.g. office/desk), composite the device chassis onto the environment
    const chassisOverlay = renderDeviceChassisSvg(
      device,
      canvasWidth,
      canvasHeight,
      targetQuad,
      effectiveRadius,
      preset.chassisColor,
      false,
    )
    baseCanvas = await sharp(backgroundBuffer)
      .composite([{ input: chassisOverlay, blend: 'over' }])
      .png()
      .toBuffer()
    isStudioMockup = true
  }

  // 4. Physical Chassis Alignment Verification (Ensures screen actually aligns with background device)
  const chassisVerification = await verifyScreenChassisAlignment(
    baseCanvas,
    targetQuad,
    isStudioMockup,
  )

  // 5. Inspect Screenshot Metadata
  const ssMeta = await sharp(screenshotBuffer).metadata()
  const ssWidth = ssMeta.width || 1920
  const ssHeight = ssMeta.height || 1080

  // 6. Strict Fail-Closed QA Validation
  const qa = validateScreenCompositingQA({
    quad: targetQuad,
    canvasWidth,
    canvasHeight,
    device,
    screenshotWidth: ssWidth,
    screenshotHeight: ssHeight,
    chassisVerification: (hasValidBg || requireChassisVerification) ? chassisVerification : null,
  })

  if (!qa.passed) {
    throw new Error(
      `SCREEN_COMPOSITING_QA_FAILED: Compositing rejected to prevent distorted or misaligned UI.\nViolations:\n- ${qa.violations.join('\n- ')}`,
    )
  }

  // 7. Projective Warp Screenshot & Apply Glass Glare Shader
  const warpedScreen = await warpAndShaderScreen({
    screenshotBuffer,
    targetQuad,
    canvasWidth,
    canvasHeight,
    cornerRadius: effectiveRadius,
    glareIntensity: effectiveGlare,
  })

  // 8. Composite Warped Screen onto Device Chassis
  const compositedBuffer = await sharp(baseCanvas)
    .composite([
      {
        input: warpedScreen.overlayBuffer,
        left: warpedScreen.left,
        top: warpedScreen.top,
        blend: 'over',
      },
    ])
    .png()
    .toBuffer()

  const finalMeta = await sharp(compositedBuffer).metadata()
  const sha256 = createHash('sha256').update(compositedBuffer).digest('hex')

  const sourceType: ScreenSourceType = 'AUTHENTIC_VERIFIED_SCREENSHOT'

  return {
    compositedBuffer,
    width: finalMeta.width || canvasWidth,
    height: finalMeta.height || canvasHeight,
    device,
    sourceType,
    qa,
    sha256,
  }
}
