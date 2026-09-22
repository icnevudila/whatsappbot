import { createHash } from 'node:crypto'

export interface AuthoritativeAssetItem {
  handle: string
  assetId: string
  filePath: string
  sha256: string
  mimeType: string
}

export interface AuthoritativeAssets {
  brandLogo: AuthoritativeAssetItem
  heroProduct?: AuthoritativeAssetItem
  productDetails?: AuthoritativeAssetItem[]
  softwareUi?: AuthoritativeAssetItem[]
  extraReferences?: AuthoritativeAssetItem[]
}

export interface AuthoritativeFacts {
  brand_name: string
  product_name: string
  description?: string
  campaign_message?: string
  offer?: string
  price?: string
  cta?: string
  phone?: string
  url?: string
  approved_spoken_line?: string
}

import type { UserStylePreference } from '../strategy/ad-format-router.js'

export type SubtitleMode = 'auto' | 'off'

export interface CreativeJobRequest {
  duration_sec: 8
  aspect_ratio: '9:16' | '16:9'
  language: 'tr-TR' | string
  objective?: string
  user_style_preference?: UserStylePreference
  subtitles?: SubtitleMode // 'auto' (default) | 'off'
  notes?: string
}

export interface JobAssetManifest {
  job_id: string
  org_id: string
  authoritative_assets: AuthoritativeAssets
  authoritative_facts: AuthoritativeFacts
  creative_request: CreativeJobRequest
  manifest_sha256: string
}

export type ManifestValidationResult =
  | { status: 'READY'; manifest: JobAssetManifest }
  | { status: 'NEEDS_ASSET'; missingAssets: string[]; reason: string }
  | { status: 'NEEDS_FACT'; missingFacts: string[]; reason: string }

/**
 * Creates an immutable JobAssetManifest from Mesajify job inputs.
 * Strictly enforces: USE PROVIDED ASSETS OR FAIL CLOSED.
 * No synthesis of missing logos, no guessing of product imagery, no fake facts.
 */
export function createJobAssetManifest(input: {
  job_id: string
  org_id: string
  authoritative_assets: {
    brandLogo?: AuthoritativeAssetItem
    heroProduct?: AuthoritativeAssetItem
    productDetails?: AuthoritativeAssetItem[]
    softwareUi?: AuthoritativeAssetItem[]
    extraReferences?: AuthoritativeAssetItem[]
  }
  authoritative_facts: AuthoritativeFacts
  creative_request?: Partial<CreativeJobRequest>
  business_model?: 'physical_product' | 'saas_software' | 'service_business'
}): ManifestValidationResult {
  const missingAssets: string[] = []
  const missingFacts: string[] = []

  if (!input.authoritative_assets.brandLogo) {
    missingAssets.push('@BrandLogo')
  }

  const model = input.business_model || 'physical_product'
  if (model === 'physical_product' && !input.authoritative_assets.heroProduct) {
    missingAssets.push('@HeroProduct')
  }
  if (model === 'saas_software' && (!input.authoritative_assets.softwareUi || input.authoritative_assets.softwareUi.length === 0)) {
    missingAssets.push('@SoftwareUI')
  }

  if (!input.authoritative_facts.brand_name || !input.authoritative_facts.brand_name.trim()) {
    missingFacts.push('brand_name')
  }
  if (!input.authoritative_facts.product_name || !input.authoritative_facts.product_name.trim()) {
    missingFacts.push('product_name')
  }

  if (missingAssets.length > 0) {
    return {
      status: 'NEEDS_ASSET',
      missingAssets,
      reason: `Mandatory authoritative user asset missing: ${missingAssets.join(', ')}. System will NOT invent or substitute assets.`,
    }
  }

  if (missingFacts.length > 0) {
    return {
      status: 'NEEDS_FACT',
      missingFacts,
      reason: `Mandatory authoritative brand fact missing: ${missingFacts.join(', ')}. System will NOT invent fake facts.`,
    }
  }

  const creative_request: CreativeJobRequest = {
    duration_sec: 8,
    aspect_ratio: input.creative_request?.aspect_ratio || '9:16',
    language: input.creative_request?.language || 'tr-TR',
    objective: input.creative_request?.objective,
    user_style_preference: input.creative_request?.user_style_preference,
    subtitles: input.creative_request?.subtitles,
    notes: input.creative_request?.notes,
  }

  const serialized = JSON.stringify({
    job_id: input.job_id,
    org_id: input.org_id,
    authoritative_assets: input.authoritative_assets,
    authoritative_facts: input.authoritative_facts,
    creative_request,
  })

  const manifest_sha256 = createHash('sha256').update(serialized).digest('hex')

  const manifest: JobAssetManifest = {
    job_id: input.job_id,
    org_id: input.org_id,
    authoritative_assets: input.authoritative_assets as AuthoritativeAssets,
    authoritative_facts: input.authoritative_facts,
    creative_request,
    manifest_sha256,
  }

  return {
    status: 'READY',
    manifest: Object.freeze(manifest),
  }
}
