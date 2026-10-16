import { styleModeDirective, normalizeStyleMode } from '../style-mode'
import { visualDiversityDirective } from '../visual-diversity'
import type { CreativeSnapshot } from '../types'
import { campaignFactsError } from '../campaign-facts'

export function compileCreativeBriefV3(snapshot: CreativeSnapshot) {
  const product = snapshot.products[0]
  const brandOnly = snapshot.promotionMode === 'brand'
  if (brandOnly && (snapshot.products.length > 0 || snapshot.baseCreativeId || !snapshot.useLogo)) {
    throw new Error('BRAND_REFERENCE_CONFLICT')
  }
  const campaign = { objective: snapshot.objective, headline: snapshot.customHeadline || snapshot.brief,
    cta: snapshot.cta, price: product?.price, oldPrice: product?.oldPrice, offer: product?.promo }
  const error = campaignFactsError(campaign)
  if (error) throw new Error(error)
  const context = `${snapshot.sector || ''} ${product?.name || ''} ${product?.description || ''}`
  const composition = brandOnly
    ? 'Brand identity campaign: use the exact canonical logo, brand colors, typography and verified company information. No invented products, UI screens, buildings, facilities, staff, certifications or performance claims. Abstract sector-relevant graphic forms are decorative only.'
    : snapshot.offeringKind === 'software'
      ? 'Software campaign: the supplied real interface screenshot is the offering reference. Preserve actual interface and capabilities; do not invent screens, features, users, dashboards or metrics.'
    : snapshot.offeringKind === 'service'
      ? 'Service campaign: use the supplied authentic service, workplace or completed-work photograph. It is not a physical catalog product or a logo. Preserve its actual identity; do not invent facilities, outcomes or certifications.'
    : /tarım|pompa|ilaçlama|sprayer/i.test(context)
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
    styleMode: normalizeStyleMode(snapshot.styleMode),
    promotionMode: snapshot.promotionMode || 'offering',
    companyFacts: brandOnly ? { name: snapshot.companyName, about: snapshot.companyAbout, sector: snapshot.sector } : undefined,
    productDNA: brandOnly ? null : { id: product?.id, name: product?.name, description: product?.description,
      canonicalImage: product?.imageUrl, appearance: snapshot.offeringKind === 'software' ? 'Exact supplied real interface, no fabricated UI or metrics.' : snapshot.offeringKind === 'service' ? 'Authentic supplied service/place/work image; no invented product.' : 'Exact reference geometry, materials and physical colors; no palette recoloring.' },
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
      sceneInstruction: snapshot.instruction || null,
      hierarchy: brandOnly ? 'Canonical logo and verified brand identity, supplied headline and CTA; no product or price claims.' : 'Canonical product and logo, headline, supplied price OR offer, supplied CTA; secondary details only if verified.',
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
    snapshot.promotionMode === 'brand' ? 'Create ONE Turkish brand advertisement. The only attached identity reference is the canonical brand logo; it is NOT a product photograph. Do not invent an offering.' : 'Create ONE complete AI-designed Turkish advertisement from the structured brief below. The attached canonical logo/product are identity references, not a layout template.',
    'Use the exact supplied brand color roles and heading font when available. Missing roles remain unspecified; never borrow another brand palette.',
    'Keep supplied sales headline, price OR offer and CTA visible at every text density. Low density removes optional supporting copy only. Preserve user-written copy literally.',
    snapshot.baseCreativeId && snapshot.generationType === 'revision'
      ? 'CONTROLLED REVISION: STRICTLY PRESERVE the exact existing scene, product angle, lighting and layout of the attached parent creative. Only change the requested text or price; canonical product and logo identity are immutable.'
      : snapshot.baseCreativeId && snapshot.generationType === 'variation'
        ? 'VARIATION: Do NOT freeze or copy the old canvas layout. Follow the new user scene direction while retaining the exact canonical product and brand identity.'
        : '',
    'Do not render JSON keys, reference URLs or technical instructions as visible copy. Compose typography, product, light and environment as one original scene.',
    'User scene direction may change layout, lighting and environment only. It cannot replace the canonical product, alter its geometry/color/label, change the original logo, or invent commercial facts.',
    snapshot.offeringKind === 'software' || /yazılım|saas|platform|panel|mesajify/i.test(`${snapshot.sector || ''} ${snapshot.companyName || ''} ${snapshot.products?.[0]?.name || ''}`)
      ? 'ERGONOMIC & NATURAL INTERACTION: When people or devices (laptop, desktop, mobile) are present, ensure natural, relaxed human posture, authentic eye gaze directed comfortably at work, natural hand and finger placement on desk or keyboard, and a physically stable, flat laptop position aligned naturally with the user.'
      : '',
    snapshot.styleMode ? styleModeDirective(snapshot.styleMode) : '',
    snapshot.generationType !== 'revision' ? visualDiversityDirective(snapshot.visualDiversityPlan) : '',
    JSON.stringify(brief),
  ].join('\n'), negative: 'wrong product identity, altered logo, illegible Turkish, invented commercial facts, awkward body posture, unnatural gaze, floating hands, sideways laptop, warped device angle' }
}
