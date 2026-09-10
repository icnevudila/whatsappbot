'use client'

import { useState } from 'react'
import { warmupCap } from '@wa/shared'
import { useLocale } from '@/lib/i18n/provider'

/** Day-index UI → shared policy: startedAt = now − day×86400000. */
function warmupCapAtDay(dayIndex: number, now = Date.now()): number {
  return warmupCap(new Date(now - dayIndex * 86_400_000).toISOString(), now)
}

const LINE_OPTIONS = [1, 2, 3, 5, 10, 20]
const CURVE_DAYS = [0, 1, 3, 7, 14]

export function CapacityCalculator() {
  const { locale, messages, t } = useLocale()
  const C = messages.landing.calculator
  const [lines, setLines] = useState(3)
  const [target, setTarget] = useState(10_000)
  const nf = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'tr-TR')

  const matureDaily = lines * 250

  let remaining = target
  let days = 0
  while (remaining > 0 && days < 3650) {
    remaining -= warmupCapAtDay(days) * lines
    days += 1
  }
  const reachable = remaining <= 0

  return (
    <div className="rounded-[10px] border border-hairline bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-3.5">
        <div>
          <h3 className="text-[13px] font-semibold">{C.title}</h3>
          <p className="mt-0.5 text-[12px] text-ink-muted">{C.subtitle}</p>
        </div>
        <span className="rounded-full border border-hairline-strong bg-surface-raised px-2 py-0.5 text-[11.5px] text-ink-muted">
          {C.badge}
        </span>
      </div>

      <div className="grid gap-6 px-5 py-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col gap-5">
          <div>
            <span className="mb-2 block text-[12px] font-medium text-ink-muted">{C.linesLabel}</span>
            <div className="flex flex-wrap gap-1.5">
              {LINE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLines(option)}
                  className={`h-8 rounded-md border px-3 text-[12.5px] font-medium transition-colors ${
                    option === lines
                      ? 'border-accent/40 bg-accent/10 text-accent'
                      : 'border-hairline-strong bg-surface-raised text-ink-muted hover:text-ink'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-ink-muted">{C.targetLabel}</span>
            <input
              type="number"
              min={1}
              step={500}
              value={target}
              onChange={(event) => setTarget(Math.max(1, Number(event.target.value) || 1))}
              className="tabular w-full rounded-md border border-hairline-strong bg-canvas px-2.5 py-1.5 text-[13px] text-ink focus:border-accent focus:outline-none"
            />
          </label>

          <div className="flex gap-8 border-t border-hairline pt-4">
            <div>
              <p className="tabular text-[22px] font-semibold leading-none text-accent">
                {nf.format(matureDaily)}
              </p>
              <p className="mt-1.5 text-[11.5px] text-ink-muted">{C.matureTitle}</p>
            </div>
            <div>
              <p className="tabular text-[22px] font-semibold leading-none">
                {reachable ? nf.format(days) : '—'}
              </p>
              <p className="mt-1.5 text-[11.5px] text-ink-muted">
                {reachable
                  ? t('landing.calculator.daysHintOk', { days })
                  : C.daysHintFail}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-md border border-hairline bg-canvas p-4">
          <div>
            <p className="text-[12px] font-medium text-ink-muted">{C.curveTitle}</p>
            <p className="mt-0.5 text-[11.5px] text-ink-faint">{C.curveHint}</p>
          </div>

          <div className="flex flex-col gap-2">
            {CURVE_DAYS.map((day) => {
              const value = warmupCapAtDay(day) * lines
              const pct = (warmupCapAtDay(day) / 250) * 100
              const label =
                day === 14
                  ? t('landing.calculator.dayPlus', { n: 14 })
                  : t('landing.calculator.dayLabel', { n: day })

              return (
                <div key={day} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-[11.5px] text-ink-faint">{label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hairline">
                    <div
                      className={`h-full rounded-full ${day === 14 ? 'bg-accent' : 'bg-hairline-strong'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="tabular w-14 shrink-0 text-right text-[11.5px] text-ink-muted">
                    {nf.format(value)}
                  </span>
                </div>
              )
            })}
          </div>

          <p className="border-t border-hairline pt-3 text-[11.5px] text-ink-faint">{C.curveFooter}</p>
        </div>
      </div>
    </div>
  )
}
