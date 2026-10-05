import type { CreativePayload } from './types'

/** Inherit facts, never output identity, provider state or compiled direction. */
export function inheritVariationContext(draft: Record<string, unknown>, parent: CreativePayload): Record<string, unknown> {
  const inherited = { ...draft }
  const keys = ['cta', 'address', 'website', 'dateRange', 'customText', 'customHeadline',
    'customSupporting', 'objective', 'stylePreset', 'qualityMode', 'templateFamily',
    'sector', 'deliveryInfo', 'stockInfo', 'urgencyInfo', 'primaryBenefits'] as const
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(draft, key) && parent[key] !== undefined) {
      inherited[key] = parent[key]
    }
  }
  return inherited
}
