import {
  applyChatMessage,
  readInboxCache,
  readThreadCache,
  writeInboxCache,
  writeThreadCache,
} from './chat-cache'

const INBOX_LIMIT = 400
const THREAD_LIMIT = 80

function inDateRange(iso, from, to) {
  if (!from) return true
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return false
  if (time < from.getTime()) return false
  if (to && time >= to.getTime()) return false
  return true
}

async function latestMessageId(supabase, orgId, phone) {
  let query = supabase
    .from('message_log')
    .select('id')
    .eq('org_id', orgId)
    .in('direction', ['in', 'out'])
    .order('id', { ascending: false })
    .limit(1)
  if (phone) {
    query = phone.startsWith('+') ? query.eq('phone_e164', phone) : query.eq('remote_jid', phone)
  }
  const { data, error } = await query.maybeSingle()
  if (error) return Number.POSITIVE_INFINITY
  return data?.id ? Number(data.id) : 0
}

async function loadInboxFromPg(supabase, orgId) {
  const [{ data: recent }, { data: accounts }] = await Promise.all([
    supabase
      .from('message_log')
      .select(
        'id, account_id, direction, phone_e164, remote_jid, message_type, body, status, created_at, campaign_id, push_name',
      )
      .eq('org_id', orgId)
      .in('direction', ['in', 'out'])
      .order('id', { ascending: false })
      .limit(INBOX_LIMIT),
    supabase.from('accounts').select('id, label').eq('org_id', orgId),
  ])

  const accountLabels = Object.fromEntries((accounts ?? []).map((account) => [account.id, account.label]))
  const outboundPhones = new Set()
  const inboundPhones = new Set()
  for (const row of recent ?? []) {
    if (!row.phone_e164) continue
    if (row.direction === 'out') outboundPhones.add(row.phone_e164)
    if (row.direction === 'in') inboundPhones.add(row.phone_e164)
  }

  const allPreviews = new Map()
  let maxId = 0
  for (const row of recent ?? []) {
    maxId = Math.max(maxId, Number(row.id) || 0)
    const phone = row.phone_e164 ?? row.remote_jid ?? `id-${row.id}`
    const pushName = typeof row.push_name === 'string' && row.push_name.trim() ? row.push_name.trim() : null
    const direction = row.direction === 'out' ? 'out' : 'in'
    if (allPreviews.has(phone)) {
      const existing = allPreviews.get(phone)
      if (!existing.pushName && pushName) existing.pushName = pushName
      continue
    }
    const hasPhone = Boolean(row.phone_e164)
    allPreviews.set(phone, {
      phone,
      pushName,
      lastBody: row.body,
      lastAt: row.created_at,
      lastDirection: direction,
      messageType: row.message_type,
      accountId: row.account_id,
      accountLabel: row.account_id ? accountLabels[row.account_id] ?? null : null,
      isReply: Boolean(row.phone_e164 && outboundPhones.has(row.phone_e164) && inboundPhones.has(row.phone_e164)),
      outboundOnly: Boolean(row.phone_e164 && outboundPhones.has(row.phone_e164) && !inboundPhones.has(row.phone_e164)),
      missingPhone: !hasPhone,
      contactName: null,
    })
  }

  const items = [...allPreviews.values()]
  const e164Phones = items.map((item) => item.phone).filter((phone) => phone.startsWith('+'))
  if (e164Phones.length > 0) {
    const { data: namedContacts } = await supabase
      .from('contacts')
      .select('phone_e164, name')
      .eq('org_id', orgId)
      .in('phone_e164', e164Phones)
      .not('name', 'is', null)
    const namesByPhone = new Map()
    for (const row of namedContacts ?? []) {
      const name = row.name?.trim()
      if (!row.phone_e164 || !name) continue
      if (!namesByPhone.has(row.phone_e164)) namesByPhone.set(row.phone_e164, name)
    }
    for (const item of items) {
      item.contactName = namesByPhone.get(item.phone) ?? null
    }
  }

  return { maxId, items, accountLabels }
}

async function loadThreadFromPg(supabase, orgId, phone) {
  let threadQuery = supabase
    .from('message_log')
    .select(
      'id, account_id, direction, phone_e164, remote_jid, message_type, body, status, created_at, campaign_id, wa_message_id',
    )
    .eq('org_id', orgId)
    .in('direction', ['in', 'out'])
    .order('id', { ascending: false })
    .limit(THREAD_LIMIT)
  threadQuery = phone.startsWith('+') ? threadQuery.eq('phone_e164', phone) : threadQuery.eq('remote_jid', phone)

  const targetsQuery = phone.startsWith('+')
    ? supabase
        .from('campaign_targets')
        .select(
          'id, campaign_id, account_id, phone_e164, status, sent_at, updated_at, personalized_body, wa_message_id',
        )
        .eq('org_id', orgId)
        .eq('phone_e164', phone)
        .in('status', ['sent', 'delivered', 'read'])
        .order('id', { ascending: true })
        .limit(80)
    : Promise.resolve({ data: [] })

  const [{ data: threadRows }, { data: targets }] = await Promise.all([threadQuery, targetsQuery])

  let thread = [...(threadRows ?? [])].reverse().map((row) => ({
    ...row,
    clientKey: `log-${row.id}`,
  }))

  const campaignIds = [
    ...new Set(
      [...thread.map((row) => row.campaign_id), ...(targets ?? []).map((row) => row.campaign_id)].filter(Boolean),
    ),
  ]
  const campaignMeta = new Map()
  if (campaignIds.length > 0) {
    const { data: camps } = await supabase
      .from('campaigns')
      .select('id, name, body, message_type, media_url')
      .eq('org_id', orgId)
      .in('id', campaignIds)
    for (const camp of camps ?? []) {
      campaignMeta.set(camp.id, camp)
    }
  }

  const seenCampaign = new Set(thread.map((row) => row.campaign_id).filter(Boolean))
  const seenWa = new Set(thread.map((row) => row.wa_message_id).filter(Boolean))
  for (const target of targets ?? []) {
    if (seenCampaign.has(target.campaign_id)) continue
    if (target.wa_message_id && seenWa.has(target.wa_message_id)) continue
    const meta = campaignMeta.get(target.campaign_id)
    thread.push({
      id: target.id,
      clientKey: `campaign-${target.id}`,
      account_id: target.account_id,
      direction: 'out',
      phone_e164: target.phone_e164,
      remote_jid: null,
      message_type: meta?.message_type || 'text',
      body: target.personalized_body || meta?.body || (meta?.media_url ? '(görsel)' : null),
      status: target.status,
      created_at: target.sent_at ?? target.updated_at,
      campaign_id: target.campaign_id,
      campaignName: meta?.name ?? null,
      wa_message_id: target.wa_message_id,
    })
  }

  thread.sort((a, b) => {
    const delta = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    if (delta !== 0) return delta
    return String(a.clientKey ?? '').localeCompare(String(b.clientKey ?? ''))
  })
  thread = thread.map((row) => {
    if (!row.campaign_id) return row
    const meta = campaignMeta.get(row.campaign_id)
    if (!meta) return row
    return {
      ...row,
      campaignName: row.campaignName ?? meta.name,
      body: row.body || meta.body || (meta.media_url ? '(görsel)' : row.body),
    }
  })

  const maxId = (threadRows ?? []).reduce((max, row) => Math.max(max, Number(row.id) || 0), 0)
  return { maxId, msgs: thread.slice(-100) }
}

export async function loadInboxBundle(supabase, orgId) {
  const [cached, latestId] = await Promise.all([readInboxCache(orgId), latestMessageId(supabase, orgId)])
  if (cached && cached.maxId > 0 && cached.maxId >= latestId) {
    return cached
  }
  const fresh = await loadInboxFromPg(supabase, orgId)
  void writeInboxCache(orgId, fresh)
  return fresh
}

export async function loadThreadBundle(supabase, orgId, phone) {
  if (!phone) return { maxId: 0, msgs: [] }
  const [cached, latestId] = await Promise.all([
    readThreadCache(orgId, phone),
    latestMessageId(supabase, orgId, phone),
  ])
  if (cached && cached.maxId >= latestId) {
    return cached
  }
  const fresh = await loadThreadFromPg(supabase, orgId, phone)
  void writeThreadCache(orgId, phone, fresh)
  return fresh
}

export function filterInbox(items, rangeFrom, rangeTo, tab) {
  const dated = items.filter((item) => inDateRange(item.lastAt, rangeFrom, rangeTo))
  const outbound = dated.filter((item) => item.outboundOnly)
  return {
    allCount: dated.length,
    outboundCount: outbound.length,
    previews: tab === 'giden' ? outbound : dated,
  }
}

export function filterThread(msgs, rangeFrom, rangeTo) {
  if (!rangeFrom) return msgs
  return msgs.filter((row) => inDateRange(row.created_at, rangeFrom, rangeTo))
}

export async function syncChatMessage(orgId, phone, message, preview) {
  await applyChatMessage(orgId, phone, message, preview)
}
