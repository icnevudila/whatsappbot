import type { TenantAsset } from '../types/asset-intake.js'

export type NaturalSurfaceType =
  | 'truck_panel'
  | 'shop_sign'
  | 'product_packaging'
  | 'uniform_patch'
  | 'crate_stencil'
  | 'glass_storefront'

export interface PlanarSurfaceCoordinates {
  topLeft: { x: number; y: number }
  topRight: { x: number; y: number }
  bottomRight: { x: number; y: number }
  bottomLeft: { x: number; y: number }
}

export interface TrackedSurfaceKeyframe {
  timestampSec: number
  surfaceQuad: PlanarSurfaceCoordinates
  occlusionRatio: number // 0.0 (fully visible) to 1.0 (occluded)
  surfaceLightingMultiplier: number
}

export interface SurfacePlacementPlan {
  surfaceType: NaturalSurfaceType
  canonicalLogoAssetId: string
  trackingPoints: TrackedSurfaceKeyframe[]
  homographyMatrixExpr: string
  blendMode: 'multiply' | 'screen' | 'normal' | 'soft_light'
  isFeasible: boolean
  rejectionReason?: string
}

/**
 * SurfaceAwareBrandPlacement.
 * Separate, isolated compositor capability for mapping authoritative brand logos
 * onto natural physical surfaces in footage using perspective tracking / planar homography.
 *
 * NOTE: This is completely distinct from standard 2D GRAPHIC_OVERLAY bugs.
 * A corner logo bug never claims to "restore" a deformed AI logo on a product body.
 */
export class SurfaceAwareBrandPlacement {
  /**
   * Plans perspective homography mapping onto an identified natural surface.
   */
  public planSurfaceTracking(
    surfaceType: NaturalSurfaceType,
    logoAsset: TenantAsset,
    surfaceTracking: TrackedSurfaceKeyframe[]
  ): SurfacePlacementPlan {
    if (!logoAsset.file_path) {
      return {
        surfaceType,
        canonicalLogoAssetId: logoAsset.asset_id,
        trackingPoints: [],
        homographyMatrixExpr: '',
        blendMode: 'normal',
        isFeasible: false,
        rejectionReason: 'Missing canonical logo file path for perspective mapping.',
      }
    }

    if (surfaceTracking.length === 0) {
      return {
        surfaceType,
        canonicalLogoAssetId: logoAsset.asset_id,
        trackingPoints: [],
        homographyMatrixExpr: '',
        blendMode: 'normal',
        isFeasible: false,
        rejectionReason: 'No planar tracking keyframes provided for surface.',
      }
    }

    // Build FFmpeg perspective transform filter snippet
    const q = surfaceTracking[0].surfaceQuad
    const homographyExpr = `perspective=x0=${q.topLeft.x}:y0=${q.topLeft.y}:x1=${q.topRight.x}:y1=${q.topRight.y}:x2=${q.bottomLeft.x}:y2=${q.bottomLeft.y}:x3=${q.bottomRight.x}:y3=${q.bottomRight.y}:interpolation=cubic`

    return {
      surfaceType,
      canonicalLogoAssetId: logoAsset.asset_id,
      trackingPoints: surfaceTracking,
      homographyMatrixExpr: homographyExpr,
      blendMode: 'multiply',
      isFeasible: true,
    }
  }
}
