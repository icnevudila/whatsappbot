import 'server-only'

import { createSupabaseServiceClient } from '@/lib/supabase/service'
import type {
  ControlJobType,
  ControlPlaneSnapshot,
  OperationsAccount,
  OperationsAlert,
  OperationsBot,
  OperationsEvent,
  OperationsJob,
  OperationsMessage,
  OperationsWorker,
} from './types'
import { canonicalWorkerState, normalizeControlJobState, normalizeControlJobType } from './projection'

type JsonRecord = Record<string, any>

const nowIso = () => new Date().toISOString()
const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : value == null ? null : String(value)
const asDate = (value: unknown): string | null => {
  const raw = asString(value)
  if (!raw) return null
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}
const asNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
const durationMs = (start: string | null, end: string | null): number | null => {
  if (!start || !end) return null
  return Math.max(0, new Date(end).getTime() - new Date(start).getTime())
}
const redactPreview = (value: unknown): string => {
  const text = asString(value)?.replace(/\s+/g, ' ') ?? ''
  return text.length > 160 ? `${text.slice(0, 157)}…` : text
}

function phaseFor(state: unknown, type: string): string {
  const value = String(state || '').toUpperCase()
  const labels: Record<string, string> = {
    PENDING: 'Alındı', QUEUED: 'Kuyrukta', LEASED: 'Worker atandı',
    PREPARING_ENV: 'Ortam hazırlanıyor', OPENING_PROJECT: 'Proje açılıyor',
    ATTACHING_INGREDIENTS: 'Referanslar ekleniyor', INGREDIENTS_VERIFIED: 'Referanslar doğrulandı',
    GENERATING: 'Üretiliyor', POLLING_FLOW: 'Provider bekleniyor',
    DOWNLOADING_MEDIA: 'İndiriliyor', MEDIA_DOWNLOADED: 'İndirildi',
    FFPROBE_INSPECTING: 'Medya inceleniyor', SHA256_VERIFYING: 'Bütünlük doğrulanıyor',
    VISUAL_QA_EVALUATING: 'Kalite kontrolü', COMPLETED: 'Tamamlandı',
    DONE: 'Tamamlandı', FAILED: 'Başarısız', NEEDS_REVIEW: 'İnceleme gerekli',
    CANCELLED: 'İptal edildi', CLAIMED: 'Worker aldı', RUNNING: 'Çalışıyor',
  }
  return labels[value] || (type ? type.replaceAll('.', ' ') : 'Bekliyor')
}

async function optionalRows(promise: PromiseLike<{ data: any; error: any }>) {
  try {
    const { data, error } = await promise
    return { rows: Array.isArray(data) ? data : [], ok: !error }
  } catch {
    return { rows: [], ok: false }
  }
}

async function optionalRpc(promise: PromiseLike<{ data: any; error: any }>) {
  try {
    const { data, error } = await promise
    return { data: error ? null : data, ok: !error }
  } catch {
    return { data: null, ok: false }
  }
}

async function optionalJson(url: string | undefined, path: string, timeoutMs = 2500) {
  if (!url) return { data: null as any, ok: false }
  try {
    const response = await fetch(`${url.replace(/\/$/, '')}${path}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    })
    return { data: response.ok ? await response.json() : null, ok: response.ok }
  } catch {
    return { data: null as any, ok: false }
  }
}

function eventFromOperation(row: JsonRecord, organizations: Map<string, string>): OperationsEvent {
  return {
    id: `ops:${row.id}`,
    eventType: String(row.event_type || 'EVENT'),
    jobId: asString(row.job_id),
    orgId: asString(row.org_id),
    organization: organizations.get(String(row.org_id)) || null,
    accountId: asString(row.account_id),
    workerId: asString(row.worker_id),
    botId: asString(row.bot_id),
    provider: asString(row.provider),
    state: asString(row.state),
    phase: asString(row.current_phase),
    message: redactPreview(row.message || row.event_type),
    errorCode: asString(row.error_code),
    createdAt: asDate(row.created_at) || nowIso(),
  }
}

function buildJob(
  source: OperationsJob['source'],
  row: JsonRecord,
  organizations: Map<string, string>,
  timelines: Map<string, OperationsEvent[]>,
): OperationsJob {
  const sourceId = String(row.id)
  const id = `${source}:${sourceId}`
  const state = normalizeControlJobState(row.state || row.status)
  const type = String(row.type || row.generation_type || row.model || source)
  const startedAt = asDate(row.generation_started_at || row.started_at || row.claimed_at)
  const completedAt = asDate(row.generation_completed_at || row.completed_at || row.finished_at)
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {}
  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {}
  const accountId = asString(row.provider_account_id || row.lease_account_id || row.account_id || row.channel_account_id)
  const workerId = asString(row.lease_worker_id || row.claimed_by || row.worker_id)
  const orgId = asString(row.org_id)
  const eventKeys = [id, sourceId]
  const timeline = eventKeys.flatMap(key => timelines.get(key) || [])
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return {
    id,
    source,
    sourceId,
    orgId,
    organization: organizations.get(String(orgId)) || row.org_name || 'Genel',
    customerId: asString(payload.customer_id || metadata.customer_id || row.customer_id),
    conversationId: asString(payload.conversation_id || payload.phone_e164 || metadata.conversation_id),
    botId: asString(payload.bot_id || metadata.bot_id),
    jobType: normalizeControlJobType(type, source),
    type,
    priority: asNumber(row.priority),
    state,
    workerId,
    provider: asString(row.selected_provider || row.requested_provider || metadata.provider),
    accountId,
    attemptId: asString(row.attempt_id || metadata.attempt_id),
    createdAt: asDate(row.created_at) || nowIso(),
    queuedAt: asDate(row.queued_at || row.created_at),
    startedAt,
    completedAt,
    lastHeartbeatAt: asDate(row.last_heartbeat_at),
    currentPhase: phaseFor(row.state || row.status, type),
    errorCode: asString(row.error_code),
    errorMessage: redactPreview(row.error_message || row.error) || null,
    durationMs: durationMs(startedAt, completedAt),
    attemptCount: asNumber(row.retry_count ?? row.attempts),
    maxAttempts: asNumber(row.max_retries ?? row.max_attempts, 1),
    summary: redactPreview(row.title || payload.body || metadata.summary || type),
    timeline,
    eligibleActions: [
      ...(state === 'FAILED' || state === 'NEEDS_REVIEW' ? ['retry' as const] : []),
      ...(state === 'QUEUED' ? ['cancel' as const] : []),
    ],
  }
}

export async function getControlPlaneSnapshot(): Promise<ControlPlaneSnapshot> {
  const supabase = createSupabaseServiceClient()
  if (!supabase) throw new Error('SUPABASE_SERVICE_ROLE_KEY eksik')

  const [
    orgResult, jobResult, channelJobResult, creativeResult, mediaJobResult,
    mediaEventResult, attemptResult, opsEventResult, flowAccountResult,
    flowWorkerResult, channelWorkerResult, messageResult, autoReplyResult, feedResult,
    gatewayResult, gflowHealthResult,
  ] = await Promise.all([
    optionalRows(supabase.from('organizations').select('id,name').limit(500)),
    optionalRows(supabase.from('jobs').select('*').order('created_at', { ascending: false }).limit(150)),
    optionalRows(supabase.from('channel_jobs').select('*').order('created_at', { ascending: false }).limit(100)),
    optionalRows(supabase.from('creatives').select('id,org_id,title,generation_type,status,error,created_at,updated_at,payload').order('created_at', { ascending: false }).limit(100)),
    optionalRows(supabase.from('ai_media_jobs').select('*').order('created_at', { ascending: false }).limit(150)),
    optionalRows(supabase.from('ai_media_events').select('*').order('created_at', { ascending: false }).limit(400)),
    optionalRows(supabase.from('ai_media_attempts').select('*').order('started_at', { ascending: false }).limit(200)),
    optionalRows(supabase.from('operations_events').select('*').order('created_at', { ascending: false }).limit(300)),
    optionalRows(supabase.from('flow_accounts').select('*').order('id').limit(100)),
    optionalRows(supabase.from('flow_workers').select('*').limit(100)),
    optionalRows(supabase.from('channel_worker_heartbeat').select('*').order('seen_at', { ascending: false }).limit(100)),
    optionalRows(supabase.from('message_log').select('id,org_id,account_id,direction,phone_e164,push_name,body,message_type,status,error,created_at').order('created_at', { ascending: false }).limit(180)),
    optionalRows(supabase.from('auto_reply_log').select('id,org_id,account_id,phone_e164,source,reply_body,created_at').order('created_at', { ascending: false }).limit(180)),
    optionalRpc(supabase.rpc('get_canli_takip_feed')),
    optionalJson(process.env.AI_GATEWAY_URL, '/v1/ai-engine/status', 3500),
    optionalJson(process.env.GFLOW_ENGINE_URL, '/v1/workers/health', 2500),
  ])

  const organizations = new Map(orgResult.rows.map(row => [String(row.id), String(row.name || 'Genel')]))
  const attemptsByJob = new Map<string, JsonRecord[]>()
  for (const attempt of attemptResult.rows) {
    const key = String(attempt.job_id)
    attemptsByJob.set(key, [...(attemptsByJob.get(key) || []), attempt])
  }

  const events: OperationsEvent[] = opsEventResult.rows.map(row => eventFromOperation(row, organizations))
  for (const row of mediaEventResult.rows) {
    events.push({
      id: `ai:${row.id}`,
      eventType: String(row.event_type || 'JOB_UPDATED'),
      jobId: row.job_id ? `ai_media_jobs:${row.job_id}` : null,
      orgId: asString(row.org_id),
      organization: organizations.get(String(row.org_id)) || null,
      accountId: null,
      workerId: null,
      botId: 'video-bot',
      provider: asString(row.payload?.provider || row.payload?.selected_provider),
      state: asString(row.to_state),
      phase: phaseFor(row.to_state, 'video'),
      message: redactPreview(row.message || row.event_type),
      errorCode: asString(row.payload?.error_code),
      createdAt: asDate(row.created_at) || nowIso(),
    })
  }

  const timelineMap = new Map<string, OperationsEvent[]>()
  for (const event of events) {
    if (!event.jobId) continue
    timelineMap.set(event.jobId, [...(timelineMap.get(event.jobId) || []), event])
    const raw = event.jobId.includes(':') ? event.jobId.split(':').at(-1)! : event.jobId
    timelineMap.set(raw, [...(timelineMap.get(raw) || []), event])
  }

  const jobs = [
    ...jobResult.rows.map(row => buildJob('jobs', row, organizations, timelineMap)),
    ...channelJobResult.rows.map(row => buildJob('channel_jobs', row, organizations, timelineMap)),
    ...creativeResult.rows.map(row => buildJob('creatives', row, organizations, timelineMap)),
    ...mediaJobResult.rows.map(row => {
      const attempts = attemptsByJob.get(String(row.id)) || []
      const latestAttempt = attempts[0]
      return buildJob('ai_media_jobs', {
        ...row,
        attempt_id: latestAttempt?.id,
        worker_id: latestAttempt?.worker_id || row.lease_worker_id,
      }, organizations, timelineMap)
    }),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  for (const job of jobs.slice(0, 120)) {
    if (job.timeline.length === 0) {
      events.push({
        id: `job:${job.id}`,
        eventType: job.state === 'FAILED' ? 'JOB_FAILED' : job.state === 'COMPLETED' ? 'JOB_COMPLETED' : job.state === 'ACTIVE' ? 'JOB_ASSIGNED' : 'JOB_QUEUED',
        jobId: job.id,
        orgId: job.orgId,
        organization: job.organization,
        accountId: job.accountId,
        workerId: job.workerId,
        botId: job.botId,
        provider: job.provider,
        state: job.state,
        phase: job.currentPhase,
        message: job.summary,
        errorCode: job.errorCode,
        createdAt: job.completedAt || job.startedAt || job.createdAt,
      })
    }
  }

  const replies = autoReplyResult.rows
  const messages: OperationsMessage[] = messageResult.rows.map(row => {
    const createdAt = asDate(row.created_at) || nowIso()
    const reply = row.direction === 'in'
      ? replies.find(item => item.phone_e164 === row.phone_e164 && new Date(item.created_at).getTime() >= new Date(createdAt).getTime() && new Date(item.created_at).getTime() - new Date(createdAt).getTime() < 10 * 60_000)
      : null
    const processingJob = jobs.find(job => job.conversationId === row.phone_e164 && Math.abs(new Date(job.createdAt).getTime() - new Date(createdAt).getTime()) < 10 * 60_000)
    return {
      id: String(row.id),
      timestamp: createdAt,
      orgId: asString(row.org_id),
      organization: organizations.get(String(row.org_id)) || 'Genel',
      customer: redactPreview(row.push_name || row.phone_e164 || 'Bilinmeyen müşteri'),
      conversationId: String(row.phone_e164 || row.id),
      preview: redactPreview(row.body || `[${row.message_type || 'mesaj'}]`),
      assignedBot: processingJob?.botId || (row.direction === 'in' ? 'whatsapp-bot' : 'operator/whatsapp-bot'),
      processingState: processingJob?.currentPhase || (reply ? 'Yanıtlandı' : row.direction === 'in' ? 'Alındı' : 'Gönderildi'),
      provider: processingJob?.provider || (reply ? 'AI_REPLY' : 'WHATSAPP'),
      accountId: asString(row.account_id),
      responseState: row.error ? 'FAILED' : reply ? 'RESPONSE_SENT' : String(row.status || 'RECEIVED').toUpperCase(),
      latencyMs: reply ? Math.max(0, new Date(reply.created_at).getTime() - new Date(createdAt).getTime()) : null,
      direction: row.direction === 'out' ? 'out' : 'in',
    }
  })

  for (const message of messages.slice(0, 100)) {
    events.push({
      id: `message:${message.id}`,
      eventType: message.direction === 'in' ? 'MESSAGE_RECEIVED' : 'RESPONSE_SENT',
      jobId: null,
      orgId: message.orgId,
      organization: message.organization,
      accountId: message.accountId,
      workerId: null,
      botId: message.assignedBot,
      provider: message.provider,
      state: message.responseState,
      phase: message.processingState,
      message: message.preview,
      errorCode: message.responseState === 'FAILED' ? 'MESSAGE_FAILED' : null,
      createdAt: message.timestamp,
    })
  }
  for (const reply of replies.slice(0, 80)) {
    events.push({
      id: `reply:${reply.id}`,
      eventType: 'RESPONSE_GENERATED',
      jobId: null,
      orgId: asString(reply.org_id),
      organization: organizations.get(String(reply.org_id)) || 'Genel',
      accountId: asString(reply.account_id),
      workerId: null,
      botId: 'ai-reply-bot',
      provider: 'AI_REPLY',
      state: 'COMPLETED',
      phase: 'Yanıt üretildi',
      message: redactPreview(reply.reply_body),
      errorCode: null,
      createdAt: asDate(reply.created_at) || nowIso(),
    })
  }

  const accounts: OperationsAccount[] = []
  const feedAccounts: JsonRecord[] = Array.isArray(feedResult.data?.accounts) ? feedResult.data.accounts : []
  for (const row of feedAccounts) {
    const connected = row.status === 'connected'
    accounts.push({
      id: String(row.id), provider: 'WHATSAPP', label: row.label || row.phone_e164 || 'WhatsApp',
      workerHost: null, health: connected ? 'HEALTHY' : 'OFFLINE',
      authState: connected ? 'AUTHENTICATED' : 'AUTH_REQUIRED', capability: 'MESSAGING',
      quotaState: 'UNKNOWN', browserState: connected ? 'IDLE' : 'OFFLINE', currentJobId: null,
      lastActivityAt: asDate(row.last_seen_at), cooldownUntil: null,
      lastError: redactPreview(row.status_detail) || null, enabled: row.enabled !== false,
      actions: [],
    })
  }
  for (const row of flowAccountResult.rows) {
    const authRequired = ['needs_reauth', 'blocked', 'agent_ui_blocked'].includes(row.status)
    const quota = row.status === 'rate_limited'
    accounts.push({
      id: String(row.id), provider: 'FLOW', label: row.display_name || row.email || row.id,
      workerHost: null, health: authRequired ? 'DEGRADED' : row.status === 'maintenance' ? 'OFFLINE' : 'HEALTHY',
      authState: authRequired ? 'AUTH_REQUIRED' : 'AUTHENTICATED', capability: 'VIDEO',
      quotaState: quota ? 'QUOTA_EXHAUSTED' : 'AVAILABLE', browserState: canonicalWorkerState(row.status),
      currentJobId: asString(row.current_job_id), lastActivityAt: asDate(row.last_heartbeat_at || row.updated_at),
      cooldownUntil: asDate(row.cooldown_until), lastError: asString(row.last_error), enabled: row.status !== 'maintenance',
      actions: row.status === 'maintenance' ? ['enable'] : [...(quota || row.status === 'cooling_down' ? ['clear_cooldown' as const] : []), 'disable'],
    })
  }

  const gateway = gatewayResult.data || feedResult.data?.ai_engine
  for (const row of gateway?.geminiPool?.accounts || []) {
    const id = `gemini:${row.port}`
    if (accounts.some(account => account.id === id)) continue
    accounts.push({
      id, provider: 'GEMINI', label: row.name || `Gemini ${row.port}`, workerHost: asString(gateway?.host),
      health: row.isLoggedIn ? (row.isLimited ? 'DEGRADED' : 'HEALTHY') : 'OFFLINE',
      authState: row.isLoggedIn ? 'AUTHENTICATED' : 'AUTH_REQUIRED', capability: 'VIDEO',
      quotaState: row.isLimited ? 'QUOTA_EXHAUSTED' : 'AVAILABLE',
      browserState: !row.isLoggedIn ? 'AUTH_REQUIRED' : row.isLimited ? 'QUOTA_EXHAUSTED' : 'IDLE',
      currentJobId: asString(row.currentJobId), lastActivityAt: asDate(row.lastUsed), cooldownUntil: asDate(row.limitedUntil),
      lastError: asString(row.limitReason), enabled: true,
      actions: row.isLimited ? ['clear_cooldown'] : [],
    })
  }
  if (gateway?.chatgpt) {
    accounts.push({
      id: `chatgpt:${gateway.chatgpt.port || 'primary'}`, provider: 'CHATGPT',
      label: gateway.chatgpt.accountName || 'ChatGPT', workerHost: asString(gateway.host),
      health: gateway.chatgpt.status === 'online' ? 'HEALTHY' : 'DEGRADED',
      authState: gateway.chatgpt.status === 'online' ? 'AUTHENTICATED' : 'UNKNOWN',
      capability: 'AI_REPLY, IMAGE', quotaState: 'UNKNOWN',
      browserState: canonicalWorkerState(gateway.chatgpt.status), currentJobId: asString(gateway.chatgpt.currentJobId),
      lastActivityAt: asDate(gateway.chatgpt.lastActivity), cooldownUntil: null,
      lastError: asString(gateway.chatgpt.lastError), enabled: true, actions: [],
    } as OperationsAccount)
  }

  const workers: OperationsWorker[] = []
  const waWorker = feedResult.data?.worker
  if (waWorker) {
    const heartbeat = asDate(waWorker.seen_at)
    const alive = Boolean(heartbeat && Date.now() - new Date(heartbeat).getTime() < 90_000)
    workers.push({
      id: String(waWorker.worker_id), hostId: asString(waWorker.meta?.host) || 'whatsapp-host', kind: 'WHATSAPP',
      state: canonicalWorkerState(alive ? (waWorker.live > 0 ? 'BUSY' : 'IDLE') : 'OFFLINE', alive), online: alive,
      cpuPercent: null, memoryMb: asNumber(waWorker.meta?.memoryMb, NaN) || null,
      uptimeSeconds: asNumber(waWorker.meta?.uptimeSeconds, NaN) || null,
      activeJobs: asNumber(waWorker.live), queueAssignments: asNumber(waWorker.tracked), browserPid: null,
      browserCount: null, tabCount: null, assignedAccounts: feedAccounts.map(row => String(row.id)),
      currentJobId: null, lastHeartbeatAt: heartbeat, lastActivityAt: heartbeat, restartCount: 0,
      actions: ['restart'],
    })
  }
  for (const row of channelWorkerResult.rows) {
    const heartbeat = asDate(row.seen_at)
    const alive = Boolean(heartbeat && Date.now() - new Date(heartbeat).getTime() < 90_000)
    workers.push({
      id: String(row.worker_id), hostId: asString(row.meta?.host) || String(row.worker_id), kind: 'CHANNEL',
      state: canonicalWorkerState(alive ? (row.live > 0 ? 'BUSY' : 'IDLE') : 'OFFLINE', alive), online: alive,
      cpuPercent: asNumber(row.meta?.cpu_percent, NaN) || null, memoryMb: asNumber(row.meta?.memory_mb, NaN) || null,
      uptimeSeconds: asNumber(row.meta?.uptime_seconds, NaN) || null, activeJobs: asNumber(row.live),
      queueAssignments: asNumber(row.tracked), browserPid: null, browserCount: null, tabCount: null,
      assignedAccounts: [], currentJobId: asString(row.meta?.current_job_id), lastHeartbeatAt: heartbeat,
      lastActivityAt: heartbeat, restartCount: asNumber(row.meta?.restart_count), actions: [],
    })
  }
  for (const row of flowWorkerResult.rows) {
    const heartbeat = asDate(row.heartbeat_at)
    const alive = Boolean(heartbeat && Date.now() - new Date(heartbeat).getTime() < 90_000)
    workers.push({
      id: String(row.id), hostId: row.host || String(row.id), kind: 'MEDIA', state: canonicalWorkerState(row.status, alive), online: alive,
      cpuPercent: row.cpu_percent == null ? null : asNumber(row.cpu_percent),
      memoryMb: row.ram_bytes == null ? null : Math.round(asNumber(row.ram_bytes) / 1024 / 1024),
      uptimeSeconds: row.metadata?.uptime_seconds ?? null, activeJobs: row.active_job_id ? 1 : 0,
      queueAssignments: 0, browserPid: row.metadata?.browser_pid ?? null,
      browserCount: row.metadata?.browser_count ?? null, tabCount: row.metadata?.tab_count ?? null,
      assignedAccounts: row.metadata?.assigned_accounts || [], currentJobId: asString(row.active_job_id),
      lastHeartbeatAt: heartbeat, lastActivityAt: asDate(row.metadata?.last_activity_at || heartbeat),
      restartCount: asNumber(row.metadata?.restart_count), actions: row.active_job_id ? ['drain'] : ['drain', 'restart'],
    })
  }
  for (const account of accounts.filter(item => item.provider === 'GEMINI' || item.provider === 'CHATGPT')) {
    workers.push({
      id: `browser:${account.id}`, hostId: account.workerHost || 'omnistudio', kind: 'BROWSER',
      state: account.browserState, online: account.browserState !== 'OFFLINE', cpuPercent: null, memoryMb: null,
      uptimeSeconds: null, activeJobs: account.currentJobId ? 1 : 0, queueAssignments: 0,
      browserPid: null, browserCount: null, tabCount: null, assignedAccounts: [account.id],
      currentJobId: account.currentJobId, lastHeartbeatAt: account.lastActivityAt,
      lastActivityAt: account.lastActivityAt, restartCount: 0,
      actions: account.currentJobId ? ['drain'] : ['drain', 'restart_browser'],
    })
  }

  const activeJobs = jobs.filter(job => job.state === 'ACTIVE')
  const completedJobs = jobs.filter(job => job.state === 'COMPLETED')
  const failedJobs = jobs.filter(job => job.state === 'FAILED' || job.state === 'NEEDS_REVIEW')
  const botSpecs: Array<[string, OperationsBot['type'], ControlJobType[]]> = [
    ['whatsapp-bot', 'WHATSAPP', ['MESSAGE']], ['ai-reply-bot', 'AI_REPLY', ['AI_REPLY']],
    ['image-bot', 'IMAGE', ['IMAGE']], ['video-bot', 'VIDEO', ['VIDEO']],
    ['media-bot', 'MEDIA', ['MEDIA_PROCESS']],
  ]
  const bots: OperationsBot[] = botSpecs.map(([id, type, jobTypes]) => {
    const relevant = jobs.filter(job => jobTypes.includes(job.jobType))
    const completed = relevant.filter(job => job.state === 'COMPLETED')
    const failed = relevant.filter(job => job.state === 'FAILED' || job.state === 'NEEDS_REVIEW')
    const durations = completed.map(job => job.durationMs).filter((value): value is number => value != null)
    const last = relevant[0]
    const hasWorker = type === 'WHATSAPP'
      ? workers.some(worker => worker.kind === 'WHATSAPP' && worker.online)
      : type === 'VIDEO'
        ? workers.some(worker => worker.kind === 'MEDIA' || worker.kind === 'BROWSER')
        : true
    return {
      id, organization: 'Tüm organizasyonlar', type,
      state: !hasWorker ? 'STOPPED' : failed.length > 0 && failed[0] === last ? 'DEGRADED' : relevant.some(job => job.state === 'ACTIVE') ? 'RUNNING' : 'IDLE',
      activeJobs: relevant.filter(job => job.state === 'ACTIVE').length,
      messagesProcessed: type === 'WHATSAPP' ? messages.length : relevant.length,
      successCount: completed.length, failureCount: failed.length,
      averageLatencyMs: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : null,
      lastActivityAt: last?.completedAt || last?.startedAt || last?.createdAt || null,
      lastError: failed[0]?.errorMessage || null,
    }
  })

  const alerts: OperationsAlert[] = []
  const addAlert = (alert: Omit<OperationsAlert, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => {
    alerts.push({ id: alert.id || `${alert.code}:${alert.targetId || alerts.length}`, createdAt: alert.createdAt || nowIso(), ...alert })
  }
  for (const account of accounts) {
    if (account.authState === 'AUTH_REQUIRED') addAlert({ severity: 'critical', code: 'AUTH_REQUIRED', title: `${account.label} giriş bekliyor`, detail: 'Bakım oturumunda yeniden kimlik doğrulama gerekli.', targetType: 'account', targetId: account.id, requiresManualAction: true })
    if (account.quotaState === 'QUOTA_EXHAUSTED') addAlert({ severity: 'warning', code: 'ACCOUNT_NO_QUOTA', title: `${account.label} kotası tükendi`, detail: account.lastError || 'Cooldown bitene kadar scheduler bu hesabı seçmemeli.', targetType: 'account', targetId: account.id, requiresManualAction: false })
  }
  for (const worker of workers.filter(item => !item.online)) {
    addAlert({ severity: 'critical', code: 'WORKER_OFFLINE', title: `${worker.id} çevrimdışı`, detail: 'Heartbeat 90 saniyeden eski veya hiç alınmadı.', targetType: 'worker', targetId: worker.id, requiresManualAction: true, createdAt: worker.lastHeartbeatAt || nowIso() })
  }
  for (const worker of workers.filter(item => item.tabCount != null && item.tabCount > 2)) {
    addAlert({ severity: 'warning', code: 'EXCESSIVE_TAB_COUNT', title: `${worker.id} tab sınırını aştı`, detail: `${worker.tabCount} tab açık; hesap başına mutlak sınır 2 olmalı.`, targetType: 'worker', targetId: worker.id, requiresManualAction: true, createdAt: worker.lastActivityAt || nowIso() })
  }
  for (const job of failedJobs.slice(0, 12)) {
    addAlert({ severity: job.state === 'NEEDS_REVIEW' ? 'warning' : 'critical', code: 'JOB_FAILED', title: `${job.type} başarısız`, detail: job.errorMessage || 'İş hata ayrıntısı üretmedi.', targetType: 'job', targetId: job.id, requiresManualAction: job.state === 'NEEDS_REVIEW', createdAt: job.completedAt || job.createdAt })
  }
  const staleCutoff = Date.now() - 20 * 60_000
  for (const job of activeJobs.filter(item => new Date(item.startedAt || item.createdAt).getTime() < staleCutoff)) {
    addAlert({ severity: 'warning', code: 'STALE_JOB', title: `${job.type} uzun süredir aktif`, detail: '20 dakikadır terminal duruma geçmedi; worker ve provider kontrol edilmeli.', targetType: 'job', targetId: job.id, requiresManualAction: true, createdAt: job.startedAt || job.createdAt })
  }
  const queued = jobs.filter(job => job.state === 'QUEUED')
  if (queued.length >= 20) addAlert({ severity: 'warning', code: 'QUEUE_BACKLOG', title: `${queued.length} iş kuyrukta`, detail: 'Kuyruk eşiği 20 işi aştı.', targetType: 'queue', targetId: null, requiresManualAction: false })
  const recentFailures = failedJobs.filter(job => new Date(job.completedAt || job.createdAt).getTime() > Date.now() - 60 * 60_000)
  if (recentFailures.length >= 3) addAlert({ severity: 'critical', code: 'REPEATED_JOB_FAILURE', title: 'Tekrarlayan iş hataları', detail: `Son bir saatte ${recentFailures.length} iş başarısız veya inceleme gerekli durumuna geçti.`, targetType: 'system', targetId: null, requiresManualAction: true })
  if (!gatewayResult.ok) addAlert({ severity: 'warning', code: 'PROVIDER_UNAVAILABLE', title: 'OmniStudio telemetrisi alınamıyor', detail: 'Browser provider durumları doğrulanamadı; üretim başarısı varsayılmadı.', targetType: 'system', targetId: 'omnistudio', requiresManualAction: false })
  if (process.env.GFLOW_ENGINE_URL && !gflowHealthResult.ok) addAlert({ severity: 'warning', code: 'PROVIDER_UNAVAILABLE', title: 'GFlow worker telemetrisi alınamıyor', detail: 'Flow worker health endpoint yanıt vermedi.', targetType: 'system', targetId: 'gflow', requiresManualAction: false })
  for (const event of events.filter(item => ['CAPTCHA_REQUIRED', 'AUTH_REQUIRED'].includes(item.eventType)).slice(0, 10)) {
    addAlert({ severity: 'critical', code: event.eventType, title: event.eventType === 'CAPTCHA_REQUIRED' ? 'Manuel doğrulama gerekli' : 'Provider yeniden giriş bekliyor', detail: event.message, targetType: event.accountId ? 'account' : 'system', targetId: event.accountId, requiresManualAction: true, createdAt: event.createdAt })
  }

  events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return {
    generatedAt: nowIso(),
    overview: {
      workersOnline: workers.filter(worker => worker.online).length,
      workersTotal: workers.length,
      jobsActive: activeJobs.length,
      jobsQueued: queued.length,
      messagesProcessing: messages.filter(message => message.direction === 'in' && !['RESPONSE_SENT', 'FAILED'].includes(message.responseState)).length,
      botsRunning: bots.filter(bot => bot.state === 'RUNNING').length,
      healthyAccounts: accounts.filter(account => account.health === 'HEALTHY').length,
      accountsTotal: accounts.length,
      alerts: alerts.length,
    },
    jobs: jobs.slice(0, 300), messages, bots, accounts, workers,
    alerts: alerts.sort((a, b) => (a.severity === 'critical' ? -1 : b.severity === 'critical' ? 1 : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())),
    events: events.slice(0, 300),
    sourceHealth: {
      database: orgResult.ok && jobResult.ok ? 'ok' : 'degraded',
      message_feed: messageResult.ok ? 'ok' : 'unavailable',
      ai_media: mediaJobResult.ok ? 'ok' : 'unavailable',
      operations_events: opsEventResult.ok ? 'ok' : 'unavailable',
      omnistudio: gatewayResult.ok ? 'ok' : 'unavailable',
      gflow: gflowHealthResult.ok ? 'ok' : 'unavailable',
    },
  }
}

export async function recordOperatorEvent(event: {
  eventType: string
  jobId?: string | null
  orgId?: string | null
  accountId?: string | null
  workerId?: string | null
  provider?: string | null
  state?: string | null
  message: string
  errorCode?: string | null
  payload?: Record<string, unknown>
}) {
  const supabase = createSupabaseServiceClient()
  if (!supabase) return
  await supabase.from('operations_events').insert({
    event_type: event.eventType,
    job_id: event.jobId || null,
    org_id: event.orgId || null,
    account_id: event.accountId || null,
    worker_id: event.workerId || null,
    provider: event.provider || null,
    state: event.state || null,
    message: event.message,
    error_code: event.errorCode || null,
    payload: event.payload || {},
  })
}
