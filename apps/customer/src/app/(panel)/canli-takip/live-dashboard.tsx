'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type Account = {
  id: string
  label: string
  phone_e164: string | null
  status: string
  status_detail: string | null
  is_locked: boolean
  enabled: boolean
  last_seen_at: string | null
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

type MessageLog = {
  id: string
  direction: 'in' | 'out'
  phone_e164: string | null
  push_name: string | null
  message_type: string
  body: string | null
  media_url: string | null
  status: string
  created_at: string
}

type AiSuggestion = {
  id: string
  incoming_sample: string | null
  suggestions: Array<{ label: string; text: string }> | null
  source: string
  hit_count: number
  generated_count: number
  last_used_at: string
  created_at: string
}

type AutoReplyLog = {
  id: string
  phone_e164: string | null
  source: string
  reply_body: string
  created_at: string
}

type JobItem = {
  id: number
  type: string
  status: string
  error: string | null
  priority: number
  created_at: string
  started_at: string | null
}

type FeedData = {
  accounts: Account[]
  worker: WorkerHeartbeat | null
  summary: {
    todayInbound: number
    todayOutbound: number
    todayAiReplies: number
    pendingJobs: number
  }
  messages: MessageLog[]
  aiLibrary: AiSuggestion[]
  autoReplies: AutoReplyLog[]
  jobs: JobItem[]
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
  if (!dateString) return '--:--'
  return new Date(dateString).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function LiveDashboard() {
  const [data, setData] = useState<FeedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [activeTab, setActiveTab] = useState<'messages' | 'ai' | 'accounts' | 'jobs'>('messages')
  const [msgFilter, setMsgFilter] = useState<'all' | 'in' | 'out'>('all')
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/canli-takip/feed', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
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

  const accounts = data?.accounts ?? []
  const connectedAccountsCount = accounts.filter((a) => a.status === 'connected').length
  const totalAccountsCount = accounts.length

  const filteredMessages = (data?.messages ?? []).filter((m) => {
    if (msgFilter === 'in') return m.direction === 'in'
    if (msgFilter === 'out') return m.direction === 'out'
    return true
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6 space-y-5 font-sans">
      {/* ÜST BAŞLIK VE KONTROL ÇUBUĞU */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur">
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
            WhatsApp hatları, gelen/giden mesajlar, ChatGPT yanıtları ve sunucu durumunu anlık izleyin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
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
            Şimdi Yenile
          </button>

          <button
            onClick={handleReconnectAll}
            disabled={actionBusy}
            className="px-3.5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow transition disabled:opacity-50"
          >
            Hatları Yeniden Bağla
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="bg-indigo-950/80 border border-indigo-700/50 text-indigo-200 px-4 py-2.5 rounded-xl text-sm animate-fade-in">
          {actionNotice}
        </div>
      )}

      {error && (
        <div className="bg-rose-950/80 border border-rose-700/50 text-rose-200 px-4 py-2.5 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* KPI ÖZET KARTLARI */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Hatlar */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Aktif Hatlar</div>
          <div className="text-2xl font-extrabold text-emerald-400">
            {connectedAccountsCount} <span className="text-sm font-normal text-slate-500">/ {totalAccountsCount}</span>
          </div>
          <div className="text-[11px] text-slate-400">
            {connectedAccountsCount === totalAccountsCount ? 'Tüm hatlar bağlı' : 'Bazı hatlar çevrimdışı'}
          </div>
        </div>

        {/* Gelen Mesaj */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Bugün Gelen</div>
          <div className="text-2xl font-extrabold text-sky-400">
            {data?.summary.todayInbound ?? '--'}
          </div>
          <div className="text-[11px] text-slate-400">Müşterilerden gelen</div>
        </div>

        {/* Giden Mesaj */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Bugün Giden</div>
          <div className="text-2xl font-extrabold text-purple-400">
            {data?.summary.todayOutbound ?? '--'}
          </div>
          <div className="text-[11px] text-slate-400">Kampanya & yanıtlar</div>
        </div>

        {/* ChatGPT Yanıtları */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">AI Oto-Cevap</div>
          <div className="text-2xl font-extrabold text-amber-400">
            {data?.summary.todayAiReplies ?? '--'}
          </div>
          <div className="text-[11px] text-slate-400">Yapay zeka yanıtı</div>
        </div>

        {/* Bekleyen Kuyruk */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-1 col-span-2 sm:col-span-1">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Bekleyen İşler</div>
          <div className={`text-2xl font-extrabold ${Number(data?.summary.pendingJobs) > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
            {data?.summary.pendingJobs ?? '--'}
          </div>
          <div className="text-[11px] text-slate-400">Kuyrukta bekleyen</div>
        </div>
      </div>

      {/* SEKME BUTONLARI (MOBİL KAYDIRILABİLİR) */}
      <div className="flex border-b border-slate-800 space-x-1 sm:space-x-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('messages')}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-t-xl transition whitespace-nowrap ${
            activeTab === 'messages'
              ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500 border-x border-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Canlı Mesajlar ({data?.messages.length ?? 0})
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-t-xl transition whitespace-nowrap ${
            activeTab === 'ai'
              ? 'bg-slate-900 text-amber-400 border-t-2 border-amber-500 border-x border-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          ChatGPT & AI Sorguları ({data?.aiLibrary.length ?? 0})
        </button>

        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-t-xl transition whitespace-nowrap ${
            activeTab === 'accounts'
              ? 'bg-slate-900 text-indigo-400 border-t-2 border-indigo-500 border-x border-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Hatlar & Servis Durumu ({accounts.length})
        </button>

        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-t-xl transition whitespace-nowrap ${
            activeTab === 'jobs'
              ? 'bg-slate-900 text-sky-400 border-t-2 border-sky-500 border-x border-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          İş Kuyruğu ({data?.jobs.length ?? 0})
        </button>
      </div>

      {/* SEKME 1: CANLI MESAJLAR */}
      {activeTab === 'messages' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setMsgFilter('all')}
                className={`px-3 py-1 rounded-md transition ${msgFilter === 'all' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400'}`}
              >
                Tümü
              </button>
              <button
                onClick={() => setMsgFilter('in')}
                className={`px-3 py-1 rounded-md transition ${msgFilter === 'in' ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-slate-400'}`}
              >
                Gelenler
              </button>
              <button
                onClick={() => setMsgFilter('out')}
                className={`px-3 py-1 rounded-md transition ${msgFilter === 'out' ? 'bg-purple-500/20 text-purple-300 font-semibold' : 'text-slate-400'}`}
              >
                Gidenler
              </button>
            </div>
            <span className="text-xs text-slate-400">Son 30 mesaj listeleniyor</span>
          </div>

          <div className="grid gap-2">
            {filteredMessages.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm bg-slate-900/50 rounded-xl border border-slate-800">
                Henüz mesaj kaydı bulunmuyor.
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isIn = msg.direction === 'in'
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition gap-2 ${
                      isIn
                        ? 'bg-slate-900/90 border-emerald-500/20 hover:border-emerald-500/40'
                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mt-0.5 ${
                          isIn
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        }`}
                      >
                        {isIn ? 'Gelen' : 'Giden'}
                      </span>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-slate-200">
                            {msg.push_name || msg.phone_e164 || 'Numara yok'}
                          </span>
                          {msg.push_name && msg.phone_e164 && (
                            <span className="text-xs text-slate-400">({msg.phone_e164})</span>
                          )}
                          {msg.message_type !== 'text' && (
                            <span className="text-[10px] bg-slate-800 text-amber-300 px-1.5 py-0.2 rounded">
                              {msg.message_type}
                            </span>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm text-slate-300 line-clamp-2">
                          {msg.body || (msg.media_url ? '[Görsel / Medya Dosyası]' : '(Metin yok)')}
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center text-xs text-slate-400 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800/50">
                      <span className="text-slate-300 font-mono text-[11px]">{formatClock(msg.created_at)}</span>
                      <span className="text-[10px] capitalize text-slate-400">{msg.status}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* SEKME 2: CHATGPT & AI SORGULARI */}
      {activeTab === 'ai' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-amber-300">
              Yapay Zekanın Ürettiği ve Öğrendiği Yanıtlar
            </h2>
            <span className="text-xs text-slate-400">Son sorgular ve kütüphane</span>
          </div>

          <div className="grid gap-3">
            {data?.aiLibrary.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm bg-slate-900/50 rounded-xl border border-slate-800">
                Henüz AI yanıt kaydı bulunmuyor.
              </div>
            ) : (
              data?.aiLibrary.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-400">Gelen Müşteri Sorusu:</span>
                      <span className="text-amber-200 font-medium">"{item.incoming_sample}"</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                      <span>{item.hit_count} kez kullanıldı</span>
                      <span>•</span>
                      <span>{timeAgo(item.last_used_at)}</span>
                    </div>
                  </div>

                  {/* Önerilen Cevaplar */}
                  <div className="grid sm:grid-cols-3 gap-2 pt-1">
                    {(item.suggestions ?? []).map((sugg, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 space-y-1 text-xs"
                      >
                        <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                          {sugg.label || `Varyasyon ${idx + 1}`}
                        </div>
                        <p className="text-slate-300 line-clamp-3 leading-relaxed">{sugg.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SEKME 3: HATLAR & SERVİS DURUMU */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          {/* Worker Bilgisi */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Hetzner VPS Worker Durumu
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400">Worker Adı:</span>{' '}
                <span className="font-mono text-white font-semibold">
                  {data?.worker?.worker_id || 'hetzner-1'}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Çalışma Süresi (Uptime):</span>{' '}
                <span className="text-white font-semibold">
                  {data?.worker?.meta?.uptimeSeconds
                    ? `${Math.round(data.worker.meta.uptimeSeconds / 60)} dk`
                    : 'Aktif'}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Canlı Oturumlar:</span>{' '}
                <span className="text-emerald-400 font-semibold">
                  {data?.worker?.live ?? connectedAccountsCount} / {data?.worker?.max_sessions || 15}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Son Heartbeat:</span>{' '}
                <span className="text-white font-semibold">{timeAgo(data?.worker?.seen_at)}</span>
              </div>
            </div>
          </div>

          {/* Hat Kartları */}
          <div className="grid sm:grid-cols-2 gap-3">
            {accounts.map((acc) => {
              const isConn = acc.status === 'connected'
              return (
                <div
                  key={acc.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base text-white">{acc.label}</h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isConn
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {isConn ? 'Bağlı' : acc.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 font-mono">
                      {acc.phone_e164 || 'Telefon numarası henüz atanmadı'}
                    </div>

                    {acc.status_detail && (
                      <div className="text-[11px] text-slate-400">{acc.status_detail}</div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                    <span className="text-slate-400 text-[11px]">Son: {timeAgo(acc.last_seen_at)}</span>

                    <button
                      onClick={() => handleReconnectSingle(acc.id)}
                      disabled={actionBusy}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition"
                    >
                      Yeniden Bağla
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* SEKME 4: İŞ KUYRUĞU */}
      {activeTab === 'jobs' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">Arka Plan İş Kuyruğu (Son İşler)</h2>
            <span className="text-xs text-slate-400">Otomatik yenilenir</span>
          </div>

          <div className="grid gap-2">
            {data?.jobs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm bg-slate-900/50 rounded-xl border border-slate-800">
                Kuyrukta bekleyen iş bulunmuyor.
              </div>
            ) : (
              data?.jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-200">{job.type}</span>
                      <span className="text-[10px] text-slate-500">#{job.id}</span>
                    </div>
                    {job.error && <p className="text-[11px] text-rose-400">{job.error}</p>}
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        job.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : job.status === 'failed'
                            ? 'bg-rose-500/10 text-rose-400'
                            : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {job.status}
                    </span>
                    <span className="text-[10px] text-slate-500">{formatClock(job.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
