import { e164ToJid, type JobPayloadMap, type JobType } from '@wa/shared'
import { one, query } from './db.js'
import { env } from './env.js'
import { logger } from './logger.js'
import { sessionManager } from './session-manager.js'
import { materializeTargets, reconcileCampaignTargets, stopCampaign } from './campaign-runner.js'
import { verifyContacts } from './verify.js'
import { DeliveryUncertainError } from './delivery.js'
import { messageSendSkipped } from './message-send-result.js'
import { resolveWabaMessageSend } from './waba-config.js'
import { checkOrgSendGate, orgSendGateMessage } from './org-send-gate.js'

const log = logger.child({ scope: 'jobs' })

export { messageSendSkipped } from './message-send-result.js'
export type { MessageSendSkipReason } from './message-send-result.js'

type JobRow = {
  id: string
  org_id: string | null
  created_by: string | null
  account_id: string | null
  campaign_id: string | null
  type: string
  payload: Record<string, unknown>
  attempts: number
  max_attempts: number
  result: Record<string, unknown> | null
}

async function claim(): Promise<JobRow[]> {
  return query<JobRow>('select * from wa.claim_jobs($1, $2)', [
    env.workerId,
    env.jobBatchSize,
  ])
}

async function markDone(jobId: string, result: unknown): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `update public.jobs
        set status = 'done', result = $2::jsonb, error = null, finished_at = now(), updated_at = now()
      where id = $1::bigint
        and claimed_by = $3
        and status in ('claimed', 'running')
      returning id::text`,
    [jobId, JSON.stringify(result ?? {}), env.workerId],
  )
  if (rows.length === 0) {
    log.warn({ jobId }, 'markDone atlandi: sahiplik kaybedildi')
    return false
  }
  return true
}

/** Retry edilmemesi gereken islem sonrasi hatalar (WA zaten gitti / kara liste). */
class NonRetryableJobError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NonRetryableJobError'
  }
}

async function markFailed(job: JobRow, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error)
  const nonRetryable = error instanceof NonRetryableJobError || error instanceof DeliveryUncertainError
  const canRetry = !nonRetryable && job.attempts < job.max_attempts

  if (canRetry) {
    const delaySeconds = Math.min(300, 5 * 2 ** job.attempts)
    const rows = await query<{ id: string }>(
      `update public.jobs
          set status = 'pending',
              error = $2,
              run_after = now() + make_interval(secs => $3),
              claimed_by = null,
              claimed_at = null,
              updated_at = now()
        where id = $1::bigint
          and claimed_by = $4
          and status in ('claimed', 'running')
        returning id::text`,
      [job.id, message, delaySeconds, env.workerId],
    )
    if (rows.length === 0) {
      log.warn({ jobId: job.id }, 'markFailed(retry) atlandi: sahiplik kaybedildi')
      return
    }
    log.warn({ jobId: job.id, type: job.type, delaySeconds }, 'Is yeniden kuyruga alindi')
    return
  }

  const rows = await query<{ id: string }>(
    `update public.jobs
        set status = 'failed',
            error = $2,
            finished_at = now(),
            claimed_by = null,
            claimed_at = null,
            updated_at = now()
      where id = $1::bigint
        and claimed_by = $3
        and status in ('claimed', 'running')
      returning id::text`,
    [job.id, message, env.workerId],
  )
  if (rows.length === 0) {
    log.warn({ jobId: job.id }, 'markFailed(final) atlandi: sahiplik kaybedildi')
    return
  }
  log.error({ jobId: job.id, type: job.type, err: message }, 'Is kalici olarak basarisiz')
}

function requireAccountId(job: JobRow): string {
  if (!job.account_id) throw new Error(`${job.type} isi account_id olmadan gelemez`)
  return job.account_id
}

function requireCampaignId(job: JobRow): string {
  if (!job.campaign_id) throw new Error(`${job.type} isi campaign_id olmadan gelemez`)
  return job.campaign_id
}

async function handle(job: JobRow): Promise<unknown> {
  switch (job.type as JobType) {
    case 'account.connect': {
      const accountId = requireAccountId(job)
      const result = await sessionManager.connect(accountId)
      if (!result.ok && result.reason !== 'already-active') {
        throw new Error(`Baglanti acilamadi: ${result.reason}${result.detail ? ` (${result.detail})` : ''}`)
      }
      return result
    }

    case 'account.disconnect': {
      const accountId = requireAccountId(job)
      const closed = await sessionManager.disconnect(accountId)
      return { closed }
    }

    case 'account.logout': {
      const accountId = requireAccountId(job)
      await sessionManager.logout(accountId)
      return { loggedOut: true }
    }

    case 'account.request_pairing_code': {
      const accountId = requireAccountId(job)
      const payload = job.payload as JobPayloadMap['account.request_pairing_code']
      if (!payload?.phone_e164) throw new Error('phone_e164 zorunlu')

      const code = await sessionManager.requestPairingCode(accountId, payload.phone_e164)
      return { code }
    }

    case 'account.sync_contacts': {
      const accountId = requireAccountId(job)
      if (!job.org_id) throw new Error('account.sync_contacts isi org_id olmadan gelemez')
      const payload = (job.payload ?? {}) as JobPayloadMap['account.sync_contacts']
      const { importAccountContactsToList } = await import('./account-contacts.js')
      return importAccountContactsToList({
        orgId: job.org_id,
        createdBy: job.created_by,
        accountId,
        listName: payload.list_name,
      })
    }

    case 'message.send': {
      if (job.result?.delivery_attempted) throw new NonRetryableJobError('Önceki gönderimin sonucu belirsiz. Çift mesajı önlemek için yeniden gönderilmedi.')
      const accountId = requireAccountId(job)
      const payload = job.payload as JobPayloadMap['message.send']

      if (!payload.phone_e164) throw new Error('phone_e164 zorunlu')
      if (!job.org_id || !job.created_by) {
        throw new Error('message.send isi org_id ve created_by olmadan gelemez')
      }

      const gate = await checkOrgSendGate(job.org_id)
      if (!gate.ok) {
        throw new NonRetryableJobError(orgSendGateMessage(gate))
      }

      const blocked = await one<{ id: string }>(
        `select id::text from public.blacklist
          where org_id = $1 and phone_e164 = $2
          limit 1`,
        [job.org_id, payload.phone_e164],
      )
      if (blocked) {
        return messageSendSkipped('blacklist')
      }

      const wabaDecision = resolveWabaMessageSend(payload)
      if (wabaDecision.channel === 'fail') {
        throw new NonRetryableJobError(wabaDecision.reason)
      }

      if (wabaDecision.channel === 'waba') {
        const marked = await query<{ id: string }>(
          `update public.jobs set result = '{"delivery_attempted":true}'::jsonb, updated_at = now() where id = $1::bigint and claimed_by = $2 and status = 'running' returning id::text`,
          [job.id, env.workerId],
        )
        if (marked.length === 0) throw new NonRetryableJobError('İş sahipliği kaybedildi; gönderilmedi.')

        const { sendTextCloudApi } = await import('./waba.js')
        const result = await sendTextCloudApi({
          toE164: payload.phone_e164,
          body: payload.body ?? '',
        })
        try {
          await query(
            `insert into public.message_log
               (org_id, created_by, account_id, direction, phone_e164, message_type, body, wa_message_id, status)
             values ($1, $2, $3, 'out', $4, 'text', $5, $6, 'sent')`,
            [
              job.org_id,
              job.created_by,
              accountId,
              payload.phone_e164,
              payload.body ?? '',
              result.messageId,
            ],
          )
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error)
          throw new NonRetryableJobError(
            `Mesaj gonderildi ama kayit yazilamadi (retry yok): ${detail}`,
          )
        }
        return { sent: true, channel: 'waba', messageId: result.messageId }
      }

      const session = sessionManager.get(accountId)
      if (!session?.isLive) throw new Error('Hesap bagli degil')

      // Dogrulama kapisi tek mesajda da gecerli.
      const verdict = await session.verifyNumbers([payload.phone_e164])
      const entry = verdict.get(payload.phone_e164)
      if (!entry) {
        throw new Error('Dogrulama sonucu alinamadi (oturum dusmus olabilir)')
      }
      if (!entry.exists) {
        return messageSendSkipped('not_on_whatsapp')
      }

      const jid = entry.jid ?? e164ToJid(payload.phone_e164)
      const marked = await query<{ id: string }>(`update public.jobs set result = '{"delivery_attempted":true}'::jsonb, updated_at = now() where id = $1::bigint and claimed_by = $2 and status = 'running' returning id::text`, [job.id, env.workerId])
      if (marked.length === 0) throw new NonRetryableJobError('İş sahipliği kaybedildi; gönderilmedi.')
      let messageId: string | null = null
      const mediaUrl = payload.media_url
      const messageType = payload.message_type ?? (mediaUrl ? 'image' : 'text')
      try {
        let content: Parameters<typeof session.sendMessage>[1]
        if (!mediaUrl || messageType === 'text') {
          content = { text: payload.body ?? '' }
        } else if (messageType === 'image') {
          content = { image: { url: mediaUrl }, caption: payload.body ?? undefined }
        } else if (messageType === 'video') {
          content = { video: { url: mediaUrl }, caption: payload.body ?? undefined }
        } else if (messageType === 'document') {
          content = {
            document: { url: mediaUrl },
            mimetype: 'application/octet-stream',
            caption: payload.body ?? undefined,
            fileName: 'dosya',
          }
        } else {
          throw new Error(`Desteklenmeyen mesaj tipi: ${messageType}`)
        }
        const message = await session.sendMessage(jid, content)
        messageId = message.key?.id ?? null
      } catch (error) {
        throw error
      }

      // WA gitti: DB hatasi retry = cift mesaj. Non-retryable bitir.
      try {
        await query(
          `insert into public.message_log
             (org_id, created_by, account_id, direction, remote_jid, phone_e164, message_type, body, media_url, wa_message_id, status)
           values ($1, $2, $3, 'out', $4, $5, $6, $7, $8, $9, 'sent')`,
          [
            job.org_id,
            job.created_by,
            accountId,
            jid,
            payload.phone_e164,
            messageType,
            payload.body ?? null,
            mediaUrl ?? null,
            messageId,
          ],
        )
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error)
        throw new NonRetryableJobError(
          `Mesaj gonderildi ama kayit yazilamadi (retry yok): ${detail}`,
        )
      }

      return { messageId }
    }

    case 'contacts.verify': {
      const payload = job.payload as JobPayloadMap['contacts.verify']
      if (!job.org_id) throw new Error('contacts.verify isi org_id olmadan gelemez')
      return verifyContacts(job.org_id, payload)
    }

    case 'contacts.check_phone': {
      const payload = job.payload as JobPayloadMap['contacts.check_phone']
      if (!job.org_id) throw new Error('contacts.check_phone isi org_id olmadan gelemez')
      const phone = payload?.phone_e164?.trim()
      if (!phone) throw new Error('phone_e164 zorunlu')

      const { findLiveSessionForOrg } = await import('./verify.js')
      const session = findLiveSessionForOrg(job.org_id)
      if (!session?.isLive) {
        throw new Error('Kontrol icin bagli bir WhatsApp hesabi gerekiyor')
      }

      const verdicts = await session.verifyNumbers([phone])
      const verdict = verdicts.get(phone)
      if (!verdict) {
        throw new Error('Dogrulama sonucu alinamadi (oturum dusmus olabilir)')
      }

      const exists = verdict.exists === true

      // Defterde varsa wa_status guncelle (Yoksa yeni kisi zorlamayiz).
      await query(
        `update public.contacts
            set wa_status = $3,
                wa_jid = $4,
                wa_checked_at = now(),
                updated_at = now()
          where org_id = $1::uuid and phone_e164 = $2`,
        [job.org_id, phone, exists ? 'valid' : 'invalid', verdict.jid ?? null],
      )

      return {
        phone_e164: phone,
        exists,
        jid: verdict.jid,
      }
    }

    case 'contacts.scrape': {
      const payload = job.payload as JobPayloadMap['contacts.scrape']
      if (!payload?.url) throw new Error('url zorunlu')
      const started = Date.now()
      const { crawlContacts } = await import('./scraper/crawl.js')
      const result = await crawlContacts(payload.url, {
        maxPages: payload.max_pages,
        mode: payload.mode,
      })
      return {
        ...result,
        durationMs: Date.now() - started,
      }
    }

    case 'contacts.discover': {
      const payload = job.payload as JobPayloadMap['contacts.discover']
      if (!payload?.query?.trim()) throw new Error('query zorunlu')
      const { env: serviceEnv } = await import('./env.js')
      const usePlaces =
        serviceEnv.discoverEngine === 'places' ||
        (serviceEnv.discoverEngine === 'auto' && Boolean(serviceEnv.googleMapsApiKey))

      if (usePlaces) {
        if (!serviceEnv.googleMapsApiKey) {
          throw new Error('DISCOVER_ENGINE=places ama GOOGLE_MAPS_API_KEY yok')
        }
        const { discoverWithPlacesApi } = await import('./scraper/places-discover.js')
        const result = await discoverWithPlacesApi(payload.query, {
          maxResults: payload.max_results,
        })
        if (result.contacts.length === 0 && result.errors.length > 0) {
          throw new Error(result.errors[0] ?? 'Places kesfi basarisiz')
        }
        return result
      }

      const { discoverLocalBusinesses } = await import('./scraper/maps-discover.js')
      return discoverLocalBusinesses(payload.query, {
        maxResults: payload.max_results,
      })
    }

    case 'campaign.start': {
      const campaignId = requireCampaignId(job)
      const allowed = await one<{ status: string }>(
        `select status from public.campaigns where id = $1`,
        [campaignId],
      )
      if (!allowed || !['draft', 'scheduled', 'paused', 'stopped'].includes(allowed.status)) {
        throw new NonRetryableJobError(
          `Kampanya başlatılamaz (status=${allowed?.status ?? 'yok'}).`,
        )
      }

      const summary = await materializeTargets(campaignId)

      await query(
        `update public.campaigns
            set status = 'running',
                started_at = coalesce(started_at, now()),
                paused_at = null,
                stop_reason = null,
                completed_at = null,
                updated_at = now()
          where id = $1
            and status in ('draft', 'scheduled', 'paused', 'stopped')`,
        [campaignId],
      )

      return summary
    }

    case 'campaign.pause': {
      const campaignId = requireCampaignId(job)
      await query(
        `update public.campaigns
            set status = 'paused', paused_at = now(), updated_at = now()
          where id = $1 and status = 'running'`,
        [campaignId],
      )
      return { paused: true }
    }

    case 'campaign.resume': {
      const campaignId = requireCampaignId(job)
      await query(
        `update public.campaigns
            set status = 'running',
                paused_at = null,
                stop_reason = null,
                updated_at = now()
          where id = $1 and status = 'paused'`,
        [campaignId],
      )
      return { resumed: true }
    }

    case 'campaign.stop': {
      const campaignId = requireCampaignId(job)
      const payload = job.payload as JobPayloadMap['campaign.stop']
      await stopCampaign(campaignId, payload.reason ?? 'Panelden durduruldu')
      return { stopped: true }
    }

    case 'campaign.refresh_targets': {
      const campaignId = requireCampaignId(job)
      const payload = job.payload as JobPayloadMap['campaign.refresh_targets']
      const row = await one<{ status: string }>(
        `select status from public.campaigns where id = $1`,
        [campaignId],
      )
      if (!row || !['draft', 'paused', 'scheduled', 'running', 'stopped'].includes(row.status)) {
        throw new NonRetryableJobError(
          `Hedef yenilenemez (status=${row?.status ?? 'yok'}).`,
        )
      }
      return reconcileCampaignTargets(campaignId, {
        cancelRemaining: Boolean(payload.cancel_remaining),
      })
    }

    case 'creative.render': {
      // Panel /api/kreatif ile uretir; kuyruga dusen eski satirlar kalici fail olmasin.
      throw new NonRetryableJobError(
        'Kreatif uretimi panel uzerinden yapilir (/marka-kiti). Bu is tipi kullanilmiyor.',
      )
    }

    default: {
      throw new Error(`Bilinmeyen is tipi: ${job.type}`)
    }
  }
}

let running = false
let timer: ReturnType<typeof setTimeout> | undefined
let tickActive = false
let inFlightJobs = 0

export function jobInFlightCount(): number {
  return inFlightJobs
}

async function tick(): Promise<void> {
  tickActive = true
  try {
    // Batch: env.JOB_BATCH_SIZE (varsayilan 1). Ayni tick icinde sirayla islenir.
    const jobs = await query<JobRow>('select * from wa.claim_jobs($1, $2)', [
      env.workerId,
      env.jobBatchSize,
    ])
    if (jobs.length === 0) return

    log.info({ count: jobs.length, type: jobs[0]?.type }, 'Is alindi')

    for (const job of jobs) {
      inFlightJobs += 1
      const heartbeat = setInterval(() => {
        void query(
          `update public.jobs
              set claimed_at = now(), updated_at = now()
            where id = $1::bigint
              and claimed_by = $2
              and status = 'running'`,
          [job.id, env.workerId],
        ).catch((error) => {
          log.warn({ err: error, jobId: job.id }, 'Job heartbeat basarisiz')
        })
      }, 45_000)
      try {
        const claimed = await query<{ id: string }>(
          `update public.jobs
              set status = 'running', claimed_at = now(), updated_at = now()
            where id = $1::bigint
              and claimed_by = $2
              and status = 'claimed'
            returning id::text`,
          [job.id, env.workerId],
        )
        if (claimed.length === 0) {
          log.warn({ jobId: job.id }, 'running gecisi atlandi: sahiplik kaybedildi')
          continue
        }
        const result = await handle(job)
        try {
          await markDone(job.id, result)
        } catch (error) {
          if (job.type === 'message.send') throw new NonRetryableJobError('Gönderim işlendi fakat sonuç kaydedilemedi. Otomatik tekrar yapılmadı.')
          throw error
        }
      } catch (error) {
        await markFailed(job, error)
      } finally {
        clearInterval(heartbeat)
        inFlightJobs -= 1
      }
    }
  } finally {
    tickActive = false
  }
}

export function startJobConsumer(): void {
  if (running) return
  running = true

  const loop = async (): Promise<void> => {
    if (!running) return

    try {
      await tick()
    } catch (error) {
      log.error({ err: error }, 'Is kuyrugu dongusunde hata')
    }

    if (running) {
      timer = setTimeout(() => void loop(), env.jobPollIntervalMs)
    }
  }

  void loop()
  log.info({ intervalMs: env.jobPollIntervalMs }, 'Is kuyrugu tuketicisi basladi')
}

export function stopJobConsumer(): void {
  running = false
  if (timer) clearTimeout(timer)
}

/** Kapanis oncesi aktif islerin bitmesini bekler. */
export async function drainJobConsumer(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while ((tickActive || inFlightJobs > 0) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  if (tickActive || inFlightJobs > 0) {
    log.warn({ inFlightJobs, tickActive }, 'Job drain zaman asimina ugradi')
  }
}

/** Bu process'in yarim biraktigi isleri kuyruga geri koyar. */
export async function requeueOwnJobs(): Promise<number> {
  const rows = await query<{ id: string }>(
    `update public.jobs
        set status = 'pending', claimed_by = null, claimed_at = null, updated_at = now()
      where claimed_by = $1
        and status in ('claimed', 'running')
      returning id`,
    [env.workerId],
  )
  return rows.length
}

/** Herhangi bir worker'da takili kalan isleri global reclaim. */
export async function reclaimStaleJobs(): Promise<number> {
  const row = await one<{ n: number }>(
    'select wa.reclaim_stale_jobs($1)::int as n',
    [env.staleJobSeconds],
  )
  return row?.n ?? 0
}

export async function pendingJobCount(): Promise<number> {
  const row = await one<{ count: string }>(
    `select count(*)::text as count from public.jobs where status = 'pending'`,
  )
  return Number(row?.count ?? 0)
}

export async function staleClaimedJobCount(): Promise<number> {
  const row = await one<{ count: string }>(
    `select count(*)::text as count
       from public.jobs
      where status in ('claimed', 'running')
        and claimed_at < now() - make_interval(secs => $1)`,
    [env.staleJobSeconds],
  )
  return Number(row?.count ?? 0)
}
