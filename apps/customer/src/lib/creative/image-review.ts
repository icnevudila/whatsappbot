export type ImagePublicationGateInput = {
  creativeDirectorVersion?: unknown
  skuMismatch?: boolean
  referenceMismatch?: boolean
  logoMismatch?: boolean
  instructionViolation?: boolean
  qaPassed?: boolean
  heroProductId?: string | null
  products?: Array<{ id: string; name?: string; imageUrl?: string | null }>
  imageOutputReceipt?: {
    decodedImage?: boolean
    referenceReceipt?: any
    [key: string]: any
  } | null
  [key: string]: any
}

export function imagePublicationStatus(payload?: ImagePublicationGateInput | null): 'ready' | 'needs_review' {
  if (!payload || typeof payload !== 'object') return 'needs_review'

  // FAIL-CLOSED: Explicit QA or integrity violations
  if (payload.skuMismatch === true) return 'needs_review'
  if (payload.referenceMismatch === true) return 'needs_review'
  if (payload.logoMismatch === true) return 'needs_review'
  if (payload.instructionViolation === true) return 'needs_review'
  if (payload.qaPassed === false) return 'needs_review'

  // SKU & Reference Integrity Validation
  if (payload.heroProductId && Array.isArray(payload.products) && payload.products.length > 0) {
    const selected = payload.products.find(p => p.id === payload.heroProductId)
    if (!selected) {
      // Requested heroProductId not found in declared product list -> SKU contamination
      return 'needs_review'
    }
  }

  return 'ready'
}
export function canReviewImage(input: { orgId: string; creativeId: string; receipt: any; storagePath: string | null }) {
  const r = input.receipt
  return !!r && r.orgId === input.orgId && r.creativeId === input.creativeId &&
    r.decodedImage === true && /^[a-f0-9]{64}$/i.test(r.sha256 || '') && r.size > 0 &&
    r.storagePath === input.storagePath && String(input.storagePath || '').startsWith(`${input.orgId}/`) &&
    ['image/png','image/jpeg','image/webp'].includes(r.mimeType)
}

/** Ready status alone cannot substitute for the explicit review of V3 bytes. */
export function isImageReviewApproved(payload: any): boolean {
  if (payload?.creativeDirectorVersion !== 'V3') return true
  const review = payload.imageHumanReview
  const receipt = payload.imageOutputReceipt
  return !!review && review.source === 'CUSTOMER_EXPLICIT_REVIEW' &&
    review.identityConfirmed === true && review.commerceConfirmed === true &&
    typeof review.reviewerId === 'string' && review.reviewerId.length > 0 &&
    Number.isFinite(Date.parse(review.reviewedAt)) && receipt?.decodedImage === true &&
    /^[a-f0-9]{64}$/i.test(receipt.sha256 || '') && review.sha256 === receipt.sha256
}
