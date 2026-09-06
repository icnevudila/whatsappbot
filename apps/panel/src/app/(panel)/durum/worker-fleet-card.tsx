import { Badge, Card, CardHeader } from '@/components/ui'

type WorkerRow = {
  worker_id: string
  alive: boolean
}

/** Kullanıcıya yalnızca bağlı / bağlı değil; worker kimliği veya VPS adı yok. */
export function WorkerFleetCard({ workers }: { workers: WorkerRow[] }) {
  const connected = workers.some((w) => w.alive)

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
            <span className="wb-live-dot inline-flex size-2 shrink-0 rounded-full bg-ok" aria-hidden />
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
