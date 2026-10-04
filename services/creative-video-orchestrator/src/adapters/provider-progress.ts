export interface ProviderProgressEvent {
  org_id: string
  job_id: string
  attempt_id: string
  sequence: number
  stage: 'OPENING_PROJECT' | 'ATTACHING_INGREDIENTS' | 'INGREDIENTS_VERIFIED' | 'GENERATING'
  observed_at: string
  flow_project_id?: string
  verified_assets?: Array<{ asset_id: string; org_id: string; sha256: string; role: string; attached_media_id: string }>
}

/** Poll a separate evidence journal while the existing single POST is in flight. */
export async function executeWithProgress(
  execution: () => Promise<Response>,
  progressUrl: string,
  identity: { org_id: string; job_id: string; attempt_id: string },
  onProgress?: (event: ProviderProgressEvent) => Promise<void>,
): Promise<Response> {
  if (!onProgress) return execution()
  const preflight = await fetch(progressUrl, { signal: AbortSignal.timeout(5000) })
  if (!preflight.ok) throw new Error(`PROVIDER_PROGRESS_UNAVAILABLE: HTTP ${preflight.status}`)
  const initial = await preflight.json() as { events?: ProviderProgressEvent[] }
  if (!Array.isArray(initial.events) || initial.events.length !== 0) throw new Error('PROVIDER_ATTEMPT_ALREADY_EXISTS_OR_INVALID')
  let settled = false
  let response: Response | undefined
  let failure: unknown
  const pending = execution().then(value => { response = value }, error => { failure = error })
    .finally(() => { settled = true })
  let delivered = 0
  const stages = ['OPENING_PROJECT', 'ATTACHING_INGREDIENTS', 'INGREDIENTS_VERIFIED', 'GENERATING']
  const consume = async () => {
    const res = await fetch(progressUrl, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`PROVIDER_PROGRESS_UNAVAILABLE: HTTP ${res.status}`)
    const body = await res.json() as { events?: ProviderProgressEvent[] }
    if (!Array.isArray(body.events)) throw new Error('PROVIDER_PROGRESS_INVALID')
    for (const event of body.events) {
      if (event.sequence <= delivered) continue
      if (delivered >= stages.length || event.org_id !== identity.org_id || event.job_id !== identity.job_id || event.attempt_id !== identity.attempt_id
        || event.sequence !== delivered + 1 || event.stage !== stages[delivered] || !Number.isFinite(Date.parse(event.observed_at))) {
        throw new Error('PROVIDER_PROGRESS_IDENTITY_OR_ORDER_INVALID')
      }
      await onProgress(event)
      delivered++
    }
  }
  try {
    while (!settled) {
      await consume()
      if (!settled) await Promise.race([pending, new Promise(resolve => setTimeout(resolve, 1000))])
    }
    await consume()
    if (failure) throw failure
    if (!response) throw new Error('PROVIDER_RESPONSE_MISSING')
    if (response.ok && delivered !== stages.length) throw new Error('PROVIDER_PROGRESS_INCOMPLETE')
    return response
  } catch (error) {
    // Preserve the account lease until the single in-flight execution settles.
    // A progress failure never authorizes another paid submission.
    await pending
    throw error
  }
}
