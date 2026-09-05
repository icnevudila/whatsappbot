import { e164ToJid } from '@wa/shared'
import type { AnyMessageContent } from '@whiskeysockets/baileys'
import { incrementSentToday, lockAccount, logAccountEvent } from './accounts.js'
import { one, query } from './db.js'
import { env } from './env.js'
import { logger } from './logger.js'
import { sessionManager } from './session-manager.js'
import { expandSpintax, pickAbVariant } from './spintax.js'
import { emitOrgWebhook } from './org-hooks.js'
import type { WhatsAppSession } from './session.js'

const log = logger.child({ scope: 'campaign' })

const MAX_TARGET_ATTEMPTS = 3
const REACH_OUT_TIME_LOCK = 463
/** Gonderim timeout'undan sonra ek pay; reclaim aktif gonderimi kesmesin. */
const STALE_SENDING_MS = env.sendTimeoutMs + 60_000

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
  org_id: string
  created_by: string
  name: string
  message_type: string
  body: string | null
  body_b: string | null
  ab_percent: number
  media_url: string | null
  min_delay_seconds: number
  max_delay_seconds: number
  daily_cap_per_account: number
  source_list_ids: string[]
}

type CampaignAccountRow = {
  account_id: string
  org_id: string
  created_by: string
  daily_send_limit: number
  /** SQL: bugunku sent_today (gun donduyse 0). */
  sent_today_effective: number
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

let inFlight = 0

export function campaignInFlightCount(): number {
  return inFlight
}

/**
 * Kampanya hedeflerini listelerden uretir.
 * Karaliste dislanir, ayni numara bir kez eklenir.
 */
export async function materializeTargets(
  campaignId: string,
): Promise<{ inserted: number; total: number }> {
  const campaign = await one<CampaignRow>(
    `select id, org_id, created_by, name, message_type, body, body_b, ab_percent, media_url,
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
    `insert into public.campaign_targets (campaign_id, org_id, created_by, contact_id, phone_e164)
     select distinct $1::uuid, $2::uuid, $3::uuid, c.id, c.phone_e164
       from public.contacts c
       join public.contact_list_members m on m.contact_id = c.id
      where c.org_id = $2::uuid
        and m.list_id = any($4::uuid[])
        and not exists (
          select 1 from public.blacklist b
           where b.org_id = $2::uuid and b.phone_e164 = c.phone_e164
        )
     on conflict (campaign_id, phone_e164) do nothing
     returning id`,
    [campaignId, campaign.org_id, campaign.created_by, campaign.source_list_ids],
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

async function pauseCampaign(campaignId: string, reason: string): Promise<void> {
  await query(
    `update public.campaigns
        set status = 'paused',
            paused_at = now(),
            stop_reason = $2,
            updated_at = now()
      where id = $1 and status = 'running'`,
    [campaignId, reason],
  )
  log.warn({ campaignId, reason }, 'Kampanya duraklatildi (canli oturum yok)')
}

/** Ardışık tick'lerde hiç claim yok + live session yok → pause. */
const idleNoSessionTicks = new Map<string, number>()
const IDLE_PAUSE_TICKS = 6

async function eligibleAccounts(campaignId: string): Promise<CampaignAccountRow[]> {
  return query<CampaignAccountRow>(
    `select ca.account_id,
            a.org_id,
            a.created_by,
            a.daily_send_limit,
            case
              when a.sent_today_on = current_date then a.sent_today
              else 0
            end as sent_today_effective,
            a.warmup_started_at::text as warmup_started_at,
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

/**
 * Atomik claim: FOR UPDATE SKIP LOCKED ile queued -> sending.
 * Multi-worker cift gonderimi engeller; attempts claim aninda artar.
 */
async function claimTarget(
  campaignId: string,
  accountId: string,
): Promise<TargetRow | null> {
  return one<TargetRow>(
    `select id::text as id,
            phone_e164,
            contact_id,
            contact_name,
            wa_status,
            wa_jid
       from wa.claim_campaign_target($1::uuid, $2::uuid)`,
    [campaignId, accountId],
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
  const cap = Math.min(
    account.daily_send_limit,
    warmupCap(account.warmup_started_at),
    campaign.daily_cap_per_account,
  )

  return Math.max(0, cap - account.sent_today_effective)
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

type SendContent =
  | { text: string }
  | { image: { url: string }; caption?: string }
  | { video: { url: string }; caption?: string }
  | {
      document: { url: string }
      mimetype: string
      caption?: string
      fileName?: string
    }

function buildContent(
  campaign: CampaignRow,
  body: string,
): SendContent {
  const type = campaign.message_type
  const media = campaign.media_url

  if (!media || type === 'text') {
    return { text: body }
  }

  if (type === 'image') {
    return { image: { url: media }, caption: body || undefined }
  }

  if (type === 'video') {
    return { video: { url: media }, caption: body || undefined }
  }

  if (type === 'document') {
    return {
      document: { url: media },
      mimetype: 'application/octet-stream',
      caption: body || undefined,
      fileName: 'dosya',
    }
  }

  // Bilinmeyen tip: gorsel sanma, acik hata.
  throw new Error(`Desteklenmeyen mesaj tipi: ${type}`)
}

async function sendToTarget(
  campaign: CampaignRow,
  account: CampaignAccountRow,
  session: WhatsAppSession,
  target: TargetRow,
): Promise<void> {
  // Hedef zaten claim_campaign_target ile 'sending'; burada tekrar claim yok.

  const blocked = await one<{ id: string }>(
    `select id::text from public.blacklist
      where org_id = $1 and phone_e164 = $2
      limit 1`,
    [campaign.org_id, target.phone_e164],
  )
  if (blocked) {
    await query(
      `update public.campaign_targets
          set status = 'skipped', error = 'Kara listede', updated_at = now()
        where id = $1::bigint and status = 'sending'`,
      [target.id],
    )
    await reconcileCampaignCounts(campaign.id)
    return
  }

  // Zorunlu dogrulama kapisi: kayitli olmayan numaraya gonderim denemesi
  // hesap seviyesinde kisit tetikliyor. Sonuc contacts'ta onbellege alinir.
  let jid = target.wa_status === 'valid' ? target.wa_jid : null

  if (!jid) {
    if (!session.isLive) {
      await query(
        `update public.campaign_targets
            set status = 'queued',
                error = 'Oturum dusuk, yeniden denenecek',
                scheduled_for = now() + interval '30 seconds',
                updated_at = now()
          where id = $1::bigint and status = 'sending'`,
        [target.id],
      )
      return
    }

    const verdicts = await session.verifyNumbers([target.phone_e164])
    const verdict = verdicts.get(target.phone_e164)

    // Bos map = dogrulama yapilamadi; skip etme, kisa sure sonra tekrar dene.
    if (!verdict) {
      await query(
        `update public.campaign_targets
            set status = 'queued',
                error = 'Dogrulama sonucu yok',
                scheduled_for = now() + interval '45 seconds',
                updated_at = now()
          where id = $1::bigint and status = 'sending'`,
        [target.id],
      )
      return
    }

    if (target.contact_id) {
      await query(
        `update public.contacts
            set wa_status = $2, wa_jid = $3, wa_checked_at = now(), updated_at = now()
          where id = $1`,
        [target.contact_id, verdict.exists ? 'valid' : 'invalid', verdict.jid ?? null],
      )
    }

    if (!verdict.exists) {
      await query(
        `update public.campaign_targets
            set status = 'skipped', error = 'Numara WhatsApp''ta kayitli degil', updated_at = now()
          where id = $1::bigint and status = 'sending'`,
        [target.id],
      )
      await reconcileCampaignCounts(campaign.id)
      return
    }

    jid = verdict.jid ?? e164ToJid(target.phone_e164)
  }

  const variant = pickAbVariant({
    bodyA: campaign.body,
    bodyB: campaign.body_b,
    abPercent: campaign.ab_percent,
    targetId: target.id,
  })
  const rawBody = variant === 'b' ? campaign.body_b : campaign.body
  const body = expandSpintax(personalize(rawBody, target.contact_name))
  const content = buildContent(campaign, body) as AnyMessageContent
  const message = await session.sendMessage(jid, content)

  const updated = await query<{ id: string }>(
    `update public.campaign_targets
        set status = 'sent', wa_message_id = $2, sent_at = now(), error = null, updated_at = now()
      where id = $1::bigint and status = 'sending'
      returning id::text`,
    [target.id, message.key?.id ?? null],
  )

  // Baska worker reclaim edip gondermis olabilir — cift kayit yazma.
  if (updated.length === 0) {
    log.warn({ targetId: target.id, campaignId: campaign.id }, 'sent guncellemesi atlandi (status degismis)')
    return
  }

  await query(
    `update public.campaign_accounts
        set sent_count = sent_count + 1
      where campaign_id = $1::uuid and account_id = $2::uuid`,
    [campaign.id, account.account_id],
  )

  await reconcileCampaignCounts(campaign.id)

  await incrementSentToday(account.account_id)

  const messageType =
    !campaign.media_url || campaign.message_type === 'text'
      ? 'text'
      : campaign.message_type

  try {
    await query(
      `insert into public.message_log
         (org_id, created_by, account_id, campaign_id, direction, remote_jid, phone_e164, message_type, body, media_url, wa_message_id, status)
       values ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'out', $5, $6, $7, $8, $9, $10, 'sent')`,
      [
        campaign.org_id,
        campaign.created_by,
        account.account_id,
        campaign.id,
        jid,
        target.phone_e164,
        messageType,
        body || null,
        campaign.media_url,
        message.key?.id ?? null,
      ],
    )
  } catch (error) {
    // Mesaj gitti; log yazilamadi — retry etme (cift mesaj riski).
    log.error({ err: error, targetId: target.id }, 'message_log yazilamadi (mesaj gonderildi)')
  }
}

async function handleSendFailure(
  campaign: CampaignRow,
  account: CampaignAccountRow,
  target: TargetRow,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error)
  const code = extractStatusCode(error)

  // Geri donusu olmayan durumlar: hesabi kilitle.
  // Kampanyayi tumden durdurma: baska canli hesap varsa devam etsin.
  if (code === 403 || code === REACH_OUT_TIME_LOCK || /device_removed/i.test(message)) {
    const reason =
      code === REACH_OUT_TIME_LOCK
        ? '463 reach-out time-lock: tanimadigi kisilere gonderim kisiti'
        : code === 403
          ? '403 forbidden: hesap WhatsApp tarafindan kisitlandi'
          : 'device_removed: cihaz telefondan kaldirildi'

    await lockAccount(
      { id: account.account_id, org_id: account.org_id, created_by: account.created_by },
      reason,
    )

    await query(
      `update public.campaign_targets
          set status = 'queued', error = $2, updated_at = now()
        where id = $1::bigint and status = 'sending'`,
      [target.id, message],
    )
    return
  }

  const row = await one<{ attempts: number }>(
    'select attempts from public.campaign_targets where id = $1::bigint',
    [target.id],
  )
  const attempts = row?.attempts ?? MAX_TARGET_ATTEMPTS

  if (attempts >= MAX_TARGET_ATTEMPTS) {
    await query(
      `update public.campaign_targets
          set status = 'failed', error = $2, updated_at = now()
        where id = $1::bigint and status = 'sending'`,
      [target.id, message],
    )
    await reconcileCampaignCounts(campaign.id)
    return
  }

  await query(
    `update public.campaign_targets
        set status = 'queued', error = $2, scheduled_for = now() + interval '2 minutes', updated_at = now()
      where id = $1::bigint and status = 'sending'`,
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
  const camp = await one<{ org_id: string; name: string }>(
    `select org_id::text, name from public.campaigns where id = $1`,
    [campaignId],
  )
  if (camp) {
    void emitOrgWebhook(camp.org_id, 'campaign.completed', {
      campaign_id: campaignId,
      name: camp.name,
    })
  }
  return true
}

function accountPermanentlyUnusable(account: CampaignAccountRow): boolean {
  if (!account.enabled || account.is_locked) return true
  if (newChatQuotaExhausted(account)) return true
  return false
}

async function orgMonthlyOutboundCount(orgId: string): Promise<number> {
  const row = await one<{ n: string }>(
    `select count(*)::text as n
       from public.message_log
      where org_id = $1::uuid
        and direction = 'out'
        and status in ('sent', 'delivered', 'read')
        and created_at >= date_trunc('month', timezone('utc', now()))`,
    [orgId],
  )
  return Number(row?.n ?? 0)
}

async function orgMonthlyQuota(orgId: string): Promise<number> {
  const row = await one<{ q: number }>(
    `select monthly_message_quota as q from public.organizations where id = $1::uuid`,
    [orgId],
  )
  return row?.q ?? 0
}

/** Zamanı gelmiş scheduled kampanyaları materialize edip running yap. */
async function promoteScheduledCampaigns(): Promise<void> {
  const due = await query<{ id: string }>(
    `select id::text as id
       from public.campaigns
      where status = 'scheduled'
        and scheduled_at is not null
        and scheduled_at <= now()
      order by scheduled_at
      limit 5`,
  )

  for (const row of due) {
    try {
      await materializeTargets(row.id)
      const updated = await query<{ id: string }>(
        `update public.campaigns
            set status = 'running',
                started_at = coalesce(started_at, now()),
                paused_at = null,
                stop_reason = null,
                updated_at = now()
          where id = $1::uuid and status = 'scheduled'
          returning id::text`,
        [row.id],
      )
      if (updated.length > 0) {
        log.info({ campaignId: row.id }, 'Zamanlanmis kampanya baslatildi')
      }
    } catch (error) {
      log.error({ err: error, campaignId: row.id }, 'Zamanlanmis kampanya baslatilamadi')
    }
  }
}

async function runCampaign(campaign: CampaignRow): Promise<void> {
  const monthlyQuota = await orgMonthlyQuota(campaign.org_id)
  if (monthlyQuota > 0) {
    const used = await orgMonthlyOutboundCount(campaign.org_id)
    if (used >= monthlyQuota) {
      await stopCampaign(
        campaign.id,
        `Aylik mesaj kotasi doldu (${used}/${monthlyQuota})`,
      )
      return
    }
  }

  const accounts = await eligibleAccounts(campaign.id)
  let claimedAny = false

  for (const account of accounts) {
    // Tek kilitli/reachout hesabi kampanyayi durdurmaz; o hesabi atla.
    if (account.is_locked) continue

    if (
      account.reachout_locked_until &&
      new Date(account.reachout_locked_until).getTime() > Date.now()
    ) {
      continue
    }

    if (!account.enabled) continue
    if (newChatQuotaExhausted(account)) {
      await logAccountEvent(
        { id: account.account_id, org_id: account.org_id, created_by: account.created_by },
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

    const target = await claimTarget(campaign.id, account.account_id)
    if (!target) {
      await completeIfDone(campaign.id)
      return
    }

    claimedAny = true

    // Gecikme gonderimden ONCE ayarlaniyor: gonderim uzun surerse bile
    // ayni hesap icin ikinci bir gonderim ayni tick'te baslamaz.
    const jitter =
      campaign.min_delay_seconds +
      Math.random() * Math.max(0, campaign.max_delay_seconds - campaign.min_delay_seconds)
    nextSendAt.set(account.account_id, Date.now() + jitter * 1_000)

    inFlight += 1
    try {
      await sendToTarget(campaign, account, session, target)
    } catch (error) {
      log.error(
        { err: error, campaignId: campaign.id, accountId: account.account_id },
        'Gonderim basarisiz',
      )
      await handleSendFailure(campaign, account, target, error)
    } finally {
      inFlight -= 1
    }
  }

  // Hicbir hesap kalici olarak uygun degilse kampanya sonsuza kadar takilmasin.
  if (!claimedAny && accounts.length > 0 && accounts.every(accountPermanentlyUnusable)) {
    idleNoSessionTicks.delete(campaign.id)
    const queued = await one<{ count: string }>(
      `select count(*)::text as count
         from public.campaign_targets
        where campaign_id = $1::uuid and status in ('queued', 'sending')`,
      [campaign.id],
    )
    if (Number(queued?.count ?? 0) > 0) {
      await stopCampaign(
        campaign.id,
        'Gonderim icin uygun hesap kalmadi (kilitli, kapali veya yeni sohbet kotasi tukendi)',
      )
    }
  } else if (!claimedAny && accounts.length > 0) {
    const anyLive = accounts.some((a) => sessionManager.get(a.account_id)?.isLive)
    if (!anyLive) {
      const queued = await one<{ count: string }>(
        `select count(*)::text as count
           from public.campaign_targets
          where campaign_id = $1::uuid and status in ('queued', 'sending')`,
        [campaign.id],
      )
      if (Number(queued?.count ?? 0) > 0) {
        const n = (idleNoSessionTicks.get(campaign.id) ?? 0) + 1
        idleNoSessionTicks.set(campaign.id, n)
        if (n >= IDLE_PAUSE_TICKS) {
          idleNoSessionTicks.delete(campaign.id)
          await pauseCampaign(
            campaign.id,
            'Canli WhatsApp oturumu yok — hat baglantisini kontrol edin, sonra Devam et',
          )
        }
      }
    } else {
      idleNoSessionTicks.delete(campaign.id)
    }
  } else if (!claimedAny && accounts.length === 0) {
    idleNoSessionTicks.delete(campaign.id)
    const queued = await one<{ count: string }>(
      `select count(*)::text as count
         from public.campaign_targets
        where campaign_id = $1::uuid and status in ('queued', 'sending')`,
      [campaign.id],
    )
    if (Number(queued?.count ?? 0) > 0) {
      await stopCampaign(campaign.id, 'Kampanyaya bagli hesap yok')
    }
  } else if (claimedAny) {
    idleNoSessionTicks.delete(campaign.id)
  }
}

let running = false
let timer: ReturnType<typeof setTimeout> | undefined
let tickActive = false

async function tick(): Promise<void> {
  tickActive = true
  try {
    await reclaimStaleSending()
    await promoteScheduledCampaigns()

    const campaigns = await query<CampaignRow>(
      `select id, org_id, created_by, name, message_type, body, body_b, ab_percent, media_url,
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
  } finally {
    tickActive = false
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
  log.info(
    { tickMs: env.campaignTickMs, staleSendingMs: STALE_SENDING_MS },
    'Kampanya motoru basladi',
  )
}

export function stopCampaignRunner(): void {
  running = false
  if (timer) clearTimeout(timer)
}

/** Kapanis oncesi aktif tick/gonderimin bitmesini bekler. */
export async function drainCampaignRunner(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while ((tickActive || inFlight > 0) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  if (tickActive || inFlight > 0) {
    log.warn({ inFlight, tickActive }, 'Kampanya drain zaman asimina ugradi')
  }
}

function extractStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined
  const output = (error as { output?: { statusCode?: number } }).output
  if (typeof output?.statusCode === 'number') return output.statusCode
  const direct = (error as { statusCode?: number }).statusCode
  return typeof direct === 'number' ? direct : undefined
}
