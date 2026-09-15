import { Redis } from '@upstash/redis'

const TTL_SEC = 60 * 60 * 72
const THREAD_CAP = 100
const INBOX_CAP = 200
const MEM_TTL_MS = 20_000
const MEM_MAX = 80

let client = null
const mem = new Map()

function redis() {
  if (client) return client
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  client = new Redis({ url, token })
  return client
}

export function chatCacheEnabled() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

function inboxKey(orgId) {
  return `wb:c2:inbox:${orgId}`
}

function threadKey(orgId, phone) {
  return `wb:c2:th:${orgId}:${encodeURIComponent(phone)}`
}

function memGet(key) {
  const hit = mem.get(key)
  if (!hit) return null
  if (Date.now() - hit.at > MEM_TTL_MS) {
    mem.delete(key)
    return null
  }
  return hit.value
}

function memSet(key, value) {
  mem.set(key, { at: Date.now(), value })
  if (mem.size <= MEM_MAX) return
  const first = mem.keys().next().value
  if (first) mem.delete(first)
}

function memDel(key) {
  mem.delete(key)
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

function serialId(value) {
  const id = Number(value)
  if (!Number.isFinite(id) || id <= 0 || id >= 1e12) return 0
  return id
}

export async function readInboxCache(orgId) {
  const key = inboxKey(orgId)
  const local = memGet(key)
  if (local) return local
  const r = redis()
  if (!r) return null
  try {
    const raw = await r.get(key)
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!value || typeof value !== 'object') return null
    const items = Array.isArray(value.items) ? value.items.map(unpackPreview) : []
    const packed = {
      maxId: serialId(value.maxId),
      items,
      accountLabels: value.accountLabels && typeof value.accountLabels === 'object' ? value.accountLabels : {},
    }
    memSet(key, packed)
    return packed
  } catch {
    return null
  }
}

export async function writeInboxCache(orgId, payload) {
  const items = (payload.items ?? []).slice(0, INBOX_CAP)
  const packed = {
    v: 2,
    maxId: serialId(payload.maxId),
    accountLabels: payload.accountLabels ?? {},
    items: items.map(packPreview),
  }
  const decoded = {
    maxId: packed.maxId,
    items,
    accountLabels: packed.accountLabels,
  }
  const key = inboxKey(orgId)
  memSet(key, decoded)
  const r = redis()
  if (!r) return
  try {
    await r.set(key, packed, { ex: TTL_SEC })
  } catch {
    // Redis yoksa arayüz Postgres ile devam eder.
  }
}

export async function readThreadCache(orgId, phone) {
  const key = threadKey(orgId, phone)
  const local = memGet(key)
  if (local) return local
  const r = redis()
  if (!r) return null
  try {
    const raw = await r.get(key)
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!value || typeof value !== 'object') return null
    const msgs = Array.isArray(value.msgs) ? value.msgs.map(unpackMsg) : []
    const packed = { maxId: serialId(value.maxId), msgs }
    memSet(key, packed)
    return packed
  } catch {
    return null
  }
}

export async function writeThreadCache(orgId, phone, payload) {
  const msgs = (payload.msgs ?? []).slice(-THREAD_CAP)
  const packed = {
    v: 2,
    maxId: serialId(payload.maxId),
    msgs: msgs.map(packMsg),
  }
  const decoded = { maxId: packed.maxId, msgs }
  const key = threadKey(orgId, phone)
  memSet(key, decoded)
  const r = redis()
  if (!r) return
  try {
    await r.set(key, packed, { ex: TTL_SEC })
  } catch {
    // Redis yoksa arayüz Postgres ile devam eder.
  }
}

function upsertMsg(list, incoming) {
  const next = unpackMsg(Array.isArray(incoming) ? incoming : packMsg(incoming))
  const idx = list.findIndex((row) => {
    if (next.id && row.id && row.id === next.id) return true
    if (next.clientKey && row.clientKey && row.clientKey === next.clientKey) return true
    if (next.wa_message_id && row.wa_message_id && row.wa_message_id === next.wa_message_id) return true
    return false
  })
  if (idx >= 0) {
    const copy = list.slice()
    copy[idx] = { ...copy[idx], ...next }
    return copy
  }
  const pendingIdx = list.findIndex(
    (row) =>
      String(row.clientKey ?? '').startsWith('local-') &&
      row.direction === next.direction &&
      (row.body ?? '') === (next.body ?? ''),
  )
  if (pendingIdx >= 0) {
    const copy = list.slice()
    copy[pendingIdx] = { ...copy[pendingIdx], ...next }
    return copy
  }
  return [...list, next]
}

export async function applyChatMessage(orgId, phone, message, preview) {
  if (!orgId || !phone || !message) return
  const current = (await readThreadCache(orgId, phone)) ?? { maxId: 0, msgs: [] }
  const msgs = upsertMsg(current.msgs, message)
  const maxId = Math.max(current.maxId, serialId(message.id))
  await writeThreadCache(orgId, phone, { maxId, msgs })

  const inbox = await readInboxCache(orgId)
  if (!inbox) return
  const patch = preview ?? {
    phone,
    contactName: null,
    pushName: null,
    lastBody: message.body ?? null,
    lastAt: message.created_at,
    lastDirection: message.direction === 'out' ? 'out' : 'in',
    messageType: message.message_type ?? 'text',
    accountId: message.account_id ?? null,
    accountLabel: inbox.accountLabels[message.account_id] ?? null,
    isReply: message.direction === 'in',
    outboundOnly: message.direction === 'out',
    missingPhone: !String(phone).startsWith('+'),
  }
  const rest = inbox.items.filter((item) => item.phone !== phone)
  const prev = inbox.items.find((item) => item.phone === phone)
  const merged = {
    phone,
    contactName: patch.contactName ?? prev?.contactName ?? null,
    pushName: patch.pushName ?? prev?.pushName ?? null,
    lastBody: patch.lastBody ?? prev?.lastBody ?? null,
    lastAt: patch.lastAt ?? prev?.lastAt,
    lastDirection: patch.lastDirection ?? prev?.lastDirection ?? 'in',
    messageType: patch.messageType ?? prev?.messageType ?? 'text',
    accountId: patch.accountId ?? prev?.accountId ?? null,
    accountLabel: patch.accountLabel ?? prev?.accountLabel ?? null,
    isReply: Boolean(prev?.isReply || patch.isReply),
    outboundOnly: patch.lastDirection === 'out' && !prev?.isReply,
    missingPhone: Boolean(patch.missingPhone ?? prev?.missingPhone),
  }
  await writeInboxCache(orgId, {
    maxId: Math.max(inbox.maxId, serialId(message.id)),
    accountLabels: inbox.accountLabels,
    items: [merged, ...rest],
  })
}

export function dropChatMem(orgId, phone) {
  memDel(inboxKey(orgId))
  if (phone) memDel(threadKey(orgId, phone))
}
