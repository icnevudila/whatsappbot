/** Persisted serious failures always override a stale approval flag. */
export function hasBlockingVideoProblem(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasBlockingVideoProblem)
  if (!value || typeof value !== 'object') return false
  const report = value as Record<string, unknown>
  // An explicitly non-severe editorial decision or voiceover-window warning is not a confirmed failure.
  // Still traverse nested reports so a serious finding cannot hide under that parent decision.
  const editorialWarning = report.isSevere === false && report.decision === 'NEEDS_REVIEW'
  const timingWarning = report.failureCode === 'VOICEOVER_TIMING_FAIL' || report.failureCode === 'AUDIO_VERIFICATION_UNAVAILABLE' || report.failureCode === 'SPOKEN_DIALOGUE_FAIL'
  if ((report.passed === false && !editorialWarning && !timingWarning) || report.isSevere === true || report.blocked === true || report.critical === true ||
    ['FAIL', 'FAILED', 'BLOCKED', 'CRITICAL', 'REJECTED'].includes(String(report.status || '').toUpperCase()) ||
    ['critical', 'severe'].includes(String(report.severity || '').toLowerCase()) ||
    ['hardFails', 'hard_fails', 'blocking_issues', 'technical_checks'].some(key => Array.isArray(report[key]) && (report[key] as unknown[]).length > 0)) return true
  return Object.values(report).some(item => item !== null && typeof item === 'object' && hasBlockingVideoProblem(item))
}

/** Manual editorial confirmation is no longer required for a successful persisted final output. */
export function isApprovedVideoOutput(output: { verified?: unknown; is_approved?: unknown }): boolean {
  return output.verified === true && output.is_approved === true
}

export function isApprovedFinalVideoOutput(output: {
  verified?: unknown; is_approved?: unknown; duration_seconds?: unknown; width?: unknown; height?: unknown; product_type?: unknown;
  visual_qa_report?: unknown; sha256?: unknown; byte_size?: unknown; file_path?: unknown
}): boolean {
  const duration = Number(output.duration_seconds), width = Number(output.width), height = Number(output.height)
  const validDuration = output.product_type === 'LONG_FORM_VIDEO_V1' ? duration >= 24 : Math.abs(duration - 10) <= 0.1
  const report = output.visual_qa_report as Record<string, unknown> | null | undefined
  const intactFinal = typeof output.sha256 === 'string' && /^[a-f0-9]{64}$/i.test(output.sha256) &&
    Number.isSafeInteger(Number(output.byte_size)) && Number(output.byte_size) > 0 &&
    typeof output.file_path === 'string' && output.file_path.endsWith('.mp4') &&
    !/(?:^|[\/_.-])raw(?:[\/_.-]|$)/i.test(output.file_path)
  const combined = report?.combined_review as Record<string, unknown> | undefined
  const editorialOnly = intactFinal && output.verified === true && output.is_approved === false &&
    ((report?.reason === 'TECHNICAL_VALIDATION_ONLY' && Array.isArray(report.technical_checks) && report.technical_checks.length === 0) ||
      (combined?.decision === 'NEEDS_REVIEW' && combined.isSevere === false))
  return intactFinal && !hasBlockingVideoProblem(report) && (isApprovedVideoOutput(output) || editorialOnly) && Number.isFinite(duration) && validDuration && width >= 720 && height >= 1280 && Math.abs(width / height - 9 / 16) <= 0.01
}

/** Private inspection is allowed only for a validated output of the owned review job. */
export function isReviewVideoOutput(
  output: { verified?: unknown; is_approved?: unknown; sha256?: unknown; org_id?: unknown; job_id?: unknown },
  job: { id?: unknown; org_id?: unknown; state?: unknown } | null,
  orgId: string,
): boolean {
  return !!job && job.state === 'NEEDS_REVIEW' && job.org_id === orgId &&
    output.org_id === orgId && output.job_id === job.id && output.verified === true &&
    output.is_approved === false && typeof output.sha256 === 'string' && /^[a-f0-9]{64}$/i.test(output.sha256)
}
