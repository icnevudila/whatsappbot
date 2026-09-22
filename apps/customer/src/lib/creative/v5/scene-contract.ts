/**
 * MESAJIFY VIDEO ENGINE V5 - MACHINE-READABLE SCENE CONTRACTS & DUAL GRAMMAR
 * 
 * Mimari İlke:
 * LLM serbestliği konsept aşamasında kalır. Prodüksiyon aşaması makine tarafından
 * doğrulanabilir bir JSON Sahne Kontratına (Scene Contract) bağlanır.
 * Compiler bu kontratı deterministik olarak Veo promptuna çevirir.
 */

import type { CreativeDNASnapshot } from './creative-dna'
import { V5_STANDARD_NEGATIVES_LIST } from './constants'

export type ScenePurpose =
  | 'visual_hook'
  | 'world_establishment'
  | 'friction_or_need'
  | 'product_entrance'
  | 'product_proof'
  | 'capability_escalation'
  | 'emotional_payoff'
  | 'hero_close'

export interface CameraConfig {
  shot: 'extreme_wide' | 'wide' | 'medium' | 'medium_close' | 'close_up' | 'macro'
  lens: string              // örn. "35mm anamorphic", "50mm prime f/1.8", "100mm macro"
  movement: 'continuous_push_in' | 'slow_tracking' | 'static_locked' | 'crane_rise' | 'pan_reveal'
}

export interface SceneContract {
  scene_id: string          // örn. "s01", "s02", "s03"
  timing: { from: number; to: number }
  duration: number          // saniye cinsinden
  purpose: ScenePurpose
  subject: string           // Odak fiziksel varlık
  actor: string             // Sahnedeki insan / profesyonel rolü
  environment: string       // Kesin tekil lokasyon
  continuity_from: string | null
  product_visibility: 'hero' | 'high' | 'medium' | 'ambient'
  brand_visibility: 'none' | 'subtle' | 'prominent' | 'locked_hero_close'
  camera: CameraConfig
  must_show: string[]       // Sahnenin kesinlikle içermesi gereken görsel unsurlar
  must_not_show: string[]   // Sahneden men edilen unsurlar
  lighting_and_physics: string
  action_description: string
}

export type CreativeGrammarType = 'short_performance' | 'brand_film'

/**
 * Dual Creative Grammar Engine:
 * İstenen video süresine göre uygun grameri (Short Performance vs Brand Film) seçer
 * ve sahne kontratlarını üretir.
 */
export function buildSceneContracts(params: {
  dna: CreativeDNASnapshot
  targetDurationSeconds: number
  offerName: string
  brandName: string | null
  hookDescription: string
  cameraMode?: 'continuous_take' | 'three_cut'
}): {
  grammarType: CreativeGrammarType
  contracts: SceneContract[]
} {
  const { dna, targetDurationSeconds, offerName, brandName, hookDescription, cameraMode } = params
  const isContinuous = cameraMode === 'continuous_take'
  const env = dna.product.visualWorld[0] || 'Clean, modern commercial setting'
  const isBrandFilm = targetDurationSeconds >= 20

  if (isBrandFilm) {
    // GRAMMAR B: BRAND FILM (25–60 sec)
    // Hook -> World -> Need -> Product Entrance -> Proof -> Escalation -> Payoff -> Brand Resolution
    const total = targetDurationSeconds || 40
    const contracts: SceneContract[] = [
      {
        scene_id: 's01',
        timing: { from: 0, to: 5 },
        duration: 5,
        purpose: 'visual_hook',
        subject: offerName,
        actor: 'Focused authentic professional',
        environment: env,
        continuity_from: null,
        product_visibility: 'medium',
        brand_visibility: 'subtle',
        camera: {
          shot: 'wide',
          lens: '35mm anamorphic',
          movement: 'slow_tracking',
        },
        must_show: [dna.product.visualStrength[0] || 'clean texture', 'authentic daylight'],
        must_not_show: dna.product.avoid,
        lighting_and_physics: 'Warm natural dawn light, gentle ambient atmospheric motion',
        action_description: `Cinematic visual hook establishing scale: ${hookDescription}`,
      },
      {
        scene_id: 's02',
        timing: { from: 5, to: 12 },
        duration: 7,
        purpose: 'world_establishment',
        subject: offerName,
        actor: 'Experienced craftsman / operator',
        environment: env,
        continuity_from: 's01',
        product_visibility: 'medium',
        brand_visibility: 'none',
        camera: {
          shot: 'medium',
          lens: '50mm prime f/1.8',
          movement: 'slow_tracking',
        },
        must_show: [dna.product.material, 'operational workplace context'],
        must_not_show: dna.product.avoid,
        lighting_and_physics: 'True-to-life workspace lighting, authentic dust motes or natural foliage',
        action_description: `Revealing the broader environment and the genuine operational world where ${offerName} belongs.`,
      },
      {
        scene_id: 's03',
        timing: { from: 12, to: 22 },
        duration: 10,
        purpose: 'product_entrance',
        subject: offerName,
        actor: 'Confident specialist',
        environment: env,
        continuity_from: 's02',
        product_visibility: 'hero',
        brand_visibility: 'subtle',
        camera: {
          shot: 'medium_close',
          lens: '85mm f/1.4',
          movement: 'continuous_push_in',
        },
        must_show: dna.product.interaction,
        must_not_show: dna.product.avoid,
        lighting_and_physics: 'Crisp specular rim light highlighting product silhouette and physical material',
        action_description: dna.product.interaction[0] || `Hero entrance of ${offerName} into active operational engagement.`,
      },
      {
        scene_id: 's04',
        timing: { from: 22, to: 34 },
        duration: 12,
        purpose: 'product_proof',
        subject: offerName,
        actor: 'Active practitioner',
        environment: env,
        continuity_from: 's03',
        product_visibility: 'hero',
        brand_visibility: 'prominent',
        camera: {
          shot: 'macro',
          lens: '100mm macro',
          movement: 'slow_tracking',
        },
        must_show: [...dna.product.visualStrength, 'functional verified outcome'],
        must_not_show: dna.product.avoid,
        lighting_and_physics: 'High-speed clarity, razor-sharp focus on working mechanism and material output',
        action_description: `Tangible capability proof: Core physical performance demonstrating uncompromised structural or functional perfection.`,
      },
      {
        scene_id: 's05',
        timing: { from: 34, to: total },
        duration: total - 34,
        purpose: 'hero_close',
        subject: offerName,
        actor: 'Calm professional',
        environment: env,
        continuity_from: 's04',
        product_visibility: 'hero',
        brand_visibility: 'locked_hero_close',
        camera: {
          shot: 'medium_close',
          lens: '50mm prime f/1.8',
          movement: 'crane_rise',
        },
        must_show: ['authentic logo mark', brandName || offerName, 'clean resting state'],
        must_not_show: dna.product.avoid,
        lighting_and_physics: 'Golden cinematic rim light, rock-steady final posture, zero camera shake',
        action_description: `Emotional payoff and brand signature: Settles with quiet authority on the authentic brand mark and resting product.`,
      },
    ]

    return { grammarType: 'brand_film', contracts }
  }

  // GRAMMAR A: SHORT PERFORMANCE (6–12 sec)
  // Hook -> Product -> Action -> Benefit -> Brand
  const contracts: SceneContract[] = [
    {
      scene_id: 's01',
      timing: { from: 0.0, to: 2.2 },
      duration: 2.2,
      purpose: 'visual_hook',
      subject: offerName,
      actor: 'Professional user',
      environment: env,
      continuity_from: null,
      product_visibility: 'high',
      brand_visibility: 'none',
      camera: {
        shot: isContinuous ? 'medium' : 'wide',
        lens: '35mm anamorphic',
        movement: isContinuous ? 'continuous_push_in' : 'slow_tracking',
      },
      must_show: [dna.product.visualStrength[0] || 'product in action', 'natural ambient lighting'],
      must_not_show: dna.product.avoid,
      lighting_and_physics: 'Balanced natural illumination, shallow depth of field',
      action_description: hookDescription || (dna.product.interaction[0] || `Tangible action begins in 0.3 seconds with ${offerName}.`),
    },
    {
      scene_id: 's02',
      timing: { from: 2.2, to: 5.8 },
      duration: 3.6,
      purpose: 'product_proof',
      subject: offerName,
      actor: 'Skilled operator',
      environment: env,
      continuity_from: 's01',
      product_visibility: 'hero',
      brand_visibility: 'subtle',
      camera: {
        shot: 'medium_close',
        lens: '50mm prime f/1.8',
        movement: isContinuous ? 'continuous_push_in' : 'slow_tracking',
      },
      must_show: [...dna.product.visualStrength, ...dna.product.interaction],
      must_not_show: dna.product.avoid,
      lighting_and_physics: 'Crisp material textures, realistic physical momentum',
      action_description: dna.product.interaction[0] || `${offerName} demonstrates high-performance functional proof in its natural environment.`,
    },
    {
      scene_id: 's03',
      timing: { from: 5.8, to: 8.0 },
      duration: 2.2,
      purpose: 'hero_close',
      subject: offerName,
      actor: 'Professional user in background',
      environment: env,
      continuity_from: 's02',
      product_visibility: 'hero',
      brand_visibility: 'locked_hero_close',
      camera: {
        shot: 'close_up',
        lens: '85mm f/1.4',
        movement: isContinuous ? 'continuous_push_in' : 'static_locked',
      },
      must_show: [brandName || offerName, 'authentic corporate mark', 'clean durable surface'],
      must_not_show: dna.product.avoid,
      lighting_and_physics: 'Warm cinematic rim highlight, rock-steady framing, zero blur',
      action_description: `The camera settles rock-steadily on the authentic brand mark "${brandName || offerName}" and pristine hero product.`,
    },
  ]

  return { grammarType: 'short_performance', contracts }
}

/**
 * Scene Contracts -> Deterministic Veo Prompt Compiler
 * Makine kontratlarını Veo'nun anlayacağı net, katı direktifler bütününe dönüştürür.
 */
export function compileSceneContractsToVeo(params: {
  contracts: SceneContract[]
  grammarType: CreativeGrammarType
  dna: CreativeDNASnapshot
  brandName: string | null
  offerName: string
  audioDirective?: string | null
  cameraMode?: 'continuous_take' | 'three_cut'
  hasProductReference?: boolean
  antiRepetitionDirectives?: string[]
}): string {
  const { contracts, grammarType, dna, brandName, offerName, audioDirective, cameraMode, hasProductReference, antiRepetitionDirectives } = params
  const isContinuous = cameraMode === 'continuous_take'
  const singleLocation = contracts[0]?.environment || dna.product.visualWorld[0]

  const sceneLines = contracts.map((sc, idx) => {
    return `SCENE ${idx + 1} (${sc.timing.from.toFixed(1)}s - ${sc.timing.to.toFixed(1)}s - ${sc.purpose.toUpperCase()}): ${sc.camera.shot} framing with ${sc.camera.lens}, ${sc.camera.movement}. ${sc.action_description} MUST SHOW: ${sc.must_show.join(', ')}.`
  })

  const combinedAvoid = Array.from(new Set([
    ...V5_STANDARD_NEGATIVES_LIST,
    ...dna.product.avoid,
  ])).join(', ')

  const brandSurface = 'clean durable badge on product casing or polished plaque'
  const brandDirective = brandName
    ? `MANDATORY VISUAL BRAND IDENTITY (5.8s - 8.0s): The authentic corporate brand name "${brandName}" and logo mark are mandatory on-screen elements settling rock-steadily on ${brandSurface} in the concluding scene. Rock-steady framing, centered at eye level: zero camera shake, zero distorted letters.`
    : null

  const textPolicy = brandName
    ? `TEXT POLICY: No newly generated text or promotional advertising copy (strictly NO prices, NO discount badges, NO phone numbers, NO website URLs, NO promotional captions, NO subtitles, NO floating letters, NO banners, NO CTA badges). The verified brand name "${brandName}", the original corporate logo, and pre-existing product labels are MANDATORY on-screen visual elements directly in the video. Real physical brand identity is strictly preserved: pre-existing printed labels and authentic branding on reference products remain as-is without modification. Do not redesign or invent a logo.`
    : `TEXT POLICY: No newly generated text, captions, prices, phone numbers, calls to action, signs, or fake logos. No gibberish words, small text, long campaign copy, subtitles, floating text, handheld signs, desk signs, graphic overlays, banners or lower thirds. Real physical brand identity is strictly preserved: pre-existing printed labels and authentic branding on reference products remain as-is without modification. Brand name appears only on natural physical surfaces (uniforms, vehicle decals, entrance signage, or product nameplates) matching the brand palette. Do not redesign or invent a logo.`

  const cameraMovementDirective = isContinuous
    ? `CAMERA MOVEMENT: continuous_take - Single unbroken slow forward push-in route maintained across all scenes with zero trajectory breaks and zero scene interruption.`
    : `CAMERA MOVEMENT: three_cut - Three distinct controlled camera framings connected by clean cinematic cut transitions.`

  const prompt = [
    `FORMAT: 9:16 vertical commercial video, ${grammarType === 'brand_film' ? 'extended brand narrative' : 'short performance grammar'}, runtime ${contracts[contracts.length - 1].timing.to.toFixed(1)}s.`,
    `BRAND PILLAR AND EMOTIONAL INTENT: ${dna.brand.corePillar} (Personality: ${dna.brand.personality.join(', ')}). Every visual, lighting, and audio choice should serve this emotional intent directly.`,
    `SUBJECT AND REFERENCE LOCK: Focal subject is "${offerName}". ${
      hasProductReference
        ? 'A reference product photo is provided; preserve physical geometry, materials, casing, and colors exactly with zero mutation.'
        : `Material specification: ${dna.product.material}. Visual strengths: ${dna.product.visualStrength.join(', ')}.`
    }`,
    `LOCATION: ${singleLocation}. Strict continuity across all scenes with identical lighting setup.`,
    ...sceneLines,
    ...(brandDirective ? [brandDirective] : []),
    cameraMovementDirective,
    `LIGHTING & PHYSICS: Natural balanced daylight with authentic specular material reflections. ${dna.brand.prestigeLevel === 'luxury' ? 'High-key luminous elegance.' : 'Commercial-grade clean lifted blacks.'}`,
    audioDirective || `AUDIO: Natural ambient foley sound effects matching the physical action, accompanied by subtle commercial rhythm.`,
    textPolicy,
    ...(antiRepetitionDirectives && antiRepetitionDirectives.length > 0
      ? antiRepetitionDirectives.map((d) => `CREATIVE DIVERSITY DIRECTIVE: ${d}`)
      : []),
    `NEGATIVE CONSTRAINTS: ${combinedAvoid}`,
  ]

  return prompt.join('\n')
}
