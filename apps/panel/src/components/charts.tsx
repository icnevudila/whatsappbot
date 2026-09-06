import type { ReactNode } from 'react'

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

const TONE_FILL: Record<string, string> = {
  accent: 'var(--color-accent, #2f5bff)',
  ok: 'var(--color-ok, #25d366)',
  danger: 'var(--color-danger, #e11d48)',
  warn: 'var(--color-warn, #d97706)',
  muted: '#94a3b8',
  soft: '#c5d0f5',
}

function barPct(value: number, max: number): number {
  if (value <= 0) return 0
  return Math.max(6, Math.round((value / max) * 100))
}

/** Bugünün saatlik giden / gelen dağılımı (0–23). */
export function HourlyDualChart({
  outbound,
  inbound,
}: {
  outbound: number[]
  inbound: number[]
}) {
  const hours = Math.max(outbound.length, inbound.length, 24)
  const out = Array.from({ length: hours }, (_, i) => outbound[i] ?? 0)
  const inn = Array.from({ length: hours }, (_, i) => inbound[i] ?? 0)
  const max = Math.max(1, ...out, ...inn)
  const totalOut = out.reduce((s, n) => s + n, 0)
  const totalIn = inn.reduce((s, n) => s + n, 0)

  if (totalOut + totalIn === 0) {
    return (
      <p className="rounded-md border border-dashed border-hairline px-3 py-8 text-center text-[12.5px] text-ink-faint">
        Bugün henüz trafik yok. İlk gönderim veya gelen mesajda saatlik dağılım burada dolacak.
      </p>
    )
  }

  const ticks = [0, 6, 12, 18, 23]

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-[11.5px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-accent" /> Giden ({totalOut})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-[var(--color-ok,#25d366)]" /> Gelen ({totalIn})
        </span>
      </div>
      <div
        className="flex h-44 gap-px"
        role="img"
        aria-label={`Bugün ${totalOut} giden, ${totalIn} gelen mesaj`}
      >
        {out.map((outCount, hour) => {
          const inCount = inn[hour] ?? 0
          return (
            <div
              key={hour}
              className="flex min-w-0 flex-1 flex-col"
              title={`${String(hour).padStart(2, '0')}:00 · ${outCount} giden · ${inCount} gelen`}
            >
              <div className="flex min-h-0 flex-1 items-end justify-center gap-px">
                <div
                  className="w-[45%] rounded-t-[2px] bg-accent/90"
                  style={{ height: outCount > 0 ? `${barPct(outCount, max)}%` : '2px', opacity: outCount > 0 ? 1 : 0.25 }}
                />
                <div
                  className="w-[45%] rounded-t-[2px] bg-[var(--color-ok,#25d366)]/90"
                  style={{ height: inCount > 0 ? `${barPct(inCount, max)}%` : '2px', opacity: inCount > 0 ? 1 : 0.25 }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[10.5px] tabular text-ink-faint">
        {ticks.map((h) => (
          <span key={h}>{String(h).padStart(2, '0')}</span>
        ))}
      </div>
    </div>
  )
}

/** Günlük giden / gelen yan yana; fail üstte nokta. */
export function DailyVolumeChart({
  days,
  dense = false,
}: {
  days: { day?: string; label: string; out: number; inbound: number; failed: number }[]
  /** 7 gün gibi kısa aralıklarda her gün etiketi. */
  dense?: boolean
}) {
  const max = Math.max(1, ...days.map((d) => Math.max(d.out, d.inbound)))
  const totalOut = days.reduce((s, d) => s + d.out, 0)
  const totalIn = days.reduce((s, d) => s + d.inbound, 0)
  const totalFail = days.reduce((s, d) => s + d.failed, 0)
  const showEveryLabel = dense || days.length <= 10

  if (totalOut + totalIn === 0) {
    return (
      <p className="rounded-md border border-dashed border-hairline px-3 py-8 text-center text-[12.5px] text-ink-faint">
        Bu dönemde henüz mesaj yok. Gönderim veya gelen kutusu dolunca günlük hacim burada görünür.
      </p>
    )
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-[11.5px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-accent" /> Giden ({totalOut})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-[var(--color-ok,#25d366)]" /> Gelen ({totalIn})
        </span>
        {totalFail > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-danger/80" /> Fail ({totalFail})
          </span>
        ) : null}
      </div>
      <div
        className="flex h-44 gap-1 sm:gap-1.5"
        role="img"
        aria-label={`Günlük hacim: ${totalOut} giden, ${totalIn} gelen`}
      >
        {days.map((d) => (
          <div
            key={d.day ?? d.label}
            className="flex min-w-0 flex-1 flex-col"
            title={`${d.label}: ${d.out} giden · ${d.inbound} gelen · ${d.failed} fail`}
          >
            <div className="relative flex min-h-0 flex-1 items-end justify-center gap-0.5">
              {d.failed > 0 ? (
                <span
                  className="absolute left-1/2 top-0 z-10 size-1.5 -translate-x-1/2 rounded-full bg-danger"
                  aria-hidden
                />
              ) : null}
              <div
                className="w-[42%] max-w-5 rounded-t-[3px] bg-accent transition-[height] duration-300"
                style={{
                  height: d.out > 0 ? `${barPct(d.out, max)}%` : '3px',
                  opacity: d.out > 0 ? 1 : 0.2,
                }}
              />
              <div
                className="w-[42%] max-w-5 rounded-t-[3px] bg-[var(--color-ok,#25d366)] transition-[height] duration-300"
                style={{
                  height: d.inbound > 0 ? `${barPct(d.inbound, max)}%` : '3px',
                  opacity: d.inbound > 0 ? 1 : 0.2,
                }}
              />
            </div>
            {showEveryLabel ? (
              <span className="mt-1.5 block truncate text-center text-[10px] tabular leading-none text-ink-faint">
                {d.label}
              </span>
            ) : null}
          </div>
        ))}
      </div>
      {!showEveryLabel ? (
        <div className="mt-1.5 flex justify-between text-[10.5px] tabular text-ink-faint">
          <span>{days[0]?.label}</span>
          {days.length > 2 ? (
            <span>{days[Math.floor(days.length / 2)]?.label}</span>
          ) : null}
          <span>{days[days.length - 1]?.label}</span>
        </div>
      ) : null}
    </div>
  )
}

/** Yatay sıralı çubuk listesi (kampanya / hata / liste). */
export function RankBars({
  items,
  empty,
  valueSuffix = '',
}: {
  items: { label: string; value: number; detail?: string; href?: string }[]
  empty: string
  valueSuffix?: string
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-hairline px-3 py-6 text-center text-[12.5px] text-ink-faint">
        {empty}
      </p>
    )
  }

  const max = Math.max(1, ...items.map((i) => i.value))

  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const width = Math.max(item.value > 0 ? 4 : 0, Math.round((item.value / max) * 100))
        const labelNode = item.href ? (
          <a
            href={item.href}
            className="truncate font-medium text-ink underline-offset-2 hover:text-accent hover:underline"
          >
            {item.label}
          </a>
        ) : (
          <span className="truncate font-medium text-ink">{item.label}</span>
        )

        return (
          <li key={item.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-[12.5px]">
              {labelNode}
              <span className="shrink-0 tabular text-ink-muted">
                {item.value}
                {valueSuffix}
                {item.detail ? (
                  <span className="ml-1.5 text-[11px] text-ink-faint">{item.detail}</span>
                ) : null}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-hairline">
              <div
                className="h-full rounded-full bg-accent/85 transition-[width] duration-500"
                style={{ width: `${width}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/** Huni basamakları — geniş görsel çubuklar. */
export function FunnelSteps({
  steps,
}: {
  steps: { label: string; value: number; tone: 'accent' | 'muted' | 'danger' | 'ok' }[]
}) {
  const max = Math.max(1, ...steps.map((s) => s.value))
  if (steps.every((s) => s.value === 0)) {
    return (
      <p className="rounded-md border border-dashed border-hairline px-3 py-6 text-center text-[12.5px] text-ink-faint">
        Teslim hunisi için dönemde giden mesaj gerekir.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {steps.map((step, index) => {
        const width = Math.max(step.value > 0 ? 10 : 0, Math.round((step.value / max) * 100))
        const fill = {
          accent: 'bg-accent',
          ok: 'bg-[var(--color-ok,#25d366)]',
          muted: 'bg-ink-faint/45',
          danger: 'bg-danger',
        }[step.tone]
        const rate = max > 0 && index > 0 ? Math.round((step.value / max) * 100) : null
        return (
          <li key={step.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[12.5px]">
              <span className="font-medium text-ink">{step.label}</span>
              <span className="tabular text-ink-muted">
                <span className="font-semibold text-ink">{step.value}</span>
                {rate != null && steps[0]!.value > 0 ? (
                  <span className="ml-1.5 text-[11px] text-ink-faint">%{rate}</span>
                ) : null}
              </span>
            </div>
            <div className="h-3.5 overflow-hidden rounded-md bg-hairline">
              <div
                className={cx('h-full rounded-md transition-[width] duration-500', fill)}
                style={{ width: `${width}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/** Basit SVG donut. */
export function DonutChart({
  segments,
  center,
  empty,
}: {
  segments: { label: string; value: number; tone?: keyof typeof TONE_FILL }[]
  center?: ReactNode
  empty: string
}) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (total <= 0) {
    return (
      <p className="rounded-md border border-dashed border-hairline px-3 py-8 text-center text-[12.5px] text-ink-faint">
        {empty}
      </p>
    )
  }

  const size = 140
  const stroke = 18
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  const tones: (keyof typeof TONE_FILL)[] = ['accent', 'ok', 'muted', 'warn', 'danger', 'soft']

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-hairline, #e5e7eb)"
            strokeWidth={stroke}
          />
          {segments.map((seg, i) => {
            if (seg.value <= 0) return null
            const len = (seg.value / total) * c
            const dash = `${len} ${c - len}`
            const el = (
              <circle
                key={seg.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={TONE_FILL[seg.tone ?? tones[i % tones.length]]}
                strokeWidth={stroke}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            )
            offset += len
            return el
          })}
        </svg>
        {center ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {center}
          </div>
        ) : null}
      </div>
      <ul className="w-full space-y-1.5 text-[12.5px]">
        {segments.map((seg, i) => (
          <li key={seg.label} className="flex items-center justify-between gap-3">
            <span className="inline-flex min-w-0 items-center gap-2 text-ink-muted">
              <span
                className="h-2 w-2 shrink-0 rounded-sm"
                style={{ background: TONE_FILL[seg.tone ?? tones[i % tones.length]] }}
              />
              <span className="truncate">{seg.label}</span>
            </span>
            <span className="tabular font-medium text-ink">{seg.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Kota / kullanım metre kartı içi. */
export function QuotaMeter({
  used,
  limit,
  label,
}: {
  used: number
  limit: number
  label: string
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const tone = pct >= 90 ? 'danger' : pct >= 70 ? 'warn' : 'accent'
  const fill = { accent: 'bg-accent', warn: 'bg-warn', danger: 'bg-danger' }[tone]

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[12.5px]">
        <span className="text-ink-muted">{label}</span>
        <span className="tabular text-ink">
          {used}
          <span className="text-ink-faint"> / {limit > 0 ? limit : '∞'}</span>
          {limit > 0 ? <span className="ml-1.5 text-[11px] text-ink-faint">%{pct}</span> : null}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-hairline">
        <div
          className={cx('h-full rounded-full transition-[width] duration-500', fill)}
          style={{ width: `${limit > 0 ? pct : 0}%` }}
        />
      </div>
    </div>
  )
}
