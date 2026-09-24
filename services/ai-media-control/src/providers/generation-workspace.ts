import { existsSync, mkdirSync, writeFileSync, appendFileSync, readFileSync, copyFileSync, statSync } from 'node:fs'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execSync } from 'node:child_process'

export type GenerationLifecycleState =
  | 'PREFLIGHT'
  | 'ACCOUNT_LEASED'
  | 'WORKER_STARTING'
  | 'READY'
  | 'SUBMITTED'
  | 'GENERATING'
  | 'GENERATION_COMPLETED'
  | 'DOWNLOAD_STARTED'
  | 'DOWNLOAD_COMPLETED'
  | 'VERIFIED'
  | 'FINISHING'
  | 'COMPLETED'
  | 'PROVIDER_REJECTED'
  | 'SUBMISSION_UNKNOWN'
  | 'FAILED'

export interface GenerationWorkspaceConfig {
  jobId: string
  attemptId: string
  baseDir?: string
}

export class GenerationWorkspace {
  readonly dir: string
  readonly jobId: string
  readonly attemptId: string
  private currentState: GenerationLifecycleState = 'PREFLIGHT'

  constructor(config: GenerationWorkspaceConfig) {
    this.jobId = config.jobId
    this.attemptId = config.attemptId
    const base = config.baseDir || '/shared/jobs'
    this.dir = path.join(base, this.jobId, this.attemptId)
    fs.mkdirSync(this.dir, { recursive: true })
  }

  get currentStateValue(): GenerationLifecycleState {
    return this.currentState
  }

  logEvent(state: GenerationLifecycleState, message?: string, meta?: Record<string, unknown>): void {
    this.currentState = state
    const timestamp = new Date().toISOString()
    const line = `[${timestamp}] [${state}] ${message || ''} ${meta ? JSON.stringify(meta) : ''}\n`
    fs.appendFileSync(path.join(this.dir, 'events.log'), line, 'utf-8')
  }

  writePrompt(data: Record<string, unknown>): void {
    fs.writeFileSync(path.join(this.dir, 'prompt.json'), JSON.stringify(data, null, 2), 'utf-8')
  }

  writeProvider(data: Record<string, unknown>): void {
    fs.writeFileSync(path.join(this.dir, 'provider.json'), JSON.stringify(data, null, 2), 'utf-8')
  }

  recordRawVideo(rawFilePath: string): { sha256: string; size: number } {
    const targetRawPath = path.join(this.dir, 'raw.mp4')
    if (rawFilePath !== targetRawPath && fs.existsSync(rawFilePath)) {
      fs.copyFileSync(rawFilePath, targetRawPath)
    }
    if (!fs.existsSync(targetRawPath)) {
      throw new Error(`raw.mp4 not found in workspace: ${targetRawPath}`)
    }
    const stat = fs.statSync(targetRawPath)
    const buffer = fs.readFileSync(targetRawPath)
    const sha = createHash('sha256').update(buffer).digest('hex')
    fs.writeFileSync(path.join(this.dir, 'raw.sha256'), `${sha}  raw.mp4\n`, 'utf-8')

    // Run ffprobe and record technical metadata
    try {
      const probeOut = execSync(
        `ffprobe -v error -show_entries format=duration,size,bit_rate:stream=codec_name,width,height,r_frame_rate -of json "${targetRawPath}"`,
        { encoding: 'utf-8' }
      )
      fs.writeFileSync(path.join(this.dir, 'ffprobe.json'), probeOut, 'utf-8')
    } catch (e: any) {
      fs.writeFileSync(path.join(this.dir, 'ffprobe.json'), JSON.stringify({ error: e.message }, null, 2), 'utf-8')
    }

    return { sha256: sha, size: stat.size }
  }

  recordFinalVideo(finalFilePath: string): { sha256: string; size: number } {
    const targetFinalPath = path.join(this.dir, 'final.mp4')
    if (finalFilePath !== targetFinalPath && fs.existsSync(finalFilePath)) {
      fs.copyFileSync(finalFilePath, targetFinalPath)
    }
    if (!fs.existsSync(targetFinalPath)) {
      throw new Error(`final.mp4 not found in workspace: ${targetFinalPath}`)
    }
    const stat = fs.statSync(targetFinalPath)
    const buffer = fs.readFileSync(targetFinalPath)
    const sha = createHash('sha256').update(buffer).digest('hex')
    fs.writeFileSync(path.join(this.dir, 'final.sha256'), `${sha}  final.mp4\n`, 'utf-8')
    return { sha256: sha, size: stat.size }
  }

  writeResult(data: Record<string, unknown>): void {
    fs.writeFileSync(path.join(this.dir, 'result.json'), JSON.stringify(data, null, 2), 'utf-8')
  }

  rawMp4Path(): string {
    return path.join(this.dir, 'raw.mp4')
  }

  finalMp4Path(): string {
    return path.join(this.dir, 'final.mp4')
  }
}
