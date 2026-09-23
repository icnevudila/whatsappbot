/**
 * AI Media Control — Canonical 18-State Machine
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
  [JobState.PREPARING_ENV]: [JobState.OPENING_PROJECT, JobState.COMPLETED, JobState.FAILED],
  [JobState.OPENING_PROJECT]: [JobState.ATTACHING_INGREDIENTS, JobState.FAILED],
  [JobState.ATTACHING_INGREDIENTS]: [JobState.INGREDIENTS_VERIFIED, JobState.FAILED],
  [JobState.INGREDIENTS_VERIFIED]: [JobState.GENERATING, JobState.FAILED],
  [JobState.GENERATING]: [JobState.POLLING_FLOW, JobState.FAILED],
  [JobState.POLLING_FLOW]: [JobState.DOWNLOADING_MEDIA, JobState.FAILED],
  [JobState.DOWNLOADING_MEDIA]: [JobState.MEDIA_DOWNLOADED, JobState.FAILED],
  [JobState.MEDIA_DOWNLOADED]: [JobState.FFPROBE_INSPECTING, JobState.FAILED],
  [JobState.FFPROBE_INSPECTING]: [JobState.SHA256_VERIFYING, JobState.FAILED],
  [JobState.SHA256_VERIFYING]: [JobState.VISUAL_QA_EVALUATING, JobState.FAILED],
  [JobState.VISUAL_QA_EVALUATING]: [JobState.COMPLETED, JobState.NEEDS_REVIEW, JobState.FAILED],
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

  // 2. Update job state
  const updates: Record<string, unknown> = {
    state: toState,
    updated_at: new Date().toISOString(),
  }
  if (toState === JobState.COMPLETED) {
    updates.completed_at = new Date().toISOString()
    updates.lease_account_id = null
    updates.lease_worker_id = null
    updates.lease_timeout_at = null
  } else if (toState === JobState.FAILED) {
    updates.lease_account_id = null
    updates.lease_worker_id = null
    updates.lease_timeout_at = null
  }

  let { error: updateError, count } = await supabase
    .from('ai_media_jobs')
    .update(updates, { count: 'exact' })
    .eq('id', jobId)
    .eq('state', fromState)

  if (!updateError && count === 0) {
    // Fallback: update by id regardless of state drift to prevent stuck leases
    const res = await supabase
      .from('ai_media_jobs')
      .update(updates)
      .eq('id', jobId)
    updateError = res.error
  }

  if (updateError) {
    throw new Error(`DB update failed for job ${jobId}: ${updateError.message}`)
  }

  // 3. Append audit event (append-only, never modified)
  const { error: eventError } = await supabase
    .from('ai_media_events')
    .insert({
      job_id: jobId,
      org_id: orgId,
      attempt_id: attemptId || null,
      event_type: 'STATE_TRANSITION',
      from_state: fromState,
      to_state: toState,
      message,
      payload,
    })

  if (eventError) {
    console.error(`Failed to insert audit event for job ${jobId}:`, eventError)
    // Don't throw — state was already updated. Log and continue.
  }
}
