import type { CreativeSnapshot } from './types'

function text(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string' || value.length > 6000) throw new Error('VIDEO_CAMPAIGN_FIELD_INVALID')
  return value.trim() || null
}
function strings(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
}

export function buildVideoCampaignSnapshot(input: {
  context: Record<string, unknown>
  brief: unknown
  cta: unknown
  voiceover: string
  offer: unknown
  canonical: {
    product: { id: string; name: string; description: string | null; box_contents?: string | null }
    productUrl: string
    logoUrl: string
    kit: { id: string; name: string; tone: string | null; colors: unknown; fonts: unknown; logo_path: string | null } | null
    organization: { name?: string; about?: string | null; address?: string | null } | null
  }
  phones: CreativeSnapshot['phones']
  socials: CreativeSnapshot['socials']
}): CreativeSnapshot {
  const { canonical, context } = input
  return {
    companyName: canonical.organization?.name || null, companyAbout: canonical.organization?.about || null,
    brief: [text(input.brief), text(context.headline), text(context.supportingLine), text(context.campaignDetail)].filter(Boolean).join('\n'),
    style: text(context.stylePreset) || 'auto', formatId: 'reels_video', aspect: '9:16',
    textDensity: context.textDensity === 'low' || context.textDensity === 'detailed' ? context.textDensity : 'balanced',
    useLogo: true, labels: [], cta: text(input.cta), address: canonical.organization?.address || null,
    website: input.socials.find(contact => contact.platform === 'website')?.url || null, dateRange: text(context.dateRange), customText: text(context.supportingLine),
    phones: input.phones, socials: input.socials,
    brandKit: canonical.kit ? { id: canonical.kit.id, name: canonical.kit.name, tone: canonical.kit.tone,
      colors: strings(canonical.kit.colors), fonts: strings(canonical.kit.fonts), logoPath: canonical.logoUrl } : null,
    products: [{ id: canonical.product.id, name: canonical.product.name, description: canonical.product.description,
      boxContents: canonical.product.box_contents || null, imageUrl: canonical.productUrl,
      price: text(context.price), oldPrice: text(context.oldPrice), promo: text(input.offer), extra: text(context.campaignDetail),
      include: { name: true, image: true, description: true, boxContents: true, price: true, promo: true } }],
    baseCreativeId: null, customVoiceover: input.voiceover, voiceoverScript: input.voiceover,
    sector: text(context.sector), deliveryInfo: text(context.deliveryInfo),
  }
}
