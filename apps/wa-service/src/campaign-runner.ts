import { e164ToJid } from '@wa/shared'
import { incrementSentToday, lockAccount, logAccountEvent } from './accounts.js'
import { one, query } from './db.js'
import { env } from './env.js'
import { logger } from './logger.js'
import { sessionManager } from './session-manager.js'
import type { WhatsAppSession } from './session.js'

const log = logger.child({ scope: 'campaign' })

const MAX_TARGET_ATTEMPTS = 3
const REACH_OUT_TIME_LOCK = 463
/** Gonderim yarida kalirsa (timeout / restart) hedef 'sending'de kilitlenmesin. */
const STALE_SENDING_MS = 90_000

/**
 * Isindirma egrisi. Yeni bir hesap ilk gunden yuz mesaj atmaya kalkarsa
 * kisitlanma olasiligi cok yuksek; kota hesabin yasina gore aciliyor.
 */
function warmupCap(warmupStartedAt: string | null): number {
  if (!warmupStartedAt) return 10

  const days = Math.floor(
    (Date.now() - new Date(warmupStartedAt).getTime()) / (24 * 60 * 60 * 1_000),
  )

  if (days < 1) return 10
  if (days < 3) return 25
  if (days < 7) return 60
  if (days < 14) return 120
  return 250
}

type CampaignRow = {
  id: string
  owner_id: string
  name: string
  message_type: string
  body: string | null
  media_url: string | null
  min_delay_seconds: number
  max_delay_seconds: number
  daily_cap_per_account: number
  source_list_ids: string[]
}

type CampaignAccountRow = {
  account_id: string
  owner_id: string
  daily_send_limit: number
  sent_today: number
  sent_today_on: string | null
  warmup_started_at: string | null
  is_locked: boolean
  enabled: boolean
  reachout_locked_until: string | null
  new_chat_quota_total: number | null
  new_chat_quota_used: number | null
}

type TargetRow = {
  id: string
  phone_e164: string
  contact_id: string | null
  contact_name: string | null
  wa_status: string | null
  wa_jid: string | null
}

/** Hesap basina bir sonraki gonderimin en erken zamani (rastgele gecikme). */
const nextSendAt = new Map<string, number>()

/**
 * Kampanya hedeflerini listelerden uretir.
 * Karaliste dislanir, ayni numara bir kez eklenir.
 */
export async function materializeTargets(
  campaignId: string,
): Promise<{ inserted: number; total: number }> {
  const campaign = await one<CampaignRow>(
    `select id, owner_id, name, message_type, body, media_url,
            min_delay_seconds, max_delay_seconds, daily_cap_per_account, source_list_ids
       from public.campaigns where id = $1`,
    [campaignId],
  )

  if (!campaign) throw new Error('Kampanya bulunamadi')
  if (campaign.source_list_ids.length === 0) {
    throw new Error('Kampanyaya en az bir kisi listesi baglanmali')
  }

  const accounts = await query<{ account_id: string }>(
    'select account_id from public.campaign_accounts where campaign_id = $1',
    [campaignId],
  )
  if (accounts.length === 0) {
    throw new Error('Kampanyaya en az bir gonderen hesap baglanmali')
  }

  const inserted = await query<{ id: string }>(
    `insert into public.campaign_targets (campaign_id, owner_id, contact_id, phone_e164)
     select distinct $1::uuid, $2::uuid, c.id, c.phone_e164
       from public.contacts c
       join public.contact_list_members m on m.contact_id = c.id
      where c.owner_id = $2::uuid
        and m.list_id = any($3::uuid[])
        and not exists (
          select 1 from public.blacklist b
           where b.owner_id = $2::uuid and b.phone_e164 = c.phone_e164
        )
     on conflict (campaign_id, phone_e164) do nothing
     returning id`,
    [campaignId, campaign.owner_id, campaign.source_list_ids],
  )

  const total = await one<{ count: string }>(
    'select count(*)::text as count from public.campaign_targets where campaign_id = $1::uuid',
    [campaignId],
  )

  const totalCount = Number(total?.count ?? 0)
  if (totalCount === 0) {
    throw new Error('Secilen listelerde gonderilecek numara yok')
  }

  await query(
    'update public.campaigns set total_targets = $2::int, updated_at = now() where id = $1::uuid',
    [campaignId, totalCount],
  )

  log.info({ campaignId, inserted: inserted.length, total: totalCount }, 'Hedefler hazirlandi')
  return { inserted: inserted.length, total: totalCount }
}

export async function stopCampaign(campaignId: string, reason: string): Promise<void> {
  await query(
    `update public.campaigns
        set status = 'stopped', stop_reason = $2, updated_at = now()
      where id = $1 and status in ('running', 'paused', 'scheduled')`,
    [campaignId, reason],
  )
  log.warn({ campaignId, reason }, 'Kampanya durduruldu')
}

async function eligibleAccounts(campaignId: string): Promise<CampaignAccountRow[]> {
  return query<CampaignAccountRow>(
    `select ca.account_id,
            ca.owner_id,
            a.daily_send_limit,
            a.sent_today,
            a.sent_today_on,
            a.warmup_started_at,
            a.is_locked,
            a.enabled,
            a.reachout_locked_until,
            a.new_chat_quota_total,
            a.new_chat_quota_used
       from public.campaign_accounts ca
       join public.accounts a on a.id = ca.account_id
      where ca.campaign_id = $1`,
    [campaignId],
  )
}

async function nextTarget(campaignId: string): Promise<TargetRow | null> {
  return one<TargetRow>(
    `select t.id,
            t.phone_e164,
            t.contact_id,
            c.name as contact_name,
            c.wa_status,
            c.wa_jid
       from public.campaign_targets t
       left join public.contacts c on c.id = t.contact_id
      where t.campaign_id = $1::uuid
        and t.status = 'queued'
        and (t.scheduled_for is null or t.scheduled_for <= now())
      order by t.id
      limit 1`,
    [campaignId],
  )
}

/**
 * Panel sayaclari hedef durumlarindan turetilir.
 * Artirim kacsa bile (restart / timeout) bir sonraki tick dogrular.
 */
async function reconcileCampaignCounts(campaignId: string): Promise<void> {
  await query(
    `update public.campaigns c
        set sent_count = coalesce(s.sent, 0),
            failed_count = coalesce(s.failed, 0),
            skipped_count = coalesce(s.skipped, 0),
            updated_at = now()
       from (
         select count(*) filter (where status = 'sent') as sent,
                count(*) filter (where status = 'failed') as failed,
                count(*) filter (where status = 'skipped') as skipped
           from public.campaign_targets
          where campaign_id = $1::uuid
       ) s
      where c.id = $1::uuid`,
    [campaignId],
  )
}

/** Yarida kalan 'sending' hedefleri kuyruga geri al. */
async function reclaimStaleSending(): Promise<void> {
  const rows = await query<{ id: string; campaign_id: string }>(
    `update public.campaign_targets
        set status = 'queued',
            error = coalesce(error, 'Gonderim yarida kaldi, yeniden denenecek'),
            updated_at = now()
      where status = 'sending'
        and updated_at < now() - ($1::int * interval '1 millisecond')
      returning id, campaign_id`,
    [STALE_SENDING_MS],
  )

  if (rows.length > 0) {
    log.warn({ count: rows.length }, 'Takili sending hedefleri kuyruga alindi')
  }
}

function personalize(body: string | null, name: string | null): string {
  if (!body) return ''
  const safeName = name?.trim() || ''
  return body
    .replaceAll('{{name}}', safeName)
    .replaceAll('{{ad}}', safeName)
    .replaceAll('{{isim}}', safeName)
}

function remainingDaily(account: CampaignAccountRow, campaign: CampaignRow): number {
  const today = new Date().toISOString().slice(0, 10)
  const sentToday = account.sent_today_on === today ? account.sent_today : 0

  const cap = Math.min(
    account.daily_send_limit,
    warmupCap(account.warmup_started_at),
    campaign.daily_cap_per_account,
  )

  return Math.max(0, cap - sentToday)
}

/**
 * WhatsApp'in bildirdigi gercek "yeni sohbet" kotasi.
 * Bu tukendiginde 463 reach-out time-lock geliyor, yani gonderime devam etmek
 * hesabi kisitlatiyor.
 */
function newChatQuotaExhausted(account: CampaignAccountRow): boolean {
  const total = account.new_chat_quota_total
  const used = account.new_chat_quota_used
  if (total === null || used === null) return false
  return used >= total
}

async function sendToTarget(
  campaign: CampaignRow,
  account: CampaignAccountRow,
  session: WhatsAppSession,
  target: TargetRow,
): Promise<void> {
  await query(
    `update public.campaign_targets
        set status = 'sending', account_id = $2, attempts = attempts + 1, updated_at = now()
      where id = $1`,
    [target.id, account.account_id],
  )

  // Zorunlu dogrulama kapisi: kayitli olmayan numaraya gonderim denemesi
  // hesap seviyesinde kisit tetikliyor. Sonuc contacts'ta onbellege alinir.
  let jid = target.wa_status === 'valid' ? target.wa_jid : null

  if (!jid) {
    const verdicts = await session.verifyNumbers([target.phone_e164])
    const verdict = verdicts.get(target.phone_e164)

    if (target.contact_id) {
      await query(
        `update public.contacts
            set wa_status = $2, wa_jid = $3, wa_checked_at = now(), updated_at = now()
          where id = $1`,
        [target.contact_id, verdict?.exists ? 'valid' : 'invalid', verdict?.jid ?? null],
      )
    }

    if (!verdict?.exists) {
      await query(
        `update public.campaign_targets
            set status = 'skipped', error = 'Numara WhatsApp''ta kayitli degil', updated_at = now()
          where id = $1::uuid`,
        [target.id],
      )
      await reconcileCampaignCounts(campaign.id)
      return
    }

    jid = verdict.jid ?? e164ToJid(target.phone_e164)
  }

  const body = personalize(campaign.body, target.contact_name)

  // Medya { url } biciminde veriliyor: mediaCache anahtari ancak boyle olusuyor,
  // yani ayni gorsel her alici icin yeniden yuklenmiyor.
  const content =
    campaign.media_url && campaign.message_type !== 'text'
      ? { image: { url: campaign.media_url }, caption: body || undefined }
      : { text: body }

  const message = await session.sendMessage(jid, content)

  await query(
    `update public.campaign_targets
        set status = 'sent', wa_message_id = $2, sent_at = now(), error = null, updated_at = now()
      where id = $1::uuid`,
    [target.id, message.key?.id ?? null],
  )

  await query(
    `update public.campaign_accounts
        set sent_count = sent_count + 1
      where campaign_id = $1::uuid and account_id = $2::uuid`,
    [campaign.id, account.account_id],
  )

  await reconcileCampaignCounts(campaign.id)

  await incrementSentToday(account.account_id)

  await query(
    `insert into public.message_log
       (owner_id, account_id, campaign_id, direction, remote_jid, phone_e164, message_type, body, media_url, wa_message_id, status)
     values ($1::uuid, $2::uuid, $3::uuid, 'out', $4, $5, $6, $7, $8, $9, 'sent')`,
    [
      campaign.owner_id,
      account.account_id,
      campaign.id,
      jid,
      target.phone_e164,
      campaign.media_url && campaign.message_type !== 'text' ? 'image' : 'text',
      body || null,
      campaign.media_url,
      message.key?.id ?? null,
    ],
  )
}

async function handleSendFailure(
  campaign: CampaignRow,
  account: CampaignAccountRow,
  target: TargetRow,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error)
  const code = extractStatusCode(error)

  // Geri donusu olmayan durumlar: hesabi kilitle ve kampanyalari durdur.
  if (code === 403 || code === REACH_OUT_TIME_LOCK || /device_removed/i.test(message)) {
    const reason =
      code === REACH_OUT_TIME_LOCK
        ? '463 reach-out time-lock: tanimadigi kisilere gonderim kisiti'
        : code === 403
          ? '403 forbidden: hesap WhatsApp tarafindan kisitlandi'
          : 'device_removed: cihaz telefondan kaldirildi'

    await lockAccount({ id: account.account_id, owner_id: account.owner_id }, reason)
    await stopCampaign(campaign.id, reason)

    await query(
      `update public.campaign_targets
          set status = 'queued', error = $2, updated_at = now()
        where id = $1`,
      [target.id, message],
    )
    return
  }

  const row = await one<{ attempts: number }>(
    'select attempts from public.campaign_targets where id = $1',
    [target.id],
  )
  const attempts = row?.attempts ?? MAX_TARGET_ATTEMPTS

  if (attempts >= MAX_TARGET_ATTEMPTS) {
    await query(
      `update public.campaign_targets
          set status = 'failed', error = $2, updated_at = now()
        where id = $1::uuid`,
      [target.id, message],
    )
    await reconcileCampaignCounts(campaign.id)
    return
  }

  await query(
    `update public.campaign_targets
        set status = 'queued', error = $2, scheduled_for = now() + interval '2 minutes', updated_at = now()
      where id = $1::uuid`,
    [target.id, message],
  )
}

async function completeIfDone(campaignId: string): Promise<boolean> {
  await reconcileCampaignCounts(campaignId)

  const row = await one<{ count: string }>(
    `select count(*)::text as count
       from public.campaign_targets
      where campaign_id = $1::uuid and status in ('queued', 'sending')`,
    [campaignId],
  )

  if (Number(row?.count ?? 0) > 0) return false

  await query(
    `update public.campaigns
        set status = 'completed', completed_at = now(), updated_at = now()
      where id = $1::uuid and status = 'running'`,
    [campaignId],
  )
  log.info({ campaignId }, 'Kampanya tamamlandi')
  return true
}

async function runCampaign(campaign: CampaignRow): Promise<void> {
  const accounts = await eligibleAccounts(campaign.id)

  for (const account of accounts) {
    if (account.is_locked) {
      await stopCampaign(campaign.id, 'Gonderen hesap kilitli')
      return
    }

    if (
      account.reachout_locked_until &&
      new Date(account.reachout_locked_until).getTime() > Date.now()
    ) {
      await stopCampaign(
        campaign.id,
        '463 reach-out time-lock aktif, gonderim guvenli degil',
      )
      return
    }

    if (!account.enabled) continue
    if (newChatQuotaExhausted(account)) {
      await logAccountEvent(
        { id: account.account_id, owner_id: account.owner_id },
        'warn',
        'account.new_chat_quota_exhausted',
        {
          total: account.new_chat_quota_total,
          used: account.new_chat_quota_used,
        },
      )
      continue
    }

    const session = sessionManager.get(account.account_id)
    if (!session?.isLive) continue

    if (remainingDaily(account, campaign) <= 0) continue

    const readyAt = nextSendAt.get(account.account_id) ?? 0
    if (readyAt > Date.now()) continue

    const target = await nextTarget(campaign.id)
    if (!target) {
      await completeIfDone(campaign.id)
      return
    }

    // Gecikme gonderimden ONCE ayarlaniyor: gonderim uzun surerse bile
    // ayni hesap icin ikinci bir gonderim ayni tick'te baslamaz.
    const jitter =
      campaign.min_delay_seconds +
      Math.random() * Math.max(0, campaign.max_delay_seconds - campaign.min_delay_seconds)
    nextSendAt.set(account.account_id, Date.now() + jitter * 1_000)

    try {
      await sendToTarget(campaign, account, session, target)
    } catch (error) {
      log.error(
        { err: error, campaignId: campaign.id, accountId: account.account_id },
        'Gonderim basarisiz',
      )
      await handleSendFailure(campaign, account, target, error)
    }
  }
}

let running = false
let timer: ReturnType<typeof setTimeout> | undefined

async function tick(): Promise<void> {
  await reclaimStaleSending()

  const campaigns = await query<CampaignRow>(
    `select id, owner_id, name, message_type, body, media_url,
            min_delay_seconds, max_delay_seconds, daily_cap_per_account, source_list_ids
       from public.campaigns
      where status = 'running'
      order by started_at nulls first`,
  )

  for (const campaign of campaigns) {
    try {
      await runCampaign(campaign)
      await completeIfDone(campaign.id)
    } catch (error) {
      log.error({ err: error, campaignId: campaign.id }, 'Kampanya isletilirken hata')
    }
  }
}

export function startCampaignRunner(): void {
  if (running) return
  running = true

  const loop = async (): Promise<void> => {
    if (!running) return

    try {
      await tick()
    } catch (error) {
      log.error({ err: error }, 'Kampanya dongusunde hata')
    }

    if (running) {
      timer = setTimeout(() => void loop(), env.campaignTickMs)
    }
  }

  void loop()
  log.info({ tickMs: env.campaignTickMs }, 'Kampanya motoru basladi')
}

export function stopCampaignRunner(): void {
  running = false
  if (timer) clearTimeout(timer)
}

function extractStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined
  const output = (error as { output?: { statusCode?: number } }).output
  if (typeof output?.statusCode === 'number') return output.statusCode
  const direct = (error as { statusCode?: number }).statusCode
  return typeof direct === 'number' ? direct : undefined
}
