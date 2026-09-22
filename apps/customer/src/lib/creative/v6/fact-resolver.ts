/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * FACT RESOLVER (V6)
 * 
 * Kesin İlke:
 * Fact Resolver hikâye yazmaz, sıfat uydurmaz.
 * Sadece somut, doğrulanmış gerçekleri ve sektör sınırlarını normalize eder.
 */

import type { ResolvedCreativeFacts } from './creative-types'
import { resolveCreativeEnvironmentProfile } from '../v5/sector-profiles'

export interface RawCreativeInput {
  orgId?: string | null
  brandId?: string | null
  brandName?: string | null
  brief: string
  productName?: string | null
  productDescription?: string | null
  productImageUrl?: string | null
  referenceAssetIds?: string[]
  logoUrl?: string | null
  targetAudience?: string | null
  offer?: string | null
  cta?: string | null
  durationSeconds?: number
  aspectRatio?: string
  language?: string
  sectorHint?: string | null
  brandKit?: {
    name?: string | null
    colors?: { primary?: string; accent?: string; secondary?: string }
    tone?: string | string[]
    logoUrl?: string | null
  }
  customVoiceover?: string | null
  manifest?: Record<string, any> | null
}

export function resolveFacts(input: RawCreativeInput): ResolvedCreativeFacts {
  const orgId = input.orgId || 'org_default'
  const brandName = (input.brandName || input.brandKit?.name || 'Kurumsal İşletme').trim()
  const brandId = input.brandId || brandName.toLowerCase().replace(/[^a-z0-9_]/g, '_')

  const offerName = (input.productName || input.offer || 'Odak Ürün veya Hizmet').trim()
  const rawBrief = (input.brief || '').trim()

  // 1. Sector Profile Resolution (Boundary of reality)
  const profile = resolveCreativeEnvironmentProfile({
    sectorHint: input.sectorHint,
    offerName,
    rawBrief,
  })

  // 2. Extract strictly factual attributes from brief (numbers, sizes, materials without exaggeration)
  const physicalAttributes: string[] = []
  const numberMatches = rawBrief.match(/\b\d+(\s*([a-zA-ZçğıöşüÇĞİÖŞÜ]+|mm|cm|m|kg|gr|lt|bar|watt|volt))\b/gi)
  if (numberMatches) {
    physicalAttributes.push(...Array.from(new Set(numberMatches.map(m => m.trim()))))
  }

  // 3. Brand Facts
  const manifest = input.manifest || {}
  const rawTone = input.brandKit?.tone || manifest.tone || ['professional', 'reliable']
  const toneArray = Array.isArray(rawTone) ? rawTone : [String(rawTone)]

  const palette: string[] = []
  if (input.brandKit?.colors) {
    if (input.brandKit.colors.primary) palette.push(input.brandKit.colors.primary)
    if (input.brandKit.colors.accent) palette.push(input.brandKit.colors.accent)
    if (input.brandKit.colors.secondary) palette.push(input.brandKit.colors.secondary)
  }

  // 4. Clean Duration and Aspect Ratio
  const durationSeconds = Math.max(5, Math.min(60, Number(input.durationSeconds) || 8))
  const aspectRatio = input.aspectRatio || '9:16'
  const language = input.language || 'tr'

  return {
    orgId,
    brandId,
    brandName,
    product: {
      name: offerName,
      factualDescription: input.productDescription || rawBrief,
      physicalAttributes,
      referenceAssetIds: input.referenceAssetIds || [],
      productImageUrl: input.productImageUrl || null,
    },
    campaign: {
      objective: input.offer ? 'direct_offer' : 'product_demonstration',
      targetAudience: input.targetAudience || undefined,
      offer: input.offer || undefined,
      cta: input.cta || undefined,
      durationSeconds,
      aspectRatio,
      language,
      customVoiceover: input.customVoiceover || null,
    },
    brandFacts: {
      tone: toneArray,
      personality: manifest.personality || ['güvenilir', 'profesyonel', 'doğrudan'],
      palette: palette.length > 0 ? palette : undefined,
      logoAssetIds: input.logoUrl ? ['logo_ref_primary'] : [],
      logoUrl: input.logoUrl || input.brandKit?.logoUrl || null,
      requiredTerms: manifest.required_terms || [],
      forbiddenClaims: manifest.forbidden_claims || [
        'en iyi', 'bir numara', 'dünya lideri', 'rakipsiz', '%100 garantili', 'mucizevi'
      ],
    },
    sectorFacts: {
      sectorProfileId: profile.sectorId,
      physicalWorld: profile.preferredEnvironments || ['Modern, authentic commercial workspace'],
      authenticActions: profile.preferredUsageContext || [
        'Professional operator engages with precision in authentic environment.'
      ],
      materials: [],
      credibleProofTypes: [profile.defaultProofMode || 'product_in_use'],
      safetyConstraints: [
        'No hazardous, uncertified or reckless handling of equipment.',
        'Proper protective equipment and authentic workplace safety.',
      ],
      forbiddenVisuals: profile.forbiddenEnvironments || ['warehouse', 'generic office'],
      defaultAudioWorld: [
        profile.musicDirective || 'natural acoustic rhythm and authentic ambient foley'
      ],
    },
  }
}
