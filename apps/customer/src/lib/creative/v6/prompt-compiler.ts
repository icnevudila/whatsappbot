/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * DETERMINISTIC PROMPT COMPILER (V6)
 * 
 * Kesin İlke:
 * Prompt Compiler yalnızca VALIDATED SceneContractV2 verilerinden Veo promptu oluşturur.
 * LLM'nin serbest edebi metinleri doğrudan Veo'ya iletilemez.
 * 
 * Derleme Sırası:
 * SUBJECT IDENTITY + REFERENCE LOCK + PRIMARY ACTION + ENVIRONMENT + COMPOSITION +
 * CAMERA + LIGHT + MATERIAL DETAIL + MOTION + CONTINUITY + TRANSITION INTENT +
 * NATURAL AUDIO + MUST SHOW + MUST AVOID + STRICT TEXT POLICY
 */

import type { SceneContractV2, CreativeDNA, ResolvedCreativeFacts } from './creative-types'

export function compileValidatedSceneContractsToVeo(params: {
  scenes: SceneContractV2[]
  facts: ResolvedCreativeFacts
  dna: CreativeDNA
  targetDurationSeconds: number
  grammarType: 'short_performance' | 'mid_form' | 'brand_film'
  cameraMode?: 'continuous_take' | 'directed_cuts'
}): string {
  const { scenes, facts, dna, targetDurationSeconds, grammarType, cameraMode } = params
  const isContinuous = cameraMode === 'continuous_take'
  const brandName = facts.brandName
  const subjectName = facts.product.name
  const hasRefAsset = facts.product.referenceAssetIds.length > 0 || Boolean(facts.product.productImageUrl)
  const singleLocation = scenes[0]?.environment || dna.product.visualWorld[0]

  const totalRuntime = scenes.length > 0 ? scenes[scenes.length - 1].endSec : targetDurationSeconds

  // 1. Sahnelerin Kompakt, Net ve Deterministik Direktifleri
  const sceneBlocks = scenes.map((sc, idx) => {
    const lines = [
      `SCENE ${idx + 1} (${sc.startSec.toFixed(1)}s - ${sc.endSec.toFixed(1)}s - ${sc.storyFunction.toUpperCase()}):`,
      `  CAMERA: ${sc.camera.shotSize} framing with ${sc.camera.lens || '50mm prime'}, ${sc.camera.movement}. Energy: ${sc.motionEnergy.toFixed(2)}.`,
      `  PRIMARY ACTION: ${sc.primaryAction}`,
      ...(sc.secondaryAction ? [`  SECONDARY ACTION: ${sc.secondaryAction}`] : []),
      `  COMPOSITION: FG: ${sc.composition.foreground || 'subject'} | MG: ${sc.composition.midground || 'workspace'} | BG: ${sc.composition.background || 'natural depth'}.`,
      `  LIGHTING: ${sc.lighting.character}. ${sc.lighting.motivation}.`,
      ...(sc.transitionOut ? [`  TRANSITION OUT: ${sc.transitionOut.visualTechnique} (${sc.transitionOut.matchElement}).`] : []),
      `  MUST SHOW: ${sc.mustShow.join(', ')}.`,
    ]
    return lines.join('\n')
  })

  // 2. Reference Lock Direktifi (Kesin Hakikat Kaynağı)
  const referenceLockDirective = hasRefAsset
    ? `REFERENCE PRODUCT IS ABSOLUTE SOURCE OF TRUTH: The provided product reference photo strictly locks the subject's geometry, casing, proportions, textures, labels and colors with ZERO mutation, zero redesign, and zero hallucination.`
    : `SUBJECT SPECIFICATION: Authentic physical geometry, realistic material textures (${dna.product.materials.join(', ')}), and uncompromised industrial finish.`

  // 3. Negatif ve Yasaklılar Listesi (Deduplicated)
  const combinedAvoid = Array.from(new Set([
    'fake logos', 'additional brands', 'misspelled brand name', 'distorted logo',
    'altered lettering', 'promotional captions', 'price tags', 'subtitles',
    'spinning turntable, motorized 360 rotation, levitating objects',
    'cartoon, 3D animation look, cgi render, uncanny valley',
    'laptop manufacturer logo, text on laptop bezel, unbranded hardware violations',
    'blurry artifacts, low quality, pixelated, amateur video, choppy jumps, abrupt view shifts',
    ...dna.brand.avoid,
    ...dna.product.avoid,
    ...facts.sectorFacts.forbiddenVisuals,
  ])).join(', ')

  // 4. Marka Mührü Kapanış Direktifi
  const lastScene = scenes[scenes.length - 1]
  const brandRevealDirective = brandName
    ? `MANDATORY BRAND LOCK (${lastScene.startSec.toFixed(1)}s - ${lastScene.endSec.toFixed(1)}s): The authentic corporate brand mark "${brandName}" settles rock-steadily on the durable physical surface with zero camera blur, zero rapid rotation, and zero distorted typography.`
    : null

  // 5. Metin Politikası (Metin Uydurma Kesinlikle Yasak)
  const textPolicy = `TEXT POLICY: Absolutely NO newly generated text, captions, prices, phone numbers, website URLs, floating letters, discount badges, or graphic lower thirds. Pre-existing printed labels and authentic branding on reference products remain as-is without modification.`

  // 6. Nihai Prompt Birleşimi
  const fullPrompt = [
    `FORMAT: 9:16 vertical commercial video, ${grammarType === 'brand_film' ? 'extended cinematic brand film' : 'high-impact commercial performance'}, runtime ${totalRuntime.toFixed(1)}s.`,
    `STRATEGIC ESSENCE: ${dna.brand.corePillar} (Personality: ${dna.brand.personality.join(', ')}).`,
    `SUBJECT IDENTITY: "${subjectName}". ${referenceLockDirective}`,
    `LOCATION: ${singleLocation}. Strict spatial continuity across all scenes with identical lighting setup.`,
    `CAMERA DIRECTIVE: ${isContinuous ? 'continuous_take - Single unbroken slow forward push-in route maintained across all seconds with zero trajectory breaks.' : 'directed_cuts - Controlled cinematic cut transitions connecting purposeful distinct framings.'}`,
    ...sceneBlocks,
    ...(brandRevealDirective ? [brandRevealDirective] : []),
    `LIGHTING & PHYSICS: Natural balanced daylight, realistic physical gravity and authentic specular reflections. Lifted clean blacks.`,
    `AUDIO DIRECTIVE: Natural ambient foley sound effects matching the physical action, accompanied by modern subtle commercial rhythm throughout all ${totalRuntime.toFixed(1)} seconds.`,
    textPolicy,
    `NEGATIVE CONSTRAINTS: ${combinedAvoid}`,
  ]

  return fullPrompt.join('\n')
}
