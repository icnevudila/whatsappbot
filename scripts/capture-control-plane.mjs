import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const origin = process.env.CONTROL_PLANE_URL || 'http://127.0.0.1:3003'
const outputDir = path.resolve('artifacts/control-plane')
fs.mkdirSync(outputDir, { recursive: true })

const pin = process.env.CANLI_TAKIP_PIN
const secret = process.env.SUPABASE_JWT_SECRET
if (!pin || !secret) throw new Error('CANLI_TAKIP_PIN and SUPABASE_JWT_SECRET are required for local visual QA')
const token = crypto.createHmac('sha256', secret).update(pin).digest('hex')
const now = new Date()
const iso = minutes => new Date(now.getTime() - minutes * 60_000).toISOString()

const events = [
  { id: 'e1', eventType: 'MESSAGE_RECEIVED', jobId: null, orgId: 'o1', organization: 'Demo İşletme', accountId: 'wa-01', workerId: 'wa-worker-01', botId: 'whatsapp-bot', provider: 'WHATSAPP', state: 'ACTIVE', phase: 'Mesaj alındı', message: 'Ürün ve teslimat bilgisi soruldu.', errorCode: null, createdAt: iso(0) },
  { id: 'e2', eventType: 'ACCOUNT_SELECTED', jobId: 'ai_media_jobs:video-01', orgId: 'o1', organization: 'Demo İşletme', accountId: 'gemini:9222', workerId: 'browser:gemini:9222', botId: 'video-bot', provider: 'GEMINI_NATIVE_VIDEO', state: 'ACTIVE', phase: 'Hesap seçildi', message: 'Gemini-01 video işi için ayrıldı.', errorCode: null, createdAt: iso(1) },
  { id: 'e3', eventType: 'JOB_COMPLETED', jobId: 'jobs:1842', orgId: 'o2', organization: 'Örnek Mağaza', accountId: 'wa-02', workerId: 'wa-worker-01', botId: 'whatsapp-bot', provider: 'WHATSAPP', state: 'COMPLETED', phase: 'Tamamlandı', message: 'Müşteri yanıtı teslim edildi.', errorCode: null, createdAt: iso(3) },
  { id: 'e4', eventType: 'ACCOUNT_NO_QUOTA', jobId: null, orgId: null, organization: null, accountId: 'gemini:9223', workerId: null, botId: null, provider: 'GEMINI', state: 'QUOTA_EXHAUSTED', phase: 'Cooldown', message: 'Gemini-02 kota yenilenmesini bekliyor.', errorCode: 'NO_QUOTA', createdAt: iso(5) },
]

const snapshot = {
  success: true,
  generatedAt: now.toISOString(),
  overview: { workersOnline: 4, workersTotal: 5, jobsActive: 3, jobsQueued: 7, messagesProcessing: 2, botsRunning: 3, healthyAccounts: 5, accountsTotal: 7, alerts: 3 },
  jobs: [
    { id: 'ai_media_jobs:video-01', source: 'ai_media_jobs', sourceId: 'video-01', orgId: 'o1', organization: 'Demo İşletme', customerId: null, conversationId: null, botId: 'video-bot', jobType: 'VIDEO', type: 'SIMPLE_V5_HYBRID', priority: 10, state: 'ACTIVE', workerId: 'browser:gemini:9222', provider: 'GEMINI_NATIVE_VIDEO', accountId: 'gemini:9222', attemptId: 'attempt-01', createdAt: iso(7), queuedAt: iso(7), startedAt: iso(4), completedAt: null, lastHeartbeatAt: iso(0), currentPhase: 'Üretiliyor', errorCode: null, errorMessage: null, durationMs: null, attemptCount: 1, maxAttempts: 3, summary: '9:16 ürün tanıtım videosu', timeline: events.filter(event => event.jobId === 'ai_media_jobs:video-01'), eligibleActions: [] },
    { id: 'jobs:1843', source: 'jobs', sourceId: '1843', orgId: 'o1', organization: 'Demo İşletme', customerId: 'customer-01', conversationId: '+90555•••', botId: 'ai-reply-bot', jobType: 'AI_REPLY', type: 'message.ai_reply', priority: 20, state: 'QUEUED', workerId: null, provider: null, accountId: 'wa-01', attemptId: null, createdAt: iso(2), queuedAt: iso(2), startedAt: null, completedAt: null, lastHeartbeatAt: null, currentPhase: 'Kuyrukta', errorCode: null, errorMessage: null, durationMs: null, attemptCount: 0, maxAttempts: 3, summary: 'Müşteri sorusuna yanıt hazırlanacak', timeline: [], eligibleActions: ['cancel'] },
    { id: 'channel_jobs:712', source: 'channel_jobs', sourceId: '712', orgId: 'o2', organization: 'Örnek Mağaza', customerId: null, conversationId: null, botId: 'whatsapp-bot', jobType: 'MESSAGE', type: 'channel.send', priority: 30, state: 'FAILED', workerId: 'channel-worker-02', provider: 'WHATSAPP', accountId: 'wa-02', attemptId: null, createdAt: iso(12), queuedAt: iso(12), startedAt: iso(11), completedAt: iso(10), lastHeartbeatAt: null, currentPhase: 'Başarısız', errorCode: 'DELIVERY_TIMEOUT', errorMessage: 'Teslimat sonucu kesinleşmedi; otomatik retry yapılmadı.', durationMs: 62000, attemptCount: 1, maxAttempts: 3, summary: 'Sipariş durum bildirimi', timeline: [], eligibleActions: ['retry'] },
  ],
  messages: [
    { id: 'm1', timestamp: iso(0), orgId: 'o1', organization: 'Demo İşletme', customer: 'Ayşe K.', conversationId: '+90555•••', preview: 'Merhaba, ürün bugün teslim edilebilir mi?', assignedBot: 'ai-reply-bot', processingState: 'Yanıt hazırlanıyor', provider: 'AI_REPLY', accountId: 'wa-01', responseState: 'PROCESSING', latencyMs: null, direction: 'in' },
    { id: 'm2', timestamp: iso(3), orgId: 'o2', organization: 'Örnek Mağaza', customer: 'Mehmet T.', conversationId: '+90532•••', preview: 'Siparişiniz kuryeye teslim edildi.', assignedBot: 'whatsapp-bot', processingState: 'Gönderildi', provider: 'WHATSAPP', accountId: 'wa-02', responseState: 'RESPONSE_SENT', latencyMs: 1840, direction: 'out' },
  ],
  bots: [
    { id: 'whatsapp-bot', organization: 'Tüm organizasyonlar', type: 'WHATSAPP', state: 'RUNNING', activeJobs: 1, messagesProcessed: 1284, successCount: 1261, failureCount: 3, averageLatencyMs: 1320, lastActivityAt: iso(0), lastError: null },
    { id: 'ai-reply-bot', organization: 'Tüm organizasyonlar', type: 'AI_REPLY', state: 'RUNNING', activeJobs: 1, messagesProcessed: 480, successCount: 471, failureCount: 2, averageLatencyMs: 2850, lastActivityAt: iso(0), lastError: null },
    { id: 'video-bot', organization: 'Tüm organizasyonlar', type: 'VIDEO', state: 'DEGRADED', activeJobs: 1, messagesProcessed: 41, successCount: 36, failureCount: 2, averageLatencyMs: 168000, lastActivityAt: iso(4), lastError: 'Gemini-02 quota exhausted' },
  ],
  accounts: [
    { id: 'gemini:9222', provider: 'GEMINI', label: 'Gemini-01', workerHost: 'media-host-01', health: 'HEALTHY', authState: 'AUTHENTICATED', capability: 'VIDEO', quotaState: 'AVAILABLE', browserState: 'BUSY', currentJobId: 'video-01', lastActivityAt: iso(0), cooldownUntil: null, lastError: null, enabled: true, actions: [] },
    { id: 'gemini:9223', provider: 'GEMINI', label: 'Gemini-02', workerHost: 'media-host-01', health: 'DEGRADED', authState: 'AUTHENTICATED', capability: 'VIDEO', quotaState: 'QUOTA_EXHAUSTED', browserState: 'QUOTA_EXHAUSTED', currentJobId: null, lastActivityAt: iso(5), cooldownUntil: new Date(now.getTime() + 90 * 60_000).toISOString(), lastError: 'Günlük kota tükendi', enabled: true, actions: ['clear_cooldown'] },
    { id: 'flow-01', provider: 'FLOW', label: 'Flow Ana Hesap', workerHost: 'flow-host-01', health: 'HEALTHY', authState: 'AUTHENTICATED', capability: 'VIDEO', quotaState: 'AVAILABLE', browserState: 'IDLE', currentJobId: null, lastActivityAt: iso(8), cooldownUntil: null, lastError: null, enabled: true, actions: ['disable'] },
    { id: 'chatgpt:primary', provider: 'CHATGPT', label: 'ChatGPT Plus', workerHost: 'media-host-01', health: 'HEALTHY', authState: 'AUTHENTICATED', capability: 'AI_REPLY, IMAGE', quotaState: 'UNKNOWN', browserState: 'IDLE', currentJobId: null, lastActivityAt: iso(12), cooldownUntil: null, lastError: null, enabled: true, actions: [] },
    { id: 'wa-01', provider: 'WHATSAPP', label: 'Satış Hattı', workerHost: 'wa-host-01', health: 'HEALTHY', authState: 'AUTHENTICATED', capability: 'MESSAGING', quotaState: 'UNKNOWN', browserState: 'IDLE', currentJobId: null, lastActivityAt: iso(0), cooldownUntil: null, lastError: null, enabled: true, actions: [] },
  ],
  workers: [
    { id: 'wa-worker-01', hostId: 'wa-host-01', kind: 'WHATSAPP', state: 'BUSY', online: true, cpuPercent: 18, memoryMb: 412, uptimeSeconds: 86400, activeJobs: 1, queueAssignments: 4, browserPid: null, browserCount: null, tabCount: null, assignedAccounts: ['wa-01'], currentJobId: 'jobs:1843', lastHeartbeatAt: iso(0), lastActivityAt: iso(0), restartCount: 0, actions: ['restart'] },
    { id: 'browser:gemini:9222', hostId: 'media-host-01', kind: 'BROWSER', state: 'BUSY', online: true, cpuPercent: 32, memoryMb: 690, uptimeSeconds: 980, activeJobs: 1, queueAssignments: 0, browserPid: 2214, browserCount: 1, tabCount: 1, assignedAccounts: ['gemini:9222'], currentJobId: 'video-01', lastHeartbeatAt: iso(0), lastActivityAt: iso(0), restartCount: 1, actions: ['drain'] },
    { id: 'browser:gemini:9223', hostId: 'media-host-01', kind: 'BROWSER', state: 'QUOTA_EXHAUSTED', online: true, cpuPercent: 0, memoryMb: 0, uptimeSeconds: null, activeJobs: 0, queueAssignments: 0, browserPid: null, browserCount: 0, tabCount: 0, assignedAccounts: ['gemini:9223'], currentJobId: null, lastHeartbeatAt: iso(5), lastActivityAt: iso(5), restartCount: 0, actions: ['restart_browser'] },
  ],
  alerts: [
    { id: 'a1', severity: 'critical', code: 'WORKER_OFFLINE', title: 'channel-worker-03 çevrimdışı', detail: 'Heartbeat 90 saniyeden eski.', targetType: 'worker', targetId: 'channel-worker-03', createdAt: iso(2), requiresManualAction: true },
    { id: 'a2', severity: 'warning', code: 'ACCOUNT_NO_QUOTA', title: 'Gemini-02 kotası tükendi', detail: 'Scheduler hesabı cooldown süresince seçmeyecek.', targetType: 'account', targetId: 'gemini:9223', createdAt: iso(5), requiresManualAction: false },
    { id: 'a3', severity: 'warning', code: 'JOB_FAILED', title: 'Sipariş durum bildirimi başarısız', detail: 'Teslimat sonucu belirsiz; operatör kararı gerekiyor.', targetType: 'job', targetId: 'channel_jobs:712', createdAt: iso(10), requiresManualAction: true },
  ],
  events,
  sourceHealth: { database: 'ok', message_feed: 'ok', ai_media: 'ok', operations_events: 'ok', omnistudio: 'ok', gflow: 'ok' },
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
})
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
  await context.addCookies([{ name: 'canli_takip_token', value: token, url: origin, httpOnly: true, sameSite: 'Lax' }])
  const page = await context.newPage()
  await page.route('**/api/canli-takip/control-plane', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(snapshot) }))
  await page.route('**/api/canli-takip/control-plane/events', route => route.fulfill({ status: 200, contentType: 'text/event-stream', body: '' }))
  await page.goto(`${origin}/canli-takip`, { waitUntil: 'networkidle' })
  await page.screenshot({ path: path.join(outputDir, 'overview-desktop.png'), fullPage: true })

  await page.setViewportSize({ width: 1024, height: 1366 })
  await page.goto(`${origin}/canli-takip/hesaplar`, { waitUntil: 'networkidle' })
  await page.screenshot({ path: path.join(outputDir, 'accounts-tablet.png'), fullPage: true })
} finally {
  await browser.close()
}

console.log(outputDir)
