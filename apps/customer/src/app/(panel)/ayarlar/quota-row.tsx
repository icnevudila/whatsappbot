import type { ReactNode } from 'react'
import { Meter } from '@/components/ui'

const nf = new Intl.NumberFormat('tr-TR')

export function QuotaRow({
  label,
  used,
  total,
  hint,
}: {
  label: string
  used: number
  total: number
  hint?: ReactNode
}) {
  const ratio = total > 0 ? used / total : 0
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[12.5px]">{label}</span>
        <span className="tabular text-[12px] text-ink-muted">
          {nf.format(used)} / {nf.format(total)}
        </span>
      </div>
      <Meter value={used} max={total} tone={ratio > 0.9 ? 'warn' : 'accent'} />
      {hint ? <div className="mt-1 text-[11.5px] text-ink-faint">{hint}</div> : null}
    </div>
  )
}
