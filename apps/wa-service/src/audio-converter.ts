import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { logger } from './logger.js'

export interface ProcessedVoiceNote {
  buffer: Buffer
  durationSeconds: number
  waveform: Uint8Array
}

// In-memory cache so repeated voice notes (e.g. in campaigns) are converted only once
const voiceNoteCache = new Map<string, ProcessedVoiceNote>()

/**
 * Downloads audio and ensures it is converted to WhatsApp standard PTT voice note:
 * - Container: OGG
 * - Codec: Opus (libopus, 32k VBR)
 * - Sample rate: 48000 Hz, 1 channel (mono)
 * - Exact duration in seconds
 * - 64-point normalized waveform bytes (0-100)
 */
export async function prepareVoiceNote(mediaUrlOrBuffer: string | Buffer): Promise<ProcessedVoiceNote> {
  const cacheKey = typeof mediaUrlOrBuffer === 'string' ? mediaUrlOrBuffer : null
  if (cacheKey && voiceNoteCache.has(cacheKey)) {
    return voiceNoteCache.get(cacheKey)!
  }

  let inputBuffer: Buffer
  if (typeof mediaUrlOrBuffer === 'string') {
    const res = await fetch(mediaUrlOrBuffer)
    if (!res.ok) {
      throw new Error(`Ses dosyası indirilemedi (HTTP ${res.status})`)
    }
    inputBuffer = Buffer.from(await res.arrayBuffer())
  } else {
    inputBuffer = mediaUrlOrBuffer
  }

  const tmpDir = os.tmpdir()
  const rand = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const inPath = path.join(tmpDir, `wa_in_${rand}.bin`)
  const outPath = path.join(tmpDir, `wa_out_${rand}.ogg`)

  await fs.writeFile(inPath, inputBuffer)

  try {
    // 1. Convert to Ogg Opus with WhatsApp standard PTT parameters
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('ffmpeg', [
        '-y',
        '-i', inPath,
        '-vn',
        '-c:a', 'libopus',
        '-b:a', '32k',
        '-vbr', 'on',
        '-compression_level', '10',
        '-ac', '1',
        '-ar', '48000',
        '-f', 'ogg',
        outPath,
      ])

      let stderr = ''
      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString()
      })

      proc.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(`FFmpeg ses dönüşümü başarısız (kod ${code}): ${stderr.slice(-200)}`))
      })
      proc.on('error', reject)
    })

    const convertedBuffer = await fs.readFile(outPath)

    // 2. Extract PCM to compute exact duration & 64-point waveform
    let durationSeconds = 1
    const waveform = new Uint8Array(64)

    try {
      const rawPcm = await new Promise<Buffer>((resolve, reject) => {
        const proc = spawn('ffmpeg', [
          '-y',
          '-i', outPath,
          '-ac', '1',
          '-ar', '16000',
          '-f', 's16le',
          '-',
        ])

        const chunks: Buffer[] = []
        proc.stdout.on('data', (chunk) => chunks.push(chunk))
        proc.on('close', (code) => {
          if (code === 0) resolve(Buffer.concat(chunks))
          else reject(new Error('PCM dalga boyu çıkarılamadı'))
        })
        proc.on('error', reject)
      })

      // 16000 Hz, 1 channel, 16-bit (2 bytes per sample) -> 32000 bytes per second
      const totalSamples = Math.floor(rawPcm.length / 2)
      durationSeconds = Math.max(1, Math.round(totalSamples / 16000))

      if (totalSamples >= 64) {
        const samples = new Int16Array(rawPcm.buffer, rawPcm.byteOffset, totalSamples)
        const blockSize = Math.floor(totalSamples / 64)
        const filtered = new Float32Array(64)

        for (let i = 0; i < 64; i++) {
          let sum = 0
          const start = i * blockSize
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(samples[start + j] ?? 0)
          }
          filtered[i] = sum / blockSize
        }

        let maxVal = 0
        for (let i = 0; i < 64; i++) {
          const val = filtered[i] ?? 0
          if (val > maxVal) maxVal = val
        }
        if (maxVal === 0) maxVal = 1

        for (let i = 0; i < 64; i++) {
          const val = filtered[i] ?? 0
          waveform[i] = Math.min(100, Math.round((val / maxVal) * 100))
        }
      }
    } catch (pcmErr) {
      logger.warn({ err: pcmErr }, 'PCM waveform hesabı başarısız, varsayılan waveform kullanılacak')
    }

    const result: ProcessedVoiceNote = {
      buffer: convertedBuffer,
      durationSeconds,
      waveform,
    }

    if (cacheKey) {
      // Limit cache size to 50 items
      if (voiceNoteCache.size > 50) {
        const firstKey = voiceNoteCache.keys().next().value
        if (firstKey) voiceNoteCache.delete(firstKey)
      }
      voiceNoteCache.set(cacheKey, result)
    }

    return result
  } finally {
    await fs.unlink(inPath).catch(() => {})
    await fs.unlink(outPath).catch(() => {})
  }
}
