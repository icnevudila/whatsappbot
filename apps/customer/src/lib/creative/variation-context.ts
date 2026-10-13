import type { CreativePayload } from './types'

/** The owned parent's identity is authoritative; client choices only direct layout/copy. */
export function variationIdentityError(productIds: string[], kitId: string | null, parent: CreativePayload): string | null {
  const parentIds = (parent.products || []).map(product => product.id)
  if (productIds.some(id => !parentIds.includes(id))) return 'Varyasyon ve revizyonda kaynak görselin ürün kimliği değiştirilemez.'
  if (kitId && parent.brandKit?.id && kitId !== parent.brandKit.id) return 'Varyasyon ve revizyonda kaynak görselin marka kiti değiştirilemez.'
  return null
}

/** Inherit facts, never output identity, provider state or compiled direction. */
export function inheritVariationContext(draft: Record<string, unknown>, parent: CreativePayload): Record<string, unknown> {
  const inherited = { ...draft }
  const keys = ['cta', 'address', 'website', 'dateRange', 'customText', 'customHeadline',
    'customSupporting', 'objective', 'stylePreset', 'qualityMode', 'templateFamily',
    'sector', 'deliveryInfo', 'stockInfo', 'urgencyInfo', 'primaryBenefits', 'promotionMode', 'offeringKind'] as const
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(draft, key) && parent[key] !== undefined) {
      inherited[key] = parent[key]
    }
  }
  return inherited
}
