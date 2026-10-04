/** Pre-provider only: capacity contention is a queue condition, not generation failure. */
export async function waitForHeavyCapacity(options: {
  acquire: () => Promise<boolean>
  stillOwnLease: () => Promise<boolean>
  now?: () => number
  sleep?: (milliseconds: number) => Promise<void>
  maxWaitMs?: number
  pollMs?: number
  operationTimeoutMs?: number
  releaseLateAcquisition?: () => Promise<void>
}): Promise<'acquired' | 'deferred' | 'lease_lost'> {
  const now = options.now || Date.now
  const sleep = options.sleep || (ms => new Promise(resolve => setTimeout(resolve, ms)))
  const deadline = now() + (options.maxWaitMs ?? 20_000)
  async function bounded<T>(operation: Promise<T>, late?: (result: T) => Promise<void>): Promise<T> {
    let timedOut = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const watched = operation.then(async result => {
      if (timedOut && late) await late(result)
      return result
    })
    try {
      return await Promise.race([watched, new Promise<never>((_, reject) => {
        timer = setTimeout(() => { timedOut = true; reject(new Error('CAPACITY_OPERATION_TIMEOUT')) }, Math.max(1, Math.min(deadline - now(), options.operationTimeoutMs ?? 5_000)))
      })])
    } finally { if (timer) clearTimeout(timer) }
  }
  while (true) {
    if (now() >= deadline) return 'deferred'
    if (!await bounded(options.stillOwnLease())) return 'lease_lost'
    if (await bounded(options.acquire(), async acquired => {
      if (acquired && options.releaseLateAcquisition) await options.releaseLateAcquisition()
    })) return 'acquired'
    const remaining = deadline - now()
    if (remaining <= 0) return 'deferred'
    await sleep(Math.min(options.pollMs ?? 2_000, remaining))
  }
}

export async function deferCapacityJob(db: any, job: { id: string; org_id: string }, accountId: string): Promise<boolean> {
  const { data, error } = await db.from('ai_media_jobs').update({
    state: 'QUEUED', lease_account_id: null, lease_worker_id: null, lease_timeout_at: null,
    error_code: null, error_message: null, updated_at: new Date().toISOString(),
  }).eq('id', job.id).eq('org_id', job.org_id).eq('state', 'LEASED')
    .eq('lease_account_id', accountId).select('id')
  if (error) throw new Error(`CAPACITY_REQUEUE_DB_ERROR: ${error.message}`)
  if (!data?.some((row: any) => row.id === job.id)) return false
  await db.from('ai_media_events').insert({ job_id: job.id, org_id: job.org_id,
    event_type: 'CAPACITY_WAIT', from_state: 'LEASED', to_state: 'QUEUED',
    message: 'Üretim kapasitesi dolu; iş kuyrukta bekliyor. Yeni sağlayıcı isteği gönderilmedi.',
    payload: { provider_submitted: false, reason: 'HEAVY_CAPACITY_BUSY' },
  })
  return true
}

/** Commit ownership, preparation and audit as one database transaction. */
export async function claimCapacityPreparation(db: any, job: { id: string; org_id: string }, accountId: string, attemptId: string): Promise<boolean> {
  const { data, error } = await db.rpc('studio_prepare_job', {
    p_job_id: job.id, p_org_id: job.org_id, p_account_id: accountId, p_attempt_id: attemptId,
  })
  if (error) throw new Error(`CAPACITY_PREPARATION_DB_ERROR: ${error.message}`)
  return data === true
}
