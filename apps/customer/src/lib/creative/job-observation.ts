/** A terminal worker state does not guarantee that its output row is visible yet. */
export function videoObservationComplete(job: {state: string; playback_url?: string | null}): boolean {
  return job.state === 'FAILED' ||
    ((job.state === 'COMPLETED' || job.state === 'NEEDS_REVIEW') && Boolean(job.playback_url))
}
