import type { ComponentProps, ReactNode } from 'react'

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

const buttonBase =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-3 text-[13px] font-medium transition-[color,background-color,box-shadow] duration-180 ease-[var(--ease-out)] disabled:cursor-not-allowed'

const buttonVariants = {
  accent:
    'bg-accent text-accent-ink shadow-sm hover:bg-accent-dim disabled:bg-hairline disabled:text-ink-faint disabled:shadow-none',
  quiet:
    'bg-surface text-ink border border-hairline-strong hover:bg-surface-raised disabled:text-ink-faint',
} as const

export function Button({
  variant = 'quiet',
  className,
  ...props
}: ComponentProps<'button'> & { variant?: keyof typeof buttonVariants }) {
  return (
    <button {...props} className={cx(buttonBase, buttonVariants[variant], className)} />
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
    <label className="block space-y-1.5">
      <span className="text-[12px] font-medium text-ink-muted">{label}</span>
      {children}
      {hint ? <span className="block text-[11.5px] text-ink-faint">{hint}</span> : null}
    </label>
  )
}

export function Input(props: ComponentProps<'input'>) {
  return (
    <input
      {...props}
      className={cx(
        'h-9 w-full rounded-md border border-hairline bg-surface px-3 text-[13.5px] text-ink shadow-[var(--shadow-card)] outline-none placeholder:text-ink-faint focus:border-accent',
        props.className,
      )}
    />
  )
}

export function Notice({
  tone = 'danger',
  children,
}: {
  tone?: 'danger' | 'ok' | 'accent' | 'warning'
  children: ReactNode
}) {
  return (
    <p
      className={cx(
        'rounded-md border px-3 py-2 text-[12.5px]',
        tone === 'danger'
          ? 'border-danger/30 bg-danger/5 text-danger'
          : tone === 'ok'
            ? 'border-ok/30 bg-ok-soft text-ok-dim'
            : tone === 'accent'
              ? 'border-accent/30 bg-accent/5 text-accent'
              : 'border-hairline bg-surface-raised text-ink-muted',
      )}
    >
      {children}
    </p>
  )
}

