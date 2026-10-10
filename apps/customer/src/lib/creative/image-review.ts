export function imagePublicationStatus(_payload: { creativeDirectorVersion?: unknown }): 'ready' {
  return 'ready'
}
export function canReviewImage(input: { orgId: string; creativeId: string; receipt: any; storagePath: string | null }) {
  const r = input.receipt
  return !!r && r.orgId === input.orgId && r.creativeId === input.creativeId &&
    r.decodedImage === true && /^[a-f0-9]{64}$/i.test(r.sha256 || '') && r.size > 0 &&
    r.storagePath === input.storagePath && String(input.storagePath || '').startsWith(`${input.orgId}/`) &&
    ['image/png','image/jpeg','image/webp'].includes(r.mimeType)
}

/** Editorial review is advisory; callers must still verify tenant-bound stored bytes. */
export function isImageReviewApproved(payload: any): boolean {
  if (payload?.creativeDirectorVersion !== 'V3') return true
  const receipt = payload.imageOutputReceipt
  return receipt?.decodedImage === true && /^[a-f0-9]{64}$/i.test(receipt.sha256 || '') && receipt.size > 0
}
