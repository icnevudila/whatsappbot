import { Badge, Card, CardHeader } from '@/components/ui'

type WorkerRow = {
  worker_id: string
  max_sessions: number
  tracked: number
  live: number
  db_pool_max: number
  seen_at: string
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

export function WorkerFleetCard({
  workers,
  leases,
}: {
  workers: WorkerRow[]
  leases: LeaseRow[]
}) {
  const alive = workers.filter((w) => w.alive)
  const hetzner = alive.find((w) => w.worker_id.includes('hetzner')) ?? alive[0]

  return (
    <Card>
      <CardHeader
        title="Gönderim sunucusu"
        subtitle={
          alive.length === 0
            ? 'Worker heartbeat yok — Hetzner / VPS kapalı olabilir'
            : `${alive.length} canlı worker · hatlar bu sunucuda çalışır`
        }
      />
      <div className="space-y-2.5 px-3.5 pb-3.5">
        {hetzner ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-ok/30 bg-ok-soft/40 px-3 py-2.5">
            <Badge tone="accent">Canlı</Badge>
            <span className="font-mono text-[13px] font-medium text-ink">{hetzner.worker_id}</span>
            <span className="text-[12px] text-ink-muted">
              {hetzner.live}/{hetzner.max_sessions} oturum · son sinyal{' '}
              {new Date(hetzner.seen_at).toLocaleString('tr-TR')}
            </span>
          </div>
        ) : (
          <p className="text-[12.5px] text-danger">
            Canlı worker yok. Hetzner’de <code className="font-mono">docker ps</code> ve health
            kontrol edin.
          </p>
        )}

        {workers.length > 0 ? (
          <ul className="divide-y divide-hairline rounded-md border border-hairline text-[12px]">
            {workers.map((w) => (
              <li key={w.worker_id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <span className="font-mono text-ink">{w.worker_id}</span>
                <span className={w.alive ? 'text-ok-dim' : 'text-ink-faint'}>
                  {w.alive ? 'canlı' : 'eski'} · {w.live}/{w.max_sessions}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {leases.filter((l) => l.lease_active && l.holder_id).length > 0 ? (
          <div>
            <p className="mb-1.5 text-[11.5px] font-medium text-ink-muted">Hat → worker</p>
            <ul className="space-y-1 text-[12px] text-ink-muted">
              {leases
                .filter((l) => l.lease_active && l.holder_id)
                .map((l) => (
                  <li key={l.account_id}>
                    <span className="text-ink">{l.label ?? l.phone_e164 ?? 'Hat'}</span>
                    {' → '}
                    <span className="font-mono">{l.holder_id}</span>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Card>
  )
}
