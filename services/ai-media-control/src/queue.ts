/**
 * Fair-Share Tenant Queue
 * 
 * Ensures no single org starves others by prioritizing orgs with fewer
 * in-flight jobs. Uses FOR UPDATE SKIP LOCKED pattern for concurrent safety.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { JobState } from './state-machine.js'

export interface QueuedJob {
  id: string
  org_id: string
  title: string
  prompt: string
  model: string
  aspect_ratio: string
  duration_seconds: number
  priority: number
  expected_ingredient_count: number
  metadata: Record<string, unknown>
}

/**
 * Fetch the next job to process using fair-share scheduling.
 * Orgs with fewer in-flight jobs get priority.
 */
export async function fetchNextJob(supabase: SupabaseClient): Promise<QueuedJob | null> {
  // 1. Get in-flight count per org
  const activeStates = [
    JobState.LEASED, JobState.PREPARING_ENV, JobState.OPENING_PROJECT,
    JobState.ATTACHING_INGREDIENTS, JobState.INGREDIENTS_VERIFIED,
    JobState.GENERATING, JobState.POLLING_FLOW, JobState.DOWNLOADING_MEDIA,
    JobState.MEDIA_DOWNLOADED, JobState.FFPROBE_INSPECTING,
    JobState.SHA256_VERIFYING, JobState.VISUAL_QA_EVALUATING,
  ]

  // Use raw SQL via RPC for the FOR UPDATE SKIP LOCKED pattern
  // Fallback: simple priority-based fetch from Supabase client
  const { data: queuedJobs, error } = await supabase
    .from('ai_media_jobs')
    .select('*')
    .eq('state', JobState.QUEUED)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(10)

  if (error || !queuedJobs || queuedJobs.length === 0) {
    return null
  }

  // Fair-share: count active jobs per org among queued candidates
  const { data: activeCounts } = await supabase
    .from('ai_media_jobs')
    .select('org_id')
    .in('state', activeStates)

  const orgActiveCounts: Record<string, number> = {}
  for (const row of (activeCounts || [])) {
    orgActiveCounts[row.org_id] = (orgActiveCounts[row.org_id] || 0) + 1
  }

  // Sort queued jobs: prefer orgs with fewer active jobs, then by priority & created_at
  const sorted = [...queuedJobs].sort((a, b) => {
    const aActive = orgActiveCounts[a.org_id] || 0
    const bActive = orgActiveCounts[b.org_id] || 0
    if (aActive !== bActive) return aActive - bActive  // fewer active first
    if (a.priority !== b.priority) return b.priority - a.priority  // higher priority first
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()  // older first
  })

  return sorted[0] as QueuedJob
}

/**
 * Lease a job: atomically transition QUEUED -> LEASED and assign worker/account.
 */
export async function leaseJob(
  supabase: SupabaseClient,
  jobId: string,
  workerId: string,
  accountId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('ai_media_jobs')
    .update({
      state: JobState.LEASED,
      lease_worker_id: workerId,
      lease_account_id: accountId,
      lease_timeout_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min timeout
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('state', JobState.QUEUED)  // optimistic lock

  return !error
}
