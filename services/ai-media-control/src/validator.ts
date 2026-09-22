/**
 * Output Validation Pipeline
 * 
 * - ffprobe: Video metadata inspection (duration, resolution, codec, fps)
 * - sha256: Cryptographic hash for integrity and dedup
 * - Visual QA: Duration-aware frame extraction at %10, %50, %90 positions
 * 
 * ALL checks must pass before an output can be marked as verified.
 */

import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { promisify } from 'node:util'
import { join, dirname } from 'node:path'
import { mkdir } from 'node:fs/promises'

const execFileAsync = promisify(execFile)

export interface FfprobeResult {
  duration: number
  width: number
  height: number
  fps: number
  vcodec: string
  acodec: string | null
}

export interface ValidationReport {
  ffprobe: FfprobeResult
  sha256: string
  qaFramePaths: {
    frame10: string
    frame50: string
    frame90: string
  }
  aspectRatioOk: boolean
  durationOk: boolean
  codecOk: boolean
  verified: boolean
  errors: string[]
}

/**
 * Run ffprobe on a video file and return structured metadata.
 */
export async function runFfprobe(filePath: string): Promise<FfprobeResult> {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_streams',
    '-show_format',
    filePath,
  ])

  const data = JSON.parse(stdout)
  const videoStream = data.streams?.find((s: any) => s.codec_type === 'video')
  const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio')

  if (!videoStream) {
    throw new Error('No video stream found in output file')
  }

  const fps = videoStream.r_frame_rate
    ? eval(videoStream.r_frame_rate)  // e.g. "24/1" -> 24
    : 0

  return {
    duration: parseFloat(data.format?.duration || videoStream.duration || '0'),
    width: videoStream.width || 0,
    height: videoStream.height || 0,
    fps: Math.round(fps * 100) / 100,
    vcodec: videoStream.codec_name || 'unknown',
    acodec: audioStream?.codec_name || null,
  }
}

/**
 * Compute SHA-256 hash of a file.
 */
export async function computeSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(filePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

/**
 * Extract 3 QA frames at duration-aware positions: %10, %50, %90.
 * NOT fixed seconds — adapts to actual video duration.
 */
export async function extractQaFrames(
  filePath: string,
  duration: number,
  outputDir: string,
): Promise<{ frame10: string; frame50: string; frame90: string }> {
  await mkdir(outputDir, { recursive: true })

  const positions = {
    frame10: Math.max(0.1, duration * 0.10),
    frame50: Math.max(0.5, duration * 0.50),
    frame90: Math.max(1.0, duration * 0.90),
  }

  const paths: Record<string, string> = {}

  for (const [name, timestamp] of Object.entries(positions)) {
    const outPath = join(outputDir, `${name}.jpg`)
    await execFileAsync('ffmpeg', [
      '-y',
      '-ss', timestamp.toFixed(2),
      '-i', filePath,
      '-frames:v', '1',
      '-q:v', '2',
      outPath,
    ])
    paths[name] = outPath
  }

  return {
    frame10: paths.frame10,
    frame50: paths.frame50,
    frame90: paths.frame90,
  }
}

/**
 * Run the complete validation pipeline on a video output.
 */
export async function validateOutput(
  filePath: string,
  expectedAspect: string = '9:16',
  expectedDurationMin: number = 3,
  expectedDurationMax: number = 12,
  qaOutputDir: string = '/tmp/qa-frames',
): Promise<ValidationReport> {
  const errors: string[] = []

  // 1. ffprobe
  const ffprobe = await runFfprobe(filePath)

  // 2. SHA-256
  const sha256 = await computeSha256(filePath)

  // 3. Aspect ratio check
  let aspectRatioOk = true
  if (expectedAspect === '9:16') {
    // 9:16 means height > width (portrait) — accept both 720x1280 and 1080x1920
    aspectRatioOk = ffprobe.height > ffprobe.width
    if (!aspectRatioOk) errors.push(`Expected 9:16 portrait but got ${ffprobe.width}x${ffprobe.height}`)
  } else if (expectedAspect === '16:9') {
    aspectRatioOk = ffprobe.width > ffprobe.height
    if (!aspectRatioOk) errors.push(`Expected 16:9 landscape but got ${ffprobe.width}x${ffprobe.height}`)
  }

  // 4. Duration check
  const durationOk = ffprobe.duration >= expectedDurationMin && ffprobe.duration <= expectedDurationMax
  if (!durationOk) errors.push(`Duration ${ffprobe.duration}s outside expected range [${expectedDurationMin}, ${expectedDurationMax}]`)

  // 5. Codec check
  const codecOk = ['h264', 'hevc', 'vp9', 'av1'].includes(ffprobe.vcodec)
  if (!codecOk) errors.push(`Unexpected video codec: ${ffprobe.vcodec}`)

  // 6. Extract QA frames at %10/%50/%90
  let qaFramePaths = { frame10: '', frame50: '', frame90: '' }
  try {
    qaFramePaths = await extractQaFrames(filePath, ffprobe.duration, qaOutputDir)
  } catch (e: any) {
    errors.push(`QA frame extraction failed: ${e.message}`)
  }

  const verified = aspectRatioOk && durationOk && codecOk && errors.length === 0

  return {
    ffprobe,
    sha256,
    qaFramePaths,
    aspectRatioOk,
    durationOk,
    codecOk,
    verified,
    errors,
  }
}
