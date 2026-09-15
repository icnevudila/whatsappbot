const TTL_SEC = 60 * 60 * 72
const THREAD_CAP = 100

function redisEnabled() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

async function redisCommand(args) {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    })
    if (!response.ok) return null
    const json = await response.json()
    return json.result
  } catch {
    return null
  }
}

function inboxKey(orgId) {
  return `wb:c2:inbox:${orgId}`
}

function threadKey(orgId, phone) {
  return `wb:c2:th:${orgId}:${encodeURIComponent(phone)}`
}

function packMsg(row) {
  return [
    row.id,
    row.account_id ?? null,
    row.direction,
    row.phone_e164 ?? null,
    row.remote_jid ?? null,
    row.message_type,
    row.body ?? null,
    row.status,
    row.created_at,
    row.campaign_id ?? null,
    row.campaignName ?? null,
    row.wa_message_id ?? null,
    row.clientKey ?? null,
  ]
}

function unpackMsg(row) {
  if (!Array.isArray(row)) return row
  return {
    id: row[0],
    account_id: row[1],
    direction: row[2],
    phone_e164: row[3],
    remote_jid: row[4],
    message_type: row[5],
    body: row[6],
    status: row[7],
    created_at: row[8],
    campaign_id: row[9],
    campaignName: row[10],
    wa_message_id: row[11],
    clientKey: row[12] || (row[0] != null ? `log-${row[0]}` : undefined),
  }
}

function packPreview(item) {
  return [
    item.phone,
    item.contactName ?? null,
    item.pushName ?? null,
    item.lastBody ?? null,
    item.lastAt,
    item.lastDirection,
    item.messageType,
    item.accountId ?? null,
    item.accountLabel ?? null,
    item.isReply ? 1 : 0,
    item.outboundOnly ? 1 : 0,
    item.missingPhone ? 1 : 0,
  ]
}

function unpackPreview(row) {
  if (!Array.isArray(row)) return row
  return {
    phone: row[0],
    contactName: row[1],
    pushName: row[2],
    lastBody: row[3],
    lastAt: row[4],
    lastDirection: row[5],
    messageType: row[6],
    accountId: row[7],
    accountLabel: row[8],
    isReply: Boolean(row[9]),
    outboundOnly: Boolean(row[10]),
    missingPhone: Boolean(row[11]),
  }
}

function parseJson(value) {
  if (value == null) return null
  if (typeof value === 'object') return value
  if (typeof value !== 'string') return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function serialId(value) {
  const id = Number(value)
  if (!Number.isFinite(id) || id <= 0 || id >= 1e12) return 0
  return id
}

export function rememberWaMessage(entry) {
  if (!redisEnabled()) return
  const phone = entry.phone_e164 || entry.remote_jid
  if (!entry.orgId || !phone) return
  void applyWaMessage(entry, phone).catch(() => {})
}

async function applyWaMessage(entry, phone) {
  const tKey = threadKey(entry.orgId, phone)
  const iKey = inboxKey(entry.orgId)
  const rawThread = parseJson(await redisCommand(['GET', tKey]))
  const msgs = Array.isArray(rawThread?.msgs) ? rawThread.msgs.map(unpackMsg) : []
  const incoming = {
    id: entry.id,
    account_id: entry.account_id ?? null,
    direction: entry.direction,
    phone_e164: entry.phone_e164 ?? null,
    remote_jid: entry.remote_jid ?? null,
    message_type: entry.message_type ?? 'text',
    body: entry.body ?? null,
    status: entry.status ?? (entry.direction === 'in' ? 'delivered' : 'sent'),
    created_at: entry.created_at ?? new Date().toISOString(),
    campaign_id: entry.campaign_id ?? null,
    campaignName: null,
    wa_message_id: entry.wa_message_id ?? null,
    clientKey: entry.id ? `log-${entry.id}` : undefined,
  }
  const idx = msgs.findIndex(
    (row) =>
      (incoming.id && row.id === incoming.id) ||
      (incoming.wa_message_id && row.wa_message_id === incoming.wa_message_id),
  )
  const nextMsgs = idx >= 0 ? msgs.map((row, i) => (i === idx ? { ...row, ...incoming } : row)) : [...msgs, incoming]
  const packedThread = {
    v: 2,
    maxId: Math.max(serialId(rawThread?.maxId), serialId(incoming.id)),
    msgs: nextMsgs.slice(-THREAD_CAP).map(packMsg),
  }
  await redisCommand(['SET', tKey, JSON.stringify(packedThread), 'EX', String(TTL_SEC)])

  const rawInbox = parseJson(await redisCommand(['GET', iKey]))
  if (!rawInbox || !Array.isArray(rawInbox.items)) return
  const items = rawInbox.items.map(unpackPreview)
  const prev = items.find((item) => item.phone === phone)
  const rest = items.filter((item) => item.phone !== phone)
  const merged = {
    phone,
    contactName: prev?.contactName ?? null,
    pushName: entry.push_name ?? prev?.pushName ?? null,
    lastBody: incoming.body,
    lastAt: incoming.created_at,
    lastDirection: incoming.direction === 'out' ? 'out' : 'in',
    messageType: incoming.message_type,
    accountId: incoming.account_id,
    accountLabel: prev?.accountLabel ?? null,
    isReply: Boolean(prev?.isReply || incoming.direction === 'in'),
    outboundOnly: incoming.direction === 'out' && !prev?.isReply,
    missingPhone: !String(phone).startsWith('+'),
  }
  const packedInbox = {
    v: 2,
    maxId: Math.max(serialId(rawInbox.maxId), serialId(incoming.id)),
    accountLabels: rawInbox.accountLabels ?? {},
    items: [merged, ...rest].slice(0, 200).map(packPreview),
  }
  await redisCommand(['SET', iKey, JSON.stringify(packedInbox), 'EX', String(TTL_SEC)])
}
