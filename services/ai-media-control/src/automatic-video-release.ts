/** Only the review policy's explicit non-severe result may skip manual editorial confirmation. */
export function automaticVideoRelease(review: {decision: string; isSevere?: boolean; audio_report?: {passed?: boolean; failureCode?: string}}, presentationPassed: boolean): boolean {
  if (!presentationPassed || review.isSevere === true) return false
  const audio = review.audio_report
  if (audio?.passed === false && audio.failureCode !== 'VOICEOVER_TIMING_FAIL') return false
  return review.decision === 'PASS' || (review.decision === 'NEEDS_REVIEW' && review.isSevere === false)
}
