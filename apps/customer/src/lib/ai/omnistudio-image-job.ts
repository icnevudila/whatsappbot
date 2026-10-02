import { createHash } from 'node:crypto'
import { inspectImageOutput } from './image-output'

export type ImageJobReceipt = { id: string; gatewayUrl: string; queuedAt: string }
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
  const response = await fetch(`${gatewayUrl}/v1/images/generations`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, async: true, response_format: 'url' }),
    signal: AbortSignal.timeout(20000),
  }).catch(() => { throw new ImageSubmissionUncertainError() })
  const result = await response.json().catch(() => { throw new ImageSubmissionUncertainError() }) as { job_id?: string; error?: unknown }
  if (response.status >= 500) throw new ImageSubmissionUncertainError()
  if (response.ok && !result.job_id) throw new ImageSubmissionUncertainError()
  if (!response.ok || !result.job_id) throw new Error(`OmniStudio submit ${response.status}: ${JSON.stringify(result.error || 'job_id eksik').slice(0,200)}`)
  return { id: result.job_id, gatewayUrl, queuedAt: new Date().toISOString() }
}

export async function readImageJob(job: ImageJobReceipt, tenantId?: string): Promise<{ data: Buffer; mimeType: string; width: number; height: number } | null> {
  const query = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : ''
  const response = await fetch(`${job.gatewayUrl}/v1/images/status/${encodeURIComponent(job.id)}${query}`, { signal: AbortSignal.timeout(10000), cache: 'no-store' })
  if (!response.ok) throw new ImageJobPendingError(job) // Lost observation is not proof that production failed.
  const result = await response.json() as { status?: string; result_url?: string; result_sha256?: string; error?: string }
  if (result.status === 'failed') throw new ImageJobFailedError(job, result.error || 'OmniStudio görsel üretimi başarısız.')
  if (result.status === 'reconciliation_required') throw new ImageJobReconciliationError(job)
  if (result.status !== 'completed') return null
  if (!/^[a-f0-9]{64}$/i.test(result.result_sha256 || '')) throw new ImageJobReconciliationError(job)
  if (!result.result_url) throw new Error('OmniStudio tamamlandı ancak çıktı URL eksik.')
  const output = await fetch(result.result_url, { signal: AbortSignal.timeout(30000) })
  const mimeType = output.headers.get('content-type')?.split(';')[0] || ''
  if (!output.ok || !mimeType.startsWith('image/')) throw new ImageJobPendingError(job)
  const data = Buffer.from(await output.arrayBuffer())
  if (data.length < 32) throw new ImageJobPendingError(job)
  if (result.result_sha256 && createHash('sha256').update(data).digest('hex') !== result.result_sha256.toLowerCase()) {
    throw new ImageJobPendingError(job) // Retry the download of this job, not production.
  }
  const measured = await inspectImageOutput(data).catch(() => { throw new ImageJobPendingError(job) })
  return { data, ...measured }
}

export function inlineReference(image: { data: Buffer; mimeType: string; role?: string }) {
  return { data: image.data.toString('base64'), mimeType: image.mimeType, role: image.role || 'base', sha256: createHash('sha256').update(image.data).digest('hex') }
}
