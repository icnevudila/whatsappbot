export type AttemptFence = { jobId: string; orgId: string; accountId: string; workerId: string; attemptId: string }

export class AttemptOwnershipLostError extends Error {
  constructor() { super('ACTIVE_ATTEMPT_CONFLICT'); this.name = 'AttemptOwnershipLostError' }
}

/** A fresh worker lease is unique; a second execution cannot replace its active attempt. */
export async function claimActiveAttempt(db: any, fence: AttemptFence): Promise<Record<string, unknown>> {
  const { data: leased, error: readError } = await db.from('ai_media_jobs').select('id,metadata,updated_at')
    .eq('id', fence.jobId).eq('org_id', fence.orgId).eq('state', 'LEASED')
    .eq('lease_account_id', fence.accountId).eq('lease_worker_id', fence.workerId).maybeSingle()
  if (readError || !leased || leased.metadata?.active_attempt_worker_id === fence.workerId) throw new AttemptOwnershipLostError()
  const metadata = { ...(leased.metadata || {}), active_attempt_id: fence.attemptId,
    active_attempt_worker_id: fence.workerId, active_attempt_account_id: fence.accountId }
  const { data, error } = await db.from('ai_media_jobs').update({ metadata, updated_at: new Date().toISOString() })
    .eq('id', fence.jobId).eq('org_id', fence.orgId).eq('state', 'LEASED')
    .eq('lease_account_id', fence.accountId).eq('lease_worker_id', fence.workerId)
    .eq('updated_at', leased.updated_at).select('id').maybeSingle()
  if (error || data?.id !== fence.jobId) throw new AttemptOwnershipLostError()
  return metadata
}

export function fenceJobMutation(query: any, fence: AttemptFence) {
  return query.eq('id', fence.jobId).eq('org_id', fence.orgId)
    .eq('metadata->>active_attempt_id', fence.attemptId)
    .eq('metadata->>active_attempt_worker_id', fence.workerId)
    .eq('metadata->>active_attempt_account_id', fence.accountId)
}

export async function stillOwnAttempt(db: any, fence: AttemptFence): Promise<boolean> {
  const { data, error } = await fenceJobMutation(db.from('ai_media_jobs').select('id'), fence).maybeSingle()
  if (error) throw new Error('ATTEMPT_OWNERSHIP_LOOKUP_UNAVAILABLE')
  return data?.id === fence.jobId
}

/** Only the original fence can mark shared job state failed. Observed latest state is not authority. */
export async function failOwnedAttempt(db: any, fence: AttemptFence, message: string): Promise<boolean> {
  const { data, error } = await fenceJobMutation(db.from('ai_media_jobs').update({ state: 'FAILED',
    error_code: 'EXECUTION_FAILED', error_message: message, lease_account_id: null, lease_worker_id: null,
    lease_timeout_at: null, updated_at: new Date().toISOString() }), fence)
    .not('state', 'in', '(COMPLETED,FAILED,NEEDS_REVIEW)').select('id').maybeSingle()
  if (error) throw new Error('ATTEMPT_FAILURE_PERSISTENCE_UNAVAILABLE')
  return data?.id === fence.jobId
}
