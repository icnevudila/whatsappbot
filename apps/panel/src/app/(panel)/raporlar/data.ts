import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@wa/shared'

export type RangeKey = '7' | '30' | '90'

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: '7', label: '7 gün' },
  { key: '30', label: '30 gün' },
  { key: '90', label: '90 gün' },
]

export function parseRange(raw: string | string[] | undefined): RangeKey {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value === '7' || value === '90') return value
  return '30'
}

export function rangeStartIso(key: RangeKey): string {
  const days = Number(key)
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (days - 1))
  return start.toISOString()
}

function dayKey(iso: string): string {
  const d = new Date(iso)
  return localDayKey(d)
}

function localDayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function eachDayKeys(key: RangeKey): string[] {
  const days = Number(key)
  const keys: string[] = []
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  cursor.setDate(cursor.getDate() - (days - 1))
  for (let i = 0; i < days; i += 1) {
    keys.push(localDayKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return keys
}

function pct(part: number, whole: number): number | null {
  if (whole <= 0) return null
  return Math.round((part / whole) * 1000) / 10
}

type Client = SupabaseClient<Database>

const LOG_SAMPLE_LIMIT = 8_000

export type ReportBundle = {
  range: RangeKey
  since: string
  sampled: boolean
  kpis: {
    out: number
    delivered: number
    read: number
    failed: number
    inbound: number
    deliveryRate: number | null
    readRate: number | null
    failRate: number | null
  }
  daily: { day: string; label: string; out: number; inbound: number; failed: number }[]
  funnel: { label: string; value: number; tone: 'accent' | 'muted' | 'danger' | 'ok' }[]
  campaignStatus: { key: string; label: string; value: number }[]
  topCampaigns: {
    id: string
    name: string
    status: string
    sent: number
    failed: number
    skipped: number
    targets: number
    successRate: number | null
  }[]
  accounts: {
    id: string
    label: string
    status: string
    sentToday: number
    dailyLimit: number
    periodOut: number
  }[]
  accountStatus: { key: string; label: string; value: number }[]
  contacts: {
    total: number
    valid: number
    invalid: number
    unknown: number
  }
  topLists: { id: string; name: string; count: number }[]
  errorTop: { label: string; value: number }[]
  quota: {
    monthlyLimit: number
    monthSent: number
  }
  campaigns: {
    id: string
    name: string
    status: string
    total_targets: number
    sent_count: number
    failed_count: number
    skipped_count: number
    created_at: string
  }[]
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Taslak',
  scheduled: 'Zamanlı',
  running: 'Çalışıyor',
  paused: 'Duraklatıldı',
  completed: 'Bitti',
  cancelled: 'İptal',
  failed: 'Başarısız',
}

const ACCOUNT_STATUS_LABEL: Record<string, string> = {
  connected: 'Bağlı',
  connecting: 'Bağlanıyor',
  qr: 'QR bekliyor',
  disconnected: 'Kopuk',
  logged_out: 'Çıkış',
  banned: 'Kısıtlı',
}

function friendlyError(raw: string | null | undefined): string {
  const text = (raw ?? '').trim()
  if (!text) return 'Bilinmeyen hata'
  const lower = text.toLocaleLowerCase('tr-TR')
  if (lower.includes('blacklist') || lower.includes('kara')) return 'Kara liste'
  if (lower.includes('not on whatsapp') || lower.includes('onwhatsapp') || lower.includes('invalid')) {
    return 'WhatsApp’ta yok'
  }
  if (lower.includes('rate') || lower.includes('limit') || lower.includes('quota')) return 'Limit / kota'
  if (lower.includes('session') || lower.includes('logged') || lower.includes('disconnect')) {
    return 'Hat bağlantısı'
  }
  if (lower.includes('timeout') || lower.includes('zaman')) return 'Zaman aşımı'
  if (text.length > 42) return `${text.slice(0, 40)}…`
  return text
}

export async function loadReportBundle(
  supabase: Client,
  orgId: string,
  range: RangeKey,
  monthlyMessageQuota: number,
): Promise<ReportBundle> {
  const since = rangeStartIso(range)
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [
    { count: outExact },
    { count: deliveredExact },
    { count: readExact },
    { count: failedExact },
    { count: inboundExact },
    { count: monthSent },
    { data: logRows },
    { data: campaigns },
    { data: accounts },
    { count: contactTotal },
    { count: contactValid },
    { count: contactInvalid },
    { data: lists },
  ] = await Promise.all([
    supabase
      .from('message_log')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('direction', 'out')
      .gte('created_at', since),
    supabase
      .from('message_log')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('direction', 'out')
      .in('status', ['delivered', 'read'])
      .gte('created_at', since),
    supabase
      .from('message_log')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('direction', 'out')
      .eq('status', 'read')
      .gte('created_at', since),
    supabase
      .from('message_log')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('direction', 'out')
      .eq('status', 'failed')
      .gte('created_at', since),
    supabase
      .from('message_log')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('direction', 'in')
      .gte('created_at', since),
    supabase
      .from('message_log')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('direction', 'out')
      .in('status', ['sent', 'delivered', 'read'])
      .gte('created_at', monthStart.toISOString()),
    supabase
      .from('message_log')
      .select('created_at, status, direction, account_id, error')
      .eq('org_id', orgId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(LOG_SAMPLE_LIMIT),
    supabase
      .from('campaigns')
      .select(
        'id, name, status, total_targets, sent_count, failed_count, skipped_count, created_at',
      )
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(40),
    supabase
      .from('accounts')
      .select('id, label, status, sent_today, daily_send_limit')
      .eq('org_id', orgId)
      .order('created_at'),
    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('wa_status', 'valid'),
    supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('wa_status', 'invalid'),
    supabase
      .from('contact_lists')
      .select('id, name, contact_count')
      .eq('org_id', orgId)
      .neq('source', 'quick_send')
      .order('contact_count', { ascending: false })
      .limit(8),
  ])

  const logs = logRows ?? []
  const sampled = logs.length >= LOG_SAMPLE_LIMIT

  const dayKeys = eachDayKeys(range)
  const dailyMap = new Map(dayKeys.map((k) => [k, { out: 0, inbound: 0, failed: 0 }]))
  const accountOut = new Map<string, number>()
  const errorCounts = new Map<string, number>()

  for (const row of logs) {
    const key = dayKey(row.created_at)
    const bucket = dailyMap.get(key)
    if (!bucket) continue

    if (row.direction === 'in') {
      bucket.inbound += 1
      continue
    }

    bucket.out += 1
    if (row.status === 'failed') {
      bucket.failed += 1
      const label = friendlyError(row.error)
      errorCounts.set(label, (errorCounts.get(label) ?? 0) + 1)
    }
    if (row.account_id) {
      accountOut.set(row.account_id, (accountOut.get(row.account_id) ?? 0) + 1)
    }
  }

  const out = outExact ?? 0
  const delivered = deliveredExact ?? 0
  const read = readExact ?? 0
  const failed = failedExact ?? 0
  const inbound = inboundExact ?? 0

  const campaignRows = campaigns ?? []
  const statusMap = new Map<string, number>()
  for (const c of campaignRows) {
    statusMap.set(c.status, (statusMap.get(c.status) ?? 0) + 1)
  }

  const accountRows = accounts ?? []
  const accountStatusMap = new Map<string, number>()
  for (const a of accountRows) {
    accountStatusMap.set(a.status, (accountStatusMap.get(a.status) ?? 0) + 1)
  }

  const totalContacts = contactTotal ?? 0
  const valid = contactValid ?? 0
  const invalid = contactInvalid ?? 0
  const unknown = Math.max(0, totalContacts - valid - invalid)

  const daily = dayKeys.map((key) => {
    const b = dailyMap.get(key) ?? { out: 0, inbound: 0, failed: 0 }
    const [, m, d] = key.split('-')
    return {
      day: key,
      label: `${d}.${m}`,
      out: b.out,
      inbound: b.inbound,
      failed: b.failed,
    }
  })

  return {
    range,
    since,
    sampled,
    kpis: {
      out,
      delivered,
      read,
      failed,
      inbound,
      deliveryRate: pct(delivered, out),
      readRate: pct(read, out),
      failRate: pct(failed, out),
    },
    daily,
    funnel: [
      { label: 'Giden', value: out, tone: 'accent' },
      { label: 'Teslim', value: delivered, tone: 'ok' },
      { label: 'Okundu', value: read, tone: 'muted' },
      { label: 'Başarısız', value: failed, tone: 'danger' },
    ],
    campaignStatus: [...statusMap.entries()]
      .map(([key, value]) => ({
        key,
        label: STATUS_LABEL[key] ?? key,
        value,
      }))
      .sort((a, b) => b.value - a.value),
    topCampaigns: [...campaignRows]
      .sort((a, b) => b.sent_count - a.sent_count)
      .slice(0, 6)
      .map((c) => {
        const denom = c.sent_count + c.failed_count
        return {
          id: c.id,
          name: c.name,
          status: c.status,
          sent: c.sent_count,
          failed: c.failed_count,
          skipped: c.skipped_count,
          targets: c.total_targets,
          successRate: pct(c.sent_count, denom > 0 ? denom : c.total_targets),
        }
      }),
    accounts: accountRows.map((a) => ({
      id: a.id,
      label: a.label,
      status: a.status,
      sentToday: a.sent_today,
      dailyLimit: a.daily_send_limit,
      periodOut: accountOut.get(a.id) ?? 0,
    })),
    accountStatus: [...accountStatusMap.entries()]
      .map(([key, value]) => ({
        key,
        label: ACCOUNT_STATUS_LABEL[key] ?? key,
        value,
      }))
      .sort((a, b) => b.value - a.value),
    contacts: { total: totalContacts, valid, invalid, unknown },
    topLists: (lists ?? []).map((l) => ({
      id: l.id,
      name: l.name,
      count: l.contact_count,
    })),
    errorTop: [...errorCounts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6),
    quota: {
      monthlyLimit: monthlyMessageQuota,
      monthSent: monthSent ?? 0,
    },
    campaigns: campaignRows,
  }
}
