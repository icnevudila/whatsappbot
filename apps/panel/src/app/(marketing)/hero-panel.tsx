/**
 * Hero ürün silüeti: inset kart değil, kenara yapışık panel düzlemi.
 */

const LINES = [
  { label: 'Satış hattı', phone: '+90 532 000 00 01', status: 'connected', sent: 184, cap: 250 },
  { label: 'Destek hattı', phone: '+90 532 000 00 02', status: 'connected', sent: 96, cap: 250 },
  { label: 'Kampanya 3', phone: null, status: 'qr_pending', sent: 0, cap: 250 },
] as const

const STATUS = {
  connected: { label: 'Bağlı', tone: 'text-ok' },
  qr_pending: { label: 'QR bekleniyor', tone: 'text-warn' },
} as const

export function HeroPanel() {
  return (
    <div className="filo-fade-up-delay-2 relative h-full min-h-[320px] border-t border-hairline bg-surface md:min-h-[420px] md:border-l md:border-t-0">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,var(--color-canvas-alt)_0%,transparent_42%)]"
      />

      <div className="relative flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
          <span className="text-[12px] font-medium text-ink-muted">Hesaplar</span>
          <span className="ml-auto text-[11px] font-medium text-ok">Canlı</span>
        </div>

        <div className="flex flex-1 flex-col gap-0">
          {LINES.map((line, index) => {
            const status = STATUS[line.status]
            const pct = Math.round((line.sent / line.cap) * 100)
            const stagger =
              index === 0
                ? 'filo-bar-stagger-1'
                : index === 1
                  ? 'filo-bar-stagger-2'
                  : 'filo-bar-stagger-3'

            return (
              <div key={line.label} className="border-b border-hairline px-4 py-3.5 last:border-b-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{line.label}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-ink-faint">
                      {line.phone ?? 'Numara bekleniyor'}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[11px] font-medium ${status.tone}`}>
                    {status.label}
                  </span>
                </div>

                <div className="mt-2.5 flex items-center gap-2.5">
                  <div className="h-1 flex-1 overflow-hidden bg-hairline">
                    <div
                      className={`filo-bar-stagger ${stagger} h-full origin-left ${pct > 0 ? 'bg-accent' : ''}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="tabular shrink-0 text-[10.5px] text-ink-faint">
                    {line.sent}/{line.cap}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-hairline bg-canvas-alt/50 px-4 py-3.5">
          <div>
            <p className="text-[11px] text-ink-muted">Bugünkü kapasite</p>
            <p className="tabular mt-0.5 text-[16px] font-semibold text-accent">280 / 750</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-ink-muted">Aktif kampanya</p>
            <p className="mt-0.5 text-[12.5px] font-medium">Bahar indirimi</p>
          </div>
        </div>
      </div>
    </div>
  )
}
