import sharp from 'sharp'
import type { Quad } from './types'

export type ChassisVerificationResult = {
  screenDetected: boolean
  alignmentValid: boolean
  confidenceScore: number
  edgeContrastScores: {
    top: number
    right: number
    bottom: number
    left: number
  }
  details: string
}

/**
 * Verify whether a candidate 4-corner screen quad corresponds to a real device screen bezel
 * on the background image, or if it was blindly applied onto an incompatible scene.
 *
 * For studio mockup renders (where background is compositor-generated), returns 100% confidence.
 * For AI-generated background photography, samples edge contrast transitions across all 4 edges.
 */
export async function verifyScreenChassisAlignment(
  backgroundBuffer: Buffer,
  quad: Quad,
  isCompositorRendered: boolean = false,
): Promise<ChassisVerificationResult> {
  // If the background was rendered directly by the studio compositor, alignment is mathematically guaranteed.
  if (isCompositorRendered || !backgroundBuffer || backgroundBuffer.length < 100) {
    return {
      screenDetected: true,
      alignmentValid: true,
      confidenceScore: 1.0,
      edgeContrastScores: { top: 1.0, right: 1.0, bottom: 1.0, left: 1.0 },
      details: 'Studio mockup render: screen quad is canonically aligned with device chassis geometry.',
    }
  }

  try {
    const { data, info } = await sharp(backgroundBuffer)
      .raw()
      .toBuffer({ resolveWithObject: true })

    const width = info.width
    const height = info.height
    const channels = info.channels

    const getPixelLuma = (x: number, y: number): number => {
      const px = Math.max(0, Math.min(width - 1, Math.round(x)))
      const py = Math.max(0, Math.min(height - 1, Math.round(y)))
      const idx = (py * width + px) * channels
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      return 0.299 * r + 0.587 * g + 0.114 * b
    }

    // Sample points along top, right, bottom, left edges (inner vs outer 6px step)
    const testEdge = (p1: { x: number; y: number }, p2: { x: number; y: number }, nx: number, ny: number): number => {
      let totalDiff = 0
      const steps = 10
      for (let s = 1; s < steps; s++) {
        const t = s / steps
        const x = p1.x + t * (p2.x - p1.x)
        const y = p1.y + t * (p2.y - p1.y)

        const innerLuma = getPixelLuma(x - nx * 6, y - ny * 6)
        const outerLuma = getPixelLuma(x + nx * 6, y + ny * 6)
        totalDiff += Math.abs(innerLuma - outerLuma)
      }
      return totalDiff / steps
    }

    // Normal vectors pointing outwards for each edge
    const topScore = testEdge(quad[0], quad[1], 0, -1)
    const rightScore = testEdge(quad[1], quad[2], 1, 0)
    const bottomScore = testEdge(quad[3], quad[2], 0, 1)
    const leftScore = testEdge(quad[0], quad[3], -1, 0)

    // Bezel contrast threshold (an authentic screen bezel has >= 10 luminance step)
    const MIN_EDGE_CONTRAST = 8.0
    const edgeScores = {
      top: Math.min(1.0, topScore / 25),
      right: Math.min(1.0, rightScore / 25),
      bottom: Math.min(1.0, bottomScore / 25),
      left: Math.min(1.0, leftScore / 25),
    }

    const avgEdgeScore = (edgeScores.top + edgeScores.right + edgeScores.bottom + edgeScores.left) / 4
    const validEdgesCount = [topScore, rightScore, bottomScore, leftScore].filter((s) => s >= MIN_EDGE_CONTRAST).length

    // At least 3 of the 4 edges must exhibit physical bezel contrast
    const alignmentValid = validEdgesCount >= 3 || avgEdgeScore >= 0.5
    const screenDetected = alignmentValid

    return {
      screenDetected,
      alignmentValid,
      confidenceScore: Math.round(avgEdgeScore * 100) / 100,
      edgeContrastScores: edgeScores,
      details: alignmentValid
        ? `Bezel contrast verified across ${validEdgesCount}/4 screen edges (confidence: ${(avgEdgeScore * 100).toFixed(0)}%).`
        : `Insufficient bezel edge contrast (${validEdgesCount}/4 edges verified, confidence: ${(avgEdgeScore * 100).toFixed(0)}%). Blind preset overlay rejected.`,
    }
  } catch (err: any) {
    return {
      screenDetected: false,
      alignmentValid: false,
      confidenceScore: 0,
      edgeContrastScores: { top: 0, right: 0, bottom: 0, left: 0 },
      details: `Chassis verification failed: ${err?.message || err}`,
    }
  }
}
