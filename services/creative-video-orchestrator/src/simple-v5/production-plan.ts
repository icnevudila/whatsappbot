import type { BrandContextSnapshot, ReferenceRole } from '../types/brand-snapshot.js'
import type { SimpleV5Brief, SimpleV5ShotPlan, SimpleV5ProductionPlan } from './types.js'

/**
 * The single source of truth shared by prompt compilation, post-production and QA.
 * This is deliberately video-only; image generation has its own contracts.
 */
export function buildSimpleV5ProductionPlan(
  snapshot: BrandContextSnapshot,
  brief: SimpleV5Brief,
  shotPlan: SimpleV5ShotPlan,
): SimpleV5ProductionPlan {
  const references = [
    {
      asset_id: snapshot.logo_asset_id,
      role: 'logo' as ReferenceRole,
      sha256: snapshot.logo_sha256,
    },
    ...snapshot.products.slice(0, 1).map(product => ({
      asset_id: product.asset_id,
      role: 'product' as ReferenceRole,
      sha256: product.sha256,
    })),
    ...snapshot.reference_assets.map(asset => ({
      asset_id: asset.asset_id,
      role: asset.role,
      sha256: asset.sha256,
    })),
  ].filter((asset, index, all) => all.findIndex(item => item.asset_id === asset.asset_id) === index)

  const subtitleMode = snapshot.campaign.subtitles || 'off'
  const outroMode = (snapshot.campaign as any).outro === 'off' ? 'off' : 'auto'
  const isOutroDisabled = outroMode === 'off'

  return {
    plan_version: 'simple-v5-production-plan.v1',
    creative_type: (snapshot.campaign.user_style_preference || 'AUTO').toUpperCase(),
    product: {
      product_id: brief.heroProductId || '',
      name: brief.subject,
      canonical_asset_sha256: brief.heroProductSha || '',
    },
    reference_assets: references,
    aspect_ratio: brief.aspectRatio,
    duration_seconds: brief.durationSeconds,
    concept: brief.primaryIdea,
    location: brief.location,
    primary_action: brief.primaryAction,
    camera_motion: brief.cameraMotion,
    timeline: {
      footage_start_sec: 0,
      footage_end_sec: isOutroDisabled ? brief.durationSeconds : 5.5,
      fade_start_sec: isOutroDisabled ? brief.durationSeconds : 5.5,
      fade_end_sec: isOutroDisabled ? brief.durationSeconds : 6,
      outro_start_sec: isOutroDisabled ? brief.durationSeconds : 6,
      outro_end_sec: brief.durationSeconds,
    },
    shots: [
      { purpose: 'HOOK', start_sec: 0, end_sec: 2.2, description: shotPlan.shot1_hook.description },
      { purpose: 'PRODUCT_PROOF', start_sec: 2.2, end_sec: 5.8, description: shotPlan.shot2_proof.description },
      { purpose: 'BRAND_CLOSE', start_sec: 5.8, end_sec: 8, description: shotPlan.shot3_close.description },
    ],
    speech: {
      language: 'tr-TR',
      text: brief.spokenScript,
      start_sec: 2.2,
      end_sec: 5.5,
      allow_paraphrase: false,
    },
    subtitles: {
      mode: subtitleMode,
      start_sec: 0.5,
      end_sec: 5.5,
    },
    outro: {
      mode: outroMode,
      start_sec: isOutroDisabled ? brief.durationSeconds : 6,
      end_sec: brief.durationSeconds,
    },
    branding: {
      diegetic_policy: 'reference-only',
      overlay_policy: 'canonical-logo-only',
    },
  }
}
