import type { Point2D, Quad } from './types'

export type Matrix3x3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number],
]

/**
 * Solve an 8x8 linear system using Gaussian elimination with partial pivoting.
 */
function solve8x8(A: number[][], B: number[]): number[] {
  const n = 8
  const M: number[][] = A.map((row, i) => [...row, B[i]])

  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i
    let maxVal = Math.abs(M[i][i])
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(M[r][i]) > maxVal) {
        maxVal = Math.abs(M[r][i])
        maxRow = r
      }
    }
    if (maxVal < 1e-12) {
      throw new Error('Singular matrix in homography calculation: points may be collinear.')
    }
    if (maxRow !== i) {
      const tmp = M[i]
      M[i] = M[maxRow]
      M[maxRow] = tmp
    }

    // Eliminate below
    for (let r = i + 1; r < n; r++) {
      const factor = M[r][i] / M[i][i]
      for (let c = i; c <= n; c++) {
        M[r][c] -= factor * M[i][c]
      }
    }
  }

  // Back substitution
  const X = new Array<number>(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n]
    for (let c = i + 1; c < n; c++) {
      sum -= M[i][c] * X[c]
    }
    X[i] = sum / M[i][i]
  }

  return X
}

/**
 * Compute the 3x3 Projective Homography Matrix H such that:
 * [x', y', 1]^T ~ H * [u, v, 1]^T
 * maps source points src[0..3] to destination points dst[0..3].
 */
export function computeHomography(src: Quad, dst: Quad): Matrix3x3 {
  const A: number[][] = []
  const B: number[] = []

  for (let i = 0; i < 4; i++) {
    const { x: u, y: v } = src[i]
    const { x, y } = dst[i]

    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x])
    B.push(x)

    A.push([0, 0, 0, u, v, 1, -u * y, -v * y])
    B.push(y)
  }

  const h = solve8x8(A, B)

  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1.0],
  ]
}

/**
 * Compute inverse 3x3 matrix.
 */
export function invertMatrix3x3(m: Matrix3x3): Matrix3x3 {
  const [
    [a, b, c],
    [d, e, f],
    [g, h, k],
  ] = m

  const det =
    a * (e * k - f * h) -
    b * (d * k - f * g) +
    c * (d * h - e * g)

  if (Math.abs(det) < 1e-12) {
    throw new Error('Homography matrix is not invertible.')
  }

  const invDet = 1.0 / det

  return [
    [(e * k - f * h) * invDet, (c * h - b * k) * invDet, (b * f - c * e) * invDet],
    [(f * g - d * k) * invDet, (a * k - c * g) * invDet, (c * d - a * f) * invDet],
    [(d * h - e * g) * invDet, (g * b - a * h) * invDet, (a * e - b * d) * invDet],
  ]
}

/**
 * Compute the 8 coefficients required by Pillow's Image.Transform.PERSPECTIVE.
 * Pillow requires the coefficients of the mapping from DESTINATION to SOURCE (inverse transform):
 * u = (a*x + b*y + c) / (g*x + h*y + 1)
 * v = (d*x + e*y + f) / (g*x + h*y + 1)
 * Normalized so the last term is 1.
 */
export function computePillowPerspectiveCoeffs(
  srcWidth: number,
  srcHeight: number,
  targetQuad: Quad,
): number[] {
  const srcQuad: Quad = [
    { x: 0, y: 0 },
    { x: srcWidth, y: 0 },
    { x: srcWidth, y: srcHeight },
    { x: 0, y: srcHeight },
  ]

  // We want mapping targetQuad -> srcQuad
  const invH = computeHomography(targetQuad, srcQuad)
  const norm = invH[2][2] || 1.0

  return [
    invH[0][0] / norm,
    invH[0][1] / norm,
    invH[0][2] / norm,
    invH[1][0] / norm,
    invH[1][1] / norm,
    invH[1][2] / norm,
    invH[2][0] / norm,
    invH[2][1] / norm,
  ]
}

/**
 * Verify quadrilateral convexity (strictly positive cross products).
 */
export function isQuadConvex(quad: Quad): boolean {
  for (let i = 0; i < 4; i++) {
    const p1 = quad[i]
    const p2 = quad[(i + 1) % 4]
    const p3 = quad[(i + 2) % 4]

    const dx1 = p2.x - p1.x
    const dy1 = p2.y - p1.y
    const dx2 = p3.x - p2.x
    const dy2 = p3.y - p2.y

    const cross = dx1 * dy2 - dy1 * dx2
    if (cross <= 0) return false
  }
  return true
}

/**
 * Calculate area of quadrilateral using Shoelace formula.
 */
export function calculateQuadArea(quad: Quad): number {
  let area = 0
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4
    area += quad[i].x * quad[j].y
    area -= quad[j].x * quad[i].y
  }
  return Math.abs(area) / 2
}

/**
 * Calculate bounding box of quadrilateral.
 */
export function getQuadBoundingBox(quad: Quad): {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
} {
  const xs = quad.map((p) => p.x)
  const ys = quad.map((p) => p.y)
  const minX = Math.floor(Math.min(...xs))
  const maxX = Math.ceil(Math.max(...xs))
  const minY = Math.floor(Math.min(...ys))
  const maxY = Math.ceil(Math.max(...ys))
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Estimate 3D perspective tilt angles (pitch, yaw) of the screen quad in degrees.
 * If the screen is facing the camera directly, tilt is ~0°.
 * If tilted sideways (yaw) or vertically (pitch), returns the angle of the normal vector from [0, 0, 1].
 */
export function estimatePerspectiveTilt(quad: Quad, expectedAspect: number = 1.6): {
  tiltAngleDeg: number
  tiltXDeg: number
  tiltYDeg: number
} {
  // Approximate diagonals
  const v1 = { x: quad[2].x - quad[0].x, y: quad[2].y - quad[0].y }
  const v2 = { x: quad[1].x - quad[3].x, y: quad[1].y - quad[3].y }

  // Screen width top vs bottom ratio indicates pitch/yaw
  const topWidth = Math.hypot(quad[1].x - quad[0].x, quad[1].y - quad[0].y)
  const bottomWidth = Math.hypot(quad[2].x - quad[3].x, quad[2].y - quad[3].y)
  const leftHeight = Math.hypot(quad[3].x - quad[0].x, quad[3].y - quad[0].y)
  const rightHeight = Math.hypot(quad[2].x - quad[1].x, quad[2].y - quad[1].y)

  const avgWidth = (topWidth + bottomWidth) / 2
  const avgHeight = (leftHeight + rightHeight) / 2

  // Foreshortening compression detection relative to expected aspect ratio
  let foreshortenYawDeg = 0
  if (avgHeight > 0 && expectedAspect > 0) {
    const apparentAspect = avgWidth / avgHeight
    if (apparentAspect < expectedAspect * 0.75) {
      const ratio = Math.min(1, apparentAspect / expectedAspect)
      foreshortenYawDeg = Math.acos(ratio) * (180 / Math.PI)
    }
  }

  const hRatio = Math.abs(topWidth - bottomWidth) / Math.max(topWidth, bottomWidth, 1)
  const vRatio = Math.abs(leftHeight - rightHeight) / Math.max(leftHeight, rightHeight, 1)

  // Asymmetry to degrees approximation: angle = asin(ratio)
  const trapezoidYawDeg = Math.asin(Math.min(1, hRatio)) * (180 / Math.PI)
  const tiltYDeg = Math.max(trapezoidYawDeg, foreshortenYawDeg)
  const tiltXDeg = Math.asin(Math.min(1, vRatio)) * (180 / Math.PI)
  const tiltAngleDeg = Math.sqrt(tiltXDeg * tiltXDeg + tiltYDeg * tiltYDeg)

  return {
    tiltAngleDeg: Math.round(tiltAngleDeg * 10) / 10,
    tiltXDeg: Math.round(tiltXDeg * 10) / 10,
    tiltYDeg: Math.round(tiltYDeg * 10) / 10,
  }
}
