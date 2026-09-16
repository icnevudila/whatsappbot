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
  member_count: number
  created_at: string
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

type FeedData = {
  accounts: Account[]
  worker: WorkerHeartbeat | null
  campaigns: CampaignItem[]
  targets: TargetItem[]
  creatives: CreativeItem[]
  listRequests: ListRequestItem[]
  contactLists: ContactListItem[]
  messages: MessageLog[]
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
    pendingDataRequests: number
    blacklistedCount?: number
    connectedAccounts?: number
    totalAccounts?: number
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

function formatClock(dateString: string | null | undefined): string {
  if (!dateString) return ''
  try {
    const d = new Date(dateString)
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return ''
  }
}

export function LiveDashboard() {
  const [data, setData] = useState<FeedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<
    'quick_send' | 'campaigns' | 'queue' | 'data_requests' | 'contact_lists' | 'ai_studio' | 'blacklist' | 'baileys' | 'messages' | 'jobs'
  >('quick_send')

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

  // New Data Request Form
  const [reqKind, setReqKind] = useState<'province_district' | 'nearby'>('province_district')
  const [newCategory, setNewCategory] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newRadius, setNewRadius] = useState<number>(3)
  const [submittingRequest, setSubmittingRequest] = useState(false)

  // Blacklist Form
  const [blackPhone, setBlackPhone] = useState('')
  const [blackReason, setBlackReason] = useState('')
  const [blackSubmitting, setBlackSubmitting] = useState(false)

  // Contacts Inspector Drawer / Modal
  const [previewListId, setPreviewListId] = useState<string | null>(null)
  const [previewListName, setPreviewListName] = useState('')
  const [previewContacts, setPreviewContacts] = useState<ContactRecord[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewTotal, setPreviewTotal] = useState(0)

  // Job JSON Detail Modal
  const [inspectedJob, setInspectedJob] = useState<JobItem | null>(null)

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
    if (!confirm('Baileys WhatsApp servisi VPS üzerinde yeniden başlatılacak. Devam etmek istiyor musunuz?')) return
    if (actionBusy) return
    setActionBusy(true)
    try {
      const res = await fetch('/api/canli-takip/restart-service', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        showNotice('Baileys servisi yeniden başlatma sinyali gönderildi.')
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

  // Yeni Veri Talebi Gönder
  const handleCreateDataRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategory.trim() && reqKind === 'province_district') {
      alert('Lütfen bir sektör / kategori girin.')
      return
    }
    if (!newLocation.trim()) {
      alert('Lütfen bir şehir, ilçe veya açık adres girin.')
      return
    }

    setSubmittingRequest(true)
    try {
      const res = await fetch('/api/canli-takip/create-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: reqKind,
          category: newCategory.trim() || undefined,
          address: newLocation.trim(),
          location: newLocation.trim(),
          radius_km: reqKind === 'nearby' ? newRadius : undefined,
          source: 'places',
        }),
      })
      const json = await res.json()
      if (json.success) {
        showNotice('Veri talebi başarıyla oluşturuldu ve kuyruğa alındı.')
        setNewCategory('')
        setNewLocation('')
        setTimeout(fetchData, 2000)
      } else {
        alert('Talep oluşturulamadı: ' + (json.error || 'Bilinmeyen hata'))
      }
    } catch (err) {
      alert('İstek hatası: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSubmittingRequest(false)
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

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[var(--color-canvas)] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-ink-soft">Yönetici Paneli Yükleniyor...</p>
        <p className="text-xs text-ink-muted mt-1">Baileys VPS ve PostgreSQL bağlantısı kuruluyor.</p>
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
    pendingDataRequests: 0,
    blacklistedCount: 0,
    connectedAccounts: 0,
    totalAccounts: 0,
  }

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)] flex flex-col antialiased selection:bg-accent/20">
      {/* Top Floating Notification Banner */}
      {actionNotice && (
        <div className="sticky top-0 z-50 bg-accent text-accent-ink px-4 py-2.5 text-center text-xs sm:text-sm font-semibold shadow-md flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Main Header Bar */}
      <header className="sticky top-0 z-40 bg-[var(--color-surface)]/95 backdrop-blur-md border-b border-[var(--color-hairline)] px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] flex items-center justify-center">
              <LogoMark className="w-6 h-6 text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-ink">{BRAND_NAME}</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                  FULL+ ADMIN PACK
                </span>
              </div>
              <p className="text-[11px] text-ink-muted">Tüm Altyapı, Baileys Hatları, Kampanya ve Lead Operasyonu</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Organization Filter Selector */}
            {organizationsList.length > 0 && (
              <div className="flex items-center gap-1.5 bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] px-2.5 py-1">
                <span className="text-[11px] text-ink-muted font-medium">İşletme:</span>
                <select
                  value={selectedOrg}
                  onChange={e => setSelectedOrg(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-ink outline-none cursor-pointer"
                >
                  <option value="all">Tüm İşletmeler ({organizationsList.length})</option>
                  {organizationsList.map(o => (
                    <option key={o.id} value={o.name}>
                      {o.name} ({o.member_count} üye)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quick Action: Baileys Restart */}
            <button
              onClick={handleRestartService}
              disabled={actionBusy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold bg-danger/10 text-danger border border-danger/20 hover:bg-danger/15 transition disabled:opacity-50"
              title="Hetzner VPS üzerindeki Baileys Docker konteynerini yeniden başlatır"
            >
              Baileys Restart
            </button>

            {/* Quick Action: Reconnect Lines */}
            <button
              onClick={handleReconnectAll}
              disabled={actionBusy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold bg-accent-soft text-accent border border-accent/20 hover:bg-accent/15 transition disabled:opacity-50"
              title="Tüm hatların WhatsApp bağlantısını tazeler"
            >
              Hatları Senkronize Et
            </button>

            {/* Quick Action: Clear Stuck Jobs */}
            <button
              onClick={handleClearStuckJobs}
              disabled={actionBusy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold bg-[var(--color-surface-raised)] text-ink-soft border border-[var(--color-hairline)] hover:bg-canvas transition disabled:opacity-50"
              title="Takılı kalan arka plan işlerini temizler"
            >
              İşleri Temizle
            </button>

            {/* Auto Refresh Toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold border transition ${
                autoRefresh
                  ? 'bg-ok-soft text-ok-dim border-ok-dim/20'
                  : 'bg-[var(--color-surface-raised)] text-ink-muted border-[var(--color-hairline)]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-ok animate-pulse' : 'bg-ink-muted'}`} />
              {autoRefresh ? 'Canlı 5s' : 'Duraklatıldı'}
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium text-ink-muted hover:text-danger hover:bg-danger/5 transition"
              title="Yönetici oturumunu kapat"
            >
              Çıkış
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* KPI Dashboard Cards Grid */}
        <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* Card 1: Baileys Worker */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Baileys VPS</span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xl font-bold text-ink">{worker?.live ?? 0}</span>
              <span className="text-xs text-ink-muted">/ {worker?.tracked ?? 0} hat</span>
            </div>
            <span className="text-[10px] text-ok-dim font-medium mt-1">
              {worker ? `Aktif (${worker.meta?.uptimeSeconds ? Math.floor(worker.meta.uptimeSeconds / 60) + ' dk' : 'canlı'})` : 'Kopuk'}
            </span>
          </div>

          {/* Card 2: Contacts */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Toplam Kişi</span>
            <div className="mt-2 text-xl font-bold text-ink">
              {Number(summary.totalContacts).toLocaleString('tr-TR')}
            </div>
            <span className="text-[10px] text-accent font-medium mt-1">Rehber ve Lead Havuzu</span>
          </div>

          {/* Card 3: Today Inbound */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Bugün Gelen</span>
            <div className="mt-2 text-xl font-bold text-success">
              {summary.todayInbound}
            </div>
            <span className="text-[10px] text-ink-muted mt-1">Gelen sohbetler</span>
          </div>

          {/* Card 4: Today Outbound */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Bugün Giden</span>
            <div className="mt-2 text-xl font-bold text-accent">
              {summary.todayOutbound}
            </div>
            <span className="text-[10px] text-ink-muted mt-1">Gönderilen mesaj</span>
          </div>

          {/* Card 5: Queued Targets */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Gönderim Sırası</span>
            <div className="mt-2 text-xl font-bold text-warn">
              {summary.queuedMessages}
            </div>
            <span className="text-[10px] text-ink-muted mt-1">Kuyrukta bekleyen</span>
          </div>

          {/* Card 6: Active Campaigns */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Kampanyalar</span>
            <div className="mt-2 text-xl font-bold text-ink">
              {summary.activeCampaigns}
            </div>
            <span className="text-[10px] text-ink-muted mt-1">Çalışan gönderim</span>
          </div>

          {/* Card 7: Lead Requests */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Veri Talepleri</span>
            <div className="mt-2 text-xl font-bold text-ink">
              {summary.pendingDataRequests}
            </div>
            <span className="text-[10px] text-ink-muted mt-1">Bekleyen talep</span>
          </div>

          {/* Card 8: Blacklist Count */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-3.5 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Kara Liste</span>
            <div className="mt-2 text-xl font-bold text-danger">
              {summary.blacklistedCount ?? 0}
            </div>
            <span className="text-[10px] text-ink-muted mt-1">Engellenen numara</span>
          </div>
        </section>

        {/* Search & Module Tabs Bar */}
        <section className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-2">
          {/* Module Tab Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'quick_send', label: 'Hızlı Gönderim', badge: null },
              { id: 'campaigns', label: 'Kampanyalar', badge: data?.campaigns.length },
              { id: 'queue', label: 'Gönderim Sırası', badge: summary.queuedMessages },
              { id: 'data_requests', label: 'Veri Talepleri', badge: data?.listRequests.length },
              { id: 'contact_lists', label: 'Kişi Listeleri', badge: data?.contactLists.length },
              { id: 'ai_studio', label: 'Yapay Zeka & Afiş', badge: data?.creatives.length },
              { id: 'blacklist', label: 'Kara Liste', badge: summary.blacklistedCount },
              { id: 'baileys', label: 'Baileys & Hatlar', badge: data?.accounts.length },
              { id: 'messages', label: 'Canlı Mesajlar', badge: data?.messages.length },
              { id: 'jobs', label: 'İş Kuyruğu', badge: data?.jobs.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-accent text-accent-ink shadow-sm'
                    : 'text-ink-soft hover:bg-[var(--color-surface-raised)]'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge !== null && tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
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
          <div className="relative min-w-[200px] md:w-64">
            <input
              type="text"
              placeholder="Numara, mesaj, isim ara..."
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] px-3 py-1.5 text-xs text-ink placeholder:text-ink-muted outline-none focus:border-accent"
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

        {/* TAB CONTENT MODULES */}

        {/* 1. HIZLI GÖNDERİM KONSOLU */}
        {activeTab === 'quick_send' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sender Form */}
            <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--color-hairline)] pb-3">
                <div>
                  <h2 className="text-sm font-bold text-ink">Doğrudan WhatsApp Mesajı Gönder</h2>
                  <p className="text-xs text-ink-muted">
                    Herhangi bir hatta anında tekli veya test mesajı gönderin. Öncelik 1 olarak Baileys VPS motoruna iletilir.
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent/10 text-accent font-semibold">
                  ÖNCELİK: 1 (ANINDA)
                </span>
              </div>

              <form onSubmit={handleSendQuickMessage} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Sender Account */}
                  <div>
                    <label className="block text-xs font-semibold text-ink-soft mb-1.5">Gönderici WhatsApp Hattı</label>
                    <select
                      value={quickAccountId}
                      onChange={e => setQuickAccountId(e.target.value)}
                      className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-accent"
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
                    <label className="block text-xs font-semibold text-ink-soft mb-1.5">Alıcı Telefon Numarası (E.164)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="+905428212205"
                        value={quickPhone}
                        onChange={e => setQuickPhone(e.target.value)}
                        className="flex-1 bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] px-3 py-2 text-xs font-mono text-ink outline-none focus:border-accent"
                      />
                      <button
                        type="button"
                        onClick={() => setQuickPhone('+905428212205')}
                        className="px-2 py-1 text-[10px] font-mono bg-accent-soft text-accent rounded hover:bg-accent/20"
                        title="Veri Burada test numarasını yapıştır"
                      >
                        Test No
                      </button>
                    </div>
                  </div>
                </div>

                {/* Optional Media URL */}
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                    Görsel / Medya URL <span className="text-ink-muted font-normal">(İsteğe Bağlı)</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/kampanya-afisi.jpg"
                    value={quickMediaUrl}
                    onChange={e => setQuickMediaUrl(e.target.value)}
                    className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] px-3 py-2 text-xs text-ink outline-none focus:border-accent"
                  />
                </div>

                {/* Message Body */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-ink-soft">Mesaj Metni</label>
                    <span className="text-[11px] text-ink-muted font-mono">{quickMessage.length} karakter</span>
                  </div>
                  <textarea
                    rows={5}
                    placeholder="Merhaba! Mesajify üzerinden size özel hazırladığımız kampanya detayları..."
                    value={quickMessage}
                    onChange={e => setQuickMessage(e.target.value)}
                    className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] p-3 text-xs text-ink outline-none focus:border-accent resize-y"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-[11px] text-ink-muted">
                    Baileys VPS üzerinden gerçek zamanlı gönderim yapılır.
                  </div>
                  <button
                    type="submit"
                    disabled={quickSending || !quickPhone.trim() || !quickMessage.trim()}
                    className="px-5 py-2 rounded-[var(--radius-sm)] text-xs font-semibold bg-accent text-accent-ink hover:bg-accent-dim transition disabled:opacity-50 shadow-sm"
                  >
                    {quickSending ? 'Gönderiliyor...' : 'Hemen WhatsApp’tan Gönder'}
                  </button>
                </div>
              </form>
            </div>

            {/* AI Assistant Quick Writer Sidecard */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-ink">ChatGPT Pazarlama Asistanı</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-accent/10 text-accent font-semibold">AI</span>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Bir ürün veya duyuru yazın; ChatGPT doğrudan WhatsApp formatında yüksek dönüşümlü mesaj metni üretsin.
                </p>

                <div>
                  <label className="block text-[11px] font-semibold text-ink-soft mb-1">Ürün / Kampanya Konusu</label>
                  <input
                    type="text"
                    placeholder="Örn: Yeni sezon zeytinyağında %20 indirim"
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] px-3 py-2 text-xs text-ink outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-ink-soft mb-1">Metin Tonu</label>
                  <select
                    value={aiTone}
                    onChange={e => setAiTone(e.target.value as any)}
                    className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] px-3 py-1.5 text-xs text-ink outline-none"
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
                  className="w-full py-2 rounded-[var(--radius-sm)] text-xs font-semibold bg-[var(--color-surface-raised)] text-ink hover:bg-canvas border border-[var(--color-hairline)] transition disabled:opacity-50"
                >
                  {aiGenerating ? 'ChatGPT Üretiyor...' : 'Metin Oluştur'}
                </button>

                {aiResult && (
                  <div className="bg-canvas p-3 rounded-[var(--radius-sm)] border border-[var(--color-hairline)] space-y-2 mt-2">
                    <p className="text-[11px] text-ink whitespace-pre-wrap leading-relaxed">{aiResult}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickMessage(aiResult)
                        showNotice('Üretilen metin gönderim kutusuna aktarıldı.')
                      }}
                      className="w-full py-1.5 text-xs font-semibold bg-accent text-accent-ink rounded-[var(--radius-sm)] hover:bg-accent-dim"
                    >
                      Mesaj Kutusuna Aktar
                    </button>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-ink-muted border-t border-[var(--color-hairline)] pt-3">
                Üretilen metin doğrudan test gönderiminde veya toplu kampanyada kullanılabilir.
              </div>
            </div>
          </div>
        )}

        {/* 2. KAMPANYALAR MODÜLÜ */}
        {activeTab === 'campaigns' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-ink">Kampanya Yönetimi ve İlerleme</h2>
                <p className="text-xs text-ink-muted">Tüm aktif, duraklatılmış ve tamamlanmış toplu gönderimler</p>
              </div>
              <span className="text-xs font-semibold text-ink-muted">{filteredCampaigns.length} Kampanya</span>
            </div>

            {filteredCampaigns.length === 0 ? (
              <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-8 text-center text-xs text-ink-muted">
                Kayıtlı kampanya bulunamadı.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCampaigns.map(c => (
                  <div
                    key={c.id}
                    className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-4 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-ink">{c.name}</h3>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
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
                        <p className="text-[11px] text-ink-muted mt-0.5">
                          {c.org_name && <span className="font-medium text-ink-soft">{c.org_name} · </span>}
                          {timeAgo(c.created_at)} oluşturuldu · Tür: {c.message_type}
                        </p>
                      </div>

                      {/* Campaign Action Buttons */}
                      <div className="flex items-center gap-1.5">
                        {c.status === 'running' && (
                          <button
                            onClick={() => handleCampaignAction(c.id, 'pause')}
                            disabled={actionBusy}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-warn/10 text-warn hover:bg-warn/20"
                          >
                            Duraklat
                          </button>
                        )}
                        {c.status === 'paused' && (
                          <button
                            onClick={() => handleCampaignAction(c.id, 'resume')}
                            disabled={actionBusy}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-ok-soft text-ok-dim hover:bg-ok-soft/80"
                          >
                            Devam Et
                          </button>
                        )}
                        {c.status !== 'stopped' && c.status !== 'completed' && (
                          <button
                            onClick={() => handleCampaignAction(c.id, 'stop')}
                            disabled={actionBusy}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-danger/10 text-danger hover:bg-danger/20"
                          >
                            Durdur
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-[11px] text-ink-muted mb-1">
                        <span>İlerleme: %{c.progress_percent}</span>
                        <span>
                          {c.sent_count} / {c.total_targets} hedef
                        </span>
                      </div>
                      <div className="w-full bg-[var(--color-surface-raised)] h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            c.status === 'running' ? 'bg-ok' : c.status === 'paused' ? 'bg-warn' : 'bg-accent'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, c.progress_percent))}%` }}
                        />
                      </div>
                    </div>

                    {/* Metrics Breakdown */}
                    <div className="grid grid-cols-4 gap-2 pt-1 border-t border-[var(--color-hairline)] text-center">
                      <div>
                        <span className="block text-[10px] text-ink-muted">İletildi</span>
                        <span className="text-xs font-bold text-success">{c.sent_count}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-ink-muted">Bekliyor</span>
                        <span className="text-xs font-bold text-warn">{c.pending_count}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-ink-muted">Hatalı</span>
                        <span className="text-xs font-bold text-danger">{c.failed_count}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-ink-muted">Atlandı</span>
                        <span className="text-xs font-bold text-ink-muted">{c.skipped_count}</span>
                      </div>
                    </div>

                    {/* Message Preview */}
                    {c.body && (
                      <div className="bg-canvas p-2.5 rounded-[var(--radius-sm)] text-[11px] text-ink-soft line-clamp-2">
                        {c.body}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. GÖNDERİM SIRASI (QUEUE) */}
        {activeTab === 'queue' && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-hairline)] pb-3">
              <div>
                <h2 className="text-sm font-bold text-ink">Hedef Mesaj Gönderim Sırası</h2>
                <p className="text-xs text-ink-muted">Kuyrukta bekleyen, gönderilen veya hata alan alıcılar</p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-[var(--color-surface-raised)] p-1 rounded-[var(--radius-sm)]">
                {(['all', 'queued', 'delivered', 'failed'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setQueueFilter(f)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded ${
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
              <p className="text-xs text-ink-muted text-center py-8">Kuyrukta hedef bulunmuyor.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--color-hairline)] text-ink-muted font-semibold">
                      <th className="pb-2">Telefon</th>
                      <th className="pb-2">Kampanya</th>
                      <th className="pb-2">Durum</th>
                      <th className="pb-2">Planlanan Zaman</th>
                      <th className="pb-2">Mesaj Özeti</th>
                      <th className="pb-2">Hata / Not</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-hairline)]">
                    {filteredTargets.map(t => (
                      <tr key={t.id} className="hover:bg-[var(--color-surface-raised)] transition">
                        <td className="py-2.5 font-mono font-semibold text-ink">{t.phone_e164}</td>
                        <td className="py-2.5 text-ink-soft">{t.campaign_name}</td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
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
                        <td className="py-2.5 text-ink-muted">{timeAgo(t.scheduled_for || t.created_at)}</td>
                        <td className="py-2.5 text-ink-muted max-w-xs truncate">{t.personalized_body || '—'}</td>
                        <td className="py-2.5 text-danger font-mono text-[11px] max-w-xs truncate">{t.error || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 4. VERİ TALEPLERİ & LEAD KEŞFİ */}
        {activeTab === 'data_requests' && (
          <div className="space-y-6">
            {/* New Request Creation Form */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-5 shadow-sm space-y-4">
              <div className="border-b border-[var(--color-hairline)] pb-3">
                <h2 className="text-sm font-bold text-ink">Yeni Veri Talebi & Lead Keşfi Başlat</h2>
                <p className="text-xs text-ink-muted">
                  Google Haritalar ve kurumsal veri tabanından il/ilçe veya yakın çevre işletmelerini toplayın.
                </p>
              </div>

              <form onSubmit={handleCreateDataRequest} className="space-y-4">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="reqKind"
                      checked={reqKind === 'province_district'}
                      onChange={() => setReqKind('province_district')}
                    />
                    İl / İlçe Kategori Araması
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="reqKind"
                      checked={reqKind === 'nearby'}
                      onChange={() => setReqKind('nearby')}
                    />
                    Yakın Çevre Adres Araması (Yarıçap)
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {reqKind === 'province_district' ? (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-ink-soft mb-1.5">Sektör / Kategori</label>
                        <input
                          type="text"
                          placeholder="Örn: Eczaneler, Restoranlar, Toptancılar"
                          value={newCategory}
                          onChange={e => setNewCategory(e.target.value)}
                          className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] px-3 py-2 text-xs text-ink outline-none focus:border-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-ink-soft mb-1.5">Şehir / İlçe</label>
                        <input
                          type="text"
                          placeholder="Örn: Kadıköy, İstanbul veya Bursa"
                          value={newLocation}
                          onChange={e => setNewLocation(e.target.value)}
                          className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] px-3 py-2 text-xs text-ink outline-none focus:border-accent"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-ink-soft mb-1.5">Açık Adres / Konum</label>
                        <input
                          type="text"
                          placeholder="Örn: Üçevler Mah. Tanay Cad. Nilüfer Bursa"
                          value={newLocation}
                          onChange={e => setNewLocation(e.target.value)}
                          className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] px-3 py-2 text-xs text-ink outline-none focus:border-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-ink-soft mb-1.5">Yarıçap (KM)</label>
                        <select
                          value={newRadius}
                          onChange={e => setNewRadius(Number(e.target.value))}
                          className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] px-3 py-2 text-xs text-ink outline-none"
                        >
                          <option value={1}>1 km</option>
                          <option value={2}>2 km</option>
                          <option value={3}>3 km</option>
                          <option value={5}>5 km</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div className="sm:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingRequest}
                      className="px-5 py-2 rounded-[var(--radius-sm)] text-xs font-semibold bg-accent text-accent-ink hover:bg-accent-dim transition disabled:opacity-50"
                    >
                      {submittingRequest ? 'Talebi Oluşturuyor...' : 'Veri Toplama Talebini Başlat'}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* List Requests Table */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-ink">Mevcut Veri Toplama Talepleri</h2>
              {data?.listRequests.length === 0 ? (
                <p className="text-xs text-ink-muted text-center py-6">Kayıtlı talep bulunmuyor.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[var(--color-hairline)] text-ink-muted font-semibold">
                        <th className="pb-2">Tür</th>
                        <th className="pb-2">Kategori / Sektör</th>
                        <th className="pb-2">Konum / Adres</th>
                        <th className="pb-2">Toplanan Kişi</th>
                        <th className="pb-2">Durum</th>
                        <th className="pb-2">Tarih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-hairline)]">
                      {data?.listRequests.map(r => (
                        <tr key={r.id} className="hover:bg-[var(--color-surface-raised)]">
                          <td className="py-2.5 font-mono text-[11px] text-ink-soft">{r.kind}</td>
                          <td className="py-2.5 font-semibold text-ink">{r.category || '—'}</td>
                          <td className="py-2.5 text-ink-muted">{r.address || (r.nationwide ? 'Tüm Türkiye' : 'Bölgesel')}</td>
                          <td className="py-2.5 font-bold text-accent">{r.contact_count}</td>
                          <td className="py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                r.status === 'completed'
                                  ? 'bg-ok-soft text-ok-dim'
                                  : r.status === 'processing'
                                  ? 'bg-warn/10 text-warn'
                                  : 'bg-surface-raised text-ink-muted'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="py-2.5 text-ink-muted">{timeAgo(r.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. KİŞİ LİSTELERİ & REHBER */}
        {activeTab === 'contact_lists' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-ink">Kişi Listeleri ve Rehber Grupları</h2>
                <p className="text-xs text-ink-muted">Tüm segmentler, içe aktarılan CSV'ler ve toplanan lead listeleri</p>
              </div>
              <span className="text-xs font-semibold text-ink-muted">{data?.contactLists.length} Liste</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.contactLists.map(l => (
                <div
                  key={l.id}
                  className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-4 shadow-sm flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <h3 className="text-sm font-bold text-ink">{l.name}</h3>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-surface-raised text-ink-muted">
                        {l.source}
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-accent">{l.contact_count}</span>
                      <span className="text-xs text-ink-muted">kayıtlı numara</span>
                    </div>
                    <p className="text-[11px] text-ink-muted mt-1">{timeAgo(l.created_at)} oluşturuldu</p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[var(--color-hairline)]">
                    <button
                      onClick={() => handleOpenListContacts(l.id, l.name)}
                      className="flex-1 py-1.5 text-xs font-semibold rounded bg-surface-raised text-ink hover:bg-canvas border border-[var(--color-hairline)]"
                    >
                      Kişileri İncele
                    </button>
                    <a
                      href={`/api/canli-takip/contacts?listId=${l.id}&format=csv`}
                      download
                      className="px-3 py-1.5 text-xs font-semibold rounded bg-accent-soft text-accent hover:bg-accent/20"
                      title="Listeyi CSV olarak indir"
                    >
                      CSV İndir
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. YAPAY ZEKA & AFİŞ STÜDYOSU (AI STUDIO) */}
        {activeTab === 'ai_studio' && (
          <div className="space-y-6">
            <div className="border-b border-[var(--color-hairline)] pb-3">
              <h2 className="text-sm font-bold text-ink">ChatGPT ve Yapay Zeka Afiş Galerisi</h2>
              <p className="text-xs text-ink-muted">
                Yapay zeka ile üretilen kampanya afişleri, şablonlar ve kreatif üretim sırası
              </p>
            </div>

            {data?.creatives.length === 0 ? (
              <p className="text-xs text-ink-muted text-center py-8">Henüz üretilmiş görsel bulunmuyor.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {data?.creatives.map(cr => (
                  <div
                    key={cr.id}
                    className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] overflow-hidden shadow-sm flex flex-col justify-between"
                  >
                    <div className="aspect-square bg-canvas relative flex items-center justify-center">
                      {cr.public_url ? (
                        <img
                          src={cr.public_url}
                          alt={cr.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="text-center p-3">
                          <span className="text-xs font-semibold text-ink-muted">Önizleme Yok</span>
                          <span className="block text-[10px] text-warn mt-1">{cr.status}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-1">
                      <h4 className="text-xs font-bold text-ink truncate">{cr.title}</h4>
                      <div className="flex items-center justify-between text-[10px] text-ink-muted">
                        <span>{cr.template}</span>
                        <span className="font-mono">{cr.format}</span>
                      </div>
                      <span className="block text-[10px] text-ink-muted pt-1">{timeAgo(cr.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 7. KARA LİSTE (BLACKLIST) */}
        {activeTab === 'blacklist' && (
          <div className="space-y-6">
            {/* Add Blacklist Form */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-5 shadow-sm space-y-4">
              <div className="border-b border-[var(--color-hairline)] pb-3">
                <h2 className="text-sm font-bold text-ink">Yeni Numara Engelle (Kara Liste)</h2>
                <p className="text-xs text-ink-muted">
                  Kampanyalardan ve otomatik yanıtlardan kalıcı olarak muaf tutulacak numarayı ekleyin.
                </p>
              </div>

              <form onSubmit={handleAddBlacklist} className="flex flex-wrap sm:flex-nowrap gap-3">
                <input
                  type="text"
                  placeholder="Telefon: +905xxxxxxxxx"
                  value={blackPhone}
                  onChange={e => setBlackPhone(e.target.value)}
                  className="flex-1 bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] px-3 py-2 text-xs font-mono text-ink outline-none focus:border-accent"
                />
                <input
                  type="text"
                  placeholder="Gerekçe (İstemiyor, Şikayet, Test vb.)"
                  value={blackReason}
                  onChange={e => setBlackReason(e.target.value)}
                  className="flex-1 bg-[var(--color-surface-raised)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] px-3 py-2 text-xs text-ink outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={blackSubmitting || !blackPhone.trim()}
                  className="px-5 py-2 rounded-[var(--radius-sm)] text-xs font-semibold bg-danger text-white hover:bg-danger/90 transition disabled:opacity-50"
                >
                  {blackSubmitting ? 'Ekleniyor...' : 'Numarayı Engelle'}
                </button>
              </form>
            </div>

            {/* Blacklist Table */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-ink">Engellenen Numaralar Listesi</h2>
              {filteredBlacklist.length === 0 ? (
                <p className="text-xs text-ink-muted text-center py-6">Engellenen numara kaydı bulunmuyor.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[var(--color-hairline)] text-ink-muted font-semibold">
                        <th className="pb-2">Telefon</th>
                        <th className="pb-2">Gerekçe</th>
                        <th className="pb-2">İşletme</th>
                        <th className="pb-2">Engellenme Tarihi</th>
                        <th className="pb-2 text-right">Eylem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-hairline)]">
                      {filteredBlacklist.map(b => (
                        <tr key={b.id} className="hover:bg-[var(--color-surface-raised)]">
                          <td className="py-2.5 font-mono font-semibold text-danger">{b.phone_e164}</td>
                          <td className="py-2.5 text-ink-soft">{b.reason || 'Gerekçe belirtilmemiş'}</td>
                          <td className="py-2.5 text-ink-muted">{b.org_name || 'Genel'}</td>
                          <td className="py-2.5 text-ink-muted">{timeAgo(b.created_at)}</td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => handleRemoveBlacklist(b.id)}
                              disabled={actionBusy}
                              className="px-2 py-1 text-xs font-semibold rounded bg-surface-raised text-danger hover:bg-danger/10"
                            >
                              Engeli Kaldır
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 8. BAILEYS HAT VE SUNUCU KONTROLÜ */}
        {activeTab === 'baileys' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-ink">WhatsApp Hatları ve Baileys Oturum Yönetimi</h2>
                <p className="text-xs text-ink-muted">Tüm fiziksel hatların anlık bağlantı, kilit ve yetki durumu</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredAccounts?.map(a => (
                <div
                  key={a.id}
                  className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-4 shadow-sm space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <h3 className="text-sm font-bold text-ink">{a.label}</h3>
                        <p className="font-mono text-xs text-ink-soft mt-0.5">{a.phone_e164 || 'Numara yok'}</p>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
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

                    <div className="mt-2 space-y-1 text-[11px] text-ink-muted">
                      <div>İşletme: <span className="font-semibold text-ink-soft">{a.org_name}</span></div>
                      <div>Son Görülme: {timeAgo(a.last_seen_at)}</div>
                      {a.status_detail && (
                        <div className="text-danger font-mono text-[10px]">{a.status_detail}</div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-[var(--color-hairline)]">
                    <button
                      onClick={() => handleAccountAction(a.id, 'connect')}
                      disabled={actionBusy}
                      className="py-1.5 text-xs font-semibold rounded bg-accent-soft text-accent hover:bg-accent/20 transition disabled:opacity-50"
                    >
                      Bağlan
                    </button>
                    <button
                      onClick={() => handleAccountAction(a.id, 'sync_contacts')}
                      disabled={actionBusy || a.status !== 'connected'}
                      className="py-1.5 text-xs font-semibold rounded bg-surface-raised text-ink hover:bg-canvas transition disabled:opacity-50"
                    >
                      Rehberi Eşle
                    </button>
                    <button
                      onClick={() => handleAccountAction(a.id, 'disconnect')}
                      disabled={actionBusy || a.status !== 'connected'}
                      className="py-1.5 text-xs font-semibold rounded bg-warn/10 text-warn hover:bg-warn/20 transition disabled:opacity-50"
                    >
                      Kopar
                    </button>
                    <button
                      onClick={() => handleAccountAction(a.id, 'logout')}
                      disabled={actionBusy}
                      className="py-1.5 text-xs font-semibold rounded bg-danger/10 text-danger hover:bg-danger/20 transition disabled:opacity-50"
                    >
                      Çıkış Yap
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 9. CANLI MESAJ AKIŞI (MESSAGES) */}
        {activeTab === 'messages' && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-hairline)] pb-3">
              <div>
                <h2 className="text-sm font-bold text-ink">Canlı WhatsApp Sohbet ve Mesaj Akışı</h2>
                <p className="text-xs text-ink-muted">Müşterilerden gelen ve giden gerçek zamanlı mesaj kayıtları</p>
              </div>

              {/* Message Direction Filter */}
              <div className="flex items-center gap-1 bg-[var(--color-surface-raised)] p-1 rounded-[var(--radius-sm)]">
                {(['all', 'in', 'out'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setMsgFilter(d)}
                    className={`px-3 py-1 text-xs font-semibold rounded ${
                      msgFilter === d ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {d === 'all' ? 'Tümü' : d === 'in' ? 'Gelenler' : 'Gidenler'}
                  </button>
                ))}
              </div>
            </div>

            {filteredMessages.length === 0 ? (
              <p className="text-xs text-ink-muted text-center py-8">Mesaj bulunamadı.</p>
            ) : (
              <div className="space-y-2">
                {filteredMessages.map(m => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-[var(--radius-sm)] border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      m.direction === 'in'
                        ? 'bg-ok-soft/30 border-ok/20'
                        : 'bg-surface-raised/40 border-[var(--color-hairline)]'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            m.direction === 'in' ? 'bg-ok text-white' : 'bg-accent text-white'
                          }`}
                        >
                          {m.direction === 'in' ? 'GELEN' : 'GİDEN'}
                        </span>
                        <span className="font-mono text-xs font-semibold text-ink">{m.phone_e164}</span>
                        {m.push_name && (
                          <span className="text-xs font-medium text-ink-soft">({m.push_name})</span>
                        )}
                        <span className="text-[11px] text-ink-muted">· {timeAgo(m.created_at)}</span>
                      </div>
                      <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap">{m.body || '[Medya İçeriği]'}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {m.phone_e164 && (
                        <button
                          onClick={() => {
                            setQuickPhone(m.phone_e164 || '')
                            setActiveTab('quick_send')
                            showNotice(`${m.phone_e164} hızlı yanıt kutusuna aktarıldı.`)
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-surface text-ink hover:bg-canvas border border-[var(--color-hairline)]"
                        >
                          Hızlı Yanıtla
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 10. İŞ KUYRUĞU (JOBS) */}
        {activeTab === 'jobs' && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-hairline)] pb-3">
              <div>
                <h2 className="text-sm font-bold text-ink">PostgreSQL Arka Plan Görev Kuyruğu (Jobs)</h2>
                <p className="text-xs text-ink-muted">VPS worker tarafından asenkron işlenen komutlar</p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-[var(--color-surface-raised)] p-1 rounded-[var(--radius-sm)]">
                {(['all', 'pending', 'running', 'failed', 'done'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setJobFilter(s)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded ${
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
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
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
                        <td className="py-2.5 font-mono font-semibold text-ink">#{j.id}</td>
                        <td className="py-2.5 font-mono text-[11px] text-accent font-semibold">{j.type}</td>
                        <td className="py-2.5 text-ink-muted">{j.priority}</td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
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
                        <td className="py-2.5 text-ink-muted">
                          {j.attempts}/{j.max_attempts}
                        </td>
                        <td className="py-2.5 text-ink-muted">{timeAgo(j.created_at)}</td>
                        <td className="py-2.5 text-danger font-mono text-[11px] max-w-xs truncate">
                          {j.error || '—'}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => setInspectedJob(j)}
                            className="px-2 py-1 text-xs font-semibold rounded bg-surface-raised text-ink hover:bg-canvas"
                          >
                            JSON
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL 1: CONTACTS LIST INSPECTOR */}
      {previewListId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-[var(--color-hairline)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-ink">{previewListName} — Kişiler</h3>
                <p className="text-xs text-ink-muted">Toplam {previewTotal} kayıt</p>
              </div>
              <button
                onClick={() => setPreviewListId(null)}
                className="w-7 h-7 rounded-full bg-surface-raised text-ink-soft hover:bg-canvas flex items-center justify-center font-bold"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {previewLoading ? (
                <div className="text-center py-8 text-xs text-ink-muted">Kişiler yükleniyor...</div>
              ) : previewContacts.length === 0 ? (
                <div className="text-center py-8 text-xs text-ink-muted">Bu grupta kayıt bulunamadı.</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--color-hairline)] text-ink-muted font-semibold">
                      <th className="pb-2">Telefon</th>
                      <th className="pb-2">İsim</th>
                      <th className="pb-2">Kaynak</th>
                      <th className="pb-2">WhatsApp Durumu</th>
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
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
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
              )}
            </div>

            <div className="p-4 border-t border-[var(--color-hairline)] flex justify-between items-center bg-canvas">
              <a
                href={`/api/canli-takip/contacts?listId=${previewListId}&format=csv`}
                download
                className="px-3 py-1.5 text-xs font-semibold rounded bg-accent text-accent-ink hover:bg-accent-dim"
              >
                Tümünü CSV Olarak İndir
              </a>
              <button
                onClick={() => setPreviewListId(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded bg-surface border border-[var(--color-hairline)] text-ink hover:bg-canvas"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: JOB DETAIL JSON INSPECTOR */}
      {inspectedJob && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[var(--radius-card)] w-full max-w-xl max-h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-[var(--color-hairline)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-ink">
                  İş Detayı: #{inspectedJob.id} ({inspectedJob.type})
                </h3>
                <p className="text-xs text-ink-muted">Durum: {inspectedJob.status.toUpperCase()}</p>
              </div>
              <button
                onClick={() => setInspectedJob(null)}
                className="w-7 h-7 rounded-full bg-surface-raised text-ink-soft hover:bg-canvas flex items-center justify-center font-bold"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[11px]">
              <div>
                <span className="block text-ink-muted font-sans font-semibold mb-1">Payload (Girdi):</span>
                <pre className="bg-canvas p-3 rounded border border-[var(--color-hairline)] overflow-x-auto text-ink">
                  {JSON.stringify(inspectedJob.payload, null, 2)}
                </pre>
              </div>

              {inspectedJob.result && (
                <div>
                  <span className="block text-ink-muted font-sans font-semibold mb-1">Result (Sonuç):</span>
                  <pre className="bg-canvas p-3 rounded border border-[var(--color-hairline)] overflow-x-auto text-ok-dim">
                    {JSON.stringify(inspectedJob.result, null, 2)}
                  </pre>
                </div>
              )}

              {inspectedJob.error && (
                <div>
                  <span className="block text-ink-muted font-sans font-semibold mb-1">Hata Detayı:</span>
                  <pre className="bg-danger/5 p-3 rounded border border-danger/20 overflow-x-auto text-danger">
                    {inspectedJob.error}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-[var(--color-hairline)] flex justify-end bg-canvas">
              <button
                onClick={() => setInspectedJob(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded bg-surface border border-[var(--color-hairline)] text-ink hover:bg-canvas"
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
