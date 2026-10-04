/**
 * AI Media Control — Canonical Production State Machine
 * 
 * SINGLE SOURCE OF TRUTH for all job state transitions.
 * Every state change MUST go through transitionJob() to guarantee
 * the append-only audit trail in ai_media_events.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export enum JobState {
  PENDING = 'PENDING',
  VALIDATING_INPUTS = 'VALIDATING_INPUTS',
  QUEUED = 'QUEUED',
  LEASED = 'LEASED',
  PREPARING_ENV = 'PREPARING_ENV',
  OPENING_PROJECT = 'OPENING_PROJECT',
  ATTACHING_INGREDIENTS = 'ATTACHING_INGREDIENTS',
  INGREDIENTS_VERIFIED = 'INGREDIENTS_VERIFIED',
  GENERATING = 'GENERATING',
  POLLING_FLOW = 'POLLING_FLOW',
  DOWNLOADING_MEDIA = 'DOWNLOADING_MEDIA',
  MEDIA_DOWNLOADED = 'MEDIA_DOWNLOADED',
  MEDIA_PROCESSING = 'MEDIA_PROCESSING',
  QUALITY_CHECK = 'QUALITY_CHECK',
  FFPROBE_INSPECTING = 'FFPROBE_INSPECTING',
  SHA256_VERIFYING = 'SHA256_VERIFYING',
  VISUAL_QA_EVALUATING = 'VISUAL_QA_EVALUATING',
  COMPLETED = 'COMPLETED',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  FAILED = 'FAILED',
}

/**
 * Strict transition map: only these transitions are legal.
 * Any state can also transition to NEEDS_REVIEW (safety valve).
 */
const VALID_TRANSITIONS: Record<JobState, JobState[]> = {
  [JobState.PENDING]: [JobState.VALIDATING_INPUTS],
  [JobState.VALIDATING_INPUTS]: [JobState.QUEUED, JobState.FAILED],
  [JobState.QUEUED]: [JobState.LEASED],
  [JobState.LEASED]: [JobState.PREPARING_ENV, JobState.FAILED],
  [JobState.PREPARING_ENV]: [JobState.OPENING_PROJECT, JobState.MEDIA_DOWNLOADED, JobState.COMPLETED, JobState.FAILED],
  [JobState.OPENING_PROJECT]: [JobState.ATTACHING_INGREDIENTS, JobState.FAILED],
  [JobState.ATTACHING_INGREDIENTS]: [JobState.INGREDIENTS_VERIFIED, JobState.FAILED],
  [JobState.INGREDIENTS_VERIFIED]: [JobState.GENERATING, JobState.FAILED],
  [JobState.GENERATING]: [JobState.POLLING_FLOW, JobState.FAILED],
  [JobState.POLLING_FLOW]: [JobState.DOWNLOADING_MEDIA, JobState.FAILED],
  [JobState.DOWNLOADING_MEDIA]: [JobState.MEDIA_DOWNLOADED, JobState.FAILED],
  [JobState.MEDIA_DOWNLOADED]: [JobState.MEDIA_PROCESSING, JobState.FFPROBE_INSPECTING, JobState.FAILED],
  [JobState.MEDIA_PROCESSING]: [JobState.FFPROBE_INSPECTING, JobState.QUALITY_CHECK, JobState.FAILED],
  [JobState.QUALITY_CHECK]: [JobState.COMPLETED, JobState.NEEDS_REVIEW, JobState.FAILED],
  [JobState.FFPROBE_INSPECTING]: [JobState.SHA256_VERIFYING, JobState.FAILED],
  [JobState.SHA256_VERIFYING]: [JobState.VISUAL_QA_EVALUATING, JobState.FAILED],
  [JobState.VISUAL_QA_EVALUATING]: [JobState.QUALITY_CHECK, JobState.COMPLETED, JobState.NEEDS_REVIEW, JobState.FAILED],
  [JobState.COMPLETED]: [],  // terminal
  [JobState.NEEDS_REVIEW]: [JobState.QUEUED, JobState.FAILED],  // retry or fail
  [JobState.FAILED]: [JobState.QUEUED],  // retry
}

export function isValidTransition(from: JobState, to: JobState): boolean {
  // Any state can go to NEEDS_REVIEW (safety valve)
  if (to === JobState.NEEDS_REVIEW && from !== JobState.COMPLETED) return true
  const allowed = VALID_TRANSITIONS[from] || []
  return allowed.includes(to)
}

/**
 * Atomically transition a job to a new state, updating the DB and
 * appending an audit event. Throws on invalid transitions.
 */
export async function transitionJob(
  supabase: SupabaseClient,
  jobId: string,
  orgId: string,
  fromState: JobState,
  toState: JobState,
  message: string,
  payload: Record<string, unknown> = {},
  attemptId?: string,
): Promise<void> {
  // 1. Validate transition
  if (!isValidTransition(fromState, toState)) {
    throw new Error(
      `INVALID_STATE_TRANSITION: Cannot transition from ${fromState} to ${toState} for job ${jobId}`
    )
  }

  const { data, error } = await supabase.rpc('studio_transition_job', {
    p_job_id: jobId, p_org_id: orgId, p_from: fromState, p_to: toState,
    p_message: message, p_payload: payload, p_attempt_id: attemptId || null,
  })
  if (error) throw new Error(`STATE_AUDIT_TRANSACTION_FAILED: ${error.message}`)
  if (data !== true) throw new Error('STATE_TRANSITION_CONFLICT: Expected one owned job in the source state')
}
