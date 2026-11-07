import type {ImageJobReceipt} from '@/lib/ai/omnistudio-image-job'

/** Observation may resume an accepted job; it must never authorize a new render. */
export function recoverableImageReceipt(value: unknown): ImageJobReceipt | null {
  if (!value || typeof value !== 'object') return null
  const payload=value as Record<string,unknown>
  const candidate=payload.imageJob || (payload.imageReconciliationRequired === true ? payload.lastImageJob : null)
  if (!candidate || typeof candidate !== 'object') return null
  const receipt=candidate as ImageJobReceipt
  return typeof receipt.id==='string' && !!receipt.id.trim() &&
    typeof receipt.gatewayUrl==='string' && /^https?:\/\//.test(receipt.gatewayUrl) &&
    typeof receipt.queuedAt==='string' && Number.isFinite(Date.parse(receipt.queuedAt)) ? receipt : null
}
