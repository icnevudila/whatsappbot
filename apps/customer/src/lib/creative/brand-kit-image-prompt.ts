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
      delivery:s.deliveryInfo,stock:s.stockInfo,urgency:s.urgencyInfo,benefits:s.primaryBenefits,
      commerce:s.products.map(p=>({price:p.include.price?p.price:null,oldPrice:p.include.price?p.oldPrice:null,offer:p.include.promo?p.promo:null}))},
    requiredProductInformation:s.products.map(p=>({name:p.include.name?p.name:null,description:p.include.description?p.description:null,
      contents:p.include.boxContents?p.boxContents:null,details:p.extra})),
    references:s.products.map(p=>({product:p.name,hasPhoto:!!(p.include.image&&p.imageUrl)})),
    direction:s.instruction || s.customText || null,
  }
  return {prompt:[
    `Create one distinctive Turkish ${s.aspect} ${campaign?'showstopping product campaign with a compelling offer and strong CTA hierarchy':'brand/product introduction with editorial craft and a clear CTA'}.`,
    campaign
      ? 'Design an energetic retail campaign around ONE memorable visual idea drawn from the offering itself: its real use, material, action or customer benefit must drive the scene. Integrate bold campaign typography with the hero and this idea; dimensional/extruded lettering, flat graphic type or layered collage are choices, not a mandatory template. Give one supplied benefit/offer primary emphasis, up to two secondary groups, and keep remaining required details in compact readable supporting copy rather than six equal feature cards. Use strong brand-color contrast, deliberate negative space, a decisive CTA and supplied contact actions. 3D or glow may support the idea, but generic laser streaks and decorative effects must not replace it. Vary the composition and never add fake discount badges or invented numbers.'
      : 'Build a brand-owned visual world from the actual offering below: the central scene must visibly explain what this company enables, through a clever, concrete visual idea. Use its logo geometry as a subtle compositional motif, its colors as material/architectural accents, and its service-specific objects or real product as the hero. Logo swapping must NOT turn this into an equally valid ad for an unrelated business. Typography, scene and CTA must feel designed together, not text pasted over a stock photograph. Choose surprising but intelligible scale, viewpoint and visual metaphor; detailed premium materials, credible light and mobile-readable hierarchy. No default desk/coffee/plant still life, generic floating icon network or neon effects.',
    'Use the exact attached logo rendering, not an inverted/recolored variant or rebuilt lockup; make it legible on a contrasting surface. Preserve brand palette. The real product photograph overrides descriptive prose: keep its proportions, controls, fittings, label and hose arrangement; do not invent hardware or reconstruct a different model. Stage the scene around it. All populated copy fields, including commerce prices and offers, are REQUIRED readable text, exactly once. Every distinct fact in requiredProductInformation must also remain readable, but arrange it into concise feature groups instead of printing both the source paragraph and repeated badges. Do not add a second long product title when the same offering is already identified. Reserve enough space BEFORE decoration. Direction and brand background are context, not printed copy. Never invent offers, prices, contacts, specifications or real UI. Without a product photo, illustrate the offering conceptually, never invent an exact SKU. Select a fresh composition each time.',
    s.generationType==='revision' && s.baseCreativeId ? 'Preserve the attached parent scene and change only the requested details.' : 'Make a new composition while keeping brand identity.',
    JSON.stringify(brief,(_key,value)=>value===null||value===undefined||value===''?undefined:value),
  ].join('\n'),negative:'altered logo, wrong brand colors, missing supplied copy, invented commercial facts, illegible text'}
}
