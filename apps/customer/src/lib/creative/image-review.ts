export function imagePublicationStatus(payload: { creativeDirectorVersion?: unknown }): 'ready' | 'needs_review' {
  return payload.creativeDirectorVersion === 'V3' ? 'needs_review' : 'ready'
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
