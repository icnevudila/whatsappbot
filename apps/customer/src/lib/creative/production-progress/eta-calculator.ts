import type { EtaConfidence } from './progress-types'

export interface EtaCalculationInput {
  historicalDurationsSeconds: number[]
  activeWorkerCapacity: number
  queueAheadCount: number | null
  currentStageIndex: number
  elapsedTotalSeconds: number
  isTerminal?: boolean
}

export interface EtaCalculationResult {
  eta_min_seconds: number | null
  eta_max_seconds: number | null
  eta_display_text: string | null
  eta_confidence: EtaConfidence
}

/**
 * Calculates data-driven ETA based on empirical job durations and queue state.
 * Never invents seconds or fakes completion if history is absent.
 */
export function calculateAuthoritativeEta({
  historicalDurationsSeconds,
  activeWorkerCapacity,
  queueAheadCount,
  currentStageIndex,
  elapsedTotalSeconds,
  isTerminal = false,
}: EtaCalculationInput): EtaCalculationResult {
  if (isTerminal || currentStageIndex === 7) {
    return {
      eta_min_seconds: 0,
      eta_max_seconds: 0,
      eta_display_text: 'Tamamlandı',
      eta_confidence: 'HIGH',
    }
  }

  const validDurations = historicalDurationsSeconds
    .filter((d) => typeof d === 'number' && Number.isFinite(d) && d > 10 && d < 1800)
    .sort((a, b) => a - b)

  const sampleCount = validDurations.length
  const ahead = Math.max(0, queueAheadCount ?? 0)
  const capacity = Math.max(1, activeWorkerCapacity || 1)

  // Insufficient empirical data: fallback to truthful conservative range
  if (sampleCount < 5) {
    let displayText: string
    if (currentStageIndex === 1) {
      displayText = 'Doğrulanıyor…'
    } else if (currentStageIndex === 2) {
      displayText = ahead > 0
        ? `Sırada önünüzde ${ahead} video var`
        : 'İşleme alınmak üzere'
    } else if (currentStageIndex === 6) {
      displayText = 'Son kontroller yapılıyor'
    } else {
      displayText = 'Tahmini süre hesaplanıyor…'
    }

    return {
      eta_min_seconds: null,
      eta_max_seconds: null,
      eta_display_text: displayText,
      eta_confidence: 'LOW',
    }
  }

  // Compute p50 (median) and p80 from samples
  const p50Index = Math.floor(sampleCount * 0.5)
  const p80Index = Math.min(sampleCount - 1, Math.floor(sampleCount * 0.8))
  const p50 = validDurations[p50Index]
  const p80 = validDurations[p80Index]

  const confidence: EtaConfidence = sampleCount >= 15 ? 'HIGH' : 'MEDIUM'

  if (currentStageIndex <= 2) {
    // Queued or preparing
    const queueBatches = Math.ceil(ahead / capacity)
    const waitTimeMin = Math.round(queueBatches * p50)
    const waitTimeMax = Math.round(queueBatches * p80)

    const totalMinSecs = waitTimeMin + p50
    const totalMaxSecs = waitTimeMax + p80

    const minMins = Math.max(1, Math.floor(totalMinSecs / 60))
    const maxMins = Math.max(minMins + 1, Math.ceil(totalMaxSecs / 60))

    const displayText = ahead === 0
      ? `İşleme alınmak üzere (~${minMins}–${maxMins} dk)`
      : `Sırada önünüzde ${ahead} video var (~${minMins}–${maxMins} dk)`

    return {
      eta_min_seconds: totalMinSecs,
      eta_max_seconds: totalMaxSecs,
      eta_display_text: displayText,
      eta_confidence: confidence,
    }
  }

  if (currentStageIndex === 6) {
    return {
      eta_min_seconds: 10,
      eta_max_seconds: 30,
      eta_display_text: 'Son kontroller yapılıyor',
      eta_confidence: confidence,
    }
  }

  // Active production stages (3, 4, 5)
  // Stage proportion estimates based on empirical engine distribution
  // Stage 3 (Assets): ~10%
  // Stage 4 (Generating): ~70%
  // Stage 5 (Media Processing): ~15%
  // Stage 6 (Quality Check): ~5%
  let remainingFactor = 0.5
  if (currentStageIndex === 3) remainingFactor = 0.85
  if (currentStageIndex === 4) remainingFactor = 0.60
  if (currentStageIndex === 5) remainingFactor = 0.20

  const estRemainingMin = Math.max(15, Math.round(p50 * remainingFactor))
  const estRemainingMax = Math.max(25, Math.round(p80 * remainingFactor))

  const minMins = Math.max(1, Math.floor(estRemainingMin / 60))
  const maxMins = Math.max(minMins, Math.ceil(estRemainingMax / 60))

  let displayText: string
  if (minMins >= 1) {
    displayText = minMins === maxMins
      ? `yaklaşık ${minMins} dakika kaldı`
      : `yaklaşık ${minMins}–${maxMins} dakika kaldı`
  } else {
    displayText = `yaklaşık 1 dakika kaldı`
  }

  return {
    eta_min_seconds: estRemainingMin,
    eta_max_seconds: estRemainingMax,
    eta_display_text: displayText,
    eta_confidence: confidence,
  }
}
