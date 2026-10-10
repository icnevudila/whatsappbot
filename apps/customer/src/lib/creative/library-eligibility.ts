import { canReviewImage, isImageReviewApproved } from './image-review'

export function isLibraryCreativeEligible(row: any, orgId: string, videoState?: {status: string}): boolean {
  if (row.org_id !== orgId || row.status !== 'ready' || !row.public_url || !row.public_url.trim() || row.source === 'upload') return false
  const video = row.format === 'video' || /\.mp4(?:[?#]|$)/i.test(row.public_url) || row.public_url.includes('/api/ai-media/outputs/')
  if (video) return videoState?.status === 'ready'
  const payload = row.payload || {}
  if (payload.imageReconciliationRequired || payload.imageSubmissionUncertain) return false
  return canReviewImage({orgId, creativeId:row.id, receipt:payload.imageOutputReceipt, storagePath:row.storage_path}) && isImageReviewApproved(payload)
}
