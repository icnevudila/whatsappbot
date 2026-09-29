import type { ProductItem, ProductFidelityContract } from '../types/brand-snapshot.js'

export type { ProductFidelityContract }

export type ResolvedProductFidelityContract = {
  must_preserve: string[]
  surface_rules: string[]
  forbidden_mutations: string[]
  safe_camera_rules: string[]
  allowed_actions: string[]
}

export const UNIVERSAL_FIDELITY_CONTRACT: ResolvedProductFidelityContract = Object.freeze({
  must_preserve: [
    'preserve overall silhouette',
    'preserve visible proportions',
    'preserve primary material',
    'preserve primary colors',
    'preserve visible functional geometry',
    'preserve visible openings / controls / attachments',
    'preserve reference branding placement when visible',
    'same physical product identity across entire video',
    'same physical product identity across entire video',
    'preserve visible functional geometry',
    'preserve visible openings / controls / attachments',
    'preserve reference branding placement when visible',
    'same physical product identity across entire video',
  ],
  surface_rules: [
    'do not invent structural details on unseen surfaces',
    'do not add holes, cavities, handles, buttons, ports or attachments not supported by reference',
  ],
  forbidden_mutations: [
    'no geometry drift between shots',
    'same physical product identity across entire video',
  ],
  safe_camera_rules: [
    'prefer stable viewing angles',
    'avoid unverified rotations that expose invented geometry',
  ],
  allowed_actions: [
    'authentic observational presentation',
    'natural handling without warping geometry',
  ],
})

/**
 * Universal Structural & Masonry Fidelity Contract
 * Applies to ALL clay bricks, building blocks, terracotta tiles, and masonry materials across all vendors.
 * Completely eliminates the "oversized vertical honeycomb hole face facing camera" artifact by enforcing
 * authentic horizontal orientation, solid textured exterior face toward the lens, and real mortar beds.
 */
export const UNIVERSAL_STRUCTURAL_MASONRY_CONTRACT: ResolvedProductFidelityContract = Object.freeze({
  must_preserve: [
    'preserve overall silhouette',
    'preserve visible proportions',
    'preserve primary material',
    'preserve primary colors',
    'rectangular clay brick silhouette and standard construction dimensions',
    'terracotta red-orange color',
    'authentic terracotta red-orange fired clay color and matte earthy texture',
    'solid ribbed terracotta finish on the primary exterior camera-facing surface',
    'standard horizontal orientation in natural building application',
  ],
  surface_rules: [
    'AUTHENTIC MASONRY ORIENTATION: The brick lies flat horizontally in natural building bond with clean mortar joints, or rests banded on wooden jobsite pallets.',
    'CAMERA-FACING FINISH FACE: The surface facing the camera is the solid, grooved terracotta exterior finish face.',
    'NO RAW HONEYCOMB GRILLE: Internal perforation chambers must never be presented as an oversized open honeycomb grille staring directly into the camera lens.',
    'REALISTIC MASONRY PHYSICS: Bricks strictly obey terrestrial gravity. Bricks never float in mid-air. When placed onto a wall, a worker in safety gear sets it directly onto a bed of fresh wet cement mortar.',
    'side faces contain no holes or cavities',
    'openings exist only on the top face',
    'side faces remain solid vertical ribbed clay surfaces',
  ],
  forbidden_mutations: [
    'brick standing vertically with giant hollow holes facing camera',
    'honeycomb grille appearance',
    'perforations on multiple perpendicular faces',
    'warped corners or melting edges',
    'floating bricks in mid-air without mortar or support',
    'plastic or toy block appearance',
    'side holes',
    'side perforations',
    'extra cavities',
    'no geometry drift between shots',
  ],
  safe_camera_rules: [
    'three-quarter perspective emphasizing the solid textured brick face and authentic construction context',
    'stable camera motion tracking the masonry craftsmanship without jarring rotations',
  ],
  allowed_actions: [
    'mason wearing work gloves picking up brick from pallet and laying it horizontally onto fresh wet cement mortar',
    'worker picks up brick from pallet and sets it onto fresh mortar',
    'professional wall placement of the brick onto fresh mortar',
    'clean commercial showcase on active construction site with authentic background fleet and logistics',
    'diegetic brand identity: corporate brand mark placed cleanly on worker safety vest, pallet label, or delivery vehicle door',
  ],
})

// Backward compatibility alias
export const AYVAZOGLU_TUGLA_FIDELITY_CONTRACT = UNIVERSAL_STRUCTURAL_MASONRY_CONTRACT

/**
 * Universal Appliance, Tool & Equipment Fidelity Contract
 * Applies to agricultural sprayers, power tools, appliances, and industrial devices across all vendors.
 * Ensures the product is shown in active, authentic functional use (e.g. fine mist spraying over green leaves)
 * rather than sitting passively on a warehouse table.
 */
export const UNIVERSAL_EQUIPMENT_FIDELITY_CONTRACT: ResolvedProductFidelityContract = Object.freeze({
  must_preserve: [
    'preserve overall silhouette',
    'preserve visible proportions',
    'preserve primary material',
    'preserve primary colors',
    'preserve visible functional geometry',
    'preserve visible openings / controls / attachments',
    'preserve reference branding placement when visible',
    'same physical product identity across entire video',
    'exact product casing geometry, handles, caps, nozzles, and spray lance attachments',
    'primary corporate color finish and authentic matte/gloss molded plastic/metal textures',
    'official brand logo on the manufacturer plate/casing exactly as depicted in reference photos',
    'realistic weight and balance in ergonomic usage',
  ],
  surface_rules: [
    'do not invent structural details on unseen surfaces',
    'ACTIVE REAL-WORLD APPLICATION: The tool or device is shown in its authentic operating environment (e.g. sunny orchard, lush garden, workshop), actively functioning.',
    'OUTDOOR NATURE IMMERSION: For agricultural and gardening products, the equipment is positioned outdoors among healthy vibrant green crops or trees, with zero indoor warehouse elements.',
    'AUTHENTIC FOLEY & EFFECTS: Transparent fine atomized water spray mist from the lance tip onto lush leaves.',
  ],
  forbidden_mutations: [
    'no geometry drift between shots',
    'indoor warehouse background for outdoor gardening/agricultural products',
    'resting idly on concrete depot floor or industrial metal storage shelves',
    'altered tank proportions, missing lance, or distorted nozzles',
    'blurred or synthetic manufacturer logo plate',
  ],
  safe_camera_rules: [
    'fluid 35mm cinematic glide from the vibrant green environment to the active product in focus',
    'crisp focus on the authentic corporate badge on the product body',
  ],
  allowed_actions: [
    'operator in ergonomic garden gloves holding the spray lance, spraying fine refreshing mist onto thriving leaves',
    'product resting proudly on vibrant green lawn/soil in natural sunlight next to blossoming plants',
  ],
})

export function isStructuralMasonryProduct(product?: Partial<ProductItem> | null): boolean {
  if (!product) return false
  const text = [
    product.name || '',
    product.description || '',
    product.file_path || '',
  ].join(' ').toLowerCase()

  return (
    text.includes('tuğla') ||
    text.includes('tugla') ||
    text.includes('brick') ||
    text.includes('briket') ||
    text.includes('kiremit') ||
    text.includes('gazbeton') ||
    text.includes('masonry')
  )
}

export function isEquipmentOrToolProduct(product?: Partial<ProductItem> | null): boolean {
  if (!product) return false
  const text = [
    product.name || '',
    product.description || '',
    product.file_path || '',
  ].join(' ').toLowerCase()

  return (
    text.includes('pompa') ||
    text.includes('ilaçlama') ||
    text.includes('pülverizatör') ||
    text.includes('sprayer') ||
    text.includes('makine') ||
    text.includes('cihaz') ||
    text.includes('matkap') ||
    text.includes('ekipman')
  )
}

// Backward compatibility alias
export const isAyvazogluBrick = isStructuralMasonryProduct

function deduplicateList(items: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of items) {
    const trimmed = item.trim()
    const lower = trimmed.toLowerCase()
    if (trimmed && !seen.has(lower)) {
      seen.add(lower)
      result.push(trimmed)
    }
  }
  return result
}

export interface ResolveContractOptions {
  product?: Partial<ProductItem> | null
  explicitContract?: ProductFidelityContract | null
  creativeDirection?: string
}

export interface ResolvedContractReport {
  contract: ResolvedProductFidelityContract
  isCustom: boolean
  isAyvazoglu: boolean
  ruleCount: number
  sanitizedCreativeDirection?: string
}

export function resolveProductFidelityContract(options: ResolveContractOptions): ResolvedContractReport {
  const { product, explicitContract } = options
  const contractFromProduct = product?.product_fidelity_contract || explicitContract
  const isMasonry = isStructuralMasonryProduct(product)
  const isEquipment = isEquipmentOrToolProduct(product)

  let baseContract: ResolvedProductFidelityContract = UNIVERSAL_FIDELITY_CONTRACT
  if (isMasonry) {
    baseContract = UNIVERSAL_STRUCTURAL_MASONRY_CONTRACT
  } else if (isEquipment) {
    baseContract = UNIVERSAL_EQUIPMENT_FIDELITY_CONTRACT
  }

  let isCustom = false

  if (contractFromProduct) {
    isCustom = true
    baseContract = {
      must_preserve: deduplicateList([
        ...(contractFromProduct.must_preserve || []),
        ...baseContract.must_preserve,
      ]),
      surface_rules: deduplicateList([
        ...(contractFromProduct.surface_rules || []),
        ...baseContract.surface_rules,
      ]),
      forbidden_mutations: deduplicateList([
        ...(contractFromProduct.forbidden_mutations || []),
        ...baseContract.forbidden_mutations,
      ]),
      safe_camera_rules: deduplicateList([
        ...(contractFromProduct.safe_camera_rules || []),
        ...baseContract.safe_camera_rules,
      ]),
      allowed_actions: deduplicateList([
        ...(contractFromProduct.allowed_actions || []),
        ...baseContract.allowed_actions,
      ]),
    }
  }

  const ruleCount =
    baseContract.must_preserve.length +
    baseContract.surface_rules.length +
    baseContract.forbidden_mutations.length +
    baseContract.safe_camera_rules.length +
    baseContract.allowed_actions.length

  return {
    contract: baseContract,
    isCustom: isCustom || isMasonry || isEquipment,
    isAyvazoglu: isMasonry,
    ruleCount,
  }
}

export function formatFidelityLockSection(contract: ResolvedProductFidelityContract): string {
  const lines: string[] = ['[PRODUCT FIDELITY LOCK] [NON-NEGOTIABLE CANONICAL REFERENCE RULES]:']

  if (contract.must_preserve.length > 0) {
    lines.push(`- MUST PRESERVE: ${contract.must_preserve.join('; ')}.`)
  }
  if (contract.surface_rules.length > 0) {
    lines.push(`- SURFACE & GEOMETRY RULES: ${contract.surface_rules.join('; ')}.`)
  }
  if (contract.forbidden_mutations.length > 0) {
    lines.push(`- STRICTLY FORBIDDEN: ${contract.forbidden_mutations.join('; ')}.`)
  }
  if (contract.safe_camera_rules.length > 0) {
    lines.push(`- CAMERA PERSPECTIVE: ${contract.safe_camera_rules.join('; ')}.`)
  }
  if (contract.allowed_actions.length > 0) {
    lines.push(`- AUTHENTIC ACTION: ${contract.allowed_actions.join('; ')}.`)
  }

  return lines.join('\n')
}

/** Backward-compatible sanitization helper used by the older creative planners. */
export function sanitizeCreativeDirectionAgainstFidelity(
  creativeText: string,
  contract: ResolvedProductFidelityContract,
): string {
  let sanitized = creativeText
  for (const forbidden of contract.forbidden_mutations) {
    const escaped = forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\b(add|create|show|render|include|make)\\s+${escaped}\\b`, 'gi')
    sanitized = sanitized.replace(regex, '')
  }
  return sanitized.replace(/\s{2,}/g, ' ').trim()
}
