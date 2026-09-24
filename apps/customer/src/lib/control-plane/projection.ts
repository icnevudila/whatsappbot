import type { ControlJobState, ControlJobType, OperationsJob, WorkerState } from './types'

export const ACTIVE_AI_STATES = new Set([
  'LEASED', 'PREPARING_ENV', 'OPENING_PROJECT', 'ATTACHING_INGREDIENTS',
  'INGREDIENTS_VERIFIED', 'GENERATING', 'POLLING_FLOW', 'DOWNLOADING_MEDIA',
  'MEDIA_DOWNLOADED', 'FFPROBE_INSPECTING', 'SHA256_VERIFYING',
  'VISUAL_QA_EVALUATING',
])

export function normalizeControlJobType(type: unknown, source: OperationsJob['source']): ControlJobType {
  const value = String(type || '').toLowerCase()
  if (source === 'ai_media_jobs' || value.includes('video')) return 'VIDEO'
  if (value.includes('message') || value.includes('send')) return 'MESSAGE'
  if (value.includes('reply') || value.includes('suggestion') || value.includes('qna')) return 'AI_REPLY'
  if (value.includes('image') || value.includes('creative')) return 'IMAGE'
  if (value.includes('media') || value.includes('subtitle') || value.includes('ffmpeg')) return 'MEDIA_PROCESS'
  return 'BACKGROUND_TASK'
}

export function normalizeControlJobState(state: unknown): ControlJobState {
  const value = String(state || '').toUpperCase()
  if (['PENDING', 'QUEUED'].includes(value)) return 'QUEUED'
  if (['CLAIMED', 'RUNNING'].includes(value) || ACTIVE_AI_STATES.has(value)) return 'ACTIVE'
  if (['DONE', 'COMPLETED', 'DELIVERED', 'SENT', 'READY'].includes(value)) return 'COMPLETED'
  if (value === 'NEEDS_REVIEW') return 'NEEDS_REVIEW'
  if (value === 'CANCELLED') return 'CANCELLED'
  if (['FAILED', 'DEAD', 'ERROR'].includes(value)) return 'FAILED'
  return 'QUEUED'
}

export function canonicalWorkerState(value: unknown, alive = true): WorkerState {
  if (!alive) return 'OFFLINE'
  const state = String(value || '').toUpperCase()
  if (state.includes('AUTH') || state.includes('LOGIN')) return 'AUTH_REQUIRED'
  if (state.includes('QUOTA') || state.includes('LIMIT')) return 'QUOTA_EXHAUSTED'
  if (state.includes('COOL')) return 'COOLDOWN'
  if (state.includes('START')) return 'STARTING'
  if (state.includes('BUSY') || state.includes('RUNNING')) return 'BUSY'
  if (state.includes('ERROR') || state.includes('UNHEALTHY') || state.includes('DEGRADED')) return 'UNHEALTHY'
  if (state.includes('OFFLINE') || state.includes('STOPPED')) return 'OFFLINE'
  return 'IDLE'
}
