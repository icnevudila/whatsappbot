import type { Json } from '@wa/shared'
export type VideoSubmitIntent = { idempotencyKey: string; requestHash: string; attemptId: string; gatewayUrl: string; startedAt: string; body: { [key: string]: Json | undefined } }
export class VideoSubmissionUncertainError extends Error {
  constructor() { super('VIDEO_SUBMISSION_UNCERTAIN'); this.name = 'VideoSubmissionUncertainError' }
}
export class VideoJobTerminalError extends Error {
  constructor(public readonly jobId: string, public readonly code: string, message: string) {
    super(message); this.name = 'VideoJobTerminalError'
  }
}

function verifiedReceipt(receipt: any, intent: VideoSubmitIntent) {
  if (receipt.org_id && receipt.org_id !== intent.body.orgId) throw new VideoSubmissionUncertainError()
  if (receipt.status === 'failed') throw new VideoJobTerminalError(String(receipt.job_id),
    receipt.error_code || receipt.errorCode || 'VIDEO_PROVIDER_FAILED',
    typeof receipt.error === 'string' ? receipt.error : receipt.error?.message || 'Video üretimi başarısız oldu.')
  if (['reconciliation_required', 'submission_unknown', 'uncertain'].includes(receipt.status)) throw new VideoSubmissionUncertainError()
  return receipt
}

export async function submitVideoWithIntent(intent: VideoSubmitIntent, persist: (intent: VideoSubmitIntent) => Promise<void>, recovering: boolean) {
  if (recovering) {
    const query = new URLSearchParams({ idempotency_key: intent.idempotencyKey, org_id: String(intent.body.orgId) })
    const observation = await fetch(`${intent.gatewayUrl}/v1/videos/reconcile?${query}`, { signal: AbortSignal.timeout(10000), cache: 'no-store' })
      .catch(() => { throw new VideoSubmissionUncertainError() })
    const receipt = await observation.json().catch(() => { throw new VideoSubmissionUncertainError() })
    if (observation.ok && receipt.job_id) return verifiedReceipt(receipt, intent)
    if (observation.status !== 404 || receipt.authoritative !== true) throw new VideoSubmissionUncertainError()
  }
  await persist(intent)
  const response = await fetch(`${intent.gatewayUrl}/v1/videos/generations`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(intent.body), signal: AbortSignal.timeout(20000),
  }).catch(() => { throw new VideoSubmissionUncertainError() })
  const receipt = await response.json().catch(() => { throw new VideoSubmissionUncertainError() })
  if (response.status >= 500 || (response.ok && !receipt.job_id)) throw new VideoSubmissionUncertainError()
  if (!response.ok) throw new Error(receipt.error?.message || `VIDEO_SUBMIT_REJECTED_${response.status}`)
  return verifiedReceipt(receipt, intent)
}
