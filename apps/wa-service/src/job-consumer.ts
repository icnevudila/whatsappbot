import { e164ToJid, nextSendWindowOpen, type JobPayloadMap, type JobType } from '@wa/shared'
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
import { findActiveLidForPhone, findPhoneForLid } from './lid-routing.js'
import { prepareVoiceNote } from './audio-converter.js'

const log = logger.child({ scope: 'jobs' })

export { messageSendSkipped } from './message-send-result.js'
export type { MessageSendSkipReason } from './message-send-result.js'

export type JobConsumerStats = {
  processedTotal: number
  succeededTotal: number
  failedTotal: number
  lastJobAt: string | null
  lastJobType: string | null
}

const stats: JobConsumerStats = {
  processedTotal: 0,
  succeededTotal: 0,
  failedTotal: 0,
  lastJobAt: null,
  lastJobType: null,
}

export function getJobConsumerStats(): JobConsumerStats {
  return { ...stats }
}

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

/** Saat penceresi: deneme hakkını yakmadan sonraya bırak. */
class SendWindowWaitError extends Error {
  openAt: Date
  constructor(message: string, openAt: Date) {
    super(message)
    this.name = 'SendWindowWaitError'
    this.openAt = openAt
  }
}

/** Uzak iş (ör. Flow video kuyruğu) sürüyor; deneme hakkını harcamadan tekrar bak. */
class JobDeferredError extends Error {
  delaySeconds: number
  constructor(message: string, delaySeconds: number) {
    super(message)
    this.name = 'JobDeferredError'
    this.delaySeconds = Math.max(5, Math.min(60, Math.round(delaySeconds)))
  }
}

async function deferJob(job: JobRow, error: JobDeferredError): Promise<void> {
  const rows = await query<{ id: string }>(
    `update public.jobs
        set status = 'pending',
            error = $2,
            run_after = now() + make_interval(secs => $3),
            attempts = greatest(0, attempts - 1),
            claimed_by = null,
            claimed_at = null,
            updated_at = now()
      where id = $1::bigint
        and claimed_by = $4
        and status in ('claimed', 'running')
      returning id::text`,
    [job.id, error.message, error.delaySeconds, env.workerId],
  )
  if (rows.length === 0) {
    log.warn({ jobId: job.id }, 'deferJob atlandi: sahiplik kaybedildi')
    return
  }
  log.info({ jobId: job.id, type: job.type, delaySeconds: error.delaySeconds }, 'Is sonucu bekleniyor; yeniden kuyruga alindi')
}

async function requeueForWindow(job: JobRow, error: SendWindowWaitError): Promise<void> {
  const delaySeconds = Math.max(
    30,
    Math.min(6 * 3600, Math.ceil((error.openAt.getTime() - Date.now()) / 1000)),
  )
  const rows = await query<{ id: string }>(
    `update public.jobs
        set status = 'pending',
            error = $2,
            run_after = now() + make_interval(secs => $3),
            attempts = greatest(0, attempts - 1),
            claimed_by = null,
            claimed_at = null,
            updated_at = now()
      where id = $1::bigint
        and claimed_by = $4
        and status in ('claimed', 'running')
      returning id::text`,
    [job.id, error.message, delaySeconds, env.workerId],
  )
  if (rows.length === 0) {
    log.warn({ jobId: job.id }, 'requeueForWindow atlandi: sahiplik kaybedildi')
    return
  }
  log.info({ jobId: job.id, delaySeconds }, 'Gönderim saat aralığı için ertelendi')
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

      const duplicate = await one<{
        is_connected: boolean
        is_same_org: boolean
        org_name: string
        account_label: string
      }>(
        `select * from public.check_phone_connected_elsewhere($1, $2) limit 1`,
        [payload.phone_e164, job.org_id],
      )
      if (duplicate) {
        if (!duplicate.is_same_org) {
          throw new Error(
            `Bu telefon numarası (${payload.phone_e164}) başka bir firmada (${duplicate.org_name}) zaten bağlıdır.`,
          )
        } else {
          throw new Error(
            `Bu telefon numarası (${payload.phone_e164}) bu firmada zaten "${duplicate.account_label}" adıyla bağlıdır.`,
          )
        }
      }

      const code = await sessionManager.requestPairingCode(accountId, payload.phone_e164)
      return { code }
    }

    case 'account.sync_contacts': {
      const accountId = requireAccountId(job)
      if (!job.org_id) throw new Error('account.sync_contacts isi org_id olmadan gelemez')
      const payload = (job.payload ?? {}) as JobPayloadMap['account.sync_contacts']

      const {
        importAccountContactsToList,
        countAccountContacts,
        sampleAccountContacts,
      } = await import('./account-contacts.js')

      const writeProgress = async (partial: Record<string, unknown>) => {
        await query(
          `update public.jobs
              set result = coalesce(result, '{}'::jsonb) || $2::jsonb,
                  updated_at = now()
            where id = $1::bigint
              and claimed_by = $3
              and status in ('claimed', 'running')`,
          [job.id, JSON.stringify(partial), env.workerId],
        )
      }

      const session = sessionManager.get(accountId)
      const live = Boolean(session?.isLive)

      await writeProgress({
        phase: 'pulling',
        live,
        seen: await countAccountContacts(accountId),
        samples: await sampleAccountContacts(accountId, 24),
      })

      if (live && session) {
        await session.resyncContacts({
          maxWaitMs: 90_000,
          onTick: async () => {
            const seen = await countAccountContacts(accountId)
            await writeProgress({
              phase: 'pulling',
              live: true,
              seen,
              samples: await sampleAccountContacts(accountId, 24),
            })
          },
        })
      } else {
        log.warn(
          { accountId },
          'account.sync_contacts: oturum canli degil, yalnizca DB kayitlari aktarilacak',
        )
      }

      // Rehber event'leri gecikebiliyor — import oncesi sayim artana kadar kisa ek bekleme.
      let seen = await countAccountContacts(accountId)
      if (live) {
        const extraStarted = Date.now()
        while (Date.now() - extraStarted < 25_000) {
          await new Promise((resolve) => setTimeout(resolve, 1500))
          const next = await countAccountContacts(accountId)
          if (next !== seen) {
            seen = next
            await writeProgress({
              phase: 'pulling',
              live: true,
              seen,
              samples: await sampleAccountContacts(accountId, 24),
            })
          } else if (seen > 0 && Date.now() - extraStarted > 6_000) {
            break
          }
        }
      }

      await writeProgress({
        phase: 'importing',
        live,
        seen,
        samples: await sampleAccountContacts(accountId, 40),
      })

      let imported = await importAccountContactsToList({
        orgId: job.org_id,
        createdBy: job.created_by,
        accountId,
        listName: payload.list_name,
      })

      // Ilk import 0 ise: gecikmeli rehber icin bekle (iPhone / yeni bagli cihaz sik)
      if (imported.imported === 0) {
        log.info({ accountId, live }, 'account.sync_contacts: ilk aktarim 0 — gecikme beklemesi')
        const lateStarted = Date.now()
        while (Date.now() - lateStarted < 60_000) {
          if (live && session && Date.now() - lateStarted < 5_000) {
            await session.resyncContacts({ maxWaitMs: 30_000 })
          }
          await new Promise((resolve) => setTimeout(resolve, 2_000))
          const next = await countAccountContacts(accountId)
          await writeProgress({
            phase: 'pulling',
            live,
            seen: next,
            samples: await sampleAccountContacts(accountId, 40),
          })
          if (next > 0) break
        }
        imported = await importAccountContactsToList({
          orgId: job.org_id,
          createdBy: job.created_by,
          accountId,
          listName: payload.list_name,
        })
      }

      if (imported.imported === 0 && !live) {
        throw new NonRetryableJobError(
          'Hat şu an canlı değil ve kayıtlı rehber yok. Hatlar’dan bağlayıp tekrar çekin.',
        )
      }

      return {
        ...imported,
        phase: 'done',
        live,
        seen: await countAccountContacts(accountId),
        samples: await sampleAccountContacts(accountId, 60),
      }
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
        if (gate.reason === 'send_window') {
          throw new SendWindowWaitError(
            orgSendGateMessage(gate),
            nextSendWindowOpen(new Date(), gate.window_start, gate.window_end),
          )
        }
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
          const inserted = await query<{ id: string; created_at: string }>(
            `insert into public.message_log
               (org_id, created_by, account_id, direction, phone_e164, message_type, body, wa_message_id, status)
             values ($1, $2, $3, 'out', $4, 'text', $5, $6, 'sent')
             returning id::text, created_at`,
            [
              job.org_id,
              job.created_by,
              accountId,
              payload.phone_e164,
              payload.body ?? '',
              result.messageId,
            ],
          )
          const row = inserted[0]
          void import('./chat-cache.js')
            .then(({ rememberWaMessage }) =>
              rememberWaMessage({
                orgId: job.org_id,
                id: row ? Number(row.id) : 0,
                created_at: row?.created_at,
                account_id: accountId,
                direction: 'out',
                phone_e164: payload.phone_e164,
                message_type: 'text',
                body: payload.body ?? '',
                wa_message_id: result.messageId,
                status: 'sent',
              }),
            )
            .catch(() => {})
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

      let jid: string
      let resolvedPhone = payload.phone_e164 || null
      const isLidRecipient = Boolean(payload.recipient_jid && payload.recipient_jid.endsWith('@lid'))

      if (isLidRecipient) {
        jid = payload.recipient_jid!
        if (!resolvedPhone) {
          resolvedPhone = await findPhoneForLid(accountId, jid)
        }
      } else if (payload.phone_e164) {
        // Bu telefon numarasi ile bu hesapta daha once LID uzerinden konusulmus mu kontrol et.
        // Eger konusulmussa WhatsApp o sohbeti LID'e bagladigi icin PN'e atilan mesajlar
        // alicida 'Mesaj bekleniyor' olarak takilir. Dogrudan LID adresine gondermeliyiz.
        const activeLid = await findActiveLidForPhone(accountId, payload.phone_e164)

        if (activeLid) {
          jid = activeLid
          logger.info(
            { phone: payload.phone_e164, lid: jid, accountId },
            'job-consumer: Aktif LID sohbeti tespit edildi, mesaj dogrudan LID adresine yonlendirildi',
          )
        } else {
          // Dogrulama kapisi tek mesajda da gecerli.
          const verdict = await session.verifyNumbers([payload.phone_e164])
          const entry = verdict.get(payload.phone_e164)
          if (!entry) {
            throw new Error('Dogrulama sonucu alinamadi (oturum dusmus olabilir)')
          }
          if (!entry.exists) {
            return messageSendSkipped('not_on_whatsapp')
          }
          jid = entry.lid || entry.jid || e164ToJid(payload.phone_e164)
        }
      } else {
        throw new Error('Gecerli bir telefon numarasi veya alici kimligi (JID) bulunamadi')
      }
      const marked = await query<{ id: string }>(`update public.jobs set result = '{"delivery_attempted":true}'::jsonb, updated_at = now() where id = $1::bigint and claimed_by = $2 and status = 'running' returning id::text`, [job.id, env.workerId])
      if (marked.length === 0) throw new NonRetryableJobError('İş sahipliği kaybedildi; gönderilmedi.')
      let messageId: string | null = null
      const mediaUrl = payload.media_url
      const messageType = payload.message_type ?? (mediaUrl ? 'image' : 'text')
      try {
        let content: Parameters<typeof session.sendMessage>[1]
        if (messageType === 'location' && payload.location) {
          content = {
            location: {
              degreesLatitude: payload.location.degreesLatitude,
              degreesLongitude: payload.location.degreesLongitude,
              name: payload.location.name,
              address: payload.location.address,
            },
          }
        } else if (messageType === 'contact' && payload.contact) {
          content = {
            contacts: {
              displayName: payload.contact.displayName,
              contacts: [{ vcard: payload.contact.vcard }],
            },
          }
        } else if (messageType === 'audio') {
          if (!mediaUrl) throw new Error('Ses mesaji icin media_url zorunludur')
          const isVoiceNote =
            payload.ptt === true ||
            mediaUrl.toLowerCase().includes('voice') ||
            mediaUrl.toLowerCase().includes('.ogg') ||
            mediaUrl.toLowerCase().includes('.opus') ||
            mediaUrl.toLowerCase().includes('.webm')

          if (isVoiceNote) {
            try {
              const processed = await prepareVoiceNote(mediaUrl)
              content = {
                audio: processed.buffer,
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true,
                seconds: processed.durationSeconds,
                waveform: processed.waveform,
              } as unknown as Parameters<typeof session.sendMessage>[1]
            } catch (err) {
              logger.warn({ err, mediaUrl }, 'Ses PTT formatına dönüştürülemedi, ham URL ile gönderiliyor')
              content = {
                audio: { url: mediaUrl },
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true,
              }
            }
          } else {
            content = {
              audio: { url: mediaUrl },
              mimetype: 'audio/mp4',
              ptt: false,
            }
          }
        } else if (!mediaUrl || messageType === 'text') {
          content = { text: payload.body ?? '' }
        } else if (messageType === 'image') {
          content = { image: { url: mediaUrl }, caption: payload.body ?? undefined }
        } else if (messageType === 'video') {
          const payloadAny = payload as Record<string, unknown>
          let thumbB64: string | undefined
          if (typeof payloadAny.thumbnail_url === 'string' && payloadAny.thumbnail_url) {
            try {
              const res = await fetch(payloadAny.thumbnail_url, { signal: AbortSignal.timeout(4000) })
              if (res.ok) {
                const arr = await res.arrayBuffer()
                thumbB64 = Buffer.from(arr).toString('base64')
              }
            } catch (_) {}
          }
          content = {
            video: { url: mediaUrl },
            caption: payload.body ?? undefined,
            mimetype: 'video/mp4',
            gifPlayback: false,
            ...(thumbB64 ? { jpegThumbnail: thumbB64 } : {}),
          }
        } else if (messageType === 'document') {
          const rawName = payload.media_name || (payload.body && payload.body.includes('.') ? payload.body : 'belge.pdf')
          const isPdf = mediaUrl.toLowerCase().includes('.pdf') || rawName.toLowerCase().endsWith('.pdf')
          const mime = isPdf ? 'application/pdf' : 'application/octet-stream'
          const finalFileName = isPdf && !rawName.toLowerCase().endsWith('.pdf') ? `${rawName}.pdf` : rawName
          content = {
            document: { url: mediaUrl },
            mimetype: mime,
            caption: payload.body && payload.body !== rawName ? payload.body : undefined,
            fileName: finalFileName,
          }
        } else {
          throw new Error(`Desteklenmeyen mesaj tipi: ${messageType}`)
        }

        if (session.isLive) {
          void session.sendPresenceUpdate('composing', jid).catch(() => {})
          const typingMs = Math.floor(2000 + Math.random() * 1000)
          await new Promise((resolve) => setTimeout(resolve, typingMs))
        }

        const message = await session.sendMessage(jid, content)
        messageId = message.key?.id ?? null

        if (session.isLive) {
          void session.sendPresenceUpdate('paused', jid).catch(() => {})
        }
      } catch (error) {
        throw error
      }

      // WA gitti: DB hatasi retry = cift mesaj. Non-retryable bitir.
      try {
        const inserted = await query<{ id: string; created_at: string }>(
          `insert into public.message_log
             (org_id, created_by, account_id, direction, remote_jid, phone_e164, message_type, body, media_url, wa_message_id, status)
           values ($1, $2, $3, 'out', $4, $5, $6, $7, $8, $9, 'sent')
           on conflict (account_id, wa_message_id) where direction = 'out' and wa_message_id is not null and account_id is not null
           do update set status = excluded.status, body = coalesce(excluded.body, public.message_log.body), media_url = coalesce(excluded.media_url, public.message_log.media_url)
           returning id::text, created_at`,
          [
            job.org_id,
            job.created_by,
            accountId,
            jid,
            resolvedPhone,
            messageType,
            payload.body ?? null,
            mediaUrl ?? null,
            messageId,
          ],
        )
        const row = inserted[0]
        void import('./chat-cache.js')
          .then(({ rememberWaMessage }) =>
            rememberWaMessage({
              orgId: job.org_id,
              id: row ? Number(row.id) : 0,
              created_at: row?.created_at,
              account_id: accountId,
              direction: 'out',
              remote_jid: jid,
              phone_e164: payload.phone_e164 || null,
              message_type: messageType,
              body: payload.body ?? null,
              media_url: mediaUrl ?? null,
              wa_message_id: messageId,
              status: 'sent',
            }),
          )
          .catch(() => {})
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

    case 'campaign.bulk_reply': {
      const payload = job.payload as JobPayloadMap['campaign.bulk_reply']
      const replies = payload.replies || []
      if (replies.length === 0) return { sent: 0, total: 0 }

      const campaignId = job.campaign_id || payload.campaign_id
      if (!job.org_id) throw new Error('org_id zorunlu')

      let accountId = job.account_id || payload.account_id
      if (!accountId && campaignId) {
        const row = await one<{ account_id: string }>(
          `select account_id from public.campaign_accounts where campaign_id = $1 limit 1`,
          [campaignId],
        )
        accountId = row?.account_id
      }
      if (!accountId) {
        const row = await one<{ id: string }>(
          `select id from public.accounts where org_id = $1 and status = 'connected' and enabled = true and is_locked = false limit 1`,
          [job.org_id],
        )
        accountId = row?.id
      }
      if (!accountId) throw new Error('Yanıt göndermek için bağlı bir hat bulunamadı')

      const session = sessionManager.get(accountId)
      if (!session || !session.isLive) {
        throw new Error(`Hat bağlı değil (accountId=${accountId})`)
      }

      let sentCount = 0
      let skippedCount = 0

      for (const item of replies) {
        if (!item.phone_e164 || !item.text?.trim()) {
          skippedCount++
          continue
        }

        const blocked = await one<{ id: string }>(
          `select id::text from public.blacklist where org_id = $1 and phone_e164 = $2 limit 1`,
          [job.org_id, item.phone_e164],
        )
        if (blocked) {
          await query(
            `update public.campaign_targets set reply_status = 'opt_out', updated_at = now() where id = $1`,
            [item.target_id],
          )
          skippedCount++
          continue
        }

        const jid = e164ToJid(item.phone_e164)

        try {
          if (session.isLive) {
            void session.sendPresenceUpdate('composing', jid).catch(() => {})
            const typingMs = Math.floor(2000 + Math.random() * 1000)
            await new Promise((resolve) => setTimeout(resolve, typingMs))
          }

          const msg = await session.sendMessage(jid, { text: item.text })

          if (session.isLive) {
            void session.sendPresenceUpdate('paused', jid).catch(() => {})
          }

          const waMsgId = msg.key?.id ?? null

          await query(
            `update public.campaign_targets set reply_status = 'replied', updated_at = now() where id = $1`,
            [item.target_id],
          )

          const inserted = await query<{ id: string; created_at: string }>(
            `insert into public.message_log
               (org_id, created_by, account_id, direction, phone_e164, message_type, body, wa_message_id, status)
             values ($1, $2, $3, 'out', $4, 'text', $5, $6, 'sent')
             returning id::text, created_at`,
            [
              job.org_id,
              job.created_by,
              accountId,
              item.phone_e164,
              item.text,
              waMsgId,
            ],
          )
          const logRow = inserted[0]
          void import('./chat-cache.js')
            .then(({ rememberWaMessage }) =>
              rememberWaMessage({
                orgId: job.org_id!,
                id: logRow ? Number(logRow.id) : 0,
                created_at: logRow?.created_at,
                account_id: accountId,
                direction: 'out',
                phone_e164: item.phone_e164,
                message_type: 'text',
                body: item.text,
                wa_message_id: waMsgId,
                status: 'sent',
              }),
            )
            .catch(() => {})

          sentCount++

          if (sentCount < replies.length) {
            const jitterMs = Math.floor(5000 + Math.random() * 5000)
            await new Promise((resolve) => setTimeout(resolve, jitterMs))
          }
        } catch (sendErr) {
          logger.warn({ err: sendErr, phone: item.phone_e164 }, 'Toplu yanıt gönderilemedi')
          skippedCount++
        }
      }

      return { sent: sentCount, skipped: skippedCount, total: replies.length }
    }

    case 'creative.render': {
      const payload = job.payload as JobPayloadMap['creative.render']
      const creativeId = String(payload.creative_id ?? '').trim()
      if (!creativeId) throw new NonRetryableJobError('creative_id eksik.')
      const base =
        process.env.CUSTOMER_APP_URL?.trim() ||
        process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        ''
      const secret = process.env.JOB_INTERNAL_SECRET?.trim()
      if (!base || !secret) {
        return {
          skipped: true,
          reason:
            'CUSTOMER_APP_URL veya JOB_INTERNAL_SECRET yok; kreatif üretimi müşteri uygulaması fallback akışına bırakıldı.',
        }
      }
      const response = await fetch(`${base.replace(/\/$/, '')}/api/internal/creative-render`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ creativeId }),
        signal: AbortSignal.timeout(Math.max(env.sendTimeoutMs, 55_000)),
      })
      if (response.status === 401) {
        throw new NonRetryableJobError('Kreatif ic istek yetkisiz (JOB_INTERNAL_SECRET).')
      }
      const body = (await response.json().catch(() => null)) as {
        pending?: boolean
        retryAfterSeconds?: number
      } | null
      if (response.status === 202 || body?.pending) {
        throw new JobDeferredError(
          'Flow video kuyruğunda; sonuç için yeniden kontrol edilecek.',
          body?.retryAfterSeconds ?? 15,
        )
      }
      if (!response.ok) {
        const bodyText = JSON.stringify(body ?? {})
        throw new Error(`Kreatif uretimi ${response.status}: ${bodyText.slice(0, 240)}`)
      }
      return { creative_id: creativeId }
    }

    case 'service.restart': {
      log.warn({ jobId: job.id }, 'Yonetici tarafindan Baileys servis yeniden baslatma tetiklendi, servis 1 sn icinde kapaniyor')
      setTimeout(() => {
        process.exit(1)
      }, 1000)
      return { scheduled: true }
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

        stats.processedTotal += 1
        stats.lastJobAt = new Date().toISOString()
        stats.lastJobType = job.type

        const result = await handle(job)
        try {
          await markDone(job.id, result)
          stats.succeededTotal += 1
        } catch (error) {
          stats.failedTotal += 1
          if (job.type === 'message.send') throw new NonRetryableJobError('Gönderim işlendi fakat sonuç kaydedilemedi. Otomatik tekrar yapılmadı.')
          throw error
        }
      } catch (error) {
        if (error instanceof JobDeferredError) {
          await deferJob(job, error)
        } else if (error instanceof SendWindowWaitError) {
          stats.failedTotal += 1
          await requeueForWindow(job, error)
        } else {
          stats.failedTotal += 1
          await markFailed(job, error)
        }
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
