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

export const AYVAZOGLU_TUGLA_FIDELITY_CONTRACT: ResolvedProductFidelityContract = Object.freeze({
  must_preserve: [
    'rectangular clay brick silhouette',
    'terracotta red-orange color',
    'single-axis perforation only (hollow grid holes exist strictly through one single axis/top face)',
    'vertical ribbed solid side texture',
  ],
  surface_rules: [
    'openings exist only on the top face',
    'side faces remain solid vertical ribbed clay surfaces',
    'side faces contain no holes or cavities',
    'openings and grid holes exist strictly on one single face along one single axis',
    'perpendicular side faces must be solid ribbed clay surfaces without any holes or perforations',
    'never generate holes on two perpendicular faces simultaneously',
    'side faces contain no holes, no perforations, and no cavities',
  ],
  forbidden_mutations: [
    'perforations on multiple faces',
    'side holes',
    'side perforations',
    'front holes while top also has holes',
    'extra cavities',
    'invented openings',
    'geometry drift',
    'changed proportions',
    'warped corners',
    'different brick type',
  ],
  safe_camera_rules: [
    'prefer stable three-quarter views',
    'avoid unnecessary extreme rotation',
  ],
  allowed_actions: [
    'worker picks up brick',
    'professional wall placement',
    'hero product display on clean pedestal or architectural setting',
    'smooth continuous studio or logistics reveal',
    'professional craftsmanship or placement when demonstrating usage',
  ],
})

export function isAyvazogluBrick(product?: Partial<ProductItem> | null): boolean {
  if (!product) return false
  const name = String(product.name || '').toLowerCase()
  const desc = String(product.description || '').toLowerCase()
  const path = String(product.file_path || '').toLowerCase()
  return (
    name.includes('ayvazoğlu') ||
    name.includes('ayvazoglu') ||
    path.includes('ayvazo') ||
    path.includes('canonical_brick') ||
    (name.includes('tuğla') && (desc.includes('ayvazoğlu') || desc.includes('kapıya teslim')))
  )
}

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
  const ayvazoglu = isAyvazogluBrick(product)

  let baseContract: ResolvedProductFidelityContract = ayvazoglu
    ? AYVAZOGLU_TUGLA_FIDELITY_CONTRACT
    : UNIVERSAL_FIDELITY_CONTRACT

  let isCustom = false

  if (contractFromProduct) {
    isCustom = true
    baseContract = {
      must_preserve: deduplicateList([
        ...(contractFromProduct.must_preserve || []),
        ...(ayvazoglu ? AYVAZOGLU_TUGLA_FIDELITY_CONTRACT.must_preserve : UNIVERSAL_FIDELITY_CONTRACT.must_preserve),
      ]),
      surface_rules: deduplicateList([
        ...(contractFromProduct.surface_rules || []),
        ...(ayvazoglu ? AYVAZOGLU_TUGLA_FIDELITY_CONTRACT.surface_rules : UNIVERSAL_FIDELITY_CONTRACT.surface_rules),
      ]),
      forbidden_mutations: deduplicateList([
        ...(contractFromProduct.forbidden_mutations || []),
        ...(ayvazoglu ? AYVAZOGLU_TUGLA_FIDELITY_CONTRACT.forbidden_mutations : UNIVERSAL_FIDELITY_CONTRACT.forbidden_mutations),
      ]),
      safe_camera_rules: deduplicateList([
        ...(contractFromProduct.safe_camera_rules || []),
        ...(ayvazoglu ? AYVAZOGLU_TUGLA_FIDELITY_CONTRACT.safe_camera_rules : UNIVERSAL_FIDELITY_CONTRACT.safe_camera_rules),
      ]),
      allowed_actions: deduplicateList([
        ...(contractFromProduct.allowed_actions || []),
        ...(ayvazoglu ? AYVAZOGLU_TUGLA_FIDELITY_CONTRACT.allowed_actions : UNIVERSAL_FIDELITY_CONTRACT.allowed_actions),
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
    isCustom: isCustom || ayvazoglu,
    isAyvazoglu: ayvazoglu,
    ruleCount,
  }
}

export function formatFidelityLockSection(contract: ResolvedProductFidelityContract): string {
  const formatList = (items: string[]) => items.map(item => `- ${item}`).join('\n')

  return `[PRODUCT FIDELITY LOCK]
The canonical reference asset is the single source of truth for product geometry.

Preserve:
${formatList(contract.must_preserve)}

Surface rules:
${formatList(contract.surface_rules)}

Forbidden mutations:
${formatList(contract.forbidden_mutations)}

Camera safety:
${formatList(contract.safe_camera_rules)}

Allowed product actions:
${formatList(contract.allowed_actions)}

Unknown/unseen product surfaces must NOT receive invented functional geometry.
The same physical product identity must remain stable across every shot.
Product fidelity has priority over cinematic creativity.`
}

/**
 * Ensures creative prompt instructions cannot override product fidelity rules.
 * If creative direction contains instructions that conflict with forbidden mutations
 * (e.g. creating holes on sides or transforming product), fidelity wins.
 */
export function sanitizeCreativeDirectionAgainstFidelity(
  creativeText: string,
  contract: ResolvedProductFidelityContract
): string {
  let sanitized = creativeText
  for (const forbidden of contract.forbidden_mutations) {
    const regex = new RegExp(`\\b(add|create|show|render|include|make)\\s+(${forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi')
    sanitized = sanitized.replace(regex, '')
  }
  return sanitized
}
