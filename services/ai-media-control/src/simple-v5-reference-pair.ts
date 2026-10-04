import type { VideoGenerationRequest } from './providers/video-provider-router.js'

/** SIMPLE_V5 always attaches both canonical identities; finishing never removes the logo reference. */
export function assertSimpleV5ReferencePair(orgId:string, assets:VideoGenerationRequest['assets']): void {
  if (assets.length !== 2 || assets.filter(asset=>asset.role === 'logo').length !== 1 ||
      assets.filter(asset=>['product','hero_product','software_ui'].includes(asset.role)).length !== 1 ||
      assets.some(asset=>asset.org_id !== orgId || !/^[a-f0-9]{64}$/i.test(asset.sha256)) ||
      new Set(assets.map(asset=>asset.asset_id)).size !== 2 || new Set(assets.map(asset=>asset.sha256)).size !== 2) {
    throw new Error('SIMPLE_V5_CANONICAL_REFERENCE_PAIR_REQUIRED: exactly one owned canonical hero product and one brand logo must reach Flow')
  }
}
