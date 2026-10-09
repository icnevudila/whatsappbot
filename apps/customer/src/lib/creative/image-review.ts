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
