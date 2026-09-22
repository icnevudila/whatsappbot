import type { BrandContextSnapshot } from '../types/brand-snapshot.js'

export interface LogoOverlaySpec {
  logoFilePath: string
  logoSha256: string
  position: 'top_right' | 'top_left' | 'bottom_right' | 'bottom_left' | 'center'
  scalePercent: number // e.g. 15 for 15% of width
  opacity: number // 0.0 to 1.0
  startSec: number
  durationSec?: number // undefined means until video end
}

export interface TextOverlaySpec {
  text: string
  fontFamily: string
  fontSize: number
  fontColor: string
  backgroundColor?: string
  position: 'lower_third' | 'center' | 'header' | 'end_card'
  startSec: number
  endSec: number
}

export interface EndCardSpec {
  brandName: string
  logoFilePath: string
  logoSha256: string
  headline?: string
  offer?: string
  price?: string
  ctaText: string
  websiteOrPhone?: string
  durationSec: number // e.g. 2.5s
  backgroundColor: string
}

export interface AudioMixSpec {
  masterVoiceOverPath?: string
  masterVoiceOverVolume: number // e.g. 1.0
  musicPath?: string
  musicVolume: number // e.g. 0.25 (ducked under VO)
  ambienceVolume: number // e.g. 0.15
}

export interface DeterministicFinishingPlan {
  planId: string
  org_id: string
  brand_manifest_version: string
  videoDurationTargetSec: number
  logoOverlay: LogoOverlaySpec
  productTextOverlay?: TextOverlaySpec
  offerPriceOverlay?: TextOverlaySpec
  ctaOverlay: TextOverlaySpec
  endCard: EndCardSpec
  subtitles?: Array<{ startSec: number; endSec: number; text: string }>
  audioMix: AudioMixSpec
  verified: boolean
}

/**
 * Creates an authoritative DeterministicFinishingPlan grounded strictly in the BrandContextSnapshot.
 * Never delegates critical brand elements, official logos, pricing, or CTA text to generative hallucination.
 */
export function buildDeterministicFinishingPlan(
  snapshot: BrandContextSnapshot,
  options?: { masterVoiceOverPath?: string; subtitles?: Array<{ startSec: number; endSec: number; text: string }> }
): DeterministicFinishingPlan {
  const duration = snapshot.requested_duration
  const endCardDuration = 2.5
  const endCardStartSec = Math.max(0, duration - endCardDuration)

  const logoOverlay: LogoOverlaySpec = {
    logoFilePath: snapshot.logo_file_path || `assets/logos/${snapshot.logo_asset_id}.png`,
    logoSha256: snapshot.logo_sha256,
    position: 'top_right',
    scalePercent: 14,
    opacity: 0.95,
    startSec: 0,
    durationSec: duration,
  }

  const primaryProduct = snapshot.products.length > 0 ? snapshot.products[0] : undefined

  let productTextOverlay: TextOverlaySpec | undefined
  if (primaryProduct) {
    productTextOverlay = {
      text: primaryProduct.name,
      fontFamily: snapshot.typography.headingFont || 'sans-serif',
      fontSize: 32,
      fontColor: snapshot.typography.primaryColor || '#FFFFFF',
      position: 'header',
      startSec: 1.0,
      endSec: Math.min(4.5, endCardStartSec),
    }
  }

  let offerPriceOverlay: TextOverlaySpec | undefined
  if (snapshot.campaign.price || snapshot.campaign.offer) {
    const text = [snapshot.campaign.offer, snapshot.campaign.price].filter(Boolean).join(' • ')
    offerPriceOverlay = {
      text,
      fontFamily: snapshot.typography.bodyFont || 'sans-serif',
      fontSize: 28,
      fontColor: snapshot.typography.accentColor || '#FFD700',
      position: 'lower_third',
      startSec: 2.0,
      endSec: Math.min(6.5, endCardStartSec),
    }
  }

  const ctaOverlay: TextOverlaySpec = {
    text: snapshot.campaign.cta,
    fontFamily: snapshot.typography.headingFont || 'sans-serif',
    fontSize: 36,
    fontColor: '#FFFFFF',
    backgroundColor: snapshot.brand_palette.primary,
    position: 'lower_third',
    startSec: endCardStartSec,
    endSec: duration,
  }

  const endCard: EndCardSpec = {
    brandName: snapshot.brand_name,
    logoFilePath: logoOverlay.logoFilePath,
    logoSha256: snapshot.logo_sha256,
    headline: snapshot.brand_name,
    offer: snapshot.campaign.offer,
    price: snapshot.campaign.price,
    ctaText: snapshot.campaign.cta,
    durationSec: endCardDuration,
    backgroundColor: snapshot.brand_palette.primary,
  }

  const audioMix: AudioMixSpec = {
    masterVoiceOverPath: options?.masterVoiceOverPath,
    masterVoiceOverVolume: 1.0,
    musicVolume: 0.2,
    ambienceVolume: 0.15,
  }

  return {
    planId: `fin_${Date.now()}`,
    org_id: snapshot.org_id,
    brand_manifest_version: snapshot.brand_manifest_version,
    videoDurationTargetSec: duration,
    logoOverlay,
    productTextOverlay,
    offerPriceOverlay,
    ctaOverlay,
    endCard,
    subtitles: options?.subtitles,
    audioMix,
    verified: true,
  }
}
