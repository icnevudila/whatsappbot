/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * AUDIO PLAN & MASTERING GATE (V6 HARDENED)
 * 
 * Standartlar:
 * 1. Loudness Presets:
 *    - social (varsayılan): -14.0 LUFS, true peak <= -1.0 dBTP
 *    - broadcast: -23.0 LUFS, true peak <= -1.0 dBTP
 *    - cinematic: -18.0 LUFS, true peak <= -1.5 dBTP
 *    - custom: yapılandırılabilir LUFS
 * 2. Audio Duration Alignment Gate:
 *    abs(video_duration - audio_duration) <= toleranceSec (varsayılan: 250ms).
 */

import type {
  ResolvedCreativeFacts,
  CreativeDNA,
  DirectorTreatment,
  AudioPlan
} from './creative-types'

export type AudioLoudnessPreset = 'social' | 'social_media' | 'broadcast' | 'cinematic' | 'custom'

export function buildAudioPlan(params: {
  facts: ResolvedCreativeFacts
  dna: CreativeDNA
  treatment: DirectorTreatment
  durationSeconds: number
  customVoiceover?: string | null
  loudnessPreset?: AudioLoudnessPreset
  customTargetLufs?: number
}): AudioPlan {
  const { facts, dna, treatment, durationSeconds, customVoiceover, loudnessPreset = 'social', customTargetLufs } = params
  const product = facts.product.name
  const brand = facts.brandName

  // 1. Süreye Göre Hedef Kelime Yoğunluğu
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

  // 2. Seslendirme Metni Üretimi
  let voText = ''
  if (customVoiceover && customVoiceover.trim().length > 5) {
    voText = customVoiceover.trim().replace(/["']/g, '')
  } else {
    if (durationSeconds <= 12) {
      voText = `${brand} ile ${product}: Dayanıklı malzeme kalitesi ve sahada kanıtlanmış performans. Şimdi doğrudan sipariş verin.`
    } else if (durationSeconds <= 24) {
      voText = `İşinizi şansa bırakmayın. ${brand}, ${product} ile zorlu saha koşullarında kesintisiz verim ve birinci sınıf dayanıklılık sunar. Zamanında teslimat ve doğrudan üretici güvencesi için hemen iletişime geçin.`
    } else {
      voText = `Bir eseri veya hasadı geleceğe taşıyan şey, malzemeye ve emeğe duyulan sarsılmaz sadakattir. ${brand}, ${product} ile üretimin her aşamasında en yüksek standardı belirler. Sahada sıfır taviz, mimaride sarsılmaz sağlamlık. Geleceğinizi ${brand} güvencesiyle inşa edin.`
    }
  }

  const wordCount = voText.split(/\s+/).filter(Boolean).length
  const estimatedDurationSec = Number((wordCount / 2.4).toFixed(1))

  // 3. Müzik Tasarımı
  const music = {
    tempo: treatment.editingRhythm.start.includes('fast') ? 128 : 115,
    instrumentation: dna.brand.premiumLevel === 'luxury' || dna.brand.premiumLevel === 'premium'
      ? ['felt_piano', 'deep_sub_bass', 'organic_percussion']
      : ['acoustic_guitar', 'warm_analog_synth', 'crisp_clap'],
    energyCurve: 'progressive_lift',
    introCharacter: 'ambient_establishing',
    buildSec: Number((durationSeconds * 0.4).toFixed(1)),
    peakSec: Number((durationSeconds * 0.75).toFixed(1)),
    resolutionSec: Number((durationSeconds * 0.95).toFixed(1)),
    duckingDb: -16,
  }

  // 4. Foley & SFX Cues
  const sfxCues = [
    {
      timestampSec: 0.2,
      description: 'Açılış kanca ve atmosfer ses efekti',
      audioEvent: 'impact_whoosh_clean',
    },
    {
      timestampSec: Number((durationSeconds * 0.5).toFixed(1)),
      description: 'Fonksiyonel işlem ve çalışma anı',
      audioEvent: 'subtle_operational_foley',
    },
  ]

  // 5. Loudness Preset Ayarları
  let targetLufs = -14.0
  let targetTp = -1.0
  let presetName: 'social_media' | 'broadcast' | 'cinematic' = 'social_media'

  if (loudnessPreset === 'broadcast') {
    targetLufs = customTargetLufs ?? -23.0
    targetTp = -1.0
    presetName = 'broadcast'
  } else if (loudnessPreset === 'cinematic') {
    targetLufs = customTargetLufs ?? -18.0
    targetTp = -1.5
    presetName = 'cinematic'
  } else if (loudnessPreset === 'custom') {
    targetLufs = customTargetLufs ?? -14.0
    targetTp = -1.0
    presetName = 'social_media'
  } else {
    // social / social_media
    targetLufs = customTargetLufs ?? -14.0
    targetTp = -1.0
    presetName = 'social_media'
  }

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
      integratedLufs: targetLufs,
      truePeakDbTp: targetTp,
      preset: presetName,
    },
    maxDurationToleranceSec: 0.25, // <= 250ms
  }
}

/**
 * Audio Duration Gate: Video ve ses sürelerini milisaniyelik toleransla karşılaştırır.
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
