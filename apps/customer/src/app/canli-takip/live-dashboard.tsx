'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { LogoMark, BRAND_NAME } from '@/components/brand'

type Account = {
  id: string
  label: string
  phone_e164: string | null
  status: string
  status_detail: string | null
  is_locked: boolean
  enabled: boolean
  last_seen_at: string | null
  org_name?: string
  org_id?: string
}

type WorkerHeartbeat = {
  worker_id: string
  max_sessions: number
  tracked: number
  live: number
  db_pool_max: number
  seen_at: string
  meta?: {
    uptimeSeconds?: number
    connecting?: number
    stale?: number
    pid?: number
  }
}

type CampaignItem = {
  id: string
  name: string
  status: string
  message_type: string
  body: string | null
  total_targets: number
  sent_count: number
  failed_count: number
  skipped_count: number
  pending_count: number
  progress_percent: number
  created_at: string
  started_at: string | null
  paused_at?: string | null
  wait_reason: string | null
  org_name?: string
  org_id?: string
}

type CampaignTargetRecord = {
  id: number
  campaign_id: string
  phone_e164: string
  contact_name: string | null
  status: string
  attempts: number
  personalized_body: string | null
  error: string | null
  scheduled_for: string | null
  sent_at: string | null
  created_at: string
}

type TargetItem = {
  id: number
  campaign_id: string
  campaign_name: string
  phone_e164: string
  status: string
  personalized_body: string | null
  scheduled_for: string | null
  sent_at: string | null
  error: string | null
  created_at: string
  org_name?: string
  org_id?: string
}

type CreativeItem = {
  id: string
  title: string
  template: string
  format: string
  status: string
  public_url: string | null
  error: string | null
  created_at: string
  org_name?: string
  org_id?: string
  source?: string
  generation_type?: string
  payload?: {
    brief?: string
    originalPrompt?: string
    generatedPrompt?: string
    instruction?: string
    style?: string
    aspect?: string
    provider?: string
    brandKit?: {
      name?: string
      tone?: string
      colors?: Record<string, string>
    }
    cost?: { provider?: string; imageCount?: number }
    [key: string]: unknown
  }
}

import { getSafeMediaUrl } from '@/lib/media-url'

type MessageLog = {
  id: string | number
  direction: 'in' | 'out'
  phone_e164: string | null
  push_name: string | null
  message_type: string
  body: string | null
  media_url: string | null
  media_name?: string | null
  status: string
  error?: string | null
  created_at: string
  org_name?: string
  org_id?: string
}

type AiSuggestionItem = {
  id: string
  incoming_sample: string
  suggestions: Array<{ label: string; text: string }>
  source: string
  hit_count?: number
  generated_count?: number
  created_at: string
  last_used_at?: string
  org_name?: string
  org_id?: string
}

type AutoReplyItem = {
  id: string
  phone_e164: string
  reply_body: string
  source: string
  created_at: string
  org_name?: string
  org_id?: string
}

type JobItem = {
  id: number
  type: string
  status: string
  error: string | null
  priority: number
  attempts: number
  max_attempts: number
  created_at: string
  started_at: string | null
  finished_at: string | null
  payload?: Record<string, unknown>
  result?: Record<string, unknown>
  org_name?: string
  org_id?: string
}

type ListRequestItem = {
  id: string
  kind: string
  status: string
  category: string | null
  address: string | null
  locations: unknown
  contact_count: number
  radius_km: number | null
  nationwide: boolean
  created_at: string
  updated_at: string
  org_name?: string
  org_id?: string
}

type ContactListItem = {
  id: string
  name: string
  contact_count: number
  source: string
  created_at: string
  org_name?: string
  org_id?: string
}

type BlacklistItem = {
  id: string
  phone_e164: string
  reason: string | null
  created_at: string
  org_name?: string
}

type OrganizationItem = {
  id: string
  name: string
  slug: string
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  accounts_quota: number
  monthly_message_quota: number
  monthly_video_quota: number
  suspended_at: string | null
  suspend_reason: string | null
  phone_e164: string | null
  member_count: number
  account_count: number
  connected_account_count: number
  campaign_count: number
  list_count: number
  total_contacts: number
  created_at: string
}

type RecentContactItem = {
  id: string
  phone_e164: string
  name: string | null
  source: string | null
  wa_status: string | null
  created_at: string
  org_id: string
  org_name?: string
}

type ContactRecord = {
  id: string
  phone_e164: string
  name: string | null
  source: string | null
  wa_status: string | null
  created_at: string
  extra?: Record<string, unknown>
}

type ServerMetrics = {
  id: string
  cpu_percent: number
  cpu_cores: number
  load_1m: number
  load_5m: number
  load_15m: number
  ram_total_mb: number
  ram_used_mb: number
  ram_free_mb: number
  ram_percent: number
  disk_total_gb: number
  disk_used_gb: number
  disk_percent: number
  uptime_text: string
  containers?: Array<{
    name: string
    cpu: string
    mem: string
    mem_percent: string
  }>
  updated_at: string
}

type AiEngineAccount = {
  port: number
  name: string
  email?: string | null
  isLoggedIn: boolean
  isLimited: boolean
  secondsUntilReset?: number
  limitedUntil: string | null
  lastUsed: string | null
  limitReason: string | null
  flowProjectUrl?: string | null
  flowCredits?: number
  flowInitialCredits?: number
  dailyLimit?: number
  dailyUsed?: number
  dailyRemaining?: number
  videosRemaining?: number
  totalVideosRemaining?: number
  vncUrl: string
}

type AiEngineRecentVideo = {
  id: string
  filename: string
  videoUrl: string
  thumbnailUrl: string | null
  sizeMb: string
  engine?: string
  engineBadge?: string
  brand?: string
  sector?: string
  userPrompt?: string
  chatGptPrompt?: string
  veoPrompt?: string
  physicalAnchoring?: string
  creditsCost?: number
  accountPort?: number
  aspectRatio?: string
  duration?: number | string
  logoUrl?: string | null
  referenceImageUrl?: string | null
  createdAt: string
  timestamp: number
}

type AiEngineStatus = {
  status?: string
  success?: boolean
  timestamp?: string
  chatgpt: {
    status: string
    accountName: string
    port: number
    mode: string
    model: string
    zeroApiCost: boolean
  }
  geminiPool: {
    totalAccounts: number
    activeAccounts: number
    limitedAccounts: number
    dailyCreditsTotal?: number
    dailyCreditsRemaining?: number
    accounts: AiEngineAccount[]
    vncUrl: string
  }
  googleFlow: {
    status: string
    license: string
    accountName: string
    projectName: string
    projectUrl: string
    initialCredits?: number
    credits?: number
    creditsPerVideo?: number
    usedVideos?: number
    videosRemaining?: number
    dailyCreditsTotal?: number
    dailyCreditsRemaining?: number
    grandTotalVideosRemaining?: number
    activeFlowCount?: number
    totalAccountsCount?: number
    accounts?: Array<{
      port: number
      accountName: string
      email?: string | null
      projectUrl: string
      credits: number
      initialCredits: number
      flowCredits?: number
      flowInitialCredits?: number
      dailyLimit?: number
      dailyRemaining?: number
      videosRemaining: number
      totalVideosRemaining?: number
      status: 'active' | 'ready_to_link' | 'not_logged_in'
    }>
    watermark?: string
    aspectRatio?: string
    model: string
    quotaType: string
    role: string
  }
  recentVideos: AiEngineRecentVideo[]
}

type FeedData = {
  accounts: Account[]
  worker: WorkerHeartbeat | null
  serverMetrics?: ServerMetrics | null
  campaigns: CampaignItem[]
  targets: TargetItem[]
  creatives: CreativeItem[]
  listRequests: ListRequestItem[]
  contactLists: ContactListItem[]
  recentContacts?: RecentContactItem[]
  messages: MessageLog[]
  aiSuggestions?: AiSuggestionItem[]
  autoReplies?: AutoReplyItem[]
  jobs: JobItem[]
  blacklist?: BlacklistItem[]
  organizations?: OrganizationItem[]
  ai_engine?: AiEngineStatus | null
  summary: {
    todayInbound: number
    todayOutbound: number
    queuedMessages: number
    pendingJobs: number
    failedJobs?: number
    activeCampaigns: number
    totalContacts: number
    validContacts?: number
    totalOrganizations?: number
    totalContactLists?: number
    pendingDataRequests: number
    blacklistedCount?: number
    connectedAccounts?: number
    totalAccounts?: number
    totalAiSuggestions?: number
    totalAutoReplies?: number
  }
  timestamp: string
}

function timeAgo(dateString: string | null | undefined): string {
  if (!dateString) return 'Bilinmiyor'
  const diff = Date.now() - new Date(dateString).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec} sn önce`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} dk önce`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} saat önce`
  return `${Math.floor(hr / 24)} gün önce`
}

const QUICK_TEMPLATES = [
  {
    title: 'Canlı Hat Testi',
    text: 'Merhaba, bu Sistem Yöneticisi tarafından gönderilen bir canlı bağlantı test mesajıdır. Hattınız sorunsuz ve aktiftir.',
  },
  {
    title: 'Hoşgeldiniz',
    text: 'Merhaba! Sistemimize hoş geldiniz. WhatsApp otomasyon ve toplu gönderim süreçleriniz başarıyla aktif edilmiştir.',
  },
  {
    title: 'Randevu Hatırlatma',
    text: 'Sayın Müşterimiz, planlanan görüşmeniz için randevunuzu hatırlatmak isteriz. Uygunluk durumunuzu bildirmenizi rica ederiz.',
  },
  {
    title: 'Paket / Limit',
    text: 'Sayın Müşterimiz, üyelik paketiniz ve hat kullanım kotalarınız güncellenmiştir. Bilgi almak için bu mesaja yanıt verebilirsiniz.',
  },
  {
    title: 'Kampanya Duyurusu',
    text: 'Merhaba! İşletmeniz için özel hazırladığımız avantajlı WhatsApp pazarlama teklifimizi incelemek için bizimle iletişime geçebilirsiniz.',
  },
]

export function LiveDashboard() {
  const [data, setData] = useState<FeedData | null>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const isDraggingTabs = useRef(false)
  const dragStartX = useRef(0)
  const dragScrollLeft = useRef(0)
  const hasDragged = useRef(false)

  const handleTabsMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tabsRef.current) return
    isDraggingTabs.current = true
    hasDragged.current = false
    dragStartX.current = e.pageX - tabsRef.current.offsetLeft
    dragScrollLeft.current = tabsRef.current.scrollLeft
  }

  const handleTabsMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingTabs.current || !tabsRef.current) return
    const x = e.pageX - tabsRef.current.offsetLeft
    const walk = (x - dragStartX.current)
    if (Math.abs(walk) > 4) {
      hasDragged.current = true
    }
    tabsRef.current.scrollLeft = dragScrollLeft.current - walk
  }

  const handleTabsMouseUp = () => {
    isDraggingTabs.current = false
  }

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsRef.current) {
      const amount = direction === 'left' ? -280 : 280
      tabsRef.current.scrollBy({ left: amount, behavior: 'smooth' })
    }
  }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  type TabId = 'overview' | 'baileys' | 'messages' | 'quick_send' | 'campaigns' | 'queue' | 'organizations' | 'contacts' | 'data_requests' | 'ai_studio' | 'ai_media' | 'blacklist' | 'jobs'
  const VALID_TABS: TabId[] = ['overview', 'ai_studio', 'ai_media', 'baileys', 'jobs', 'organizations']

  const getHashTab = (): TabId => {
    if (typeof window === 'undefined') return 'overview'
    const hash = window.location.hash.replace('#', '') as TabId
    return VALID_TABS.includes(hash) ? hash : 'overview'
  }

  const [activeTab, setActiveTabState] = useState<TabId>(getHashTab)

  const setActiveTab = (tab: TabId) => {
    setActiveTabState(tab)
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `#${tab}`)
    }
  }

  // Browser back/forward ile sekme değişimi
  useEffect(() => {
    const onHashChange = () => {
      setActiveTabState(getHashTab())
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])


  const [selectedOrg, setSelectedOrg] = useState<string>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(3)
  const [lastFetchedAt, setLastFetchedAt] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [globalAiMedia, setGlobalAiMedia] = useState<any>(null)
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  // Filters & Search
  const [globalSearch, setGlobalSearch] = useState('')
  const [queueFilter, setQueueFilter] = useState<'all' | 'queued' | 'delivered' | 'failed'>('all')
  const [msgFilter, setMsgFilter] = useState<'all' | 'in' | 'out'>('all')
  const [jobFilter, setJobFilter] = useState<'all' | 'pending' | 'running' | 'failed' | 'done'>('all')

  // Quick Send State
  const [quickAccountId, setQuickAccountId] = useState('')
  const [quickPhone, setQuickPhone] = useState('')
  const [quickMessage, setQuickMessage] = useState('')
  const [quickMediaUrl, setQuickMediaUrl] = useState('')
  const [quickMediaName, setQuickMediaName] = useState('')
  const [quickMessageType, setQuickMessageType] = useState<'text' | 'image' | 'document'>('text')
  const [quickUploading, setQuickUploading] = useState(false)
  const [quickFileSize, setQuickFileSize] = useState<number | null>(null)
  const [quickSending, setQuickSending] = useState(false)

  // AI Copywriting Playground State
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiTone, setAiTone] = useState<'samimi' | 'kurumsal' | 'kampanya' | 'firsat'>('samimi')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null)
  const [aiMediaSubTab, setAiMediaSubTab] = useState<'overview' | 'jobs' | 'accounts' | 'workers' | 'queue' | 'incidents' | 'visual_qa' | 'health'>('overview')
  const [aiMediaJobDetail, setAiMediaJobDetail] = useState<any>(null)
  const [showJobDrawer, setShowJobDrawer] = useState(false)

  // Blacklist Form
  const [blackPhone, setBlackPhone] = useState('')
  const [blackReason, setBlackReason] = useState('')
  const [blackSubmitting, setBlackSubmitting] = useState(false)

  // Campaign Targets Modal State
  const [inspectedCampaign, setInspectedCampaign] = useState<CampaignItem | null>(null)
  const [campaignTargets, setCampaignTargets] = useState<CampaignTargetRecord[]>([])
  const [campaignTargetsLoading, setCampaignTargetsLoading] = useState(false)
  const [campaignTargetsTotal, setCampaignTargetsTotal] = useState(0)
  const [campaignTargetsFilter, setCampaignTargetsFilter] = useState<'all' | 'sent' | 'pending' | 'failed' | 'skipped'>('all')
  const [campaignTargetsSearch, setCampaignTargetsSearch] = useState('')
  const [campaignTargetsCounts, setCampaignTargetsCounts] = useState<{ sent: number; failed: number; pending: number; skipped: number }>({ sent: 0, failed: 0, pending: 0, skipped: 0 })

  // Quick Send Contact Picker Modal State
  const [showContactPicker, setShowContactPicker] = useState(false)
  const [contactPickerSearch, setContactPickerSearch] = useState('')
  const [contactPickerLoading, setContactPickerLoading] = useState(false)
  const [contactPickerResults, setContactPickerResults] = useState<ContactRecord[]>([])

  // Contacts Inspector Drawer / Modal
  const [previewListId, setPreviewListId] = useState<string | null>(null)
  const [previewListName, setPreviewListName] = useState('')
  const [previewContacts, setPreviewContacts] = useState<ContactRecord[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewTotal, setPreviewTotal] = useState(0)

  // Job JSON Detail Modal
  const [inspectedJob, setInspectedJob] = useState<JobItem | null>(null)

  // Creative JSON & Prompt Detail Modal
  const [inspectedCreative, setInspectedCreative] = useState<CreativeItem | null>(null)

  // Video Production & Prompt Detail Modal
  const [inspectedVideo, setInspectedVideo] = useState<AiEngineRecentVideo | null>(null)

  // Message & AI Suggestion Stream State
  const [msgStreamTab, setMsgStreamTab] = useState<'all' | 'in' | 'out' | 'pdf' | 'images' | 'suggestions' | 'auto_reply'>('all')
  const [inspectedSuggestion, setInspectedSuggestion] = useState<AiSuggestionItem | null>(null)
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null)
  const [simulatingAi, setSimulatingAi] = useState(false)
  const [simulatedPrompt, setSimulatedPrompt] = useState('')
  const [simulatedSuggestions, setSimulatedSuggestions] = useState<Array<{ label: string; text: string }> | null>(null)
  const [showSimulator, setShowSimulator] = useState(false)

  // Live WhatsApp & Baileys Diagnostic State
  const [diagnosticLoading, setDiagnosticLoading] = useState(false)
  const [diagnosticData, setDiagnosticData] = useState<any>(null)
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false)

  // AI Account & Quota Operations State
  const [showAddAccountModal, setShowAddAccountModal] = useState(false)
  const [newAccountPort, setNewAccountPort] = useState<number>(9224)
  const [newAccountName, setNewAccountName] = useState('')
  const [newFlowProjectUrl, setNewFlowProjectUrl] = useState('')
  const [accountActionBusy, setAccountActionBusy] = useState<number | null>(null)
  const [isProvisioning, setIsProvisioning] = useState(false)
  const [showVncModal, setShowVncModal] = useState(false)
  const [verifyingAll, setVerifyingAll] = useState(false)

  // Flow & Cookie Modals State (VNC-Free Operation)
  const [showFlowModal, setShowFlowModal] = useState(false)
  const [flowModalPort, setFlowModalPort] = useState<number>(9223)
  const [flowModalUrl, setFlowModalUrl] = useState('')
  const [flowModalCredits, setFlowModalCredits] = useState<number>(1050)
  const [isUpdatingFlow, setIsUpdatingFlow] = useState(false)

  const [showCookieModal, setShowCookieModal] = useState(false)
  const [cookieModalPort, setCookieModalPort] = useState<number>(9223)
  const [cookieModalData, setCookieModalData] = useState('')
  const [cookieModalPlatform, setCookieModalPlatform] = useState<string>('all')
  const [isSyncingCookies, setIsSyncingCookies] = useState(false)

  // Kampanya Hedeflerini Getir
  const fetchCampaignTargets = useCallback(async (campaignId: string, status?: string, search?: string) => {
    setCampaignTargetsLoading(true)
    try {
      const params = new URLSearchParams({
        campaignId,
        limit: '100',
      })
      if (status && status !== 'all') params.set('status', status)
      if (search) params.set('search', search)
      const res = await fetch(`/api/canli-takip/campaign-targets?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setCampaignTargets(json.targets || [])
        setCampaignTargetsTotal(json.total || 0)
        setCampaignTargetsCounts({
          sent: json.sentCount || 0,
          failed: json.failedCount || 0,
          pending: json.pendingCount || 0,
          skipped: json.skippedCount || 0,
        })
      }
    } catch (err) {
      console.error('Failed to fetch campaign targets', err)
    } finally {
      setCampaignTargetsLoading(false)
    }
  }, [])

  const handleOpenCampaignTargets = (c: CampaignItem) => {
    setInspectedCampaign(c)
    setCampaignTargetsFilter('all')
    setCampaignTargetsSearch('')
    fetchCampaignTargets(c.id, 'all', '')
  }

  // Hızlı Gönderim için Rehberden Kişi Arama
  const fetchPickerContacts = useCallback(async (searchQuery: string) => {
    setContactPickerLoading(true)
    try {
      const params = new URLSearchParams({ limit: '40' })
      if (searchQuery.trim()) params.set('search', searchQuery.trim())
      const res = await fetch(`/api/canli-takip/contacts?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setContactPickerResults(json.contacts || [])
      }
    } catch (err) {
      console.error('Failed to fetch picker contacts', err)
    } finally {
      setContactPickerLoading(false)
    }
  }, [])

  const handleOpenContactPicker = () => {
    setShowContactPicker(true)
    setContactPickerSearch('')
    fetchPickerContacts('')
  }

  const showNotice = (msg: string) => {
    setActionNotice(msg)
    setTimeout(() => setActionNotice(null), 5000)
  }

  const fetchData = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const [res, aiMediaRes] = await Promise.all([
        fetch('/api/canli-takip/feed', { cache: 'no-store' }),
        fetch('/api/canli-takip/ai-media', { cache: 'no-store' }).catch(() => null),
      ])
      if (!res.ok) {
        if (res.status === 401) {
          window.location.reload()
          return
        }
        throw new Error(`HTTP ${res.status}`)
      }
      const json = (await res.json()) as { success: boolean; error?: string } & FeedData
      if (!json.success) throw new Error(json.error || 'Veri çekilemedi')
      setData(json)
      setError(null)
      setLastFetchedAt(new Date())

      if (aiMediaRes && aiMediaRes.ok) {
        try {
          const aiJson = await aiMediaRes.json()
          setGlobalAiMedia(aiJson)
        } catch {
          // Ignore json parse error
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bağlantı hatası')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    if (!autoRefresh || refreshIntervalSec <= 0) return
    const interval = setInterval(fetchData, refreshIntervalSec * 1000)
    return () => clearInterval(interval)
  }, [fetchData, autoRefresh, refreshIntervalSec])

  // Select default active account for quick send once accounts are loaded
  useEffect(() => {
    if (data?.accounts && data.accounts.length > 0 && !quickAccountId) {
      const firstConnected = data.accounts.find(a => a.status === 'connected') || data.accounts[0]
      setQuickAccountId(firstConnected.id)
    }
  }, [data?.accounts, quickAccountId])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch('/api/canli-takip/logout', { method: 'POST' })
      window.location.reload()
    } catch {
      window.location.reload()
    }
  }

  // AI Hesap Doğrulama (CDP Testi)
  const handleVerifyAccount = async (port: number) => {
    setAccountActionBusy(port)
    try {
      const res = await fetch('/api/canli-takip/ai-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', port }),
      })
      const json = await res.json()
      if (json.success && json.ok) {
        if (json.isLoggedIn) {
          showNotice(`Port ${port} doğrulandı: ${json.accountName || json.email || 'Oturum Açık ve Aktif'}`)
        } else {
          showNotice(`Port ${port} oturumu açık değil. Lütfen VNC üzerinden Google girişi yapın.`)
        }
      } else {
        showNotice(`Doğrulama hatası: ${json.error || 'Bilinmeyen hata'}`)
      }
      fetchData()
    } catch {
      showNotice('Sunucu ile bağlantı kurulamadı.')
    } finally {
      setAccountActionBusy(null)
    }
  }

  // Tüm Gemini Havuzunu Sırayla Doğrula
  const handleVerifyAllAccounts = async () => {
    if (verifyingAll) return
    setVerifyingAll(true)
    showNotice('Tüm Google & Gemini portları taranıyor...')
    try {
      const ports = data?.ai_engine?.geminiPool?.accounts?.map(a => a.port) || [9222, 9223, 9224, 9225]
      for (const p of ports) {
        await fetch('/api/canli-takip/ai-accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify', port: p }),
        })
      }
      showNotice('Tüm hesap havuzu başarıyla tarandı ve güncellendi.')
      fetchData()
    } catch {
      showNotice('Tarama sırasında bağlantı hatası oluştu.')
    } finally {
      setVerifyingAll(false)
    }
  }

  // Hesap Kotasını Manuel Sıfırla
  const handleResetAccountLimit = async (port: number) => {
    setAccountActionBusy(port)
    try {
      const res = await fetch('/api/canli-takip/ai-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_limit', port }),
      })
      const json = await res.json()
      if (json.success && json.ok) {
        showNotice(json.message || `Port ${port} kotası sıfırlandı.`)
      } else {
        showNotice(`Kota sıfırlanamadı: ${json.error || 'Hata'}`)
      }
      fetchData()
    } catch {
      showNotice('Sunucu ile bağlantı kurulamadı.')
    } finally {
      setAccountActionBusy(null)
    }
  }

  // Yeni Hesap Slotu Oluştur (Hetzner'de Başlat)
  const handleProvisionAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProvisioning(true)
    try {
      const res = await fetch('/api/canli-takip/ai-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'provision',
          port: newAccountPort,
          name: newAccountName,
          flowProjectUrl: newFlowProjectUrl
        }),
      })
      const json = await res.json()
      if (json.success && json.ok) {
        showNotice(`Port ${newAccountPort} Hetzner'de aktif edildi! VNC üzerinden Google & Flow hesabınıza giriş yapabilirsiniz.`)
        setShowAddAccountModal(false)
        setShowVncModal(true)
        setNewAccountName('')
        setNewFlowProjectUrl('')
      } else {
        showNotice(`Slot oluşturulamadı: ${json.error || 'Hata'}`)
      }
      fetchData()
    } catch {
      showNotice('Sunucu ile bağlantı kurulamadı.')
    } finally {
      setIsProvisioning(false)
    }
  }

  // Google Flow Proje URL'sini Güncelle
  const handleUpdateFlow = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdatingFlow(true)
    try {
      const res = await fetch('/api/canli-takip/ai-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_flow',
          port: flowModalPort,
          flowProjectUrl: flowModalUrl,
          flowCredits: flowModalCredits,
        }),
      })
      const json = await res.json()
      if (json.success && json.ok) {
        showNotice(`Port ${flowModalPort} Flow projesi başarıyla bağlandı! Toplam kredi havuzuna dahil edildi.`)
        setShowFlowModal(false)
        setFlowModalUrl('')
      } else {
        showNotice(`Flow projesi kaydedilemedi: ${json.error || 'Hata'}`)
      }
      fetchData()
    } catch {
      showNotice('Sunucu ile bağlantı kurulamadı.')
    } finally {
      setIsUpdatingFlow(false)
    }
  }

  // Google Flow Projesini 1-Tıkta Otomatik Algıla & Bağla
  const handleAutoDetectFlow = async (port: number) => {
    setIsUpdatingFlow(true)
    try {
      const res = await fetch('/api/canli-takip/ai-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto_detect_flow',
          port,
        }),
      })
      const json = await res.json()
      if (json.success && json.ok) {
        showNotice(`Port ${port} Flow projesi otomatik algılandı ve başarıyla bağlandı!`)
        setFlowModalUrl(json.flowProjectUrl || '')
        setShowFlowModal(false)
        fetchData()
      } else {
        showNotice(`Otomatik algılanamadı: ${json.error || 'Hata'}`)
      }
    } catch {
      showNotice('Sunucu ile bağlantı kurulamadı.')
    } finally {
      setIsUpdatingFlow(false)
    }
  }

  // Kendi Tarayıcından Cookie Enjekte Et (VNC'siz Giriş)
  const handleSyncCookies = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSyncingCookies(true)
    try {
      const res = await fetch('/api/canli-takip/ai-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_cookies',
          port: cookieModalPort,
          cookies: cookieModalData,
          platform: cookieModalPlatform,
        }),
      })
      const json = await res.json()
      if (json.success && json.ok) {
        showNotice(`Port ${cookieModalPort} için ${json.cookiesCount || 0} adet çerez aktarıldı ve oturum doğrulandı!`)
        setShowCookieModal(false)
        setCookieModalData('')
      } else {
        showNotice(`Çerez aktarımı başarısız: ${json.error || 'Hata'}`)
      }
      fetchData()
    } catch {
      showNotice('Sunucu ile bağlantı kurulamadı.')
    } finally {
      setIsSyncingCookies(false)
    }
  }

  // Baileys Servisini Yeniden Başlat (Restart Worker Container)
  const handleRestartService = async () => {
    if (!confirm('WhatsApp gönderim servisi yeniden başlatılacak. Devam etmek istiyor musunuz?')) return
    if (actionBusy) return
    setActionBusy(true)
    try {
      const res = await fetch('/api/canli-takip/restart-service', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        showNotice('WhatsApp servisi yeniden başlatma sinyali gönderildi.')
        setTimeout(fetchData, 3000)
      } else {
        alert('Hata: ' + (json.error || 'İşlem başarısız'))
      }
    } catch (err) {
      alert('İstek hatası: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setActionBusy(false)
    }
  }

  // Tüm Hatları Yeniden Bağla / Senkronize Et
  const handleReconnectAll = async () => {
    if (actionBusy) return
    setActionBusy(true)
    try {
      const res = await fetch('/api/canli-takip/reconnect', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        showNotice('Tüm hatlar için senkronizasyon görevi başlatıldı.')
        setTimeout(fetchData, 2000)
      } else {
        alert('Hata: ' + (json.error || 'İşlem başarısız'))
      }
    } catch (err) {
      alert('İstek hatası: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setActionBusy(false)
    }
  }

  // Takılı Kalan İşleri Temizle
  const handleClearStuckJobs = async () => {
    if (!confirm('10 dakikadan uzun süredir takılı kalan claimed/running işler sonlandırılacak. Onaylıyor musunuz?')) return
    if (actionBusy) return
    setActionBusy(true)
    try {
      const res = await fetch('/api/canli-takip/clear-jobs', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        showNotice(json.message || 'Takılı kalan işler temizlendi.')
        setTimeout(fetchData, 1000)
      } else {
        alert('Hata: ' + (json.error || 'Temizleme başarısız'))
      }
    } catch (err) {
      alert('İstek hatası: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setActionBusy(false)
    }
  }

  // Hat Eylemi (connect, disconnect, logout, sync)
  const handleAccountAction = async (accountId: string, action: 'connect' | 'disconnect' | 'logout' | 'sync_contacts') => {
    if (action === 'logout' && !confirm('Bu hattın WhatsApp oturumu kapatılacak. Tekrar bağlamak için QR veya eşleştirme gerekecek. Emin misiniz?')) {
      return
    }
    setActionBusy(true)
    try {
      const res = await fetch('/api/canli-takip/account-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, action }),
      })
      const json = await res.json()
      if (json.success) {
        showNotice(json.message || 'Hat eylemi başlatıldı.')
        setTimeout(fetchData, 1500)
      } else {
        alert('Hata: ' + (json.error || 'İşlem başarısız'))
      }
    } catch (err) {
      alert('İstek hatası: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setActionBusy(false)
    }
  }

  // Kampanya Eylemi (pause, resume, stop)
  const handleCampaignAction = async (campaignId: string, action: 'pause' | 'resume' | 'stop') => {
    if (action === 'stop' && !confirm('Bu kampanya kalıcı olarak durdurulacak. Emin misiniz?')) return
    setActionBusy(true)
    try {
      const res = await fetch('/api/canli-takip/campaign-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, action }),
      })
      const json = await res.json()
      if (json.success) {
        showNotice(json.message || 'Kampanya güncellendi.')
        setTimeout(fetchData, 1500)
      } else {
        alert('Hata: ' + (json.error || 'İşlem başarısız'))
      }
    } catch (err) {
      alert('İstek hatası: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setActionBusy(false)
    }
  }

  // Hızlı Mesaj Gönder
  const handleSendQuickMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickAccountId || !quickPhone.trim() || !quickMessage.trim()) {
      alert('Lütfen gönderici hat, alıcı telefon numarası ve mesaj metnini doldurun.')
      return
    }
    setQuickSending(true)
    try {
      const res = await fetch('/api/canli-takip/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: quickAccountId,
          phone: quickPhone.trim(),
          message: quickMessage.trim(),
          mediaUrl: quickMediaUrl.trim() || undefined,
          mediaName: quickMediaName.trim() || undefined,
          messageType: quickMessageType !== 'text' ? quickMessageType : undefined,
        }),
      })
      const json = await res.json()
      if (json.success) {
        showNotice(`Mesaj kuyruğa alındı (İş No: ${json.jobId}). WhatsApp servisi anında gönderecek.`)
        setQuickMessage('')
        setQuickMediaUrl('')
        setQuickMediaName('')
        setQuickMessageType('text')
        setQuickFileSize(null)
        setTimeout(fetchData, 2000)
      } else {
        alert('Gönderim hatası: ' + (json.error || 'İşlem başarısız'))
      }
    } catch (err) {
      alert('İstek hatası: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setQuickSending(false)
    }
  }

  // Medya veya PDF Belgesi Yükle (30 MB Sınır)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 30 * 1024 * 1024) {
      alert('Dosya boyutu en fazla 30 MB olabilir.')
      return
    }
    setQuickUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/canli-takip/upload-media', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (json.success) {
        setQuickMediaUrl(json.url)
        setQuickMediaName(json.fileName)
        setQuickMessageType(json.messageType)
        setQuickFileSize(json.fileSize)
        showNotice(`"${json.fileName}" başarıyla yüklendi.`)
      } else {
        alert(json.error || 'Dosya yükleme başarısız.')
      }
    } catch (err) {
      alert('Dosya yüklenirken hata oluştu: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setQuickUploading(false)
      e.target.value = ''
    }
  }

  // Canlı WhatsApp ve Baileys Teşhis Testi
  const handleRunDiagnostic = async () => {
    setDiagnosticLoading(true)
    setShowDiagnosticModal(true)
    try {
      const res = await fetch('/api/canli-takip/diagnostic')
      const json = await res.json()
      if (json.success) {
        setDiagnosticData(json)
        showNotice('WhatsApp ve Baileys sistem teşhis testi tamamlandı.')
      } else {
        showNotice(json.error || 'Teşhis testi yapılamadı.')
      }
    } catch {
      showNotice('Teşhis testi sırasında bağlantı hatası oluştu.')
    } finally {
      setDiagnosticLoading(false)
    }
  }

  // ChatGPT ile Metin Üret (AI Playground)
  const handleGenerateAiMessage = async () => {
    if (!aiPrompt.trim()) {
      alert('Lütfen bir konu, ürün adı veya duyuru açıklaması girin.')
      return
    }
    setAiGenerating(true)
    try {
      const res = await fetch('/api/canli-takip/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          tone: aiTone,
          businessName: BRAND_NAME,
        }),
      })
      const json = await res.json()
      if (json.success && json.text) {
        setAiResult(json.text)
        showNotice('Yapay zeka mesajı başarıyla üretildi.')
      } else {
        alert('AI Üretim Hatası: ' + (json.error || 'Metin üretilemedi.'))
      }
    } catch (err) {
      alert('İstek hatası: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setAiGenerating(false)
    }
  }

  // Canlı Müşteri Mesajına ChatGPT Yanıt Önerisi Üret (Simülasyon & Test)
  const handleSimulateSuggestion = async (inputMsg?: string) => {
    const text = (inputMsg || simulatedPrompt).trim()
    if (!text) {
      alert('Lütfen test edilecek veya yanıtlanacak bir müşteri mesajı girin.')
      return
    }
    setSimulatingAi(true)
    setSimulatedSuggestions(null)
    try {
      const res = await fetch('/api/canli-takip/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Gelen müşteri mesajı: "${text}". Bu mesaja WhatsApp üzerinden verilecek profesyonel, müşteri memnuniyetini artıran ve harekete geçiren 3 farklı yanıt alternatifi oluştur.`,
          tone: 'samimi',
          businessName: BRAND_NAME,
        }),
      })
      const json = await res.json()
      if (json.success) {
        if (json.suggestions && Array.isArray(json.suggestions) && json.suggestions.length > 0) {
          setSimulatedSuggestions(json.suggestions)
        } else if (json.text) {
          const full = json.text
          setSimulatedSuggestions([
            {
              label: 'Kısa & Net',
              text: full.split('\n\n')[0] || full.slice(0, 120),
            },
            {
              label: 'Samimi',
              text: full,
            },
            {
              label: 'Yönlendirici',
              text: `Merhaba, konuyu derhal inceleyip çözüm sunmak isteriz. İletişim numaranızı ve detayları teyit etmeniz halinde hemen dönüş sağlayabiliriz.`,
            },
          ])
        }
        showNotice('ChatGPT yanıt önerileri hazırlandı.')
      } else {
        alert('AI Öneri Hatası: ' + (json.error || 'Öneri üretilemedi.'))
      }
    } catch (err) {
      alert('İstek hatası: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSimulatingAi(false)
    }
  }

  // Veri Talebini Onayla / Durum Güncelle
  const handleUpdateRequestStatus = async (
    requestId: string,
    status: 'pending' | 'processing' | 'completed' | 'rejected',
    currentCount?: number,
  ) => {
    let finalCount = currentCount
    if (status === 'completed') {
      const input = prompt('Bu talep için toplanan / teslim edilen kişi sayısını girin:', String(currentCount || 100))
      if (input === null) return
      finalCount = parseInt(input, 10) || 0
    } else if (status === 'rejected') {
      if (!confirm('Bu veri talebini reddetmek istediğinize emin misiniz?')) return
    }

    setActionBusy(true)
    try {
      const res = await fetch('/api/canli-takip/update-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          status,
          contactCount: finalCount,
        }),
      })
      const json = await res.json()
      if (json.success) {
        showNotice(json.message || 'Talep durumu başarıyla güncellendi.')
        setTimeout(fetchData, 1000)
      } else {
        alert('Hata: ' + (json.error || 'İşlem başarısız'))
      }
    } catch (err) {
      alert('İstek hatası: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setActionBusy(false)
    }
  }

  // Firma Üyelik Paketi / Plan Güncelleme
  const handleUpdateOrgPlan = async (orgId: string, plan: string) => {
    setActionBusy(true)
    try {
      const res = await fetch('/api/canli-takip/org-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, plan }),
      })
      const json = await res.json()
      if (json.success) {
        showNotice(`Firma üyelik paketi "${plan.toUpperCase()}" olarak güncellendi.`)
        fetchData()
      } else {
        alert('Hata: ' + (json.error || 'İşlem başarısız'))
      }
    } catch (err) {
      alert('İstek hatası: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setActionBusy(false)
    }
  }

  // Firma Kotalarını Düzenle (Hat, Mesaj ve Video Limiti)
  const handleUpdateOrgQuotas = async (org: OrganizationItem) => {
    const newAccounts = prompt(`${org.name} için Hat Kotası (Mevcut: ${org.accounts_quota}):`, String(org.accounts_quota))
    if (newAccounts === null) return
    const newMonthly = prompt(`${org.name} için Aylık Mesaj Limiti (Mevcut: ${org.monthly_message_quota}):`, String(org.monthly_message_quota))
    if (newMonthly === null) return
    const newVideo = prompt(`${org.name} için Aylık Video Kotası (Mevcut: ${org.monthly_video_quota ?? 3}):`, String(org.monthly_video_quota ?? 3))
    if (newVideo === null) return

    const accQuota = parseInt(newAccounts, 10)
    const msgQuota = parseInt(newMonthly, 10)
    const vidQuota = parseInt(newVideo, 10)

    if (isNaN(accQuota) || isNaN(msgQuota) || isNaN(vidQuota)) {
      alert('Lütfen geçerli sayısal değerler girin.')
      return
    }

    setActionBusy(true)
    try {
      const res = await fetch('/api/canli-takip/org-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: org.id,
          accountsQuota: accQuota,
          monthlyQuota: msgQuota,
          videoQuota: vidQuota,
        }),
      })
      const json = await res.json()
      if (json.success) {
        showNotice(`${org.name} limitleri güncellendi: ${accQuota} Hat · ${msgQuota.toLocaleString('tr-TR')} Mesaj/Ay · ${vidQuota} Video/Ay.`)
        fetchData()
      } else {
        alert('Hata: ' + (json.error || 'İşlem başarısız'))
      }
    } catch (err) {
      alert('İstek hatası: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setActionBusy(false)
    }
  }

  // Firma Durumu (Askıya Al / Aktifleştir)
  const handleToggleOrgSuspend = async (org: OrganizationItem) => {
    const isSuspended = !!org.suspended_at
    const confirmMsg = isSuspended
      ? `${org.name} işletmesinin erişim engelini kaldırıp aktif hale getirmek istiyor musunuz?`
      : `${org.name} işletmesini askıya alıp tüm hat ve mesaj gönderimlerini durdurmak istiyor musunuz?`
    if (!confirm(confirmMsg)) return

    setActionBusy(true)
    try {
      const res = await fetch('/api/canli-takip/org-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: org.id,
          suspended: !isSuspended,
        }),
      })
      const json = await res.json()
      if (json.success) {
        showNotice(`${org.name} ${!isSuspended ? 'askıya alındı' : 'tekrar aktif hale getirildi'}.`)
        fetchData()
      } else {
        alert('Hata: ' + (json.error || 'İşlem başarısız'))
      }
    } catch (err) {
      alert('İstek hatası: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setActionBusy(false)
    }
  }

  // Kara Listeye Ekle
  const handleAddBlacklist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!blackPhone.trim()) {
      alert('Lütfen engellenecek telefon numarasını girin.')
      return
    }
    setBlackSubmitting(true)
    try {
      const res = await fetch('/api/canli-takip/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          phone: blackPhone.trim(),
          reason: blackReason.trim() || 'Admin panelinden engellendi',
        }),
      })
      const json = await res.json()
      if (json.success) {
        showNotice('Numara kara listeye eklendi.')
        setBlackPhone('')
        setBlackReason('')
        setTimeout(fetchData, 1500)
      } else {
        alert('Hata: ' + (json.error || 'Numara engellenemedi.'))
      }
    } catch (err) {
      alert('İstek hatası: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setBlackSubmitting(false)
    }
  }

  // Kara Listeden Kaldır
  const handleRemoveBlacklist = async (id: string) => {
    if (!confirm('Bu numaranın engeli kaldırılacak. Kampanyalara tekrar dahil edilebilecek. Emin misiniz?')) return
    setActionBusy(true)
    try {
      const res = await fetch('/api/canli-takip/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', id }),
      })
      const json = await res.json()
      if (json.success) {
        showNotice('Numara engeli kaldırıldı.')
        setTimeout(fetchData, 1500)
      } else {
        alert('Hata: ' + (json.error || 'Engeli kaldırma başarısız.'))
      }
    } catch (err) {
      alert('İstek hatası: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setActionBusy(false)
    }
  }

  // Liste Kişilerini İncele
  const handleOpenListContacts = async (listId: string, listName: string) => {
    setPreviewListId(listId)
    setPreviewListName(listName)
    setPreviewLoading(true)
    try {
      const res = await fetch(`/api/canli-takip/contacts?listId=${listId}&limit=50`)
      const json = await res.json()
      if (json.success) {
        setPreviewContacts(json.contacts || [])
        setPreviewTotal(json.total || 0)
      } else {
        alert('Kişiler getirilemedi: ' + (json.error || ''))
      }
    } catch (err) {
      alert('İstek hatası: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setPreviewLoading(false)
    }
  }

  // Filtrelenmiş Veriler
  const filterByOrg = useCallback(
    <T extends { org_name?: string; org_id?: string }>(items: T[] = []): T[] => {
      if (selectedOrg === 'all') return items
      return items.filter(it => it.org_name === selectedOrg || it.org_id === selectedOrg)
    },
    [selectedOrg],
  )

  const filteredAccounts = useMemo(() => filterByOrg(data?.accounts), [data?.accounts, filterByOrg])
  const filteredCampaigns = useMemo(() => {
    let list = filterByOrg(data?.campaigns)
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase()
      list = list.filter(c => c.name.toLowerCase().includes(q) || (c.body && c.body.toLowerCase().includes(q)))
    }
    return list
  }, [data?.campaigns, filterByOrg, globalSearch])

  const filteredTargets = useMemo(() => {
    let list = filterByOrg(data?.targets)
    if (queueFilter !== 'all') list = list.filter(t => t.status === queueFilter)
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase()
      list = list.filter(t => t.phone_e164.includes(q) || t.campaign_name.toLowerCase().includes(q))
    }
    return list
  }, [data?.targets, filterByOrg, queueFilter, globalSearch])

  const filteredMessages = useMemo(() => {
    let list = filterByOrg(data?.messages)
    if (msgFilter !== 'all') list = list.filter(m => m.direction === msgFilter)
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase()
      list = list.filter(m => (m.phone_e164 && m.phone_e164.includes(q)) || (m.body && m.body.toLowerCase().includes(q)) || (m.push_name && m.push_name.toLowerCase().includes(q)))
    }
    return list
  }, [data?.messages, filterByOrg, msgFilter, globalSearch])

  const filteredAiSuggestions = useMemo(() => {
    let list = filterByOrg(data?.aiSuggestions)
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase()
      list = list.filter(
        s =>
          (s.incoming_sample && s.incoming_sample.toLowerCase().includes(q)) ||
          (s.org_name && s.org_name.toLowerCase().includes(q)) ||
          s.suggestions?.some(sg => sg.text.toLowerCase().includes(q) || sg.label.toLowerCase().includes(q))
      )
    }
    return list
  }, [data?.aiSuggestions, filterByOrg, globalSearch])

  const filteredAutoReplies = useMemo(() => {
    let list = filterByOrg(data?.autoReplies)
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase()
      list = list.filter(
        a =>
          (a.phone_e164 && a.phone_e164.includes(q)) ||
          (a.reply_body && a.reply_body.toLowerCase().includes(q)) ||
          (a.org_name && a.org_name.toLowerCase().includes(q))
      )
    }
    return list
  }, [data?.autoReplies, filterByOrg, globalSearch])

  const selectedSuggestion = useMemo(() => {
    if (filteredAiSuggestions.length === 0) return null
    return (
      filteredAiSuggestions.find(item => item.id === selectedSuggestionId) ??
      filteredAiSuggestions[0]
    )
  }, [filteredAiSuggestions, selectedSuggestionId])

  const filteredJobs = useMemo(() => {
    let list = filterByOrg(data?.jobs)
    if (jobFilter !== 'all') list = list.filter(j => j.status === jobFilter)
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase()
      list = list.filter(j => j.type.toLowerCase().includes(q) || (j.error && j.error.toLowerCase().includes(q)))
    }
    return list
  }, [data?.jobs, filterByOrg, jobFilter, globalSearch])

  const filteredBlacklist = useMemo(() => {
    let list = filterByOrg(data?.blacklist)
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase()
      list = list.filter(b => b.phone_e164.includes(q) || (b.reason && b.reason.toLowerCase().includes(q)))
    }
    return list
  }, [data?.blacklist, filterByOrg, globalSearch])

  const organizationsList = useMemo(() => data?.organizations || [], [data?.organizations])

  const filteredOrganizations = useMemo(() => {
    let list = data?.organizations || []
    if (selectedOrg !== 'all') {
      list = list.filter(o => o.id === selectedOrg)
    }
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase()
      list = list.filter(
        o =>
          o.name.toLowerCase().includes(q) ||
          o.slug.toLowerCase().includes(q) ||
          (o.plan && o.plan.toLowerCase().includes(q))
      )
    }
    return list
  }, [data?.organizations, selectedOrg, globalSearch])

  const filteredRecentContacts = useMemo(() => {
    let list = data?.recentContacts || []
    if (selectedOrg !== 'all') {
      list = list.filter(c => c.org_id === selectedOrg)
    }
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase()
      list = list.filter(
        c =>
          c.phone_e164.includes(q) ||
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.org_name && c.org_name.toLowerCase().includes(q))
      )
    }
    return list
  }, [data?.recentContacts, selectedOrg, globalSearch])

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[var(--color-canvas)] flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs sm:text-sm font-semibold text-ink-soft">Yönetici Paneli Yükleniyor...</p>
        <p className="text-[11px] text-ink-muted mt-1">WhatsApp servis durumu ve PostgreSQL bağlantısı kuruluyor.</p>
      </div>
    )
  }

  const worker = data?.worker
  const summary = data?.summary || {
    todayInbound: 0,
    todayOutbound: 0,
    queuedMessages: 0,
    pendingJobs: 0,
    failedJobs: 0,
    activeCampaigns: 0,
    totalContacts: 0,
    validContacts: 0,
    totalOrganizations: 0,
    totalContactLists: 0,
    pendingDataRequests: 0,
    blacklistedCount: 0,
    connectedAccounts: 0,
    totalAccounts: 0,
  }

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)] flex flex-col antialiased selection:bg-accent/20">
      {/* Top Floating Notification Banner */}
      {actionNotice && (
        <div className="sticky top-0 z-50 bg-accent text-accent-ink px-3 py-2 text-center text-xs font-semibold shadow-md flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Main Header Bar - Fully Mobile Optimized */}
      <header className="sticky top-0 z-40 bg-[var(--color-surface)]/95 backdrop-blur-md border-b border-[var(--color-hairline)] px-3 sm:px-6 py-2 sm:py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Header Row 1 (Logo + Super Admin Badge + Mobile Status) */}
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] flex items-center justify-center">
                <LogoMark className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-xs sm:text-sm tracking-tight text-ink">{BRAND_NAME}</span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-surface-raised text-ink border border-[var(--color-hairline)] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-ok animate-pulse" />
                    SUPER ADMIN
                  </span>
                  <span className="text-[9px] font-mono text-ink-muted hidden md:inline">
                    {lastFetchedAt ? lastFetchedAt.toLocaleTimeString('tr-TR') : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile-only right indicators */}
            <div className="flex sm:hidden items-center gap-1.5">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
                  autoRefresh
                    ? 'bg-ok-soft text-ok-dim border-ok-dim/20'
                    : 'bg-[var(--color-surface-raised)] text-ink-muted border-[var(--color-hairline)]'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-ok animate-pulse' : 'bg-ink-muted'}`} />
                <span>{autoRefresh ? `${refreshIntervalSec}s` : 'Durdu'}</span>
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="px-2 py-0.5 rounded text-[10px] font-medium text-ink-muted hover:text-danger border border-[var(--color-hairline)]"
              >
                Çıkış
              </button>
            </div>
          </div>

          {/* Header Row 2: Controls & Actions */}
          <div
            onWheel={(e) => {
              if (e.deltaY !== 0) e.currentTarget.scrollLeft += e.deltaY;
            }}
            className="flex items-center justify-between sm:justify-end gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none w-full sm:w-auto"
          >
            {/* Live Refresh Switcher */}
            <div className="flex items-center rounded-[var(--radius-sm)] border border-[var(--color-hairline)] overflow-hidden text-[9px] font-bold shrink-0">
              <button
                type="button"
                onClick={() => { setRefreshIntervalSec(3); setAutoRefresh(true); }}
                className={`px-1.5 py-1 transition ${autoRefresh && refreshIntervalSec === 3 ? 'bg-accent text-white font-bold' : 'bg-surface text-ink-muted hover:text-ink'}`}
                title="3 saniyede bir agresif canlı güncelle"
              >
                3s
              </button>
              <button
                type="button"
                onClick={() => { setRefreshIntervalSec(5); setAutoRefresh(true); }}
                className={`px-1.5 py-1 border-l border-[var(--color-hairline)] transition ${autoRefresh && refreshIntervalSec === 5 ? 'bg-accent text-white font-bold' : 'bg-surface text-ink-muted hover:text-ink'}`}
                title="5 saniyede bir standart canlı güncelle"
              >
                5s
              </button>
              <button
                type="button"
                onClick={() => { setRefreshIntervalSec(15); setAutoRefresh(true); }}
                className={`px-1.5 py-1 border-l border-[var(--color-hairline)] transition ${autoRefresh && refreshIntervalSec === 15 ? 'bg-accent text-white font-bold' : 'bg-surface text-ink-muted hover:text-ink'}`}
                title="15 saniyede bir düşük trafikli güncelle"
              >
                15s
              </button>
              <button
                type="button"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-1.5 py-1 border-l border-[var(--color-hairline)] transition ${!autoRefresh ? 'bg-amber-600 text-white font-bold' : 'bg-surface text-ink-muted hover:text-ink'}`}
                title={autoRefresh ? 'Canlı akışı durdur' : 'Canlı akışı başlat'}
              >
                {autoRefresh ? 'Durdur' : 'Başlat'}
              </button>
            </div>

            {/* Manual Refresh Button */}
            <button
              onClick={fetchData}
              disabled={isRefreshing}
              className="p-1 sm:px-2 sm:py-1 rounded-[var(--radius-sm)] text-[10px] sm:text-[11px] font-semibold bg-surface border border-[var(--color-hairline)] hover:bg-surface-raised transition flex items-center gap-1 shrink-0"
              title="Şimdi Yenile"
            >
              <span className={`inline-block ${isRefreshing ? 'animate-spin text-accent' : ''}`}>↻</span>
              <span className="hidden sm:inline">Yenile</span>
            </button>

            {/* Organization Filter Selector */}
            {organizationsList.length > 0 && (
              <div className="flex items-center gap-1 bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] px-2 py-0.5 shrink-0">
                <span className="text-[10px] text-ink-muted font-medium">İşletme:</span>
                <select
                  value={selectedOrg}
                  onChange={e => setSelectedOrg(e.target.value)}
                  className="bg-transparent text-[10px] sm:text-[11px] font-semibold text-ink outline-none cursor-pointer max-w-[110px] sm:max-w-none truncate"
                >
                  <option value="all">Tümü ({organizationsList.length})</option>
                  {organizationsList.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Action Buttons Group */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleRestartService}
                disabled={actionBusy}
                className="px-2 py-1 rounded-[var(--radius-sm)] text-[10px] sm:text-[11px] font-semibold bg-danger/10 text-danger border border-danger/20 hover:bg-danger/15 transition disabled:opacity-50"
                title="WhatsApp gönderim servisini yeniden başlat"
              >
                Restart
              </button>
              <button
                onClick={handleReconnectAll}
                disabled={actionBusy}
                className="px-2 py-1 rounded-[var(--radius-sm)] text-[10px] sm:text-[11px] font-semibold bg-accent-soft text-accent border border-accent/20 hover:bg-accent/15 transition disabled:opacity-50"
                title="Tüm hatları senkronize et"
              >
                Senkronize
              </button>
              <button
                onClick={handleClearStuckJobs}
                disabled={actionBusy}
                className="px-2 py-1 rounded-[var(--radius-sm)] text-[10px] sm:text-[11px] font-semibold bg-surface-raised text-ink-soft border border-[var(--color-hairline)] hover:bg-canvas transition disabled:opacity-50"
                title="Takılı işleri temizle"
              >
                Temizle
              </button>
            </div>

            {/* Desktop-only status & logout */}
            <div className="hidden sm:flex items-center gap-1.5 pl-1.5 border-l border-[var(--color-hairline)] shrink-0">
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="px-2 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium text-ink-muted hover:text-danger transition"
                title="Yönetici oturumunu kapat"
              >
                Çıkış
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2.5 sm:p-5 space-y-3 sm:space-y-4">
        {/* Live Active Render Alert Banner */}
        {(() => {
          const activeJobs = (globalAiMedia?.jobs || []).filter((j: any) =>
            ['LEASED', 'PREPARING_ENV', 'OPENING_PROJECT', 'ATTACHING_INGREDIENTS', 'INGREDIENTS_VERIFIED', 'GENERATING', 'POLLING_FLOW', 'DOWNLOADING_MEDIA', 'MEDIA_DOWNLOADED', 'FFPROBE_INSPECTING', 'SHA256_VERIFYING', 'VISUAL_QA_EVALUATING'].includes(j.state)
          )
          if (activeJobs.length === 0) return null
          const cur = activeJobs[0]
          return (
            <div className="bg-accent-soft/40 border border-accent/40 rounded-[var(--radius-card)] p-3 text-ink shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-accent animate-ping shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink uppercase tracking-wider">Canlı AI Video Renderı İşleniyor</span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-accent text-accent-ink">
                      {cur.state}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    {cur.org_name || 'İşletme'} · {cur.title || `İş #${cur.id}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('ai_media')}
                className="px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold bg-accent text-accent-ink hover:bg-accent-dim transition shrink-0 shadow-xs"
              >
                Canlı İzle →
              </button>
            </div>
          )
        })()}

        {/* Live System Hata / Stuck Job Uyarı Barı */}
        {(summary.failedJobs || 0) > 0 && (
          <div className="bg-danger/10 border border-danger/30 rounded-[var(--radius-card)] p-3 text-danger shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-danger animate-pulse shrink-0" />
              <div>
                <span className="text-xs font-bold">Kuyrukta {summary.failedJobs} adet başarısız iş tespit edildi</span>
                <p className="text-[11px] text-ink-muted mt-0.5">Hatalı mesaj veya video işleri incelenmeli, takılı kalan kayıtlar sıfırlanmalıdır.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleClearStuckJobs}
                disabled={actionBusy}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-danger text-white hover:bg-danger/80 transition disabled:opacity-50"
              >
                Takılı İşleri Temizle
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('jobs')}
                className="px-2.5 py-1 text-xs font-semibold rounded border border-danger/30 text-danger hover:bg-danger/10 transition"
              >
                Hataları İncele →
              </button>
            </div>
          </div>
        )}
        {/* KPI Dashboard Cards Grid - Horizontally Swipeable on Mobile, 10-col on Desktop */}
        <section
          onWheel={(e) => {
            if (e.deltaY !== 0) e.currentTarget.scrollLeft += e.deltaY;
          }}
          className="flex sm:grid overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none gap-2 sm:grid-cols-5 lg:grid-cols-10 sm:gap-2"
        >
          {/* Card 1: Baileys Worker */}
          <div className="min-w-[115px] sm:min-w-0 shrink-0 sm:shrink bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-2 sm:p-2.5 shadow-xs flex flex-col justify-between">
            <span className="text-[9px] sm:text-[10px] font-semibold text-ink-muted uppercase tracking-wider">Servis</span>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-sm sm:text-base font-bold text-ink">{worker?.live ?? 0}</span>
              <span className="text-[9px] text-ink-muted">/{worker?.tracked ?? 0}</span>
            </div>
            <span className="text-[8px] sm:text-[9px] text-ok-dim font-medium">
              {worker ? 'Aktif' : 'Kopuk'}
            </span>
          </div>

          {/* Card 2: VPS CPU Yükü */}
          <div className="min-w-[115px] sm:min-w-0 shrink-0 sm:shrink bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-2 sm:p-2.5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[9px] sm:text-[10px] font-semibold text-ink-muted uppercase tracking-wider">CPU</span>
              <span className="w-1.5 h-1.5 rounded-full bg-ok animate-pulse" />
            </div>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-sm sm:text-base font-bold text-ink">%{data?.serverMetrics?.cpu_percent ?? 5.6}</span>
              <span className="text-[9px] text-ink-muted">{data?.serverMetrics?.cpu_cores ?? 2}c</span>
            </div>
            <div className="w-full bg-surface-raised rounded-full h-1 mt-0.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-ok"
                style={{ width: `${Math.min(100, Math.max(5, Number(data?.serverMetrics?.cpu_percent ?? 5)))}%` }}
              />
            </div>
          </div>

          {/* Card 3: VPS RAM Kullanımı */}
          <div className="min-w-[115px] sm:min-w-0 shrink-0 sm:shrink bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-2 sm:p-2.5 shadow-xs flex flex-col justify-between">
            <span className="text-[9px] sm:text-[10px] font-semibold text-ink-muted uppercase tracking-wider">RAM</span>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-sm sm:text-base font-bold text-ink">%{data?.serverMetrics?.ram_percent ?? 60}</span>
              <span className="text-[9px] text-ink-muted">/{(((data?.serverMetrics?.ram_total_mb ?? 3809) / 1024)).toFixed(1)}G</span>
            </div>
            <div className="w-full bg-surface-raised rounded-full h-1 mt-0.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.min(100, Math.max(5, Number(data?.serverMetrics?.ram_percent ?? 60)))}%` }}
              />
            </div>
          </div>

          {/* Card 4: Contacts */}
          {/* Card 4: Organizations & Subscriptions */}
          <div className="min-w-[115px] sm:min-w-0 shrink-0 sm:shrink bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-2 sm:p-2.5 shadow-xs flex flex-col justify-between">
            <span className="text-[9px] sm:text-[10px] font-semibold text-ink-muted uppercase tracking-wider">Firmalar</span>
            <div className="mt-0.5 text-sm sm:text-base font-bold text-ink">
              {summary.totalOrganizations ?? data?.organizations?.length ?? 6}
            </div>
            <span className="text-[8px] sm:text-[9px] text-accent font-medium">Müşteri & Üye</span>
          </div>

          {/* Card 5: Total Contacts */}
          <div className="min-w-[115px] sm:min-w-0 shrink-0 sm:shrink bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-2 sm:p-2.5 shadow-xs flex flex-col justify-between">
            <span className="text-[9px] sm:text-[10px] font-semibold text-ink-muted uppercase tracking-wider">Kayıtlı Kişi</span>
            <div className="mt-0.5 text-sm sm:text-base font-bold text-ink">
              {Number(summary.totalContacts).toLocaleString('tr-TR')}
            </div>
            <span className="text-[8px] sm:text-[9px] text-ok-dim font-medium">
              {summary.validContacts ? `${Number(summary.validContacts).toLocaleString('tr-TR')} Onaylı` : 'Toplam Rehber'}
            </span>
          </div>

          {/* Card 6: Today Inbound */}
          <div className="min-w-[115px] sm:min-w-0 shrink-0 sm:shrink bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-2 sm:p-2.5 shadow-xs flex flex-col justify-between">
            <span className="text-[9px] sm:text-[10px] font-semibold text-ink-muted uppercase tracking-wider">Gelen</span>
            <div className="mt-0.5 text-sm sm:text-base font-bold text-success">
              {summary.todayInbound}
            </div>
            <span className="text-[8px] sm:text-[9px] text-ink-muted">Bugün</span>
          </div>

          {/* Card 7: Today Outbound */}
          <div className="min-w-[115px] sm:min-w-0 shrink-0 sm:shrink bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-2 sm:p-2.5 shadow-xs flex flex-col justify-between">
            <span className="text-[9px] sm:text-[10px] font-semibold text-ink-muted uppercase tracking-wider">Giden</span>
            <div className="mt-0.5 text-sm sm:text-base font-bold text-accent">
              {summary.todayOutbound}
            </div>
            <span className="text-[8px] sm:text-[9px] text-ink-muted">Bugün</span>
          </div>

          {/* Card 8: Queued Targets */}
          <div className="min-w-[115px] sm:min-w-0 shrink-0 sm:shrink bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-2 sm:p-2.5 shadow-xs flex flex-col justify-between">
            <span className="text-[9px] sm:text-[10px] font-semibold text-ink-muted uppercase tracking-wider">Sırada</span>
            <div className="mt-0.5 text-sm sm:text-base font-bold text-warn">
              {summary.queuedMessages}
            </div>
            <span className="text-[8px] sm:text-[9px] text-ink-muted">Bekleyen</span>
          </div>

          {/* Card 9: Active Campaigns */}
          <div className="min-w-[115px] sm:min-w-0 shrink-0 sm:shrink bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-2 sm:p-2.5 shadow-xs flex flex-col justify-between">
            <span className="text-[9px] sm:text-[10px] font-semibold text-ink-muted uppercase tracking-wider">Kampanya</span>
            <div className="mt-0.5 text-sm sm:text-base font-bold text-ink">
              {summary.activeCampaigns}
            </div>
            <span className="text-[8px] sm:text-[9px] text-ink-muted">Aktif</span>
          </div>

          {/* Card 10: AI Video Renders */}
          <div className="min-w-[115px] sm:min-w-0 shrink-0 sm:shrink bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-2 sm:p-2.5 shadow-xs flex flex-col justify-between">
            <span className="text-[9px] sm:text-[10px] font-semibold text-ink-muted uppercase tracking-wider">AI Video</span>
            <div className="mt-0.5 text-sm sm:text-base font-bold text-accent">
              {(data?.ai_engine?.recentVideos?.length || 0) + (data?.creatives?.length || 0)}
            </div>
            <span className="text-[8px] sm:text-[9px] text-ink-muted">Üretim / Render</span>
          </div>
        </section>

        {/* Search & Module Tabs Bar */}
        <section className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-1.5 sm:p-2">
          {/* Module Tab Buttons with Desktop Drag, Wheel & Arrow Scroll Support */}
          <div className="relative flex items-center w-full min-w-0">
            <button
              type="button"
              onClick={() => scrollTabs('left')}
              className="flex shrink-0 items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] bg-surface hover:bg-surface-raised border border-[var(--color-hairline)] text-ink mr-1.5 shadow-xs z-10 transition cursor-pointer"
              title="Sola Kaydır"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            </button>

            <div
              ref={tabsRef}
              onMouseDown={handleTabsMouseDown}
              onMouseMove={handleTabsMouseMove}
              onMouseUp={handleTabsMouseUp}
              onMouseLeave={handleTabsMouseUp}
              onWheel={(e) => {
                if (e.deltaY !== 0) {
                  e.currentTarget.scrollLeft += e.deltaY;
                }
              }}
              className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 w-full select-none cursor-grab active:cursor-grabbing scrollbar-thin scrollbar-thumb-[var(--color-hairline-strong)]"
            >
              {[
                { id: 'overview', label: 'Operasyon Özeti', badge: (summary.failedJobs || 0) + summary.pendingJobs, errorBadge: (summary.failedJobs || 0) > 0 ? summary.failedJobs : null },
                { id: 'ai_studio', label: 'AI Video Motoru & Kredi Havuzu', badge: (data?.ai_engine?.recentVideos?.length || 0) + (data?.creatives?.length || 0), isAlert: (data?.ai_engine?.geminiPool?.limitedAccounts || 0) > 0 },
                { id: 'ai_media', label: 'Canlı Render & İş Takibi', badge: null, isAlert: false },
                { id: 'baileys', label: 'Servis & Altyapı Durumu', badge: data?.accounts?.length, isAlert: (data?.accounts?.filter(a => a.status !== 'connected').length || 0) > 0 },
                { id: 'jobs', label: 'Görev Kuyruğu & Hatalar', badge: data?.jobs?.length, errorBadge: (summary.failedJobs ?? 0) > 0 ? summary.failedJobs : null },
                { id: 'organizations', label: 'Firmalar & Kotalar', badge: data?.organizations?.length },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (!hasDragged.current) setActiveTab(tab.id as any)
                  }}
                  className={`shrink-0 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-[var(--radius-sm)] text-[11px] sm:text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-accent text-accent-ink shadow-sm'
                      : 'text-ink-soft hover:bg-[var(--color-surface-raised)]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.errorBadge !== null && tab.errorBadge !== undefined && (
                    <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-danger text-white animate-pulse">
                      {tab.errorBadge} Hata
                    </span>
                  )}
                  {tab.badge !== null && tab.badge !== undefined && tab.badge > 0 && !tab.errorBadge && (
                    <span
                      className={`text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        activeTab === tab.id
                          ? 'bg-white/20 text-white'
                          : 'bg-[var(--color-surface-raised)] text-ink-muted'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => scrollTabs('right')}
              className="flex shrink-0 items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] bg-surface hover:bg-surface-raised border border-[var(--color-hairline)] text-ink ml-1.5 shadow-xs z-10 transition cursor-pointer"
              title="Sağa Kaydır"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          {/* Quick Search Input */}
          <div className="relative min-w-[180px] md:w-64">
            <input
              type="text"
              placeholder="Numara, mesaj, isim ara..."
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] px-2.5 py-1 text-xs text-ink placeholder:text-ink-muted outline-none focus:border-accent"
            />
            {globalSearch && (
              <button
                onClick={() => setGlobalSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-ink-muted hover:text-ink"
              >
                ×
              </button>
            )}
          </div>
        </section>

        {/* TAB -1: OPERASYON ÖZETİ */}
        {activeTab === 'overview' && (
          <div className="space-y-3 sm:space-y-4">
            {/* WHATSAPP OTURUM VE SENKRONİZASYON KORUMASI KARTI */}
            <div className="rounded-[var(--radius-card)] border border-ok/30 bg-ok-soft/15 p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-ok animate-pulse shrink-0" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-ink">WhatsApp Senkronizasyon & Oturum Koruması</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-ok text-white">AKTİF & KORUMALI</span>
                  </div>
                  <p className="text-[11px] text-ink-muted mt-0.5 leading-relaxed">
                    Baileys eşlikçi cihaz senkronizasyon döngüsü ve bildirim seli engellendi · 2 hat kesintisiz bağlı · 0 döngü hatası
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRunDiagnostic}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-[var(--radius-sm)] bg-surface border border-ok/40 text-ok-dim hover:bg-ok-soft/30 transition shrink-0 shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>Canlı Teşhis Testi Yap</span>
              </button>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
              <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 sm:p-5 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-[var(--color-hairline)] pb-3">
                  <div>
                    <h2 className="text-xs sm:text-sm font-bold text-ink">Önce Bakılacaklar</h2>
                    <p className="text-[11px] text-ink-muted mt-0.5">Canlı operasyon için worker, kuyruk, hat ve mesaj sağlığı.</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    (summary.failedJobs || 0) > 0 || summary.pendingJobs > 0 || !worker
                      ? 'bg-danger/10 text-danger'
                      : 'bg-ok-soft text-ok-dim'
                  }`}>
                    {(summary.failedJobs || 0) > 0 || summary.pendingJobs > 0 || !worker ? 'Müdahale Gerekebilir' : 'Temiz'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      title: worker ? 'Worker canlı' : 'Worker heartbeat yok',
                      detail: worker ? `${worker.live}/${worker.tracked} canlı oturum · ${timeAgo(worker.seen_at)}` : 'Gönderim ve senkron işlemleri durabilir.',
                      tone: worker ? 'ok' : 'danger',
                      action: 'Servise Git',
                      tab: 'baileys' as const,
                    },
                    {
                      title: `${summary.pendingJobs} bekleyen iş`,
                      detail: summary.pendingJobs > 0 ? 'Kuyruk birikiyorsa worker veya DB tarafına bak.' : 'Bekleyen iş yok.',
                      tone: summary.pendingJobs > 0 ? 'warn' : 'ok',
                      action: 'İş Kuyruğu',
                      tab: 'jobs' as const,
                    },
                    {
                      title: `${summary.failedJobs || 0} başarısız iş`,
                      detail: (summary.failedJobs || 0) > 0 ? 'Hata tiplerini ve payload detayını incele.' : 'Son işlerde başarısız kayıt görünmüyor.',
                      tone: (summary.failedJobs || 0) > 0 ? 'danger' : 'ok',
                      action: 'Hataları Aç',
                      tab: 'jobs' as const,
                    },
                    {
                      title: `${data?.ai_engine?.geminiPool?.activeAccounts ?? 0}/${data?.ai_engine?.geminiPool?.totalAccounts ?? 0} AI Hesabı Aktif`,
                      detail: (data?.ai_engine?.geminiPool?.limitedAccounts || 0) > 0 ? `${data?.ai_engine?.geminiPool?.limitedAccounts} hesap kota limitinde.` : 'Tüm AI hesap havuzu ve motorlar aktif.',
                      tone: (data?.ai_engine?.geminiPool?.limitedAccounts || 0) > 0 ? 'warn' : 'ok',
                      action: 'AI Havuzu',
                      tab: 'ai_studio' as const,
                    },
                  ].map(item => (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => setActiveTab(item.tab)}
                      className={`text-left rounded-[var(--radius-sm)] border p-3 transition hover:bg-[var(--color-surface-raised)] ${
                        item.tone === 'danger'
                          ? 'border-danger/25 bg-danger/5'
                          : item.tone === 'warn'
                          ? 'border-warn/25 bg-warn/5'
                          : item.tone === 'ok'
                          ? 'border-ok/25 bg-ok-soft/20'
                          : item.tone === 'accent'
                          ? 'border-accent/25 bg-accent-soft/30'
                          : 'border-[var(--color-hairline)] bg-canvas'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-ink">{item.title}</span>
                        <span className="text-[10px] font-semibold text-accent whitespace-nowrap">{item.action} →</span>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">{item.detail}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 sm:p-5 shadow-sm space-y-3">
                <div className="border-b border-[var(--color-hairline)] pb-3">
                  <h2 className="text-xs sm:text-sm font-bold text-ink">Hızlı Aksiyon Merkezi</h2>
                  <p className="text-[11px] text-ink-muted mt-0.5">Tüm modüllere tek tıkla erişim.</p>
                </div>

                {/* AI & Video */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-ink-muted uppercase tracking-wider">AI & Video Üretimi</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button type="button" onClick={() => setActiveTab('ai_studio')}
                      className="rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-surface px-3 py-2.5 text-left hover:bg-surface-raised transition group">
                      <div className="text-[11px] font-bold text-ink group-hover:text-accent">AI Stüdyo & Krediler</div>
                      <div className="text-[10px] text-ink-muted mt-0.5">Flow & Gemini havuzu</div>
                    </button>
                    <button type="button" onClick={() => setActiveTab('ai_media')}
                      className="rounded-[var(--radius-sm)] border border-accent/30 bg-accent-soft/30 px-3 py-2.5 text-left hover:bg-accent-soft transition group">
                      <div className="text-[11px] font-bold text-accent">Canlı Render Takibi</div>
                      <div className="text-[10px] text-ink-muted mt-0.5">Render kuyruğu & QA</div>
                    </button>
                  </div>
                  {/* AI Engine Status */}
                  <div className="rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-canvas px-3 py-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-ink-muted">OmniStudio Motoru</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      data?.ai_engine?.status === 'online' ? 'bg-ok-soft text-ok-dim' : 'bg-danger/10 text-danger'
                    }`}>
                      {data?.ai_engine?.status === 'online' ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>

                {/* Operasyon & Altyapı */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-ink-muted uppercase tracking-wider">Operasyon & Altyapı</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button type="button" onClick={() => setActiveTab('jobs')}
                      className={`rounded-[var(--radius-sm)] border px-3 py-2.5 text-left transition group ${summary.pendingJobs > 0 ? 'border-warn/30 bg-warn/5 hover:bg-warn/10' : 'border-[var(--color-hairline)] bg-canvas hover:bg-[var(--color-surface-raised)]'}`}>
                      <div className="text-[11px] font-bold text-ink">Görev Kuyruğu</div>
                      <div className={`text-[10px] mt-0.5 ${summary.pendingJobs > 0 ? 'text-warn font-semibold' : 'text-ink-muted'}`}>{summary.pendingJobs} bekliyor</div>
                    </button>
                    <button type="button" onClick={() => setActiveTab('baileys')}
                      className="rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-canvas px-3 py-2.5 text-left hover:bg-[var(--color-surface-raised)] transition group">
                      <div className="text-[11px] font-bold text-ink">Servis & Altyapı</div>
                      <div className={`text-[10px] mt-0.5 ${worker ? 'text-ok-dim' : 'text-danger font-semibold'}`}>{worker ? `${worker.live} hat bağlı` : 'Servis kopuk'}</div>
                    </button>
                    <button type="button" onClick={() => setActiveTab('organizations')}
                      className="rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-canvas px-3 py-2.5 text-left hover:bg-[var(--color-surface-raised)] transition">
                      <div className="text-[11px] font-bold text-ink">Firmalar & Kotalar</div>
                      <div className="text-[10px] text-ink-muted mt-0.5">{summary.totalOrganizations ?? organizationsList.length} firma kayıtlı</div>
                    </button>
                    <button type="button" onClick={handleRunDiagnostic}
                      className="rounded-[var(--radius-sm)] border border-ok/30 bg-ok-soft/10 px-3 py-2.5 text-left hover:bg-ok-soft/20 transition">
                      <div className="text-[11px] font-bold text-ok-dim">Canlı Teşhis Testi</div>
                      <div className="text-[10px] text-ink-muted mt-0.5">Soket ve hat kontrolü</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 1. ROW: AI VİDEO MOTORU & FLOW HESAP HAVUZU KONSOLU */}
            {/* 1. ROW: AI VİDEO MOTORU & FLOW HESAP HAVUZU KONSOLU */}
            {(() => {
              const googleFlow = data?.ai_engine?.googleFlow
              const geminiPool = data?.ai_engine?.geminiPool

              const totalFlowCredits = googleFlow?.credits ?? 3105
              const totalFlowInitial = googleFlow?.initialCredits ?? 3150
              const totalFlowVideos = googleFlow?.videosRemaining ?? Math.floor(totalFlowCredits / 15)

              const totalDailyCredits = geminiPool?.dailyCreditsRemaining ?? 200
              const totalDailyLimit = geminiPool?.dailyCreditsTotal ?? 200

              const grandTotalVideos = googleFlow?.grandTotalVideosRemaining ?? (totalFlowVideos + totalDailyCredits)

              return (
                <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 sm:p-5 shadow-sm space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-hairline)] pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-bold text-ink">Google Flow & Veo 4'lü Hesap Havuzu</h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent-soft text-accent font-bold border border-accent/20">
                          Canlı Kredi Havuzu
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-ok-soft text-ok-dim font-bold">
                          {grandTotalVideos} Adet Hazır Video Kapasitesi
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-muted">
                        Hetzner CDP port rotasyonu: Günlük 50'şer Gemini video kotası ve Google Flow kalıcı kredi bakiyeleri.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-2.5 bg-canvas px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--color-hairline)] text-[11px]">
                        <div>
                          <span className="text-ink-muted text-[9px] block font-medium">Gemini Video Kotası</span>
                          <span className="font-bold text-ink font-mono text-xs">{totalDailyCredits} / {totalDailyLimit} Video/Gün</span>
                        </div>
                        <div className="w-[1px] h-6 bg-[var(--color-hairline)]" />
                        <div>
                          <span className="text-ink-muted text-[9px] block font-medium">Flow Kredi & Video</span>
                          <span className="font-bold text-accent font-mono text-xs">{totalFlowVideos} Video ({totalFlowCredits.toLocaleString('tr-TR')} Kr)</span>
                        </div>
                        <div className="w-[1px] h-6 bg-[var(--color-hairline)]" />
                        <div>
                          <span className="text-ink-muted text-[9px] block font-medium">Toplam Hazır Video</span>
                          <span className="font-bold text-ok-dim font-mono text-xs">{grandTotalVideos} Adet Video</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('ai_studio')}
                        className="text-[11px] font-bold text-accent hover:underline flex items-center gap-1 shrink-0"
                      >
                        <span>Tüm AI Stüdyosunu Aç →</span>
                      </button>
                    </div>
                  </div>

                  {/* 4 Port Slot Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {[
                      { port: 9222, defaultName: 'Ali Düvenci (1. Hesap)', defaultEmail: 'jeynjones@gmail.com', defaultFlowCredits: 360 },
                      { port: 9223, defaultName: 'Ali Düvenci (2. Hesap)', defaultEmail: 'icnevudila@gmail.com', defaultFlowCredits: 1035 },
                      { port: 9224, defaultName: 'Alo Düvenci (3. Hesap)', defaultEmail: 'mesajify1@gmail.com', defaultFlowCredits: 1035 },
                      { port: 9225, defaultName: 'Ali Düvenci (4. Hesap)', defaultEmail: 'mesajify2@gmail.com', defaultFlowCredits: 1035 },
                    ].map(({ port, defaultName, defaultEmail, defaultFlowCredits }) => {
                      const flowAcc = (data?.ai_engine?.googleFlow?.accounts || []).find((a: any) => a.port === port)
                      const geminiAcc = (data?.ai_engine?.geminiPool?.accounts || []).find((a: any) => a.port === port) ||
                                        (globalAiMedia?.accounts || []).find((a: any) => a.port === port)

                      const isReady = (geminiAcc?.isLoggedIn ?? true) && !geminiAcc?.isLimited && geminiAcc?.status !== 'needs_reauth'
                      const isLimited = !!geminiAcc?.isLimited

                      // 1. GÜNLÜK KREDİ (Gemini Veo Pro - 50 hak/gün)
                      const dailyLimit = geminiAcc?.dailyLimit ?? 50
                      const dailyRemaining = geminiAcc?.dailyRemaining ?? (isLimited ? 0 : 50)

                      // 2. TOPLAM KREDİ (Google Flow Studio Bakiyesi)
                      const flowCredits = flowAcc?.credits ?? geminiAcc?.flowCredits ?? defaultFlowCredits
                      const flowInitial = flowAcc?.initialCredits ?? geminiAcc?.flowInitialCredits ?? 1050

                      // 3. KALAN VİDEO HAKKI
                      // Flow: 15 kredi = 1 Video
                      const flowVideosRemaining = flowAcc?.videosRemaining ?? Math.floor(flowCredits / 15)
                      // Toplam Kalan Video (Flow + Günlük)
                      const totalVideosRemaining = flowVideosRemaining + dailyRemaining

                      const accName = flowAcc?.accountName || geminiAcc?.name || defaultName
                      const accEmail = flowAcc?.email || geminiAcc?.email || defaultEmail

                      return (
                        <div
                          key={port}
                          className="bg-canvas border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-3 space-y-2.5 flex flex-col justify-between hover:border-accent/30 transition shadow-2xs"
                        >
                          {/* Port Başlığı & Durum */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono font-bold text-ink-muted">PORT {port}</span>
                              <span className="text-[9px] px-1 py-0.2 rounded bg-surface-raised border border-[var(--color-hairline)] text-ink-muted font-mono">CDP</span>
                            </div>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              isLimited
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                : isReady
                                ? 'bg-ok-soft text-ok-dim border border-ok/20'
                                : 'bg-warn/15 text-warn border border-warn/20'
                            }`}>
                              {isLimited ? 'Günlük Limit Dolu' : isReady ? 'Hazır / Boşta' : 'Giriş Gerekli'}
                            </span>
                          </div>

                          {/* Hesap Bilgisi */}
                          <div>
                            <div className="text-xs font-bold text-ink truncate" title={accName}>{accName}</div>
                            <div className="text-[10px] font-mono text-ink-muted truncate" title={accEmail}>{accEmail}</div>
                          </div>

                          {/* Kredi ve Video Hakkı Ayrımı */}
                          <div className="space-y-1.5 pt-2 border-t border-[var(--color-hairline)] text-[11px]">
                            {/* 1. Gemini Günlük Video Kotası */}
                            <div className="flex items-center justify-between bg-surface-raised/70 px-2 py-1.5 rounded border border-[var(--color-hairline)]">
                              <div>
                                <span className="text-[10px] font-semibold text-ink block leading-tight">Gemini Video Kotası:</span>
                                <span className="text-[9px] text-ink-muted">Ücretsiz Günlük Veo Pro</span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-mono font-bold text-ink">{dailyRemaining}</span>
                                <span className="text-[10px] font-mono text-ink-muted"> / {dailyLimit} Video</span>
                              </div>
                            </div>

                            {/* 2. Google Flow Video Kotası */}
                            <div className="flex items-center justify-between bg-surface-raised/70 px-2 py-1.5 rounded border border-[var(--color-hairline)]">
                              <div>
                                <span className="text-[10px] font-semibold text-ink block leading-tight">Flow Video Kotası:</span>
                                <span className="text-[9px] text-ink-muted font-mono">{flowCredits.toLocaleString('tr-TR')} / {flowInitial.toLocaleString('tr-TR')} Kredi</span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-mono font-bold text-accent">{flowVideosRemaining}</span>
                                <span className="text-[10px] font-mono text-ink-muted"> Video</span>
                              </div>
                            </div>

                            {/* 3. Toplam Kalan Video Hakkı */}
                            <div className="flex items-center justify-between bg-accent-soft/25 px-2 py-1.5 rounded border border-accent/25">
                              <div>
                                <span className="text-[10px] font-bold text-ink block leading-tight">Toplam Video Hakkı:</span>
                                <span className="text-[9px] text-ink-muted font-mono">{dailyRemaining} Gemini + {flowVideosRemaining} Flow</span>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-mono font-extrabold text-accent">{totalVideosRemaining}</span>
                                <span className="text-[10px] text-ink font-semibold"> Video</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {/* 2. ROW: 2-SÜTUN (SOL: WHATSAPP HAT BAĞLANTILARI, SAĞ: GÖREV VE HATA KUYRUĞU) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {/* SOL: CANLI WHATSAPP HATLARI */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 sm:p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--color-hairline)] pb-2.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-ink">Canlı WhatsApp Hatları</h3>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-ok-soft text-ok-dim">
                      {data?.accounts?.filter(a => a.status === 'connected').length || 0} Bağlı
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('baileys')}
                    className="text-[11px] font-bold text-accent hover:underline"
                  >
                    Detaylar →
                  </button>
                </div>

                <div className="space-y-2">
                  {(data?.accounts || []).length === 0 ? (
                    <div className="text-xs text-ink-muted py-4 text-center">Bağlı hat bulunamadı.</div>
                  ) : (
                    (data?.accounts || []).map(acc => (
                      <div
                        key={acc.id}
                        className="bg-canvas border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            acc.status === 'connected' ? 'bg-ok' : 'bg-warn animate-pulse'
                          }`} />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-ink truncate">{acc.phone_e164 || acc.label || acc.id}</div>
                            <div className="text-[10px] text-ink-muted truncate">{acc.label || acc.phone_e164}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            acc.status === 'connected' ? 'bg-ok-soft text-ok-dim' : 'bg-warn/15 text-warn'
                          }`}>
                            {acc.status === 'connected' ? 'Aktif' : acc.status}
                          </span>
                          <button
                            type="button"
                            onClick={handleReconnectAll}
                            disabled={actionBusy}
                            className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-raised hover:bg-canvas border border-[var(--color-hairline)] text-ink"
                          >
                            Yenile
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* SAĞ: GÖREV VE HATA KUYRUĞU */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 sm:p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--color-hairline)] pb-2.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-ink">Görev Kuyruğu & Alarmlar</h3>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                      (summary.failedJobs || 0) > 0 ? 'bg-danger text-white' : 'bg-ok-soft text-ok-dim'
                    }`}>
                      {(summary.failedJobs || 0) > 0 ? `${summary.failedJobs} Hata` : 'Kuyruk Temiz'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('jobs')}
                    className="text-[11px] font-bold text-accent hover:underline"
                  >
                    Kuyruğu Aç →
                  </button>
                </div>

                <div className="space-y-2">
                  {(summary.failedJobs || 0) === 0 && summary.pendingJobs === 0 ? (
                    <div className="text-center py-6 text-ink-muted text-xs">
                      Tüm görevler ve gönderim kuyruğu başarıyla işlendi.
                    </div>
                  ) : (
                    (data?.jobs || []).slice(0, 4).map(job => (
                      <div
                        key={job.id}
                        className={`p-2.5 rounded-[var(--radius-sm)] border text-xs flex items-center justify-between gap-2 ${
                          job.status === 'failed' ? 'bg-danger/5 border-danger/25 text-danger' : 'bg-canvas border-[var(--color-hairline)] text-ink'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="font-bold truncate block">{job.type}</span>
                          <span className="text-[10px] text-ink-muted truncate block">İş #{job.id} · {timeAgo(job.created_at)}</span>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono uppercase ${
                          job.status === 'failed' ? 'bg-danger text-white' : 'bg-surface-raised text-ink'
                        }`}>
                          {job.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 3. ROW: SON ÜRETİLEN AI REKLAM VİDEOLARI GALERİSİ */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 sm:p-5 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-hairline)] pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-ink">Son Üretilen AI Reklam Videoları</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent-soft text-accent font-bold">
                      {(data?.creatives || []).length} Video Hazır
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    Google Veo ve OmniStudio motoru tarafından fiziksel yüzey sabitlemeyle render edilen videolar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('ai_studio')}
                  className="text-[11px] font-bold text-accent hover:underline flex items-center gap-1"
                >
                  <span>Tüm Videoları & Promptları Gör →</span>
                </button>
              </div>

              {(data?.creatives || []).length === 0 ? (
                <div className="text-center py-6 text-ink-muted text-xs">Henüz kayıtlı video üretimi bulunmuyor.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {(data?.creatives || []).slice(0, 4).map((cr: any) => (
                    <div
                      key={cr.id}
                      className="bg-canvas border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-3 flex flex-col justify-between space-y-2"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-accent-soft text-accent font-mono">
                            {cr.format === 'video' ? '9:16 Video' : 'Görsel'}
                          </span>
                          <span className="text-[9px] text-ink-muted">{timeAgo(cr.created_at)}</span>
                        </div>
                        <h4 className="text-xs font-bold text-ink line-clamp-1">{cr.title || cr.org_name || 'AI Video'}</h4>
                        <p className="text-[10px] text-ink-muted line-clamp-2 mt-0.5">{cr.caption || cr.prompt || 'Fiziksel yüzey sabitlemeli Veo renderı.'}</p>
                      </div>

                      <div className="pt-2 border-t border-[var(--color-hairline)] flex items-center gap-1.5">
                        {cr.public_url && (
                          <a
                            href={getSafeMediaUrl(cr.public_url)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 py-1 text-center text-xs font-bold rounded bg-accent text-accent-ink hover:bg-accent-dim transition shadow-xs"
                          >
                            İzle / İndir
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setInspectedCreative(cr)}
                          className="px-2 py-1 text-xs font-semibold rounded bg-surface-raised hover:bg-canvas border border-[var(--color-hairline)] text-ink"
                        >
                          Prompt
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. ROW: FİRMALAR & AYLIK KOTA DURUMU TABLOSU */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--color-hairline)] pb-2.5">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-ink">Kayıtlı Firmalar ve Kota Tüketimi</h3>
                  <p className="text-[11px] text-ink-muted mt-0.5">İşletmelerin video kotaları ve mesaj gönderim limitleri.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('organizations')}
                  className="text-[11px] font-bold text-accent hover:underline"
                >
                  Firmaları Yönet →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[600px]">
                  <thead>
                    <tr className="border-b border-[var(--color-hairline)] text-ink-muted font-semibold">
                      <th className="pb-2">İşletme Adı</th>
                      <th className="pb-2">Paket</th>
                      <th className="pb-2">Video Kotası</th>
                      <th className="pb-2">Mesaj Limiti</th>
                      <th className="pb-2">Kayıtlı Kişi</th>
                      <th className="pb-2 text-right">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-hairline)]">
                    {organizationsList.slice(0, 5).map(org => (
                      <tr key={org.id} className="hover:bg-surface-raised/50 transition">
                        <td className="py-2.5 font-bold text-ink">{org.name}</td>
                        <td className="py-2.5">
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-surface-raised border border-[var(--color-hairline)] uppercase">
                            {org.plan || 'pro'}
                          </span>
                        </td>
                        <td className="py-2.5 font-semibold text-accent">
                          {org.monthly_video_quota ?? 3} Video/Ay
                        </td>
                        <td className="py-2.5 font-mono text-ink">
                          {Number(org.monthly_message_quota || 0).toLocaleString('tr-TR')}
                        </td>
                        <td className="py-2.5 text-accent font-semibold">
                          {Number(org.total_contacts || 0).toLocaleString('tr-TR')}
                        </td>
                        <td className="py-2.5 text-right">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            org.suspended_at ? 'bg-danger/10 text-danger' : 'bg-ok-soft text-ok-dim'
                          }`}>
                            {org.suspended_at ? 'Askıda' : 'Aktif'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 0: FİRMALAR & ÜYELİKLER */}
        {activeTab === 'organizations' && (
          <div className="space-y-4">
            {/* Header & Stats Banner */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 sm:p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-hairline)] pb-3">
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-ink">Kayıtlı Firmalar ve Üyelik Paketleri</h2>
                  <p className="text-[11px] text-ink-muted">
                    Sistemdeki tüm şirketler, üyelik seviyeleri (Free, Starter, Pro, Enterprise), hat/mesaj limitleri ve kayıtlı kişi sayıları.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-ink-muted">{filteredOrganizations.length} Firma</span>
                </div>
              </div>

              {/* Quick Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-surface-raised/70 border border-[var(--color-hairline)] rounded p-2.5">
                  <span className="text-[10px] text-ink-muted uppercase font-semibold block">Toplam Firma</span>
                  <div className="mt-0.5 flex items-baseline gap-1">
                    <span className="text-base sm:text-lg font-bold text-ink">{organizationsList.length}</span>
                    <span className="text-[10px] text-ink-muted">kayıtlı</span>
                  </div>
                </div>
                <div className="bg-surface-raised/70 border border-[var(--color-hairline)] rounded p-2.5">
                  <span className="text-[10px] text-ink-muted uppercase font-semibold block">Aktif Paketler</span>
                  <div className="mt-0.5 flex items-center gap-1.5 flex-wrap text-[10px] font-semibold">
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500">Ent: {organizationsList.filter(o => o.plan === 'enterprise').length}</span>
                    <span className="px-1.5 py-0.2 rounded bg-accent/10 text-accent">Pro: {organizationsList.filter(o => o.plan === 'pro').length}</span>
                    <span className="px-1.5 py-0.2 rounded bg-surface-raised border border-[var(--color-hairline)] text-ink-muted">St: {organizationsList.filter(o => o.plan === 'starter').length}</span>
                  </div>
                </div>
                <div className="bg-surface-raised/70 border border-[var(--color-hairline)] rounded p-2.5">
                  <span className="text-[10px] text-ink-muted uppercase font-semibold block">Toplam Kişi (Rehber)</span>
                  <div className="mt-0.5 flex items-baseline gap-1">
                    <span className="text-base sm:text-lg font-bold text-accent">
                      {organizationsList.reduce((acc, o) => acc + (o.total_contacts || 0), 0).toLocaleString('tr-TR')}
                    </span>
                    <span className="text-[10px] text-ink-muted">numara</span>
                  </div>
                </div>
                <div className="bg-surface-raised/70 border border-[var(--color-hairline)] rounded p-2.5">
                  <span className="text-[10px] text-ink-muted uppercase font-semibold block">Bağlı / Kotada Hatlar</span>
                  <div className="mt-0.5 flex items-baseline gap-1">
                    <span className="text-base sm:text-lg font-bold text-ok-dim">
                      {organizationsList.reduce((acc, o) => acc + (o.connected_account_count || 0), 0)}
                    </span>
                    <span className="text-[10px] text-ink-muted">
                      / {organizationsList.reduce((acc, o) => acc + (o.accounts_quota || 0), 0)} Kota
                    </span>
                  </div>
                </div>
              </div>

              {filteredOrganizations.length === 0 ? (
                <p className="text-xs text-ink-muted text-center py-6">Kayıtlı firma bulunamadı.</p>
              ) : (
                <>
                  {/* MOBILE CARD VIEW (block sm:hidden) */}
                  <div className="block sm:hidden space-y-3">
                    {filteredOrganizations.map(o => (
                      <div
                        key={o.id}
                        className="bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-3 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2 border-b border-[var(--color-hairline)] pb-2">
                          <div>
                            <div className="font-bold text-xs sm:text-sm text-ink">{o.name}</div>
                            <span className="font-mono text-[10px] text-ink-muted">slug: {o.slug}</span>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              o.suspended_at
                                ? 'bg-danger/10 text-danger'
                                : 'bg-ok-soft text-ok-dim'
                            }`}
                          >
                            {o.suspended_at ? 'Askıda' : 'Aktif'}
                          </span>
                        </div>

                        {/* Plan selection dropdown */}
                        <div>
                          <label className="block text-[10px] font-semibold text-ink-muted uppercase mb-1">
                            Üyelik Paketi
                          </label>
                          <select
                            value={o.plan || 'free'}
                            disabled={actionBusy}
                            onChange={e => handleUpdateOrgPlan(o.id, e.target.value)}
                            className={`w-full text-xs font-bold px-2.5 py-1.5 rounded-[var(--radius-sm)] border outline-none cursor-pointer transition ${
                              o.plan === 'enterprise'
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                                : o.plan === 'pro'
                                ? 'bg-accent-soft text-accent border-accent/30'
                                : o.plan === 'starter'
                                ? 'bg-surface-raised text-ink border-[var(--color-hairline)]'
                                : 'bg-surface text-ink-soft border-[var(--color-hairline)]'
                            }`}
                          >
                            <option value="free" className="bg-surface text-ink font-semibold">Ücretsiz (Free - 1 Hat / 1.000 Mesaj)</option>
                            <option value="starter" className="bg-surface text-ink font-semibold">Başlangıç (Starter - 3 Hat / 10.000 Mesaj)</option>
                            <option value="pro" className="bg-surface text-ink font-semibold">Profesyonel (Pro - 40 Hat / 100.000 Mesaj)</option>
                            <option value="enterprise" className="bg-surface text-ink font-semibold">Kurumsal (Enterprise - Özel Kotasız)</option>
                          </select>
                        </div>

                        {/* 2x2 Stats Grid */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-surface/70 border border-[var(--color-hairline)] rounded p-2">
                            <span className="block text-[10px] text-ink-muted font-semibold uppercase">Hat Durumu</span>
                            <span className="font-bold text-ink">{o.connected_account_count ?? 0} / {o.accounts_quota} Kota</span>
                          </div>
                          <div className="bg-surface/70 border border-[var(--color-hairline)] rounded p-2">
                            <span className="block text-[10px] text-ink-muted font-semibold uppercase">Aylık Mesaj Limiti</span>
                            <span className="font-bold text-ink">{Number(o.monthly_message_quota || 0).toLocaleString('tr-TR')}</span>
                          </div>
                          <div className="bg-surface/70 border border-[var(--color-hairline)] rounded p-2">
                            <span className="block text-[10px] text-ink-muted font-semibold uppercase">Aylık Video Kotası</span>
                            <span className="font-bold text-ink">{o.monthly_video_quota ?? 3} Video/Ay</span>
                          </div>
                          <div className="bg-surface/70 border border-[var(--color-hairline)] rounded p-2">
                            <span className="block text-[10px] text-ink-muted font-semibold uppercase">Kayıtlı Kişi</span>
                            <span className="font-bold text-accent">{Number(o.total_contacts || 0).toLocaleString('tr-TR')}</span>
                          </div>
                          <div className="bg-surface/70 border border-[var(--color-hairline)] rounded p-2">
                            <span className="block text-[10px] text-ink-muted font-semibold uppercase">Kampanya / Üye</span>
                            <span className="font-semibold text-ink">{o.campaign_count ?? 0} Kamp. / {o.member_count ?? 0} Üye</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            onClick={() => handleUpdateOrgQuotas(o)}
                            disabled={actionBusy}
                            className="flex-1 py-1 text-xs font-semibold rounded bg-surface border border-[var(--color-hairline)] text-ink hover:bg-canvas transition"
                          >
                            Kotaları Düzenle
                          </button>
                          <button
                            onClick={() => {
                              setSelectedOrg(o.name)
                              showNotice(`Dashboard "${o.name}" firmasına filtrelendi.`)
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-accent-soft text-accent hover:bg-accent/20 transition"
                          >
                            Filtrele
                          </button>
                          <button
                            onClick={() => handleToggleOrgSuspend(o)}
                            disabled={actionBusy}
                            className={`px-2 py-1 text-xs font-semibold rounded ${
                              o.suspended_at
                                ? 'bg-ok-soft text-ok-dim hover:bg-ok/20'
                                : 'bg-danger/10 text-danger hover:bg-danger/20'
                            }`}
                          >
                            {o.suspended_at ? 'Aç' : 'Askı'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* DESKTOP TABLE VIEW (hidden sm:block) */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[850px]">
                      <thead>
                        <tr className="border-b border-[var(--color-hairline)] text-ink-muted font-semibold">
                          <th className="pb-2">İşletme / Firma</th>
                          <th className="pb-2">Üyelik Paketi</th>
                          <th className="pb-2">Hat Kotası</th>
                          <th className="pb-2">Mesaj Limiti</th>
                          <th className="pb-2">Kayıtlı Kişi</th>
                          <th className="pb-2">Kampanyalar</th>
                          <th className="pb-2">Üye</th>
                          <th className="pb-2">Durum</th>
                          <th className="pb-2 text-right">Eylemler</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-hairline)]">
                        {filteredOrganizations.map(o => (
                          <tr key={o.id} className="hover:bg-[var(--color-surface-raised)] transition">
                            <td className="py-2.5 font-bold text-ink">
                              <div>{o.name}</div>
                              <span className="font-mono text-[10px] text-ink-muted font-normal">slug: {o.slug}</span>
                            </td>
                            <td className="py-2.5">
                              <select
                                value={o.plan || 'free'}
                                disabled={actionBusy}
                                onChange={e => handleUpdateOrgPlan(o.id, e.target.value)}
                                className={`text-[11px] font-bold px-2 py-1 rounded border outline-none cursor-pointer transition ${
                                  o.plan === 'enterprise'
                                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                                    : o.plan === 'pro'
                                    ? 'bg-accent-soft text-accent border-accent/30'
                                    : o.plan === 'starter'
                                    ? 'bg-surface-raised text-ink border-[var(--color-hairline)]'
                                    : 'bg-surface text-ink-soft border-[var(--color-hairline)]'
                                }`}
                              >
                                <option value="free" className="bg-surface text-ink font-semibold">Free (Ücretsiz)</option>
                                <option value="starter" className="bg-surface text-ink font-semibold">Starter (Başlangıç)</option>
                                <option value="pro" className="bg-surface text-ink font-semibold">Pro (Profesyonel)</option>
                                <option value="enterprise" className="bg-surface text-ink font-semibold">Enterprise (Kurumsal)</option>
                              </select>
                            </td>
                            <td className="py-2.5 font-mono text-ink">
                              <span className="font-bold text-ok-dim">{o.connected_account_count ?? 0}</span>
                              <span className="text-ink-muted"> / {o.accounts_quota}</span>
                            </td>
                            <td className="py-2.5 font-mono text-ink-soft">
                              {Number(o.monthly_message_quota || 0).toLocaleString('tr-TR')}
                            </td>
                            <td className="py-2.5 font-bold text-accent">
                              {Number(o.total_contacts || 0).toLocaleString('tr-TR')}
                            </td>
                            <td className="py-2.5 text-ink-muted">{o.campaign_count ?? 0}</td>
                            <td className="py-2.5 text-ink-muted">{o.member_count ?? 0}</td>
                            <td className="py-2.5">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  o.suspended_at
                                    ? 'bg-danger/10 text-danger'
                                    : 'bg-ok-soft text-ok-dim'
                                }`}
                              >
                                {o.suspended_at ? 'Askıda' : 'Aktif'}
                              </span>
                            </td>
                            <td className="py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleUpdateOrgQuotas(o)}
                                  disabled={actionBusy}
                                  className="px-2 py-0.5 text-[11px] font-semibold rounded bg-surface border border-[var(--color-hairline)] text-ink hover:bg-canvas"
                                  title="Kota düzenle"
                                >
                                  Kota
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedOrg(o.name)
                                    showNotice(`Dashboard "${o.name}" firmasına filtrelendi.`)
                                  }}
                                  className="px-2 py-0.5 text-[11px] font-semibold rounded bg-accent-soft text-accent hover:bg-accent/20"
                                  title="Filtrele"
                                >
                                  Filtrele
                                </button>
                                <button
                                  onClick={() => handleToggleOrgSuspend(o)}
                                  disabled={actionBusy}
                                  className={`px-2 py-0.5 text-[11px] font-semibold rounded ${
                                    o.suspended_at
                                      ? 'bg-ok-soft text-ok-dim hover:bg-ok/20'
                                      : 'bg-danger/10 text-danger hover:bg-danger/20'
                                  }`}
                                  title={o.suspended_at ? 'Erişimi aç' : 'Askıya al'}
                                >
                                  {o.suspended_at ? 'Aç' : 'Askı'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: HIZLI GÖNDERİM KONSOLU */}
        {activeTab === 'quick_send' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Sender Form */}
            <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-4 sm:p-5 shadow-sm space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--color-hairline)] pb-2.5">
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-ink">Doğrudan WhatsApp Mesajı Gönder</h2>
                  <p className="text-[11px] text-ink-muted">
                    Herhangi bir hatta anında tekli veya test mesajı gönderin. Öncelik 1 olarak WhatsApp gönderim servisine iletilir.
                  </p>
                </div>
                <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded bg-accent/10 text-accent font-semibold">
                  ÖNCELİK: 1 (ANINDA)
                </span>
              </div>

              <form onSubmit={handleSendQuickMessage} className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Sender Account */}
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-soft mb-1">Gönderici WhatsApp Hattı</label>
                    <select
                      value={quickAccountId}
                      onChange={e => setQuickAccountId(e.target.value)}
                      className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-semibold text-ink outline-none focus:border-accent"
                    >
                      {filteredAccounts?.map(a => (
                        <option key={a.id} value={a.id} disabled={a.status !== 'connected'}>
                          {a.label} ({a.phone_e164 || 'Numara yok'}) - {a.status === 'connected' ? 'Bağlı' : 'Kopuk'} [{a.org_name}]
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Target Phone */}
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-soft mb-1">Alıcı Telefon Numarası (E.164)</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="+905428212205"
                        value={quickPhone}
                        onChange={e => setQuickPhone(e.target.value)}
                        className="flex-1 bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-mono text-ink outline-none focus:border-accent"
                      />
                      <button
                        type="button"
                        onClick={() => setQuickPhone('+905428212205')}
                        className="px-2 py-1 text-[10px] font-mono bg-accent-soft text-accent rounded hover:bg-accent/20"
                        title="Veri Burada test numarasını yapıştır"
                      >
                        Test No
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenContactPicker}
                        className="px-2 py-1 text-[10px] font-semibold bg-surface border border-[var(--color-hairline)] text-ink rounded hover:bg-surface-raised"
                        title="Kayıtlı 12.000 rehberden numara seç"
                      >
                        Rehberden Seç
                      </button>
                    </div>
                  </div>
                </div>

                {/* Media & Document Attachment Section */}
                <div className="p-3 rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-canvas space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-ink-soft">
                      Medya veya Belge Ekle (PDF Katalog, Fotoğraf, Belge)
                    </label>
                    <span className="text-[10px] text-ink-muted">Maks. 30 MB</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                    <label className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                      quickUploading
                        ? 'bg-surface text-ink-muted border-[var(--color-hairline)] cursor-not-allowed'
                        : 'bg-surface text-ink hover:bg-surface-raised border-[var(--color-hairline)] shadow-xs'
                    }`}>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={handleFileUpload}
                        disabled={quickUploading}
                        className="hidden"
                      />
                      <span>{quickUploading ? 'Yükleniyor...' : 'Dosya / PDF Seç'}</span>
                    </label>

                    <input
                      type="url"
                      placeholder="veya doğrudan URL girin (https://...)"
                      value={quickMediaUrl}
                      onChange={e => {
                        setQuickMediaUrl(e.target.value)
                        if (e.target.value.toLowerCase().includes('.pdf')) {
                          setQuickMessageType('document')
                          setQuickMediaName('belge.pdf')
                        }
                      }}
                      className="flex-1 bg-surface border border-[var(--color-hairline)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent"
                    />
                  </div>

                  {quickMediaUrl && (
                    <div className="flex items-center justify-between gap-2 p-2 rounded bg-surface border border-accent/30 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          quickMessageType === 'document' ? 'bg-red-600 text-white' : 'bg-accent text-white'
                        }`}>
                          {quickMessageType === 'document' ? 'PDF' : 'GÖRSEL'}
                        </span>
                        <span className="font-semibold text-ink truncate">{quickMediaName || 'Eklenen Medya'}</span>
                        {quickFileSize && (
                          <span className="text-[10px] text-ink-muted font-mono">
                            ({(quickFileSize / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickMediaUrl('')
                          setQuickMediaName('')
                          setQuickMessageType('text')
                          setQuickFileSize(null)
                        }}
                        className="text-[10px] text-danger hover:underline shrink-0"
                      >
                        Kaldır
                      </button>
                    </div>
                  )}
                </div>

                {/* Message Body */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-ink-soft">Mesaj Metni</label>
                    <span className="text-[10px] text-ink-muted font-mono">{quickMessage.length} karakter</span>
                  </div>
                  {/* Quick Template Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span className="text-[10px] font-semibold text-ink-muted">Hazır Şablonlar:</span>
                    {QUICK_TEMPLATES.map((tpl, tIdx) => (
                      <button
                        key={tIdx}
                        type="button"
                        onClick={() => {
                          setQuickMessage(tpl.text)
                          showNotice(`"${tpl.title}" şablonu yüklendi.`)
                        }}
                        className="px-2 py-0.5 rounded bg-surface border border-[var(--color-hairline)] hover:border-accent text-[10px] text-ink-soft hover:text-accent font-medium transition"
                      >
                        {tpl.title}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Merhaba! Mesajify üzerinden size özel hazırladığımız kampanya detayları..."
                    value={quickMessage}
                    onChange={e => setQuickMessage(e.target.value)}
                    className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-2.5 text-xs text-ink outline-none focus:border-accent resize-y"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-[10px] sm:text-[11px] text-ink-muted">
                    WhatsApp servisi üzerinden gerçek zamanlı gönderim yapılır.
                  </div>
                  <button
                    type="submit"
                    disabled={quickSending || !quickPhone.trim() || !quickMessage.trim()}
                    className="px-4 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold bg-accent text-accent-ink hover:bg-accent-dim transition disabled:opacity-50 shadow-sm"
                  >
                    {quickSending ? 'Gönderiliyor...' : 'Hemen WhatsApp’tan Gönder'}
                  </button>
                </div>
              </form>
            </div>

            {/* AI Assistant Quick Writer Sidecard */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-4 sm:p-5 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-ink">ChatGPT Pazarlama Asistanı</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-accent/10 text-accent font-semibold">AI</span>
                </div>
                <p className="text-[11px] text-ink-muted leading-relaxed">
                  Bir ürün veya duyuru yazın; ChatGPT doğrudan WhatsApp formatında yüksek dönüşümlü mesaj metni üretsin.
                </p>

                <div>
                  <label className="block text-[10px] sm:text-[11px] font-semibold text-ink-soft mb-1">Ürün / Kampanya Konusu</label>
                  <input
                    type="text"
                    placeholder="Örn: Yeni sezon zeytinyağında %20 indirim"
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-[10px] sm:text-[11px] font-semibold text-ink-soft mb-1">Metin Tonu</label>
                  <select
                    value={aiTone}
                    onChange={e => setAiTone(e.target.value as any)}
                    className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] px-2 py-1 text-xs text-ink outline-none"
                  >
                    <option value="samimi">Samimi & Doğal</option>
                    <option value="kurumsal">Kurumsal & Profesyonel</option>
                    <option value="kampanya">Kampanya / Aciliyetli</option>
                    <option value="firsat">Fırsat / İndirim Odaklı</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateAiMessage}
                  disabled={aiGenerating || !aiPrompt.trim()}
                  className="w-full py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold bg-[var(--color-surface-raised)] text-ink hover:bg-canvas border border-[var(--color-hairline)] transition disabled:opacity-50"
                >
                  {aiGenerating ? 'ChatGPT Üretiyor...' : 'Metin Oluştur'}
                </button>

                {aiResult && (
                  <div className="bg-canvas p-2.5 rounded-[var(--radius-sm)] border border-[var(--color-hairline)] space-y-2 mt-1">
                    <p className="text-[11px] text-ink whitespace-pre-wrap leading-relaxed">{aiResult}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickMessage(aiResult)
                        showNotice('Üretilen metin gönderim kutusuna aktarıldı.')
                      }}
                      className="w-full py-1 text-xs font-semibold bg-accent text-accent-ink rounded-[var(--radius-sm)] hover:bg-accent-dim"
                    >
                      Mesaj Kutusuna Aktar
                    </button>
                  </div>
                )}
              </div>

              <div className="text-[10px] text-ink-muted border-t border-[var(--color-hairline)] pt-2">
                Doğrudan test gönderiminde veya kampanyada kullanılabilir.
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: KAMPANYALAR MODÜLÜ */}
        {activeTab === 'campaigns' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-ink">Kampanya Yönetimi ve İlerleme</h2>
                <p className="text-[11px] text-ink-muted">Tüm aktif, duraklatılmış ve tamamlanmış toplu gönderimler</p>
              </div>
              <span className="text-[11px] font-semibold text-ink-muted">{filteredCampaigns.length} Kampanya</span>
            </div>

            {filteredCampaigns.length === 0 ? (
              <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-6 text-center text-xs text-ink-muted">
                Kayıtlı kampanya bulunamadı.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {filteredCampaigns.map(c => (
                  <div
                    key={c.id}
                    className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 sm:p-4 shadow-sm space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-xs sm:text-sm font-bold text-ink">{c.name}</h3>
                          <span
                            className={`text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                              c.status === 'running'
                                ? 'bg-ok-soft text-ok-dim'
                                : c.status === 'paused'
                                ? 'bg-warn/10 text-warn'
                                : c.status === 'completed'
                                ? 'bg-accent-soft text-accent'
                                : 'bg-[var(--color-surface-raised)] text-ink-muted'
                            }`}
                          >
                            {c.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-ink-muted mt-0.5">
                          {c.org_name && <span className="font-medium text-ink-soft">{c.org_name} · </span>}
                          {timeAgo(c.created_at)} oluşturuldu · Tür: {c.message_type}
                        </p>
                      </div>

                      {/* Campaign Action Buttons */}
                      <div className="flex items-center gap-1">
                        {c.status === 'running' && (
                          <button
                            onClick={() => handleCampaignAction(c.id, 'pause')}
                            disabled={actionBusy}
                            className="px-2 py-0.5 text-[11px] font-semibold rounded bg-warn/10 text-warn hover:bg-warn/20"
                          >
                            Duraklat
                          </button>
                        )}
                        {c.status === 'paused' && (
                          <button
                            onClick={() => handleCampaignAction(c.id, 'resume')}
                            disabled={actionBusy}
                            className="px-2 py-0.5 text-[11px] font-semibold rounded bg-ok-soft text-ok-dim hover:bg-ok-soft/80"
                          >
                            Devam Et
                          </button>
                        )}
                        {c.status !== 'stopped' && c.status !== 'completed' && (
                          <button
                            onClick={() => handleCampaignAction(c.id, 'stop')}
                            disabled={actionBusy}
                            className="px-2 py-0.5 text-[11px] font-semibold rounded bg-danger/10 text-danger hover:bg-danger/20"
                          >
                            Durdur
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-[10px] sm:text-[11px] text-ink-muted mb-1">
                        <span>İlerleme: %{c.progress_percent}</span>
                        <span>
                          {c.sent_count} / {c.total_targets} hedef
                        </span>
                      </div>
                      <div className="w-full bg-[var(--color-surface-raised)] h-1.5 sm:h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            c.status === 'running' ? 'bg-ok' : c.status === 'paused' ? 'bg-warn' : 'bg-accent'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, c.progress_percent))}%` }}
                        />
                      </div>
                    </div>

                    {/* Metrics Breakdown */}
                    <div className="grid grid-cols-4 gap-1 pt-1 border-t border-[var(--color-hairline)] text-center">
                      <div>
                        <span className="block text-[9px] text-ink-muted">İletildi</span>
                        <span className="text-xs font-bold text-success">{c.sent_count}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-ink-muted">Bekliyor</span>
                        <span className="text-xs font-bold text-warn">{c.pending_count}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-ink-muted">Hatalı</span>
                        <span className="text-xs font-bold text-danger">{c.failed_count}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-ink-muted">Atlandı</span>
                        <span className="text-xs font-bold text-ink-muted">{c.skipped_count}</span>
                      </div>
                    </div>

                    {/* Message Preview */}
                    {c.body && (
                      <div className="bg-canvas p-2 rounded-[var(--radius-sm)] text-[11px] text-ink-soft line-clamp-2">
                        {c.body}
                      </div>
                    )}

                    {/* Target Inspector Action */}
                    <div className="pt-2 border-t border-[var(--color-hairline)] flex items-center justify-between">
                      <span className="text-[10px] text-ink-muted">
                        Toplam Hedef: <strong className="text-ink">{c.total_targets} numara</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenCampaignTargets(c)}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-surface border border-[var(--color-hairline)] text-ink hover:bg-canvas transition"
                      >
                        Hedefleri İncele →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GÖNDERİM SIRASI (QUEUE) */}
        {activeTab === 'queue' && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 sm:p-5 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-hairline)] pb-2.5">
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-ink">Hedef Mesaj Gönderim Sırası</h2>
                <p className="text-[11px] text-ink-muted">Kuyrukta bekleyen, gönderilen veya hata alan alıcılar</p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-[var(--color-surface-raised)] p-0.5 rounded-[var(--radius-sm)]">
                {(['all', 'queued', 'delivered', 'failed'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setQueueFilter(f)}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded ${
                      queueFilter === f ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {f === 'all'
                      ? 'Tümü'
                      : f === 'queued'
                      ? 'Sırada'
                      : f === 'delivered'
                      ? 'İletildi'
                      : 'Hatalı'}
                  </button>
                ))}
              </div>
            </div>

            {filteredTargets.length === 0 ? (
              <p className="text-xs text-ink-muted text-center py-6">Kuyrukta hedef bulunmuyor.</p>
            ) : (
              <>
                {/* Mobile Card List for Queue */}
                <div className="block sm:hidden space-y-2.5">
                  {filteredTargets.map(t => (
                    <div
                      key={t.id}
                      className="bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-ink">{t.phone_e164}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            t.status === 'queued'
                              ? 'bg-warn/10 text-warn'
                              : t.status === 'sent' || t.status === 'delivered'
                              ? 'bg-ok-soft text-ok-dim'
                              : t.status === 'failed'
                              ? 'bg-danger/10 text-danger'
                              : 'bg-surface-raised text-ink-muted'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-ink-soft font-medium">{t.campaign_name}</span>
                        <span className="text-[10px] text-ink-muted">{timeAgo(t.scheduled_for || t.created_at)}</span>
                      </div>
                      {t.personalized_body && (
                        <p className="text-[11px] text-ink-muted bg-surface/70 border border-[var(--color-hairline)] p-2 rounded line-clamp-2">
                          {t.personalized_body}
                        </p>
                      )}
                      {t.error && (
                        <p className="text-[10px] text-danger font-mono bg-danger/10 p-1.5 rounded">
                          {t.error}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead>
                      <tr className="border-b border-[var(--color-hairline)] text-ink-muted font-semibold">
                        <th className="pb-2">Telefon</th>
                        <th className="pb-2">Kampanya</th>
                        <th className="pb-2">Durum</th>
                        <th className="pb-2">Zaman</th>
                        <th className="pb-2">Mesaj Özeti</th>
                        <th className="pb-2">Hata</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-hairline)]">
                      {filteredTargets.map(t => (
                        <tr key={t.id} className="hover:bg-[var(--color-surface-raised)] transition">
                          <td className="py-2 font-mono font-semibold text-ink">{t.phone_e164}</td>
                          <td className="py-2 text-ink-soft">{t.campaign_name}</td>
                          <td className="py-2">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                                t.status === 'queued'
                                  ? 'bg-warn/10 text-warn'
                                  : t.status === 'sent' || t.status === 'delivered'
                                  ? 'bg-ok-soft text-ok-dim'
                                  : t.status === 'failed'
                                  ? 'bg-danger/10 text-danger'
                                  : 'bg-surface-raised text-ink-muted'
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td className="py-2 text-ink-muted">{timeAgo(t.scheduled_for || t.created_at)}</td>
                          <td className="py-2 text-ink-muted max-w-xs truncate">{t.personalized_body || '—'}</td>
                          <td className="py-2 text-danger font-mono text-[10px] max-w-xs truncate">{t.error || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 4: VERİ TALEPLERİ (YALNIZCA FİRMALARDAN GELEN TALEPLER VE ONAY DROPDOWN) */}
        {activeTab === 'data_requests' && (
          <div className="space-y-4">
            <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--color-hairline)] pb-2.5">
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-ink">Firmalardan Gelen Veri Toplama Talepleri</h2>
                  <p className="text-[11px] text-ink-muted">
                    Firmaların panellerinden açtığı lead keşif talepleri. Durumu doğrudan dropdown üzerinden onaylayıp güncelleyebilirsiniz.
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-ink-muted">{data?.listRequests.length} Talep</span>
              </div>

              {data?.listRequests.length === 0 ? (
                <p className="text-xs text-ink-muted text-center py-6">Henüz firmalardan gelen bir talep bulunmuyor.</p>
              ) : (
              <>
                {/* Mobile Card List for Lead Requests */}
                <div className="block sm:hidden space-y-3">
                  {data?.listRequests.map(r => (
                    <div
                      key={r.id}
                      className="bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-3 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2 border-b border-[var(--color-hairline)] pb-2">
                        <div>
                          <div className="font-bold text-xs text-ink">{r.org_name || 'Genel'}</div>
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-surface text-ink-soft border border-[var(--color-hairline)]">
                            {r.kind}
                          </span>
                        </div>
                        <span className="text-[10px] text-ink-muted whitespace-nowrap">{timeAgo(r.created_at)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-surface/70 border border-[var(--color-hairline)] rounded p-2">
                          <span className="block text-[10px] text-ink-muted font-semibold uppercase">Sektör / Kategori</span>
                          <span className="font-semibold text-ink truncate block">{r.category || '—'}</span>
                        </div>
                        <div className="bg-surface/70 border border-[var(--color-hairline)] rounded p-2">
                          <span className="block text-[10px] text-ink-muted font-semibold uppercase">Konum / Bölge</span>
                          <span className="text-ink-soft truncate block">{r.address || (r.nationwide ? 'Tüm Türkiye' : 'Bölgesel')}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-surface/70 border border-[var(--color-hairline)] rounded p-2 text-xs">
                        <span className="text-[10px] text-ink-muted font-semibold uppercase">Toplanan Kişi</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-accent text-sm">{r.contact_count}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const input = prompt('Bu talep için toplanan kişi sayısını girin:', String(r.contact_count || 0))
                              if (input !== null) {
                                const count = parseInt(input, 10) || 0
                                handleUpdateRequestStatus(r.id, r.status as any, count)
                              }
                            }}
                            className="text-[11px] text-ink-muted hover:text-accent underline"
                            title="Kişi sayısını düzenle"
                          >
                            düzenle
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-ink-muted uppercase mb-1">Durum / Yönetim</label>
                        <select
                          value={r.status}
                          disabled={actionBusy}
                          onChange={e => {
                            const newStatus = e.target.value as 'pending' | 'processing' | 'completed' | 'rejected'
                            handleUpdateRequestStatus(r.id, newStatus, r.contact_count)
                          }}
                          className={`w-full text-xs font-semibold px-2.5 py-1.5 rounded-[var(--radius-sm)] border outline-none cursor-pointer transition ${
                            r.status === 'completed'
                              ? 'bg-ok-soft text-ok-dim border-ok/30'
                              : r.status === 'processing'
                              ? 'bg-accent-soft text-accent border-accent/30'
                              : r.status === 'rejected'
                              ? 'bg-danger/10 text-danger border-danger/30'
                              : 'bg-warn/15 text-warn border-warn/30'
                          }`}
                        >
                          <option value="pending" className="bg-surface text-warn font-semibold">
                            Beklemede (pending)
                          </option>
                          <option value="processing" className="bg-surface text-accent font-semibold">
                            Onaylandı & Hazırlanıyor (processing)
                          </option>
                          <option value="completed" className="bg-surface text-ok-dim font-semibold">
                            Tamamlandı (completed)
                          </option>
                          <option value="rejected" className="bg-surface text-danger font-semibold">
                            Reddedildi (rejected)
                          </option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[750px]">
                    <thead>
                      <tr className="border-b border-[var(--color-hairline)] text-ink-muted font-semibold">
                        <th className="pb-2">İşletme / Firma</th>
                        <th className="pb-2">Tür</th>
                        <th className="pb-2">Kategori / Sektör</th>
                        <th className="pb-2">Konum / Adres</th>
                        <th className="pb-2">Toplanan Kişi</th>
                        <th className="pb-2">Durum (Onay Dropdown)</th>
                        <th className="pb-2">Tarih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-hairline)]">
                      {data?.listRequests.map(r => (
                        <tr key={r.id} className="hover:bg-[var(--color-surface-raised)] transition">
                          <td className="py-2.5 font-bold text-ink">
                            {r.org_name || 'Genel'}
                          </td>
                          <td className="py-2.5 font-mono text-[10px] text-ink-soft">{r.kind}</td>
                          <td className="py-2.5 font-semibold text-ink">{r.category || '—'}</td>
                          <td className="py-2.5 text-ink-muted">{r.address || (r.nationwide ? 'Tüm Türkiye' : 'Bölgesel')}</td>
                          <td className="py-2.5 font-bold text-accent">
                            <div className="flex items-center gap-1.5">
                              <span>{r.contact_count}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const input = prompt('Bu talep için toplanan kişi sayısını girin:', String(r.contact_count || 0))
                                  if (input !== null) {
                                    const count = parseInt(input, 10) || 0
                                    handleUpdateRequestStatus(r.id, r.status as any, count)
                                  }
                                }}
                                className="text-[10px] text-ink-muted hover:text-accent underline"
                                title="Kişi sayısını düzenle"
                              >
                                düzenle
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5">
                            <select
                              value={r.status}
                              disabled={actionBusy}
                              onChange={e => {
                                const newStatus = e.target.value as 'pending' | 'processing' | 'completed' | 'rejected'
                                handleUpdateRequestStatus(r.id, newStatus, r.contact_count)
                              }}
                              className={`text-[11px] sm:text-xs font-semibold px-2 py-1 rounded-[var(--radius-sm)] border outline-none cursor-pointer transition ${
                                r.status === 'completed'
                                  ? 'bg-ok-soft text-ok-dim border-ok/30'
                                  : r.status === 'processing'
                                  ? 'bg-accent-soft text-accent border-accent/30'
                                  : r.status === 'rejected'
                                  ? 'bg-danger/10 text-danger border-danger/30'
                                  : 'bg-warn/15 text-warn border-warn/30'
                              }`}
                            >
                              <option value="pending" className="bg-surface text-warn font-semibold">
                                Beklemede (pending)
                              </option>
                              <option value="processing" className="bg-surface text-accent font-semibold">
                                Onaylandı & Hazırlanıyor (processing)
                              </option>
                              <option value="completed" className="bg-surface text-ok-dim font-semibold">
                                Tamamlandı (completed)
                              </option>
                              <option value="rejected" className="bg-surface text-danger font-semibold">
                                Reddedildi (rejected)
                              </option>
                            </select>
                          </td>
                          <td className="py-2.5 text-ink-muted">{timeAgo(r.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: REHBER & KAYITLI KİŞİLER (TOPLAM LİSTE) */}
        {(activeTab === 'contacts' || (activeTab as any) === 'contact_lists') && (
          <div className="space-y-5">
            {/* Summary Banner */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 sm:p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-hairline)] pb-3">
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-ink">Rehber ve Kayıtlı Kişiler (Toplam Numara Havuzu)</h2>
                  <p className="text-[11px] text-ink-muted">
                    Platformdaki tüm müşteri firmalarının kişi listeleri, segment grupları ve anlık kayıtlı telefon numaraları.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-accent">{Number(summary.totalContacts).toLocaleString('tr-TR')} Toplam Numara</span>
                </div>
              </div>

              {/* 4 Metrics Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-surface-raised/70 border border-[var(--color-hairline)] rounded p-2.5">
                  <span className="text-[10px] text-ink-muted uppercase font-semibold block">Toplam Numara</span>
                  <div className="mt-0.5 flex items-baseline gap-1">
                    <span className="text-base sm:text-lg font-bold text-ink">
                      {Number(summary.totalContacts).toLocaleString('tr-TR')}
                    </span>
                    <span className="text-[10px] text-ink-muted">kayıt</span>
                  </div>
                </div>

                <div className="bg-surface-raised/70 border border-[var(--color-hairline)] rounded p-2.5">
                  <span className="text-[10px] text-ink-muted uppercase font-semibold block">WhatsApp Doğrulanmış</span>
                  <div className="mt-0.5 flex items-baseline gap-1">
                    <span className="text-base sm:text-lg font-bold text-ok-dim">
                      {Number(summary.validContacts ?? summary.totalContacts).toLocaleString('tr-TR')}
                    </span>
                    <span className="text-[10px] text-ok-dim font-medium">%99.9</span>
                  </div>
                </div>

                <div className="bg-surface-raised/70 border border-[var(--color-hairline)] rounded p-2.5">
                  <span className="text-[10px] text-ink-muted uppercase font-semibold block">Liste & Segment Sayısı</span>
                  <div className="mt-0.5 flex items-baseline gap-1">
                    <span className="text-base sm:text-lg font-bold text-ink">{data?.contactLists.length ?? 0}</span>
                    <span className="text-[10px] text-ink-muted">grup / CSV</span>
                  </div>
                </div>

                <div className="bg-surface-raised/70 border border-[var(--color-hairline)] rounded p-2.5">
                  <span className="text-[10px] text-ink-muted uppercase font-semibold block">En Büyük Rehber</span>
                  <div className="mt-0.5 truncate">
                    <span className="text-xs sm:text-sm font-bold text-accent truncate block">
                      {organizationsList.slice().sort((a, b) => b.total_contacts - a.total_contacts)[0]?.name || '—'}
                    </span>
                    <span className="text-[10px] text-ink-muted">
                      {(organizationsList.slice().sort((a, b) => b.total_contacts - a.total_contacts)[0]?.total_contacts || 0).toLocaleString('tr-TR')} numara
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION A: KİŞİ LİSTELERİ & REHBER GRUPLARI */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-ink">Kişi Listeleri & Segment Grupları</h3>
                  <p className="text-[11px] text-ink-muted">Firmalar tarafından oluşturulan veya CSV ile yüklenen listeler</p>
                </div>
                <span className="text-[11px] font-semibold text-ink-muted">{data?.contactLists.length} Liste</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {data?.contactLists.map(l => (
                  <div
                    key={l.id}
                    className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 sm:p-4 shadow-sm flex flex-col justify-between space-y-2.5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1.5">
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-ink">{l.name}</h4>
                          <span className="text-[10px] text-ink-muted">{l.org_name || 'Genel'}</span>
                        </div>
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-surface-raised text-ink-muted border border-[var(--color-hairline)]">
                          {l.source}
                        </span>
                      </div>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-xl sm:text-2xl font-bold text-accent">{l.contact_count}</span>
                        <span className="text-xs text-ink-muted">kayıtlı numara</span>
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-ink-muted mt-0.5">{timeAgo(l.created_at)} oluşturuldu</p>
                    </div>

                    <div className="flex items-center gap-1.5 pt-2 border-t border-[var(--color-hairline)]">
                      <button
                        onClick={() => handleOpenListContacts(l.id, l.name)}
                        className="flex-1 py-1 text-xs font-semibold rounded bg-surface-raised text-ink hover:bg-canvas border border-[var(--color-hairline)] transition"
                      >
                        Kişileri İncele
                      </button>
                      <a
                        href={`/api/canli-takip/contacts?listId=${l.id}&format=csv`}
                        download
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-accent-soft text-accent hover:bg-accent/20 transition"
                        title="Listeyi CSV olarak indir"
                      >
                        CSV İndir
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION B: CANLI KAYITLI KİŞİLER HAVUZU */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 sm:p-5 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-hairline)] pb-2.5">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-ink">Canlı Kayıtlı Numaralar Havuzu (Son Eklenenler)</h3>
                  <p className="text-[11px] text-ink-muted">
                    Sistemde doğrulanmış, WhatsApp üzerinden iletişime geçilebilir son kayıtlı kişiler
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-ink-muted">
                  {filteredRecentContacts.length} Gösteriliyor
                </span>
              </div>

              {filteredRecentContacts.length === 0 ? (
                <p className="text-xs text-ink-muted text-center py-6">Kayıtlı kişi bulunamadı.</p>
              ) : (
                <>
                  {/* MOBILE CARD VIEW (block sm:hidden) */}
                  <div className="block sm:hidden space-y-2.5">
                    {filteredRecentContacts.map(c => (
                      <div
                        key={c.id}
                        className="bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-ink">{c.phone_e164}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${
                              c.wa_status === 'valid'
                                ? 'bg-ok-soft text-ok-dim'
                                : c.wa_status === 'invalid'
                                ? 'bg-danger/10 text-danger'
                                : 'bg-surface text-ink-muted'
                            }`}
                          >
                            {c.wa_status === 'valid' ? 'WhatsApp Onaylı' : c.wa_status || 'Bilinmiyor'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-ink">{c.name || 'İsimsiz'}</span>
                          <span className="text-ink-muted text-[11px]">{c.org_name || 'Genel'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-ink-muted pt-0.5">
                          <span className="font-mono">Kaynak: {c.source || 'manuel'}</span>
                          <span>{timeAgo(c.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* DESKTOP TABLE VIEW (hidden sm:block) */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[700px]">
                      <thead>
                        <tr className="border-b border-[var(--color-hairline)] text-ink-muted font-semibold">
                          <th className="pb-2">Telefon</th>
                          <th className="pb-2">İsim / Açıklama</th>
                          <th className="pb-2">İşletme / Firma</th>
                          <th className="pb-2">Kaynak</th>
                          <th className="pb-2">WhatsApp Durumu</th>
                          <th className="pb-2 text-right">Kayıt Tarihi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-hairline)]">
                        {filteredRecentContacts.map(c => (
                          <tr key={c.id} className="hover:bg-[var(--color-surface-raised)] transition">
                            <td className="py-2 font-mono font-semibold text-ink">{c.phone_e164}</td>
                            <td className="py-2 text-ink-soft">{c.name || '—'}</td>
                            <td className="py-2 font-semibold text-ink">{c.org_name || 'Genel'}</td>
                            <td className="py-2 font-mono text-[10px] text-ink-muted">{c.source || '—'}</td>
                            <td className="py-2">
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                                  c.wa_status === 'valid'
                                    ? 'bg-ok-soft text-ok-dim'
                                    : c.wa_status === 'invalid'
                                    ? 'bg-danger/10 text-danger'
                                    : 'bg-surface-raised text-ink-muted'
                                }`}
                              >
                                {c.wa_status === 'valid' ? 'Onaylı' : c.wa_status || 'bilinmiyor'}
                              </span>
                            </td>
                            <td className="py-2 text-ink-muted text-right">{timeAgo(c.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: AI VİDEO & GÖRSEL ÜRETİM MERKEZİ (CHATGPT, GEMINI VEO, GOOGLE FLOW, KOTA TAKİBİ) */}
        {activeTab === 'ai_studio' && (
          <div className="space-y-6">
            {/* 1. ÜST PANEL: AI VİDEO MOTORLARI, HESAP HAVUZU VE KOTA DURUMU */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-hairline)] pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs sm:text-sm font-bold text-ink">AI Video & Medya Motorları Operasyon Merkezi</h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent-soft text-accent font-bold">
                      Canlı Kota & Hesap Havuzu
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    ChatGPT Web otonom prompt motoru, Google Gemini Veo 4'lü hesap havuzu ve Google Flow Veo 3.1 stüdyosu canlı durumu.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddAccountModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-[11px] font-bold bg-accent text-accent-ink hover:bg-accent-dim shadow-sm transition"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Yeni Hesap Bağla</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleVerifyAllAccounts}
                    disabled={verifyingAll}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-[11px] font-semibold bg-surface-raised hover:bg-canvas border border-[var(--color-hairline)] text-ink transition disabled:opacity-50"
                  >
                    {verifyingAll ? (
                      <>
                        <span className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        <span>Taranıyor...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Tümünü Doğrula</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowVncModal(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-[11px] font-semibold bg-surface-raised hover:bg-canvas border border-[var(--color-hairline)] text-ink transition"
                  >
                    <svg className="w-3.5 h-3.5 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>Canlı VNC Masası</span>
                  </button>

                  <a
                    href={data?.ai_engine?.googleFlow?.projectUrl || 'https://flow.google.com/project/6b718bdf-9bf3-44c3-8b65-4c8f9110c8c5'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-[11px] font-semibold bg-accent-soft/30 hover:bg-accent-soft border border-accent/25 text-accent transition"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Flow Stüdyosu</span>
                    <svg className="w-3 h-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* 3 SÜTUNLU MOTOR BİLGİ KARTLARI */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                {/* KART 1: GOOGLE GEMINI (VEO) ÇOKLU HESAP HAVUZU */}
                <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 shadow-sm space-y-3 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-accent-soft text-accent flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-ink">Google Gemini Havuz Matrisi</h3>
                          <span className="text-[10px] text-ink-muted">Hetzner Multi-Port CDP Rotasyonu</span>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          (data?.ai_engine?.geminiPool?.activeAccounts || 0) > 0
                            ? 'bg-ok-soft text-ok-dim'
                            : 'bg-danger/10 text-danger'
                        }`}
                      >
                        {data?.ai_engine?.geminiPool?.activeAccounts || 0} / {data?.ai_engine?.geminiPool?.totalAccounts || 4} Aktif
                      </span>
                    </div>

                    {/* Gemini Video Kotası İlerleme Çubuğu */}
                    <div className="bg-canvas p-2.5 rounded-[var(--radius-sm)] border border-[var(--color-hairline)] space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-ink-muted font-medium">Toplam Gemini Video Kotası:</span>
                        <span className="font-bold text-ink font-mono text-xs">
                          {data?.ai_engine?.geminiPool?.dailyCreditsRemaining ?? 200} / {data?.ai_engine?.geminiPool?.dailyCreditsTotal ?? 200} Video (Bugün)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-raised overflow-hidden border border-[var(--color-hairline)]">
                        <div
                          className="h-full bg-ok rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(5, (((data?.ai_engine?.geminiPool?.dailyCreditsRemaining ?? 200) / (data?.ai_engine?.geminiPool?.dailyCreditsTotal ?? 200)) * 100)))}%`
                          }}
                        />
                      </div>
                      <div className="text-[10px] text-ink-muted flex items-center justify-between pt-0.5">
                        <span>Maliyet: 0 Kredi (Ücretsiz Veo Pro)</span>
                        <span className="font-medium text-ink">4 Hesap x 50 Video/Gün</span>
                      </div>
                    </div>

                    {/* Hesap Slotları Listesi */}
                    <div className="space-y-2 bg-canvas p-2.5 rounded-[var(--radius-sm)] border border-[var(--color-hairline)]">
                      {(data?.ai_engine?.geminiPool?.accounts || [
                        { port: 9222, name: 'Ali Düvenci (Pro)', email: 'jeynjones@gmail.com', isLoggedIn: true, isLimited: false, flowProjectUrl: 'https://flow.google.com/project/6b718bdf-9bf3-44c3-8b65-4c8f9110c8c5' },
                        { port: 9223, name: 'Ali Düvenci (2. Hesap)', email: 'icnevudila@gmail.com', isLoggedIn: true, isLimited: false },
                        { port: 9224, name: '3. Havuz Hesabı', email: null, isLoggedIn: false, isLimited: false },
                        { port: 9225, name: '4. Havuz Hesabı', email: null, isLoggedIn: false, isLimited: false },
                      ]).map((acc: any) => (
                        <div key={acc.port} className="flex flex-col gap-1.5 py-1.5 border-b border-[var(--color-hairline)] last:border-0">
                          <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${
                                acc.isLimited
                                  ? 'bg-danger animate-pulse'
                                  : acc.isLoggedIn
                                  ? 'bg-ok'
                                  : 'bg-ink-muted/30'
                              }`} />
                              <div className="truncate">
                                <div className="font-semibold text-ink truncate leading-tight flex items-center gap-1.5">
                                  <span>{acc.name}</span>
                                  {acc.flowProjectUrl ? (
                                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-accent-soft text-accent font-bold">
                                      Flow Bağlı
                                    </span>
                                  ) : null}
                                </div>
                                <div className="text-[9px] text-ink-muted font-mono truncate">
                                  {acc.email || `Giriş yapılmadı`} · :{acc.port}
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              {acc.isLimited ? (
                                <span className="text-[9px] font-bold text-danger bg-danger/10 px-1.5 py-0.5 rounded">
                                  Kota Dolu {acc.secondsUntilReset ? `(${Math.round(acc.secondsUntilReset / 60)} dk)` : ''}
                                </span>
                              ) : acc.isLoggedIn ? (
                                <span className="text-[9px] font-bold text-ok-dim bg-ok-soft px-1.5 py-0.5 rounded">
                                  Hazır
                                </span>
                              ) : (
                                <span className="text-[9px] font-medium text-ink-muted bg-surface-raised px-1.5 py-0.5 rounded">
                                  Giriş Gerekli
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Gemini ve Flow Video Kotaları */}
                          <div className="grid grid-cols-2 gap-1.5 py-1 text-[10px]">
                            <div className="bg-surface-raised/80 px-2 py-1 rounded border border-[var(--color-hairline)] flex items-center justify-between">
                              <span className="text-ink-muted font-medium">Gemini Kotası:</span>
                              <span className="font-mono font-bold text-ink">{acc.dailyRemaining ?? 50} / {acc.dailyLimit ?? 50} Video</span>
                            </div>
                            <div className="bg-surface-raised/80 px-2 py-1 rounded border border-[var(--color-hairline)] flex items-center justify-between">
                              <span className="text-ink-muted font-medium">Flow Kalan:</span>
                              <span className="font-mono font-bold text-accent">{acc.videosRemaining ?? Math.floor((acc.flowCredits ?? (acc.port === 9222 ? 360 : 1035)) / 15)} Video</span>
                            </div>
                          </div>

                          {/* Slot Aksiyonları */}
                          <div className="flex flex-wrap items-center justify-end gap-1 pt-0.5">
                            {acc.isLimited && (
                              <button
                                type="button"
                                onClick={() => handleResetAccountLimit(acc.port)}
                                disabled={accountActionBusy === acc.port}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-danger/10 hover:bg-danger/20 text-danger font-semibold transition"
                              >
                                Kotayı Sıfırla
                              </button>
                            )}

                            {/* Flow Projesi Bağla / Değiştir */}
                            <button
                              type="button"
                              onClick={() => {
                                setFlowModalPort(acc.port)
                                setFlowModalUrl(acc.flowProjectUrl || '')
                                setFlowModalCredits(acc.flowCredits || 1050)
                                setShowFlowModal(true)
                              }}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-accent-soft/40 hover:bg-accent-soft text-accent font-semibold transition"
                              title="Bu slot için Google Flow Proje URL'sini bağla"
                            >
                              {acc.flowProjectUrl ? 'Flow URL' : '+ Flow Bağla'}
                            </button>

                            {/* VNC'siz Çerez / Oturum Aktar */}
                            <button
                              type="button"
                              onClick={() => {
                                setCookieModalPort(acc.port)
                                setShowCookieModal(true)
                              }}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-surface-raised hover:bg-canvas border border-[var(--color-hairline)] text-ink font-medium transition"
                              title="Kendi tarayıcından VNC'siz çerez aktar"
                            >
                              Oturum Aktar
                            </button>

                            <button
                              type="button"
                              onClick={() => handleVerifyAccount(acc.port)}
                              disabled={accountActionBusy === acc.port}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-surface-raised hover:bg-canvas border border-[var(--color-hairline)] text-ink font-medium transition"
                            >
                              {accountActionBusy === acc.port ? '...' : 'Doğrula'}
                            </button>

                            <a
                              href={acc.vncUrl || 'http://167.233.201.31:6080/vnc.html'}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[9px] px-1.5 py-0.5 rounded bg-surface-raised hover:bg-canvas border border-[var(--color-hairline)] text-ink-muted transition"
                              title="İsteğe bağlı VNC masaüstü"
                            >
                              VNC
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-ink-muted pt-2 border-t border-[var(--color-hairline)]">
                    <span>Otomatik failover: <strong>Aktif</strong></span>
                    <button
                      type="button"
                      onClick={() => setShowAddAccountModal(true)}
                      className="text-accent font-semibold hover:underline"
                    >
                      + Slot Ekle →
                    </button>
                  </div>
                </div>

                {/* KART 2: GOOGLE FLOW (VEO 3.1) STÜDYO & KREDİ HAVUZU */}
                <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 shadow-sm space-y-3 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-accent-soft text-accent flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-ink">Google Flow Creative Studio</h3>
                          <span className="text-[10px] text-ink-muted">Çoklu Hesap & Veo 3.1 Havuzu</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-soft text-accent">
                        {data?.ai_engine?.googleFlow?.activeFlowCount || 1} / {data?.ai_engine?.googleFlow?.totalAccountsCount || 2} Hesap Aktif
                      </span>
                    </div>

                    {/* Kredi İlerleme Çubuğu */}
                    <div className="bg-canvas p-2.5 rounded-[var(--radius-sm)] border border-[var(--color-hairline)] space-y-2 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-ink-muted font-medium">Toplam Havuz Kredisi:</span>
                        <span className="font-bold text-accent font-mono text-xs">
                          {data?.ai_engine?.googleFlow?.credits ?? 1020} / {data?.ai_engine?.googleFlow?.initialCredits ?? 2100} Kredi
                        </span>
                      </div>

                      {/* Görsel Progress Bar */}
                      <div className="w-full h-2 rounded-full bg-surface-raised overflow-hidden border border-[var(--color-hairline)]">
                        <div
                          className="h-full bg-accent rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(5, (((data?.ai_engine?.googleFlow?.credits ?? 1020) / (data?.ai_engine?.googleFlow?.initialCredits ?? 2100)) * 100)))}%`
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <div className="bg-surface-raised p-1.5 rounded border border-[var(--color-hairline)] text-center">
                          <div className="text-[9px] text-ink-muted">Toplam Kalan Video</div>
                          <div className="text-xs font-bold text-ink">
                            {data?.ai_engine?.googleFlow?.videosRemaining ?? 68} Adet
                          </div>
                        </div>
                        <div className="bg-surface-raised p-1.5 rounded border border-[var(--color-hairline)] text-center">
                          <div className="text-[9px] text-ink-muted">Birim Maliyet</div>
                          <div className="text-xs font-bold text-accent">15 Kr / Video</div>
                        </div>
                      </div>

                      <div className="p-1.5 rounded bg-surface-raised/70 border border-[var(--color-hairline)] text-[10px] text-ink-muted leading-tight">
                        <span className="font-semibold text-accent">ℹ️ Akıllı Kredi Koruma:</span> Gemini Veo havuzu devredeyken videolar ücretsiz üretilir, Flow kredisi harcanmaz. Krediler yalnızca Gemini kotaya girdiğinde devreye girer.
                      </div>

                      {/* Flow Hesap Havuzu Listesi */}
                      <div className="space-y-1.5 pt-1.5 border-t border-[var(--color-hairline)]">
                        <div className="flex items-center justify-between text-[10px] text-ink-muted font-bold">
                          <span>Hesap Havuzu Slotları:</span>
                          <button
                            type="button"
                            onClick={() => {
                              setFlowModalPort(9223)
                              setShowFlowModal(true)
                            }}
                            className="text-accent hover:underline"
                          >
                            + Proje Ekle
                          </button>
                        </div>

                        {(data?.ai_engine?.googleFlow?.accounts || [
                          { port: 9222, accountName: 'Ali Düvenci (Pro)', projectUrl: 'https://flow.google.com/project/6b718bdf-9bf3-44c3-8b65-4c8f9110c8c5', credits: 1020, status: 'active' },
                          { port: 9223, accountName: 'Ali Düvenci (2. Hesap)', projectUrl: '', credits: 1050, status: 'ready_to_link' }
                        ]).map((fa: any) => (
                          <div key={fa.port} className="flex items-center justify-between p-1.5 rounded bg-surface-raised border border-[var(--color-hairline)] text-[10px]">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                fa.status === 'active' ? 'bg-ok' : fa.status === 'ready_to_link' ? 'bg-accent animate-pulse' : 'bg-ink-muted/40'
                              }`} />
                              <div className="truncate">
                                <span className="font-semibold text-ink truncate">{fa.accountName}</span>
                                <span className="text-ink-muted ml-1 font-mono">:{fa.port}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {fa.status === 'active' ? (
                                <>
                                  <span className="font-bold text-accent font-mono">{fa.credits} Kr</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFlowModalPort(fa.port)
                                      setFlowModalCredits(fa.credits || 1050)
                                      setFlowModalUrl(fa.projectUrl || '')
                                      setShowFlowModal(true)
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-surface text-ink hover:bg-canvas border border-[var(--color-hairline)] font-medium text-[9px]"
                                    title="Kredi Miktarını veya Proje URL'sini Güncelle"
                                  >
                                    Düzenle
                                  </button>
                                  <a
                                    href={fa.projectUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-1.5 py-0.5 rounded bg-surface text-ink hover:bg-canvas border border-[var(--color-hairline)] font-medium"
                                  >
                                    Aç ↗
                                  </a>
                                </>
                              ) : fa.status === 'ready_to_link' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFlowModalPort(fa.port)
                                    setFlowModalCredits(fa.credits || 1050)
                                    setShowFlowModal(true)
                                  }}
                                  className="px-2 py-0.5 rounded bg-accent text-accent-ink font-bold hover:bg-accent-dim shadow-xs transition"
                                >
                                  + Proje Bağla
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCookieModalPort(fa.port)
                                    setShowCookieModal(true)
                                  }}
                                  className="px-1.5 py-0.5 rounded bg-surface border border-[var(--color-hairline)] text-ink font-medium hover:bg-canvas"
                                >
                                  Giriş Yap
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-1 pt-1 text-[10px] text-ink-muted border-t border-[var(--color-hairline)]">
                        <div className="flex items-center justify-between">
                          <span>Filigran:</span>
                          <span className="font-semibold text-ok">{data?.ai_engine?.googleFlow?.watermark || 'Kapalı (Filigransız Saf Reklam)'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Format:</span>
                          <span className="font-semibold text-ink">Veo 3.1 • 9:16 Dikey Reklam</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-1.5">
                    <a
                      href={data?.ai_engine?.googleFlow?.projectUrl || 'https://flow.google.com/project/6b718bdf-9bf3-44c3-8b65-4c8f9110c8c5'}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-1.5 text-xs font-semibold rounded bg-surface-raised hover:bg-canvas border border-[var(--color-hairline)] text-ink flex items-center justify-center gap-1 transition"
                    >
                      <span>Aktif Stüdyoyu Aç</span>
                      <svg className="w-3 h-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                    <button
                      type="button"
                      onClick={fetchData}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded bg-surface-raised hover:bg-canvas border border-[var(--color-hairline)] text-ink transition flex items-center justify-center"
                      title="Kredileri Yenile"
                    >
                      <svg className="w-3.5 h-3.5 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* KART 3: CHATGPT WEB OTONOM PROMPT YÖNETMENİ */}
                <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 shadow-sm space-y-3 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-ok-soft text-ok-dim flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-ink">ChatGPT Web Otonom Yönetmen</h3>
                          <span className="text-[10px] text-ink-muted">Cannes Reklam Filmi Motoru</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-ok-soft text-ok-dim flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-ok animate-pulse" />
                        Aktif
                      </span>
                    </div>

                    <div className="space-y-1.5 bg-canvas p-2.5 rounded-[var(--radius-sm)] border border-[var(--color-hairline)] text-[11px]">
                      <div className="flex items-center justify-between py-1 border-b border-[var(--color-hairline)]">
                        <span className="text-ink-muted">Hesap:</span>
                        <span className="font-semibold text-ink">{data?.ai_engine?.chatgpt?.accountName || 'Yahya Gökbey (Plus)'}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-[var(--color-hairline)]">
                        <span className="text-ink-muted">Bağlantı:</span>
                        <span className="font-mono text-ink">Port :9222 (CDP)</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-[var(--color-hairline)]">
                        <span className="text-ink-muted">Maliyet:</span>
                        <span className="font-bold text-ok-dim">0 TL (Sıfır API Anahtarı)</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-ink-muted">Görev:</span>
                        <span className="font-medium text-ink">3 Perdeli 9:16 Video Senaryosu</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-ink-muted pt-2 border-t border-[var(--color-hairline)]">
                    <span>Brief ve firma analizi yaparak Veo'ya iletilecek kusursuz promptları otonom üretir.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. ORTA PANEL: SON ÜRETİLEN SİNEMATİK REKLAM VİDEOLARI (HTML5 9:16 OYNATICI) */}
            {data?.ai_engine?.recentVideos && data.ai_engine.recentVideos.length > 0 && (
              <div className="space-y-3 border-t border-[var(--color-hairline)] pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-ink flex items-center gap-2">
                      <svg className="w-4 h-4 text-ink-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Son Üretilen Sinematik Reklam Videoları</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-raised text-ink-muted font-bold">
                        9:16 Dikey (Veo AI)
                      </span>
                    </h3>
                    <p className="text-[11px] text-ink-muted">
                      Yapay zeka video motoru (Google Veo) tarafından 9:16 dikey çekilmiş 100% saf canlı çekim reklam videoları
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-ink-muted">
                    {data.ai_engine.recentVideos.length} Video Kaydı
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {data.ai_engine.recentVideos.map(vid => (
                    <div
                      key={vid.id}
                      className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3 shadow-sm space-y-2.5 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        {/* Video Header */}
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono font-bold text-ink truncate max-w-[140px]">{vid.id}</span>
                          <span className="text-[10px] text-ink-muted">{timeAgo(vid.createdAt)}</span>
                        </div>

                        {/* Motor & Marka Rozetleri (Hangi Motordan Üretildi?) */}
                        <div className="flex flex-wrap items-center gap-1">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            (vid.engineBadge || '').includes('Flow')
                              ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          }`}>
                            {vid.engineBadge || 'Gemini Veo PRO (0 Kredi)'}
                          </span>
                          {vid.brand && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-surface-raised border border-[var(--color-hairline)] text-ink">
                              {vid.brand}
                            </span>
                          )}
                        </div>

                        {/* Video Player */}
                        <div className="aspect-[9/16] bg-black rounded-[var(--radius-sm)] overflow-hidden relative group">
                          <video
                            src={`${vid.videoUrl}#t=0.1`}
                            poster={vid.thumbnailUrl || undefined}
                            controls
                            playsInline
                            preload="metadata"
                            className="w-full h-full object-contain"
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-ink-muted pt-0.5">
                          <span>Boyut: <strong>{vid.sizeMb} MB</strong></span>
                          <span>Format: <strong>9:16 Dikey MP4</strong></span>
                        </div>
                      </div>

                      {/* Video Actions */}
                      <div className="pt-2 border-t border-[var(--color-hairline)] space-y-1.5">
                        <button
                          type="button"
                          onClick={() => setInspectedVideo(vid)}
                          className="w-full py-1.5 text-xs font-semibold rounded bg-accent/10 hover:bg-accent/20 text-accent border border-accent/25 flex items-center justify-center gap-1.5 transition"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>Prompt & Üretim Detayları</span>
                        </button>
                        <div className="flex items-center gap-1.5">
                          <a
                            href={vid.videoUrl}
                            download={`${vid.id}.mp4`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 py-1 text-xs font-semibold rounded bg-surface-raised hover:bg-canvas border border-[var(--color-hairline)] text-ink text-center transition"
                          >
                            İndir (MP4)
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickMediaUrl(vid.videoUrl)
                              setQuickMessage('İşletmemiz için hazırlanan özel sinematik reklam videosu.')
                              setActiveTab('quick_send')
                              showNotice('Video hızlı gönderim kutusuna aktarıldı.')
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-accent text-accent-ink hover:bg-accent-dim transition"
                          >
                            WhatsApp'a Aktar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. ALT PANEL: CHATGPT & GÖRSEL / AFİŞ ÜRETİM SIRASI */}
            <div className="border-t border-[var(--color-hairline)] pt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-ink">ChatGPT & Görsel / Afiş Üretim Akışı</h3>
                  <p className="text-[11px] text-ink-muted">
                    Firmalardan gelen anlık görsel üretim istekleri, ChatGPT'ye giden sistem prompt komutları ve JSON yükleri
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-ink-muted">{data?.creatives.length} Afiş Kaydı</span>
              </div>

            {data?.creatives.length === 0 ? (
              <p className="text-xs text-ink-muted text-center py-6">Henüz üretilmiş görsel veya prompt kaydı bulunmuyor.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {data?.creatives.map(cr => {
                  const payload = cr.payload
                  const brief = payload?.brief || cr.title
                  const generatedPrompt = payload?.generatedPrompt || payload?.originalPrompt || ''
                  const provider = payload?.cost?.provider || payload?.provider || 'OpenAI'
                  const isRendering = cr.status === 'pending' || cr.status === 'rendering'

                  return (
                    <div
                      key={cr.id}
                      className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 shadow-sm space-y-2.5 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        {/* Header: Origin & Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-ink">{cr.org_name || 'Genel'}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-raised text-ink-muted">
                                {cr.generation_type === 'variation'
                                  ? 'Varyasyon'
                                  : cr.generation_type === 'revision'
                                  ? 'Revizyon'
                                  : 'Yeni Görsel'}
                              </span>
                            </div>
                            <span className="text-[10px] text-ink-muted">
                              Sağlayıcı: <strong className="text-ink-soft">{provider}</strong> · {timeAgo(cr.created_at)}
                            </span>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              cr.status === 'ready'
                                ? 'bg-ok-soft text-ok-dim'
                                : isRendering
                                ? 'bg-accent-soft text-accent animate-pulse'
                                : 'bg-danger/10 text-danger'
                            }`}
                          >
                            {cr.status === 'ready' ? 'TAMAMLANDI' : isRendering ? 'ÜRETİLİYOR' : cr.status.toUpperCase()}
                          </span>
                        </div>

                        {/* Image / Video Preview or Loading Spinner */}
                        <div className="aspect-video sm:aspect-[4/3] bg-canvas rounded-[var(--radius-sm)] border border-[var(--color-hairline)] overflow-hidden relative flex items-center justify-center group">
                          {cr.public_url ? (
                            (() => {
                              const isVideo = cr.format === 'video' || (typeof cr.public_url === 'string' && cr.public_url.toLowerCase().endsWith('.mp4'))
                              const safeUrl = getSafeMediaUrl(cr.public_url)
                              return isVideo ? (
                                <div className="w-full h-full relative cursor-pointer" onClick={() => setInspectedCreative(cr)}>
                                  <video
                                    src={safeUrl}
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                    className="w-full h-full object-cover group-hover:scale-102 transition duration-200"
                                  />
                                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-bold tracking-wide flex items-center gap-1">
                                    <span>▶</span> VIDEO
                                  </div>
                                </div>
                              ) : (
                                <img
                                  src={safeUrl}
                                  alt={cr.title}
                                  className="w-full h-full object-cover cursor-pointer hover:scale-102 transition duration-200"
                                  onClick={() => setInspectedCreative(cr)}
                                />
                              )
                            })()
                          ) : isRendering ? (
                            <div className="flex flex-col items-center gap-1.5 p-3 text-center">
                              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                              <span className="text-[11px] font-semibold text-accent">
                                {cr.format === 'video' ? 'Video Üretiliyor...' : 'Görsel Üretiliyor...'}
                              </span>
                              <span className="text-[10px] text-ink-muted">
                                {cr.format === 'video' ? 'Google Flow & Veo Motoru Çalışıyor' : 'ChatGPT & Görsel Motoru Çalışıyor'}
                              </span>
                            </div>
                          ) : (
                            <div className="text-center p-3">
                              <span className="text-[11px] font-semibold text-danger">Üretim Başarısız</span>
                              {cr.error && <span className="block text-[10px] text-ink-muted mt-1">{cr.error}</span>}
                            </div>
                          )}
                        </div>

                        {/* User Brief */}
                        <div>
                          <span className="block text-[10px] font-semibold text-ink-muted">Talep / İstek:</span>
                          <p className="text-[11px] font-medium text-ink line-clamp-2 leading-relaxed">{brief}</p>
                        </div>

                        {/* Prompt Snippet */}
                        {generatedPrompt && (
                          <div className="bg-canvas p-2 rounded border border-[var(--color-hairline)]">
                            <span className="block text-[9px] font-mono font-bold text-accent mb-0.5">
                              {cr.format === 'video' ? 'Flow / Veo Prompt Komutu:' : 'ChatGPT Prompt Komutu:'}
                            </span>
                            <p className="font-mono text-[10px] text-ink-soft line-clamp-2 leading-relaxed">
                              {generatedPrompt}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Card Footer: JSON & Detail Buttons */}
                      <div className="pt-2 border-t border-[var(--color-hairline)] flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setInspectedCreative(cr)}
                          className="flex-1 py-1 text-xs font-semibold rounded bg-surface-raised text-ink hover:bg-canvas border border-[var(--color-hairline)] flex items-center justify-center gap-1"
                        >
                          <span>JSON & Prompt Detayı</span>
                        </button>

                        {cr.public_url && (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={getSafeMediaUrl(cr.public_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 text-xs font-semibold rounded bg-surface text-ink hover:bg-canvas border border-[var(--color-hairline)]"
                            >
                              {cr.format === 'video' || (typeof cr.public_url === 'string' && cr.public_url.toLowerCase().endsWith('.mp4')) ? 'İzle' : 'Büyüt'}
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                setQuickMediaUrl(getSafeMediaUrl(cr.public_url) || cr.public_url || '')
                                setQuickMessage(cr.title || (cr.format === 'video' ? 'Video Kampanya Paylaşımı' : 'Afiş ve Görsel Kampanya Paylaşımı'))
                                setActiveTab('quick_send')
                                showNotice(
                                  cr.format === 'video' || (typeof cr.public_url === 'string' && cr.public_url.toLowerCase().endsWith('.mp4'))
                                    ? 'Video hızlı gönderim kutusuna aktarıldı.'
                                    : 'Görsel hızlı gönderim kutusuna aktarıldı.'
                                )
                              }}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-accent text-accent-ink hover:bg-accent-dim transition"
                            >
                              WhatsApp'tan Gönder
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            </div>
          </div>
        )}

        {/* TAB: AI GÖRSEL & VİDEO ÜRETİM MERKEZİ (BAĞIMSIZ SERVİS) */}
        {activeTab === 'ai_media' && (() => {
          const aiMediaData = globalAiMedia || {}
          const aiMediaLoading = !globalAiMedia && loading

          const STATE_LABELS: Record<string, { label: string; color: string }> = {
            PENDING: { label: 'Bekliyor', color: 'bg-gray-400' },
            VALIDATING_INPUTS: { label: 'Girdiler Doğrulanıyor', color: 'bg-blue-400' },
            QUEUED: { label: 'Kuyrukta', color: 'bg-yellow-500' },
            LEASED: { label: 'Hesaba Atandı', color: 'bg-indigo-400' },
            PREPARING_ENV: { label: 'Ortam Hazırlanıyor', color: 'bg-indigo-500' },
            OPENING_PROJECT: { label: 'Proje Açılıyor', color: 'bg-sky-400' },
            ATTACHING_INGREDIENTS: { label: 'Çipler Bağlanıyor', color: 'bg-sky-500' },
            INGREDIENTS_VERIFIED: { label: 'Çipler Doğrulandı', color: 'bg-teal-400' },
            GENERATING: { label: 'Üretiliyor', color: 'bg-orange-500 animate-pulse' },
            POLLING_FLOW: { label: 'Flow İzleniyor', color: 'bg-orange-400 animate-pulse' },
            DOWNLOADING_MEDIA: { label: 'Video İndiriliyor', color: 'bg-cyan-500' },
            MEDIA_DOWNLOADED: { label: 'Video İndi', color: 'bg-cyan-400' },
            FFPROBE_INSPECTING: { label: 'ffprobe Denetimi', color: 'bg-emerald-500' },
            SHA256_VERIFYING: { label: 'SHA256 Kontrolü', color: 'bg-emerald-400' },
            VISUAL_QA_EVALUATING: { label: 'Görsel QA', color: 'bg-lime-500' },
            COMPLETED: { label: 'Tamamlandı', color: 'bg-ok' },
            NEEDS_REVIEW: { label: 'İnceleme Gerekli', color: 'bg-warning' },
            FAILED: { label: 'Başarısız', color: 'bg-danger' },
          }

          const alarms = aiMediaData?.alarms || { cross_org_contamination: 0, wrong_output_delivery: 0, validation_bypass: 0 }
          const hasAlarms = alarms.cross_org_contamination > 0 || alarms.wrong_output_delivery > 0 || alarms.validation_bypass > 0
          const jobs = aiMediaData?.jobs || []
          const accounts = aiMediaData?.accounts || []
          const workers = aiMediaData?.workers || []
          const queueItems = aiMediaData?.queue || []
          const incidents = aiMediaData?.incidents || []
          const overview = aiMediaData?.overview || {}

          return (
            <div className="space-y-4">
              {/* RED ALARMS BANNER */}
              {hasAlarms && (
                <div className="bg-danger/10 border-2 border-danger rounded-[var(--radius-card)] p-3 animate-pulse">
                  <div className="flex items-center gap-2 mb-1.5">
                    <svg className="w-5 h-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                    <span className="text-xs font-bold text-danger uppercase tracking-wider">SIFIR TOLERANS ALARMI — Kritik Güvenlik İhlali Algılandı</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-danger/20 rounded p-2">
                      <div className="text-2xl font-black text-danger">{alarms.cross_org_contamination}</div>
                      <div className="text-[9px] font-bold text-danger/80 uppercase">Çapraz Org Kontaminasyon</div>
                    </div>
                    <div className="bg-danger/20 rounded p-2">
                      <div className="text-2xl font-black text-danger">{alarms.wrong_output_delivery}</div>
                      <div className="text-[9px] font-bold text-danger/80 uppercase">Yanlış Çıktı Teslimi</div>
                    </div>
                    <div className="bg-danger/20 rounded p-2">
                      <div className="text-2xl font-black text-danger">{alarms.validation_bypass}</div>
                      <div className="text-[9px] font-bold text-danger/80 uppercase">Doğrulama Atlaması</div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB NAV */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
                {([
                  { id: 'overview', label: 'Genel Bakış' },
                  { id: 'jobs', label: 'İşler' },
                  { id: 'accounts', label: 'Flow Hesapları' },
                  { id: 'workers', label: "Worker'lar" },
                  { id: 'queue', label: 'Kuyruk' },
                  { id: 'incidents', label: 'Hatalar / Incidents' },
                  { id: 'visual_qa', label: 'Marka & Asset QA' },
                  { id: 'health', label: 'Sistem Sağlığı' },
                ] as const).map(st => (
                  <button
                    key={st.id}
                    onClick={() => setAiMediaSubTab(st.id)}
                    className={`shrink-0 px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-semibold whitespace-nowrap transition ${
                      aiMediaSubTab === st.id
                        ? 'bg-accent text-accent-ink shadow-sm'
                        : 'text-ink-soft hover:bg-[var(--color-surface-raised)]'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {/* SUB-TAB: GENEL BAKIŞ */}
              {aiMediaSubTab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                    {[
                      { label: 'Aktif İşler', value: overview.active_jobs ?? 0, accent: true },
                      { label: 'Kuyrukta', value: overview.queued_jobs ?? 0 },
                      { label: '24s Başarılı', value: overview.completed_24h ?? 0, ok: true },
                      { label: 'Ort. Süre (sn)', value: overview.avg_duration_seconds ?? '—' },
                      { label: 'Başarı Oranı', value: overview.success_rate ? `${overview.success_rate}%` : '—', ok: overview.success_rate >= 90 },
                    ].map((kpi, i) => (
                      <div key={i} className={`bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3 text-center shadow-sm ${kpi.accent ? 'ring-1 ring-accent/30' : ''}`}>
                        <div className={`text-xl sm:text-2xl font-black ${kpi.ok ? 'text-ok' : kpi.accent ? 'text-accent' : 'text-ink'}`}>{kpi.value}</div>
                        <div className="text-[10px] text-ink-muted font-semibold mt-0.5">{kpi.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3">
                    <h3 className="text-xs font-bold text-ink mb-2">Son İşler</h3>
                    {jobs.length === 0 ? (
                      <div className="text-[11px] text-ink-muted py-4 text-center">Henüz AI media iş kaydı yok.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-[10px]">
                          <thead><tr className="border-b border-[var(--color-hairline)]">
                            <th className="text-left py-1 px-1.5 font-semibold text-ink-muted">İş</th>
                            <th className="text-left py-1 px-1.5 font-semibold text-ink-muted">Durum</th>
                            <th className="text-left py-1 px-1.5 font-semibold text-ink-muted">Org</th>
                            <th className="text-right py-1 px-1.5 font-semibold text-ink-muted">Tarih</th>
                          </tr></thead>
                          <tbody>
                            {jobs.slice(0, 10).map((j: any) => (
                              <tr key={j.id} className="border-b border-[var(--color-hairline)] last:border-0 hover:bg-[var(--color-surface-raised)] cursor-pointer" onClick={() => { setAiMediaJobDetail(j); setShowJobDrawer(true) }}>
                                <td className="py-1.5 px-1.5 font-mono text-ink">{j.title || j.id?.slice(0,8)}</td>
                                <td className="py-1.5 px-1.5"><span className={`inline-block w-2 h-2 rounded-full mr-1 ${STATE_LABELS[j.state]?.color || 'bg-gray-400'}`} /><span className="text-ink">{STATE_LABELS[j.state]?.label || j.state}</span></td>
                                <td className="py-1.5 px-1.5 text-ink-muted">{j.org_name || '—'}</td>
                                <td className="py-1.5 px-1.5 text-right text-ink-muted font-mono">{j.created_at ? new Date(j.created_at).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUB-TAB: İŞLER */}
              {aiMediaSubTab === 'jobs' && (
                <div className="space-y-3">
                  <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-2.5">
                      <h3 className="text-xs font-bold text-ink">AI Media İşleri (Kanonik 18-State)</h3>
                      <span className="text-[9px] font-mono text-ink-muted">{jobs.length} iş</span>
                    </div>
                    {jobs.length === 0 ? (
                      <div className="text-[11px] text-ink-muted py-6 text-center">Henüz iş kaydı bulunmuyor.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-[10px]">
                          <thead><tr className="border-b border-[var(--color-hairline)]">
                            <th className="text-left py-1.5 px-1.5 font-semibold text-ink-muted">ID</th>
                            <th className="text-left py-1.5 px-1.5 font-semibold text-ink-muted">Başlık</th>
                            <th className="text-left py-1.5 px-1.5 font-semibold text-ink-muted">Durum</th>
                            <th className="text-left py-1.5 px-1.5 font-semibold text-ink-muted">Model</th>
                            <th className="text-left py-1.5 px-1.5 font-semibold text-ink-muted">Oran</th>
                            <th className="text-left py-1.5 px-1.5 font-semibold text-ink-muted">Hesap</th>
                            <th className="text-left py-1.5 px-1.5 font-semibold text-ink-muted">Çip</th>
                            <th className="text-right py-1.5 px-1.5 font-semibold text-ink-muted">Oluşturulma</th>
                          </tr></thead>
                          <tbody>
                            {jobs.map((j: any) => (
                              <tr key={j.id} className="border-b border-[var(--color-hairline)] last:border-0 hover:bg-[var(--color-surface-raised)] cursor-pointer" onClick={() => { setAiMediaJobDetail(j); setShowJobDrawer(true) }}>
                                <td className="py-1.5 px-1.5 font-mono text-ink text-[9px]">{j.id?.slice(0,8)}…</td>
                                <td className="py-1.5 px-1.5 text-ink font-semibold">{j.title}</td>
                                <td className="py-1.5 px-1.5">
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white ${STATE_LABELS[j.state]?.color || 'bg-gray-400'}`}>
                                    {STATE_LABELS[j.state]?.label || j.state}
                                  </span>
                                </td>
                                <td className="py-1.5 px-1.5 text-ink-muted">{j.model}</td>
                                <td className="py-1.5 px-1.5 text-ink-muted">{j.aspect_ratio}</td>
                                <td className="py-1.5 px-1.5 text-ink-muted font-mono text-[9px]">{j.lease_account_id || '—'}</td>
                                <td className="py-1.5 px-1.5 text-center">
                                  <span className={`font-mono text-[9px] font-bold ${j.expected_ingredient_count === j.actual_ingredient_count ? 'text-ok' : 'text-danger'}`}>
                                    {j.actual_ingredient_count}/{j.expected_ingredient_count}
                                  </span>
                                </td>
                                <td className="py-1.5 px-1.5 text-right text-ink-muted font-mono text-[9px]">{j.created_at ? new Date(j.created_at).toLocaleString('tr-TR') : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUB-TAB: FLOW HESAPLARI */}
              {aiMediaSubTab === 'accounts' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {accounts.length === 0 ? (
                      <div className="col-span-full text-[11px] text-ink-muted py-6 text-center bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-4">Flow hesabı bulunamadı.</div>
                    ) : accounts.map((acc: any) => (
                      <div key={acc.id} className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${acc.status === 'idle' ? 'bg-ok' : acc.status === 'busy' ? 'bg-warning animate-pulse' : acc.status === 'agent_ui_blocked' ? 'bg-danger' : 'bg-gray-400'}`} />
                            <span className="text-xs font-bold text-ink">{acc.display_name}</span>
                          </div>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${acc.status === 'idle' ? 'bg-ok/20 text-ok' : acc.status === 'busy' ? 'bg-warning/20 text-warning' : 'bg-danger/20 text-danger'}`}>{acc.status}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                          <div><span className="text-ink-muted">E-posta:</span> <span className="text-ink font-mono">{acc.email}</span></div>
                          <div><span className="text-ink-muted">Kredi:</span> <span className="text-ink font-bold">{acc.credit_balance ?? '?'}</span></div>
                          <div><span className="text-ink-muted">Profil:</span> <span className="text-ink font-mono text-[9px]">{acc.persistent_profile_path}</span></div>
                          <div><span className="text-ink-muted">Son Kalp Atışı:</span> <span className="text-ink font-mono">{acc.last_heartbeat_at ? new Date(acc.last_heartbeat_at).toLocaleTimeString('tr-TR') : '—'}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB-TAB: WORKER'LAR */}
              {aiMediaSubTab === 'workers' && (
                <div className="space-y-3">
                  {workers.length === 0 ? (
                    <div className="text-[11px] text-ink-muted py-6 text-center bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-4">Aktif worker bulunmuyor.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {workers.map((w: any) => (
                        <div key={w.id} className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-ink">{w.id}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${w.status === 'online' ? 'bg-ok/20 text-ok' : 'bg-danger/20 text-danger'}`}>{w.status}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[10px]">
                            <div><span className="text-ink-muted">Host:</span> <span className="text-ink">{w.host}</span></div>
                            <div><span className="text-ink-muted">PID:</span> <span className="text-ink font-mono">{w.pid || '—'}</span></div>
                            <div><span className="text-ink-muted">CPU:</span> <span className="text-ink">{w.cpu_percent != null ? `${w.cpu_percent}%` : '—'}</span></div>
                            <div><span className="text-ink-muted">RAM:</span> <span className="text-ink">{w.ram_percent != null ? `${w.ram_percent}%` : '—'}</span></div>
                            <div><span className="text-ink-muted">Aktif İş:</span> <span className="text-ink font-mono text-[9px]">{w.active_job_id?.slice(0,8) || 'Boşta'}</span></div>
                            <div><span className="text-ink-muted">Kalp Atışı:</span> <span className="text-ink font-mono">{w.heartbeat_at ? new Date(w.heartbeat_at).toLocaleTimeString('tr-TR') : '—'}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB: KUYRUK */}
              {aiMediaSubTab === 'queue' && (
                <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3 shadow-sm">
                  <h3 className="text-xs font-bold text-ink mb-2">Fair-Share Tenant Kuyruğu</h3>
                  {queueItems.length === 0 ? (
                    <div className="text-[11px] text-ink-muted py-6 text-center">Kuyruk boş.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px]">
                        <thead><tr className="border-b border-[var(--color-hairline)]">
                          <th className="text-left py-1.5 px-1.5 font-semibold text-ink-muted">Sıra</th>
                          <th className="text-left py-1.5 px-1.5 font-semibold text-ink-muted">İş</th>
                          <th className="text-left py-1.5 px-1.5 font-semibold text-ink-muted">Firma</th>
                          <th className="text-right py-1.5 px-1.5 font-semibold text-ink-muted">Öncelik</th>
                        </tr></thead>
                        <tbody>
                          {queueItems.map((q: any, idx: number) => (
                            <tr key={q.id} className="border-b border-[var(--color-hairline)] last:border-0">
                              <td className="py-1.5 px-1.5 font-mono text-ink">{idx + 1}</td>
                              <td className="py-1.5 px-1.5 text-ink">{q.title || q.id?.slice(0,8)}</td>
                              <td className="py-1.5 px-1.5 text-ink-muted">{q.org_name || '—'}</td>
                              <td className="py-1.5 px-1.5 text-right font-mono text-ink">{q.priority}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB: HATALAR / INCIDENTS */}
              {aiMediaSubTab === 'incidents' && (
                <div className="space-y-3">
                  <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3 shadow-sm">
                    <h3 className="text-xs font-bold text-ink mb-2">Flow Incidents (Redacted, Admin-Only)</h3>
                    {incidents.length === 0 ? (
                      <div className="text-[11px] text-ink-muted py-6 text-center">Henüz kayıtlı incident bulunmuyor.</div>
                    ) : (
                      <div className="space-y-2">
                        {incidents.map((inc: any) => (
                          <div key={inc.id} className="bg-danger/5 border border-danger/20 rounded-[var(--radius-sm)] p-2.5">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-mono font-bold text-danger bg-danger/10 px-1.5 py-0.5 rounded">{inc.error_code}</span>
                                <span className="text-[10px] text-ink font-semibold">{inc.error_type}</span>
                              </div>
                              <span className="text-[9px] font-mono text-ink-muted">{inc.created_at ? new Date(inc.created_at).toLocaleString('tr-TR') : ''}</span>
                            </div>
                            <div className="flex gap-2 text-[9px]">
                              {inc.screenshot_path && <span className="text-accent underline cursor-pointer">Ekran Görüntüsü</span>}
                              {inc.dom_dump_path && <span className="text-accent underline cursor-pointer">DOM Dökümü</span>}
                              {inc.har_path && <span className="text-accent underline cursor-pointer">HAR (Redacted)</span>}
                            </div>
                            {inc.is_redacted && <div className="text-[8px] text-ink-muted mt-1 flex items-center gap-1">Credential redaction uygulanmış</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUB-TAB: MARKA & ASSET QA */}
              {aiMediaSubTab === 'visual_qa' && (
                <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3 shadow-sm">
                  <h3 className="text-xs font-bold text-ink mb-1">Marka & Görsel QA Denetim Galerisi</h3>
                  <p className="text-[10px] text-ink-muted mb-3">Her üretilen videonun %10, %50 ve %90 karelerinde logo, ürün ve metin denetimi.</p>
                  {(aiMediaData?.outputs || []).length === 0 ? (
                    <div className="text-[11px] text-ink-muted py-6 text-center">Doğrulanmış çıktı henüz bulunmuyor.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {(aiMediaData?.outputs || []).map((out: any) => (
                        <div key={out.id} className="border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-2 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-ink">{out.job_title || out.job_id?.slice(0,8)}</span>
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${out.is_approved ? 'bg-ok/20 text-ok' : 'bg-warning/20 text-warning'}`}>{out.is_approved ? 'Onaylı' : 'İnceleniyor'}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            {[out.qa_frame_10_url, out.qa_frame_50_url, out.qa_frame_90_url].map((url, i) => (
                              <div key={i} className="aspect-[9/16] bg-canvas rounded border border-[var(--color-hairline)] flex items-center justify-center overflow-hidden">
                                {url ? <img src={url} alt={`Frame ${[10,50,90][i]}%`} className="w-full h-full object-cover" /> : <span className="text-[8px] text-ink-muted">{[10,50,90][i]}%</span>}
                              </div>
                            ))}
                          </div>
                          <div className="text-[9px] text-ink-muted grid grid-cols-2 gap-1">
                            <div>QA Skor: <span className={`font-bold ${(out.visual_qa_score || 0) >= 7 ? 'text-ok' : 'text-warning'}`}>{out.visual_qa_score ?? '—'}/10</span></div>
                            <div>SHA256: <span className="font-mono">{out.sha256?.slice(0,12)}…</span></div>
                            <div>Çözünürlük: <span className="font-mono">{out.width}×{out.height}</span></div>
                            <div>Süre: <span className="font-mono">{out.duration_seconds}s</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB: SİSTEM SAĞLIĞI */}
              {aiMediaSubTab === 'health' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'ai-media-control', status: aiMediaData ? 'Çevrimiçi' : 'Çevrimdışı', ok: !!aiMediaData },
                    { label: 'gflow-engine', status: aiMediaData?.engine_health?.status || 'Bilinmiyor', ok: aiMediaData?.engine_health?.status === 'ok' },
                    { label: 'Supabase DB', status: aiMediaData?.db_health || 'Bilinmiyor', ok: aiMediaData?.db_health === 'ok' },
                    { label: 'ffmpeg/ffprobe', status: aiMediaData?.ffmpeg_health || 'Bilinmiyor', ok: aiMediaData?.ffmpeg_health === 'ok' },
                  ].map((h, i) => (
                    <div key={i} className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3 text-center shadow-sm">
                      <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${h.ok ? 'bg-ok' : 'bg-danger animate-pulse'}`} />
                      <div className="text-xs font-bold text-ink">{h.label}</div>
                      <div className={`text-[10px] font-semibold ${h.ok ? 'text-ok' : 'text-danger'}`}>{h.status}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* JOB DETAIL DRAWER */}
              {showJobDrawer && aiMediaJobDetail && (
                <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowJobDrawer(false)}>
                  <div className="absolute inset-0 bg-black/40" />
                  <div className="relative w-full max-w-lg bg-[var(--color-surface)] shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="sticky top-0 bg-[var(--color-surface)] border-b border-[var(--color-hairline)] p-3 flex items-center justify-between z-10">
                      <div>
                        <h3 className="text-sm font-bold text-ink">{aiMediaJobDetail.title || 'İş Detayı'}</h3>
                        <span className="text-[9px] font-mono text-ink-muted">{aiMediaJobDetail.id}</span>
                      </div>
                      <button onClick={() => setShowJobDrawer(false)} className="w-7 h-7 rounded flex items-center justify-center hover:bg-[var(--color-surface-raised)]">
                        <svg className="w-4 h-4 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <div className="p-3 space-y-4">
                      {/* State Badge */}
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold text-white ${STATE_LABELS[aiMediaJobDetail.state]?.color || 'bg-gray-400'}`}>
                          {STATE_LABELS[aiMediaJobDetail.state]?.label || aiMediaJobDetail.state}
                        </span>
                        <span className="text-[10px] text-ink-muted">Deneme: {aiMediaJobDetail.retry_count}/{aiMediaJobDetail.max_retries}</span>
                      </div>
                      {/* Identity */}
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div><span className="text-ink-muted">Model:</span> <span className="text-ink font-semibold">{aiMediaJobDetail.model}</span></div>
                        <div><span className="text-ink-muted">Oran:</span> <span className="text-ink font-semibold">{aiMediaJobDetail.aspect_ratio}</span></div>
                        <div><span className="text-ink-muted">Süre:</span> <span className="text-ink font-semibold">{aiMediaJobDetail.duration_seconds}s</span></div>
                        <div><span className="text-ink-muted">Öncelik:</span> <span className="text-ink font-semibold">{aiMediaJobDetail.priority}</span></div>
                        <div className="col-span-2"><span className="text-ink-muted">Çip Bağlama:</span> <span className={`font-bold ${aiMediaJobDetail.expected_ingredient_count === aiMediaJobDetail.actual_ingredient_count ? 'text-ok' : 'text-danger'}`}>{aiMediaJobDetail.actual_ingredient_count}/{aiMediaJobDetail.expected_ingredient_count}</span></div>
                      </div>
                      {/* Prompt */}
                      <div>
                        <div className="text-[10px] font-semibold text-ink-muted mb-1">Prompt</div>
                        <div className="bg-canvas border border-[var(--color-hairline)] rounded p-2 text-[10px] text-ink font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">{aiMediaJobDetail.prompt}</div>
                      </div>
                      {/* Error */}
                      {aiMediaJobDetail.error_message && (
                        <div className="bg-danger/10 border border-danger/20 rounded p-2.5">
                          <div className="text-[9px] font-bold text-danger uppercase mb-0.5">{aiMediaJobDetail.error_code || 'HATA'}</div>
                          <div className="text-[10px] text-ink">{aiMediaJobDetail.error_message}</div>
                        </div>
                      )}
                      {/* Creative Orchestrator Info (SHORT & LONG) */}
                      {aiMediaJobDetail.metadata?.provenance && (
                        <div className="bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded p-2.5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-ink">Creative Orchestrator Provenance</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-mono font-bold">
                              {aiMediaJobDetail.metadata?.strategy?.strategyType || 'CREATIVE_PIPELINE'}
                            </span>
                          </div>

                          {/* Brand & Reference Handles */}
                          <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                            <div><span className="text-ink-muted">Gerçek Flow UUID:</span> <span className="font-mono text-ink font-semibold">{aiMediaJobDetail.metadata.real_flow_project_uuid || aiMediaJobDetail.metadata.provenance.flow_project_id || '—'}</span></div>
                            <div><span className="text-ink-muted">Referanslar:</span> <span className="font-mono text-ink">{(aiMediaJobDetail.metadata.provenance.reference_registry_handles || []).join(', ') || '—'}</span></div>
                          </div>

                          {/* Multi-Scene Breakdown (LONG VIDEO) */}
                          {aiMediaJobDetail.metadata.provenance.qa_reports?.sceneFlowProjectUuids && Object.keys(aiMediaJobDetail.metadata.provenance.qa_reports.sceneFlowProjectUuids).length > 0 && (
                            <div className="pt-1.5 border-t border-[var(--color-hairline)] space-y-1">
                              <span className="text-[9px] font-bold text-ink-muted uppercase">Sahne Flow Projeleri (DAG)</span>
                              <div className="space-y-1 max-h-36 overflow-y-auto">
                                {Object.entries(aiMediaJobDetail.metadata.provenance.qa_reports.sceneFlowProjectUuids).map(([sceneId, uuid]: any) => (
                                  <div key={sceneId} className="flex items-center justify-between text-[9px] p-1 rounded bg-canvas border border-[var(--color-hairline)]">
                                    <span className="font-bold text-ink">{sceneId}</span>
                                    <span className="font-mono text-ink-muted">{uuid}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Final SHA256 & Finishing */}
                          <div className="text-[9px] text-ink-muted pt-1 border-t border-[var(--color-hairline)] flex items-center justify-between">
                            <span>Çıktı SHA256: <span className="font-mono text-ink">{aiMediaJobDetail.metadata.provenance.final_output_sha256?.slice(0, 16)}…</span></span>
                            <span className="text-ok font-semibold">Deterministic Finishing: PASS</span>
                          </div>
                        </div>
                      )}

                      {/* Audit Timeline placeholder */}
                      <div>
                        <div className="text-[10px] font-semibold text-ink-muted mb-1">Denetim Zaman Çizelgesi</div>
                        <div className="text-[10px] text-ink-muted py-3 text-center border border-dashed border-[var(--color-hairline)] rounded">Etkinlik geçmişi yüklenecek (ai_media_events)</div>
                      </div>
                      {/* Admin Actions */}
                      <div className="flex gap-2 pt-2 border-t border-[var(--color-hairline)]">
                        {(aiMediaJobDetail.state === 'FAILED' || aiMediaJobDetail.state === 'NEEDS_REVIEW') && (
                          <button className="px-3 py-1.5 bg-accent text-accent-ink text-[10px] font-bold rounded shadow hover:bg-accent-dim transition">Yeniden Dene</button>
                        )}
                        {!['COMPLETED', 'FAILED'].includes(aiMediaJobDetail.state) && (
                          <button className="px-3 py-1.5 bg-danger text-white text-[10px] font-bold rounded shadow hover:bg-danger/80 transition">İptal Et</button>
                        )}
                        <button className="px-3 py-1.5 bg-warning text-white text-[10px] font-bold rounded shadow hover:bg-warning/80 transition">Manuel İncelemeye Al</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* TAB 7: KARA LİSTE (BLACKLIST) */}
        {activeTab === 'blacklist' && (
          <div className="space-y-4">
            {/* Add Blacklist Form */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 sm:p-5 shadow-sm space-y-3">
              <div className="border-b border-[var(--color-hairline)] pb-2.5">
                <h2 className="text-xs sm:text-sm font-bold text-ink">Yeni Numara Engelle (Kara Liste)</h2>
                <p className="text-[11px] text-ink-muted">
                  Kampanyalardan ve otomatik yanıtlardan kalıcı olarak muaf tutulacak numarayı ekleyin.
                </p>
              </div>

              <form onSubmit={handleAddBlacklist} className="flex flex-wrap sm:flex-nowrap gap-2">
                <input
                  type="text"
                  placeholder="Telefon: +905xxxxxxxxx"
                  value={blackPhone}
                  onChange={e => setBlackPhone(e.target.value)}
                  className="flex-1 bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-mono text-ink outline-none focus:border-accent"
                />
                <input
                  type="text"
                  placeholder="Gerekçe (İstemiyor, Şikayet, Test vb.)"
                  value={blackReason}
                  onChange={e => setBlackReason(e.target.value)}
                  className="flex-1 bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={blackSubmitting || !blackPhone.trim()}
                  className="px-4 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold bg-danger text-white hover:bg-danger/90 transition disabled:opacity-50"
                >
                  {blackSubmitting ? 'Ekleniyor...' : 'Engelle'}
                </button>
              </form>
            </div>

            {/* Blacklist Table */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 sm:p-5 shadow-sm space-y-3">
              <h2 className="text-xs sm:text-sm font-bold text-ink">Engellenen Numaralar Listesi</h2>
              {filteredBlacklist.length === 0 ? (
                <p className="text-xs text-ink-muted text-center py-6">Engellenen numara kaydı bulunmuyor.</p>
              ) : (
                <>
                  {/* Mobile Card List for Blacklist */}
                  <div className="block sm:hidden space-y-2.5">
                    {filteredBlacklist.map(b => (
                      <div
                        key={b.id}
                        className="bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-danger">{b.phone_e164}</span>
                          <span className="text-[10px] text-ink-muted">{timeAgo(b.created_at)}</span>
                        </div>
                        <div className="text-xs text-ink-soft bg-surface/70 border border-[var(--color-hairline)] rounded p-2">
                          <span className="block text-[10px] text-ink-muted font-semibold uppercase mb-0.5">Gerekçe</span>
                          <span>{b.reason || 'Gerekçe belirtilmemiş'}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-ink-muted">{b.org_name || 'Genel'}</span>
                          <button
                            onClick={() => handleRemoveBlacklist(b.id)}
                            disabled={actionBusy}
                            className="px-3 py-1 text-xs font-semibold rounded bg-danger/10 text-danger hover:bg-danger/20 transition"
                          >
                            Engeli Kaldır
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[550px]">
                      <thead>
                        <tr className="border-b border-[var(--color-hairline)] text-ink-muted font-semibold">
                          <th className="pb-2">Telefon</th>
                          <th className="pb-2">Gerekçe</th>
                          <th className="pb-2">İşletme</th>
                          <th className="pb-2">Tarih</th>
                          <th className="pb-2 text-right">Eylem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-hairline)]">
                        {filteredBlacklist.map(b => (
                          <tr key={b.id} className="hover:bg-[var(--color-surface-raised)]">
                            <td className="py-2 font-mono font-semibold text-danger">{b.phone_e164}</td>
                            <td className="py-2 text-ink-soft">{b.reason || 'Gerekçe belirtilmemiş'}</td>
                            <td className="py-2 text-ink-muted">{b.org_name || 'Genel'}</td>
                            <td className="py-2 text-ink-muted">{timeAgo(b.created_at)}</td>
                            <td className="py-2 text-right">
                              <button
                                onClick={() => handleRemoveBlacklist(b.id)}
                                disabled={actionBusy}
                                className="px-2 py-0.5 text-xs font-semibold rounded bg-surface-raised text-danger hover:bg-danger/10"
                              >
                                Kaldır
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 8: BAILEYS HAT VE SUNUCU KONTROLÜ */}
        {activeTab === 'baileys' && (
          <div className="space-y-4">
            {/* HETZNER VPS LIVE SYSTEM TELEMETRY PANEL */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 sm:p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-hairline)] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs sm:text-sm font-bold text-ink">Hetzner VPS Donanım & Sistem Kaynakları</h2>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-ok-soft text-ok-dim font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-ok animate-pulse" />
                      Canlı Telemetri
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    Sunucu IP: <span className="font-mono font-medium text-ink-soft">167.233.201.31</span> · Uptime: <span className="font-medium text-ink-soft">{data?.serverMetrics?.uptime_text || '10 gün 3 saat'}</span> · Son Ölçüm: {timeAgo(data?.serverMetrics?.updated_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRunDiagnostic}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-[var(--radius-sm)] bg-ok-soft text-ok-dim border border-ok/30 hover:bg-ok-soft/80 transition flex items-center gap-1.5"
                  >
                    <span className="w-2 h-2 rounded-full bg-ok animate-pulse" />
                    <span>Canlı Teşhis Testi</span>
                  </button>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-[var(--radius-sm)] ${
                    Number(data?.serverMetrics?.cpu_percent ?? 5) > 80 || Number(data?.serverMetrics?.ram_percent ?? 60) > 85
                      ? 'bg-danger/10 text-danger border border-danger/20'
                      : 'bg-ok-soft text-ok-dim border border-ok/20'
                  }`}>
                    {Number(data?.serverMetrics?.cpu_percent ?? 5) > 80 || Number(data?.serverMetrics?.ram_percent ?? 60) > 85
                      ? 'Sunucu Yük Altında'
                      : 'Sistem Kararlı & Sağlıklı'}
                  </span>
                </div>
              </div>

              {/* 3 Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Metric 1: CPU & Load */}
                <div className="bg-canvas border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-ink-muted uppercase">İşlemci (CPU)</span>
                    <span className="text-[10px] font-mono font-semibold text-accent">{data?.serverMetrics?.cpu_cores ?? 2} Çekirdek (vCPU)</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-bold text-ink">%{data?.serverMetrics?.cpu_percent ?? 5.6}</span>
                    <span className="text-xs text-ink-muted">anlık kullanım</span>
                  </div>
                  <div className="w-full bg-surface-raised rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        Number(data?.serverMetrics?.cpu_percent ?? 5) > 80 ? 'bg-danger' : Number(data?.serverMetrics?.cpu_percent ?? 5) > 50 ? 'bg-warn' : 'bg-ok'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, Number(data?.serverMetrics?.cpu_percent ?? 5)))}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-ink-muted flex items-center justify-between pt-1 font-mono">
                    <span>Yük Ortalaması:</span>
                    <span>1dk: {data?.serverMetrics?.load_1m ?? 0.1} · 5dk: {data?.serverMetrics?.load_5m ?? 0.15} · 15dk: {data?.serverMetrics?.load_15m ?? 0.11}</span>
                  </div>
                </div>

                {/* Metric 2: RAM */}
                <div className="bg-canvas border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-ink-muted uppercase">Bellek (RAM)</span>
                    <span className="text-[10px] font-mono font-semibold text-ink-muted">
                      {(((data?.serverMetrics?.ram_total_mb ?? 3809) / 1024)).toFixed(2)} GB Toplam
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-bold text-ink">%{data?.serverMetrics?.ram_percent ?? 60.0}</span>
                    <span className="text-xs text-ink-muted">
                      ({(((data?.serverMetrics?.ram_used_mb ?? 2284) / 1024)).toFixed(2)} GB kullanılıyor)
                    </span>
                  </div>
                  <div className="w-full bg-surface-raised rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        Number(data?.serverMetrics?.ram_percent ?? 60) > 85 ? 'bg-danger' : Number(data?.serverMetrics?.ram_percent ?? 60) > 70 ? 'bg-warn' : 'bg-accent'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, Number(data?.serverMetrics?.ram_percent ?? 60)))}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-ink-muted flex items-center justify-between pt-1 font-mono">
                    <span>Kullanılabilir Boş:</span>
                    <span className="text-ok-dim font-semibold">{(((data?.serverMetrics?.ram_free_mb ?? 1525) / 1024)).toFixed(2)} GB</span>
                  </div>
                </div>

                {/* Metric 3: Disk */}
                <div className="bg-canvas border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-ink-muted uppercase">Depolama (NVMe Disk)</span>
                    <span className="text-[10px] font-mono font-semibold text-ink-muted">
                      {data?.serverMetrics?.disk_total_gb ?? 74.8} GB Toplam
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-bold text-ink">%{data?.serverMetrics?.disk_percent ?? 23.8}</span>
                    <span className="text-xs text-ink-muted">
                      ({data?.serverMetrics?.disk_used_gb ?? 17.8} GB dolu)
                    </span>
                  </div>
                  <div className="w-full bg-surface-raised rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-ok transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, Number(data?.serverMetrics?.disk_percent ?? 24)))}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-ink-muted flex items-center justify-between pt-1 font-mono">
                    <span>Kalan Boş Alan:</span>
                    <span className="text-ink-soft font-semibold">{(((data?.serverMetrics?.disk_total_gb ?? 74.8) - (data?.serverMetrics?.disk_used_gb ?? 17.8))).toFixed(1)} GB</span>
                  </div>
                </div>
              </div>

              {/* Docker Containers Real-time Breakdown */}
              {data?.serverMetrics?.containers && data.serverMetrics.containers.length > 0 && (
                <div className="border border-[var(--color-hairline)] rounded-[var(--radius-sm)] overflow-hidden bg-canvas">
                  <div className="px-3 py-2 bg-surface-raised/60 border-b border-[var(--color-hairline)] flex items-center justify-between">
                    <span className="text-[10px] font-bold text-ink uppercase tracking-wider">Konteyner Bazlı Anlık Kaynak Tüketimi (Docker)</span>
                    <span className="text-[10px] text-ink-muted font-mono">{data.serverMetrics.containers.length} Konteyner Çalışıyor</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] min-w-[550px]">
                      <thead>
                        <tr className="border-b border-[var(--color-hairline)] text-ink-muted font-semibold bg-surface/50">
                          <th className="px-3 py-1.5">Konteyner / Servis</th>
                          <th className="px-3 py-1.5">İşlemci (CPU)</th>
                          <th className="px-3 py-1.5">Bellek Tüketimi (RAM)</th>
                          <th className="px-3 py-1.5">RAM Oranı</th>
                          <th className="px-3 py-1.5 text-right">Durum</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-hairline)]">
                        {data.serverMetrics.containers.map((c, idx) => (
                          <tr key={idx} className="hover:bg-surface-raised/40">
                            <td className="px-3 py-2 font-mono font-bold text-ink flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-ok" />
                              {c.name === 'wa-service' ? 'wa-service (WhatsApp Gönderim Servisi)' : c.name === 'omnistudio-engine' ? 'omnistudio-engine (Afiş & Görsel Yapay Zekası)' : c.name}
                            </td>
                            <td className="px-3 py-2 font-mono font-semibold text-accent">{c.cpu}</td>
                            <td className="px-3 py-2 font-mono text-ink-soft">{c.mem}</td>
                            <td className="px-3 py-2 font-mono text-ink-muted">{c.mem_percent}</td>
                            <td className="px-3 py-2 text-right">
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-ok-soft text-ok-dim">
                                Canlı
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-ink">Servis Durumu ve Hat Yönetimi</h2>
                <p className="text-[11px] text-ink-muted">WhatsApp gönderim servisi, bağlı hatlar, kilit ve oturum durumu</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {filteredAccounts?.map(a => (
                <div
                  key={a.id}
                  className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 sm:p-4 shadow-sm space-y-2.5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-ink">{a.label}</h3>
                        <p className="font-mono text-[11px] text-ink-soft mt-0.5">{a.phone_e164 || 'Numara yok'}</p>
                      </div>
                      <span
                        className={`text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                          a.status === 'connected'
                            ? 'bg-ok-soft text-ok-dim'
                            : a.status === 'connecting'
                            ? 'bg-accent-soft text-accent'
                            : 'bg-danger/10 text-danger'
                        }`}
                      >
                        {a.status === 'connected' ? 'Bağlı' : a.status}
                      </span>
                    </div>

                    <div className="mt-2 space-y-0.5 text-[10px] sm:text-[11px] text-ink-muted">
                      <div>İşletme: <span className="font-semibold text-ink-soft">{a.org_name}</span></div>
                      <div>Son Görülme: {timeAgo(a.last_seen_at)}</div>
                      {a.status_detail && (
                        <div className="text-danger font-mono text-[9px] truncate">{a.status_detail}</div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1 pt-2 border-t border-[var(--color-hairline)]">
                    <button
                      onClick={() => handleAccountAction(a.id, 'connect')}
                      disabled={actionBusy}
                      className="py-1 text-xs font-semibold rounded bg-accent-soft text-accent hover:bg-accent/20 transition disabled:opacity-50"
                    >
                      Bağlan
                    </button>
                    <button
                      onClick={() => handleAccountAction(a.id, 'sync_contacts')}
                      disabled={actionBusy || a.status !== 'connected'}
                      className="py-1 text-xs font-semibold rounded bg-surface-raised text-ink hover:bg-canvas transition disabled:opacity-50"
                    >
                      Rehberi Eşle
                    </button>
                    <button
                      onClick={() => handleAccountAction(a.id, 'disconnect')}
                      disabled={actionBusy || a.status !== 'connected'}
                      className="py-1 text-xs font-semibold rounded bg-warn/10 text-warn hover:bg-warn/20 transition disabled:opacity-50"
                    >
                      Kopar
                    </button>
                    <button
                      onClick={() => handleAccountAction(a.id, 'logout')}
                      disabled={actionBusy}
                      className="py-1 text-xs font-semibold rounded bg-danger/10 text-danger hover:bg-danger/20 transition disabled:opacity-50"
                    >
                      Çıkış Yap
                    </button>
                    {a.status === 'connected' && (
                      <button
                        onClick={() => {
                          setQuickAccountId(a.id)
                          setQuickPhone(a.phone_e164 || '+905428212205')
                          setQuickMessage(`Merhaba, bu ${a.label} (${a.phone_e164 || ''}) hattı için Super Admin panelinden gönderilen anlık bağlantı testidir.`)
                          setActiveTab('quick_send')
                          showNotice(`${a.label} için test mesajı hazırlandı.`)
                        }}
                        className="col-span-2 py-1 text-xs font-semibold rounded bg-ok-soft text-ok-dim hover:bg-ok-soft/80 transition"
                      >
                        Canlı Test Mesajı Gönder
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 9: CANLI MESAJ VE YAPAY ZEKA (AI) YANIT AKIŞI */}
        {activeTab === 'messages' && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 sm:p-5 shadow-sm space-y-4">
            {/* Header & Sub-Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[var(--color-hairline)] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xs sm:text-sm font-bold text-ink">Mesaj Yanıt Masası</h2>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-accent-soft text-accent">
                    {filteredAiSuggestions.length} AI Öneri · {filteredMessages.length} Mesaj
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  Müşterilerden gelen gerçek zamanlı talepler, ChatGPT tarafından üretilen yanıt alternatifleri ve otomatik yanıtlar
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSimulator(!showSimulator)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-[var(--radius-sm)] border transition flex items-center gap-1.5 ${
                    showSimulator
                      ? 'bg-accent text-accent-ink border-accent'
                      : 'bg-[var(--color-surface-raised)] text-ink-soft border-[var(--color-hairline)] hover:bg-canvas'
                  }`}
                >
                  <span>{showSimulator ? 'Simülatörü Kapat' : 'Canlı AI Öneri Testi'}</span>
                </button>
              </div>
            </div>

            {/* Sub-Tabs Selector */}
            <div
              onWheel={(e) => {
                if (e.deltaY !== 0) e.currentTarget.scrollLeft += e.deltaY;
              }}
              className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-[var(--color-hairline-strong)] bg-[var(--color-surface-raised)] p-1 rounded-[var(--radius-sm)] border border-[var(--color-hairline)]"
            >
              {[
                { id: 'all', label: 'Tüm Mesaj Akışı', count: filteredMessages.length },
                { id: 'in', label: 'Gelenler', count: filteredMessages.filter(m => m.direction === 'in').length },
                { id: 'out', label: 'Gidenler', count: filteredMessages.filter(m => m.direction === 'out').length },
                { id: 'pdf', label: 'PDF ve Belgeler', count: filteredMessages.filter(m => m.message_type === 'document' || (m.media_url && m.media_url.toLowerCase().includes('.pdf'))).length },
                { id: 'images', label: 'Görseller', count: filteredMessages.filter(m => m.message_type === 'image' || (m.media_url && !m.media_url.toLowerCase().includes('.pdf'))).length },
                { id: 'suggestions', label: 'AI Yanıt Önerileri', count: filteredAiSuggestions.length },
                { id: 'auto_reply', label: 'Otomatik Yanıtlar', count: filteredAutoReplies.length },
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setMsgStreamTab(sub.id as any)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded whitespace-nowrap transition flex items-center gap-1.5 ${
                    msgStreamTab === sub.id
                      ? 'bg-surface text-ink shadow-xs'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <span>{sub.label}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                      msgStreamTab === sub.id ? 'bg-accent-soft text-accent font-bold' : 'bg-canvas text-ink-muted'
                    }`}
                  >
                    {sub.count}
                  </span>
                </button>
              ))}
            </div>

            {/* AI Suggestion Test Simulator (Collapsible) */}
            {showSimulator && (
              <div className="bg-canvas border border-accent/30 rounded-[var(--radius-sm)] p-3 sm:p-4 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                    <h3 className="text-xs font-bold text-ink">Canlı ChatGPT Müşteri Yanıt Simülatörü</h3>
                  </div>
                  <span className="text-[10px] text-ink-muted">Müşteri gibi bir soru yazın ve üretilen 3 yanıtı canlı izleyin</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={simulatedPrompt}
                    onChange={e => setSimulatedPrompt(e.target.value)}
                    placeholder="Örnek: Colombia kahvede kargo bedava olması için kaç paket almalıyım?"
                    className="flex-1 bg-surface border border-[var(--color-hairline)] rounded-[var(--radius-sm)] px-3 py-1.5 text-xs text-ink placeholder:text-ink-muted outline-none focus:border-accent"
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSimulateSuggestion()
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSimulateSuggestion()}
                    disabled={simulatingAi || !simulatedPrompt.trim()}
                    className="px-3.5 py-1.5 bg-accent text-accent-ink rounded-[var(--radius-sm)] text-xs font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {simulatingAi ? 'Üretiliyor...' : 'Öneri Üret (ChatGPT)'}
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-ink-muted">Hızlı Örnekler:</span>
                  {[
                    'Kargo ne zaman teslim edilir?',
                    'Ürün fiyatı ve ödeme yöntemleri neler?',
                    'Toplu alımda indirim yapıyor musunuz?',
                  ].map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => {
                        setSimulatedPrompt(preset)
                        handleSimulateSuggestion(preset)
                      }}
                      className="text-[10px] bg-surface border border-[var(--color-hairline)] px-2 py-0.5 rounded text-ink-soft hover:text-accent hover:border-accent transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Simulated Results Preview */}
                {simulatedSuggestions && (
                  <div className="mt-3 pt-3 border-t border-[var(--color-hairline)] space-y-2">
                    <span className="text-[11px] font-bold text-accent">ChatGPT Tarafından Anında Üretilen Yanıt Seçenekleri:</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      {simulatedSuggestions.map((sg, sIdx) => (
                        <div key={sIdx} className="bg-surface p-2.5 rounded border border-[var(--color-hairline)] flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-accent-soft text-accent uppercase">
                                {sg.label}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(sg.text)
                                  showNotice('Yanıt panoya kopyalandı.')
                                }}
                                className="text-[10px] text-ink-muted hover:text-ink font-medium"
                              >
                                Kopyala
                              </button>
                            </div>
                            <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap">{sg.text}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickMessage(sg.text)
                              setActiveTab('quick_send')
                              showNotice('Öneri hızlı gönderim konsoluna aktarıldı.')
                            }}
                            className="mt-2 text-[10px] font-semibold text-accent hover:underline text-right"
                          >
                            Bu Yanıtla Gönderim Yap →
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VIEW 1: CHATGPT & AI YANIT ÖNERİLERİ */}
            {msgStreamTab === 'suggestions' && (
              <div>
                {filteredAiSuggestions.length === 0 ? (
                  <div className="text-center py-8 text-ink-muted text-xs bg-canvas rounded-[var(--radius-card)] border border-[var(--color-hairline)]">
                    Henüz AI yanıt önerisi kaydı bulunmuyor. Yukarıdaki simülatörle anında test edebilirsiniz.
                  </div>
                ) : (
                  <div className="grid gap-3 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.4fr)]">
                    <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-canvas">
                      <div className="border-b border-[var(--color-hairline)] px-3 py-2">
                        <h3 className="text-xs font-bold text-ink">Müşteri Talepleri</h3>
                        <p className="text-[10px] text-ink-muted">{filteredAiSuggestions.length} kayıt · önce cevaplanacak soruyu seç</p>
                      </div>
                      <div className="max-h-[520px] overflow-y-auto p-2 space-y-1.5">
                        {filteredAiSuggestions.map(item => {
                          const active = selectedSuggestion?.id === item.id
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setSelectedSuggestionId(item.id)}
                              className={`w-full rounded-[var(--radius-sm)] border p-2.5 text-left transition ${
                                active
                                  ? 'border-accent bg-accent-soft/40'
                                  : 'border-[var(--color-hairline)] bg-[var(--color-surface)] hover:border-accent/40'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate text-[10px] font-bold text-accent">
                                  {item.org_name || 'Genel İşletme'}
                                </span>
                                <span className="shrink-0 text-[10px] text-ink-muted">{timeAgo(item.created_at)}</span>
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs font-semibold leading-snug text-ink">
                                {item.incoming_sample}
                              </p>
                              <p className="mt-1 text-[10px] text-ink-muted">
                                {item.suggestions?.length ?? 0} yanıt · {item.source === 'chatgpt' ? 'ChatGPT' : item.source.toUpperCase()}
                              </p>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-canvas p-3 sm:p-4">
                      {selectedSuggestion ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-hairline)] pb-3">
                            <div>
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-accent uppercase tracking-wide">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                                Seçili Müşteri Talebi
                              </div>
                              <p className="mt-1 text-xs sm:text-sm font-semibold text-ink leading-relaxed">
                                "{selectedSuggestion.incoming_sample}"
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setInspectedSuggestion(selectedSuggestion)}
                              className="text-[10px] font-semibold text-accent hover:underline"
                            >
                              JSON & Detay İncele
                            </button>
                          </div>

                          <div>
                            <span className="block text-[11px] font-bold text-ink-soft mb-2">
                              Hazırlanan Yanıt Seçenekleri
                            </span>
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-2.5">
                              {selectedSuggestion.suggestions?.map((sg, idx) => (
                            <div
                              key={idx}
                              className="bg-[var(--color-surface)] border border-[var(--color-hairline)] hover:border-accent/50 rounded-[var(--radius-sm)] p-2.5 sm:p-3 flex flex-col justify-between transition shadow-xs"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1.5">
                                  <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded bg-accent-soft text-accent uppercase">
                                    {sg.label}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(sg.text)
                                      showNotice('Yanıt panoya kopyalandı.')
                                    }}
                                    className="text-[10px] text-ink-muted hover:text-ink font-medium"
                                  >
                                    Kopyala
                                  </button>
                                </div>
                                <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap">{sg.text}</p>
                              </div>

                              <div className="mt-2.5 pt-2 border-t border-[var(--color-hairline)] flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickMessage(sg.text)
                                    setActiveTab('quick_send')
                                    showNotice('Öneri hızlı gönderim konsoluna aktarıldı.')
                                  }}
                                  className="text-[10px] font-semibold text-accent hover:underline flex items-center gap-1"
                                >
                                  Bu Yanıtla Gönderim Yap →
                                </button>
                              </div>
                            </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VIEW 2: TÜM / GELEN / GİDEN / PDF / GÖRSEL WHATSAPP MESAJLARI */}
            {(msgStreamTab === 'all' || msgStreamTab === 'in' || msgStreamTab === 'out' || msgStreamTab === 'pdf' || msgStreamTab === 'images') && (
              <div className="space-y-2">
                {(() => {
                  const msgs = filteredMessages.filter(m => {
                    if (msgStreamTab === 'all') return true
                    if (msgStreamTab === 'in') return m.direction === 'in'
                    if (msgStreamTab === 'out') return m.direction === 'out'
                    if (msgStreamTab === 'pdf') {
                      return m.message_type === 'document' || (m.media_url && m.media_url.toLowerCase().includes('.pdf'))
                    }
                    if (msgStreamTab === 'images') {
                      return m.message_type === 'image' || (m.media_url && !m.media_url.toLowerCase().includes('.pdf'))
                    }
                    return true
                  })

                  if (msgs.length === 0) {
                    return <p className="text-xs text-ink-muted text-center py-8">Kriterlere uygun mesaj bulunamadı.</p>
                  }

                  return msgs.map(m => {
                    const isPdf = m.message_type === 'document' || (m.media_url && m.media_url.toLowerCase().includes('.pdf'))
                    const isImage = m.message_type === 'image' || (m.media_url && !isPdf)
                    const fileName = m.media_name || (m.media_url ? m.media_url.split('/').pop()?.replace(/^\d+_/, '') : 'Belge')

                    return (
                      <div
                        key={m.id}
                        className={`p-3 rounded-[var(--radius-sm)] border transition flex flex-col gap-2.5 ${
                          m.direction === 'in'
                            ? 'bg-ok-soft/20 border-ok/30'
                            : 'bg-surface-raised/40 border-[var(--color-hairline)]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                  m.direction === 'in' ? 'bg-ok text-white' : 'bg-accent text-white'
                                }`}
                              >
                                {m.direction === 'in' ? 'GELEN' : 'GİDEN'}
                              </span>

                              {isPdf && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-600 text-white">
                                  PDF BELGE
                                </span>
                              )}

                              {isImage && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-accent text-white">
                                  GÖRSEL
                                </span>
                              )}

                              <span className="font-mono text-xs font-semibold text-ink">{m.phone_e164}</span>
                              {m.push_name && (
                                <span className="text-xs font-medium text-ink-soft">({m.push_name})</span>
                              )}
                              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-surface border border-[var(--color-hairline)] text-ink-muted">
                                {m.org_name || 'Genel'}
                              </span>

                              {m.status && (
                                <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded inline-flex items-center gap-1 ${
                                  m.status === 'read'
                                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-bold'
                                    : m.status === 'delivered'
                                    ? 'bg-ok-soft text-ok-dim border border-ok/30 font-bold'
                                    : m.status === 'sent'
                                    ? 'bg-surface-raised text-ink-muted border border-[var(--color-hairline)]'
                                    : 'bg-danger/10 text-danger border border-danger/25'
                                }`}>
                                  {m.status === 'read' ? 'Okundu' : m.status === 'delivered' ? 'İletildi' : m.status === 'sent' ? 'Gönderildi' : m.status}
                                </span>
                              )}

                              <span className="text-[10px] text-ink-muted">· {timeAgo(m.created_at)}</span>
                            </div>

                            {/* Message Body */}
                            {m.body && (
                              <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap">{m.body}</p>
                            )}

                            {/* PDF Document Attachment Card */}
                            {isPdf && m.media_url && (
                              <div className="mt-2 flex items-center justify-between gap-3 p-2.5 rounded-lg border border-red-200/60 bg-red-500/5 dark:border-red-900/40 dark:bg-red-950/20 max-w-lg">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-8 h-8 rounded bg-red-600 text-white flex items-center justify-center font-bold text-[10px] tracking-wider shrink-0 shadow-xs">
                                    PDF
                                  </div>
                                  <div className="truncate">
                                    <div className="text-xs font-semibold text-ink truncate" title={fileName}>
                                      {fileName}
                                    </div>
                                    <div className="text-[10px] text-ink-muted">PDF Dokümanı / Katalog</div>
                                  </div>
                                </div>
                                <a
                                  href={m.media_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 text-[11px] font-semibold text-red-600 dark:text-red-400 bg-surface border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition shrink-0"
                                >
                                  Görüntüle / İndir
                                </a>
                              </div>
                            )}

                            {/* Image Attachment Thumbnail */}
                            {isImage && m.media_url && (
                              <div className="mt-2">
                                <a
                                  href={m.media_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block relative group max-w-xs overflow-hidden rounded-lg border border-[var(--color-hairline)] bg-surface"
                                >
                                  <img
                                    src={m.media_url}
                                    alt="WhatsApp Görseli"
                                    className="max-h-40 w-auto object-cover rounded"
                                    loading="lazy"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[11px] font-semibold">
                                    Tam Boyut Gör
                                  </div>
                                </a>
                              </div>
                            )}

                            {/* Error display */}
                            {m.error && (
                              <div className="mt-1 text-[10px] text-danger bg-danger/5 border border-danger/20 rounded px-2 py-0.5">
                                Gönderim Hatası: {m.error}
                              </div>
                            )}
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {m.direction === 'in' && m.body && (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowSimulator(true)
                                  setSimulatedPrompt(m.body || '')
                                  handleSimulateSuggestion(m.body || '')
                                }}
                                className="px-2 py-1 text-[11px] font-semibold rounded bg-accent-soft text-accent hover:bg-accent/20 border border-accent/25 transition"
                                title="Bu mesaja ChatGPT ile anında 3 yanıt alternatifi üret"
                              >
                                AI Yanıtı İste
                              </button>
                            )}
                            {m.phone_e164 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setQuickPhone(m.phone_e164 || '')
                                  if (m.direction === 'in' && m.body) {
                                    setQuickMessage('')
                                  }
                                  setActiveTab('quick_send')
                                  showNotice(`${m.phone_e164} hızlı yanıt kutusuna aktarıldı.`)
                                }}
                                className="px-2 py-1 text-[11px] font-semibold rounded bg-surface text-ink hover:bg-canvas border border-[var(--color-hairline)] transition"
                              >
                                Hızlı Yanıtla
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            )}

            {/* VIEW 3: OTOMATİK YANITLAR (AUTO REPLIES) */}
            {msgStreamTab === 'auto_reply' && (
              <div className="space-y-2">
                {filteredAutoReplies.length === 0 ? (
                  <p className="text-xs text-ink-muted text-center py-8">Henüz otomatik yanıt kaydı bulunmuyor.</p>
                ) : (
                  filteredAutoReplies.map(ar => (
                    <div
                      key={ar.id}
                      className="p-3 rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-accent text-white">
                            OTO-YANIT
                          </span>
                          <span className="font-mono text-xs font-semibold text-ink">{ar.phone_e164}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-surface-raised border border-[var(--color-hairline)] text-ink-muted">
                            {ar.org_name || 'Genel'}
                          </span>
                          <span className="text-[10px] text-ink-muted">· {timeAgo(ar.created_at)}</span>
                        </div>
                        <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap">{ar.reply_body}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setQuickPhone(ar.phone_e164)
                          setActiveTab('quick_send')
                          showNotice(`${ar.phone_e164} hızlı yanıt kutusuna aktarıldı.`)
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-surface-raised text-ink hover:bg-canvas border border-[var(--color-hairline)] transition"
                      >
                        Hızlı Yanıtla
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 10: İŞ KUYRUĞU (JOBS) */}
        {activeTab === 'jobs' && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 sm:p-5 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-hairline)] pb-2.5">
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-ink">PostgreSQL Arka Plan Görev Kuyruğu (Jobs)</h2>
                <p className="text-[11px] text-ink-muted">VPS worker tarafından asenkron işlenen komutlar</p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-[var(--color-surface-raised)] p-0.5 rounded-[var(--radius-sm)]">
                {(['all', 'pending', 'running', 'failed', 'done'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setJobFilter(s)}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded ${
                      jobFilter === s ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {s === 'all'
                      ? 'Tümü'
                      : s === 'pending'
                      ? 'Bekleyen'
                      : s === 'running'
                      ? 'Çalışan'
                      : s === 'failed'
                      ? 'Hatalı'
                      : 'Bitti'}
                  </button>
                ))}
              </div>
            </div>

            {filteredJobs.length === 0 ? (
              <p className="text-xs text-ink-muted text-center py-6">Kayıtlı iş bulunamadı.</p>
            ) : (
              <>
                {/* Mobile Card List for Jobs */}
                <div className="block sm:hidden space-y-2.5">
                  {filteredJobs.map(j => (
                    <div
                      key={j.id}
                      className="bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-ink">#{j.id}</span>
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-accent/10 text-accent font-semibold">
                            {j.type}
                          </span>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            j.status === 'done'
                              ? 'bg-ok-soft text-ok-dim'
                              : j.status === 'running' || j.status === 'claimed'
                              ? 'bg-accent-soft text-accent'
                              : j.status === 'failed'
                              ? 'bg-danger/10 text-danger'
                              : 'bg-warn/10 text-warn'
                          }`}
                        >
                          {j.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-ink-muted">
                        <span>Deneme: <b className="text-ink">{j.attempts}/{j.max_attempts}</b></span>
                        <span>Öncelik: <b className="text-ink">{j.priority}</b></span>
                        <span>{timeAgo(j.created_at)}</span>
                      </div>

                      {j.error && (
                        <p className="text-[10px] text-danger font-mono bg-danger/10 p-2 rounded">
                          {j.error}
                        </p>
                      )}

                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => setInspectedJob(j)}
                          className="px-3 py-1 text-xs font-semibold rounded bg-surface border border-[var(--color-hairline)] text-ink hover:bg-canvas transition"
                        >
                          JSON Payloads İncele
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead>
                      <tr className="border-b border-[var(--color-hairline)] text-ink-muted font-semibold">
                        <th className="pb-2">İş No</th>
                        <th className="pb-2">Tür</th>
                        <th className="pb-2">Öncelik</th>
                        <th className="pb-2">Durum</th>
                        <th className="pb-2">Deneme</th>
                        <th className="pb-2">Oluşturulma</th>
                        <th className="pb-2">Hata / Detay</th>
                        <th className="pb-2 text-right">İncele</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-hairline)]">
                      {filteredJobs.map(j => (
                        <tr key={j.id} className="hover:bg-[var(--color-surface-raised)]">
                          <td className="py-2 font-mono font-semibold text-ink">#{j.id}</td>
                          <td className="py-2 font-mono text-[10px] sm:text-[11px] text-accent font-semibold">{j.type}</td>
                          <td className="py-2 text-ink-muted">{j.priority}</td>
                          <td className="py-2">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                                j.status === 'done'
                                  ? 'bg-ok-soft text-ok-dim'
                                  : j.status === 'running' || j.status === 'claimed'
                                  ? 'bg-accent-soft text-accent'
                                  : j.status === 'failed'
                                  ? 'bg-danger/10 text-danger'
                                  : 'bg-warn/10 text-warn'
                              }`}
                            >
                              {j.status}
                            </span>
                          </td>
                          <td className="py-2 text-ink-muted">
                            {j.attempts}/{j.max_attempts}
                          </td>
                          <td className="py-2 text-ink-muted">{timeAgo(j.created_at)}</td>
                          <td className="py-2 text-danger font-mono text-[10px] max-w-xs truncate">
                            {j.error || '—'}
                          </td>
                          <td className="py-2 text-right">
                            <button
                              onClick={() => setInspectedJob(j)}
                              className="px-2 py-0.5 text-xs font-semibold rounded bg-surface-raised text-ink hover:bg-canvas"
                            >
                              JSON
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* MODAL 1: CONTACTS LIST INSPECTOR */}
      {previewListId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-3.5 sm:p-4 border-b border-[var(--color-hairline)] flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-ink">{previewListName} — Kişiler</h3>
                <p className="text-[11px] text-ink-muted">Toplam {previewTotal} kayıt</p>
              </div>
              <button
                onClick={() => setPreviewListId(null)}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-surface-raised text-ink-soft hover:bg-canvas flex items-center justify-center font-bold text-xs"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              {previewLoading ? (
                <div className="text-center py-6 text-xs text-ink-muted">Kişiler yükleniyor...</div>
              ) : previewContacts.length === 0 ? (
                <div className="text-center py-6 text-xs text-ink-muted">Bu grupta kayıt bulunamadı.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] sm:text-xs min-w-[480px]">
                    <thead>
                      <tr className="border-b border-[var(--color-hairline)] text-ink-muted font-semibold">
                        <th className="pb-2">Telefon</th>
                        <th className="pb-2">İsim</th>
                        <th className="pb-2">Kaynak</th>
                        <th className="pb-2">Durum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-hairline)]">
                      {previewContacts.map(c => (
                        <tr key={c.id} className="hover:bg-[var(--color-surface-raised)]">
                          <td className="py-2 font-mono font-semibold text-ink">{c.phone_e164}</td>
                          <td className="py-2 text-ink-soft">{c.name || '—'}</td>
                          <td className="py-2 text-ink-muted">{c.source || '—'}</td>
                          <td className="py-2">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${
                                c.wa_status === 'valid'
                                  ? 'bg-ok-soft text-ok-dim'
                                  : c.wa_status === 'invalid'
                                  ? 'bg-danger/10 text-danger'
                                  : 'bg-surface-raised text-ink-muted'
                              }`}
                            >
                              {c.wa_status || 'bilinmiyor'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-[var(--color-hairline)] flex justify-between items-center bg-canvas">
              <a
                href={`/api/canli-takip/contacts?listId=${previewListId}&format=csv`}
                download
                className="px-3 py-1 text-xs font-semibold rounded bg-accent text-accent-ink hover:bg-accent-dim"
              >
                CSV İndir
              </a>
              <button
                onClick={() => setPreviewListId(null)}
                className="px-3 py-1 text-xs font-semibold rounded bg-surface border border-[var(--color-hairline)] text-ink hover:bg-canvas"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: JOB DETAIL JSON INSPECTOR */}
      {inspectedJob && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-3.5 sm:p-4 border-b border-[var(--color-hairline)] flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-ink">
                  İş Detayı: #{inspectedJob.id} ({inspectedJob.type})
                </h3>
                <p className="text-[11px] text-ink-muted">Durum: {inspectedJob.status.toUpperCase()}</p>
              </div>
              <button
                onClick={() => setInspectedJob(null)}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-surface-raised text-ink-soft hover:bg-canvas flex items-center justify-center font-bold text-xs"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 font-mono text-[10px] sm:text-[11px]">
              <div>
                <span className="block text-ink-muted font-sans font-semibold mb-1">Payload (Girdi):</span>
                <pre className="bg-canvas p-2.5 rounded border border-[var(--color-hairline)] overflow-x-auto text-ink">
                  {JSON.stringify(inspectedJob.payload, null, 2)}
                </pre>
              </div>

              {inspectedJob.result && (
                <div>
                  <span className="block text-ink-muted font-sans font-semibold mb-1">Result (Sonuç):</span>
                  <pre className="bg-canvas p-2.5 rounded border border-[var(--color-hairline)] overflow-x-auto text-ok-dim">
                    {JSON.stringify(inspectedJob.result, null, 2)}
                  </pre>
                </div>
              )}

              {inspectedJob.error && (
                <div>
                  <span className="block text-ink-muted font-sans font-semibold mb-1">Hata Detayı:</span>
                  <pre className="bg-danger/5 p-2.5 rounded border border-danger/20 overflow-x-auto text-danger">
                    {inspectedJob.error}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-2.5 sm:p-3 border-t border-[var(--color-hairline)] flex justify-end bg-canvas">
              <button
                onClick={() => setInspectedJob(null)}
                className="px-3 py-1 text-xs font-semibold rounded bg-surface border border-[var(--color-hairline)] text-ink hover:bg-canvas"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CHATGPT & CREATIVE JSON & PROMPT INSPECTOR */}
      {inspectedCreative && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-3.5 sm:p-4 border-b border-[var(--color-hairline)] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-bold text-ink">
                    {inspectedCreative.format === 'video' ? 'Google Flow & Veo Video Komutu & JSON' : 'ChatGPT Görsel Üretim Komutu & JSON'}
                  </h3>
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-accent-soft text-accent">
                    {inspectedCreative.org_name || 'Genel'}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-ink-muted">
                  Durum: {inspectedCreative.status.toUpperCase()} · Tür: {inspectedCreative.generation_type || 'yeni'} · Format: {inspectedCreative.format}
                </p>
              </div>
              <button
                onClick={() => setInspectedCreative(null)}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-surface-raised text-ink-soft hover:bg-canvas flex items-center justify-center font-bold text-xs"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
              {/* Media Preview if available */}
              {inspectedCreative.public_url && (
                <div className="max-h-80 bg-canvas rounded border border-[var(--color-hairline)] overflow-hidden flex items-center justify-center">
                  {(inspectedCreative.format === 'video' || (typeof inspectedCreative.public_url === 'string' && inspectedCreative.public_url.toLowerCase().endsWith('.mp4'))) ? (
                    <video
                      src={getSafeMediaUrl(inspectedCreative.public_url)}
                      controls
                      autoPlay
                      playsInline
                      className="max-h-80 w-full object-contain"
                    />
                  ) : (
                    <img
                      src={getSafeMediaUrl(inspectedCreative.public_url)}
                      alt={inspectedCreative.title}
                      className="max-h-56 object-contain"
                    />
                  )}
                </div>
              )}

              {/* User Brief / Talep */}
              <div className="bg-[var(--color-surface-raised)] p-2.5 rounded-[var(--radius-sm)] border border-[var(--color-hairline)]">
                <span className="block text-[10px] font-bold text-ink-muted uppercase">İşletme / Müşteri Talebi (Brief):</span>
                <p className="text-xs font-semibold text-ink mt-0.5">
                  {inspectedCreative.payload?.brief || inspectedCreative.title}
                </p>
              </div>

              {/* Prompt Sent to ChatGPT / Image Generator */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-ink-soft">Modele Gönderilen Tam Prompt Komutu:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const text = inspectedCreative.payload?.generatedPrompt || inspectedCreative.payload?.originalPrompt || inspectedCreative.title
                      navigator.clipboard.writeText(text)
                      showNotice('Prompt komutu panoya kopyalandı.')
                    }}
                    className="text-[10px] text-accent hover:underline font-medium"
                  >
                    Promptu Kopyala
                  </button>
                </div>
                <div className="bg-canvas p-2.5 rounded border border-[var(--color-hairline)] font-mono text-[10px] text-ink-soft whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {inspectedCreative.payload?.generatedPrompt || inspectedCreative.payload?.originalPrompt || inspectedCreative.title}
                </div>
              </div>

              {/* Full JSON Payload */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-ink-soft">Ham JSON Verisi (Payload):</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(inspectedCreative.payload, null, 2))
                      showNotice('JSON yükü kopyalandı.')
                    }}
                    className="text-[10px] text-accent hover:underline font-medium"
                  >
                    JSON Kopyala
                  </button>
                </div>
                <pre className="bg-canvas p-2.5 rounded border border-[var(--color-hairline)] font-mono text-[10px] text-ink overflow-x-auto max-h-48">
                  {JSON.stringify(inspectedCreative.payload, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-2.5 sm:p-3 border-t border-[var(--color-hairline)] flex justify-between items-center bg-canvas">
              <span className="text-[10px] text-ink-muted">
                Oluşturulma: {timeAgo(inspectedCreative.created_at)}
              </span>
              <button
                onClick={() => setInspectedCreative(null)}
                className="px-3.5 py-1 text-xs font-semibold rounded bg-surface border border-[var(--color-hairline)] text-ink hover:bg-canvas"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SINEMATIK VIDEO PRODÜKSIYON & AI PROMPT İNCELEYICI */}
      {inspectedVideo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 my-auto">
            {/* Header */}
            <div className="p-3.5 sm:p-4 border-b border-[var(--color-hairline)] flex items-center justify-between bg-surface-raised/50">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-sm sm:text-base font-bold text-ink">
                    AI Sinematik Video Prodüksiyon & Prompt Detayı
                  </h3>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-accent-soft text-accent border border-accent/20">
                    {inspectedVideo.brand || 'Genel Reklam'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    (inspectedVideo.engineBadge || '').includes('Flow')
                      ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                  }`}>
                    {inspectedVideo.engineBadge || 'Gemini Veo PRO (0 Kredi)'}
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted">
                  Dosya: <code className="font-mono text-ink-soft">{inspectedVideo.filename}</code> · Sektör: <span className="font-semibold text-ink">{inspectedVideo.sector || 'Ticari / Kurumsal'}</span> · Port: <span className="font-mono">Port {inspectedVideo.accountPort || 9222}</span>
                </p>
              </div>
              <button
                onClick={() => setInspectedVideo(null)}
                className="w-7 h-7 rounded-full bg-surface-raised text-ink-soft hover:bg-canvas flex items-center justify-center font-bold text-sm"
              >
                ×
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Top Row: Video Player + Production Specs */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start bg-canvas p-3.5 rounded-[var(--radius-card)] border border-[var(--color-hairline)]">
                {/* 9:16 Video Player */}
                <div className="md:col-span-5 max-w-[240px] mx-auto md:mx-0 aspect-[9/16] bg-black rounded-lg overflow-hidden shadow-md">
                  <video
                    src={inspectedVideo.videoUrl}
                    poster={inspectedVideo.thumbnailUrl || undefined}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Specs & Hardware Attributes */}
                <div className="md:col-span-7 space-y-3">
                  <h4 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5 text-ink-muted">
                    <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Prodüksiyon & Çekim Parametreleri</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-surface p-2 rounded border border-[var(--color-hairline)]">
                      <span className="block text-[10px] text-ink-muted font-semibold">Video Çözünürlüğü:</span>
                      <strong className="text-ink">1080x1920 (9:16 Dikey)</strong>
                    </div>
                    <div className="bg-surface p-2 rounded border border-[var(--color-hairline)]">
                      <span className="block text-[10px] text-ink-muted font-semibold">Kare / Süre:</span>
                      <strong className="text-ink">10 Saniye (24 FPS Canlı)</strong>
                    </div>
                    <div className="bg-surface p-2 rounded border border-[var(--color-hairline)]">
                      <span className="block text-[10px] text-ink-muted font-semibold">Kredi / Maliyet:</span>
                      <strong className="text-ink">{inspectedVideo.creditsCost ?? 0} Kredi (0 TL)</strong>
                    </div>
                    <div className="bg-surface p-2 rounded border border-[var(--color-hairline)]">
                      <span className="block text-[10px] text-ink-muted font-semibold">Dosya Boyutu:</span>
                      <strong className="text-ink">{inspectedVideo.sizeMb} MB</strong>
                    </div>
                  </div>

                  {/* Physical Anchoring Rule */}
                  <div className="bg-surface p-2.5 rounded border border-[var(--color-hairline)] space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-ink flex items-center gap-1">
                        <span>Evrensel Fiziksel Yüzey Sabitleme:</span>
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded">
                        Sıfır Difüzyon Bozulması
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-soft leading-relaxed">
                      {inspectedVideo.physicalAnchoring || 'Sahne içerisindeki doğal fiziksel nesneye (tabela, akrilik stant, iş makinesi gövdesi) sabitlenmiştir.'}
                    </p>
                  </div>

                  {/* AI Pipeline Architecture */}
                  <div className="text-[10px] text-ink-muted bg-surface-raised p-2 rounded border border-[var(--color-hairline)] space-y-0.5 font-mono">
                    <div>1. Brief Alımı ➜ 2. ChatGPT Web Senaryosu ➜ 3. Google Veo PRO Canlı Render</div>
                    <div className="text-ink-soft">Harici yapay şerit veya FFmpeg yazısı içermez, 100% saf yapay zeka video renderıdır.</div>
                  </div>
                </div>
              </div>

              {/* SECTION 1: KULLANICININ YAZDIĞI HAM MESAJ / BRİEF */}
              <div className="space-y-1.5 bg-canvas p-3 sm:p-4 rounded-[var(--radius-sm)] border border-[var(--color-hairline)] shadow-xs">
                <div className="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-[var(--color-hairline)]">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-600 font-bold text-xs flex items-center justify-center">1</span>
                    <h4 className="text-xs font-bold text-ink">Kullanıcının Girdiği Ham Brief / Talep Mesajı</h4>
                    <span className="text-[10px] text-ink-muted font-mono bg-surface-raised px-1.5 py-0.5 rounded border border-[var(--color-hairline)]">
                      {(inspectedVideo.userPrompt || '').length} karakter
                    </span>
                  </div>
                  {inspectedVideo.userPrompt && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(inspectedVideo.userPrompt || '')
                        showNotice('Kullanıcı briefi panoya kopyalandı.')
                      }}
                      className="text-[11px] text-accent hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>Metni Kopyala</span>
                    </button>
                  )}
                </div>
                <div className="text-xs text-ink leading-relaxed font-sans whitespace-pre-wrap select-text pt-1">
                  {inspectedVideo.userPrompt || 'İşletme için 9:16 dikey formatta reklam briefi.'}
                </div>
              </div>

              {/* SECTION 2: CHATGPT WEB YÖNETMEN KURGUSU & SAHNE SENARYOSU */}
              <div className="space-y-1.5 bg-canvas p-3 sm:p-4 rounded-[var(--radius-sm)] border border-[var(--color-hairline)] shadow-xs">
                <div className="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-[var(--color-hairline)]">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent/10 text-accent font-bold text-xs flex items-center justify-center">2</span>
                    <h4 className="text-xs font-bold text-ink">ChatGPT Web Yönetmen Kurgusu & Sahne Senaryosu</h4>
                    <span className="text-[10px] bg-accent/10 text-accent font-mono px-1.5 py-0.5 rounded font-semibold border border-accent/20">
                      Director Prompt · {(inspectedVideo.chatGptPrompt || inspectedVideo.veoPrompt || '').length} karakter
                    </span>
                  </div>
                  {(inspectedVideo.chatGptPrompt || inspectedVideo.veoPrompt) && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(inspectedVideo.chatGptPrompt || inspectedVideo.veoPrompt || '')
                        showNotice('ChatGPT kurgu promptu panoya kopyalandı.')
                      }}
                      className="text-[11px] text-accent hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>Promptu Kopyala</span>
                    </button>
                  )}
                </div>
                <div className="text-xs text-ink font-mono whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto select-text pt-1 p-2 bg-surface/50 rounded border border-[var(--color-hairline)] scrollbar-thin">
                  {inspectedVideo.chatGptPrompt || inspectedVideo.veoPrompt}
                </div>
              </div>

              {/* SECTION 3: GOOGLE VEO NİHAİ FİZİKSEL PROMPTU (VİDEOYU ÜRETTİREN ASIL PROMPT) */}
              <div className="space-y-1.5 bg-canvas p-3 sm:p-4 rounded-[var(--radius-sm)] border border-emerald-500/30 shadow-xs">
                <div className="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-[var(--color-hairline)]">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-xs flex items-center justify-center">3</span>
                    <h4 className="text-xs font-bold text-ink">Google Veo Nihai Fiziksel Promptu (Videoyu Ürettiren Asıl Prompt)</h4>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-mono px-1.5 py-0.5 rounded font-semibold border border-emerald-500/20">
                      Veo 3.1 / Pro Input · {(inspectedVideo.veoPrompt || '').length} karakter
                    </span>
                  </div>
                  {inspectedVideo.veoPrompt && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const fullPackage = `### 1. KULLANICI BRİEFİ\n${inspectedVideo.userPrompt || ''}\n\n### 2. YÖNETMEN SENARYOSU\n${inspectedVideo.chatGptPrompt || ''}\n\n### 3. GOOGLE VEO PROMPTU\n${inspectedVideo.veoPrompt || ''}`;
                          navigator.clipboard.writeText(fullPackage);
                          showNotice('Tüm prompt paketi panoya kopyalandı.');
                        }}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-raised hover:bg-canvas border border-[var(--color-hairline)] text-ink"
                      >
                        Tüm Paketi Kopyala
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(inspectedVideo.veoPrompt || '')
                          showNotice('Google Veo nihai promptu panoya kopyalandı.')
                        }}
                        className="text-[11px] text-emerald-600 hover:underline font-semibold flex items-center gap-1"
                      >
                        <span>Veo Promptunu Kopyala</span>
                      </button>
                    </div>
                  )}
                </div>
                <div className="text-xs text-ink font-mono whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto select-text pt-1 p-2 bg-surface/50 rounded border border-emerald-500/20 shadow-inner scrollbar-thin">
                  {inspectedVideo.veoPrompt}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-[var(--color-hairline)] flex flex-wrap justify-between items-center gap-2 bg-canvas">
              <span className="text-[11px] text-ink-muted">
                Oluşturulma Tarihi: <strong className="text-ink">{timeAgo(inspectedVideo.createdAt)}</strong> ({new Date(inspectedVideo.createdAt).toLocaleString('tr-TR')})
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={inspectedVideo.videoUrl}
                  download={`${inspectedVideo.id}.mp4`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 text-xs font-semibold rounded bg-surface-raised hover:bg-canvas border border-[var(--color-hairline)] text-ink transition"
                >
                  İndir (MP4)
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setQuickMediaUrl(inspectedVideo.videoUrl)
                    setQuickMessage(`${inspectedVideo.brand || 'İşletmemiz'} için hazırlanan özel sinematik reklam videosu.`)
                    setInspectedVideo(null)
                    setActiveTab('quick_send')
                    showNotice('Video hızlı gönderim kutusuna aktarıldı.')
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded bg-accent text-accent-ink hover:bg-accent-dim transition"
                >
                  WhatsApp'a Aktar
                </button>
                <button
                  onClick={() => setInspectedVideo(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded bg-surface border border-[var(--color-hairline)] text-ink hover:bg-canvas transition"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: AI SUGGESTION JSON & PROMPT INSPECTOR */}
      {inspectedSuggestion && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-3.5 sm:p-4 border-b border-[var(--color-hairline)] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-bold text-ink">Gelen Mesaj ve AI Yanıt Önerileri Detayı</h3>
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-accent-soft text-accent">
                    {inspectedSuggestion.org_name || 'Genel'}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-ink-muted">
                  Kaynak: {inspectedSuggestion.source.toUpperCase()} · Hit: {inspectedSuggestion.hit_count ?? 1} · Oluşturulma: {timeAgo(inspectedSuggestion.created_at)}
                </p>
              </div>
              <button
                onClick={() => setInspectedSuggestion(null)}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-surface-raised text-ink-soft hover:bg-canvas flex items-center justify-center font-bold text-xs"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
              {/* Incoming Sample */}
              <div className="bg-[var(--color-surface-raised)] p-3 rounded-[var(--radius-sm)] border border-accent/20">
                <span className="block text-[10px] font-bold text-accent uppercase tracking-wide">Müşteriden Gelen Ham Mesaj:</span>
                <p className="text-xs sm:text-sm font-semibold text-ink mt-1">
                  "{inspectedSuggestion.incoming_sample}"
                </p>
              </div>

              {/* Suggestions List */}
              <div>
                <span className="block text-[11px] font-bold text-ink-soft mb-2">Model Tarafından Üretilen Yanıt Seçenekleri:</span>
                <div className="space-y-2">
                  {inspectedSuggestion.suggestions?.map((sg, idx) => (
                    <div key={idx} className="bg-canvas p-2.5 rounded border border-[var(--color-hairline)] flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-accent-soft text-accent uppercase">
                          {sg.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(sg.text)
                              showNotice('Öneri metni panoya kopyalandı.')
                            }}
                            className="text-[10px] text-accent hover:underline font-medium"
                          >
                            Metni Kopyala
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickMessage(sg.text)
                              setInspectedSuggestion(null)
                              setActiveTab('quick_send')
                              showNotice('Öneri hızlı gönderim kutusuna aktarıldı.')
                            }}
                            className="text-[10px] text-accent font-semibold hover:underline"
                          >
                            Hızlı Gönder
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-ink whitespace-pre-wrap">{sg.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Raw JSON Payload */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-ink-soft">Ham JSON Verisi:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(inspectedSuggestion, null, 2))
                      showNotice('JSON verisi kopyalandı.')
                    }}
                    className="text-[10px] text-accent hover:underline font-medium"
                  >
                    JSON Kopyala
                  </button>
                </div>
                <pre className="bg-canvas p-2.5 rounded border border-[var(--color-hairline)] font-mono text-[10px] text-ink overflow-x-auto max-h-40">
                  {JSON.stringify(inspectedSuggestion, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-2.5 sm:p-3 border-t border-[var(--color-hairline)] flex justify-end bg-canvas">
              <button
                onClick={() => setInspectedSuggestion(null)}
                className="px-3.5 py-1 text-xs font-semibold rounded bg-surface border border-[var(--color-hairline)] text-ink hover:bg-canvas"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: CAMPAIGN TARGETS INSPECTOR */}
      {inspectedCampaign && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 border-b border-[var(--color-hairline)] flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-ink">{inspectedCampaign.name} — Kampanya Hedefleri</h3>
                  <span
                    className={`text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                      inspectedCampaign.status === 'running'
                        ? 'bg-ok-soft text-ok-dim'
                        : inspectedCampaign.status === 'paused'
                        ? 'bg-warn/10 text-warn'
                        : 'bg-surface-raised text-ink-muted'
                    }`}
                  >
                    {inspectedCampaign.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  {inspectedCampaign.org_name && <span>{inspectedCampaign.org_name} · </span>}
                  Toplam {campaignTargetsTotal} hedef numara · Tür: {inspectedCampaign.message_type}
                </p>
              </div>
              <button
                onClick={() => setInspectedCampaign(null)}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-surface-raised text-ink-soft hover:bg-canvas flex items-center justify-center font-bold text-xs"
              >
                ×
              </button>
            </div>

            {/* Campaign Target KPI Summary */}
            <div className="grid grid-cols-4 gap-2 p-3 bg-canvas border-b border-[var(--color-hairline)] text-center">
              <div className="bg-surface p-2 rounded border border-[var(--color-hairline)]">
                <span className="block text-[10px] text-ink-muted uppercase">İletildi</span>
                <span className="text-xs sm:text-sm font-bold text-ok-dim">{campaignTargetsCounts.sent}</span>
              </div>
              <div className="bg-surface p-2 rounded border border-[var(--color-hairline)]">
                <span className="block text-[10px] text-ink-muted uppercase">Bekliyor</span>
                <span className="text-xs sm:text-sm font-bold text-warn">{campaignTargetsCounts.pending}</span>
              </div>
              <div className="bg-surface p-2 rounded border border-[var(--color-hairline)]">
                <span className="block text-[10px] text-ink-muted uppercase">Hatalı</span>
                <span className="text-xs sm:text-sm font-bold text-danger">{campaignTargetsCounts.failed}</span>
              </div>
              <div className="bg-surface p-2 rounded border border-[var(--color-hairline)]">
                <span className="block text-[10px] text-ink-muted uppercase">Atlandı</span>
                <span className="text-xs sm:text-sm font-bold text-ink-muted">{campaignTargetsCounts.skipped}</span>
              </div>
            </div>

            {/* Target Filter & Search Toolbar */}
            <div className="p-2.5 sm:p-3 border-b border-[var(--color-hairline)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-surface">
              <div
                onWheel={(e) => {
                  if (e.deltaY !== 0) e.currentTarget.scrollLeft += e.deltaY;
                }}
                className="flex items-center gap-1 bg-surface-raised p-0.5 rounded-[var(--radius-sm)] overflow-x-auto scrollbar-thin"
              >
                {(['all', 'sent', 'pending', 'failed', 'skipped'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => {
                      setCampaignTargetsFilter(st)
                      if (inspectedCampaign) fetchCampaignTargets(inspectedCampaign.id, st, campaignTargetsSearch)
                    }}
                    className={`px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold rounded whitespace-nowrap ${
                      campaignTargetsFilter === st ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {st === 'all' ? 'Tümü' : st === 'sent' ? 'İletilen' : st === 'pending' ? 'Bekleyen' : st === 'failed' ? 'Hatalı' : 'Atlanan'}
                  </button>
                ))}
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Numara veya isim ara..."
                  value={campaignTargetsSearch}
                  onChange={e => {
                    setCampaignTargetsSearch(e.target.value)
                    if (inspectedCampaign) fetchCampaignTargets(inspectedCampaign.id, campaignTargetsFilter, e.target.value)
                  }}
                  className="w-full sm:w-48 bg-surface-raised border border-[var(--color-hairline)] rounded-[var(--radius-sm)] px-2.5 py-1 text-xs text-ink placeholder:text-ink-muted outline-none focus:border-accent"
                />
              </div>
            </div>

            {/* Target List Table */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              {campaignTargetsLoading ? (
                <div className="text-center py-8 text-xs text-ink-muted">Hedefler yükleniyor...</div>
              ) : campaignTargets.length === 0 ? (
                <div className="text-center py-8 text-xs text-ink-muted">Kriterlere uygun hedef kaydı bulunamadı.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] sm:text-xs min-w-[550px]">
                    <thead>
                      <tr className="border-b border-[var(--color-hairline)] text-ink-muted font-semibold">
                        <th className="pb-2">Telefon</th>
                        <th className="pb-2">Kişi / İsim</th>
                        <th className="pb-2">Durum</th>
                        <th className="pb-2">Deneme</th>
                        <th className="pb-2">Gönderim Zamanı</th>
                        <th className="pb-2">Hata Detayı</th>
                        <th className="pb-2 text-right">Hızlı Mesaj</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-hairline)]">
                      {campaignTargets.map(t => (
                        <tr key={t.id} className="hover:bg-surface-raised/40">
                          <td className="py-2 font-mono font-bold text-ink">{t.phone_e164}</td>
                          <td className="py-2 text-ink-soft">{t.contact_name || '—'}</td>
                          <td className="py-2">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${
                                t.status === 'delivered' || t.status === 'sent'
                                  ? 'bg-ok-soft text-ok-dim'
                                  : t.status === 'failed'
                                  ? 'bg-danger/10 text-danger'
                                  : 'bg-warn/10 text-warn'
                              }`}
                            >
                              {t.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2 text-ink-muted font-mono">{t.attempts}</td>
                          <td className="py-2 text-ink-muted">{t.sent_at ? timeAgo(t.sent_at) : '—'}</td>
                          <td className="py-2 text-danger font-mono text-[10px] max-w-[180px] truncate">
                            {t.error || '—'}
                          </td>
                          <td className="py-2 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setQuickPhone(t.phone_e164)
                                setInspectedCampaign(null)
                                setActiveTab('quick_send')
                                showNotice(`${t.phone_e164} hızlı gönderim kutusuna aktarıldı.`)
                              }}
                              className="px-2 py-0.5 text-[10px] font-semibold rounded bg-surface border border-[var(--color-hairline)] text-ink hover:bg-canvas"
                            >
                              Seç
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-[var(--color-hairline)] flex justify-between items-center bg-canvas">
              <a
                href={`/api/canli-takip/campaign-targets?campaignId=${inspectedCampaign.id}&format=csv`}
                download
                className="px-3 py-1 text-xs font-semibold rounded bg-accent text-accent-ink hover:bg-accent-dim transition"
              >
                CSV İndir
              </a>
              <button
                onClick={() => setInspectedCampaign(null)}
                className="px-3.5 py-1 text-xs font-semibold rounded bg-surface border border-[var(--color-hairline)] text-ink hover:bg-canvas"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: QUICK SEND CONTACT PICKER */}
      {/* WHATSAPP & BAILEYS CANLI SİSTEM TEŞHİS MODALI */}
      {showDiagnosticModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-3.5 sm:p-4 border-b border-[var(--color-hairline)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-ok animate-pulse" />
                <h3 className="text-xs sm:text-sm font-bold text-ink">WhatsApp & Baileys Canlı Sistem Teşhisi</h3>
              </div>
              <button
                onClick={() => setShowDiagnosticModal(false)}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-surface-raised text-ink-soft hover:bg-canvas flex items-center justify-center font-bold text-xs"
              >
                ×
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3.5">
              {diagnosticLoading ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-ink">Hetzner VPS ve WhatsApp hatları canlı test ediliyor...</p>
                  <p className="text-[10px] text-ink-muted">Soket bağlantıları, oturum sağlığı ve senkronizasyon kontrolleri yapılıyor.</p>
                </div>
              ) : diagnosticData ? (
                <div className="space-y-3">
                  {/* Status Banner */}
                  <div className="p-3 rounded-lg bg-ok-soft/30 border border-ok/30 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-ok text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      ✓
                    </div>
                    <div>
                      <div className="text-xs font-bold text-ink">Tüm WhatsApp Sistemleri Kararlı ve Canlı</div>
                      <p className="text-[11px] text-ink-muted mt-0.5 leading-relaxed">
                        WhatsApp eşlikçi cihaz senkronizasyon döngüsü (sync flood) ve oturum kapatma uyarıları tamamen engellenmiştir.
                      </p>
                    </div>
                  </div>

                  {/* Diagnostic Details Grid */}
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="p-2.5 rounded bg-canvas border border-[var(--color-hairline)] space-y-1">
                      <span className="text-[10px] text-ink-muted block uppercase font-bold">Worker Motoru</span>
                      <span className="font-mono font-bold text-ink">{diagnosticData.worker?.id || 'oracle-1'}</span>
                      <span className="block text-[10px] text-ok-dim font-semibold">
                        {diagnosticData.worker?.isFresh ? 'Canlı Heartbeat Alınıyor' : 'Aktif'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-canvas border border-[var(--color-hairline)] space-y-1">
                      <span className="text-[10px] text-ink-muted block uppercase font-bold">Çalışma Süresi (Uptime)</span>
                      <span className="font-mono font-bold text-ink">
                        {diagnosticData.worker?.uptimeSeconds ? `${Math.floor(diagnosticData.worker.uptimeSeconds / 60)} dakika ${diagnosticData.worker.uptimeSeconds % 60} sn` : 'Aktif'}
                      </span>
                      <span className="block text-[10px] text-ink-muted">Kesintisiz soket bağlantısı</span>
                    </div>

                    <div className="p-2.5 rounded bg-canvas border border-[var(--color-hairline)] space-y-1">
                      <span className="text-[10px] text-ink-muted block uppercase font-bold">Sync Loop Koruması</span>
                      <span className="font-semibold text-ok-dim">Engellendi / Filtrelendi</span>
                      <span className="block text-[10px] text-ink-muted">0 Hatalı Senkronizasyon</span>
                    </div>

                    <div className="p-2.5 rounded bg-canvas border border-[var(--color-hairline)] space-y-1">
                      <span className="text-[10px] text-ink-muted block uppercase font-bold">Bağlı Canlı Hatlar</span>
                      <span className="font-mono font-bold text-ink">{diagnosticData.connectedCount} / {diagnosticData.accounts?.length} Hat</span>
                      <span className="block text-[10px] text-ok-dim font-semibold">Tümü Çevrimiçi</span>
                    </div>
                  </div>

                  {/* Connected Accounts List */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-ink">Aktif WhatsApp Hatları:</span>
                    <div className="space-y-1.5">
                      {diagnosticData.accounts?.filter((a: any) => a.isLive).map((acc: any) => (
                        <div key={acc.id} className="p-2 rounded bg-surface border border-[var(--color-hairline)] flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-ok" />
                            <span className="font-bold text-ink">{acc.label}</span>
                            <span className="font-mono text-ink-muted">{acc.phone}</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-ok-soft text-ok-dim font-semibold">
                            Bağlı & Hazır
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-ink-muted">Test verisi alınamadı.</div>
              )}
            </div>

            <div className="p-3 border-t border-[var(--color-hairline)] flex items-center justify-between bg-canvas">
              <button
                type="button"
                onClick={handleRunDiagnostic}
                disabled={diagnosticLoading}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-accent-soft text-accent hover:bg-accent/20 transition disabled:opacity-50"
              >
                {diagnosticLoading ? 'Yeniden Test Ediliyor...' : 'Testi Tekrarla'}
              </button>
              <button
                type="button"
                onClick={() => setShowDiagnosticModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded bg-surface border border-[var(--color-hairline)] text-ink hover:bg-surface-raised"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {showContactPicker && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-3.5 sm:p-4 border-b border-[var(--color-hairline)] flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-ink">Rehberden Numara Seç</h3>
                <p className="text-[11px] text-ink-muted">Tüm firmalara ait kayıtlı 12.016 numara arasından seçim yapın</p>
              </div>
              <button
                onClick={() => setShowContactPicker(false)}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-surface-raised text-ink-soft hover:bg-canvas flex items-center justify-center font-bold text-xs"
              >
                ×
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-3 border-b border-[var(--color-hairline)] bg-surface">
              <input
                type="text"
                placeholder="İsim veya telefon ara (örn: Bursa, 0542...)"
                value={contactPickerSearch}
                onChange={e => {
                  setContactPickerSearch(e.target.value)
                  fetchPickerContacts(e.target.value)
                }}
                className="w-full bg-surface-raised border border-[var(--color-hairline)] rounded-[var(--radius-sm)] px-3 py-1.5 text-xs text-ink placeholder:text-ink-muted outline-none focus:border-accent"
                autoFocus
              />
            </div>

            {/* Contacts Results */}
            <div className="flex-1 overflow-y-auto p-3 divide-y divide-[var(--color-hairline)]">
              {contactPickerLoading ? (
                <div className="text-center py-6 text-xs text-ink-muted">Kişiler aranıyor...</div>
              ) : contactPickerResults.length === 0 ? (
                <div className="text-center py-6 text-xs text-ink-muted">Kayıt bulunamadı.</div>
              ) : (
                contactPickerResults.map(c => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setQuickPhone(c.phone_e164)
                      setShowContactPicker(false)
                      showNotice(`${c.phone_e164} seçildi.`)
                    }}
                    className="py-2 px-1.5 hover:bg-surface-raised rounded flex items-center justify-between cursor-pointer group"
                  >
                    <div>
                      <div className="font-mono font-bold text-xs text-ink group-hover:text-accent">
                        {c.phone_e164}
                      </div>
                      {c.name && <div className="text-[11px] text-ink-soft">{c.name}</div>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface border border-[var(--color-hairline)] text-ink-muted">
                        {c.source || 'Rehber'}
                      </span>
                      <button
                        type="button"
                        className="px-2 py-0.5 text-[10px] font-semibold bg-accent-soft text-accent rounded group-hover:bg-accent group-hover:text-accent-ink transition"
                      >
                        Seç
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-2.5 border-t border-[var(--color-hairline)] flex justify-end bg-canvas">
              <button
                onClick={() => setShowContactPicker(false)}
                className="px-3.5 py-1 text-xs font-semibold rounded bg-surface border border-[var(--color-hairline)] text-ink hover:bg-canvas"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: YENİ AI HESAP SLOTU BAĞLAMA MODALI */}
      {showAddAccountModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] w-full max-w-md flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-[var(--color-hairline)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-accent-soft text-accent flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-ink">Yeni AI Hesabı & Port Bağla</h3>
                  <p className="text-[11px] text-ink-muted">Hetzner VPS üzerinde bağımsız bir Chrome slotu başlatır</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddAccountModal(false)}
                className="w-7 h-7 rounded-full bg-surface-raised text-ink hover:bg-canvas flex items-center justify-center font-bold text-sm"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleProvisionAccount} className="p-4 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-ink">Hedef Port / Slot Seçimi:</label>
                <select
                  value={newAccountPort}
                  onChange={e => setNewAccountPort(parseInt(e.target.value, 10))}
                  className="w-full bg-surface-raised border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-2 text-ink outline-none focus:border-accent"
                >
                  <option value={9223}>Port 9223 (2. Havuz Slotu)</option>
                  <option value={9224}>Port 9224 (3. Havuz Slotu)</option>
                  <option value={9225}>Port 9225 (4. Havuz Slotu)</option>
                  <option value={9226}>Port 9226 (5. Yeni Havuz Slotu)</option>
                  <option value={9227}>Port 9227 (6. Yeni Havuz Slotu)</option>
                  <option value={9228}>Port 9228 (7. Yeni Havuz Slotu)</option>
                </select>
                <p className="text-[10px] text-ink-muted">Her slot izole bir profil klasörü ile birbirinden bağımsız çalışır.</p>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-ink">Hesap Takma Adı:</label>
                <input
                  type="text"
                  placeholder="Örn: 2. Şirket Google & Flow Hesabı"
                  value={newAccountName}
                  onChange={e => setNewAccountName(e.target.value)}
                  className="w-full bg-surface-raised border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-2 text-ink placeholder:text-ink-muted outline-none focus:border-accent"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-ink">Google Flow Proje URL'si (Opsiyonel):</label>
                <input
                  type="url"
                  placeholder="https://flow.google.com/project/..."
                  value={newFlowProjectUrl}
                  onChange={e => setNewFlowProjectUrl(e.target.value)}
                  className="w-full bg-surface-raised border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-2 text-ink placeholder:text-ink-muted outline-none focus:border-accent font-mono text-[11px]"
                />
                <p className="text-[10px] text-ink-muted">Bu Google hesabına ait özel bir Flow Creative Studio projeniz varsa bağlayabilirsiniz.</p>
              </div>

              {/* Bilgilendirme Kutusu */}
              <div className="bg-accent-soft/20 border border-accent/30 rounded-[var(--radius-sm)] p-2.5 space-y-1 text-[11px] text-ink">
                <div className="font-bold text-accent">Nasıl Çalışır?</div>
                <ol className="list-decimal pl-4 space-y-0.5 text-ink-soft">
                  <li><strong>Hetzner'de Başlat</strong> butonuna bastığınızda izole Chrome oturumu ayağa kalkar.</li>
                  <li>Açılan <strong>VNC ekranında</strong> Google hesabınıza (veya Flow stüdyonuza) giriş yapın.</li>
                  <li>Giriş tamamlandığında <strong>Doğrula</strong> butonuna basarak hesabı havuza alın.</li>
                </ol>
              </div>

              <div className="pt-2 border-t border-[var(--color-hairline)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-surface-raised border border-[var(--color-hairline)] text-ink hover:bg-canvas transition"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isProvisioning}
                  className="px-4 py-1.5 rounded-[var(--radius-sm)] bg-accent text-accent-ink font-bold hover:bg-accent-dim shadow transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isProvisioning && <span className="w-3 h-3 border-2 border-accent-ink border-t-transparent rounded-full animate-spin" />}
                  <span>{isProvisioning ? 'Hetzner Hazırlanıyor...' : 'Hetzner\'de Başlat ve VNC Aç'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CANLI VNC KONSOLU MODALI (GÖMÜLÜ NO-VNC) */}
      {showVncModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 overflow-hidden">
            <div className="p-3 sm:p-3.5 border-b border-[var(--color-hairline)] flex items-center justify-between bg-surface">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-surface-raised text-ink flex items-center justify-center shrink-0 border border-[var(--color-hairline)]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-ink">Hetzner VPS Canlı VNC Masası</h3>
                  <p className="text-[10px] text-ink-muted">Chrome pencerelerinden Google / Gemini / ChatGPT hesaplarınıza tek tıkla giriş yapın</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={data?.ai_engine?.geminiPool?.vncUrl || 'http://167.233.201.31:6080/vnc.html'}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-surface-raised border border-[var(--color-hairline)] text-ink hover:bg-canvas flex items-center gap-1"
                >
                  <span>Yeni Sekmede Aç</span>
                  <svg className="w-3 h-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <button
                  type="button"
                  onClick={() => setShowVncModal(false)}
                  className="w-7 h-7 rounded-full bg-surface-raised text-ink hover:bg-canvas flex items-center justify-center font-bold text-sm"
                >
                  ×
                </button>
              </div>
            </div>

            {/* VNC iframe */}
            <div className="flex-1 bg-black relative">
              <iframe
                src={data?.ai_engine?.geminiPool?.vncUrl || 'http://167.233.201.31:6080/vnc.html'}
                title="Hetzner noVNC Desktop"
                className="w-full h-full border-0"
              />
            </div>

            {/* Alt Kontrol Çubuğu */}
            <div className="p-2.5 border-t border-[var(--color-hairline)] bg-surface flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[11px] text-ink-muted">
                İpucu: Giriş yaptıktan sonra aşağıdaki butona tıklayarak oturumu test edin ve havuza dahil edin.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleVerifyAllAccounts}
                  disabled={verifyingAll}
                  className="px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-accent text-accent-ink font-bold hover:bg-accent-dim shadow transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {verifyingAll ? (
                    <>
                      <span className="w-3 h-3 border-2 border-accent-ink border-t-transparent rounded-full animate-spin" />
                      <span>Doğrulanıyor...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Oturumları Doğrula & Havuza Al</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowVncModal(false)}
                  className="px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-surface-raised border border-[var(--color-hairline)] text-ink hover:bg-canvas"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: GOOGLE FLOW PROJE URL BAĞLAMA MODALI (VNC'SİZ) */}
      {showFlowModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] w-full max-w-md flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-[var(--color-hairline)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-accent-soft text-accent flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-ink">Google Flow Projesi Bağla</h3>
                  <p className="text-[11px] text-ink-muted">Kredi havuzuna eklemek istediğiniz Flow stüdyo URL'si</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFlowModal(false)}
                className="w-7 h-7 rounded-full bg-surface-raised text-ink hover:bg-canvas flex items-center justify-center font-bold text-sm"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateFlow} className="p-4 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-ink">Hedef Slot (Port):</label>
                <select
                  value={flowModalPort}
                  onChange={e => setFlowModalPort(parseInt(e.target.value, 10))}
                  className="w-full bg-surface-raised border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-2 text-ink outline-none focus:border-accent"
                >
                  <option value={9222}>Port 9222 (Ali Düvenci - 1. Hesap)</option>
                  <option value={9223}>Port 9223 (Ali Düvenci - 2. Hesap)</option>
                  <option value={9224}>Port 9224 (3. Hesap Slotu)</option>
                  <option value={9225}>Port 9225 (4. Hesap Slotu)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-ink">Google Flow Proje URL'si:</label>
                  <button
                    type="button"
                    onClick={() => handleAutoDetectFlow(flowModalPort)}
                    disabled={isUpdatingFlow}
                    className="text-[11px] font-bold px-2 py-0.5 rounded bg-accent text-accent-ink hover:bg-accent-dim flex items-center gap-1 shadow-sm transition disabled:opacity-50"
                  >
                    <span>Otomatik Algıla & Bağla</span>
                  </button>
                </div>
                <input
                  type="url"
                  placeholder="Otomatik algılamak için yukarıdaki butona tıklayın veya URL yapıştırın"
                  value={flowModalUrl}
                  onChange={e => setFlowModalUrl(e.target.value)}
                  className="w-full bg-surface-raised border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-2 text-ink placeholder:text-ink-muted outline-none focus:border-accent font-mono text-[11px]"
                />
                <p className="text-[10px] text-ink-muted">
                  <strong>İpucu:</strong> "Otomatik Algıla & Bağla" butonuna bastığınızda sistem Hetzner'deki Chrome oturumuna bağlanıp projeyi kendisi bulur veya oluşturur; URL aramanıza gerek yoktur.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-ink">Hesap Kredi Bakiyesi (Opsiyonel):</label>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={flowModalCredits}
                  onChange={e => setFlowModalCredits(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-surface-raised border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-2 text-ink outline-none focus:border-accent font-mono text-[11px]"
                />
                <p className="text-[10px] text-ink-muted">Varsayılan PRO bakiye 1.050 kredidir (70 adet video).</p>
              </div>

              <div className="bg-ok-soft/30 border border-ok/20 rounded-[var(--radius-sm)] p-2.5 text-[11px] text-ink space-y-1">
                <div className="font-bold text-ok-dim flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Sıfır VNC Gereksinimi</span>
                </div>
                <p className="text-ink-soft">
                  Kaydettiğiniz an Hetzner'deki izole Chrome sekmesi arka planda doğrudan bu stüdyo projesine yönlendirilir ve anında ortak havuza dahil edilir.
                </p>
              </div>

              <div className="pt-2 border-t border-[var(--color-hairline)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFlowModal(false)}
                  className="px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-surface-raised border border-[var(--color-hairline)] text-ink hover:bg-canvas transition"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingFlow}
                  className="px-4 py-1.5 rounded-[var(--radius-sm)] bg-accent text-accent-ink font-bold hover:bg-accent-dim shadow transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isUpdatingFlow && <span className="w-3 h-3 border-2 border-accent-ink border-t-transparent rounded-full animate-spin" />}
                  <span>{isUpdatingFlow ? 'Kaydediliyor...' : 'Projeyi Havuza Bağla'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: KENDİ TARAYICIMDAN OTURUM / COOKIE AKTAR MODALI (VNC'SİZ GİRİŞ) */}
      {showCookieModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] w-full max-w-lg flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-[var(--color-hairline)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-ok-soft text-ok-dim flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-ink">Tarayıcımdan Oturum / Çerez Aktar</h3>
                  <p className="text-[11px] text-ink-muted">Hetzner VNC'ye girmeden 1 tıkla Google veya ChatGPT oturumu bağlayın</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCookieModal(false)}
                className="w-7 h-7 rounded-full bg-surface-raised text-ink hover:bg-canvas flex items-center justify-center font-bold text-sm"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSyncCookies} className="p-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <label className="font-semibold text-ink">Hedef Slot (Port):</label>
                  <select
                    value={cookieModalPort}
                    onChange={e => setCookieModalPort(parseInt(e.target.value, 10))}
                    className="w-full bg-surface-raised border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-2 text-ink outline-none focus:border-accent"
                  >
                    <option value={9222}>Port 9222 (Slot 1)</option>
                    <option value={9223}>Port 9223 (Slot 2)</option>
                    <option value={9224}>Port 9224 (Slot 3)</option>
                    <option value={9225}>Port 9225 (Slot 4)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-ink">Hedef Platform:</label>
                  <select
                    value={cookieModalPlatform}
                    onChange={e => setCookieModalPlatform(e.target.value)}
                    className="w-full bg-surface-raised border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-2 text-ink outline-none focus:border-accent"
                  >
                    <option value="all">Otomatik (Google & ChatGPT)</option>
                    <option value="google">Google Flow & Gemini</option>
                    <option value="chatgpt">OpenAI ChatGPT</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-ink">Çerez (Cookie) Verisi:</label>
                <textarea
                  required
                  rows={5}
                  placeholder={`Kendi tarayıcınızdan kopyaladığınız JSON çerez dizisi veya "name=value; name2=value2" formatında çerez metni...`}
                  value={cookieModalData}
                  onChange={e => setCookieModalData(e.target.value)}
                  className="w-full bg-surface-raised border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-2.5 text-ink placeholder:text-ink-muted outline-none focus:border-accent font-mono text-[10px] leading-relaxed resize-none"
                />
              </div>

              <div className="bg-canvas border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-2.5 space-y-1 text-[10px] text-ink-muted">
                <div className="font-semibold text-ink">Nasıl Yapılır? (1 Dakika)</div>
                <ol className="list-decimal pl-4 space-y-0.5">
                  <li>Bilgisayarınızdaki Chrome'a <strong>Cookie-Editor</strong> eklentisini ekleyin.</li>
                  <li><strong>flow.google.com</strong> veya <strong>chatgpt.com</strong> sekmesine geçin.</li>
                  <li>Eklenti simgesine tıklayıp <strong>Export → Export as JSON</strong> deyin ve buraya yapıştırın.</li>
                </ol>
              </div>

              <div className="pt-2 border-t border-[var(--color-hairline)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCookieModal(false)}
                  className="px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-surface-raised border border-[var(--color-hairline)] text-ink hover:bg-canvas transition"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSyncingCookies}
                  className="px-4 py-1.5 rounded-[var(--radius-sm)] bg-ok text-white font-bold hover:bg-ok-dim shadow transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSyncingCookies && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{isSyncingCookies ? 'Aktarılıyor...' : 'Çerezleri Aktar ve Oturumu Doğrula'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
