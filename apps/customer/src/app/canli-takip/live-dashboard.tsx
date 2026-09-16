'use client'

import { useState, useEffect, useCallback } from 'react'
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
  wait_reason: string | null
  org_name?: string
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
}

type ListRequestItem = {
  id: string
  kind: string
  status: string
  category: string | null
  address: string | null
  locations: Array<{ label?: string; province_name?: string; district_name?: string }> | null
  contact_count: number
  radius_km: number | null
  nationwide: boolean | null
  created_at: string
  updated_at: string
  org_name?: string
}

type ContactListItem = {
  id: string
  name: string
  contact_count: number
  source: string
  created_at: string
  org_name?: string
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
  summary: {
    todayInbound: number
    todayOutbound: number
    queuedMessages: number
    pendingJobs: number
    activeCampaigns: number
    totalContacts: number
    pendingDataRequests: number
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
    'campaigns' | 'queue' | 'data_requests' | 'contact_lists' | 'ai_creatives' | 'baileys' | 'messages' | 'jobs'
  >('campaigns')
  const [queueFilter, setQueueFilter] = useState<'all' | 'queued' | 'delivered' | 'failed'>('all')
  const [msgFilter, setMsgFilter] = useState<'all' | 'in' | 'out'>('all')
  const [selectedOrg, setSelectedOrg] = useState<string>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  // Yeni Veri Talebi Formu
  const [newCategory, setNewCategory] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [submittingRequest, setSubmittingRequest] = useState(false)

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
    const interval = setInterval(fetchData, 6000)
    return () => clearInterval(interval)
  }, [fetchData, autoRefresh])

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
    if (!confirm('Baileys WhatsApp servisi yeniden başlatılacak. Devam etmek istiyor musunuz?')) return
    if (actionBusy) return
    setActionBusy(true)
    setActionNotice('Baileys servisine yeniden başlatma sinyali gönderiliyor...')
    try {
      const res = await fetch('/api/canli-takip/restart-service', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        setActionNotice('Baileys servisi yeniden başlatılıyor. Birkaç saniye içinde hatlar tekrar bağlanacak...')
        setTimeout(() => {
          fetchData()
          setActionNotice(null)
        }, 5000)
      } else {
        setActionNotice(`Hata: ${json.error}`)
      }
    } catch (err) {
      setActionNotice(`Hata: ${err instanceof Error ? err.message : 'İstek başarısız'}`)
    } finally {
      setActionBusy(false)
    }
  }

  // Tüm Hatları Yeniden Bağla
  const handleReconnectAll = async () => {
    if (actionBusy) return
    setActionBusy(true)
    setActionNotice('Tüm hatlar için bağlantı yenileme tetikleniyor...')
    try {
      const res = await fetch('/api/canli-takip/reconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      const json = await res.json()
      if (json.success) {
        setActionNotice(json.message || 'Tüm hatlar başarıyla kuyruğa alındı.')
        setTimeout(() => {
          fetchData()
          setActionNotice(null)
        }, 4000)
      } else {
        setActionNotice(`Hata: ${json.error}`)
      }
    } catch (err) {
      setActionNotice(`Hata: ${err instanceof Error ? err.message : 'İstek başarısız'}`)
    } finally {
      setActionBusy(false)
    }
  }

  // Tek Hat Yeniden Bağla
  const handleReconnectSingle = async (accountId: string) => {
    if (actionBusy) return
    setActionBusy(true)
    setActionNotice('Hatta bağlanılıyor...')
    try {
      const res = await fetch('/api/canli-takip/reconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })
      const json = await res.json()
      if (json.success) {
        setActionNotice('Bağlantı kuyruğa yazıldı. Birkaç saniye içinde aktifleşecek.')
        setTimeout(() => {
          fetchData()
          setActionNotice(null)
        }, 3000)
      } else {
        setActionNotice(`Hata: ${json.error}`)
      }
    } catch (err) {
      setActionNotice(`Hata: ${err instanceof Error ? err.message : 'İstek başarısız'}`)
    } finally {
      setActionBusy(false)
    }
  }

  // Yeni Veri Talebi Gönder
  const handleCreateListRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategory.trim()) return
    setSubmittingRequest(true)
    try {
      const res = await fetch('/api/canli-takip/create-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newCategory.trim(),
          address: newLocation.trim() || 'Türkiye Geneli',
          kind: newLocation.trim() ? 'province_district' : 'nationwide',
        }),
      })
      const json = await res.json()
      if (json.success) {
        setActionNotice(`"${newCategory}" için veri talebi başarıyla oluşturuldu.`)
        setNewCategory('')
        setNewLocation('')
        fetchData()
      } else {
        setActionNotice(`Hata: ${json.error}`)
      }
    } catch (err) {
      setActionNotice(`Hata: ${err instanceof Error ? err.message : 'İstek başarısız'}`)
    } finally {
      setSubmittingRequest(false)
    }
  }

  // Filtreler
  const accounts = data?.accounts ?? []
  const orgNames = Array.from(
    new Set(
      [
        ...accounts.map((a) => a.org_name),
        ...(data?.campaigns ?? []).map((c) => c.org_name),
        ...(data?.listRequests ?? []).map((l) => l.org_name),
      ].filter(Boolean),
    ),
  ) as string[]

  const filteredAccounts = accounts.filter((a) => {
    if (selectedOrg !== 'all' && a.org_name !== selectedOrg) return false
    return true
  })

  const connectedAccountsCount = filteredAccounts.filter((a) => a.status === 'connected').length
  const totalAccountsCount = filteredAccounts.length

  const filteredCampaigns = (data?.campaigns ?? []).filter((c) => {
    if (selectedOrg !== 'all' && c.org_name && c.org_name !== selectedOrg) return false
    return true
  })

  const filteredTargets = (data?.targets ?? []).filter((t) => {
    if (selectedOrg !== 'all' && t.org_name && t.org_name !== selectedOrg) return false
    if (queueFilter === 'queued') return t.status === 'queued'
    if (queueFilter === 'delivered') return t.status === 'delivered' || t.status === 'sent' || t.status === 'read'
    if (queueFilter === 'failed') return t.status === 'failed' || t.status === 'skipped'
    return true
  })

  const filteredListRequests = (data?.listRequests ?? []).filter((lr) => {
    if (selectedOrg !== 'all' && lr.org_name && lr.org_name !== selectedOrg) return false
    return true
  })

  const filteredContactLists = (data?.contactLists ?? []).filter((cl) => {
    if (selectedOrg !== 'all' && cl.org_name && cl.org_name !== selectedOrg) return false
    return true
  })

  const filteredCreatives = (data?.creatives ?? []).filter((cr) => {
    if (selectedOrg !== 'all' && cr.org_name && cr.org_name !== selectedOrg) return false
    return true
  })

  const filteredMessages = (data?.messages ?? []).filter((m) => {
    if (selectedOrg !== 'all' && m.org_name && m.org_name !== selectedOrg) return false
    if (msgFilter === 'in') return m.direction === 'in'
    if (msgFilter === 'out') return m.direction === 'out'
    return true
  })

  const filteredJobs = (data?.jobs ?? []).filter((j) => {
    if (selectedOrg !== 'all' && j.org_name && j.org_name !== selectedOrg) return false
    return true
  })

  const queuedTargetsCount = (data?.targets ?? []).filter((t) => t.status === 'queued').length

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink antialiased">
      {/* ÜST BAR (MASTER ADMIN CHROME) */}
      <header className="sticky top-0 z-30 border-b border-hairline bg-surface/95 backdrop-blur-md px-4 sm:px-8 py-3.5 shadow-[var(--shadow-card)]">
        <div className="mx-auto flex max-w-7xl flex-col md:flex-row items-start md:items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] border border-accent/20 bg-accent-soft text-accent">
              <LogoMark className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold tracking-[-0.02em] text-ink">
                  {BRAND_NAME}
                </span>
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent">
                  Full Admin Panel
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-ok/40 bg-ok-soft px-2 py-0.5 text-[11px] font-semibold text-ok-dim">
                  <span className="size-1.5 rounded-full bg-ok animate-pulse" />
                  Canlı Sistem
                </span>
              </div>
              <p className="text-[12px] text-ink-muted">
                Hatlar, kampanyalar, veri talepleri, kuyruk ve yapay zeka operasyon merkezi
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            {orgNames.length > 1 && (
              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                className="h-8 rounded-[var(--radius-sm)] border border-hairline-strong bg-surface px-2.5 text-[12.5px] font-medium text-ink focus:border-accent focus:outline-none"
              >
                <option value="all">Tüm İşletmeler ({orgNames.length})</option>
                {orgNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`h-8 px-3 text-[12px] font-semibold rounded-[var(--radius-sm)] border transition ${
                autoRefresh
                  ? 'border-ok/40 bg-ok-soft text-ok-dim'
                  : 'border-hairline-strong bg-surface-raised text-ink-muted'
              }`}
            >
              {autoRefresh ? 'Canlı Akış: Açık (6s)' : 'Canlı Akış: Duraklatıldı'}
            </button>

            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="h-8 px-3 text-[12px] font-semibold bg-surface border border-hairline-strong hover:bg-surface-raised rounded-[var(--radius-sm)] text-ink transition"
            >
              Yenile
            </button>

            <button
              onClick={handleRestartService}
              disabled={actionBusy}
              title="Hetzner VPS üzerindeki Baileys servisini yeniden başlatır"
              className="h-8 px-3 text-[12px] font-bold bg-danger/10 hover:bg-danger/15 border border-danger/35 text-danger rounded-[var(--radius-sm)] transition disabled:opacity-50 flex items-center gap-1"
            >
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Baileys Restart</span>
            </button>

            <button
              onClick={handleReconnectAll}
              disabled={actionBusy}
              className="h-8 px-3 text-[12px] font-bold bg-accent hover:bg-accent-dim text-accent-ink rounded-[var(--radius-sm)] shadow-sm transition disabled:opacity-50"
            >
              Hatları Bağla
            </button>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              title="Paneli kilitle ve oturumu kapat"
              className="h-8 px-2.5 text-[12px] font-semibold bg-surface hover:bg-surface-raised border border-hairline-strong text-ink-muted hover:text-danger rounded-[var(--radius-sm)] transition"
            >
              {loggingOut ? 'Kilitleniyor...' : 'Kilitle'}
            </button>
          </div>
        </div>
      </header>

      {/* ANA İÇERİK KONTEYNERİ */}
      <main className="mx-auto max-w-7xl px-4 sm:px-8 py-6 space-y-6">
        {actionNotice && (
          <div className="flex items-center justify-between rounded-[var(--radius-card)] border border-accent/30 bg-accent-soft/70 px-4 py-3 text-[13.5px] text-accent-dim shadow-sm">
            <span className="font-medium">{actionNotice}</span>
            <button
              onClick={() => setActionNotice(null)}
              className="text-[12px] font-semibold underline hover:opacity-80"
            >
              Kapat
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-[var(--radius-card)] border border-danger/30 bg-danger/10 px-4 py-3 text-[13.5px] text-danger">
            {error}
          </div>
        )}

        {/* KPI YÖNETİCİ ÖZET KARTLARI */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
          {/* Aktif Hatlar */}
          <div className="rounded-[var(--radius-card)] border border-hairline bg-surface p-4 shadow-[var(--shadow-card)] hover:shadow-md transition">
            <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
              Aktif Hatlar
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[24px] font-bold tracking-tight text-ok-dim tabular">
                {connectedAccountsCount}
              </span>
              <span className="text-[13px] font-medium text-ink-faint">/ {totalAccountsCount}</span>
            </div>
            <div className="mt-1 text-[11.5px] text-ink-muted">
              {connectedAccountsCount === totalAccountsCount ? 'Tüm hatlar canlı' : 'Bazı hatlar çevrimdışı'}
            </div>
          </div>

          {/* Aktif Kampanyalar */}
          <div className="rounded-[var(--radius-card)] border border-hairline bg-surface p-4 shadow-[var(--shadow-card)] hover:shadow-md transition">
            <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
              Aktif Kampanya
            </div>
            <div className="mt-1 text-[24px] font-bold tracking-tight text-accent tabular">
              {data?.summary.activeCampaigns ?? 0}
            </div>
            <div className="mt-1 text-[11.5px] text-ink-muted">
              Gönderimde olan
            </div>
          </div>

          {/* Sırada Bekleyen Mesajlar */}
          <div className="rounded-[var(--radius-card)] border border-hairline bg-surface p-4 shadow-[var(--shadow-card)] hover:shadow-md transition">
            <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
              Sırada Bekleyen
            </div>
            <div className="mt-1 text-[24px] font-bold tracking-tight text-warn tabular">
              {data?.summary.queuedMessages ?? 0}
            </div>
            <div className="mt-1 text-[11.5px] text-ink-muted">
              Kuyruktaki mesajlar
            </div>
          </div>

          {/* Veri Talepleri */}
          <div className="rounded-[var(--radius-card)] border border-hairline bg-surface p-4 shadow-[var(--shadow-card)] hover:shadow-md transition">
            <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
              Veri Talepleri
            </div>
            <div className="mt-1 text-[24px] font-bold tracking-tight text-indigo-600 tabular">
              {data?.summary.pendingDataRequests ?? 0}
            </div>
            <div className="mt-1 text-[11.5px] text-ink-muted">
              Bekleyen talep
            </div>
          </div>

          {/* Toplam Rehber Numaraları */}
          <div className="rounded-[var(--radius-card)] border border-hairline bg-surface p-4 shadow-[var(--shadow-card)] hover:shadow-md transition">
            <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
              Kayıtlı Numara
            </div>
            <div className="mt-1 text-[24px] font-bold tracking-tight text-ink tabular">
              {data?.summary.totalContacts ? Number(data.summary.totalContacts).toLocaleString('tr-TR') : 0}
            </div>
            <div className="mt-1 text-[11.5px] text-ink-muted">
              Sistemdeki rehber
            </div>
          </div>

          {/* Baileys Servisi & VPS */}
          <div className="rounded-[var(--radius-card)] border border-hairline bg-surface p-4 shadow-[var(--shadow-card)] hover:shadow-md transition">
            <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
              Baileys VPS
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className={`size-2.5 rounded-full ${data?.worker ? 'bg-ok' : 'bg-danger'}`} />
              <span className="text-[17px] font-bold text-ink truncate">
                {data?.worker?.worker_id ? data.worker.worker_id : 'Hetzner VPS'}
              </span>
            </div>
            <div className="mt-1 text-[11.5px] text-ink-muted truncate">
              {data?.worker?.seen_at ? `Sinyal: ${timeAgo(data.worker.seen_at)}` : 'Çalışıyor'}
            </div>
          </div>
        </div>

        {/* MODÜL SEKMELERİ */}
        <div className="border-b border-hairline">
          <nav className="flex flex-wrap gap-1 sm:gap-2 -mb-px" aria-label="Sekmeler">
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition ${
                activeTab === 'campaigns'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:border-hairline-strong hover:text-ink'
              }`}
            >
              <span>Kampanya Gönderimleri</span>
              <span className="rounded-full bg-surface-raised border border-hairline px-2 py-0.5 text-[11px] font-bold text-ink-muted">
                {filteredCampaigns.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('queue')}
              className={`inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition ${
                activeTab === 'queue'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:border-hairline-strong hover:text-ink'
              }`}
            >
              <span>Sırada & Bekleyen Mesajlar</span>
              {queuedTargetsCount > 0 ? (
                <span className="rounded-full bg-warn/15 border border-warn/30 px-2 py-0.5 text-[11px] font-bold text-warn animate-pulse">
                  {queuedTargetsCount} bekliyor
                </span>
              ) : (
                <span className="rounded-full bg-surface-raised border border-hairline px-2 py-0.5 text-[11px] font-bold text-ink-muted">
                  {filteredTargets.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('data_requests')}
              className={`inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition ${
                activeTab === 'data_requests'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:border-hairline-strong hover:text-ink'
              }`}
            >
              <span>Veri Talepleri & Lead Keşfi</span>
              <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-bold text-indigo-600">
                {filteredListRequests.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('contact_lists')}
              className={`inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition ${
                activeTab === 'contact_lists'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:border-hairline-strong hover:text-ink'
              }`}
            >
              <span>Kişi Listeleri & Rehber</span>
              <span className="rounded-full bg-surface-raised border border-hairline px-2 py-0.5 text-[11px] font-bold text-ink-muted">
                {filteredContactLists.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ai_creatives')}
              className={`inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition ${
                activeTab === 'ai_creatives'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:border-hairline-strong hover:text-ink'
              }`}
            >
              <span>ChatGPT Görsel & İçerik Üretimi</span>
              <span className="rounded-full bg-surface-raised border border-hairline px-2 py-0.5 text-[11px] font-bold text-ink-muted">
                {filteredCreatives.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('baileys')}
              className={`inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition ${
                activeTab === 'baileys'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:border-hairline-strong hover:text-ink'
              }`}
            >
              <span>Baileys Servisi & Hatlar</span>
              <span className="rounded-full bg-surface-raised border border-hairline px-2 py-0.5 text-[11px] font-bold text-ink-muted">
                {filteredAccounts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('messages')}
              className={`inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition ${
                activeTab === 'messages'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:border-hairline-strong hover:text-ink'
              }`}
            >
              <span>Canlı Mesajlaşma Akışı</span>
              <span className="rounded-full bg-surface-raised border border-hairline px-2 py-0.5 text-[11px] font-bold text-ink-muted">
                {filteredMessages.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('jobs')}
              className={`inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition ${
                activeTab === 'jobs'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:border-hairline-strong hover:text-ink'
              }`}
            >
              <span>İş Kuyruğu</span>
              <span className="rounded-full bg-surface-raised border border-hairline px-2 py-0.5 text-[11px] font-bold text-ink-muted">
                {filteredJobs.length}
              </span>
            </button>
          </nav>
        </div>

        {/* SEKME 1: KAMPANYA GÖNDERİMLERİ (GÖNDERİLENLER & BEKLEYENLER) */}
        {activeTab === 'campaigns' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-[13px] text-ink-muted">
              <span>Sistemdeki tüm kampanyalar, gönderim yüzdeleri ve bekleyen hedef sayıları:</span>
              <span className="text-[12px] font-medium text-ink-faint">Toplam {filteredCampaigns.length} kampanya</span>
            </div>

            <div className="space-y-3.5">
              {filteredCampaigns.length === 0 ? (
                <div className="rounded-[var(--radius-card)] border border-hairline bg-surface py-12 text-center text-[13.5px] text-ink-muted">
                  Henüz kampanya kaydı bulunmuyor.
                </div>
              ) : (
                filteredCampaigns.map((camp) => {
                  const isRunning = camp.status === 'running'
                  const isCompleted = camp.status === 'completed'
                  const isPaused = camp.status === 'paused'

                  return (
                    <div
                      key={camp.id}
                      className="rounded-[var(--radius-card)] border border-hairline bg-surface p-5 shadow-[var(--shadow-card)] hover:border-hairline-strong transition space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span
                            className={`rounded-[var(--radius-sm)] px-2.5 py-1 text-[11.5px] font-bold tracking-wider uppercase ${
                              isRunning
                                ? 'bg-ok-soft text-ok-dim border border-ok/40 animate-pulse'
                                : isCompleted
                                  ? 'bg-accent-soft text-accent border border-accent/30'
                                  : isPaused
                                    ? 'bg-warn/10 text-warn border border-warn/30'
                                    : 'bg-surface-raised text-ink-muted border border-hairline'
                            }`}
                          >
                            {isRunning ? 'GÖNDERİLİYOR' : isCompleted ? 'TAMAMLANDI' : isPaused ? 'DURAKLATILDI' : camp.status.toUpperCase()}
                          </span>

                          {camp.org_name && (
                            <span className="rounded-[var(--radius-sm)] bg-surface-raised border border-hairline px-2 py-0.5 text-[12px] font-semibold text-ink-soft">
                              {camp.org_name}
                            </span>
                          )}

                          <h3 className="text-[15.5px] font-bold text-ink">{camp.name}</h3>
                        </div>

                        <span className="text-[12px] text-ink-faint tabular">
                          Oluşturulma: {timeAgo(camp.created_at)}
                        </span>
                      </div>

                      {/* İlerleme Çubuğu */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[13px] font-semibold">
                          <span className="text-ink">İlerleme: %{camp.progress_percent}</span>
                          <span className="text-ink-muted tabular">
                            {camp.sent_count + camp.failed_count + camp.skipped_count} / {camp.total_targets} Hedef
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-canvas-alt rounded-full overflow-hidden border border-hairline">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              isCompleted ? 'bg-accent' : 'bg-ok'
                            }`}
                            style={{ width: `${camp.progress_percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Metrik Kutuları */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                        <div className="rounded-[var(--radius-sm)] border border-hairline bg-canvas p-3 text-center">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Toplam Hedef</div>
                          <div className="text-[18px] font-bold text-ink tabular">{camp.total_targets}</div>
                        </div>

                        <div className="rounded-[var(--radius-sm)] border border-ok/30 bg-ok-soft/60 p-3 text-center">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-ok-dim">Başarıyla Gönderilen</div>
                          <div className="text-[18px] font-bold text-ok-dim tabular">{camp.sent_count}</div>
                        </div>

                        <div className="rounded-[var(--radius-sm)] border border-warn/30 bg-warn/10 p-3 text-center">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-warn">Sırada Bekleyen</div>
                          <div className="text-[18px] font-bold text-warn tabular">{camp.pending_count}</div>
                        </div>

                        <div className="rounded-[var(--radius-sm)] border border-danger/25 bg-danger/5 p-3 text-center">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-danger">Hatalı / Başarısız</div>
                          <div className="text-[18px] font-bold text-danger tabular">{camp.failed_count}</div>
                        </div>
                      </div>

                      {/* Mesaj Önizlemesi */}
                      {camp.body && (
                        <div className="rounded-[var(--radius-sm)] border border-hairline bg-canvas p-3 text-[13px] text-ink-soft whitespace-pre-wrap leading-relaxed">
                          <span className="font-semibold text-ink-muted block mb-1 text-[12px] uppercase tracking-wider">
                            Kampanya Mesaj İçeriği:
                          </span>
                          {camp.body}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* SEKME 2: SIRADA & BEKLEYEN MESAJLAR (QUEUE) */}
        {activeTab === 'queue' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="inline-flex rounded-[var(--radius-sm)] border border-hairline bg-surface p-1 shadow-sm">
                <button
                  onClick={() => setQueueFilter('all')}
                  className={`rounded-[var(--radius-sm)] px-3 py-1 text-[12.5px] font-semibold transition ${
                    queueFilter === 'all'
                      ? 'bg-accent text-accent-ink shadow-sm'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  Tümü
                </button>
                <button
                  onClick={() => setQueueFilter('queued')}
                  className={`rounded-[var(--radius-sm)] px-3 py-1 text-[12.5px] font-semibold transition ${
                    queueFilter === 'queued'
                      ? 'bg-warn text-white shadow-sm'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  Sırada Bekleyenler ({queuedTargetsCount})
                </button>
                <button
                  onClick={() => setQueueFilter('delivered')}
                  className={`rounded-[var(--radius-sm)] px-3 py-1 text-[12.5px] font-semibold transition ${
                    queueFilter === 'delivered'
                      ? 'bg-ok-dim text-white shadow-sm'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  İletilenler
                </button>
                <button
                  onClick={() => setQueueFilter('failed')}
                  className={`rounded-[var(--radius-sm)] px-3 py-1 text-[12.5px] font-semibold transition ${
                    queueFilter === 'failed'
                      ? 'bg-danger text-white shadow-sm'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  Hatalılar
                </button>
              </div>

              <span className="text-[12.5px] text-ink-muted tabular">
                Son {filteredTargets.length} hedef mesaj listeleniyor
              </span>
            </div>

            <div className="rounded-[var(--radius-card)] border border-hairline bg-surface overflow-hidden shadow-[var(--shadow-card)]">
              {filteredTargets.length === 0 ? (
                <div className="p-12 text-center text-[13.5px] text-ink-muted">
                  Seçilen filtrede bekleyen veya iletilen mesaj bulunmuyor.
                </div>
              ) : (
                <div className="divide-y divide-hairline">
                  {filteredTargets.map((target) => {
                    const isQueued = target.status === 'queued'
                    const isDelivered = target.status === 'delivered' || target.status === 'read' || target.status === 'sent'
                    const isFailed = target.status === 'failed'

                    return (
                      <div
                        key={target.id}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition hover:bg-surface-raised/60 ${
                          isQueued ? 'bg-warn/5' : ''
                        }`}
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`rounded-[var(--radius-sm)] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                                isQueued
                                  ? 'bg-warn/15 text-warn border border-warn/30 animate-pulse'
                                  : isDelivered
                                    ? 'bg-ok-soft text-ok-dim border border-ok/40'
                                    : 'bg-danger/10 text-danger border border-danger/30'
                              }`}
                            >
                              {isQueued ? 'SIRADA BEKLİYOR' : isDelivered ? 'İLETİLDİ' : isFailed ? 'HATA' : target.status.toUpperCase()}
                            </span>

                            {target.org_name && (
                              <span className="rounded-[var(--radius-sm)] bg-canvas border border-hairline px-2 py-0.5 text-[11.5px] font-semibold text-ink-soft">
                                {target.org_name}
                              </span>
                            )}

                            <span className="font-mono text-[13.5px] font-bold text-ink">
                              {target.phone_e164}
                            </span>

                            <span className="text-[12.5px] text-accent font-semibold truncate max-w-xs">
                              {target.campaign_name}
                            </span>
                          </div>

                          {target.personalized_body && (
                            <div className="text-[13px] text-ink-soft bg-canvas rounded-[var(--radius-sm)] border border-hairline p-2.5 line-clamp-2">
                              {target.personalized_body}
                            </div>
                          )}

                          {target.error && (
                            <div className="text-[12px] font-medium text-danger">
                              Hata: {target.error}
                            </div>
                          )}
                        </div>

                        <div className="flex sm:flex-col items-start sm:items-end justify-between text-[12px] text-ink-muted tabular shrink-0">
                          <span className="font-medium">
                            {target.sent_at ? `Gönderildi: ${timeAgo(target.sent_at)}` : `Oluşturuldu: ${timeAgo(target.created_at)}`}
                          </span>
                          {target.sent_at && (
                            <span className="text-ink-faint text-[11.5px]">{formatClock(target.sent_at)}</span>
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

        {/* SEKME 3: VERİ TALEPLERİ & LEAD KEŞFİ (YENİ VERİ TALEBİ OLUŞTURMA İLE) */}
        {activeTab === 'data_requests' && (
          <div className="space-y-6">
            {/* Hızlı Yeni Veri Talebi Açma Formu */}
            <div className="rounded-[var(--radius-card)] border border-hairline bg-surface p-5 sm:p-6 shadow-[var(--shadow-card)] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[15.5px] font-bold text-ink">
                    Yeni Veri & Numara Listesi Talebi Oluştur
                  </h3>
                  <p className="text-[12.5px] text-ink-muted mt-0.5">
                    İstediğiniz sektör ve konuma ait doğrulanmış WhatsApp müşteri numaralarını sistem otomatik tarar ve listeye aktarır.
                  </p>
                </div>
                <span className="rounded-full bg-accent-soft px-3 py-1 text-[12px] font-bold text-accent">
                  Google Places & Harita Keşfi
                </span>
              </div>

              <form onSubmit={handleCreateListRequest} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
                    Sektör / Kategori
                  </label>
                  <input
                    type="text"
                    required
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Örn: Eczane, Toptancı, Diş Kliniği..."
                    className="w-full h-9 rounded-[var(--radius-sm)] border border-hairline-strong bg-canvas px-3 text-[13.5px] text-ink placeholder:text-ink-faint focus:border-accent focus:bg-surface focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
                    İl / İlçe / Bölge
                  </label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="Örn: Bursa / Nilüfer veya Türkiye Geneli"
                    className="w-full h-9 rounded-[var(--radius-sm)] border border-hairline-strong bg-canvas px-3 text-[13.5px] text-ink placeholder:text-ink-faint focus:border-accent focus:bg-surface focus:outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={submittingRequest}
                    className="w-full h-9 px-4 text-[13px] font-bold bg-accent hover:bg-accent-dim text-accent-ink rounded-[var(--radius-sm)] shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {submittingRequest ? 'Taranıyor...' : 'Veri Talebini Başlat'}
                  </button>
                </div>
              </form>
            </div>

            {/* Mevcut Veri Talepleri Listesi */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between text-[13px] text-ink-muted">
                <span className="font-semibold text-ink-soft">
                  Sistemdeki Veri Talepleri ({filteredListRequests.length})
                </span>
              </div>

              <div className="rounded-[var(--radius-card)] border border-hairline bg-surface overflow-hidden shadow-[var(--shadow-card)]">
                {filteredListRequests.length === 0 ? (
                  <div className="p-12 text-center text-[13.5px] text-ink-muted">
                    Henüz veri talebi kaydı bulunmuyor.
                  </div>
                ) : (
                  <div className="divide-y divide-hairline">
                    {filteredListRequests.map((req) => {
                      const isPending = req.status === 'pending'
                      const isCompleted = req.status === 'completed'

                      return (
                        <div
                          key={req.id}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-raised/60 transition"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`rounded-[var(--radius-sm)] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                                  isPending
                                    ? 'bg-warn/15 text-warn border border-warn/30 animate-pulse'
                                    : isCompleted
                                      ? 'bg-ok-soft text-ok-dim border border-ok/40'
                                      : 'bg-surface-raised text-ink-muted border border-hairline'
                                }`}
                              >
                                {isPending ? 'İŞLENİYOR / BEKLİYOR' : isCompleted ? 'TAMAMLANDI' : req.status.toUpperCase()}
                              </span>

                              {req.org_name && (
                                <span className="rounded-[var(--radius-sm)] bg-canvas border border-hairline px-2 py-0.5 text-[11.5px] font-semibold text-ink-soft">
                                  {req.org_name}
                                </span>
                              )}

                              <span className="text-[14.5px] font-bold text-ink">
                                {req.category || 'Genel Sektör'}
                              </span>
                            </div>

                            <div className="text-[13px] text-ink-muted flex items-center gap-2">
                              <span>Konum: <strong className="text-ink-soft">{req.address || 'Tüm Türkiye'}</strong></span>
                              {req.radius_km && <span>• {req.radius_km} km yarıçap</span>}
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-start sm:items-end justify-between gap-1 text-[12.5px] text-ink-muted tabular shrink-0">
                            <div className="font-bold text-accent text-[14px]">
                              {req.contact_count > 0 ? `${req.contact_count} Numara Çekildi` : 'Taranıyor'}
                            </div>
                            <span className="text-[11.5px] text-ink-faint">
                              {timeAgo(req.created_at)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SEKME 4: KİŞİ LİSTELERİ & REHBER */}
        {activeTab === 'contact_lists' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-[13px] text-ink-muted">
              <span>Sistemdeki tüm müşteri listeleri, kişi sayıları ve veri kaynakları:</span>
              <span className="text-[12px] font-medium text-ink-faint">Toplam {filteredContactLists.length} liste</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredContactLists.length === 0 ? (
                <div className="col-span-full rounded-[var(--radius-card)] border border-hairline bg-surface p-12 text-center text-[13.5px] text-ink-muted">
                  Henüz kişi listesi bulunmuyor.
                </div>
              ) : (
                filteredContactLists.map((list) => (
                  <div
                    key={list.id}
                    className="rounded-[var(--radius-card)] border border-hairline bg-surface p-4 flex flex-col justify-between gap-3 shadow-[var(--shadow-card)] hover:shadow-md transition"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[15px] font-bold text-ink truncate">{list.name}</h4>
                        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-bold text-accent uppercase">
                          {list.source}
                        </span>
                      </div>

                      {list.org_name && (
                        <div className="text-[12px] text-ink-muted">
                          İşletme: <strong className="text-ink-soft">{list.org_name}</strong>
                        </div>
                      )}

                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-[22px] font-bold text-ink tabular">
                          {Number(list.contact_count).toLocaleString('tr-TR')}
                        </span>
                        <span className="text-[13px] text-ink-muted font-medium">kayıtlı kişi</span>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-hairline flex items-center justify-between text-[12px] text-ink-faint tabular">
                      <span>Oluşturulma: {timeAgo(list.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SEKME 5: CHATGPT GÖRSEL & İÇERİK ÜRETİM SIRASI */}
        {activeTab === 'ai_creatives' && (
          <div className="space-y-4">
            <div className="text-[13px] text-ink-muted">
              Yapay zeka görsel üretim motorunun iş sırası, oluşturulan kampanya görselleri ve durumları:
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCreatives.length === 0 ? (
                <div className="col-span-full rounded-[var(--radius-card)] border border-hairline bg-surface p-12 text-center text-[13.5px] text-ink-muted">
                  Henüz görsel üretim kaydı bulunmuyor.
                </div>
              ) : (
                filteredCreatives.map((cr) => {
                  const isReady = cr.status === 'ready'
                  const isGenerating = cr.status === 'generating' || cr.status === 'pending'

                  return (
                    <div
                      key={cr.id}
                      className="rounded-[var(--radius-card)] border border-hairline bg-surface p-4 flex flex-col justify-between gap-3 shadow-[var(--shadow-card)] hover:shadow-md transition"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`rounded-[var(--radius-sm)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                              isReady
                                ? 'bg-ok-soft text-ok-dim border border-ok/40'
                                : isGenerating
                                  ? 'bg-warn/15 text-warn border border-warn/30 animate-pulse'
                                  : 'bg-danger/10 text-danger border border-danger/30'
                            }`}
                          >
                            {isReady ? 'HAZIRLANDI' : isGenerating ? 'ÜRETİLİYOR' : 'HATA'}
                          </span>

                          {cr.org_name && (
                            <span className="rounded-[var(--radius-sm)] bg-canvas border border-hairline px-2 py-0.5 text-[11.5px] font-semibold text-ink-soft">
                              {cr.org_name}
                            </span>
                          )}
                        </div>

                        <div className="text-[13.5px] font-bold text-ink line-clamp-3">
                          &quot;{cr.title}&quot;
                        </div>

                        {/* Görsel Önizleme */}
                        {cr.public_url ? (
                          <div className="relative rounded-[var(--radius-sm)] overflow-hidden border border-hairline bg-canvas aspect-video flex items-center justify-center group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={cr.public_url}
                              alt={cr.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                          </div>
                        ) : (
                          <div className="rounded-[var(--radius-sm)] border border-dashed border-hairline-strong bg-canvas p-6 flex flex-col items-center justify-center text-center text-[12.5px] text-ink-muted aspect-video">
                            {isGenerating ? (
                              <>
                                <span className="size-5 border-2 border-accent border-t-transparent rounded-full animate-spin mb-2" />
                                <span>ChatGPT görseli render ediyor...</span>
                              </>
                            ) : (
                              <span>Görsel URL mevcut değil</span>
                            )}
                          </div>
                        )}

                        {cr.error && (
                          <div className="text-[12px] text-danger bg-danger/10 p-2.5 rounded-[var(--radius-sm)] border border-danger/25">
                            Hata: {cr.error}
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-hairline flex items-center justify-between text-[12px] text-ink-muted tabular">
                        <span>{timeAgo(cr.created_at)}</span>
                        {cr.public_url && (
                          <a
                            href={cr.public_url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold text-accent hover:text-accent-dim underline"
                          >
                            Tam Boyut Aç
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* SEKME 6: BAILEYS SERVİSİ & HATLAR */}
        {activeTab === 'baileys' && (
          <div className="space-y-6">
            {/* Hetzner VPS Worker Bilgi Paneli */}
            <div className="rounded-[var(--radius-card)] border border-hairline bg-surface p-5 sm:p-6 shadow-[var(--shadow-card)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-ok animate-pulse" />
                    <h2 className="text-[16px] font-bold text-ink">
                      Hetzner VPS Baileys Konteyneri ({data?.worker?.worker_id || 'hetzner-1'})
                    </h2>
                  </div>
                  <p className="text-[13px] text-ink-muted mt-1">
                    WhatsApp çoklu oturum WebSocket altyapısı Hetzner VPS üzerinde kesintisiz çalışmaktadır.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRestartService}
                    disabled={actionBusy}
                    className="h-9 px-4 text-[13px] font-bold bg-danger/10 hover:bg-danger/20 border border-danger/30 text-danger rounded-[var(--radius-sm)] transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Baileys Servisini Yeniden Başlat</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="bg-canvas p-3.5 rounded-[var(--radius-sm)] border border-hairline">
                  <div className="text-[11px] uppercase font-bold text-ink-muted">Canlı Hat Oturumu</div>
                  <div className="text-[20px] font-bold text-ok-dim tabular mt-0.5">
                    {data?.worker?.live ?? connectedAccountsCount} <span className="text-[13px] text-ink-faint font-normal">/ {data?.worker?.max_sessions ?? 15} Kapasite</span>
                  </div>
                </div>

                <div className="bg-canvas p-3.5 rounded-[var(--radius-sm)] border border-hairline">
                  <div className="text-[11px] uppercase font-bold text-ink-muted">Son Heartbeat Sinyali</div>
                  <div className="text-[14.5px] font-bold text-ink mt-1 tabular">
                    {timeAgo(data?.worker?.seen_at)}
                  </div>
                </div>

                <div className="bg-canvas p-3.5 rounded-[var(--radius-sm)] border border-hairline">
                  <div className="text-[11px] uppercase font-bold text-ink-muted">Veritabanı Havuzu</div>
                  <div className="text-[14.5px] font-bold text-ink mt-1 tabular">
                    {data?.worker?.db_pool_max ?? 2} bağlantı (Sağlıklı)
                  </div>
                </div>

                <div className="bg-canvas p-3.5 rounded-[var(--radius-sm)] border border-hairline">
                  <div className="text-[11px] uppercase font-bold text-ink-muted">Çalışma Modu</div>
                  <div className="text-[14.5px] font-bold text-accent mt-1">
                    Docker Solo Worker
                  </div>
                </div>
              </div>
            </div>

            {/* Hatlar Listesi */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-[13.5px] font-bold uppercase tracking-wider text-ink-soft">
                  Sistemdeki WhatsApp Hatları ({filteredAccounts.length})
                </h3>
                <button
                  onClick={handleReconnectAll}
                  disabled={actionBusy}
                  className="h-8 px-3 text-[12.5px] font-semibold bg-accent hover:bg-accent-dim text-accent-ink rounded-[var(--radius-sm)] shadow-sm transition"
                >
                  Tüm Hatları Bağla
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredAccounts.map((acc) => {
                  const isConnected = acc.status === 'connected'
                  return (
                    <div
                      key={acc.id}
                      className="rounded-[var(--radius-card)] border border-hairline bg-surface p-4 flex flex-col justify-between gap-3.5 shadow-[var(--shadow-card)]"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink text-[15px]">{acc.label}</span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                              isConnected
                                ? 'bg-ok-soft text-ok-dim border border-ok/40'
                                : 'bg-danger/10 text-danger border border-danger/30'
                            }`}
                          >
                            {isConnected ? 'BAĞLI' : acc.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="font-mono text-[13px] font-semibold text-ink-soft">
                          {acc.phone_e164 || 'Numara atanmamış'}
                        </div>

                        {acc.org_name && (
                          <div className="text-[12px] text-accent font-semibold">
                            İşletme: {acc.org_name}
                          </div>
                        )}

                        <div className="text-[12px] text-ink-faint tabular">
                          Son Görülme: {timeAgo(acc.last_seen_at)}
                        </div>

                        {acc.status_detail && (
                          <div className="text-[12px] text-ink-muted italic bg-canvas p-2 rounded-[var(--radius-sm)] border border-hairline">
                            {acc.status_detail}
                          </div>
                        )}
                      </div>

                      <div className="pt-2.5 border-t border-hairline flex justify-end">
                        <button
                          onClick={() => handleReconnectSingle(acc.id)}
                          disabled={actionBusy}
                          className="h-7 px-3 text-[12px] font-semibold bg-surface hover:bg-surface-raised text-ink border border-hairline-strong rounded-[var(--radius-sm)] transition"
                        >
                          Hattı Yeniden Bağla
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* SEKME 7: CANLI MESAJLAŞMA AKIŞI */}
        {activeTab === 'messages' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="inline-flex rounded-[var(--radius-sm)] border border-hairline bg-surface p-1 shadow-sm">
                <button
                  onClick={() => setMsgFilter('all')}
                  className={`rounded-[var(--radius-sm)] px-3 py-1 text-[12.5px] font-semibold transition ${
                    msgFilter === 'all'
                      ? 'bg-accent text-accent-ink shadow-sm'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  Tümü
                </button>
                <button
                  onClick={() => setMsgFilter('in')}
                  className={`rounded-[var(--radius-sm)] px-3 py-1 text-[12.5px] font-semibold transition ${
                    msgFilter === 'in'
                      ? 'bg-ok-dim text-white shadow-sm'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  Gelenler
                </button>
                <button
                  onClick={() => setMsgFilter('out')}
                  className={`rounded-[var(--radius-sm)] px-3 py-1 text-[12.5px] font-semibold transition ${
                    msgFilter === 'out'
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  Gidenler
                </button>
              </div>

              <span className="text-[12.5px] text-ink-muted tabular">
                Son {filteredMessages.length} mesaj akışı
              </span>
            </div>

            <div className="space-y-3">
              {filteredMessages.length === 0 ? (
                <div className="rounded-[var(--radius-card)] border border-hairline bg-surface p-12 text-center text-[13.5px] text-ink-muted">
                  Henüz mesaj kaydı bulunmuyor.
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const isIn = msg.direction === 'in'
                  return (
                    <div
                      key={msg.id}
                      className={`rounded-[var(--radius-card)] border p-4 shadow-sm transition ${
                        isIn
                          ? 'border-hairline bg-surface'
                          : 'border-accent/25 bg-accent-soft/30'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`rounded-[var(--radius-sm)] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider ${
                              isIn
                                ? 'bg-ok-soft text-ok-dim border border-ok/40'
                                : 'bg-accent-soft text-accent border border-accent/30'
                            }`}
                          >
                            {isIn ? 'GELEN MESAJ' : 'GİDEN MESAJ'}
                          </span>

                          {msg.org_name && (
                            <span className="rounded-[var(--radius-sm)] bg-canvas border border-hairline px-2 py-0.5 text-[11.5px] font-semibold text-ink-soft">
                              {msg.org_name}
                            </span>
                          )}

                          <span className="text-[13.5px] font-bold text-ink">
                            {msg.push_name ? `${msg.push_name} (${msg.phone_e164})` : msg.phone_e164 || 'Bilinmeyen'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[12px] text-ink-faint tabular">
                          <span>{formatClock(msg.created_at)}</span>
                          <span>•</span>
                          <span>{timeAgo(msg.created_at)}</span>
                        </div>
                      </div>

                      <div className="text-[13.5px] text-ink-soft bg-canvas rounded-[var(--radius-sm)] border border-hairline p-3 whitespace-pre-wrap leading-relaxed">
                        {msg.body || (
                          <span className="text-ink-faint italic">
                            [{msg.message_type || 'Medya içeriği'}]
                          </span>
                        )}
                      </div>

                      {msg.media_url && (
                        <div className="mt-2 text-[12.5px] font-bold text-accent">
                          <a
                            href={msg.media_url}
                            target="_blank"
                            rel="noreferrer"
                            className="underline hover:text-accent-dim"
                          >
                            Ekli Medyayı Görüntüle
                          </a>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* SEKME 8: İŞ KUYRUĞU */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <div className="text-[13px] text-ink-muted">
              Sistem arka plan işleri (Bağlantı, kampanya, kreatif render, mesaj gönderim kuyruğu):
            </div>

            <div className="rounded-[var(--radius-card)] border border-hairline bg-surface overflow-hidden shadow-[var(--shadow-card)]">
              {filteredJobs.length === 0 ? (
                <div className="p-12 text-center text-[13.5px] text-ink-muted">
                  Kuyrukta bekleyen iş yok.
                </div>
              ) : (
                <div className="divide-y divide-hairline">
                  {filteredJobs.map((j) => (
                    <div
                      key={j.id}
                      className="p-3.5 flex items-center justify-between text-[13px] hover:bg-surface-raised/60 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-ink-faint text-[12px]">#{j.id}</span>
                        <span className="font-bold text-ink">{j.type}</span>
                        {j.org_name && (
                          <span className="rounded bg-canvas border border-hairline px-2 py-0.5 text-[11.5px] font-medium text-ink-soft">
                            {j.org_name}
                          </span>
                        )}
                        {j.error && (
                          <span className="text-danger text-[12px] truncate max-w-xs">
                            Hata: {j.error}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 tabular text-ink-muted text-[12px] shrink-0">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                            j.status === 'done' || j.status === 'completed'
                              ? 'bg-ok-soft text-ok-dim border border-ok/40'
                              : j.status === 'failed'
                                ? 'bg-danger/10 text-danger border border-danger/30'
                                : 'bg-warn/15 text-warn border border-warn/30 animate-pulse'
                          }`}
                        >
                          {j.status}
                        </span>
                        <span>{timeAgo(j.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
