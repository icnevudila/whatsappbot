/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * AUDIO MASTERING & DURATION GATE ENGINE (V6)
 * 
 * Kesin Standart:
 * 1. EBU R128 Loudness Normalization (Sosyal Medya Standardı: -14 LUFS, True Peak <= -1.0 dBTP)
 * 2. Audio Duration Gate: abs(video_duration - audio_duration) <= 250ms
 *    Tolerans aşılırsa veya sessiz kuyruk tespit edilirse: FINALIZATION_FAILED_AUDIO_DURATION_MISMATCH
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOUDNESS_PRESETS = {
  social_media: { targetI: -14.0, targetTp: -1.0, targetLra: 11.0 },
  broadcast: { targetI: -23.0, targetTp: -1.0, targetLra: 7.0 },
  cinematic: { targetI: -18.0, targetTp: -1.5, targetLra: 14.0 },
};

/**
 * ffprobe ile video ve ses akış sürelerini milisaniyelik hassasiyetle okur.
 */
function probeMediaDurations(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`MEDIA_FILE_NOT_FOUND: ${filePath}`);
  }

  try {
    const cmd = `ffprobe -v error -show_entries format=duration:stream=codec_type,duration -of json "${filePath}"`;
    const out = execSync(cmd, { encoding: 'utf-8' });
    const parsed = JSON.parse(out);

    const formatDur = parseFloat(parsed.format?.duration || '0');
    let videoDur = 0;
    let audioDur = 0;

    if (Array.isArray(parsed.streams)) {
      for (const s of parsed.streams) {
        if (s.codec_type === 'video') {
          videoDur = parseFloat(s.duration || formatDur.toString());
        } else if (s.codec_type === 'audio') {
          audioDur = parseFloat(s.duration || formatDur.toString());
        }
      }
    }

    // Ses akışı yoksa audioDur 0 kalır
    return {
      formatDuration: formatDur,
      videoDuration: videoDur || formatDur,
      audioDuration: audioDur,
      hasAudio: audioDur > 0
    };
  } catch (err) {
    throw new Error(`FFPROBE_DURATION_FAILED: ${err.message}`);
  }
}

/**
 * Audio Duration Gate: Video ve ses süresi farkı toleransı aşarsa hata fırlatır.
 */
function verifyAudioDurationAlignment(videoDur, audioDur, toleranceSec = 0.25) {
  if (audioDur <= 0) {
    // Sessiz video istenen bir durum değilse
    const err = new Error('FINALIZATION_FAILED_AUDIO_DURATION_MISMATCH: Videoda ses akışı bulunamadı!');
    err.code = 'FINALIZATION_FAILED_AUDIO_DURATION_MISMATCH';
    throw err;
  }

  const delta = Math.abs(videoDur - audioDur);
  if (delta > toleranceSec) {
    const err = new Error(
      `FINALIZATION_FAILED_AUDIO_DURATION_MISMATCH: Video süresi (${videoDur.toFixed(2)}s) ile ses süresi (${audioDur.toFixed(2)}s) arasındaki fark (${delta.toFixed(2)}s) izin verilen ${toleranceSec}s toleransını aşıyor. Sessiz video kuyruğu (silent tail) tespit edildi!`
    );
    err.code = 'FINALIZATION_FAILED_AUDIO_DURATION_MISMATCH';
    err.delta = delta;
    err.videoDuration = videoDur;
    err.audioDuration = audioDur;
    throw err;
  }

  return {
    valid: true,
    delta,
    videoDuration: videoDur,
    audioDuration: audioDur
  };
}

/**
 * EBU R128 Standartlarında Loudness Normalizasyonu ve Mastering
 * @param {string} inputVideoPath Girdi video dosya yolu
 * @param {string} outputVideoPath Çıktı dosya yolu
 * @param {'social_media' | 'broadcast' | 'cinematic'} preset Hedef preset
 */
function masterAudioLoudness(inputVideoPath, outputVideoPath, preset = 'social_media') {
  if (!fs.existsSync(inputVideoPath)) {
    throw new Error(`MASTERING_FILE_MISSING: ${inputVideoPath}`);
  }

  const cfg = LOUDNESS_PRESETS[preset] || LOUDNESS_PRESETS.social_media;
  console.log(`[AudioMaster] 🎚️ EBU R128 Mastering başlatılıyor: Hedef ${cfg.targetI} LUFS, Max TP ${cfg.targetTp} dBTP (${preset})`);

  // loudnorm filtresi ile tek geçişli veya iki geçişli normalizasyon
  const loudnormFilter = `loudnorm=I=${cfg.targetI}:TP=${cfg.targetTp}:LRA=${cfg.targetLra}`;
  const cmd = `ffmpeg -y -i "${inputVideoPath}" -af "${loudnormFilter}" -c:v copy -c:a aac -b:a 192k -ar 48000 -movflags +faststart "${outputVideoPath}"`;

  try {
    execSync(cmd, { stdio: 'ignore', timeout: 60000 });
    if (!fs.existsSync(outputVideoPath) || fs.statSync(outputVideoPath).size < 10000) {
      throw new Error('Mastering çıktısı diske yazılamadı veya boyutu çok küçük.');
    }
    console.log(`[AudioMaster] ✅ Mastering Başarılı: ${path.basename(outputVideoPath)}`);
    return outputVideoPath;
  } catch (err) {
    console.warn(`[AudioMaster] ⚠️ ffmpeg loudnorm hatası: ${err.message}`);
    throw err;
  }
}

module.exports = {
  probeMediaDurations,
  verifyAudioDurationAlignment,
  masterAudioLoudness,
  LOUDNESS_PRESETS
};
