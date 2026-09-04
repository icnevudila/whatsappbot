import type { ReactNode } from 'react'

export type WaStatus = 'valid' | 'invalid' | 'unknown' | 'pending' | string

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

/**
 * Proje geneli WhatsApp durumu işareti.
 * valid → ✓ · invalid → × · diğer → ?
 */
export function WaMark({
  status,
  showLabel = false,
  className,
}: {
  status: WaStatus
  showLabel?: boolean
  className?: string
}): ReactNode {
  const normalized =
    status === 'valid' || status === 'invalid' ? status : 'unknown'

  const mark =
    normalized === 'valid' ? '✓' : normalized === 'invalid' ? '×' : '?'

  const label =
    normalized === 'valid'
      ? 'WhatsApp’ta var'
      : normalized === 'invalid'
        ? 'WhatsApp’ta yok'
        : 'Kontrol edilmedi'

  const tone =
    normalized === 'valid'
      ? 'border-ok/35 bg-ok-soft text-ok'
      : normalized === 'invalid'
        ? 'border-danger/35 bg-danger/10 text-danger'
        : 'border-hairline bg-canvas text-ink-muted'

  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        showLabel ? 'px-2 py-0.5 text-[10.5px]' : 'h-5 w-5 justify-center text-[11px]',
        tone,
        className,
      )}
      title={label}
      aria-label={label}
    >
      <span aria-hidden>{mark}</span>
      {showLabel ? <span>{label}</span> : null}
    </span>
  )
}
