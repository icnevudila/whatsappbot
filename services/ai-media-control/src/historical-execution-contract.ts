import { createBrandContextSnapshot, type RawBrandInput, type SimpleV5Brief, type SimpleV5ShotPlan, type SimpleV5ProductionPlan } from '@wa/creative-video-orchestrator'
import type { runHistoricalVideoDirector } from './historical-video-director.js'

/** These shared record shapes belong to the current executor, not its creative
 * compiler. All creative choices below come from the historical V5 result. */
export function createHistoricalExecutionContract(rawInput: RawBrandInput, directed: Awaited<ReturnType<typeof runHistoricalVideoDirector>>) {
  const snapshot = createBrandContextSnapshot({ ...rawInput, creative_engine_mode: 'CURRENT' })
  const product = snapshot.products[0]
  if (!product) throw new Error('HISTORICAL_HERO_PRODUCT_REQUIRED')
  const legacy = directed.historical
  const shots = legacy.shotPlan.shots
  const brief: SimpleV5Brief = {
    goal: snapshot.campaign.objective, subject: product.name, heroProductHandle: '@HeroProduct',
    heroProductId: product.product_id, heroProductSha: product.sha256, brandName: snapshot.brand_name,
    primaryIdea: legacy.creativeStrategy.primary, primaryAction: shots[1].subjectAction,
    location: legacy.shotPlan.singleLocation, timeOfDay: '', lighting: shots[0].lightingAndPhysics,
    cameraMotion: shots[0].cameraMotion, spokenScript: legacy.voiceover.text,
    spokenWordCount: legacy.voiceover.wordCount, verifiedFacts: [...(snapshot.verified_claims || [])],
    aspectRatio: '9:16', durationSeconds: 8,
  }
  const shotPlan: SimpleV5ShotPlan = {
    shot1_hook: { timing: '0.0-2.2s', description: shots[0].subjectAction, framing: shots[0].framing },
    shot2_proof: { timing: '2.2-5.8s', description: shots[1].subjectAction, action: shots[1].subjectAction },
    shot3_close: { timing: '5.8-8.0s', description: shots[2].subjectAction, resolution: shots[2].framing },
  }
  const productionPlan: SimpleV5ProductionPlan = {
    plan_version: 'simple-v5-production-plan.v1', creative_type: 'HISTORICAL_V5_CONTINUOUS_PRODUCT',
    product: { product_id: product.product_id, name: product.name, canonical_asset_sha256: product.sha256 },
    reference_assets: [{ asset_id: product.asset_id, role: 'product', sha256: product.sha256 }, { asset_id: snapshot.logo_asset_id, role: 'logo', sha256: snapshot.logo_sha256 }],
    aspect_ratio: '9:16', duration_seconds: 8, concept: brief.primaryIdea, location: brief.location,
    primary_action: brief.primaryAction, camera_motion: brief.cameraMotion,
    timeline: { footage_start_sec: 0, footage_end_sec: 8, fade_start_sec: 8, fade_end_sec: 8, outro_start_sec: 8, outro_end_sec: 8 },
    shots: shots.map((s,index)=>({ purpose: (['HOOK','PRODUCT_PROOF','BRAND_CLOSE'] as const)[index], start_sec: s.timing.from, end_sec: s.timing.to, description: s.subjectAction })),
    speech: { language: 'tr-TR', text: brief.spokenScript, start_sec: 0.5, end_sec: 5.25, allow_paraphrase: false },
    subtitles: { mode: 'auto', start_sec: 0.5, end_sec: 5.25 },
    outro: { mode: 'off', start_sec: 8, end_sec: 8 },
    branding: { diegetic_policy: 'reference-only', overlay_policy: 'canonical-logo-only' },
  }
  return { snapshot, brief, shotPlan, productionPlan, providerPrompt: directed.providerPrompt,
    commercialTypography: legacy.overlayPlan.commercialTypography,
    assContent: legacy.overlayPlan.assContent,
    diagnostics: { creative_behavior: 'HISTORICAL_20260921', source_tree_sha: legacy.historical_tree_sha, initial_prompt: legacy.veoPrompt, rewritten_prompt: directed.rewrittenPrompt, director_gateway_job_id: directed.gatewayJobId, director_vision_receipt: directed.visionReceipt, commercial_typography: legacy.overlayPlan.commercialTypography } }
}
