/** Technical validation and editorial approval are separate, mandatory gates. */
export function isApprovedVideoOutput(output: { verified?: unknown; is_approved?: unknown }): boolean {
  return output.verified === true && output.is_approved === true
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
