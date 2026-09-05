// Isolated UI-test backend. Never point a production deployment at this process.
import http from 'node:http'
const id = '11111111-1111-4111-8111-111111111111'
const orgId = '22222222-2222-4222-8222-222222222222'
const accountId = '33333333-3333-4333-8333-333333333333'
const campaignId = '44444444-4444-4444-8444-444444444444'
const listId = '55555555-5555-4555-8555-555555555555'
const contactId = '66666666-6666-4666-8666-666666666666'
const now = new Date().toISOString()
const user = { id, aud: 'authenticated', role: 'authenticated', email: 'test@filo.example', email_confirmed_at: now, app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, identities: [], created_at: now, updated_at: now }
const org = { id: orgId, name: 'Örnek İşletme', slug: 'ornek-isletme', plan: 'pro', accounts_quota: 10, monthly_message_quota: 10000, created_by: id, created_at: now, updated_at: now }
const token = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: id, aud: 'authenticated', role: 'authenticated', email: user.email, exp: Math.floor(Date.now() / 1000) + 86400 })).toString('base64url'), 'fixture-signature'].join('.')
let empty = false
let sequence = 100
const jobs = []
const account = { id: accountId, org_id: orgId, created_by: id, label: 'Satış hattı', phone_e164: '+905320000001', status: 'connected', enabled: true, is_locked: false, daily_send_limit: 250, sent_today: 18, sent_today_on: now.slice(0, 10), warmup_started_at: '2026-01-01T00:00:00Z', new_chat_quota_total: null, new_chat_quota_used: null, reachout_locked_until: null, qr_code: null, pairing_code: null, created_at: now, updated_at: now, last_seen_at: now }
const contact = { id: contactId, org_id: orgId, created_by: id, name: 'Örnek Kişi', phone_e164: '+905320000002', wa_status: 'valid', wa_checked_at: now, wa_jid: '905320000002@s.whatsapp.net', source: 'manual', created_at: now }
const campaign = { id: campaignId, org_id: orgId, created_by: id, name: 'Eylül bilgilendirmesi', status: 'completed', body: 'Merhaba {{ad}}, yeni çalışma saatlerimizi paylaşmak istedik.', message_type: 'text', media_url: null, total_targets: 20, sent_count: 18, failed_count: 1, skipped_count: 1, min_delay_seconds: 8, max_delay_seconds: 25, daily_cap_per_account: 100, source_list_ids: [listId], started_at: now, completed_at: now, created_at: now, updated_at: now, stop_reason: null }
const messages = [
  { id: 1, org_id: orgId, account_id: accountId, direction: 'out', phone_e164: contact.phone_e164, remote_jid: contact.wa_jid, message_type: 'text', body: 'Merhaba, çalışma saatlerimiz güncellendi.', status: 'sent', created_at: now, campaign_id: campaignId },
  { id: 2, org_id: orgId, account_id: accountId, direction: 'in', phone_e164: contact.phone_e164, remote_jid: contact.wa_jid, message_type: 'text', body: 'Teşekkürler, cumartesi de açık mısınız?', status: 'received', created_at: now, campaign_id: null },
]
function rowsFor(table) {
  if (table === 'profiles') return [{ id, full_name: 'Test Kullanıcısı', company: org.name, active_org_id: orgId, email: user.email }]
  if (table === 'organizations') return [org]
  if (table === 'organization_members') return [{ org_id: orgId, user_id: id, role: 'owner', created_at: now, organizations: org }]
  if (table === 'jobs') return jobs
  if (empty) return []
  return { accounts: [account], contacts: [contact], campaigns: [campaign], message_log: messages,
    contact_lists: [{ id: listId, org_id: orgId, name: 'Müşteriler', source: 'manual', contact_count: 1, created_at: now }],
    contact_list_members: [{ org_id: orgId, list_id: listId, contact_id: contactId, added_at: now, contacts: contact }],
    campaign_accounts: [{ org_id: orgId, campaign_id: campaignId, account_id: accountId, sent_count: 18, accounts: account }],
    campaign_targets: [{ id: 1, org_id: orgId, campaign_id: campaignId, phone_e164: contact.phone_e164, status: 'sent', error: null, sent_at: now, updated_at: now }],
    account_events: [{ id: 1, org_id: orgId, account_id: accountId, event: 'account.connected', level: 'info', detail: {}, created_at: now }],
  }[table] ?? []
}
function filtered(rows, params) {
  return rows.filter(row => [...params].every(([key, filter]) => {
    if (['select', 'order', 'limit', 'offset', 'or', 'and'].includes(key) || key.includes('.')) return true
    if (filter.startsWith('eq.')) return String(row[key]) === filter.slice(3)
    if (filter.startsWith('neq.')) return String(row[key]) !== filter.slice(4)
    if (filter.startsWith('gte.')) return String(row[key]) >= filter.slice(4)
    if (filter.startsWith('lt.')) return String(row[key]) < filter.slice(3)
    if (filter.startsWith('in.(')) return filter.slice(4, -1).split(',').includes(String(row[key]))
    return true
  }))
}
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:54329')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,HEAD,OPTIONS')
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range')
  res.setHeader('Content-Type', 'application/json')
  const send = (value, status = 200) => { res.statusCode = status; res.end(req.method === 'HEAD' ? '' : JSON.stringify(value)) }
  if (req.method === 'OPTIONS') return send({})
  let body = ''
  for await (const chunk of req) body += chunk
  let payload = {}
  try { payload = body ? JSON.parse(body) : {} } catch { return send({ error: 'invalid json' }, 400) }
  if (url.pathname === '/__fixture') { empty = url.searchParams.get('empty') === 'true'; return send({ empty }) }
  if (url.pathname === '/auth/v1/token') {
    if (payload.password && payload.password !== 'Filo-test-123!') return send({ code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400)
    return send({ access_token: token, refresh_token: 'fixture-refresh', token_type: 'bearer', expires_in: 86400, user })
  }
  if (url.pathname === '/auth/v1/user') return send(user)
  if (url.pathname === '/auth/v1/signup') return send({ user, session: null })
  if (url.pathname.startsWith('/auth/')) return send({})
  if (url.pathname.startsWith('/rest/v1/rpc/')) return send(orgId)
  const table = url.pathname.split('/').at(-1)
  if (req.method === 'POST') {
    const records = (Array.isArray(payload) ? payload : [payload]).map(item => ({ ...item, id: table === 'jobs' ? ++sequence : crypto.randomUUID(), status: table === 'jobs' ? 'done' : item.status, result: { messageId: 'fixture-only' }, created_at: now }))
    if (table === 'jobs') jobs.push(...records)
    return send(req.headers.accept?.includes('vnd.pgrst.object') ? records[0] : records, 201)
  }
  let rows = filtered(rowsFor(table), url.searchParams)
  const count = rows.length
  const order = url.searchParams.get('order')
  if (order) { const [field, direction] = order.split('.'); rows.sort((a, b) => String(a[field]).localeCompare(String(b[field])) * (direction === 'desc' ? -1 : 1)) }
  const offset = Number(url.searchParams.get('offset') ?? 0)
  const limit = Number(url.searchParams.get('limit') ?? 1000)
  rows = rows.slice(offset, offset + limit)
  res.setHeader('Content-Range', rows.length ? `${offset}-${offset + rows.length - 1}/${count}` : `*/${count}`)
  if (req.headers.accept?.includes('vnd.pgrst.object')) return rows.length ? send(rows[0]) : send({ code: 'PGRST116', details: 'The result contains 0 rows' }, 406)
  return send(rows)
}).listen(54329, '127.0.0.1', () => console.log('Fixture Supabase: http://127.0.0.1:54329 (local test data only)'))
