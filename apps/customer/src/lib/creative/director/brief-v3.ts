import type { CreativeSnapshot } from '../types'
import { campaignFactsError } from '../campaign-facts'

export function compileCreativeBriefV3(snapshot: CreativeSnapshot) {
  const product = snapshot.products[0]
  const campaign = { objective: snapshot.objective, headline: snapshot.customHeadline || snapshot.brief,
    cta: snapshot.cta, price: product?.price, oldPrice: product?.oldPrice, offer: product?.promo }
  const error = campaignFactsError(campaign)
  if (error) throw new Error(error)
  const context = `${snapshot.sector || ''} ${product?.name || ''} ${product?.description || ''}`
  const composition = /tarım|pompa|ilaçlama|sprayer/i.test(context)
    ? 'Environmental product action: canonical equipment dominates a real agricultural environment; soil/foliage are environment only, not casing materials.'
    : /inşaat|tuğla|yapı|masonry/i.test(context)
      ? 'Architectural material campaign: canonical material geometry guides an editorial composition on a stable construction surface.'
      : /yemek|döner|gıda|restoran/i.test(context)
        ? 'Culinary appetite campaign: authentic food texture and serving geometry guide the composition; no invented ingredients.'
        : /yazılım|saas|platform/i.test(context)
          ? 'Product interface campaign: authentic supplied interface dominates; no invented capabilities or fake dashboard numbers.'
          : 'Editorial product hero: use authentic product silhouette, negative space and brand typography to compose this specific advertisement.'
  return {
    brandDNA: { name: snapshot.companyName || snapshot.brandName || snapshot.brandKit?.name || null,
      colors: snapshot.brandKit?.colors || {}, fonts: snapshot.brandKit?.fonts || {},
      tone: snapshot.brandKit?.tone || null, sector: snapshot.sector || null,
      canonicalLogo: snapshot.brandKit?.logoPath || null },
    productDNA: { id: product?.id, name: product?.name, description: product?.description,
      canonicalImage: product?.imageUrl, appearance: 'Exact reference geometry, materials and physical colors; no palette recoloring.' },
    campaignDNA: { ...campaign, delivery: snapshot.deliveryInfo || null,
      date: snapshot.dateRange || null, supporting: snapshot.customSupporting || null,
      contacts: snapshot.phones, website: snapshot.website || null },
    creativeDirection: { composition, style: snapshot.style,
      styleDirection: ({ auto: 'Choose the suitable look from the actual brand and product.',
        product_hero: 'Modern and clean: generous spacing, contemporary typography and authentic product prominence.',
        real_usage: 'Warm and friendly: natural lighting and approachable human context when appropriate.',
        premium: 'Refined and premium: restrained hierarchy and elegant light without changing physical materials.',
        dynamic_offer: 'Bold and striking: high contrast with clear emphasis on the supplied commercial offer.' } as Record<string,string>)[snapshot.style] || snapshot.style,
      density: snapshot.textDensity,
      hierarchy: 'Canonical product and logo, headline, supplied price OR offer, supplied CTA; secondary details only if verified.',
      originality: 'Resolve placement from this product geometry; no mandatory left-title/right-product, price pill, CTA button, or three-badge scaffold.' },
    renderConstraints: { aspect: snapshot.aspect,
      requiredCommerce: ['SALES_OFFER', 'CAMPAIGN'].includes(snapshot.objective || ''),
      claims: 'Only supplied facts. Do not invent prices, discounts, certifications, guarantees, ingredients, delivery promises or dates.',
      contrast: 'Keep text legible on mobile; choose background/text role pair with sufficient contrast without changing product/logo colors.',
      fidelityQA: 'NOT_VERIFIED until the actual generated image is inspected.' },
  }
}

export function buildCreativePromptV3(snapshot: CreativeSnapshot) {
  const brief = compileCreativeBriefV3(snapshot)
  return { prompt: [
    'Create ONE complete AI-designed Turkish advertisement from the structured brief below. The attached canonical logo/product are identity references, not a layout template.',
    'Use the exact supplied brand color roles and heading font when available. Missing roles remain unspecified; never borrow another brand palette.',
    'Keep supplied sales headline, price OR offer and CTA visible at every text density. Low density removes optional supporting copy only. Preserve user-written copy literally.',
    'Do not render JSON keys, reference URLs or technical instructions as visible copy. Compose typography, product, light and environment as one original scene.',
    JSON.stringify(brief),
  ].join('\n'), negative: 'wrong product identity, altered logo, illegible Turkish, invented commercial facts' }
}
