import type { CreativeSnapshot } from './types'

/** A mode-specific production contract. This is guidance, never a visual QA verdict. */
export function imageArtDirection(s: CreativeSnapshot & {heroProductId?:string|null}) {
  const selected=s.products.filter(p=>p.include.image&&p.imageUrl)
  const hero=selected.find(p=>p.id===s.heroProductId)||selected[0]
  const mode=s.styleMode==='CONCEPT_CAMPAIGN'?'concept':s.styleMode==='SHOWSTOPPER_CAMPAIGN'?'campaign':'brand'
  return {
    version:'AGENCY_DIRECTION_V1',mode,
    identity:{heroProductId:hero?.id,referenceProductIds:selected.map(p=>p.id),productCount:selected.length,logo:'exact attached artwork; preserve its colors and lettering'},
    intent:mode==='brand'
      ? 'Create desire and recognition through the product character, material, use or brand purpose. One distinctive photographic or conceptual idea; do not force a miniature world, pedestal or a promotion.'
      :mode==='campaign'
        ? 'Make the supplied commercial reason immediately understandable. Product, verified offer and one action form a unified advertising composition; never invent a reason to buy.'
        :'Create a coherent immersive advertising world. Foreground, product, environment and scene-integrated type tell the same specific story; richer detail must improve meaning, never compete with the hero.',
    production:{
      concept:'Privately explore three distinct ideas grounded in this product and request; discard generic product-on-plinth, swapped-logo, random-prop and oversized-slogan-only ideas. Select one with the strongest connection to this offering. Do not print the ideas or this reasoning.',
      composition:mode==='campaign'?'Choose the composition around offer length and product silhouette. Distinct primary/secondary hierarchy, intentional margins, grouped terms and an unmistakable closing action.':'Choose viewpoint, scale and foreground/background separation for the selected idea. Give the actual product a dominant readable silhouette and space for the approved copy.',
      lighting:'Specify a motivated key light, fill, shadow direction, contact shadows and material-specific highlights. Preserve real texture; avoid waxy surfaces and uniform CGI gloss.',
      type:'Art-direct the actual Turkish words: optical kerning, intentional line breaks, correct diacritics, consistent type family roles, adequate contrast at phone size. Supporting copy must remain readable; no randomly extruded text.',
      facts:'Separate factual copy from scene direction. No implied health/organic/performance/certification claims through badges, seals or props. Retain every selected fact once, never smuggle excluded price or promotion into the artwork.',
      review:'Before finalizing, inspect product geometry and packaging, exact logo, spelling, all required facts, clipping, tangencies, shadow coherence and mobile reading order. Correct defects within this rendering. This request is not evidence that output passed an independent review.',
    },
    revision:s.generationType==='revision'&&s.baseCreativeId?'Parent scene and requested edit override new-concept exploration; preserve everything else.':undefined,
  }
}
