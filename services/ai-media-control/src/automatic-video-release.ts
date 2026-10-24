/** Only the review policy's explicit non-severe result may skip manual editorial confirmation. */
export function automaticVideoRelease(review: {decision: string; isSevere?: boolean; details?: string; audio_report?: {passed?: boolean; failureCode?: string}}, presentationPassed: boolean): boolean {
  if (!presentationPassed || review.isSevere === true) return false
  const audio = review.audio_report
  if (audio?.passed === false) return false
  // Absence of a proven severe defect is not proof that the product was reviewed.
  // Preserve explicitly non-severe editorial warnings, but never release the
  // severe reviewer's missing-evidence fallback as an approved final video.
  if (review.decision === 'NEEDS_REVIEW' && /evidence is incomplete|human review is required/i.test(review.details || '')) return false
  return review.decision === 'PASS' || (review.decision === 'NEEDS_REVIEW' && review.isSevere === false)
}
