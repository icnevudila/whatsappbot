import type { CreativeSnapshot } from './types'

/** One brief, no competing scene templates. Required inputs are never truncated. */
export function buildBrandKitImagePrompt(s: CreativeSnapshot) {
  if (!s.useLogo || !s.brandKit?.logoPath) throw new Error('IMAGE_LOGO_REQUIRED')
  const colors = Object.fromEntries(Object.entries(s.brandKit.colors || {}).filter(([,v])=>/^#(?:[a-f\d]{3}|[a-f\d]{6}|[a-f\d]{8})$/i.test(v)))
  if (!Object.keys(colors).length) throw new Error('IMAGE_BRAND_COLORS_REQUIRED')
  const campaign=s.styleMode==='SHOWSTOPPER_CAMPAIGN'
  const brief={
    brand:{name:s.companyName||s.brandName||s.brandKit.name,about:s.companyAbout,sector:s.sector,colors,fonts:s.brandKit.fonts,tone:s.brandKit.tone},
    copy:{headline:s.customHeadline,supporting:s.customSupporting,brief:s.brief.trim()===s.customHeadline?.trim()?undefined:s.brief,cta:s.cta,labels:s.labels,dates:s.dateRange,
      address:s.address,website:s.website,phones:s.phones.map(p=>({label:p.label,phone:p.phone})),socials:s.socials.map(p=>({platform:p.platform,url:p.url})),
      delivery:s.deliveryInfo,stock:s.stockInfo,urgency:s.urgencyInfo,benefits:s.primaryBenefits},
    offerings:s.products.map(p=>({name:p.name,description:p.include.description?p.description:null,contents:p.include.boxContents?p.boxContents:null,
      price:p.include.price?p.price:null,oldPrice:p.include.price?p.oldPrice:null,offer:p.include.promo?p.promo:null,details:p.extra,hasPhoto:!!(p.include.image&&p.imageUrl)})),
    direction:s.instruction || s.customText || null,
  }
  return {prompt:[
    `Create one distinctive Turkish ${s.aspect} ${campaign?'showstopping product campaign with a compelling offer and strong CTA hierarchy':'brand/product introduction with editorial craft and a clear CTA'}.`,
    campaign
      ? 'Design an energetic retail campaign key visual, not an editorial photograph or a quiet corporate poster. Make campaign typography a bold graphic object interacting with the real product: dimensional/extruded lettering, contrasting type treatments, controlled overlap, asymmetric scale and dynamic diagonals where appropriate. Surround a dominant product hero with a purposeful campaign system: supplied offer/price as a focal badge when available, verified feature callouts, graphic shapes/ribbons and clear action/contact blocks. Use rich layering, punchy brand-color contrast and polished commercial lighting; controlled glow or 3D is allowed when it suits the brand. Vary the composition; do NOT default to headline on top, centered product, single bottom pill. Never add fake discount badges or invented numbers. Keep all content legible and the product silhouette intact.'
      : 'Build a brand-owned visual world from the actual offering below: the central scene must visibly explain what this company enables, through a clever, concrete visual idea. Use its logo geometry as a subtle compositional motif, its colors as material/architectural accents, and its service-specific objects or real product as the hero. Logo swapping must NOT turn this into an equally valid ad for an unrelated business. Typography, scene and CTA must feel designed together, not text pasted over a stock photograph. Choose surprising but intelligible scale, viewpoint and visual metaphor; detailed premium materials, credible light and mobile-readable hierarchy. No default desk/coffee/plant still life, generic floating icon network or neon effects.',
    'The attached logo must remain unchanged and legible on a contrasting surface. Preserve brand palette and any attached real product. Render every populated copy field exactly once; direction and brand background are context, not printed copy. Never invent offers, prices, contacts, specifications or real UI. A product photo is optional: without one, illustrate the offering conceptually, never invent an exact SKU. Select a fresh composition each time.',
    s.generationType==='revision' && s.baseCreativeId ? 'Preserve the attached parent scene and change only the requested details.' : 'Make a new composition while keeping brand identity.',
    JSON.stringify(brief,(_key,value)=>value===null||value===undefined||value===''?undefined:value),
  ].join('\n'),negative:'altered logo, wrong brand colors, missing supplied copy, invented commercial facts, illegible text'}
}
