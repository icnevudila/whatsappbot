/** Legacy jobs lack this field; staged submissions require explicit publication. */
import { createHash } from 'node:crypto'

export function isSubmissionPublished(metadata: Record<string, unknown> | null | undefined): boolean {
  return !metadata || !Object.prototype.hasOwnProperty.call(metadata, 'video_submission_ready') || metadata.video_submission_ready === true
}

function expiryEventId(jobId: string, deadline: string): string {
  const hash = createHash('sha256').update(`submission-expiry:${jobId}:${deadline}`).digest('hex')
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`
}

async function persistExpiryAudit(db: any, job: any, metadata: any): Promise<void> {
  const deadline = metadata.video_submission_deadline_at
  const { error } = await db.from('ai_media_events').insert({
    id: expiryEventId(job.id,deadline), job_id:job.id, org_id:job.org_id,
    event_type:'STATE_TRANSITION', from_state:'PENDING', to_state:'NEEDS_REVIEW',
    message:'Incomplete submission expired without provider execution',
    payload:{error_code:'VIDEO_SUBMISSION_INCOMPLETE',deadline},
  })
  // A crash after insertion but before acknowledgement is safe to replay.
  if (error && error.code !== '23505') throw new Error(`SUBMISSION_EXPIRY_AUDIT_FAILED: ${error.message}`)
  const { error: ackError } = await db.from('ai_media_jobs').update({
    metadata:{...metadata,video_submission_expiry_audit_pending:false},
  }).eq('id',job.id).eq('org_id',job.org_id).eq('state','NEEDS_REVIEW')
    .eq('metadata',JSON.stringify(metadata)).select('id')
  if (ackError) throw new Error(`SUBMISSION_EXPIRY_AUDIT_ACK_FAILED: ${ackError.message}`)
}

export async function repairSubmissionExpiryAudits(db: any): Promise<void> {
  const { data:jobs,error } = await db.from('ai_media_jobs').select('id,org_id,metadata')
    .eq('state','NEEDS_REVIEW').eq('error_code','VIDEO_SUBMISSION_INCOMPLETE')
    .eq('metadata->>video_submission_expiry_audit_pending','true').order('id').limit(100)
  if (error) throw new Error(`SUBMISSION_EXPIRY_AUDIT_QUERY_FAILED: ${error.message}`)
  for (const job of jobs || []) {
    if (job.metadata?.video_submission_expiry_audit_pending === true)
      await persistExpiryAudit(db,job,job.metadata)
  }
}

/** Never re-submit an incomplete publication; fence against simultaneous publication. */
export async function expireUnpublishedSubmissions(db: any, now = new Date()): Promise<number> {
  const cutoff = now.toISOString()
  const { data: jobs, error } = await db.from('ai_media_jobs').select('id,org_id,metadata')
    .eq('state', 'PENDING').eq('metadata->>video_submission_ready', 'false')
    .lte('metadata->>video_submission_deadline_at', cutoff).order('id').limit(100)
  if (error) throw new Error(`SUBMISSION_EXPIRY_QUERY_FAILED: ${error.message}`)
  let expired = 0
  for (const job of jobs || []) {
    const deadline = job.metadata?.video_submission_deadline_at
    if (job.metadata?.video_submission_ready !== false || typeof deadline !== 'string' ||
        !Number.isFinite(Date.parse(deadline)) || Date.parse(deadline) > now.getTime()) continue
    const { data: updated, error: updateError } = await db.from('ai_media_jobs').update({
      metadata:{...job.metadata,video_submission_expiry_audit_pending:true},
      state: 'NEEDS_REVIEW', updated_at: cutoff,
      error_code: 'VIDEO_SUBMISSION_INCOMPLETE',
      error_message: 'Reference publication did not finish before the submission deadline; no provider call was started.',
      lease_account_id: null, lease_worker_id: null, lease_timeout_at: null,
    }).eq('id', job.id).eq('org_id', job.org_id).eq('state', 'PENDING')
      .eq('metadata->>video_submission_ready', 'false')
      .eq('metadata',JSON.stringify(job.metadata))
      .eq('metadata->>video_submission_deadline_at', deadline).select('id')
    if (updateError) throw new Error(`SUBMISSION_EXPIRY_UPDATE_FAILED: ${updateError.message}`)
    if (!updated?.some((row: any) => row.id === job.id)) continue
    expired++
    await persistExpiryAudit(db,job,{...job.metadata,video_submission_expiry_audit_pending:true})
  }
  return expired
}
