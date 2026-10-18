import { styleModeDirective, type CreativeStyleMode } from '../style-mode'
import { visualDiversityDirective, type VisualDiversityPlan } from '../visual-diversity'
import { type CreativePlanV2, type CreativeStylePreset, type ImageFormatV2 } from './types'
import { softwarePresentationDirective } from '../software-presentation'
import type { OfferingKind } from '../promotion-policy'

export type ImagePromptV2Options = {
  brandName: string
  productName: string
  productDescription?: string | null
  styleMode?: CreativeStyleMode
  stylePreset: CreativeStylePreset
  format: ImageFormatV2
  plan?: CreativePlanV2 | null
  hasLogoRef?: boolean
  hasProductRef?: boolean
  visualDiversityPlan?: VisualDiversityPlan | null
  offeringKind?: OfferingKind
  preserveScene?: boolean
}

export function buildImagePromptV2(options: ImagePromptV2Options): {
  prompt: string
  negativePrompt: string
} {
  const brand = (options.brandName || 'İşletmemiz').trim()
  const product = (options.productName || 'Ürün').trim()
  const desc = (options.productDescription || '').trim()
  const plan = options.plan

  const formatAspectMap: Record<ImageFormatV2, string> = {
    SQUARE_1_1: '1:1 square aspect ratio',
    STORY_9_16: '9:16 vertical mobile aspect ratio',
    PORTRAIT_4_5: '4:5 vertical portrait aspect ratio',
  }

  const aspectDirective = formatAspectMap[options.format] || '1:1 square aspect ratio'

  // Style directives
  let styleLine = 'Commercial advertising photography, balanced natural lighting, crisp details.'
  if (options.stylePreset === 'PRODUCT_HERO') {
    styleLine = 'Ultra-clean commercial studio product photography, pristine reflections, soft diffusion, razor-sharp 35mm focal depth, pure hero product focus.'
  } else if (options.stylePreset === 'REAL_USAGE') {
    styleLine = 'Authentic commercial in-context scene, realistic professional application, natural day-lit environment, realistic hand or operator interaction with natural anatomy.'
  } else if (options.stylePreset === 'PREMIUM') {
    styleLine = 'High-end luxury commercial lighting, architectural depth, restrained refined color grading, subtle specular highlights, premium editorial feel.'
  } else if (options.stylePreset === 'DYNAMIC_OFFER') {
    styleLine = 'Vibrant commercial advertising staging, dynamic directional lighting, high contrast, clean focal hierarchy.'
  }

  if (options.styleMode) styleLine += '\n' + styleModeDirective(options.styleMode)
  const sceneEnvironment = plan?.scene?.environment || 'Clean, modern, commercial environment appropriate for the product.'
  const composition = plan?.scene?.composition || 'Balanced commercial composition, product is prominent and in sharp focus.'
  const lighting = plan?.scene?.lighting || 'Professional advertising lighting with soft natural shadows.'

  const promptSections = [
    `Create ONE professional commercial advertising visual for ${brand} featuring ${product}.`,
    `[FORMAT]: ${aspectDirective}.`,
    `[STYLE]: ${styleLine}`,
    `[SCENE & ENVIRONMENT]: ${sceneEnvironment}`,
    `[COMPOSITION]: ${composition}. Ensure comfortable negative space in the upper or outer zones for clean graphic finishing.`,
    `[LIGHTING & DEPTH]: ${lighting}. Realistic material physics, authentic physical shadows, no floating elements.`,
    visualDiversityDirective(options.visualDiversityPlan),
    /yazılım|saas|platform|panel|mesajify/i.test(`${brand} ${product} ${desc}`) && options.styleMode === 'REAL_LIFE_CAMPAIGN'
      ? `[AUTHENTIC WORKSPACE & ERGONOMIC POSTURE]: When presenting ${brand} in real life, feature an authentic business professional or founder naturally holding a modern smartphone or tablet with relaxed posture and credible gaze.`
      : '',
    options.hasProductRef
      ? `[STRICT PRODUCT FIDELITY]: The physical product photo is provided as canonical reference @HeroProduct. Preserve the exact physical shape, materials, proportions, buttons, nozzle/accessories, and authentic colors of @HeroProduct with 100% fidelity. Do NOT mutate or redesign the product.`
      : `Feature ${product} with authentic physical characteristics.`,
    options.hasLogoRef
      ? `[BRAND IDENTITY]: Brand identity is verified from reference @BrandLogo. Do NOT invent fictional logos or foreign corporate emblems.`
      : `Do not invent fake logos.`,
    `[RAW IMAGE TYPOGRAPHY POLICY]: Strictly NO newly generated promotional text, NO invented headlines, NO fake prices, NO fake discounts, NO artificial badges, NO painted sticker graphics, NO fake buttons, NO watermarks. Preserve only authentic text already naturally printed or stamped on the physical body of the canonical product reference. Clean commercial background photography only.`,
    softwarePresentationDirective({ offeringKind: options.offeringKind, preserveScene: options.preserveScene, styleMode: options.styleMode, context: `${brand} ${product} ${desc}` }),
  ].filter(Boolean)

  const negativeTerms = [
    'text',
    'words',
    'headline',
    'watermark',
    'subtitles',
    'captions',
    'floating text',
    'fake logo',
    'invented brand name',
    'misspelled typography',
    'supermarket flyer sticker',
    'yellow starburst',
    'cartoon badge',
    'fake clickable web button',
    'speech bubble',
    'deformed product',
    'mutated product design',
    'generic replacement item',
    'wrong product color',
    'disfigured hands',
    'extra fingers',
    'six fingers',
    'fused fingers',
    'blurry',
    'low quality',
    'cluttered composition',
    'fake software ui',
    'hallucinated dashboard',
    'unreadable screen text',
    'garbled buttons',
    'extreme diagonal laptop angle',
    'sideways tilted screen',
    'edge-on device profile',
    'warped monitor',
    'portrait aspect laptop screen',
    'elongated laptop lid',
    'tall vertical laptop screen',
    'vertically stretched laptop',
    'square stretched laptop screen',
    'tablet masquerading as laptop',
    'deformed screen hinge',
    'vertically stretched monitor',
    'frontal flat-on laptop',
    'giant square laptop screen',
    'towering screen lid',
    'oversized screen blocking people',
    'wedge laptop',
    'kiosk monitor',
    'mobile layout on laptop',
    'bottom mobile tabs on laptop',
    'tall screen lid',
    'square screen lid',
    'awkward body posture',
    'unnatural gaze',
    'floating hands',
    'contorted sitting position',
    ...(plan?.negative_constraints || []),
  ]

  const uniqueNegatives = Array.from(new Set(negativeTerms)).filter(Boolean)

  return {
    prompt: promptSections.join('\n'),
    negativePrompt: uniqueNegatives.join(', '),
  }
}
