/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * SCENE CONTRACT V2 BUILDER (V6)
 * 
 * Kesin İlke:
 * LLM doğrudan serbest Veo promptu yazmaz.
 * Sistem her sahneyi doğrulanabilir, tip korumalı bir SceneContractV2 nesnesine bağlar.
 * Prompt Compiler bu kontratı deterministik olarak derler.
 */

import type {
  ResolvedCreativeFacts,
  CreativeDNA,
  DirectorTreatment,
  StoryBeat,
  CauseEffectLink,
  SceneContractV2
} from './creative-types'

export function buildSceneContractsV2(params: {
  facts: ResolvedCreativeFacts
  dna: CreativeDNA
  treatment: DirectorTreatment
  beats: StoryBeat[]
  links: CauseEffectLink[]
  cameraMode?: 'continuous_take' | 'directed_cuts'
}): SceneContractV2[] {
  const { facts, dna, treatment, beats, links, cameraMode } = params
  const isContinuous = cameraMode === 'continuous_take'
  const brand = facts.brandName
  const product = facts.product.name
  const material = dna.product.materials[0] || 'commercial material'
  const env = dna.product.visualWorld[0] || 'authentic commercial environment'

  const contracts: SceneContractV2[] = []

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i]
    const sceneId = `s0${i + 1}`
    const isFirst = i === 0
    const isLast = i === beats.length - 1

    const durationSec = Number((beat.endSec - beat.startSec).toFixed(1))

    // Causal links
    const causeFromPrev = links.find(l => l.toBeatId === beat.id)?.causalRelation
    const effectNext = links.find(l => l.fromBeatId === beat.id)?.causalRelation

    // Camera settings
    let shotSize = 'medium'
    let lens = '50mm prime f/1.8'
    let movement = 'slow_tracking'
    let motionEnergy = 0.65

    if (isFirst) {
      shotSize = isContinuous ? 'medium' : 'wide'
      lens = '35mm anamorphic'
      movement = isContinuous ? 'continuous_push_in' : 'dynamic_commercial_tracking'
      motionEnergy = 0.85
    } else if (isLast) {
      shotSize = 'close_up'
      lens = '85mm f/1.4'
      movement = isContinuous ? 'continuous_push_in' : 'rock_steady_locked'
      motionEnergy = 0.30
    } else {
      shotSize = beat.type === 'proof' || beat.type === 'transformation' ? 'macro' : 'medium'
      lens = beat.type === 'proof' ? '100mm macro' : '50mm prime f/1.8'
      movement = isContinuous ? 'continuous_push_in' : 'controlled_crane_glide'
      motionEnergy = 0.70
    }

    // Visibility budgets
    const productVisibility = isLast ? 0.90 : (beat.type === 'proof' ? 1.0 : 0.75)
    const brandVisibility = isLast ? 0.95 : (isFirst ? 0.10 : 0.20)

    // Semantic transition
    let transitionOut: SceneContractV2['transitionOut'] = undefined
    if (!isLast) {
      transitionOut = {
        semanticReason: effectNext || 'Natural workflow progression',
        visualTechnique: isContinuous ? 'motion_match' : (beat.type === 'proof' ? 'match_cut' : 'action_cut'),
        matchElement: `${material} geometry and continuous forward motion`,
      }
    }

    contracts.push({
      sceneId,
      startSec: beat.startSec,
      endSec: beat.endSec,
      durationSec,
      storyBeatId: beat.id,
      storyFunction: beat.purpose,
      viewerKnowledgeBefore: beat.viewerKnowledgeBefore,
      viewerKnowledgeAfter: beat.viewerKnowledgeAfter,
      emotionIn: beat.emotionIn,
      emotionOut: beat.emotionOut,
      causeFromPrevious: causeFromPrev,
      effectIntoNext: effectNext,
      subject: {
        type: 'exact_reference_product',
        identityLock: facts.product.referenceAssetIds.length > 0,
        assetIds: facts.product.referenceAssetIds,
        description: `${product} (${material})`,
      },
      primaryAction: isFirst
        ? `Camera dynamically introduces ${product} (${material}) in ${env}. Purposeful action begins decisively at 0.3s.`
        : isLast
        ? `Camera settles with rock-steady stability on the pristine physical form of ${product}, anchoring the authentic craftsmanship of ${brand}.`
        : `A focused professional demonstrates the authentic structural integrity and practical operational performance of ${product}.`,
      secondaryAction: isLast ? undefined : 'Professional workplace process continues with organic realism in the background.',
      environment: env,
      composition: {
        foreground: isLast ? `${product} structural finish` : `${product} in action`,
        midground: 'Authentic commercial workspace',
        background: 'Natural atmospheric depth and realistic ambient illumination',
      },
      camera: {
        shotSize,
        lens,
        movement,
      },
      lighting: {
        motivation: 'Natural balanced daylight and authentic physical workplace illumination.',
        character: isLast ? treatment.lightingArc.ending : (isFirst ? treatment.lightingArc.opening : treatment.lightingArc.middle),
        continuity: 'Strict spatial continuity and consistent color temperature across all scenes.',
      },
      visualMotif: treatment.visualMotif.description,
      motionDirection: treatment.motionMotif.primaryDirection,
      motionEnergy,
      productVisibility,
      brandVisibility,
      incomingAction: isFirst ? undefined : 'Önceki sahneden aktarılan fiziksel momentum',
      outgoingAction: isLast ? undefined : 'Sonraki sahneye devreden net eylem',
      transitionOut,
      mustShow: [
        material,
        isLast ? brand : product,
      ],
      mustAvoid: [
        ...dna.brand.avoid,
        ...dna.product.avoid,
      ],
      expectedVisualEvidence: [
        product,
        material,
        env,
      ],
      expectedActionEvidence: [
        ...(dna.product.authenticInteractions.length > 0 ? [dna.product.authenticInteractions[0]] : []),
      ],
      expectedEnvironmentEvidence: [
        env,
      ],
      forbiddenVisualEvidence: [
        ...dna.product.avoid,
        ...(dna.product.forbiddenUses || []),
      ],
      forbiddenActionEvidence: [
        ...(dna.product.forbiddenInteractions || []),
      ],
      naturalAudio: [
        'Otantik ortam foley sesleri ve mekanik fiziksel temas sesi',
      ],
    })
  }

  return contracts
}
