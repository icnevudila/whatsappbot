/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * DIRECTOR VISUAL & SEMANTIC QA ENGINE (V6 HARDENED)
 * 
 * Kesin Güvenlik & Doğruluk İlkeleri:
 * 1. NEGATIVE EVIDENCE VETO: Pozitif kanıtlar (ürünün net görünmesi, yüksek çözünürlük vb.)
 *    negatif kanıtları (yasaklı nesne, yanlış kullanım, statik kart) ASLA geçersiz kılamaz.
 * 2. USE-CASE KORUMASI: Tarım pompasıyla araba yıkanamaz, inşaat tuğlasıyla yemek pişirilemez.
 * 3. STATİK KART & TELEMETRİ YASAĞI: Ardışık karelerde <%2 hareket farkı varsa STATIC_PLACEHOLDER_SUSPECTED -> HARD_FAIL.
 * 4. STRUCTURED EVIDENCE: Serbest metin hallucination'ı yasaktır; tüm kararlar machine-readable JSON bulgularına dayanır.
 */

import type {
  DirectorQAReport,
  ResolvedCreativeFacts,
  SceneContractV2,
  StrategicPromise,
  CreativeDNA
} from './creative-types'

export interface DetectedVisualObservation {
  identifiedBrandName?: string | null
  containsCrossTenantLogo?: boolean
  productMutated?: boolean
  hasBlackFrames?: boolean
  hasAnatomicalDefects?: boolean
  hasDecorativeOnlyScene?: boolean
  
  // Semantik Gözlemler
  detectedProduct?: string | null
  detectedAction?: string | null
  detectedEnvironment?: string | null
  detectedObjects?: string[]
  detectedActions?: string[]
  
  // Hareket & Dinamizm Gözlemleri
  isStaticCard?: boolean
  frameDifferencePercentage?: number // e.g. 1.2% -> static, 18.5% -> live action
  averageOpticalFlow?: number
  
  // Ham Görsel Model Çıktısı
  rawVisionSummary?: string
  confidence?: number
}

export function evaluateDirectorQA(params: {
  scenes: SceneContractV2[]
  facts: ResolvedCreativeFacts
  promise: StrategicPromise
  dna?: CreativeDNA
  detectedVisualContent?: DetectedVisualObservation
  inspectedFrames?: Array<{ label: string; timestamp: number; path?: string }>
}): DirectorQAReport {
  const { scenes, facts, promise, dna, detectedVisualContent, inspectedFrames = [] } = params
  const detected = detectedVisualContent || {}
  const issues: string[] = []

  const detectedObjects = (detected.detectedObjects || []).map(o => o.toLowerCase().trim())
  const detectedActions = (detected.detectedActions || []).map(a => a.toLowerCase().trim())
  if (detected.detectedAction) detectedActions.push(detected.detectedAction.toLowerCase().trim())

  const detectedEnv = (detected.detectedEnvironment || '').toLowerCase().trim()

  // Sektör ve DNA kısıtlarını derle
  const forbiddenObjectsPool = new Set<string>()
  const forbiddenActionsPool = new Set<string>()
  const forbiddenEnvPool = new Set<string>()

  // Sector-level forbidden items
  facts.sectorFacts.forbiddenVisuals.forEach(v => forbiddenObjectsPool.add(v.toLowerCase().trim()))

  // Scene-level forbidden items
  scenes.forEach(s => {
    if (Array.isArray(s.forbiddenVisualEvidence)) {
      s.forbiddenVisualEvidence.forEach(v => {
        if (typeof v === 'string') forbiddenObjectsPool.add(v.toLowerCase().trim());
      });
    }
    if (Array.isArray(s.forbiddenActionEvidence)) {
      s.forbiddenActionEvidence.forEach(a => {
        if (typeof a === 'string') forbiddenActionsPool.add(a.toLowerCase().trim());
      });
    }
  });

  // DNA-level product locks
  if (dna?.product?.forbiddenUses) {
    dna.product.forbiddenUses.forEach(u => forbiddenActionsPool.add(u.toLowerCase().trim()))
  }
  if (dna?.product?.forbiddenInteractions) {
    dna.product.forbiddenInteractions.forEach(i => forbiddenActionsPool.add(i.toLowerCase().trim()))
  }

  // 1. BRAND & IDENTITY CHECKS
  const correctBrand = detected.identifiedBrandName
    ? detected.identifiedBrandName.toLowerCase() === facts.brandName.toLowerCase()
    : true

  if (!correctBrand) {
    issues.push(`CRITICAL_HARD_FAIL: Tespit edilen marka adı ("${detected.identifiedBrandName}") ile işin ait olduğu marka ("${facts.brandName}") uyuşmuyor!`)
  }

  const noCrossTenantAssets = detected.containsCrossTenantLogo !== true
  if (!noCrossTenantAssets) {
    issues.push('CRITICAL_SECURITY_FAIL: Video karesinde BAŞKA bir kuruma (cross-tenant) ait logo tespit edildi!')
  }

  const productReferenceFidelity = detected.productMutated !== true
  if (!productReferenceFidelity) {
    issues.push('PRODUCT_MUTATION_FAIL: Odak ürünün şekli veya rengi referans görselden kabul edilemez derecede saptı!')
  }

  // 2. FORBIDDEN OBJECT CHECKS
  let noForbiddenObjects = true
  for (const obj of detectedObjects) {
    for (const forbidden of forbiddenObjectsPool) {
      if (obj.includes(forbidden) || forbidden.includes(obj)) {
        noForbiddenObjects = false
        issues.push(`FORBIDDEN_OBJECT_DETECTED: Yasaklı nesne tespit edildi ("${obj}"). Sector/Brief kuralı ihlali!`)
      }
    }
  }

  // 3. USE-CASE & ACTION MATCH
  let useCaseMatch = true
  let noForbiddenActions = true
  for (const act of detectedActions) {
    for (const forbidden of forbiddenActionsPool) {
      if (act.includes(forbidden) || forbidden.includes(act)) {
        useCaseMatch = false
        noForbiddenActions = false
        issues.push(`WRONG_USECASE: Ürün tasarlanan kullanım amacı dışında kullanılıyor ("${act}"). Doğru kullanım: ${dna?.product?.intendedUses?.[0] || facts.sectorFacts.authenticActions[0] || 'sektörel standart'}`)
      }
    }
  }

  // 4. ENVIRONMENT MATCH
  let environmentMatch = true
  if (detectedEnv) {
    // Tarım ürününün araba yıkama garajında olması gibi tezatlıkları yakala
    if (
      (facts.sectorFacts.sectorProfileId === 'agriculture_farming' || facts.product.name.toLowerCase().includes('pompa')) &&
      (detectedEnv.includes('car wash') || detectedEnv.includes('auto detailing') || detectedEnv.includes('garaj') || detectedEnv.includes('oto yıkama'))
    ) {
      environmentMatch = false
      issues.push(`ENVIRONMENT_MISMATCH: Tarım ürünü oto yıkama/garaj ortamında tespit edildi ("${detectedEnv}"). Beklenen ortam: meyve bahçesi, sera veya tarla.`)
    }
  }

  // 5. MOTION DYNAMICS & STATIC CARD DETECTOR
  let motionDynamics = true
  if (detected.isStaticCard === true) {
    motionDynamics = false
    issues.push('STATIC_PLACEHOLDER_SUSPECTED: Statik HUD/telemetri kartı tespit edildi. Canlı video üretilemediği için reddedildi.')
  } else if (detected.frameDifferencePercentage !== undefined && detected.frameDifferencePercentage < 2.0) {
    motionDynamics = false
    issues.push(`STATIC_PLACEHOLDER_SUSPECTED: Kareler arası hareket farkı çok düşük (%${detected.frameDifferencePercentage.toFixed(1)} < %2.0). Statik slayt veya sahte video tespit edildi.`)
  }

  // 6. NEGATIVE EVIDENCE VETO
  // Herhangi bir negatif kanıt varsa tek oyla veto edilir
  const negativeEvidenceVeto = !noForbiddenObjects || !noForbiddenActions || !useCaseMatch || !environmentMatch || !motionDynamics || !correctBrand || !noCrossTenantAssets
  if (negativeEvidenceVeto && issues.length > 0) {
    // Negative evidence veto active
  }

  // 7. DIRECTOR & NARRATIVE CHECKS
  const intendedBeatConveyed = scenes.length >= 1
  const storyProgressionValid = scenes.length >= 2
  const continuityPreserved = scenes.every((s, i) => i === 0 || s.causeFromPrevious !== undefined || s.viewerKnowledgeBefore !== s.viewerKnowledgeAfter)
  const productVisibilityMet = scenes.some(s => s.productVisibility >= 0.5)
  const realisticEnvironment = environmentMatch
  const noAnatomicalDefects = detected.hasAnatomicalDefects !== true
  const motionEnergyConsistent = scenes.length > 0 && scenes[0].motionEnergy >= 0.4
  const noRepetitiveLogoShots = scenes.filter(s => s.brandVisibility > 0.7).length <= 2
  const physicalPlausibility = noAnatomicalDefects && !detected.hasBlackFrames

  if (!noRepetitiveLogoShots) {
    issues.push('REPETITIVE_LOGO_WARNING: Çok fazla sahnede (%70+) logo baskın tutulmuş; ticari zarafet zedeleniyor.')
  }

  const hookStrength = scenes[0]?.motionEnergy >= 0.5
  const strategicPromiseDelivered = Boolean(promise.statement && promise.viewerBeliefAfter)
  const energyProgressionValid = scenes[scenes.length - 1]?.motionEnergy <= 0.6
  const payoffValid = scenes[scenes.length - 1]?.brandVisibility >= 0.5 || scenes[scenes.length - 1]?.productVisibility >= 0.5
  const noDecorativeShotsRemaining = detected.hasDecorativeOnlyScene !== true

  if (!noDecorativeShotsRemaining) {
    issues.push('DECORATIVE_SHOT_DETECTED: Hikâyeyi ilerletmeyen saf süs sahnesi videoya sızmış.')
  }

  // 8. Skor Hesaplama ve Karar
  let score = 100
  if (!correctBrand) score -= 50
  if (!noCrossTenantAssets) score -= 50
  if (!productReferenceFidelity) score -= 30
  if (!noForbiddenObjects) score -= 40
  if (!useCaseMatch) score -= 40
  if (!environmentMatch) score -= 30
  if (!motionDynamics) score -= 60
  if (!physicalPlausibility) score -= 25
  if (!noRepetitiveLogoShots) score -= 15
  if (!hookStrength) score -= 10
  if (!noDecorativeShotsRemaining) score -= 15

  score = Math.max(0, Math.min(100, score))

  let verdict: DirectorQAReport['verdict'] = 'PASS'
  let retryRecommended = false

  // NEGATIVE EVIDENCE VETO KURALI:
  // Eğer negatif kanıt vetosu tetiklendiyse skor ne olursa olsun karar kesinlikle HARD_FAIL'dir.
  if (negativeEvidenceVeto || !correctBrand || !noCrossTenantAssets || !productReferenceFidelity || score < 60) {
    verdict = 'HARD_FAIL'
    retryRecommended = true
  } else if (score < 85 || issues.length > 0) {
    verdict = 'SOFT_FAIL'
    retryRecommended = false
  }

  const visionFindings: Record<string, any> = {
    detectedBrand: detected.identifiedBrandName || null,
    detectedProduct: detected.detectedProduct || null,
    detectedAction: detected.detectedAction || null,
    detectedEnvironment: detected.detectedEnvironment || null,
    detectedObjects: detected.detectedObjects || [],
    detectedActions: detected.detectedActions || [],
    isStaticCard: detected.isStaticCard || false,
    frameDifferencePercentage: detected.frameDifferencePercentage ?? null,
    vetoTriggered: negativeEvidenceVeto,
    evaluatedAt: new Date().toISOString()
  }

  return {
    verdict,
    overallScore: score,
    hardIdentityChecks: {
      correctBrand,
      correctLogo: correctBrand,
      noCrossTenantAssets,
      productReferenceFidelity,
      noForbiddenObjects,
      noForbiddenActions,
      useCaseMatch,
      environmentMatch,
      motionDynamics,
      negativeEvidenceVeto: !negativeEvidenceVeto,
    },
    directorChecks: {
      intendedBeatConveyed,
      storyProgressionValid,
      continuityPreserved,
      productVisibilityMet,
      realisticEnvironment,
      noAnatomicalDefects,
      motionEnergyConsistent,
      noRepetitiveLogoShots,
      physicalPlausibility,
    },
    narrativeChecks: {
      hookStrength,
      strategicPromiseDelivered,
      energyProgressionValid,
      payoffValid,
      noDecorativeShotsRemaining,
    },
    visionFindings,
    issues,
    retryRecommended,
    inspectedFrames,
  }
}
