/** Customer policy: editorial review is advisory; persisted technical validation remains required. */
export function isApprovedVideoOutput(output: { verified?: unknown; is_approved?: unknown }): boolean {
  return output.verified === true
}

export function isApprovedFinalVideoOutput(output: {
  verified?: unknown; is_approved?: unknown; duration_seconds?: unknown; width?: unknown; height?: unknown; product_type?: unknown
}): boolean {
  const duration = Number(output.duration_seconds), width = Number(output.width), height = Number(output.height)
  const validDuration = output.product_type === 'LONG_FORM_VIDEO_V1' ? duration >= 24 : Math.abs(duration - 10) <= 0.1
  return isApprovedVideoOutput(output) && Number.isFinite(duration) && validDuration && width >= 720 && height >= 1280 && Math.abs(width / height - 9 / 16) <= 0.01
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
