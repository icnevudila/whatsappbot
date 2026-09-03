import type { ComponentProps, ReactNode } from 'react'

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

/**
 * accent varyanti rol kuralina tabi: yalnizca birincil gonderim/onay
 * aksiyonlarinda. Ikincil her sey "quiet" olmali, yoksa yesil anlamini yitirir.
 */
export function Button({
  variant = 'quiet',
  className,
  ...props
}: ComponentProps<'button'> & { variant?: 'accent' | 'quiet' | 'danger' }) {
  const styles = {
    accent:
      'bg-accent text-accent-ink hover:bg-accent-dim disabled:bg-hairline-strong disabled:text-ink-faint',
    quiet:
      'bg-surface-raised text-ink border border-hairline-strong hover:border-ink-faint disabled:text-ink-faint',
    danger:
      'bg-transparent text-danger border border-danger/40 hover:bg-danger/10 disabled:text-ink-faint',
  }[variant]

  return (
    <button
      {...props}
      className={cx(
        'inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors disabled:cursor-not-allowed',
        styles,
        className,
      )}
    />
  )
}

export function Card({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cx(
        'rounded-[10px] border border-hairline bg-surface',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-hairline px-4 py-3">
      <div className="min-w-0">
        <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-[12px] text-ink-muted">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-ink-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11.5px] text-ink-faint">{hint}</span> : null}
    </label>
  )
}

const inputBase =
  'w-full rounded-md border border-hairline-strong bg-canvas px-2.5 py-1.5 text-[13px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input {...props} className={cx(inputBase, className)} />
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea {...props} className={cx(inputBase, 'resize-y font-mono', className)} />
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select {...props} className={cx(inputBase, className)} />
}

const STATUS_STYLES: Record<string, { label: string; tone: string }> = {
  connected: { label: 'Bagli', tone: 'text-accent border-accent/35 bg-accent/10' },
  connecting: { label: 'Baglaniyor', tone: 'text-warn border-warn/35 bg-warn/10' },
  qr_pending: { label: 'QR bekleniyor', tone: 'text-warn border-warn/35 bg-warn/10' },
  pairing_pending: { label: 'Kod bekleniyor', tone: 'text-warn border-warn/35 bg-warn/10' },
  disconnected: { label: 'Kapali', tone: 'text-ink-muted border-hairline-strong bg-surface-raised' },
  logged_out: { label: 'Cikis yapildi', tone: 'text-ink-muted border-hairline-strong bg-surface-raised' },
  banned: { label: 'Kisitlandi', tone: 'text-danger border-danger/35 bg-danger/10' },
  error: { label: 'Hata', tone: 'text-danger border-danger/35 bg-danger/10' },

  draft: { label: 'Taslak', tone: 'text-ink-muted border-hairline-strong bg-surface-raised' },
  scheduled: { label: 'Planlandi', tone: 'text-warn border-warn/35 bg-warn/10' },
  running: { label: 'Gonderiliyor', tone: 'text-accent border-accent/35 bg-accent/10' },
  paused: { label: 'Duraklatildi', tone: 'text-warn border-warn/35 bg-warn/10' },
  completed: { label: 'Tamamlandi', tone: 'text-accent border-accent/35 bg-accent/10' },
  stopped: { label: 'Durduruldu', tone: 'text-danger border-danger/35 bg-danger/10' },
  failed: { label: 'Basarisiz', tone: 'text-danger border-danger/35 bg-danger/10' },
}

export function StatusPill({ status }: { status: string }) {
  const entry = STATUS_STYLES[status] ?? {
    label: status,
    tone: 'text-ink-muted border-hairline-strong bg-surface-raised',
  }

  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11.5px] font-medium',
        entry.tone,
      )}
    >
      {entry.label}
    </span>
  )
}

/** Ilerleme / kota cubugu. tone rol kuraliyla secilir. */
export function Meter({
  value,
  max,
  tone = 'accent',
}: {
  value: number
  max: number
  tone?: 'accent' | 'warn' | 'danger'
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const fill = { accent: 'bg-accent', warn: 'bg-warn', danger: 'bg-danger' }[tone]

  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-hairline">
      <div className={cx('h-full rounded-full transition-[width] duration-500', fill)} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <p className="text-[13px] font-medium text-ink">{title}</p>
      <p className="max-w-sm text-[12.5px] text-ink-muted">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

export function Notice({
  tone = 'warn',
  children,
}: {
  tone?: 'warn' | 'danger' | 'accent'
  children: ReactNode
}) {
  const styles = {
    warn: 'border-warn/30 bg-warn/8 text-warn',
    danger: 'border-danger/30 bg-danger/8 text-danger',
    accent: 'border-accent/30 bg-accent/8 text-accent',
  }[tone]

  return (
    <div className={cx('rounded-md border px-3 py-2 text-[12.5px]', styles)}>{children}</div>
  )
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[19px] font-semibold tracking-[-0.015em] text-ink">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-[12.5px] text-ink-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  )
}
