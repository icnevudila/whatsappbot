import { existsSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import http from 'node:http'

export interface AudioIntegrityRequest {
  audioFilePath?: string
  videoFilePath?: string
  expectedLanguage?: string // e.g. 'tr' or 'tr-TR'
  expectedDialogue?: string
  whisperUrl?: string
  isMock?: boolean
  mockDetectedLanguage?: string
  mockTranscript?: string
}

export type AudioIntegrityFailureCode =
  | 'MISSING_AUDIO_TRACK'
  | 'ACTUAL_AUDIO_LANGUAGE_MISMATCH'
  | 'RAW_GENERATION_AUDIO_LANGUAGE_MISMATCH'
  | 'VOICEOVER_PATCH_FORBIDDEN'
  | 'SPOKEN_DIALOGUE_FAIL'
  | 'FOREIGN_AUDIO_LEAKAGE'
  | 'SILENT_AUDIO_TRACK'
  | 'AUDIO_VERIFICATION_UNAVAILABLE'

export interface AudioIntegrityReport {
  passed: boolean
  failureCode?: AudioIntegrityFailureCode
  detectedLanguage?: string
  languageConfidence?: number
  transcript?: string
  audioDurationSec?: number
  issues: string[]
  details: string
}

/**
 * AudioIntegrityGate.
 * Fail-closed perceptual and linguistic gate verifying that the actual speech in
 * the rendered audio/video output matches the target language (e.g. Turkish)
 * and does not leak foreign/English narration.
 */
export class AudioIntegrityGate {
  private static defaultWhisperUrl = 'http://167.233.201.31:3457/transcribe'

  /**
   * Helper to perform Whisper transcription via HTTP request.
   */
  private static async callWhisper(
    base64Audio: string,
    whisperUrl: string
  ): Promise<{ text: string; language: string; language_probability?: number; duration?: number }> {
    return new Promise((resolve, reject) => {
      try {
        const parsed = new URL(whisperUrl)
        const payload = JSON.stringify({ audio_base64: base64Audio })
        const req = http.request(
          {
            hostname: parsed.hostname,
            port: parsed.port || 80,
            path: parsed.pathname,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            },
            timeout: 25000,
          },
          res => {
            let data = ''
            res.on('data', chunk => {
              data += chunk
            })
            res.on('end', () => {
              try {
                const parsedRes = JSON.parse(data)
                if (parsedRes.success === false) {
                  return reject(new Error(parsedRes.error || 'Whisper transcription failed'))
                }
                resolve(parsedRes)
              } catch (e: any) {
                reject(new Error(`Failed to parse Whisper response: ${e.message} (Raw: ${data.slice(0, 100)})`))
              }
            })
          }
        )
        req.on('error', err => reject(err))
        req.on('timeout', () => {
          req.destroy()
          reject(new Error('Whisper request timed out'))
        })
        req.write(payload)
        req.end()
      } catch (err: any) {
        reject(err)
      }
    })
  }

  /**
   * Evaluates the audio integrity of an output video or audio file.
   */
  public static async evaluateAudioIntegrity(req: AudioIntegrityRequest): Promise<AudioIntegrityReport> {
    const issues: string[] = []
    const expectedLang = (req.expectedLanguage || 'tr').toLowerCase().split('-')[0] // 'tr' from 'tr-TR'

    // Mock testing bypass for unit test isolation
    if (req.isMock) {
      const mockLang = (req.mockDetectedLanguage || 'tr').toLowerCase()
      const mockTranscript = req.mockTranscript ?? 'Ayvazoglu Insaat ile guclu temeller.'

      if (mockLang !== expectedLang) {
        return {
          passed: false,
          failureCode: 'ACTUAL_AUDIO_LANGUAGE_MISMATCH',
          detectedLanguage: mockLang,
          languageConfidence: 0.95,
          transcript: mockTranscript,
          audioDurationSec: 8.0,
          issues: [`ACTUAL_AUDIO_LANGUAGE_MISMATCH: Detected language "${mockLang}", expected "${expectedLang}".`],
          details: `Mock audio language failure: detected ${mockLang} vs expected ${expectedLang}.`,
        }
      }

      // Check English tokens in mock
      const enTokens = ['red clay', 'built for excellence', 'strongest foundations', 'for the future']
      const lowerMock = mockTranscript.toLowerCase()
      for (const tok of enTokens) {
        if (lowerMock.includes(tok)) {
          return {
            passed: false,
            failureCode: 'ACTUAL_AUDIO_LANGUAGE_MISMATCH',
            detectedLanguage: 'en',
            languageConfidence: 0.99,
            transcript: mockTranscript,
            audioDurationSec: 8.0,
            issues: [`ACTUAL_AUDIO_LANGUAGE_MISMATCH: Detected foreign English speech token "${tok}".`],
            details: `Found English spoken token "${tok}" in transcript.`,
          }
        }
      }

      return {
        passed: true,
        detectedLanguage: 'tr',
        languageConfidence: 0.99,
        transcript: mockTranscript,
        audioDurationSec: 8.0,
        issues: [],
        details: 'Mock audio passed Turkish language verification.',
      }
    }

    const targetFile = req.audioFilePath || req.videoFilePath
    if (!targetFile || !existsSync(targetFile)) {
      return {
        passed: false,
        failureCode: 'MISSING_AUDIO_TRACK',
        issues: [`Target audio/video file not found at: ${targetFile}`],
        details: 'Missing audio or video deliverable file for audio QA.',
      }
    }

    // Extract audio bytes via FFmpeg
    let audioBuffer: Buffer
    let audioDuration = 0

    try {
      // 1. Probe audio stream presence & duration
      const probeOutput = execFileSync(
        'ffprobe',
        [
          '-v',
          'error',
          '-select_streams',
          'a:0',
          '-show_entries',
          'stream=codec_type,duration:format=duration',
          '-of',
          'json',
          targetFile,
        ],
        { timeout: 10000 }
      )
      const probeData = JSON.parse(probeOutput.toString('utf-8'))
      const stream = probeData.streams?.[0]
      if (!stream || stream.codec_type !== 'audio') {
        return {
          passed: false,
          failureCode: 'MISSING_AUDIO_TRACK',
          issues: ['No audio stream found in media container.'],
          details: 'Video file contains no audio streams (silent/mute).',
        }
      }

      audioDuration = parseFloat(stream.duration || probeData.format?.duration || '0')
      if (audioDuration < 0.5) {
        return {
          passed: false,
          failureCode: 'SILENT_AUDIO_TRACK',
          issues: [`Audio track duration too short: ${audioDuration.toFixed(2)}s.`],
          details: 'Audio track is near zero duration.',
        }
      }

      // 2. Extract 16kHz mono MP3 for optimal Whisper transcription
      audioBuffer = execFileSync(
        'ffmpeg',
        [
          '-y',
          '-i',
          targetFile,
          '-vn',
          '-ar',
          '16000',
          '-ac',
          '1',
          '-c:a',
          'libmp3lame',
          '-b:a',
          '64k',
          '-f',
          'mp3',
          'pipe:1',
        ],
        { maxBuffer: 15 * 1024 * 1024, timeout: 20000 }
      )
    } catch (err: any) {
      return {
        passed: false,
        failureCode: 'MISSING_AUDIO_TRACK',
        issues: [`FFmpeg audio extraction failed: ${err.message}`],
        details: 'Failed to inspect audio stream via FFmpeg.',
      }
    }

    // 3. Call Whisper ASR for actual speech & language detection
    const b64 = audioBuffer.toString('base64')
    const whisperUrl = req.whisperUrl || AudioIntegrityGate.defaultWhisperUrl

    let whisperRes: { text: string; language: string; language_probability?: number; duration?: number }
    try {
      whisperRes = await AudioIntegrityGate.callWhisper(b64, whisperUrl)
    } catch (err: any) {
      // In offline mode where Hetzner whisper is unreachable, check deterministic transcript if provided or fail closed
      return {
        passed: false,
        failureCode: 'AUDIO_VERIFICATION_UNAVAILABLE',
        issues: [`Whisper STT service unreachable: ${err.message}`],
        details: 'Audio speech verification failed due to unavailable ASR service.',
      }
    }

    const detectedLang = (whisperRes.language || '').toLowerCase()
    const transcript = whisperRes.text || ''
    const confidence = whisperRes.language_probability ?? 1.0

    // 4. Verify spoken language matches expected
    if (detectedLang !== expectedLang) {
      return {
        passed: false,
        failureCode: 'ACTUAL_AUDIO_LANGUAGE_MISMATCH',
        detectedLanguage: detectedLang,
        languageConfidence: confidence,
        transcript,
        audioDurationSec: whisperRes.duration || audioDuration,
        issues: [
          `ACTUAL_AUDIO_LANGUAGE_MISMATCH: Actual spoken audio was detected as "${detectedLang.toUpperCase()}" (confidence: ${(confidence * 100).toFixed(1)}%), expected "${expectedLang.toUpperCase()}". Transcript: "${transcript}"`,
        ],
        details: `Spoken dialogue language mismatch. Video had subtitles in ${expectedLang.toUpperCase()}, but audio stream spoke ${detectedLang.toUpperCase()}.`,
      }
    }

    // 5. Foreign / English token presence check (double protection against mixed audio)
    const englishLeakageTokens = [
      'red clay',
      'bricks built',
      'built for excellence',
      'with our expertise',
      'strongest foundations',
      'for the future',
      'clay bricks',
    ]

    const lowerTranscript = transcript.toLowerCase()
    for (const token of englishLeakageTokens) {
      if (lowerTranscript.includes(token)) {
        return {
          passed: false,
          failureCode: 'ACTUAL_AUDIO_LANGUAGE_MISMATCH',
          detectedLanguage: 'en',
          languageConfidence: 0.99,
          transcript,
          audioDurationSec: whisperRes.duration || audioDuration,
          issues: [`ACTUAL_AUDIO_LANGUAGE_MISMATCH: Detected English speech token "${token}" in transcript.`],
          details: `Spoken audio contains English phrase: "${token}".`,
        }
      }
    }

    // 6. Dialogue alignment check if expectedDialogue provided
    if (req.expectedDialogue) {
      const cleanExpected = req.expectedDialogue.toLowerCase().replace(/[^a-z0-9ğüşıöç\s]/gi, '')
      const cleanActual = transcript.toLowerCase().replace(/[^a-z0-9ğüşıöç\s]/gi, '')
      const expectedWords = cleanExpected.split(/\s+/).filter(w => w.length > 3)
      const matchedWords = expectedWords.filter(w => cleanActual.includes(w))
      const matchRatio = expectedWords.length > 0 ? matchedWords.length / expectedWords.length : 1.0

      if (matchRatio < 0.25) {
        return {
          passed: false,
          failureCode: 'SPOKEN_DIALOGUE_FAIL',
          detectedLanguage: detectedLang,
          languageConfidence: confidence,
          transcript,
          audioDurationSec: whisperRes.duration || audioDuration,
          issues: [
            `SPOKEN_DIALOGUE_FAIL: Spoken audio transcript deviates significantly from approved script. Matched ${(matchRatio * 100).toFixed(0)}% of key words.`,
          ],
          details: `Expected script: "${req.expectedDialogue}" vs Actual transcript: "${transcript}"`,
        }
      }
    }

    return {
      passed: true,
      detectedLanguage: detectedLang,
      languageConfidence: confidence,
      transcript,
      audioDurationSec: whisperRes.duration || audioDuration,
      issues: [],
      details: `Spoken dialogue verified as authentic ${detectedLang.toUpperCase()} (ASR: "${transcript}").`,
    }
  }

  /**
   * Pre-Master Audio Gate.
   * Strictly evaluates the RAW generative video output BEFORE any post-production voiceover
   * is applied. If the raw video generated English speech, it FORBIDS post-production
   * voiceover patching and mandates automatic REGENERATE.
   */
  public static async evaluateRawVeoAudio(req: {
    rawVideoPath: string
    expectedLanguage?: string
    whisperUrl?: string
    isMock?: boolean
    mockDetectedLanguage?: string
    mockTranscript?: string
  }): Promise<AudioIntegrityReport> {
    const report = await this.evaluateAudioIntegrity({
      videoFilePath: req.rawVideoPath,
      expectedLanguage: req.expectedLanguage || 'tr',
      whisperUrl: req.whisperUrl,
      isMock: req.isMock,
      mockDetectedLanguage: req.mockDetectedLanguage,
      mockTranscript: req.mockTranscript,
    })

    // If raw video has no speech at all (ambient audio / foley only), it is NOT a foreign language violation!
    // A violation ONLY occurs if actual spoken dialogue was detected in a foreign language (e.g. English speech).
    const hasSpokenDialogue = Boolean(report.transcript && report.transcript.trim().length > 3)
    if (!report.passed && !hasSpokenDialogue && report.failureCode === 'ACTUAL_AUDIO_LANGUAGE_MISMATCH') {
      return {
        ...report,
        passed: true,
        issues: [],
        details: 'Raw video has ambient foley/silence without foreign speech. Clean for voiceover overlay.',
      }
    }

    if (!report.passed) {
      return {
        ...report,
        failureCode: 'RAW_GENERATION_AUDIO_LANGUAGE_MISMATCH',
        issues: [
          `RAW_GENERATION_AUDIO_LANGUAGE_MISMATCH: Raw Veo generation produced ${report.detectedLanguage?.toUpperCase() || 'foreign'} speech ("${report.transcript || ''}"). Voiceover patching is strictly forbidden; must REGENERATE raw footage.`,
          ...report.issues,
        ],
        details: 'Fail closed on raw generative audio defect. No post-production audio cleanup permitted.',
      }
    }

    return report
  }
}

export const PreMasterAudioGate = AudioIntegrityGate
