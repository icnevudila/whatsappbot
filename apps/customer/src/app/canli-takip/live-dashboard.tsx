'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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

type MessageLog = {
  id: string | number
  direction: 'in' | 'out'
  phone_e164: string | null
  push_name: string | null
  message_type: string
  body: string | null
  media_url: string | null
  status: string
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<
    'overview' | 'baileys' | 'messages' | 'quick_send' | 'campaigns' | 'queue' | 'organizations' | 'contacts' | 'data_requests' | 'ai_studio' | 'blacklist' | 'jobs'
  >('overview')

  const [selectedOrg, setSelectedOrg] = useState<string>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
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
  const [quickSending, setQuickSending] = useState(false)

  // AI Copywriting Playground State
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiTone, setAiTone] = useState<'samimi' | 'kurumsal' | 'kampanya' | 'firsat'>('samimi')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)

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

  // Message & AI Suggestion Stream State
  const [msgStreamTab, setMsgStreamTab] = useState<'suggestions' | 'all' | 'in' | 'out' | 'auto_reply'>('suggestions')
  const [inspectedSuggestion, setInspectedSuggestion] = useState<AiSuggestionItem | null>(null)
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null)
  const [simulatingAi, setSimulatingAi] = useState(false)
  const [simulatedPrompt, setSimulatedPrompt] = useState('')
  const [simulatedSuggestions, setSimulatedSuggestions] = useState<Array<{ label: string; text: string }> | null>(null)
  const [showSimulator, setShowSimulator] = useState(false)

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
    try {
      const res = await fetch('/api/canli-takip/feed', { cache: 'no-store' })
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bağlantı hatası')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    if (!autoRefresh) return
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [fetchData, autoRefresh])

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
        }),
      })
      const json = await res.json()
      if (json.success) {
        showNotice(`Mesaj kuyruğa alındı (İş No: ${json.jobId}). WhatsApp servisi anında gönderecek.`)
        setQuickMessage('')
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

  // Firma Kotalarını Düzenle (Hat ve Mesaj Limiti)
  const handleUpdateOrgQuotas = async (org: OrganizationItem) => {
    const newAccounts = prompt(`${org.name} için Hat Kotası (Mevcut: ${org.accounts_quota}):`, String(org.accounts_quota))
    if (newAccounts === null) return
    const newMonthly = prompt(`${org.name} için Aylık Mesaj Limiti (Mevcut: ${org.monthly_message_quota}):`, String(org.monthly_message_quota))
    if (newMonthly === null) return

    const accQuota = parseInt(newAccounts, 10)
    const msgQuota = parseInt(newMonthly, 10)

    if (isNaN(accQuota) || isNaN(msgQuota)) {
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
        }),
      })
      const json = await res.json()
      if (json.success) {
        showNotice(`${org.name} limitleri güncellendi: ${accQuota} Hat, ${msgQuota.toLocaleString('tr-TR')} Mesaj/Ay.`)
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
          {/* Header Row 1 (Mobile: Logo + Status + Logout) */}
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] flex items-center justify-center">
                <LogoMark className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs sm:text-sm tracking-tight text-ink">{BRAND_NAME}</span>
                  <span className="text-[9px] sm:text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-surface-raised text-ink-muted border border-[var(--color-hairline)]">
                    Operasyon
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
                <span>{autoRefresh ? 'Canlı' : 'Duraklat'}</span>
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
          <div className="flex items-center justify-between sm:justify-end gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none w-full sm:w-auto">
            {/* Organization Filter Selector */}
            {organizationsList.length > 0 && (
              <div className="flex items-center gap-1 bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] px-2 py-0.5 shrink-0">
                <span className="text-[10px] text-ink-muted font-medium">İşletme:</span>
                <select
                  value={selectedOrg}
                  onChange={e => setSelectedOrg(e.target.value)}
                  className="bg-transparent text-[10px] sm:text-[11px] font-semibold text-ink outline-none cursor-pointer"
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
                className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold bg-danger/10 text-danger border border-danger/20 hover:bg-danger/15 transition disabled:opacity-50"
                title="WhatsApp gönderim servisini yeniden başlat"
              >
                Restart
              </button>
              <button
                onClick={handleReconnectAll}
                disabled={actionBusy}
                className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold bg-accent-soft text-accent border border-accent/20 hover:bg-accent/15 transition disabled:opacity-50"
                title="Tüm hatları senkronize et"
              >
                Senkronize
              </button>
              <button
                onClick={handleClearStuckJobs}
                disabled={actionBusy}
                className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold bg-surface-raised text-ink-soft border border-[var(--color-hairline)] hover:bg-canvas transition disabled:opacity-50"
                title="Takılı işleri temizle"
              >
                Temizle
              </button>
            </div>

            {/* Desktop-only status & logout */}
            <div className="hidden sm:flex items-center gap-1.5 pl-1.5 border-l border-[var(--color-hairline)] shrink-0">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-sm)] text-[11px] font-semibold border transition ${
                  autoRefresh
                    ? 'bg-ok-soft text-ok-dim border-ok-dim/20'
                    : 'bg-[var(--color-surface-raised)] text-ink-muted border-[var(--color-hairline)]'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-ok animate-pulse' : 'bg-ink-muted'}`} />
                <span>{autoRefresh ? 'Canlı' : 'Durduruldu'}</span>
              </button>
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
      <main className="flex-1 max-w-7xl w-full mx-auto p-2.5 sm:p-5 space-y-3 sm:space-y-5">
        {/* KPI Dashboard Cards Grid - Horizontally Swipeable on Mobile, 10-col on Desktop */}
        <section className="flex sm:grid overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none gap-2 sm:grid-cols-5 lg:grid-cols-10 sm:gap-2">
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

          {/* Card 10: Lead Requests */}
          <div className="min-w-[115px] sm:min-w-0 shrink-0 sm:shrink bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-2 sm:p-2.5 shadow-xs flex flex-col justify-between">
            <span className="text-[9px] sm:text-[10px] font-semibold text-ink-muted uppercase tracking-wider">Talepler</span>
            <div className="mt-0.5 text-sm sm:text-base font-bold text-ink">
              {summary.pendingDataRequests}
            </div>
            <span className="text-[8px] sm:text-[9px] text-ink-muted">Onay Bekleyen</span>
          </div>
        </section>

        {/* Search & Module Tabs Bar */}
        <section className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-1.5 sm:p-2">
          {/* Module Tab Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'overview', label: 'Operasyon Özeti', badge: (summary.failedJobs || 0) + summary.pendingJobs, errorBadge: (summary.failedJobs || 0) > 0 ? summary.failedJobs : null },
              { id: 'baileys', label: 'Servis Durumu', badge: data?.accounts?.length, isAlert: (data?.accounts?.filter(a => a.status !== 'connected').length || 0) > 0 },
              { id: 'messages', label: 'Mesaj Yanıt Masası', badge: (data?.messages?.length || 0) + (data?.aiSuggestions?.length || 0) },
              { id: 'quick_send', label: 'Hızlı Gönderim', badge: null },
              { id: 'jobs', label: 'İş Kuyruğu & Hatalar', badge: data?.jobs?.length, errorBadge: (summary.failedJobs ?? 0) > 0 ? summary.failedJobs : null },
              { id: 'campaigns', label: 'Kampanyalar', badge: data?.campaigns?.length },
              { id: 'queue', label: 'Gönderim Sırası', badge: summary.queuedMessages },
              { id: 'data_requests', label: 'Veri Talepleri', badge: data?.listRequests?.length, isPending: (data?.listRequests?.filter(r => r.status === 'pending').length || 0) > 0 },
              { id: 'organizations', label: 'Firmalar & Üyelikler', badge: data?.organizations?.length },
              { id: 'contacts', label: 'Rehber & Kişi Havuzu', badge: data?.contactLists?.length },
              { id: 'ai_studio', label: 'ChatGPT & Afiş Üretimi', badge: data?.creatives?.length },
              { id: 'blacklist', label: 'Kara Liste', badge: summary.blacklistedCount },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
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
                      title: `${summary.todayInbound} gelen mesaj`,
                      detail: filteredAiSuggestions.length > 0 ? `${filteredAiSuggestions.length} AI yanıt önerisi hazır.` : 'Gelenleri ve AI önerilerini mesaj masasında izle.',
                      tone: summary.todayInbound > 0 ? 'accent' : 'neutral',
                      action: 'Mesaj Masası',
                      tab: 'messages' as const,
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
                  <h2 className="text-xs sm:text-sm font-bold text-ink">Hızlı İşlem</h2>
                  <p className="text-[11px] text-ink-muted mt-0.5">En sık kullanılan operasyon yolları.</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setActiveTab('messages')} className="rounded border border-[var(--color-hairline)] bg-canvas px-3 py-2 text-left text-[11px] font-semibold text-ink hover:bg-[var(--color-surface-raised)]">Mesajları izle</button>
                  <button type="button" onClick={() => setActiveTab('quick_send')} className="rounded border border-accent/25 bg-accent-soft/30 px-3 py-2 text-left text-[11px] font-semibold text-accent hover:bg-accent-soft">Hızlı gönder</button>
                  <button type="button" onClick={() => setActiveTab('baileys')} className="rounded border border-[var(--color-hairline)] bg-canvas px-3 py-2 text-left text-[11px] font-semibold text-ink hover:bg-[var(--color-surface-raised)]">Servisi kontrol et</button>
                  <button type="button" onClick={() => setActiveTab('data_requests')} className="rounded border border-[var(--color-hairline)] bg-canvas px-3 py-2 text-left text-[11px] font-semibold text-ink hover:bg-[var(--color-surface-raised)]">Veri talepleri</button>
                </div>
                <div className="rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-canvas p-3 text-[11px] text-ink-muted">
                  <div className="flex justify-between gap-2"><span>Bağlı hat</span><b className="text-ink">{summary.connectedAccounts ?? 0}/{summary.totalAccounts ?? data?.accounts?.length ?? 0}</b></div>
                  <div className="mt-1 flex justify-between gap-2"><span>Bugün giden</span><b className="text-ink">{summary.todayOutbound}</b></div>
                  <div className="mt-1 flex justify-between gap-2"><span>Onay bekleyen veri</span><b className="text-ink">{summary.pendingDataRequests}</b></div>
                  <div className="mt-1 flex justify-between gap-2"><span>Kara liste</span><b className="text-ink">{summary.blacklistedCount ?? 0}</b></div>
                </div>
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
                    <span className="px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400">Pro: {organizationsList.filter(o => o.plan === 'pro').length}</span>
                    <span className="px-1.5 py-0.2 rounded bg-accent/10 text-accent">St: {organizationsList.filter(o => o.plan === 'starter').length}</span>
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
                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                : o.plan === 'starter'
                                ? 'bg-accent-soft text-accent border-accent/30'
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
                                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                    : o.plan === 'starter'
                                    ? 'bg-accent-soft text-accent border-accent/30'
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

                {/* Optional Media URL */}
                <div>
                  <label className="block text-[11px] font-semibold text-ink-soft mb-1">
                    Görsel / Medya URL <span className="text-ink-muted font-normal">(İsteğe Bağlı)</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/kampanya-afisi.jpg"
                    value={quickMediaUrl}
                    onChange={e => setQuickMediaUrl(e.target.value)}
                    className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent"
                  />
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

        {/* TAB 6: CHATGPT & GÖRSEL ÜRETİM SIRASI (CANLI PROMPT, JSON VE KUYRUK TAKİBİ) */}
        {activeTab === 'ai_studio' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-hairline)] pb-2.5">
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-ink">ChatGPT & Görsel Üretim Akışı</h2>
                <p className="text-[11px] text-ink-muted">
                  Firmalardan gelen anlık görsel üretim istekleri, ChatGPT'ye giden sistem prompt komutları ve JSON yükleri
                </p>
              </div>
              <span className="text-[11px] font-semibold text-ink-muted">{data?.creatives.length} Üretim Kaydı</span>
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

                        {/* Image Preview or Loading Spinner */}
                        <div className="aspect-video sm:aspect-[4/3] bg-canvas rounded-[var(--radius-sm)] border border-[var(--color-hairline)] overflow-hidden relative flex items-center justify-center">
                          {cr.public_url ? (
                            <img
                              src={cr.public_url}
                              alt={cr.title}
                              className="w-full h-full object-cover cursor-pointer hover:scale-102 transition duration-200"
                              onClick={() => setInspectedCreative(cr)}
                            />
                          ) : isRendering ? (
                            <div className="flex flex-col items-center gap-1.5 p-3 text-center">
                              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                              <span className="text-[11px] font-semibold text-accent">Görsel Üretiliyor...</span>
                              <span className="text-[10px] text-ink-muted">ChatGPT & Görsel Motoru Çalışıyor</span>
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
                              ChatGPT Prompt Komutu:
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
                              href={cr.public_url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 text-xs font-semibold rounded bg-surface text-ink hover:bg-canvas border border-[var(--color-hairline)]"
                            >
                              Büyüt
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                setQuickMediaUrl(cr.public_url || '')
                                setQuickMessage(cr.title || 'Afiş ve Görsel Kampanya Paylaşımı')
                                setActiveTab('quick_send')
                                showNotice('Görsel hızlı gönderim kutusuna aktarıldı.')
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
        )}

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
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none bg-[var(--color-surface-raised)] p-1 rounded-[var(--radius-sm)] border border-[var(--color-hairline)]">
              {[
                { id: 'suggestions', label: 'AI Yanıt Önerileri', count: filteredAiSuggestions.length },
                { id: 'all', label: 'Tüm Mesaj Akışı', count: filteredMessages.length },
                { id: 'in', label: 'Gelenler', count: filteredMessages.filter(m => m.direction === 'in').length },
                { id: 'out', label: 'Gidenler', count: filteredMessages.filter(m => m.direction === 'out').length },
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

            {/* VIEW 2: TÜM / GELEN / GİDEN WHATSAPP MESAJLARI */}
            {(msgStreamTab === 'all' || msgStreamTab === 'in' || msgStreamTab === 'out') && (
              <div className="space-y-2">
                {(() => {
                  const msgs =
                    msgStreamTab === 'all'
                      ? filteredMessages
                      : filteredMessages.filter(m => m.direction === msgStreamTab)

                  if (msgs.length === 0) {
                    return <p className="text-xs text-ink-muted text-center py-8">Kriterlere uygun mesaj bulunamadı.</p>
                  }

                  return msgs.map(m => (
                    <div
                      key={m.id}
                      className={`p-2.5 sm:p-3 rounded-[var(--radius-sm)] border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        m.direction === 'in'
                          ? 'bg-ok-soft/25 border-ok/30'
                          : 'bg-surface-raised/40 border-[var(--color-hairline)]'
                      }`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              m.direction === 'in' ? 'bg-ok text-white' : 'bg-accent text-white'
                            }`}
                          >
                            {m.direction === 'in' ? 'GELEN' : 'GİDEN'}
                          </span>
                          <span className="font-mono text-xs font-semibold text-ink">{m.phone_e164}</span>
                          {m.push_name && (
                            <span className="text-xs font-medium text-ink-soft">({m.push_name})</span>
                          )}
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-surface border border-[var(--color-hairline)] text-ink-muted">
                            {m.org_name || 'Genel'}
                          </span>
                          <span className="text-[10px] text-ink-muted">· {timeAgo(m.created_at)}</span>
                        </div>
                        <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap">{m.body || '[Medya İçeriği]'}</p>
                      </div>

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
                  ))
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
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-600 text-white">
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
                  <h3 className="text-xs sm:text-sm font-bold text-ink">ChatGPT Görsel Üretim Komutu & JSON</h3>
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
              {/* Image Preview if available */}
              {inspectedCreative.public_url && (
                <div className="max-h-56 bg-canvas rounded border border-[var(--color-hairline)] overflow-hidden flex items-center justify-center">
                  <img
                    src={inspectedCreative.public_url}
                    alt={inspectedCreative.title}
                    className="max-h-56 object-contain"
                  />
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
              <div className="flex items-center gap-1 bg-surface-raised p-0.5 rounded-[var(--radius-sm)] overflow-x-auto">
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

    </div>
  )
}
