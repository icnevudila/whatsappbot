/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * AUDIO PLAN & MASTERING GATE (V6)
 * 
 * Kesin İlke:
 * Default olarak Veo = görüntü + doğal ortam sesidir (ambience).
 * Ana seslendirme izole TTS pipeline'ından gelir:
 * SCRIPT -> TTS -> WORD TIMESTAMPS -> MUSIC BED -> SFX -> DUCKING -> MASTERING -> KINETIC SUBTITLES.
 * 
 * Audio Duration Gate:
 * abs(video_duration - audio_duration) <= 250ms.
 * Fark toleransı aşarsa: FINALIZATION_FAILED_AUDIO_DURATION_MISMATCH.
 * Final video sessiz son birkaç saniye içeremez!
 */

import type {
  ResolvedCreativeFacts,
  CreativeDNA,
  DirectorTreatment,
  AudioPlan
} from './creative-types'

export function buildAudioPlan(params: {
  facts: ResolvedCreativeFacts
  dna: CreativeDNA
  treatment: DirectorTreatment
  durationSeconds: number
  customVoiceover?: string | null
}): AudioPlan {
  const { facts, dna, treatment, durationSeconds, customVoiceover } = params
  const product = facts.product.name
  const brand = facts.brandName

  // 1. Süreye Göre Hedef Kelime Yoğunluğu
  // 10s: 15-24 | 20s: 35-50 | 30s: 55-75 | 40s: 70-95 | 60s: 100-135
  let targetMinWords = 15
  let targetMaxWords = 24
  if (durationSeconds > 12 && durationSeconds <= 24) {
    targetMinWords = 35
    targetMaxWords = 50
  } else if (durationSeconds > 24 && durationSeconds <= 35) {
    targetMinWords = 55
    targetMaxWords = 75
  } else if (durationSeconds > 35 && durationSeconds <= 45) {
    targetMinWords = 70
    targetMaxWords = 95
  } else if (durationSeconds > 45) {
    targetMinWords = 100
    targetMaxWords = 135
  }

  // 2. Seslendirme Metni Üretimi (Doğal Türkçe, sıfır devrik cümle, sıfır ucuz klişe)
  let voText = ''
  if (customVoiceover && customVoiceover.trim().length > 5) {
    voText = customVoiceover.trim().replace(/["']/g, '')
  } else {
    if (durationSeconds <= 12) {
      voText = `${brand} ile ${product}: Dayanıklı malzeme kalitesi ve sahada kanıtlanmış performans. Şimdi doğrudan sipariş verin.`
    } else if (durationSeconds <= 24) {
      voText = `İşinizi şansa bırakmayın. ${brand}, ${product} ile zorlu saha koşullarında kesintisiz verim ve birinci sınıf dayanıklılık sunar. Zamanında teslimat ve doğrudan üretici güvencesi için hemen iletişime geçin.`
    } else {
      voText = `Bir eseri veya hasadı ayakta tutan, temelindeki malzemenin tavizsiz kalitesidir. ${brand}, ${product} ile ilk andan nihai sonuca kadar sarsılmaz bir güven inşa eder. Yüksek standart, kesintisiz stok ve doğrudan teslimatla yanınızdayız.`
    }
  }

  const wordCount = voText.split(/\s+/).filter(Boolean).length
  const estimatedDurationSec = Math.min(durationSeconds - 0.5, Math.max(2.0, wordCount * 0.42))

  // 3. Müzik ve SFX Planı (Director Treatment'tan türetilir)
  const isIndustrial = dna.brand.premiumLevel === 'industrial_grade'
  const music: AudioPlan['music'] = {
    tempo: isIndustrial ? 112 : 118,
    instrumentation: isIndustrial
      ? ['acoustic rhythmic percussion', 'deep solid bass line', 'subtle metallic strikes']
      : ['modern clean synths', 'uplifting light commercial pulse', 'organic piano accents'],
    energyCurve: '0-2s dikkat çeken başlangıç, orta bölümde dengeli ritim, 6. saniyede zirve, kapanışta temiz sönümlenme',
    introCharacter: 'Temiz ve dikkat toplayıcı sparse giriş',
    buildSec: Number((durationSeconds * 0.4).toFixed(1)),
    peakSec: Number((durationSeconds * 0.8).toFixed(1)),
    resolutionSec: durationSeconds,
    duckingDb: -14, // Spiker konuşurken müziğin -14 dB bastırılması
  }

  const sfxCues: AudioPlan['sfxCues'] = [
    {
      timestampSec: 0.3,
      description: 'İlk temas ve eylem başlangıcı ses efekti',
      audioEvent: isIndustrial ? 'heavy_material_foley_thud' : 'clean_mechanical_click',
    },
    {
      timestampSec: Number((durationSeconds * 0.5).toFixed(1)),
      description: 'Fonksiyonel işlem ve çalışma anı',
      audioEvent: 'subtle_operational_foley',
    },
  ]

  return {
    fullVoiceoverText: voText,
    wordCount,
    estimatedDurationSec,
    targetLanguage: facts.campaign.language || 'tr',
    speakerIdentity: {
      id: 'spk_commercial_lead_tr',
      tone: dna.brand.communicationTone[0] || 'authoritative, clear, trusted',
      gender: 'male',
      pacingWordsPerMinute: 140,
    },
    music,
    sfxCues,
    loudnessTarget: {
      integratedLufs: -14.0, // Sosyal medya ve dijital reklam standardı
      truePeakDbTp: -1.0,
      preset: 'social_media',
    },
    maxDurationToleranceSec: 0.25, // <= 250ms
  }
}

/**
 * Audio Duration Gate: Video ve ses sürelerini milisaniyelik toleransla karşılaştırır.
 * 38s video + 33.7s audio gibi sessiz kuyruk (silent tail) bırakan videoları reddeder.
 */
export function verifyAudioDurationGate(
  videoDurationSec: number,
  audioDurationSec: number,
  toleranceSec = 0.25
): { passed: boolean; deltaSec: number; error?: string } {
  const delta = Math.abs(videoDurationSec - audioDurationSec)
  if (delta > toleranceSec) {
    return {
      passed: false,
      deltaSec: Number(delta.toFixed(3)),
      error: `FINALIZATION_FAILED_AUDIO_DURATION_MISMATCH: Video süresi (${videoDurationSec.toFixed(2)}s) ile ses miksi süresi (${audioDurationSec.toFixed(2)}s) arasındaki fark (${delta.toFixed(2)}s) izin verilen ${toleranceSec}s toleransını aşıyor. Sessiz video kuyruğu tespit edildi!`,
    }
  }

  return {
    passed: true,
    deltaSec: Number(delta.toFixed(3)),
  }
}
