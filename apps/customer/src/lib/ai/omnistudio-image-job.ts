import { createHash } from 'node:crypto'
import { inspectImageOutput } from './image-output'

export type ImageJobReceipt = { id: string; gatewayUrl: string; queuedAt: string; expectedReferenceCount?: number }
export class ImageSubmissionUncertainError extends Error {
  constructor() {
    super('Üretim gönderimi doğrulanamadı. Çift üretim başlatmamak için başka sağlayıcı denenmedi; mevcut iş kontrol edilmeli.')
    this.name = 'ImageSubmissionUncertainError'
  }
}
export class ImageJobPendingError extends Error {
  constructor(public readonly job: ImageJobReceipt) {
    super('Görsel üretimi kuyrukta devam ediyor.')
    this.name = 'ImageJobPendingError'
  }
}
export class ImageJobFailedError extends Error {
  constructor(public readonly job: ImageJobReceipt, message: string) {
    super(message)
    this.name = 'ImageJobFailedError'
  }
}
export class ImageJobReconciliationError extends ImageJobFailedError {
  constructor(job: ImageJobReceipt) {
    super(job, 'Üretimin sağlayıcı sonucu belirsiz. Çift ücretli üretim yapılmadı; mevcut iş uzlaştırılmalı.')
    this.name = 'ImageJobReconciliationError'
  }
}

export async function submitImageJob(gatewayUrl: string, body: Record<string, unknown>): Promise<ImageJobReceipt> {
  const expectedReferenceCount = body.expected_reference_count
  if (typeof expectedReferenceCount !== 'number' || !Number.isSafeInteger(expectedReferenceCount) || expectedReferenceCount < 0 || expectedReferenceCount > 4) throw new Error('REFERENCE_ATTACHMENT_FAILED')
  const response = await fetch(`${gatewayUrl}/v1/images/generations`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, async: true, response_format: 'url' }),
    signal: AbortSignal.timeout(20000),
  }).catch(() => { throw new ImageSubmissionUncertainError() })
  const result = await response.json().catch(() => { throw new ImageSubmissionUncertainError() }) as { job_id?: string; error?: unknown }
  if (response.status >= 500) throw new ImageSubmissionUncertainError()
  if (response.ok && !result.job_id) throw new ImageSubmissionUncertainError()
  if (!response.ok || !result.job_id) throw new Error(`OmniStudio submit ${response.status}: ${JSON.stringify(result.error || 'job_id eksik').slice(0,200)}`)
  return { id: result.job_id, gatewayUrl, queuedAt: new Date().toISOString(), expectedReferenceCount }
}

export type ImageReferenceReceipt = {
  job_id: string; worker_id: string; target_id: string; conversation_owner_job_id: string;
  expected_reference_count: number; resolved_reference_count: number; uploaded_reference_count: number;
  composer_attachment_count: number; attachments_ready_at: string;
}
export async function readImageJob(job: ImageJobReceipt, tenantId?: string, expectedReferences = job.expectedReferenceCount ?? 0): Promise<{ data: Buffer; mimeType: string; width: number; height: number; referenceReceipt: ImageReferenceReceipt | null } | null> {
  const query = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : ''
  const response = await fetch(`${job.gatewayUrl}/v1/images/status/${encodeURIComponent(job.id)}${query}`, { signal: AbortSignal.timeout(10000), cache: 'no-store' })
  if (!response.ok) throw new ImageJobPendingError(job) // Lost observation is not proof that production failed.
  const result = await response.json() as { status?: string; result_url?: string; result_sha256?: string; error?: string; expected_reference_count?: number; reference_receipt?: ImageReferenceReceipt }
  if (result.status === 'failed') throw new ImageJobFailedError(job, result.error || 'OmniStudio görsel üretimi başarısız.')
  if (result.status === 'reconciliation_required') throw new ImageJobReconciliationError(job)
  if (result.status !== 'completed') return null
  if (expectedReferences > 0 && result.reference_receipt) {
    const receipt = result.reference_receipt
    if (result.expected_reference_count !== expectedReferences || !receipt || receipt.job_id !== job.id ||
        receipt.conversation_owner_job_id !== job.id || !receipt.worker_id || !receipt.target_id ||
        [receipt.expected_reference_count, receipt.resolved_reference_count, receipt.uploaded_reference_count, receipt.composer_attachment_count].some(count => count !== expectedReferences)) {
      throw new ImageJobReconciliationError(job)
    }
  }
  if (!/^[a-f0-9]{64}$/i.test(result.result_sha256 || '')) throw new ImageJobReconciliationError(job)
  if (!result.result_url) throw new Error('OmniStudio tamamlandı ancak çıktı URL eksik.')
  const output = await fetch(result.result_url, { signal: AbortSignal.timeout(30000) })
  const mimeType = output.headers.get('content-type')?.split(';')[0] || ''
  if (!output.ok || !mimeType.startsWith('image/')) throw new ImageJobPendingError(job)
  if (Number(output.headers.get('content-length') || 0) > 32 * 1024 * 1024 || !output.body) throw new ImageJobPendingError(job)
  const reader = output.body.getReader()
  const chunks: Buffer[] = []
  let bytes = 0
  try {
    for (;;) {
      const part = await reader.read()
      if (part.done) break
      bytes += part.value.length
      if (bytes > 32 * 1024 * 1024) throw new ImageJobPendingError(job)
      chunks.push(Buffer.from(part.value))
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
  const data = Buffer.concat(chunks,bytes)
  if (data.length < 32) throw new ImageJobPendingError(job)
  if (result.result_sha256 && createHash('sha256').update(data).digest('hex') !== result.result_sha256.toLowerCase()) {
    throw new ImageJobPendingError(job) // Retry the download of this job, not production.
  }
  const measured = await inspectImageOutput(data).catch(() => { throw new ImageJobPendingError(job) })
  return { data, ...measured, referenceReceipt: result.reference_receipt || null }
}

export function inlineReference(image: { data: Buffer; mimeType: string; role?: string }) {
  return { data: image.data.toString('base64'), mimeType: image.mimeType, role: image.role || 'base', sha256: createHash('sha256').update(image.data).digest('hex') }
}
