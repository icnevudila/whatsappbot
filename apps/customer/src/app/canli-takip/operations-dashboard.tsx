'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  ControlPlaneSnapshot,
  OperationsAccount,
  OperationsAlert,
  OperationsEvent,
  OperationsJob,
  OperationsSection,
  OperationsWorker,
} from '@/lib/control-plane/types'

type ApiSnapshot = ControlPlaneSnapshot & { success: true }

const stateTone: Record<string, string> = {
  COMPLETED: 'bg-success-soft text-success', RUNNING: 'bg-accent-soft text-accent-dim',
  ACTIVE: 'bg-accent-soft text-accent-dim', IDLE: 'bg-surface-raised text-ink-muted',
  QUEUED: 'bg-warn/10 text-warn', FAILED: 'bg-danger/10 text-danger',
  NEEDS_REVIEW: 'bg-warn/10 text-warn', OFFLINE: 'bg-danger/10 text-danger',
  AUTH_REQUIRED: 'bg-danger/10 text-danger', QUOTA_EXHAUSTED: 'bg-warn/10 text-warn',
  HEALTHY: 'bg-success-soft text-success', DEGRADED: 'bg-warn/10 text-warn',
  CANCELLED: 'bg-surface-raised text-ink-muted', STOPPED: 'bg-danger/10 text-danger',
}

function timeAgo(value: string | null | undefined) {
  if (!value) return '—'
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return `${seconds} sn önce`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} dk önce`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} sa önce`
  return `${Math.floor(seconds / 86400)} gün önce`
}

function duration(value: number | null) {
  if (value == null) return '—'
  if (value < 1000) return `${value} ms`
  if (value < 60_000) return `${(value / 1000).toFixed(1)} sn`
  return `${Math.floor(value / 60_000)} dk ${Math.round((value % 60_000) / 1000)} sn`
}

function StatusBadge({ value }: { value: string }) {
  return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black tracking-wide ${stateTone[value] || 'bg-surface-raised text-ink-muted'}`}>{value}</span>
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-hairline-strong)] bg-surface p-8 text-center text-sm text-ink-muted">{text}</div>
}

function SectionHeader({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return (
    <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">{eyebrow}</div>
        <h1 className="mt-1 text-2xl font-black tracking-[-0.035em] text-balance sm:text-3xl">{title}</h1>
      </div>
      <p className="max-w-xl text-xs leading-relaxed text-ink-muted text-pretty">{detail}</p>
    </div>
  )
}

function EventFeed({ events }: { events: OperationsEvent[] }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-surface shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between border-b border-[var(--color-hairline)] px-4 py-3">
        <div>
          <h2 className="text-sm font-black">Canlı olay akışı</h2>
          <p className="mt-0.5 text-[11px] text-ink-muted">Servislerden normalize edilen son operasyon adımları</p>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-success"><span className="h-2 w-2 animate-pulse rounded-full bg-ok" /> CANLI</span>
      </div>
      <div className="max-h-[430px] divide-y divide-[var(--color-hairline)] overflow-y-auto">
        {events.slice(0, 35).map(event => (
          <div key={event.id} className="grid grid-cols-[74px_1fr] gap-3 px-4 py-3 text-xs sm:grid-cols-[82px_150px_1fr_auto]">
            <span className="font-mono text-[10px] text-ink-faint">{new Date(event.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            <span className="truncate font-black text-ink-soft">{event.eventType}</span>
            <span className="col-start-2 truncate text-ink-muted sm:col-start-auto">{event.message}</span>
            <span className="col-start-2 text-[10px] font-semibold text-ink-faint sm:col-start-auto">{event.provider || event.workerId || event.organization || 'Sistem'}</span>
          </div>
        ))}
        {events.length === 0 && <div className="p-8 text-center text-sm text-ink-muted">Henüz operasyon olayı yok.</div>}
      </div>
    </section>
  )
}

function AlertsPanel({ alerts, compact = false }: { alerts: OperationsAlert[]; compact?: boolean }) {
  const rows = compact ? alerts.slice(0, 6) : alerts
  return (
    <div className="space-y-2">
      {rows.map(alert => (
        <div key={alert.id} className={`rounded-[var(--radius-card)] border p-3.5 ${alert.severity === 'critical' ? 'border-danger/25 bg-danger/5' : alert.severity === 'warning' ? 'border-warn/25 bg-warn/5' : 'border-[var(--color-hairline)] bg-surface'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><StatusBadge value={alert.code} />{alert.requiresManualAction && <span className="text-[10px] font-black uppercase text-danger">Operatör gerekli</span>}</div>
              <div className="mt-2 text-sm font-black">{alert.title}</div>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">{alert.detail}</p>
            </div>
            <time className="shrink-0 text-[10px] text-ink-faint">{timeAgo(alert.createdAt)}</time>
          </div>
        </div>
      ))}
      {rows.length === 0 && <Empty text="Operatör müdahalesi gerektiren uyarı yok." />}
    </div>
  )
}

function JobCards({ jobs, onSelect, onAction, busy }: { jobs: OperationsJob[]; onSelect: (job: OperationsJob) => void; onAction: (action: string, id: string) => void; busy: string | null }) {
  return (
    <div className="grid gap-2.5 lg:grid-cols-2">
      {jobs.map(job => (
        <article key={job.id} className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-surface p-4 shadow-[var(--shadow-card)]">
          <button type="button" onClick={() => onSelect(job)} className="w-full text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-accent">{job.jobType} · {job.organization}</div><h3 className="mt-1 truncate text-sm font-black">{job.summary || job.type}</h3></div>
              <StatusBadge value={job.state} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] sm:grid-cols-4">
              <div><span className="block text-ink-faint">Aşama</span><strong>{job.currentPhase}</strong></div>
              <div><span className="block text-ink-faint">Worker</span><strong>{job.workerId || 'Atanmadı'}</strong></div>
              <div><span className="block text-ink-faint">Provider</span><strong>{job.provider || '—'}</strong></div>
              <div><span className="block text-ink-faint">Geçen süre</span><strong>{duration(job.durationMs)}</strong></div>
            </div>
            {job.errorMessage && <p className="mt-3 rounded-[var(--radius-sm)] bg-danger/5 px-2.5 py-2 text-[11px] text-danger">{job.errorMessage}</p>}
          </button>
          {job.eligibleActions.length > 0 && <div className="mt-3 flex gap-2 border-t border-[var(--color-hairline)] pt-3">
            {job.eligibleActions.map(action => <button key={action} disabled={busy === job.id} onClick={() => onAction(action === 'retry' ? 'retry_job' : 'cancel_queued_job', job.id)} className={`min-h-9 rounded-[var(--radius-sm)] px-3 text-[11px] font-black disabled:opacity-50 ${action === 'retry' ? 'bg-accent text-white' : 'border border-danger/25 text-danger'}`}>{action === 'retry' ? 'Güvenli retry' : 'Kuyruktan iptal'}</button>)}
          </div>}
        </article>
      ))}
      {jobs.length === 0 && <Empty text="Bu filtrede iş bulunamadı." />}
    </div>
  )
}

function JobDrawer({ job, onClose }: { job: OperationsJob; onClose: () => void }) {
  const timeline = job.timeline.length ? job.timeline : [{ id: 'created', eventType: 'JOB_RECEIVED', message: job.summary, createdAt: job.createdAt, phase: 'Alındı' } as OperationsEvent]
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30" role="dialog" aria-modal="true" aria-label="İş ayrıntısı">
      <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Kapat" />
      <aside className="relative h-full w-full max-w-xl overflow-y-auto border-l border-[var(--color-hairline)] bg-canvas p-4 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-accent">{job.id}</div><h2 className="mt-1 text-xl font-black">{job.summary}</h2></div>
          <button onClick={onClose} className="h-10 w-10 rounded-full border border-[var(--color-hairline)] bg-surface text-xl" aria-label="İş ayrıntısını kapat">×</button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-surface p-3 text-xs">
          {[
            ['Durum', job.state], ['Aşama', job.currentPhase], ['Bot', job.botId || '—'], ['Worker', job.workerId || '—'],
            ['Provider', job.provider || '—'], ['Hesap', job.accountId || '—'], ['Deneme', `${job.attemptCount}/${job.maxAttempts}`], ['Süre', duration(job.durationMs)],
          ].map(([label, value]) => <div key={label} className="rounded-[var(--radius-sm)] bg-canvas p-2"><span className="block text-[10px] text-ink-faint">{label}</span><strong className="break-all">{value}</strong></div>)}
        </div>
        <h3 className="mt-6 text-sm font-black">İş zaman çizelgesi</h3>
        <div className="mt-3 space-y-0">
          {timeline.map((event, index) => (
            <div key={event.id} className="grid grid-cols-[22px_1fr] gap-3">
              <div className="flex flex-col items-center"><span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${event.errorCode ? 'bg-danger' : 'bg-accent'}`} />{index < timeline.length - 1 && <span className="min-h-12 w-px flex-1 bg-[var(--color-hairline-strong)]" />}</div>
              <div className="pb-5"><div className="flex items-center justify-between gap-2"><strong className="text-xs">{event.phase || event.eventType}</strong><time className="text-[10px] text-ink-faint">{new Date(event.createdAt).toLocaleString('tr-TR')}</time></div><p className="mt-1 text-[11px] text-ink-muted">{event.message}</p></div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}

export function OperationsDashboard({ section }: { section: OperationsSection }) {
  const [data, setData] = useState<ApiSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<OperationsJob | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [jobFilter, setJobFilter] = useState<'ALL' | OperationsJob['state']>('ALL')

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const response = await fetch('/api/canli-takip/control-plane', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Veri alınamadı')
      setData(payload)
      setError(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Operasyon merkezi yenilenemedi')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const poll = setInterval(() => refresh(true), 15_000)
    const stream = new EventSource('/api/canli-takip/control-plane/events')
    stream.addEventListener('operations', event => {
      const payload = JSON.parse((event as MessageEvent).data)
      setData(current => current ? { ...current, overview: payload.overview, events: [...payload.events, ...current.events].filter((item, index, all) => all.findIndex(candidate => candidate.id === item.id) === index).slice(0, 300), generatedAt: payload.generatedAt } : current)
    })
    return () => { clearInterval(poll); stream.close() }
  }, [refresh])

  const runAction = async (action: string, targetId: string) => {
    setBusy(targetId); setNotice(null)
    try {
      const response = await fetch('/api/canli-takip/control-plane/actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, targetId }) })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'İşlem reddedildi')
      setNotice(result.message || 'İşlem kaydedildi')
      await refresh(true)
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'İşlem başarısız')
    } finally { setBusy(null) }
  }

  const filteredJobs = useMemo(() => data?.jobs.filter(job => jobFilter === 'ALL' || job.state === jobFilter) || [], [data?.jobs, jobFilter])

  if (loading && !data) return <div className="grid min-h-[55vh] place-items-center"><div className="text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /><p className="mt-3 text-sm font-bold text-ink-muted">Operasyon resmi hazırlanıyor…</p></div></div>
  if (!data) return <Empty text={error || 'Operasyon verisi bulunamadı.'} />

  const titles: Record<OperationsSection, [string, string, string]> = {
    overview: ['Kontrol merkezi', 'Sistemde şu an ne oluyor?', 'Önce müdahale gerektiren durumları, sonra canlı işi ve kapasiteyi gösterir.'],
    jobs: ['Ortak iş projeksiyonu', 'Tüm işler, tek operasyon dili', 'Kaynak servislerin iç şemaları korunur; burada ortak kimlik, durum ve zaman çizelgesi görünür.'],
    messages: ['Canlı müşteri akışı', 'Gelen mesajdan yanıta kadar', 'Mesaj önizlemesi, atanan bot, provider ve yanıt gecikmesini tek akışta izleyin.'],
    bots: ['Bot filosu', 'Çalışan otomasyonlar', 'WhatsApp, AI yanıt, görsel, video ve medya botlarının sağlık ve başarı görünümü.'],
    accounts: ['Provider hesapları', 'Bağlantı, kimlik ve kota', 'Gemini önce, Flow fallback kuralını değiştirmeden hesap kullanılabilirliğini izleyin.'],
    workers: ['Worker filosu', 'Host ve browser kapasitesi', 'Heartbeat, aktif iş, hesap ataması ve mevcut olduğu ölçüde browser telemetrisi.'],
    alerts: ['Müdahale kuyruğu', 'Gerçekten bakmanız gerekenler', 'VNC veya manuel işlem yalnız burada işaretlenen istisnai durumlar için gerekir.'],
  }

  return (
    <div>
      <SectionHeader eyebrow={titles[section][0]} title={titles[section][1]} detail={titles[section][2]} />
      {(error || notice) && <div className={`mb-4 rounded-[var(--radius-sm)] border px-3 py-2 text-xs font-semibold ${error ? 'border-danger/25 bg-danger/5 text-danger' : 'border-accent/20 bg-accent-soft text-accent-dim'}`}>{error || notice}</div>}

      {section === 'overview' && <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
          {[
            ['Worker online', `${data.overview.workersOnline}/${data.overview.workersTotal}`, 'workers'],
            ['Aktif iş', data.overview.jobsActive, 'active'], ['Kuyruk', data.overview.jobsQueued, 'queued'],
            ['Mesaj işleniyor', data.overview.messagesProcessing, 'messages'], ['Bot çalışıyor', data.overview.botsRunning, 'bots'],
            ['Sağlıklı hesap', `${data.overview.healthyAccounts}/${data.overview.accountsTotal}`, 'accounts'], ['Uyarı', data.overview.alerts, 'alerts'],
          ].map(([label, value, key]) => <div key={String(key)} className={`rounded-[var(--radius-card)] border bg-surface p-3 shadow-[var(--shadow-card)] ${key === 'alerts' && Number(value) > 0 ? 'border-danger/30' : 'border-[var(--color-hairline)]'}`}><div className="text-[10px] font-bold text-ink-muted">{label}</div><div className={`mt-2 text-2xl font-black tracking-[-0.04em] ${key === 'alerts' && Number(value) > 0 ? 'text-danger' : 'text-ink'}`}>{value}</div></div>)}
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.7fr)]"><EventFeed events={data.events} /><section><div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-black">Önce bakılacaklar</h2><span className="text-[10px] text-ink-faint">{data.alerts.length} kayıt</span></div><AlertsPanel alerts={data.alerts} compact /></section></div>
        <section><div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-black">Aktif ve sıradaki işler</h2><button onClick={() => refresh(true)} className="text-[11px] font-bold text-accent">Yenile</button></div><JobCards jobs={data.jobs.filter(job => job.state === 'ACTIVE' || job.state === 'QUEUED').slice(0, 8)} onSelect={setSelectedJob} onAction={runAction} busy={busy} /></section>
      </div>}

      {section === 'jobs' && <div className="space-y-3">
        <div className="flex gap-1 overflow-x-auto pb-1">{(['ALL', 'ACTIVE', 'QUEUED', 'FAILED', 'NEEDS_REVIEW', 'COMPLETED'] as const).map(state => <button key={state} onClick={() => setJobFilter(state)} className={`min-h-9 shrink-0 rounded-[var(--radius-sm)] px-3 text-[11px] font-black ${jobFilter === state ? 'bg-ink text-white' : 'border border-[var(--color-hairline)] bg-surface text-ink-muted'}`}>{state}</button>)}</div>
        <JobCards jobs={filteredJobs} onSelect={setSelectedJob} onAction={runAction} busy={busy} />
      </div>}

      {section === 'messages' && <div className="space-y-2">{data.messages.map(message => <article key={message.id} className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-surface p-3 shadow-[var(--shadow-card)] sm:grid-cols-[125px_180px_1fr_150px] sm:items-center"><div><div className="text-[10px] font-bold text-ink-faint">{new Date(message.timestamp).toLocaleString('tr-TR')}</div><StatusBadge value={message.direction === 'in' ? 'GELEN' : 'GİDEN'} /></div><div className="min-w-0"><div className="truncate text-xs font-black">{message.customer}</div><div className="truncate text-[10px] text-ink-muted">{message.organization}</div></div><p className="min-w-0 text-xs leading-relaxed text-ink-soft">{message.preview}</p><div className="text-[10px]"><strong className="block">{message.processingState}</strong><span className="text-ink-muted">{message.assignedBot} · {duration(message.latencyMs)}</span></div></article>)}{data.messages.length === 0 && <Empty text="Canlı mesaj kaydı bulunamadı." />}</div>}

      {section === 'bots' && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{data.bots.map(bot => <article key={bot.id} className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-surface p-4 shadow-[var(--shadow-card)]"><div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-accent">{bot.type}</div><h2 className="mt-1 text-base font-black">{bot.id}</h2></div><StatusBadge value={bot.state} /></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded bg-canvas p-2"><strong className="block text-lg">{bot.activeJobs}</strong><span className="text-[9px] text-ink-muted">Aktif</span></div><div className="rounded bg-canvas p-2"><strong className="block text-lg text-success">{bot.successCount}</strong><span className="text-[9px] text-ink-muted">Başarılı</span></div><div className="rounded bg-canvas p-2"><strong className="block text-lg text-danger">{bot.failureCount}</strong><span className="text-[9px] text-ink-muted">Hata</span></div></div><div className="mt-3 text-[11px] text-ink-muted">Ort. gecikme: <strong className="text-ink">{duration(bot.averageLatencyMs)}</strong> · Son aktivite: <strong className="text-ink">{timeAgo(bot.lastActivityAt)}</strong></div>{bot.lastError && <p className="mt-2 text-[11px] text-danger">{bot.lastError}</p>}</article>)}</div>}

      {section === 'accounts' && <AccountsGrid accounts={data.accounts} busy={busy} onAction={runAction} />}
      {section === 'workers' && <WorkersGrid workers={data.workers} busy={busy} onAction={runAction} />}
      {section === 'alerts' && <AlertsPanel alerts={data.alerts} />}
      {selectedJob && <JobDrawer job={selectedJob} onClose={() => setSelectedJob(null)} />}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-hairline)] pt-3 text-[10px] text-ink-faint"><span>Son projeksiyon: {new Date(data.generatedAt).toLocaleString('tr-TR')}</span><span>{Object.entries(data.sourceHealth).map(([source, state]) => `${source}:${state}`).join(' · ')}</span></div>
    </div>
  )
}

function AccountsGrid({ accounts, busy, onAction }: { accounts: OperationsAccount[]; busy: string | null; onAction: (action: string, id: string) => void }) {
  const flowAccounts = accounts.filter(a => a.provider === 'FLOW')
  const totalAvailableCredits = flowAccounts.reduce((sum, a) => sum + (a.creditBalance ?? 0), 0)
  const totalCreditsUsedToday = flowAccounts.reduce((sum, a) => sum + (a.creditsUsedToday ?? 0), 0)
  const totalCompletedVideos = flowAccounts.reduce((sum, a) => sum + (a.totalCompletedVideos ?? 0), 0)
  const estimatedVideosRemaining = Math.floor(totalAvailableCredits / 10)

  return (
    <div className="space-y-6">
      {/* Toplam Kredi ve Video Kota Özeti */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-surface p-4 shadow-[var(--shadow-card)]">
          <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Toplam Kalan Kredi</span>
          <div className="mt-1.5 text-2xl font-black text-accent">{totalAvailableCredits} <span className="text-xs font-semibold text-ink-muted">Kredi</span></div>
          <span className="text-[10px] text-ink-faint">Aktif Flow havuz bakiyesi</span>
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-surface p-4 shadow-[var(--shadow-card)]">
          <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Kalan Video Kapasitesi</span>
          <div className="mt-1.5 text-2xl font-black text-ink">~{estimatedVideosRemaining} <span className="text-xs font-semibold text-ink-muted">Video</span></div>
          <span className="text-[10px] text-ink-faint">~10 kredi / video bazında</span>
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-surface p-4 shadow-[var(--shadow-card)]">
          <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Bugün Harcanan Kredi</span>
          <div className="mt-1.5 text-2xl font-black text-ink-soft">{totalCreditsUsedToday} <span className="text-xs font-semibold text-ink-muted">Kredi</span></div>
          <span className="text-[10px] text-ink-faint">Son 24 saatteki üretimler</span>
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-surface p-4 shadow-[var(--shadow-card)]">
          <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Başarılı Video Üretimi</span>
          <div className="mt-1.5 text-2xl font-black text-success">{totalCompletedVideos} <span className="text-xs font-semibold text-ink-muted">Adet</span></div>
          <span className="text-[10px] text-ink-faint">Toplam tamamlanan işler</span>
        </div>
      </div>

      {(['GEMINI', 'FLOW', 'CHATGPT', 'WHATSAPP'] as const).map(provider => {
        const items = accounts.filter(account => account.provider === provider)
        return (
          <section key={provider}>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-sm font-black">{provider}</h2>
              <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-bold text-ink-muted">{items.length}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map(account => (
                <article key={account.id} className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-surface p-4 shadow-[var(--shadow-card)]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black">{account.label}</h3>
                      <div className="mt-0.5 font-mono text-[9px] text-ink-faint">{account.id}</div>
                    </div>
                    <StatusBadge value={account.health} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                    <div className="rounded bg-canvas p-2">
                      <span className="block text-ink-faint">Kimlik</span>
                      <strong>{account.authState}</strong>
                    </div>
                    <div className="rounded bg-canvas p-2">
                      <span className="block text-ink-faint">Browser / İş</span>
                      <strong>{account.browserState}</strong>
                    </div>
                    <div className="rounded bg-canvas p-2">
                      <span className="block text-ink-faint">Kalan Kredi</span>
                      <strong className={account.creditBalance != null && account.creditBalance <= 20 ? 'text-danger font-black' : 'text-accent font-black'}>
                        {account.creditBalance != null ? `${account.creditBalance} Kredi` : account.quotaState}
                      </strong>
                      {account.creditsUsedToday != null && account.creditsUsedToday > 0 ? (
                        <span className="block text-[9px] text-ink-muted">Bugün: -{account.creditsUsedToday} kredi</span>
                      ) : null}
                    </div>
                    <div className="rounded bg-canvas p-2">
                      <span className="block text-ink-faint">Başarılı Üretim</span>
                      <strong className="text-success font-black">{account.totalCompletedVideos ?? 0} video</strong>
                      {account.planTier ? (
                        <span className="block truncate text-[9px] text-ink-muted">{account.planTier}</span>
                      ) : null}
                    </div>
                    <div className="col-span-2 rounded bg-canvas p-2">
                      <span className="block text-ink-faint">Son Aktivite</span>
                      <strong>{timeAgo(account.lastActivityAt)}</strong>
                    </div>
                  </div>
                  {account.lastError && <p className="mt-2 text-[11px] text-danger">{account.lastError}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {account.actions.map(action => (
                      <button
                        key={action}
                        disabled={busy === account.id}
                        onClick={() => onAction(action === 'clear_cooldown' ? 'clear_account_cooldown' : action === 'enable' ? 'enable_account' : 'disable_account', `${account.provider.toLowerCase()}:${account.id.replace(/^gemini:/, '')}`)}
                        className="min-h-9 rounded-[var(--radius-sm)] border border-[var(--color-hairline)] px-3 text-[10px] font-black hover:bg-surface-raised disabled:opacity-50"
                      >
                        {action === 'clear_cooldown' ? 'Cooldown temizle' : action === 'enable' ? 'Etkinleştir' : 'Devre dışı bırak'}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
              {items.length === 0 && <Empty text={`${provider} hesabı bulunamadı.`} />}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function WorkersGrid({ workers, busy, onAction }: { workers: OperationsWorker[]; busy: string | null; onAction: (action: string, id: string) => void }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{workers.map(worker => <article key={worker.id} className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-surface p-4 shadow-[var(--shadow-card)]"><div className="flex items-start justify-between gap-2"><div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-accent">{worker.kind} · {worker.hostId}</div><h2 className="mt-1 text-sm font-black">{worker.id}</h2></div><StatusBadge value={worker.state} /></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded bg-canvas p-2"><strong className="block">{worker.activeJobs}</strong><span className="text-[9px] text-ink-muted">Aktif iş</span></div><div className="rounded bg-canvas p-2"><strong className="block">{worker.browserCount ?? '—'}</strong><span className="text-[9px] text-ink-muted">Browser</span></div><div className="rounded bg-canvas p-2"><strong className="block">{worker.tabCount ?? '—'}</strong><span className="text-[9px] text-ink-muted">Tab</span></div></div><div className="mt-3 text-[10px] leading-relaxed text-ink-muted">CPU: <strong className="text-ink">{worker.cpuPercent == null ? '—' : `${worker.cpuPercent}%`}</strong> · RAM: <strong className="text-ink">{worker.memoryMb == null ? '—' : `${worker.memoryMb} MB`}</strong><br />Heartbeat: <strong className="text-ink">{timeAgo(worker.lastHeartbeatAt)}</strong> · Restart: <strong className="text-ink">{worker.restartCount}</strong></div><div className="mt-3 flex flex-wrap gap-2">{worker.actions.map(action => <button key={action} disabled={busy === worker.id || action !== 'restart' || worker.kind !== 'WHATSAPP'} title={action !== 'restart' || worker.kind !== 'WHATSAPP' ? 'Runtime komut tüketicisi bağlandığında etkinleşecek' : undefined} onClick={() => onAction('restart_whatsapp_worker', `worker:${worker.id}`)} className="min-h-9 rounded-[var(--radius-sm)] border border-[var(--color-hairline)] px-3 text-[10px] font-black disabled:cursor-not-allowed disabled:opacity-40">{action === 'restart_browser' ? 'Idle browser restart' : action === 'drain' ? 'Drain' : 'Worker restart'}</button>)}</div></article>)}{workers.length === 0 && <Empty text="Worker heartbeat bulunamadı." />}</div>
}
