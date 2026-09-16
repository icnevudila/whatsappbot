'use client'

import { useState, useEffect, useCallback } from 'react'

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
  org_name?: string
}

type FeedData = {
  accounts: Account[]
  worker: WorkerHeartbeat | null
  campaigns: CampaignItem[]
  targets: TargetItem[]
  creatives: CreativeItem[]
  messages: MessageLog[]
  jobs: JobItem[]
  summary: {
    todayInbound: number
    todayOutbound: number
    queuedMessages: number
    pendingJobs: number
    activeCampaigns: number
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
  const [activeTab, setActiveTab] = useState<'campaigns' | 'queue' | 'ai_creatives' | 'baileys' | 'messages' | 'jobs'>('campaigns')
  const [queueFilter, setQueueFilter] = useState<'all' | 'queued' | 'delivered' | 'failed'>('all')
  const [msgFilter, setMsgFilter] = useState<'all' | 'in' | 'out'>('all')
  const [selectedOrg, setSelectedOrg] = useState<string>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

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
    const interval = setInterval(fetchData, 8000)
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
        setActionNotice('Baileys servisi yeniden başlatılıyor. 4-6 saniye içinde hatlar tekrar bağlanacak...')
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

  // Filtreler
  const accounts = data?.accounts ?? []
  const orgNames = Array.from(
    new Set(
      [
        ...accounts.map((a) => a.org_name),
        ...(data?.campaigns ?? []).map((c) => c.org_name),
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

  const queuedTargetsCount = (data?.targets ?? []).filter((t) => t.status === 'queued').length

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-3 sm:p-6 space-y-5 font-sans">
      {/* ÜST BAŞLIK VE KONTROL MERKEZİ */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-2xl backdrop-blur">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Canlı Operasyon & Bot Takip Merkezi
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Kampanya gönderimleri, bekleyen mesajlar, ChatGPT görsel üretim sırası ve Baileys servis durumu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {orgNames.length > 1 && (
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
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
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
              autoRefresh
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {autoRefresh ? 'Canlı Akış: Açık (8s)' : 'Canlı Akış: Duraklatıldı'}
          </button>

          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 transition"
          >
            Yenile
          </button>

          <button
            onClick={handleRestartService}
            disabled={actionBusy}
            title="Hetzner VPS üzerindeki Baileys WhatsApp konteynerini tamamen baştan başlatır"
            className="px-3 py-1.5 text-xs font-bold bg-amber-600/90 hover:bg-amber-500 text-white rounded-lg shadow transition disabled:opacity-50 flex items-center gap-1.5"
          >
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Baileys Restart</span>
          </button>

          <button
            onClick={handleReconnectAll}
            disabled={actionBusy}
            className="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow transition disabled:opacity-50"
          >
            Hatları Yeniden Bağla
          </button>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            title="Paneli kilitle ve güvenli çıkış yap"
            className="px-2.5 py-1.5 text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 rounded-lg transition"
          >
            {loggingOut ? 'Kilitleniyor...' : 'Kilitle'}
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="bg-indigo-950/80 border border-indigo-700/50 text-indigo-200 px-4 py-2.5 rounded-xl text-sm animate-fade-in flex items-center justify-between">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-xs text-indigo-300 underline">Kapat</button>
        </div>
      )}

      {error && (
        <div className="bg-rose-950/80 border border-rose-700/50 text-rose-200 px-4 py-2.5 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* KPI ÖZET KARTLARI */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3">
        {/* Hatlar */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Aktif Hatlar</div>
          <div className="text-2xl font-extrabold text-emerald-400">
            {connectedAccountsCount} <span className="text-sm font-normal text-slate-500">/ {totalAccountsCount}</span>
          </div>
          <div className="text-[11px] text-slate-400">
            {connectedAccountsCount === totalAccountsCount ? 'Tüm hatlar canlı' : 'Bazı hatlar çevrimdışı'}
          </div>
        </div>

        {/* Aktif Kampanyalar */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Aktif Kampanyalar</div>
          <div className="text-2xl font-extrabold text-sky-400">
            {data?.summary.activeCampaigns ?? 0}
          </div>
          <div className="text-[11px] text-slate-400">Şu an gönderimde olan</div>
        </div>

        {/* Sırada Bekleyen Mesajlar */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Sırada Bekleyen</div>
          <div className="text-2xl font-extrabold text-amber-400">
            {data?.summary.queuedMessages ?? 0}
          </div>
          <div className="text-[11px] text-slate-400">Kuyrukta gönderim bekleyen</div>
        </div>

        {/* Bugün Giden Mesaj */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Bugün Giden</div>
          <div className="text-2xl font-extrabold text-purple-400">
            {data?.summary.todayOutbound ?? '--'}
          </div>
          <div className="text-[11px] text-slate-400">Kampanya & yanıtlar</div>
        </div>

        {/* Baileys Container / VPS */}
        <div className="col-span-2 sm:col-span-1 bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Baileys Servisi</div>
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                data?.worker ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]' : 'bg-rose-500'
              }`}
            />
            <span className="text-base font-bold text-white">
              {data?.worker?.worker_id ? data.worker.worker_id : 'Hetzner VPS'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            {data?.worker?.seen_at ? `Sinyal: ${timeAgo(data.worker.seen_at)}` : 'Servis çalışıyor'}
          </div>
        </div>
      </div>

      {/* SEKMELER */}
      <div className="flex flex-wrap border-b border-slate-800 gap-1 sm:gap-2">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'campaigns'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Kampanya Gönderimleri</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
            {filteredCampaigns.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'queue'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Sırada & Bekleyen Mesajlar</span>
          {queuedTargetsCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold animate-pulse">
              {queuedTargetsCount} bekliyor
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('ai_creatives')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'ai_creatives'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>ChatGPT Görsel & İçerik Üretim Sırası</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
            {filteredCreatives.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('baileys')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'baileys'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Baileys Servisi & Hatlar ({filteredAccounts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('messages')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'messages'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Canlı Sohbet Akışı</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
            {filteredMessages.length}
          </span>
        </button>
      </div>

      {/* SEKME 1: KAMPANYA GÖNDERİMLERİ (GÖNDERİLENLER & BEKLEYENLER) */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="text-xs text-slate-400">
            Tüm kampanyaların anlık gönderim ilerlemesi, bekleyen ve iletilen mesaj sayıları:
          </div>

          <div className="space-y-3">
            {filteredCampaigns.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-500 text-sm">
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
                    className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 hover:border-slate-700 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                            isRunning
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                              : isCompleted
                                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                : isPaused
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {isRunning ? 'GÖNDERİLİYOR' : isCompleted ? 'TAMAMLANDI' : isPaused ? 'DURAKLATILDI' : camp.status.toUpperCase()}
                        </span>

                        {camp.org_name && (
                          <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                            {camp.org_name}
                          </span>
                        )}

                        <span className="text-base font-bold text-white">{camp.name}</span>
                      </div>

                      <div className="text-xs text-slate-400 font-mono">
                        Oluşturulma: {timeAgo(camp.created_at)}
                      </div>
                    </div>

                    {/* İlerleme Çubuğu */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-400">İlerleme: %{camp.progress_percent}</span>
                        <span className="text-slate-300">
                          {camp.sent_count + camp.failed_count + camp.skipped_count} / {camp.total_targets} Hedef
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isCompleted ? 'bg-indigo-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${camp.progress_percent}%` }}
                        />
                      </div>
                    </div>

                    {/* İstatistik Rozetleri */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-xl text-center">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Toplam Hedef</div>
                        <div className="text-lg font-bold text-white">{camp.total_targets}</div>
                      </div>

                      <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-xl text-center">
                        <div className="text-[10px] text-emerald-400 uppercase font-semibold">Başarıyla Gönderilen</div>
                        <div className="text-lg font-bold text-emerald-400">{camp.sent_count}</div>
                      </div>

                      <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-xl text-center">
                        <div className="text-[10px] text-amber-400 uppercase font-semibold">Sırada / Bekleyen</div>
                        <div className="text-lg font-bold text-amber-400">{camp.pending_count}</div>
                      </div>

                      <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-xl text-center">
                        <div className="text-[10px] text-rose-400 uppercase font-semibold">Hatalı / Başarısız</div>
                        <div className="text-lg font-bold text-rose-400">{camp.failed_count}</div>
                      </div>
                    </div>

                    {/* Mesaj İçeriği */}
                    {camp.body && (
                      <div className="text-xs text-slate-300 bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl whitespace-pre-wrap">
                        <span className="font-semibold text-slate-400 block mb-1">Kampanya Mesaj Metni:</span>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setQueueFilter('all')}
                className={`px-3 py-1 text-xs rounded-lg transition ${
                  queueFilter === 'all' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tümü
              </button>
              <button
                onClick={() => setQueueFilter('queued')}
                className={`px-3 py-1 text-xs rounded-lg transition ${
                  queueFilter === 'queued' ? 'bg-amber-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sırada Bekleyenler ({queuedTargetsCount})
              </button>
              <button
                onClick={() => setQueueFilter('delivered')}
                className={`px-3 py-1 text-xs rounded-lg transition ${
                  queueFilter === 'delivered' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                İletilenler
              </button>
              <button
                onClick={() => setQueueFilter('failed')}
                className={`px-3 py-1 text-xs rounded-lg transition ${
                  queueFilter === 'failed' ? 'bg-rose-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Hatalılar
              </button>
            </div>

            <span className="text-xs text-slate-500 font-mono">
              Son {filteredTargets.length} hedef mesaj gösteriliyor
            </span>
          </div>

          <div className="space-y-2">
            {filteredTargets.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-500 text-sm">
                Seçilen filtrede bekleyen veya iletilen mesaj bulunmuyor.
              </div>
            ) : (
              filteredTargets.map((target) => {
                const isQueued = target.status === 'queued'
                const isDelivered = target.status === 'delivered' || target.status === 'read' || target.status === 'sent'
                const isFailed = target.status === 'failed'

                return (
                  <div
                    key={target.id}
                    className={`border rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                      isQueued
                        ? 'bg-amber-950/20 border-amber-900/40'
                        : isDelivered
                          ? 'bg-slate-900/80 border-slate-800'
                          : 'bg-rose-950/20 border-rose-900/40'
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            isQueued
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                              : isDelivered
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {isQueued ? 'SIRADA BEKLİYOR' : isDelivered ? 'İLETİLDİ' : isFailed ? 'HATA' : target.status.toUpperCase()}
                        </span>

                        {target.org_name && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {target.org_name}
                          </span>
                        )}

                        <span className="text-xs font-semibold text-white font-mono">
                          {target.phone_e164}
                        </span>

                        <span className="text-xs text-indigo-300 font-medium truncate max-w-xs">
                          {target.campaign_name}
                        </span>
                      </div>

                      {target.personalized_body && (
                        <div className="text-xs text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 line-clamp-2">
                          {target.personalized_body}
                        </div>
                      )}

                      {target.error && (
                        <div className="text-xs text-rose-400 italic">
                          Hata: {target.error}
                        </div>
                      )}
                    </div>

                    <div className="flex sm:flex-col items-start sm:items-end justify-between text-xs text-slate-400 font-mono shrink-0">
                      <span>{target.sent_at ? `Gönderildi: ${timeAgo(target.sent_at)}` : `Oluşturuldu: ${timeAgo(target.created_at)}`}</span>
                      {target.sent_at && <span className="text-[11px] text-slate-500">{formatClock(target.sent_at)}</span>}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* SEKME 3: CHATGPT GÖRSEL & MESAJ ÜRETİM SIRASI */}
      {activeTab === 'ai_creatives' && (
        <div className="space-y-4">
          <div className="text-xs text-slate-400">
            ChatGPT ve AI görsel üretim motorunun iş sırası, oluşturulan kampanya görselleri ve durumları:
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCreatives.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-500 text-sm">
                Henüz görsel üretim kaydı bulunmuyor.
              </div>
            ) : (
              filteredCreatives.map((cr) => {
                const isReady = cr.status === 'ready'
                const isGenerating = cr.status === 'generating' || cr.status === 'pending'
                const isFailed = cr.status === 'failed'

                return (
                  <div
                    key={cr.id}
                    className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-slate-700 transition shadow-lg"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            isReady
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isGenerating
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {isReady ? 'HAZIRLANDI' : isGenerating ? 'ÜRETİLİYOR / SIRADA' : 'HATA'}
                        </span>

                        {cr.org_name && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {cr.org_name}
                          </span>
                        )}
                      </div>

                      <div className="text-sm font-semibold text-white line-clamp-3">
                        &quot;{cr.title}&quot;
                      </div>

                      {/* Görsel Önizleme */}
                      {cr.public_url ? (
                        <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={cr.public_url}
                            alt={cr.title}
                            className="w-full h-full object-cover hover:scale-105 transition duration-300"
                          />
                        </div>
                      ) : (
                        <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-6 flex flex-col items-center justify-center text-center text-xs text-slate-500 aspect-video">
                          {isGenerating ? (
                            <>
                              <svg className="animate-spin size-6 text-amber-400 mb-2" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                              </svg>
                              <span>ChatGPT görseli oluşturuyor...</span>
                            </>
                          ) : (
                            <span>Görsel URL mevcut değil</span>
                          )}
                        </div>
                      )}

                      {cr.error && (
                        <div className="text-xs text-rose-400 italic bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/40">
                          Hata: {cr.error}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <span>{timeAgo(cr.created_at)}</span>
                      {cr.public_url && (
                        <a
                          href={cr.public_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 underline font-medium"
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

      {/* SEKME 4: BAILEYS SERVİSİ & HATLAR */}
      {activeTab === 'baileys' && (
        <div className="space-y-5">
          {/* Worker / Hetzner Container Durum Kartı */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Hetzner VPS Baileys Konteyneri ({data?.worker?.worker_id || 'hetzner-1'})
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  WhatsApp çoklu cihaz WebSocket istemcisi Hetzner VPS üzerinde 7/24 çalışmaktadır.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRestartService}
                  disabled={actionBusy}
                  className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-lg transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Baileys Servisini Yeniden Başlat</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] uppercase font-semibold text-slate-400">Canlı Hat Oturumu</div>
                <div className="text-xl font-bold text-emerald-400">
                  {data?.worker?.live ?? connectedAccountsCount} <span className="text-xs text-slate-500 font-normal">/ {data?.worker?.max_sessions ?? 15} Kapasite</span>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] uppercase font-semibold text-slate-400">Son Sinyal (Heartbeat)</div>
                <div className="text-sm font-bold text-white mt-1">
                  {timeAgo(data?.worker?.seen_at)}
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] uppercase font-semibold text-slate-400">Veritabanı Havuzu</div>
                <div className="text-sm font-bold text-white mt-1">
                  {data?.worker?.db_pool_max ?? 2} bağlantı (Sağlıklı)
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] uppercase font-semibold text-slate-400">Çalışma Modu</div>
                <div className="text-sm font-bold text-emerald-400 mt-1">
                  Docker Solo Worker
                </div>
              </div>
            </div>
          </div>

          {/* Bağlı Hatlar Listesi */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                Sistemdeki Tüm WhatsApp Hatları ({filteredAccounts.length})
              </h3>
              <button
                onClick={handleReconnectAll}
                disabled={actionBusy}
                className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
              >
                Tüm Hatları Bağla
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredAccounts.map((acc) => {
                const isConnected = acc.status === 'connected'
                return (
                  <div
                    key={acc.id}
                    className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3 shadow"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-base">{acc.label}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isConnected
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {isConnected ? 'BAĞLI' : acc.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="text-xs font-mono text-slate-300">
                        {acc.phone_e164 || 'Numara henüz atanmamış'}
                      </div>

                      {acc.org_name && (
                        <div className="text-[11px] text-indigo-300 font-medium">
                          İşletme: {acc.org_name}
                        </div>
                      )}

                      <div className="text-[11px] text-slate-400">
                        Son Görülme: {timeAgo(acc.last_seen_at)}
                      </div>

                      {acc.status_detail && (
                        <div className="text-[11px] text-slate-500 italic bg-slate-950 p-2 rounded">
                          {acc.status_detail}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex justify-end">
                      <button
                        onClick={() => handleReconnectSingle(acc.id)}
                        disabled={actionBusy}
                        className="px-3 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
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

      {/* SEKME 5: CANLI SOHBET AKIŞI */}
      {activeTab === 'messages' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setMsgFilter('all')}
                className={`px-3 py-1 text-xs rounded-lg transition ${
                  msgFilter === 'all' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tümü
              </button>
              <button
                onClick={() => setMsgFilter('in')}
                className={`px-3 py-1 text-xs rounded-lg transition ${
                  msgFilter === 'in' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Gelenler
              </button>
              <button
                onClick={() => setMsgFilter('out')}
                className={`px-3 py-1 text-xs rounded-lg transition ${
                  msgFilter === 'out' ? 'bg-purple-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Gidenler
              </button>
            </div>

            <span className="text-xs text-slate-500 font-mono">
              Son {filteredMessages.length} mesaj listeleniyor
            </span>
          </div>

          <div className="space-y-2.5">
            {filteredMessages.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-500 text-sm">
                Henüz mesaj kaydı bulunmuyor.
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isIn = msg.direction === 'in'
                return (
                  <div
                    key={msg.id}
                    className={`border rounded-xl p-3 sm:p-4 transition ${
                      isIn
                        ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                        : 'bg-indigo-950/20 border-indigo-900/40 hover:border-indigo-800/60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            isIn ? 'bg-sky-500/20 text-sky-400' : 'bg-purple-500/20 text-purple-400'
                          }`}
                        >
                          {isIn ? 'GELEN MESAJ' : 'GİDEN MESAJ'}
                        </span>
                        {msg.org_name && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                            {msg.org_name}
                          </span>
                        )}
                        <span className="text-sm font-semibold text-white">
                          {msg.push_name ? `${msg.push_name} (${msg.phone_e164})` : msg.phone_e164 || 'Bilinmeyen'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono">{formatClock(msg.created_at)}</span>
                        <span className="text-slate-600">|</span>
                        <span>{timeAgo(msg.created_at)}</span>
                      </div>
                    </div>

                    <div className="text-sm text-slate-200 bg-slate-950/60 border border-slate-800/60 rounded-lg p-2.5 whitespace-pre-wrap font-sans">
                      {msg.body || (
                        <span className="text-slate-500 italic">
                          [{msg.message_type || 'Medya içeriği'}]
                        </span>
                      )}
                    </div>

                    {msg.media_url && (
                      <div className="mt-2 text-xs text-indigo-400">
                        <a
                          href={msg.media_url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline hover:text-indigo-300"
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
    </div>
  )
}
