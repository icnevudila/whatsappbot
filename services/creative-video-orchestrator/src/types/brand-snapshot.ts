import { createHash } from 'node:crypto'

export interface BrandPalette {
  primary: string
  secondary?: string
  accent?: string
  background?: string
}

export interface Typography {
  headingFont?: string
  bodyFont?: string
  primaryColor?: string
  accentColor?: string
}

export interface ProductItem {
  product_id: string
  name: string
  description: string
  asset_id: string
  sha256: string
  file_path?: string
}

export type ReferenceRole =
  | 'logo'
  | 'product'
  | 'presenter'
  | 'environment'
  | 'packaging'
  | 'style'
  | 'reference'

export interface ReferenceAsset {
  asset_id: string
  role: ReferenceRole
  sha256: string
  file_path?: string
  url?: string
}

export interface CampaignFacts {
  objective: string
  headline?: string
  offer?: string
  price?: string
  cta: string
  phoneNumber?: string
  website?: string
  target_audience?: string
  approved_spoken_line?: string
  user_style_preference?: string
  environment_preset?: string
  motion_style?: string
  subtitles?: 'auto' | 'off'
}

export type AspectRatio = '9:16' | '16:9' | '1:1' | '4:3' | '3:4'
export type OutputType = 'SHORT_VIDEO' | 'LONG_VIDEO' | 'AUTO'

export interface RawBrandInput {
  org_id: string
  brand_name: string
  sector_profile: string
  brand_description?: string
  brand_palette?: BrandPalette
  typography?: Typography
  tone_of_voice?: string[]
  visual_style?: string[]
  logo_asset_id: string
  logo_sha256: string
  logo_file_path?: string
  products?: ProductItem[]
  reference_assets?: ReferenceAsset[]
  campaign: CampaignFacts
  mandatory_elements?: string[]
  forbidden_elements?: string[]
  unverified_facts?: string[]
  verified_claims?: string[]
  language?: string
  aspect_ratio?: AspectRatio
  requested_duration?: number
  output_type?: OutputType
}

export interface BrandContextSnapshot {
  readonly org_id: string
  readonly brand_manifest_version: string
  readonly brand_name: string
  readonly sector_profile: string
  readonly brand_description: string
  readonly brand_palette: Readonly<BrandPalette>
  readonly typography: Readonly<Typography>
  readonly tone_of_voice: readonly string[]
  readonly visual_style: readonly string[]
  readonly logo_asset_id: string
  readonly logo_sha256: string
  readonly logo_file_path?: string
  readonly products: readonly Readonly<ProductItem>[]
  readonly reference_assets: readonly Readonly<ReferenceAsset>[]
  readonly campaign: Readonly<CampaignFacts>
  readonly mandatory_elements: readonly string[]
  readonly forbidden_elements: readonly string[]
  readonly unverified_facts?: readonly string[]
  readonly verified_claims?: readonly string[]
  readonly language: string
  readonly aspect_ratio: AspectRatio
  readonly requested_duration: number
  readonly output_type: OutputType
  readonly created_at: string
}

function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  Object.freeze(obj)
  for (const key of Object.keys(obj)) {
    const val = (obj as any)[key]
    if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val)
    }
  }
  return obj as Readonly<T>
}

/**
 * Creates an immutable BrandContextSnapshot for a video job.
 * Computes a cryptographic SHA-256 version of the manifest to guarantee provenance.
 * Once created, this snapshot cannot be mutated.
 */
export function createBrandContextSnapshot(input: RawBrandInput): Readonly<BrandContextSnapshot> {
  if (!input.org_id || !input.org_id.trim()) {
    throw new Error('BRAND_SNAPSHOT_INVALID: org_id is required.')
  }
  if (!input.brand_name || !input.brand_name.trim()) {
    throw new Error('BRAND_SNAPSHOT_INVALID: brand_name is required.')
  }
  if (!input.sector_profile || !input.sector_profile.trim()) {
    throw new Error('BRAND_SNAPSHOT_INVALID: sector_profile is required.')
  }
  if (!input.logo_asset_id || !input.logo_sha256) {
    throw new Error('BRAND_SNAPSHOT_INVALID: logo_asset_id and logo_sha256 are required.')
  }
  if (!input.campaign || !input.campaign.cta) {
    throw new Error('BRAND_SNAPSHOT_INVALID: campaign.cta is mandatory for commercial conversion.')
  }

  const normalized = {
    org_id: input.org_id.trim(),
    brand_name: input.brand_name.trim(),
    sector_profile: input.sector_profile.trim().toLowerCase(),
    brand_description: (input.brand_description || '').trim(),
    brand_palette: input.brand_palette || { primary: '#000000' },
    typography: input.typography || {},
    tone_of_voice: input.tone_of_voice ? [...input.tone_of_voice] : ['professional', 'credible'],
    visual_style: input.visual_style ? [...input.visual_style] : ['clean commercial cinematography'],
    logo_asset_id: input.logo_asset_id.trim(),
    logo_sha256: input.logo_sha256.trim().toLowerCase(),
    logo_file_path: input.logo_file_path,
    products: (input.products || []).map(p => ({
      product_id: p.product_id.trim(),
      name: p.name.trim(),
      description: p.description.trim(),
      asset_id: p.asset_id.trim(),
      sha256: p.sha256.trim().toLowerCase(),
      file_path: p.file_path,
    })),
    reference_assets: (input.reference_assets || []).map(r => ({
      asset_id: r.asset_id.trim(),
      role: r.role,
      sha256: r.sha256.trim().toLowerCase(),
      file_path: r.file_path,
      url: r.url,
    })),
    campaign: {
      objective: (input.campaign.objective || 'Brand Awareness').trim(),
      headline: input.campaign.headline?.trim(),
      offer: input.campaign.offer?.trim(),
      price: input.campaign.price?.trim(),
      cta: (input.campaign.cta || 'Learn More').trim(),
      phoneNumber: input.campaign.phoneNumber?.trim(),
      website: input.campaign.website?.trim(),
      target_audience: input.campaign.target_audience?.trim(),
      approved_spoken_line: input.campaign.approved_spoken_line?.trim(),
    },
    mandatory_elements: input.mandatory_elements ? [...input.mandatory_elements] : [],
    forbidden_elements: input.forbidden_elements ? [...input.forbidden_elements] : [],
    unverified_facts: input.unverified_facts ? [...input.unverified_facts] : [],
    verified_claims: input.verified_claims ? [...input.verified_claims] : [],
    language: input.language || 'tr',
    aspect_ratio: input.aspect_ratio || '9:16',
    requested_duration: input.requested_duration || 8,
    output_type: input.output_type || 'AUTO',
    created_at: new Date().toISOString(),
  }

  // Cryptographic manifest hash for provenance
  const manifestData = JSON.stringify({
    org_id: normalized.org_id,
    brand_name: normalized.brand_name,
    sector_profile: normalized.sector_profile,
    logo_sha256: normalized.logo_sha256,
    product_hashes: normalized.products.map(p => p.sha256).sort(),
    ref_hashes: normalized.reference_assets.map(r => r.sha256).sort(),
    campaign: normalized.campaign,
  })
  const brand_manifest_version = `bmv_${createHash('sha256').update(manifestData).digest('hex').substring(0, 16)}`

  const snapshot: BrandContextSnapshot = {
    ...normalized,
    brand_manifest_version,
  }

  return deepFreeze(snapshot)
}
