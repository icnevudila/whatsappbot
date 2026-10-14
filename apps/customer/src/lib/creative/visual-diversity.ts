import type { CreativeStyleMode } from './style-mode'

export type CompositionFamily =
  | 'human_centric'
  | 'product_dashboard'
  | 'human_product_hybrid'
  | 'environment_scene'
  | 'commercial_spectacle'

export type VisualDiversityPlan = {
  version: 1
  id: string
  family: CompositionFamily
  subject: 'brand' | 'physical' | 'software' | 'service'
  composition: string
  scene: string
  camera: string
  lighting: string
  enhancement?: boolean
}

type DirectionConfig = {
  id: string
  family: CompositionFamily
  composition: string
  camera: string
  lighting: string
}

const DIRECTIONS: readonly DirectionConfig[] = [
  {
    id: 'human_centric',
    family: 'human_centric',
    composition: 'Human-centric composition: A relatable business owner or professional is the warm focal subject, visibly benefiting from the offering in an authentic everyday commercial moment.',
    camera: '50mm eye-level portrait perspective with natural focal depth and soft background bokeh.',
    lighting: 'Soft natural key light with warm environmental fill and realistic facial tones.',
  },
  {
    id: 'product_dashboard',
    family: 'product_dashboard',
    composition: 'Product/dashboard hero staging: The authentic offering is the undisputed central hero on a clean modern surface or sleek device, surrounded by disciplined negative space and clear typography.',
    camera: 'Sharp 3/4 commercial studio perspective, pin-sharp focal fidelity on the real product/interface.',
    lighting: 'Controlled commercial studio lighting with subtle rim highlights and soft natural contact shadows.',
  },
  {
    id: 'human_product_hybrid',
    family: 'human_product_hybrid',
    composition: 'Human + product hybrid: Balanced interaction between a professional operator and the product/device in active, plausible use; neither human nor product overpowers the frame.',
    camera: 'Medium commercial shot capturing both authentic human expression and crisp product/screen clarity.',
    lighting: 'Balanced directional daylight with gentle ambient fill, realistic workplace illumination.',
  },
  {
    id: 'environment_scene',
    family: 'environment_scene',
    composition: 'Contextual environment storytelling: The product/device is naturally situated in a thriving real-world business setting (boutique, modern studio, cafe, workshop) showing operational rhythm.',
    camera: 'Wider environmental 35mm framing with layered foreground depth and believable perspective.',
    lighting: 'Atmospheric ambient location daylight with authentic architectural reflections.',
  },
  {
    id: 'commercial_spectacle',
    family: 'commercial_spectacle',
    composition: 'High-impact commercial spectacle: Dynamic diagonal or asymmetric visual hierarchy, commanding headline typography, layered depth, and refined commercial brand accents.',
    camera: 'Dynamic low-angle or tilted cinematic framing creating energy, dimension, and commercial weight.',
    lighting: 'High-contrast dramatic commercial lighting with volumetric depth and controlled specular highlights.',
  },
] as const

function seedIndex(seed: string, length: number): number {
  let hash = 2166136261
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return (hash >>> 0) % length
}

/** History is supplied from tenant-scoped persisted creatives, not process memory. */
export function selectVisualDiversityPlan(input: {
  requestKey: string
  subject: VisualDiversityPlan['subject']
  styleMode?: CreativeStyleMode
  recent?: readonly (VisualDiversityPlan | null | undefined)[]
  generationType?: string | null
  variationMode?: 'new_composition' | 'enhance' | null
  parent?: VisualDiversityPlan | null
}): VisualDiversityPlan | null {
  // A revision changes the requested copy only; it must never rotate the scene.
  if (input.generationType === 'revision') return input.parent || null

  // If user explicitly asks to enhance existing design, retain parent's composition family with enhanced polish
  if (input.variationMode === 'enhance' && input.parent) {
    return {
      ...input.parent,
      enhancement: true,
      lighting: `${input.parent.lighting} Elevated commercial polish, richer specular depth, and crisp contrast transitions.`,
    }
  }

  const history = [input.parent, ...(input.recent || [])].filter((plan): plan is VisualDiversityPlan =>
    !!plan && plan.version === 1 && plan.subject === input.subject)

  let candidates = input.subject === 'brand'
    ? DIRECTIONS.filter(d => d.family !== 'human_centric')
    : [...DIRECTIONS]

  // In a variation ("Başka Tasarım Dene" or standard variation), NEVER repeat the parent's composition family!
  if (input.parent?.family) {
    const parentFamily = input.parent.family
    const nonParentCandidates = candidates.filter(d => d.family !== parentFamily)
    if (nonParentCandidates.length > 0) {
      candidates = nonParentCandidates
    }
  }

  const offset = seedIndex(input.requestKey, candidates.length)
  const rotated = [...candidates.slice(offset), ...candidates.slice(0, offset)]

  // Never repeat the most recent layout. With exhausted choices, reuse the least
  // recently seen layout; request-key ordering resolves otherwise equal choices.
  const age = (family: CompositionFamily) => {
    const index = history.findIndex(plan => plan.family === family)
    return index < 0 ? Number.MAX_SAFE_INTEGER : index
  }

  const direction = rotated.reduce((best, candidate) =>
    age(candidate.family) > age(best.family) ? candidate : best)

  const scenes: Record<VisualDiversityPlan['subject'], string> = {
    brand: 'A graphic brand campaign using only the canonical logo and supplied company facts; no invented product, interface, staff or facilities.',
    software: direction.family === 'human_centric'
      ? 'An authentic business setting with a credible owner in a candid working moment. Present the supplied interface as a separate flat, front-facing panel at its original aspect ratio.'
      : direction.family === 'human_product_hybrid'
        ? 'A contemporary workplace where an entrepreneur actively operates the authentic Mesajify customer panel on desktop or mobile.'
        : direction.family === 'environment_scene'
          ? 'A thriving commercial workspace (boutique, modern office, agency) with Mesajify running naturally on a desk device.'
          : direction.family === 'commercial_spectacle'
            ? 'A bold editorial software campaign with strong typography, asymmetric spacing and the supplied interface as a flat, front-facing panel.'
            : 'A clean software campaign presenting the supplied interface at its original aspect ratio with generous space for a short headline.',
    service: 'Use the authentic service, workplace or completed-work photograph as the main evidence; surrounding presentation may vary without inventing facilities or outcomes.',
    physical: 'Stage the exact canonical product in a believable setting suited to its actual use and sector. Human interaction is optional and cannot obscure or redesign the product.',
  }

  const softwareComposition: Record<CompositionFamily, string> = {
    human_centric: 'Warm human-first commercial portrait: A credible business owner in a natural commercial setting. Balance the portrait with a separate authentic interface panel, a short headline and one CTA. Keep the scene uncluttered.',
    product_dashboard: 'Editorial dashboard layout: The supplied interface remains flat and front-facing at its original aspect ratio, balanced with generous breathing room, a short headline and one CTA.',
    human_product_hybrid: 'Operator interaction: Entrepreneur actively reviewing incoming WhatsApp messages or campaigns on the real interface, balancing human presence with software clarity and realistic office context.',
    environment_scene: 'Environmental workspace: The Mesajify control center in an active, sunlit Turkish business setting, showing effortless multi-hat communication and natural device placement.',
    commercial_spectacle: 'Bold campaign poster: Create impact through large readable typography, asymmetric composition and controlled brand color. Keep the authentic interface flat and front-facing; use no floating notifications or decorative interface cards.',
  }

  return {
    version: 1,
    id: direction.id,
    family: direction.family,
    subject: input.subject,
    composition: input.subject === 'software' ? softwareComposition[direction.family] : direction.composition,
    scene: scenes[input.subject],
    camera: input.subject === 'software'
      ? direction.family === 'human_centric'
        ? '50mm eye-level portrait lens with natural depth of field.'
        : 'Front-facing interface presentation at its original aspect ratio. Natural eye-level perspective for any surrounding scene.'
      : direction.camera,
    lighting: input.subject === 'software'
      ? direction.family === 'commercial_spectacle'
        ? 'Clean high-contrast editorial lighting with restrained brand color and no neon beams.'
        : 'Believable daylight or soft practical office lighting with ordinary material reflections.'
      : direction.lighting,
  }
}

export function visualDiversityDirective(plan: VisualDiversityPlan | null | undefined): string {
  if (!plan || plan.version !== 1) return ''
  return [
    'FRESH COMPOSITION PLAN: This is a structural direction, not visible artwork text.',
    `Composition Family: ${plan.family}`,
    `Composition: ${plan.composition}`,
    `Scene: ${plan.scene}`,
    `Camera: ${plan.camera}`,
    `Lighting: ${plan.lighting}`,
    plan.enhancement ? 'ENHANCED QUALITY POLISH: Maintain this creative direction and composition family, but elevate visual fidelity: sharpen focal textures, enrich lighting depth, refine typographic kerning, and deepen specular realism.' : '',
    'Create meaningful differences in composition, framing and depth, not merely another color tint or a changed headline. Existing advertisements are identity references, not a layout to duplicate.',
    ...(plan.subject === 'software' ? [
      'SOFTWARE REALISM: Use the authentic supplied screenshot/interface. Device scale must remain physically plausible. If a person appears, show a candid believable working posture and a physically plausible grip. Keep interface details faithful to the supplied reference; do not fabricate alternate screens.',
      'SCREEN PRESENTATION: Do not stretch a portrait screenshot into a widescreen laptop. Prefer the original flat screenshot panel over a device mockup. If hardware is explicitly requested, keep it secondary, nearly front-facing and physically plausible. Avoid steep screen perspective, oversized laptops, nested screens and invented interface overlays.',
      'Attention comes from clear hierarchy, cropping and contrast. Keep one primary CTA and restrained readable copy; do not fill every area with repeated buttons, text stickers or decorative interface cards.',
    ] : []),
    'The explicit user design request takes precedence. Preserve the exact canonical logo/product/interface, approved literal copy and verified facts. Do not invent UI, metrics, conversations, features, prices or badges. Do not print this plan, its ID or instructions.',
  ].filter(Boolean).join('\n')
}
