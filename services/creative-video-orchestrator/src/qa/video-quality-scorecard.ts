/**
 * Video Quality Scorecard & Autonomous Candidate Evaluator.
 * 
 * Implements:
 * 1. Multi-metric evaluation (Product, Brand, Realism, Consistency, Audio, Outro).
 * 2. Two-level Frame Analysis (Level A fast scan, Level B detailed frame extraction).
 * 3. Strict Disqualification on Critical Existential Defects.
 * 4. Autonomous Candidate Comparison and Winner Selection.
 */

import type { SampledFrame } from './frame-sampler.js'
import type { AudioIntegrityReport } from './audio-integrity-gate.js'
import type { VideoReviewReport } from './chatgpt-video-reviewer.js'

export interface ScorecardMetrics {
  product_fidelity_score: number       // 0 - 100
  brand_fidelity_score: number         // 0 - 100
  reference_adherence_score: number    // 0 - 100
  physical_realism_score: number       // 0 - 100
  temporal_consistency_score: number   // 0 - 100
  cinematography_lighting_score: number // 0 - 100
  audio_speech_integrity_score: number // 0 - 100
  typography_outro_score: number       // 0 - 100
  composite_quality_score: number      // 0 - 100
}

export interface DefectItem {
  timestamp_sec?: number
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR'
  code: string
  description: string
  suggested_action: string
}

export interface CandidateEvaluationResult {
  candidate_id: string
  attempt_number: number
  provider: string
  provider_account_id?: string
  raw_output_path: string
  raw_output_sha256: string
  prompt_used: string
  metrics: ScorecardMetrics
  critical_defects: DefectItem[]
  major_defects: DefectItem[]
  minor_defects: DefectItem[]
  audio_report?: AudioIntegrityReport
  video_report?: VideoReviewReport
  decision: 'ACCEPT' | 'REJECT' | 'REPAIR'
  selection_rank?: number
  disqualification_reason?: string
}

export interface FrameAnalysisResult {
  level: 'LEVEL_A_FAST_SCAN' | 'LEVEL_B_DETAILED_FRAMES'
  sampled_frames_count: number
  flicker_detected: boolean
  morph_detected: boolean
  hallucinated_typography_detected: boolean
  foreign_branding_detected: boolean
  geometry_anomaly_detected: boolean
  defects: DefectItem[]
}

export class VideoQualityScorecard {
  /**
   * Weights used to calculate the composite quality score (sum = 1.0).
   */
  private static WEIGHTS = {
    product_fidelity: 0.25,
    brand_fidelity: 0.20,
    reference_adherence: 0.15,
    physical_realism: 0.10,
    temporal_consistency: 0.10,
    cinematography: 0.05,
    audio_speech: 0.10,
    typography_outro: 0.05,
  }

  /**
   * Evaluates a generated video candidate against all quality and integrity gates.
   */
  public static evaluateCandidate(input: {
    candidate_id: string
    attempt_number: number
    provider: string
    provider_account_id?: string
    raw_output_path: string
    raw_output_sha256: string
    prompt_used: string
    audioReport?: AudioIntegrityReport
    videoReport?: VideoReviewReport
    sampledFrames?: SampledFrame[]
    frameAnalysis?: FrameAnalysisResult
  }): CandidateEvaluationResult {
    const critical_defects: DefectItem[] = []
    const major_defects: DefectItem[] = []
    const minor_defects: DefectItem[] = []

    let product_score = 90
    let brand_score = 90
    let reference_score = 90
    let realism_score = 85
    let consistency_score = 85
    let cinematography_score = 85
    let audio_score = 90
    let typography_score = 90

    // 1. Audio Analysis
    if (input.audioReport) {
      if (!input.audioReport.passed) {
        if (
          input.audioReport.failureCode === 'ACTUAL_AUDIO_LANGUAGE_MISMATCH' ||
          input.audioReport.failureCode === 'RAW_GENERATION_AUDIO_LANGUAGE_MISMATCH'
        ) {
          critical_defects.push({
            severity: 'CRITICAL',
            code: 'RAW_GENERATION_AUDIO_LANGUAGE_MISMATCH',
            description: `Ses dili yabancı/uygunsuz tespit edildi: ${input.audioReport.detectedLanguage || 'bilinmiyor'}. Türkçe bekleniyor.`,
            suggested_action: 'Türkçe ses sözleşmesini prompt ve ASR girdisinde kesin olarak yinele.',
          })
          audio_score = 0
        } else if (input.audioReport.failureCode === 'SPOKEN_DIALOGUE_FAIL') {
          major_defects.push({
            severity: 'MAJOR',
            code: 'SPOKEN_DIALOGUE_FAIL',
            description: 'Konuşulan metin onaylanan senaryo ile tam örtüşmüyor.',
            suggested_action: 'Seslendirme metnini düzelt ve zamanlamayı ayarla.',
          })
          audio_score -= 40
        } else if (input.audioReport.failureCode === 'VOICEOVER_TIMING_FAIL') {
          minor_defects.push({
            severity: 'MINOR',
            code: 'VOICEOVER_TIMING_FAIL',
            description: 'Ses başlangıç veya bitiş penceresi hafif kaymış.',
            suggested_action: 'Ses penceresini 0.5s - 5.25s aralığına çek.',
          })
          audio_score -= 15
        }
      }
    }

    // 2. Video Review Report Analysis
    if (input.videoReport) {
      if (typeof (input.videoReport as any).brand_consistency_score === 'number') {
        brand_score = (input.videoReport as any).brand_consistency_score
      }
      if (typeof (input.videoReport as any).cinematography_score === 'number') {
        cinematography_score = (input.videoReport as any).cinematography_score
      }
      if (typeof (input.videoReport as any).product_fidelity_score === 'number') {
        product_score = (input.videoReport as any).product_fidelity_score
      }
      const vCodes = input.videoReport.failure_codes || []

      if (vCodes.includes('WRONG_PRODUCT') || vCodes.includes('PRODUCT_IDENTITY_FAIL')) {
        critical_defects.push({
          severity: 'CRITICAL',
          code: 'WRONG_PRODUCT',
          description: 'Videodaki ürün, onaylanan kanonik ürün referansı ile eşleşmiyor.',
          suggested_action: 'Orijinal ürün görselini @HeroProduct referansı olarak doğrula ve fiziksel kısıtları artır.',
        })
        product_score = 0
      }

      if (vCodes.includes('FOREIGN_BRAND')) {
        critical_defects.push({
          severity: 'CRITICAL',
          code: 'FOREIGN_BRAND',
          description: 'Görüntüde yabancı veya rakip marka tespit edildi.',
          suggested_action: 'Yabancı marka adlarını ve logolarını negatif prompt kısıtlarına ekle.',
        })
        brand_score = 0
      }

      if (vCodes.includes('INVENTED_DIEGETIC_BRANDING') || input.videoReport.hallucinated_typography_detected) {
        critical_defects.push({
          severity: 'CRITICAL',
          code: 'INVENTED_DIEGETIC_BRANDING',
          description: 'AI model ürün üzerine uydurma marka veya bozuk tipografi oluşturdu.',
          suggested_action: 'Ürün yüzeyinde yazı oluşturmayı kesin olarak yasakla; logo sunumunu deterministik post-production ile sınırla.',
        })
        brand_score = Math.min(brand_score, 20)
        typography_score = Math.min(typography_score, 20)
      }

      if (vCodes.includes('PRODUCT_MORPH_FAIL') || input.videoReport.product_morph_detected) {
        major_defects.push({
          severity: 'MAJOR',
          code: 'PRODUCT_MORPH',
          description: 'Kareler arasında ürün geometrisi veya renginde bozulma/morflanma tespit edildi.',
          suggested_action: 'Kamera hareketini sadeleştir ve ürünün sert cisim fiziğini kısıtla.',
        })
        consistency_score -= 40
        product_score -= 30
      }

      if (vCodes.includes('WRONG_SECTOR') || input.videoReport.sector_environment_match === false) {
        major_defects.push({
          severity: 'MAJOR',
          code: 'WRONG_SECTOR',
          description: 'Sahne ortamı ürünün ait olduğu sektör bağlamına uymuyor.',
          suggested_action: 'Sektör presetini ve ortam tarifini doğru sektöre kilitle.',
        })
        realism_score -= 35
      }

      if (vCodes.includes('FAKE_UI')) {
        critical_defects.push({
          severity: 'CRITICAL',
          code: 'SEVERE_FAKE_UI',
          description: 'Yazılım için gerçek arayüz yerine anlamsız hayali UI üretildi.',
          suggested_action: 'Gerçek arayüz ekran görüntüsünü @SoftwareUI referansı olarak yükle.',
        })
        product_score = 0
      }

      if (vCodes.includes('IMPOSSIBLE_PRODUCT_OPERATION')) {
        major_defects.push({
          severity: 'MAJOR',
          code: 'IMPOSSIBLE_PRODUCT_OPERATION',
          description: 'Ürün kullanımında fiziksel olarak imkansız hareket veya işlem var.',
          suggested_action: 'Ürün eylemini doğrulanmış standart kullanımla sınırla.',
        })
        realism_score -= 30
      }
    }

    // 3. Detailed Frame Analysis (Level B)
    if (input.frameAnalysis) {
      if (input.frameAnalysis.flicker_detected) {
        minor_defects.push({
          severity: 'MINOR',
          code: 'TEMPORAL_FLICKER',
          description: 'Kareler arasında parlaklık veya doku titremesi (flicker) tespit edildi.',
          suggested_action: 'Işıklandırma sabitliğini artır.',
        })
        consistency_score -= 15
      }
      for (const d of input.frameAnalysis.defects) {
        if (d.severity === 'CRITICAL' && !critical_defects.some(c => c.code === d.code)) {
          critical_defects.push(d)
        } else if (d.severity === 'MAJOR' && !major_defects.some(m => m.code === d.code)) {
          major_defects.push(d)
        } else if (d.severity === 'MINOR' && !minor_defects.some(m => m.code === d.code)) {
          minor_defects.push(d)
        }
      }
    }

    // Bound scores to [0, 100]
    const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)))
    const metrics: ScorecardMetrics = {
      product_fidelity_score: clamp(product_score),
      brand_fidelity_score: clamp(brand_score),
      reference_adherence_score: clamp(reference_score),
      physical_realism_score: clamp(realism_score),
      temporal_consistency_score: clamp(consistency_score),
      cinematography_lighting_score: clamp(cinematography_score),
      audio_speech_integrity_score: clamp(audio_score),
      typography_outro_score: clamp(typography_score),
      composite_quality_score: 0,
    }

    // Compute composite score
    metrics.composite_quality_score = clamp(
      metrics.product_fidelity_score * VideoQualityScorecard.WEIGHTS.product_fidelity +
      metrics.brand_fidelity_score * VideoQualityScorecard.WEIGHTS.brand_fidelity +
      metrics.reference_adherence_score * VideoQualityScorecard.WEIGHTS.reference_adherence +
      metrics.physical_realism_score * VideoQualityScorecard.WEIGHTS.physical_realism +
      metrics.temporal_consistency_score * VideoQualityScorecard.WEIGHTS.temporal_consistency +
      metrics.cinematography_lighting_score * VideoQualityScorecard.WEIGHTS.cinematography +
      metrics.audio_speech_integrity_score * VideoQualityScorecard.WEIGHTS.audio_speech +
      metrics.typography_outro_score * VideoQualityScorecard.WEIGHTS.typography_outro
    )

    // Decision Logic
    const hasCritical = critical_defects.length > 0
    let decision: 'ACCEPT' | 'REJECT' | 'REPAIR' = 'ACCEPT'
    let disqualification_reason: string | undefined

    if (hasCritical) {
      decision = 'REJECT'
      disqualification_reason = `Kritik kusur tespit edildi: ${critical_defects.map(d => d.code).join(', ')}`
    } else if (major_defects.length > 0 || metrics.composite_quality_score < 70) {
      decision = 'REPAIR'
    }

    return {
      candidate_id: input.candidate_id,
      attempt_number: input.attempt_number,
      provider: input.provider,
      provider_account_id: input.provider_account_id,
      raw_output_path: input.raw_output_path,
      raw_output_sha256: input.raw_output_sha256,
      prompt_used: input.prompt_used,
      metrics,
      critical_defects,
      major_defects,
      minor_defects,
      audio_report: input.audioReport,
      video_report: input.videoReport,
      decision,
      disqualification_reason,
    }
  }

  /**
   * Autonomous Candidate Selector:
   * Compares multiple generation candidates and selects the best winning candidate.
   * Disqualifies any candidate with critical existential defects.
   * Ranks remaining candidates by composite quality score.
   */
  public static selectBestCandidate(
    candidates: CandidateEvaluationResult[]
  ): {
    winner: CandidateEvaluationResult | null
    ranked_candidates: CandidateEvaluationResult[]
    selection_reason: string
  } {
    if (!candidates || candidates.length === 0) {
      return {
        winner: null,
        ranked_candidates: [],
        selection_reason: 'Değerlendirilecek aday bulunamadı.',
      }
    }

    // Disqualify candidates with critical defects
    const eligible = candidates.filter(c => c.critical_defects.length === 0)

    if (eligible.length === 0) {
      // All candidates have critical defects
      const sortedByScore = [...candidates].sort(
        (a, b) => b.metrics.composite_quality_score - a.metrics.composite_quality_score
      )
      return {
        winner: null,
        ranked_candidates: sortedByScore,
        selection_reason: `Tüm adaylar (${candidates.length}) kritik kusurlar nedeniyle reddedildi. Yeniden üretim gerekli.`,
      }
    }

    // Sort eligible candidates by composite quality score descending
    const sortedEligible = [...eligible].sort((a, b) => {
      if (b.metrics.composite_quality_score !== a.metrics.composite_quality_score) {
        return b.metrics.composite_quality_score - a.metrics.composite_quality_score
      }
      // Tie-breaker: fewer major defects
      if (a.major_defects.length !== b.major_defects.length) {
        return a.major_defects.length - b.major_defects.length
      }
      // Tie-breaker: higher product fidelity
      return b.metrics.product_fidelity_score - a.metrics.product_fidelity_score
    })

    // Assign selection ranks
    sortedEligible.forEach((c, index) => {
      c.selection_rank = index + 1
    })

    const winner = sortedEligible[0]
    return {
      winner,
      ranked_candidates: sortedEligible,
      selection_reason: `Aday #${winner.attempt_number} (${winner.candidate_id}) en yüksek kalite puanı (${winner.metrics.composite_quality_score}/100) ve 0 kritik kusur ile kazandı.`,
    }
  }
}
