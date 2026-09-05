import type { AccountStatus, EventLevel } from '@wa/shared'
import { one, query } from './db.js'
import { logger } from './logger.js'

export type AccountRow = {
  id: string
  org_id: string
  created_by: string
  label: string
  phone_e164: string | null
  wa_jid: string | null
  status: string
  enabled: boolean
  is_locked: boolean
  daily_send_limit: number
  sent_today: number
  sent_today_on: string | null
  warmup_started_at: string | null
  new_chat_quota_total: number | null
  new_chat_quota_used: number | null
  reachout_locked_until: string | null
}

const ACCOUNT_COLUMNS = `id, org_id, created_by, label, phone_e164, wa_jid, status, enabled, is_locked,
  daily_send_limit, sent_today, sent_today_on, warmup_started_at,
  new_chat_quota_total, new_chat_quota_used, reachout_locked_until`

export async function loadAccount(accountId: string): Promise<AccountRow | null> {
  return one<AccountRow>(
    `select ${ACCOUNT_COLUMNS} from public.accounts where id = $1`,
    [accountId],
  )
}

/** Yeniden acilista devam ettirilecek hesaplar.
 * Bilincli disconnect (disconnected) / logged_out resume edilmez.
 * Coklu worker: yalnizca bu worker'in kiraladigi VEYA kirasiz/suresi dolmus hesaplar.
 * Boylece tum process'ler ayni "ilk N" listeye humum etmez.
 */
export async function loadResumableAccounts(
  limit: number,
  workerId: string,
): Promise<AccountRow[]> {
  return query<AccountRow>(
    `select a.id, a.org_id, a.created_by, a.label, a.phone_e164, a.wa_jid, a.status, a.enabled, a.is_locked,
            a.daily_send_limit, a.sent_today, a.sent_today_on, a.warmup_started_at,
            a.new_chat_quota_total, a.new_chat_quota_used, a.reachout_locked_until
       from public.accounts a
       left join wa.session_lease sl on sl.account_id = a.id
      where a.enabled
        and not a.is_locked
        and a.status in ('connected', 'connecting', 'qr_pending', 'pairing_pending')
        and (
          sl.holder_id is null
          or sl.expires_at < now()
          or sl.holder_id = $2
        )
      order by
        case when sl.holder_id = $2 and sl.expires_at >= now() then 0 else 1 end,
        a.connected_at desc nulls last,
        a.created_at
      limit $1`,
    [limit, workerId],
  )
}

/**
 * Servisin yazmasina izin verilen kolonlar. Panelin yazamadigi durum
 * kolonlari burada; liste sabit tutuluyor ki SQL'e dinamik kolon adi sizmasin.
 */
const PATCHABLE = [
  'status',
  'status_detail',
  'last_disconnect_code',
  'phone_e164',
  'wa_jid',
  'wa_lid',
  'qr_code',
  'qr_expires_at',
  'pairing_code',
  'pairing_expires_at',
  'connected_at',
  'last_seen_at',
  'warmup_started_at',
  'sent_today',
  'sent_today_on',
  'is_locked',
  'lock_reason',
  'locked_at',
  'wa_version',
  'new_chat_quota_total',
  'new_chat_quota_used',
  'new_chat_quota_cycle_end',
  'reachout_locked_until',
  'reachout_lock_type',
] as const

export type AccountPatch = Partial<Record<(typeof PATCHABLE)[number], unknown>> & {
  status?: AccountStatus
}

export async function patchAccount(accountId: string, patch: AccountPatch): Promise<void> {
  const columns: string[] = []
  const values: unknown[] = [accountId]

  for (const [key, value] of Object.entries(patch)) {
    if (!PATCHABLE.includes(key as (typeof PATCHABLE)[number])) continue
    // undefined = "bu alana dokunma". null bilincli temizleme.
    if (value === undefined) continue
    values.push(value)
    columns.push(`${key} = $${values.length}`)
  }

  if (columns.length === 0) return

  await query(
    `update public.accounts set ${columns.join(', ')}, updated_at = now() where id = $1`,
    values,
  )
}

export async function logAccountEvent(
  account: Pick<AccountRow, 'id' | 'org_id' | 'created_by'>,
  level: EventLevel,
  event: string,
  detail: Record<string, unknown> = {},
): Promise<void> {
  try {
    await query(
      `insert into public.account_events (org_id, account_id, created_by, level, event, detail)
       values ($1, $2, $3, $4, $5, $6::jsonb)`,
      [account.org_id, account.id, account.created_by, level, event, JSON.stringify(detail)],
    )
  } catch (error) {
    // Olay kaydi yazilamadi diye oturumu dusurmeyelim.
    logger.warn({ err: error, accountId: account.id, event }, 'account_events yazilamadi')
  }
}

/**
 * Hesabi kilitler. Yalnızca bu hesabın tek hat olduğu kampanyaları durdurur;
 * çok hesaplı kampanyalarda diğer hatlar devam eder (bu hesap kampanyadan çıkarılır).
 */
export async function lockAccount(
  account: Pick<AccountRow, 'id' | 'org_id' | 'created_by'>,
  reason: string,
): Promise<void> {
  // enabled'a dokunulmuyor: kilit servisin karari, hesabi kapatmak kullanicinin.
  await patchAccount(account.id, {
    is_locked: true,
    lock_reason: reason,
    locked_at: new Date().toISOString(),
  })

  // Tek hesaplı kampanyalar → stopped
  await query(
    `update public.campaigns c
        set status = 'stopped',
            stop_reason = $2,
            updated_at = now()
      where c.status in ('running', 'scheduled', 'paused')
        and exists (
          select 1 from public.campaign_accounts ca
           where ca.campaign_id = c.id and ca.account_id = $1
        )
        and (
          select count(*)::int from public.campaign_accounts ca2
           where ca2.campaign_id = c.id
        ) = 1`,
    [account.id, `Hesap kilitlendi: ${reason}`],
  )

  // Çok hesaplı: bu hesabı kampanyadan çıkar (diğerleri devam)
  await query(
    `delete from public.campaign_accounts ca
      using public.campaigns c
      where ca.campaign_id = c.id
        and ca.account_id = $1
        and c.status in ('running', 'scheduled', 'paused')
        and (
          select count(*)::int from public.campaign_accounts ca2
           where ca2.campaign_id = c.id
        ) > 1`,
    [account.id],
  )

  await logAccountEvent(account, 'error', 'account.locked', { reason })
}

/** Gunluk sayac gun donduyse sifirlanir. Kalan gonderim hakkini doner.
 * Karşılaştırma SQL current_date ile: node-pg date → Date nesnesi UTC kayması yaratıyor.
 */
export async function remainingDailyQuota(account: AccountRow): Promise<number> {
  const row = await one<{ sent_today: number; on_today: boolean }>(
    `select
        case when sent_today_on = current_date then sent_today else 0 end as sent_today,
        (sent_today_on = current_date) as on_today
       from public.accounts
      where id = $1`,
    [account.id],
  )

  const sentToday = row?.sent_today ?? 0
  if (!row?.on_today) {
    await query(
      `update public.accounts
          set sent_today = 0, sent_today_on = current_date, updated_at = now()
        where id = $1 and (sent_today_on is distinct from current_date)`,
      [account.id],
    )
    account.sent_today = 0
  } else {
    account.sent_today = sentToday
  }

  return Math.max(0, account.daily_send_limit - sentToday)
}

export async function incrementSentToday(accountId: string): Promise<void> {
  await query(
    `update public.accounts
        set sent_today = case
              when sent_today_on = current_date then sent_today + 1
              else 1
            end,
            sent_today_on = current_date,
            updated_at = now()
      where id = $1`,
    [accountId],
  )
}
