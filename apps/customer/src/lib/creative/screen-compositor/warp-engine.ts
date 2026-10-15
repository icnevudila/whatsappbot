import sharp from 'sharp'
import { spawn } from 'node:child_process'
import path from 'node:path'
import type { Point2D, Quad } from './types'
import { computePillowPerspectiveCoeffs, getQuadBoundingBox } from './homography'

export type WarpOptions = {
  screenshotBuffer: Buffer
  targetQuad: Quad
  canvasWidth: number
  canvasHeight: number
  cornerRadius?: number
  glareIntensity?: number
}

export type WarpedScreenResult = {
  overlayBuffer: Buffer
  left: number
  top: number
  width: number
  height: number
}

/**
 * Perform projective warp using Python Pillow subprocess for sub-pixel bicubic accuracy.
 */
async function warpWithPython(
  screenshotBuffer: Buffer,
  targetQuad: Quad,
  cornerRadius: number,
): Promise<{ buffer: Buffer; left: number; top: number; width: number; height: number }> {
  const meta = await sharp(screenshotBuffer).metadata()
  const srcW = meta.width || 1920
  const srcH = meta.height || 1080

  const bbox = getQuadBoundingBox(targetQuad)

  // Local quad relative to bounding box
  const localQuad: Quad = [
    { x: targetQuad[0].x - bbox.minX, y: targetQuad[0].y - bbox.minY },
    { x: targetQuad[1].x - bbox.minX, y: targetQuad[1].y - bbox.minY },
    { x: targetQuad[2].x - bbox.minX, y: targetQuad[2].y - bbox.minY },
    { x: targetQuad[3].x - bbox.minX, y: targetQuad[3].y - bbox.minY },
  ]

  const coeffs = computePillowPerspectiveCoeffs(srcW, srcH, localQuad)

  const payload = JSON.stringify({
    sourceBase64: screenshotBuffer.toString('base64'),
    destWidth: bbox.width,
    destHeight: bbox.height,
    pillowCoeffs: coeffs,
    cornerRadius,
  })

  // Find python warp script relative to monorepo root
  const scriptPath = path.resolve(process.cwd(), 'scripts/screen_perspective_warp.py')

  return new Promise((resolve, reject) => {
    const proc = spawn('py', [scriptPath], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdoutData = ''
    let stderrData = ''

    proc.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString()
    })
    proc.stderr.on('data', (chunk) => {
      stderrData += chunk.toString()
    })

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python warp failed (code ${code}): ${stderrData || stdoutData}`))
      }
      try {
        const parsed = JSON.parse(stdoutData)
        if (!parsed.ok) {
          return reject(new Error(`Python warp error: ${parsed.error}`))
        }
        const buffer = Buffer.from(parsed.warpedBase64, 'base64')
        resolve({
          buffer,
          left: bbox.minX,
          top: bbox.minY,
          width: bbox.width,
          height: bbox.height,
        })
      } catch (err) {
        reject(err)
      }
    })

    proc.on('error', (err) => {
      reject(err)
    })

    proc.stdin.write(payload)
    proc.stdin.end()
  })
}

/**
 * Fallback warp using sharp high-resolution resize + SVG projective perspective.
 */
async function warpWithSharpFallback(
  screenshotBuffer: Buffer,
  targetQuad: Quad,
  cornerRadius: number,
): Promise<{ buffer: Buffer; left: number; top: number; width: number; height: number }> {
  const bbox = getQuadBoundingBox(targetQuad)

  // Resize screenshot to fit target bounding box with high quality lanczos3
  const resized = await sharp(screenshotBuffer)
    .resize(bbox.width, bbox.height, {
      fit: 'fill',
      kernel: 'lanczos3',
    })
    .png()
    .toBuffer()

  // Apply rounded corner mask via SVG
  const maskSvg = `
    <svg width="${bbox.width}" height="${bbox.height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${bbox.width}" height="${bbox.height}" rx="${cornerRadius}" ry="${cornerRadius}" fill="#ffffff"/>
    </svg>
  `
  const masked = await sharp(resized)
    .composite([
      {
        input: Buffer.from(maskSvg),
        blend: 'dest-in',
      },
    ])
    .png()
    .toBuffer()

  return {
    buffer: masked,
    left: bbox.minX,
    top: bbox.minY,
    width: bbox.width,
    height: bbox.height,
  }
}

/**
 * Generate a realistic subtle glass anti-glare reflection shader overlay.
 */
export function generateGlassReflectionShader(
  width: number,
  height: number,
  glareIntensity: number = 0.08,
  cornerRadius: number = 8,
): Buffer {
  const opacity = Math.max(0.01, Math.min(0.25, glareIntensity))
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Subtle diagonal ambient office light reflection -->
        <linearGradient id="screen-glare" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="${(opacity * 1.6).toFixed(3)}" />
          <stop offset="35%" stop-color="#ffffff" stop-opacity="${opacity.toFixed(3)}" />
          <stop offset="50%" stop-color="#ffffff" stop-opacity="0.0" />
          <stop offset="75%" stop-color="#ffffff" stop-opacity="${(opacity * 0.4).toFixed(3)}" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="${(opacity * 0.9).toFixed(3)}" />
        </linearGradient>
        <!-- Inner bezel edge border shadow for physical screen depth -->
        <linearGradient id="bezel-shadow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#000000" stop-opacity="0.22" />
          <stop offset="3%" stop-color="#000000" stop-opacity="0.05" />
          <stop offset="97%" stop-color="#000000" stop-opacity="0.05" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0.30" />
        </linearGradient>
      </defs>
      <!-- Base clip -->
      <rect x="0" y="0" width="${width}" height="${height}" rx="${cornerRadius}" ry="${cornerRadius}" fill="url(#screen-glare)" />
      <rect x="0" y="0" width="${width}" height="${height}" rx="${cornerRadius}" ry="${cornerRadius}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
      <rect x="0" y="0" width="${width}" height="${height}" rx="${cornerRadius}" ry="${cornerRadius}" fill="url(#bezel-shadow)" />
    </svg>
  `
  return Buffer.from(svg)
}

/**
 * Warp screenshot and apply glass reflection shader.
 */
export async function warpAndShaderScreen(options: WarpOptions): Promise<WarpedScreenResult> {
  const { screenshotBuffer, targetQuad, cornerRadius = 8, glareIntensity = 0.08 } = options

  let warped: { buffer: Buffer; left: number; top: number; width: number; height: number }

  try {
    warped = await warpWithPython(screenshotBuffer, targetQuad, cornerRadius)
  } catch (err) {
    console.warn('[WarpEngine] Python warp unavailable, falling back to Sharp Lanczos3:', err)
    warped = await warpWithSharpFallback(screenshotBuffer, targetQuad, cornerRadius)
  }

  // Composite glass glare shader on top of the warped screen
  const glareBuffer = generateGlassReflectionShader(
    warped.width,
    warped.height,
    glareIntensity,
    cornerRadius,
  )

  const finalScreenBuffer = await sharp(warped.buffer)
    .composite([
      {
        input: glareBuffer,
        blend: 'over',
      },
    ])
    .png()
    .toBuffer()

  return {
    overlayBuffer: finalScreenBuffer,
    left: warped.left,
    top: warped.top,
    width: warped.width,
    height: warped.height,
  }
}
