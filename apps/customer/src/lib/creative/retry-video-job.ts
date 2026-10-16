/** Retry the orchestrated job, not only its legacy library projection. */
export async function retryVideoJob(db: any, orgId: string, jobId: string): Promise<string | null> {
  const { data: job, error } = await db.from('ai_media_jobs')
    .select('id,state,retry_count,max_retries').eq('id', jobId).eq('org_id', orgId).maybeSingle()
  if (error || !job) return 'Video işi bulunamadı; yeniden üretim başlatılmadı.'
  if (job.state !== 'FAILED') return 'Video işi korunuyor; yalnızca başarısız işler yeniden denenebilir.'
  if (job.retry_count >= job.max_retries) return 'Video için yeniden deneme sınırına ulaşıldı.'
  const { data: updated, error: updateError } = await db.from('ai_media_jobs').update({
    state: 'QUEUED', retry_count: job.retry_count + 1, error_code: null, error_message: null,
    lease_worker_id: null, lease_account_id: null, lease_timeout_at: null,
    updated_at: new Date().toISOString(),
  }).eq('id', jobId).eq('org_id', orgId).eq('state', 'FAILED').eq('retry_count', job.retry_count)
    .select('id').maybeSingle()
  if (updateError) return 'Video yeniden kuyruğa alınamadı.'
  if (!updated) return 'İşin durumu değişti; ikinci üretim başlatılmadı.'
  return null
}
