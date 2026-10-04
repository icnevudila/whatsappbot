import type { ResolvedAsset } from './asset-source-resolver'

/** The worker must receive a downloadable source, never a browser-relative URL. */
export function videoAssetTransportSource(asset: ResolvedAsset, appOrigin: string): string {
  if (/^https?:\/\//.test(asset.resolvedUrl)) return asset.resolvedUrl
  if (asset.sourceType === 'public_brand' || asset.sourceType === 'public_logo') {
    return new URL(asset.resolvedUrl, appOrigin).toString()
  }
  if (asset.sourceType === 'filesystem') return asset.resolvedUrl
  throw new Error('VIDEO_ASSET_SOURCE_NOT_TRANSFERABLE')
}

export function requireDistinctVideoProduct(logo: ResolvedAsset, product: ResolvedAsset): void {
  if (logo.sha256.toLowerCase() === product.sha256.toLowerCase()) {
    throw new Error('PRODUCT_REFERENCE_IS_LOGO: Ürün referansı ve işletme logosu aynı dosya. Gerçek ürün veya arayüz görseli ekleyin.')
  }
}
