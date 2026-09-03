import { e164ToJid, type JobPayloadMap, type JobType } from '@wa/shared'
import { one, query } from './db.js'
import { env } from './env.js'
import { logger } from './logger.js'
import { sessionManager } from './session-manager.js'
import { materializeTargets, stopCampaign } from './campaign-runner.js'
import { verifyContacts } from './verify.js'

const log = logger.child({ scope: 'jobs' })

type JobRow = {
  id: string
  owner_id: string | null
  account_id: string | null
  campaign_id: string | null
  type: string
  payload: Record<string, unknown>
  attempts: number
  max_attempts: number
}

async function claim(): Promise<JobRow[]> {
  return query<JobRow>('select * from wa.claim_jobs($1, $2)', [
    env.workerId,
    env.jobBatchSize,
  ])
}

async function markDone(jobId: string, result: unknown): Promise<void> {
  await query(
    `update public.jobs
        set status = 'done', result = $2::jsonb, error = null, finished_at = now(), updated_at = now()
      where id = $1`,
    [jobId, JSON.stringify(result ?? {})],
  )
}

async function markFailed(job: JobRow, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error)
  const canRetry = job.attempts < job.max_attempts

  if (canRetry) {
    // Artan gecikmeyle tekrar kuyruga koy.
    const delaySeconds = Math.min(300, 5 * 2 ** job.attempts)
    await query(
      `update public.jobs
          set status = 'pending',
              error = $2,
              run_after = now() + make_interval(secs => $3),
              claimed_by = null,
              claimed_at = null,
              updated_at = now()
        where id = $1`,
      [job.id, message, delaySeconds],
    )
    log.warn({ jobId: job.id, type: job.type, delaySeconds }, 'Is yeniden kuyruga alindi')
    return
  }

  await query(
    `update public.jobs
        set status = 'failed', error = $2, finished_at = now(), updated_at = now()
      where id = $1`,
    [job.id, message],
  )
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

    case 'message.send': {
      const accountId = requireAccountId(job)
      const payload = job.payload as JobPayloadMap['message.send']
      const session = sessionManager.get(accountId)
      if (!session?.isLive) throw new Error('Hesap bagli degil')

      if (!payload.phone_e164) throw new Error('phone_e164 zorunlu')

      // Dogrulama kapisi tek mesajda da gecerli.
      const verdict = await session.verifyNumbers([payload.phone_e164])
      const entry = verdict.get(payload.phone_e164)
      if (!entry?.exists) {
        throw new Error("Numara WhatsApp'ta kayitli degil, gonderim yapilmadi")
      }

      const jid = entry.jid ?? e164ToJid(payload.phone_e164)
      const message = payload.media_url
        ? await session.sendMessage(jid, {
            image: { url: payload.media_url },
            caption: payload.body ?? undefined,
          })
        : await session.sendMessage(jid, { text: payload.body ?? '' })

      await query(
        `insert into public.message_log
           (owner_id, account_id, direction, remote_jid, phone_e164, message_type, body, media_url, wa_message_id, status)
         values ($1, $2, 'out', $3, $4, $5, $6, $7, $8, 'sent')`,
        [
          job.owner_id,
          accountId,
          jid,
          payload.phone_e164,
          payload.media_url ? 'image' : 'text',
          payload.body ?? null,
          payload.media_url ?? null,
          message.key?.id ?? null,
        ],
      )

      return { messageId: message.key?.id }
    }

    case 'contacts.verify': {
      const payload = job.payload as JobPayloadMap['contacts.verify']
      if (!job.owner_id) throw new Error('contacts.verify isi owner_id olmadan gelemez')
      return verifyContacts(job.owner_id, payload)
    }

    case 'campaign.start': {
      const campaignId = requireCampaignId(job)
      const summary = await materializeTargets(campaignId)

      await query(
        `update public.campaigns
            set status = 'running',
                started_at = coalesce(started_at, now()),
                paused_at = null,
                stop_reason = null,
                updated_at = now()
          where id = $1`,
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
            set status = 'running', paused_at = null, updated_at = now()
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

    case 'creative.render': {
      throw new Error('Kreatif uretimi MVP kapsaminda degil, gorseli yukleyerek kullanin')
    }

    default: {
      throw new Error(`Bilinmeyen is tipi: ${job.type}`)
    }
  }
}

let running = false
let timer: ReturnType<typeof setTimeout> | undefined

async function tick(): Promise<void> {
  const jobs = await claim()
  if (jobs.length === 0) return

  log.info({ count: jobs.length }, 'Is alindi')

  for (const job of jobs) {
    try {
      await query(
        `update public.jobs set status = 'running', updated_at = now() where id = $1`,
        [job.id],
      )
      const result = await handle(job)
      await markDone(job.id, result)
    } catch (error) {
      await markFailed(job, error)
    }
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

export async function pendingJobCount(): Promise<number> {
  const row = await one<{ count: string }>(
    `select count(*)::text as count from public.jobs where status = 'pending'`,
  )
  return Number(row?.count ?? 0)
}
