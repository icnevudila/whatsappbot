import { LogoMark } from '@/components/brand'

/**
 * Hero görseli: panelin kendi arayüzü, ekran görüntüsü yerine aynı
 * token'larla yeniden çizilmiş hali.
 */

const LINES = [
  { label: 'Satış hattı', phone: '+90 532 000 00 01', status: 'connected', sent: 184, cap: 250 },
  { label: 'Destek hattı', phone: '+90 532 000 00 02', status: 'connected', sent: 96, cap: 250 },
  { label: 'Kampanya 3', phone: null, status: 'qr_pending', sent: 0, cap: 250 },
] as const

const STATUS = {
  connected: { label: 'Bağlı', tone: 'text-ok border-ok/35 bg-ok-soft' },
  qr_pending: { label: 'QR bekleniyor', tone: 'text-warn border-warn/35 bg-warn/10' },
} as const

export function HeroPanel() {
  return (
    <div className="filo-fade-in overflow-hidden rounded-[10px] border border-hairline bg-surface">
      <div className="flex items-center gap-2 border-b border-hairline px-3 py-2">
        <LogoMark className="size-3.5" />
        <span className="text-[11.5px] font-medium text-ink-muted">Hesaplar</span>
        <span className="ml-auto rounded-full border border-ok/30 bg-ok-soft px-2 py-0.5 text-[10.5px] font-medium text-ok">
          Canlı
        </span>
      </div>

      <div className="flex flex-col gap-2 p-3">
        {LINES.map((line) => {
          const status = STATUS[line.status]
          const pct = Math.round((line.sent / line.cap) * 100)

          return (
            <div
              key={line.label}
              className="rounded-md border border-hairline bg-canvas px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-medium">{line.label}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-ink-faint">
                    {line.phone ?? 'Numara bekleniyor'}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${status.tone}`}
                >
                  {status.label}
                </span>
              </div>

              <div className="mt-2.5 flex items-center gap-2.5">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-hairline">
                  <div
                    className={`h-full rounded-full ${pct > 0 ? 'bg-accent' : ''}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="tabular shrink-0 text-[10.5px] text-ink-faint">
                  {line.sent}/{line.cap} bugün
                </span>
              </div>
            </div>
          )
        })}

        <div className="mt-1 flex items-center justify-between rounded-md border border-hairline bg-canvas px-3 py-2.5">
          <div>
            <p className="text-[11.5px] text-ink-muted">Bugünkü toplam kapasite</p>
            <p className="tabular mt-0.5 text-[15px] font-semibold text-accent">
              280 / 750
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11.5px] text-ink-muted">Aktif kampanya</p>
            <p className="mt-0.5 text-[12.5px] font-medium">Bahar indirimi</p>
          </div>
        </div>
      </div>
    </div>
  )
}
