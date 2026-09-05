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
  danger:
    'bg-transparent text-danger border border-danger/35 hover:bg-danger/8 disabled:text-ink-faint',
} as const

export function Button({
  variant = 'quiet',
  className,
  ...props
}: ComponentProps<'button'> & { variant?: keyof typeof buttonVariants }) {
  return (
    <button
      {...props}
      className={cx(buttonBase, buttonVariants[variant], className)}
    />
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
        'rounded-[var(--radius-card)] border border-hairline bg-surface shadow-[var(--shadow-card)]',
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
}: {
  title: ReactNode
  subtitle?: ReactNode
}) {
  return (
    <div className="border-b border-hairline px-4 py-3">
      <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
      {subtitle ? (
        <p className="mt-0.5 text-[12px] text-ink-muted">{subtitle}</p>
      ) : null}
    </div>
  )
}
