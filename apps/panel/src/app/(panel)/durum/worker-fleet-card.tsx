import { Badge, Card, CardHeader } from '@/components/ui'

type WorkerRow = {
  worker_id: string
  max_sessions?: number
  tracked?: number
  live?: number
  db_pool_max?: number
  seen_at?: string
  alive: boolean
  meta?: { uptimeSeconds?: number; stale?: number } | null
}

type LeaseRow = {
  account_id: string
  label: string | null
  phone_e164: string | null
  status: string
  holder_id: string | null
  lease_active: boolean
}

function formatSeen(iso?: string) {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 5_000) return 'şimdi'
  if (ms < 60_000) return `${Math.floor(ms / 1000)} sn önce`
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)} dk önce`
  return new Date(iso).toLocaleString('tr-TR')
}

function formatUptime(seconds?: number) {
  if (seconds == null || seconds < 0) return null
  if (seconds < 60) return `${seconds} sn`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} dk`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h} sa ${m} dk`
}

/** Müşteri: bağlı/bağlı değil. Platform admin: worker + lease tablosu. */
export function WorkerFleetCard({
  workers,
  leases = [],
  detailed = false,
}: {
  workers: WorkerRow[]
  leases?: LeaseRow[]
  detailed?: boolean
}) {
  const connected = workers.some((w) => w.alive)

  if (!detailed) {
    return (
      <Card className="wb-row-enter">
        <CardHeader
          title="Gönderim sunucusu"
          subtitle={
            connected
              ? 'Hatlarınız gönderim için hazır'
              : 'Şu an bağlantı yok — gönderimler bekleyebilir'
          }
        />
        <div className="px-3.5 pb-3.5">
          {connected ? (
            <div className="flex flex-wrap items-center gap-2.5 rounded-md border border-ok/30 bg-ok-soft/40 px-3 py-2.5">
              <span
                className="wb-live-dot inline-flex size-2 shrink-0 rounded-full bg-ok"
                aria-hidden
              />
              <Badge tone="accent">Bağlı</Badge>
              <span className="text-[13px] text-ink-muted">Gönderim sunucusu çalışıyor</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-danger/25 bg-[#fff5f4] px-3 py-2.5">
              <Badge tone="danger">Bağlı değil</Badge>
              <span className="text-[13px] text-ink-muted">
                Bağlantı gelince hatlar otomatik çalışır
              </span>
            </div>
          )}
        </div>
      </Card>
    )
  }

  const activeLeases = leases.filter((l) => l.lease_active)
  const liveTotal = workers.reduce((sum, w) => sum + (w.live ?? 0), 0)
  const maxTotal = workers.reduce((sum, w) => sum + (w.max_sessions ?? 0), 0)

  return (
    <Card className="wb-row-enter">
      <CardHeader
        title="Worker fleet"
        subtitle={`${workers.length} worker · ${liveTotal}/${maxTotal || '—'} oturum · ${activeLeases.length} aktif lease`}
        action={
          connected ? <Badge tone="accent">Canlı</Badge> : <Badge tone="danger">Kapalı</Badge>
        }
      />
      <div className="space-y-3 px-3.5 pb-3.5">
        {workers.length === 0 ? (
          <p className="text-[13px] text-ink-muted">Heartbeat yok — worker ayakta değil.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-hairline text-[11px] font-medium tracking-wide text-ink-faint uppercase">
                  <th className="py-1.5 pr-3 font-medium">Worker</th>
                  <th className="py-1.5 pr-3 font-medium">Durum</th>
                  <th className="py-1.5 pr-3 font-medium">Oturum</th>
                  <th className="py-1.5 pr-3 font-medium">Pool</th>
                  <th className="py-1.5 pr-3 font-medium">Uptime</th>
                  <th className="py-1.5 font-medium">Seen</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((w) => (
                  <tr key={w.worker_id} className="border-b border-hairline/70">
                    <td className="max-w-[180px] truncate py-2 pr-3 font-mono text-[11.5px] text-ink">
                      {w.worker_id}
                    </td>
                    <td className="py-2 pr-3">
                      {w.alive ? (
                        <Badge tone="accent">alive</Badge>
                      ) : (
                        <Badge tone="danger">stale</Badge>
                      )}
                    </td>
                    <td className="py-2 pr-3 tabular text-ink-muted">
                      {w.live ?? 0}/{w.max_sessions ?? '—'}
                      {w.tracked != null ? (
                        <span className="text-ink-faint"> · track {w.tracked}</span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3 tabular text-ink-muted">{w.db_pool_max ?? '—'}</td>
                    <td className="py-2 pr-3 text-ink-muted">
                      {formatUptime(w.meta?.uptimeSeconds) ?? '—'}
                      {w.meta?.stale != null ? (
                        <span className="text-ink-faint"> · stale {w.meta.stale}</span>
                      ) : null}
                    </td>
                    <td className="py-2 text-ink-faint">{formatSeen(w.seen_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeLeases.length > 0 ? (
          <div>
            <p className="mb-1.5 text-[11px] font-medium tracking-wide text-ink-faint uppercase">
              Aktif lease
            </p>
            <ul className="divide-y divide-hairline rounded-md border border-hairline">
              {activeLeases.slice(0, 12).map((l) => (
                <li
                  key={l.account_id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-[12.5px]"
                >
                  <span className="min-w-0 truncate text-ink">
                    {l.label || l.phone_e164 || l.account_id.slice(0, 8)}
                    <span className="text-ink-faint"> · {l.status}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-ink-faint">
                    {l.holder_id ?? '—'}
                  </span>
                </li>
              ))}
            </ul>
            {activeLeases.length > 12 ? (
              <p className="mt-1.5 text-[11.5px] text-ink-faint">
                +{activeLeases.length - 12} lease daha
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-[12.5px] text-ink-faint">Aktif lease yok.</p>
        )}
      </div>
    </Card>
  )
}
