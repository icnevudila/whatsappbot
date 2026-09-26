export type OperationsSection =
  | 'overview'
  | 'jobs'
  | 'messages'
  | 'bots'
  | 'accounts'
  | 'workers'
  | 'alerts'

export type ControlJobType =
  | 'MESSAGE'
  | 'AI_REPLY'
  | 'IMAGE'
  | 'VIDEO'
  | 'MEDIA_PROCESS'
  | 'BACKGROUND_TASK'

export type ControlJobState =
  | 'QUEUED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'NEEDS_REVIEW'

export type WorkerState =
  | 'OFFLINE'
  | 'STARTING'
  | 'IDLE'
  | 'BUSY'
  | 'COOLDOWN'
  | 'AUTH_REQUIRED'
  | 'QUOTA_EXHAUSTED'
  | 'UNHEALTHY'

export type OperationsEvent = {
  id: string
  eventType: string
  jobId: string | null
  orgId: string | null
  organization: string | null
  accountId: string | null
  workerId: string | null
  botId: string | null
  provider: string | null
  state: string | null
  phase: string | null
  message: string
  errorCode: string | null
  createdAt: string
}

export type OperationsJob = {
  id: string
  source: 'jobs' | 'channel_jobs' | 'creatives' | 'ai_media_jobs'
  sourceId: string
  orgId: string | null
  organization: string
  customerId: string | null
  conversationId: string | null
  botId: string | null
  jobType: ControlJobType
  type: string
  priority: number
  state: ControlJobState
  workerId: string | null
  provider: string | null
  accountId: string | null
  attemptId: string | null
  createdAt: string
  queuedAt: string | null
  startedAt: string | null
  completedAt: string | null
  lastHeartbeatAt: string | null
  currentPhase: string
  errorCode: string | null
  errorMessage: string | null
  durationMs: number | null
  attemptCount: number
  maxAttempts: number
  summary: string
  timeline: OperationsEvent[]
  eligibleActions: Array<'retry' | 'cancel'>
}

export type OperationsAccount = {
  id: string
  provider: 'WHATSAPP' | 'GEMINI' | 'FLOW' | 'CHATGPT'
  label: string
  workerHost: string | null
  health: 'HEALTHY' | 'DEGRADED' | 'OFFLINE' | 'UNKNOWN'
  authState: 'AUTHENTICATED' | 'AUTH_REQUIRED' | 'UNKNOWN'
  capability: string
  quotaState: 'AVAILABLE' | 'QUOTA_EXHAUSTED' | 'UNKNOWN'
  browserState: WorkerState
  currentJobId: string | null
  lastActivityAt: string | null
  cooldownUntil: string | null
  lastError: string | null
  enabled: boolean
  actions: Array<'enable' | 'disable' | 'clear_cooldown'>
  creditBalance?: number | null
  creditsUsedToday?: number | null
  totalCompletedVideos?: number
  planTier?: string
}

export type OperationsWorker = {
  id: string
  hostId: string
  kind: 'WHATSAPP' | 'CHANNEL' | 'MEDIA' | 'BROWSER'
  state: WorkerState
  online: boolean
  cpuPercent: number | null
  memoryMb: number | null
  uptimeSeconds: number | null
  activeJobs: number
  queueAssignments: number
  browserPid: number | null
  browserCount: number | null
  tabCount: number | null
  cdpPort?: number | null
  profile?: string | null
  activePhase?: string | null
  assignedAccounts: string[]
  currentJobId: string | null
  lastHeartbeatAt: string | null
  lastActivityAt: string | null
  restartCount: number
  actions: Array<'restart' | 'drain' | 'restart_browser'>
}

export type OperationsBot = {
  id: string
  organization: string
  type: 'WHATSAPP' | 'AI_REPLY' | 'IMAGE' | 'VIDEO' | 'MEDIA'
  state: 'RUNNING' | 'IDLE' | 'DEGRADED' | 'STOPPED'
  activeJobs: number
  messagesProcessed: number
  successCount: number
  failureCount: number
  averageLatencyMs: number | null
  lastActivityAt: string | null
  lastError: string | null
}

export type OperationsMessage = {
  id: string
  timestamp: string
  orgId: string | null
  organization: string
  customer: string
  conversationId: string
  preview: string
  assignedBot: string
  processingState: string
  provider: string | null
  accountId: string | null
  responseState: string
  latencyMs: number | null
  direction: 'in' | 'out'
}

export type OperationsAlert = {
  id: string
  severity: 'critical' | 'warning' | 'info'
  code: string
  title: string
  detail: string
  targetType: 'job' | 'worker' | 'account' | 'queue' | 'system'
  targetId: string | null
  createdAt: string
  requiresManualAction: boolean
}

export type ControlPlaneSnapshot = {
  generatedAt: string
  overview: {
    workersOnline: number
    workersTotal: number
    jobsActive: number
    jobsQueued: number
    messagesProcessing: number
    botsRunning: number
    healthyAccounts: number
    accountsTotal: number
    alerts: number
  }
  jobs: OperationsJob[]
  messages: OperationsMessage[]
  bots: OperationsBot[]
  accounts: OperationsAccount[]
  workers: OperationsWorker[]
  alerts: OperationsAlert[]
  events: OperationsEvent[]
  sourceHealth: Record<string, 'ok' | 'degraded' | 'unavailable'>
}
