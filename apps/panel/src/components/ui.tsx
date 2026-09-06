import type { ComponentProps, ReactNode } from 'react'
import Link from 'next/link'
import { EmptyIllustration, type EmptyTone } from '@/components/empty-illustrations'

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

const buttonBase =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-3.5 text-[14px] font-semibold transition-[color,background-color,box-shadow,transform] duration-180 ease-[var(--ease-out)] disabled:cursor-not-allowed'

const buttonVariants = {
  // Kobalt birincil aksiyon (pilot-ui / Messora). Yesil yalnizca "bagli" durumu.
  accent:
    'bg-accent text-accent-ink shadow-sm hover:bg-accent-dim disabled:bg-hairline disabled:text-ink-faint disabled:shadow-none',
  quiet:
    'bg-surface text-ink border border-hairline-strong hover:bg-surface-raised disabled:text-ink-faint',
  danger:
    'bg-transparent text-danger border border-danger/35 hover:bg-danger/8 disabled:text-ink-faint',
} as const

/**
 * accent (kobalt) varyanti: birincil gonder / onay.
 * WhatsApp yesili StatusPill "bagli" icin ayri --color-ok token'inda.
 */
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

/** Accent gorunumlu Next.js Link — button icinde Link sarmalamadan. */
export function AccentLink({
  href,
  children,
  className,
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  return (
    <Link href={href} className={cx(buttonBase, buttonVariants.accent, className)}>
      {children}
    </Link>
  )
}

/** Quiet gorunumlu Link — kurulum gibi ikincil CTA'lar icin. */
export function QuietLink({
  href,
  children,
  className,
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  return (
    <Link href={href} className={cx(buttonBase, buttonVariants.quiet, className)}>
      {children}
    </Link>
  )
}

export function Card({
  className,
  children,
  lift = false,
}: {
  className?: string
  children: ReactNode
  /** Hover’da hafif yükselme — KPI / özet kartları için. */
  lift?: boolean
}) {
  return (
    <div
      className={cx(
        'wb-card rounded-[var(--radius-card)] border border-hairline bg-surface shadow-[var(--shadow-card)]',
        lift && 'wb-card-lift',
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
    <div className="flex shrink-0 items-start justify-between gap-4 border-b border-hairline px-3.5 py-2.5">
      <div className="min-w-0">
        <h2 className="text-[14.5px] font-bold text-ink">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-[13px] text-ink-muted">{subtitle}</p>
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
      <span className="mb-1.5 block text-[13px] font-semibold text-ink-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[12.5px] text-ink-faint">{hint}</span> : null}
    </label>
  )
}

const inputBase =
  'w-full rounded-md border border-hairline-strong bg-canvas px-3 py-2 text-[14px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input {...props} className={cx(inputBase, className)} />
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea {...props} className={cx(inputBase, 'resize-y', className)} />
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select {...props} className={cx(inputBase, className)} />
}

const STATUS_STYLES: Record<string, { label: string; tone: string; hint?: string }> = {
  connected: {
    label: 'Bağlı',
    tone: 'text-ok-dim border-ok/40 bg-ok-soft',
    hint: 'Hat hazır; gönderim yapılabilir',
  },
  connecting: {
    label: 'Bağlanıyor',
    tone: 'text-warn border-warn/35 bg-warn/10',
    hint: 'WhatsApp oturumu kuruluyor',
  },
  qr_pending: {
    label: 'QR bekleniyor',
    tone: 'text-warn border-warn/35 bg-warn/10',
    hint: 'Telefondan QR kodunu okutun',
  },
  pairing_pending: {
    label: 'Kod bekleniyor',
    tone: 'text-warn border-warn/35 bg-warn/10',
    hint: 'WhatsApp’ta telefon numarasıyla bağla kodunu girin',
  },
  disconnected: {
    label: 'Kapalı',
    tone: 'text-ink-muted border-hairline-strong bg-surface-raised',
    hint: 'Yeniden bağla ile QR veya kod alın',
  },
  logged_out: {
    label: 'Çıkış yapıldı',
    tone: 'text-ink-muted border-hairline-strong bg-surface-raised',
    hint: 'Telefondan oturum silindi; yeniden bağlayın',
  },
  banned: {
    label: 'Kısıtlandı',
    tone: 'text-danger border-danger/35 bg-danger/10',
    hint: 'WhatsApp bu hattan gönderimi kısıtladı',
  },
  error: {
    label: 'Hata',
    tone: 'text-danger border-danger/35 bg-danger/10',
    hint: 'Bağlantı hatası; yeniden bağlayın',
  },

  draft: { label: 'Taslak', tone: 'text-ink-muted border-hairline-strong bg-surface-raised', hint: 'Henüz başlatılmadı' },
  scheduled: { label: 'Planlandı', tone: 'text-warn border-warn/35 bg-warn/10', hint: 'Zamanı gelince başlar' },
  running: { label: 'Gönderiliyor', tone: 'text-accent border-accent/35 bg-accent-soft', hint: 'Arka planda devam ediyor' },
  paused: { label: 'Duraklatıldı', tone: 'text-warn border-warn/35 bg-warn/10', hint: 'Devam et ile sürer' },
  completed: { label: 'Tamamlandı', tone: 'text-success border-success/35 bg-success-soft', hint: 'Tüm hedefler işlendi' },
  stopped: { label: 'Durduruldu', tone: 'text-danger border-danger/35 bg-danger/10', hint: 'Elle veya kısıt nedeniyle durdu' },
  failed: { label: 'Başarısız', tone: 'text-danger border-danger/35 bg-danger/10', hint: 'Gönderilemedi; ayrıntı satırda' },

  pending: { label: 'Bekliyor', tone: 'text-ink-muted border-hairline-strong bg-surface-raised', hint: 'Sırada' },
  queued: { label: 'Kuyrukta', tone: 'text-ink-muted border-hairline-strong bg-surface-raised', hint: 'Gönderim sırasını bekliyor' },
  sending: { label: 'Gönderiliyor', tone: 'text-accent border-accent/35 bg-accent-soft', hint: 'Şu an işleniyor' },
  sent: { label: 'Gönderildi', tone: 'text-ok-dim border-ok/40 bg-ok-soft', hint: 'WhatsApp’a iletildi' },
  skipped: {
    label: 'Atlandı',
    tone: 'text-warn border-warn/35 bg-warn/10',
    hint: 'WhatsApp’ta yok, kota veya geçici kilit nedeniyle atlandı',
  },
  delivered: { label: 'Teslim', tone: 'text-ok-dim border-ok/40 bg-ok-soft', hint: 'Cihaza ulaştı' },
  read: { label: 'Okundu', tone: 'text-accent border-accent/35 bg-accent-soft', hint: 'Alıcı okudu' },
}

export function StatusPill({ status }: { status: string }) {
  const entry = STATUS_STYLES[status] ?? {
    label: status,
    tone: 'text-ink-muted border-hairline-strong bg-surface-raised',
  }

  return (
    <span
      title={entry.hint}
      className={cx(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] font-semibold',
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
      <div
        className={cx('filo-bar-stagger h-full rounded-full', fill)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  tone = 'generic',
}: {
  title: string
  description: string
  action?: ReactNode
  /** Boş ekran illüstrasyonu — varsayılan generic. */
  tone?: EmptyTone
}) {
  return (
    <div className="wb-empty flex flex-col items-center gap-2 px-6 py-12 text-center">
      <EmptyIllustration tone={tone} />
      <p className="text-[15px] font-bold text-ink">{title}</p>
      <p className="max-w-sm text-[13.5px] text-ink-muted">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

/** Pilot filter-bar / page actions strip. */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('wb-toolbar', className)}>{children}</div>
}

/** List + detail workbench frame (Pilot inbox chrome). */
export function SplitPane({
  list,
  detail,
  className,
  variant = 'inbox',
}: {
  list: ReactNode
  detail: ReactNode
  className?: string
  /** `form`: form önce, tek sayfa kaydırma; geçmiş yan/altta ikincil. */
  variant?: 'inbox' | 'form'
}) {
  if (variant === 'form') {
    return (
      <div className={cx('wb-split', 'wb-split--form', className)}>
        <div className="wb-split-pane wb-split-pane--form">{detail}</div>
        <div className="wb-split-pane wb-split-pane--aside">{list}</div>
      </div>
    )
  }

  return (
    <div className={cx('wb-split', className)}>
      <div className="wb-split-pane">{list}</div>
      <div className="wb-split-pane">{detail}</div>
    </div>
  )
}

export function FilterChip({
  active,
  children,
  href,
}: {
  active?: boolean
  children: ReactNode
  href: string
}) {
  return (
    <Link
      href={href}
      className={cx(
        'inline-flex h-8 items-center rounded-[var(--radius-sm)] border px-3 text-[13px] font-semibold transition-colors',
        active
          ? 'border-ink bg-ink text-accent-ink'
          : 'border-hairline-strong bg-surface text-ink-muted hover:border-ink-faint hover:text-ink',
      )}
    >
      {children}
    </Link>
  )
}

export function Notice({
  tone = 'warn',
  children,
}: {
  tone?: 'warn' | 'danger' | 'accent' | 'success'
  children: ReactNode
}) {
  const styles = {
    warn: 'border-warn/30 bg-warn/8 text-warn',
    danger: 'border-danger/30 bg-danger/8 text-danger',
    accent: 'border-accent/30 bg-accent/8 text-accent',
    success: 'border-success/30 bg-success/8 text-success',
  }[tone]

  return (
    <div
      role={tone === 'danger' ? 'alert' : tone === 'success' || tone === 'accent' ? 'status' : undefined}
      className={cx('rounded-md border px-3.5 py-2.5 text-[13.5px]', styles)}
    >
      {children}
    </div>
  )
}

/** Tek satirlik ozet rakam. meter/detail opsiyonu Summary icin. */
export function Stat({
  value,
  label,
  tone = 'default',
  detail,
  meter,
  className,
}: {
  value: ReactNode
  label: string
  tone?: 'default' | 'accent' | 'muted' | 'danger' | 'warn'
  detail?: ReactNode
  meter?: { value: number; max: number; tone?: 'accent' | 'warn' | 'danger' }
  className?: string
}) {
  const valueTone = {
    default: 'text-ink',
    accent: 'text-accent',
    muted: 'text-ink-muted',
    danger: 'text-danger',
    warn: 'text-warn',
  }[tone]

  const meterTone =
    meter?.tone ??
    (meter && meter.max > 0 && meter.value / meter.max > 0.85 ? 'warn' : 'accent')

  return (
    <div className={className}>
      <p className="text-[12.5px] font-medium text-ink-muted">{label}</p>
      <p className={cx('tabular mt-1 text-[26px] font-extrabold leading-none tracking-[-0.03em]', valueTone)}>
        {value}
      </p>
      {meter ? (
        <div className="mt-2.5">
          <Meter value={meter.value} max={meter.max} tone={meterTone} />
        </div>
      ) : null}
      {detail ? (
        <p className="mt-1.5 truncate text-[12.5px] text-ink-faint">{detail}</p>
      ) : null}
    </div>
  )
}

/** Gizli file input + quiet stil etiket. */
export function FileUploadButton({
  accept = 'image/*',
  uploading = false,
  label,
  uploadingLabel = 'Yükleniyor…',
  onFile,
}: {
  accept?: string
  uploading?: boolean
  label: string
  uploadingLabel?: string
  onFile: (file: File) => void
}) {
  return (
    <label className="cursor-pointer rounded-md border border-hairline-strong bg-surface-raised px-3 py-2 text-[13.5px] font-medium transition-colors hover:border-ink-faint">
      <input
        type="file"
        accept={accept}
        className="hidden"
        disabled={uploading}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onFile(file)
          // Ayni dosyayi tekrar secebilmek icin degeri sifirla.
          event.target.value = ''
        }}
      />
      {uploading ? uploadingLabel : label}
    </label>
  )
}

/** WhatsApp balonu stili mesaj onizlemesi. */
export function MessagePreview({
  body,
  mediaUrl,
}: {
  body?: string
  mediaUrl?: string | null
}) {
  if (!body && !mediaUrl) return null

  return (
    <div className="rounded-md border border-hairline bg-canvas p-3">
      <p className="mb-2 text-[12.5px] font-semibold text-ink-faint">Alıcının göreceği</p>
      <div className="max-w-xs rounded-lg rounded-tl-sm border border-hairline bg-surface-raised p-2.5">
        {mediaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl}
            alt=""
            className="mb-1.5 w-full rounded border border-hairline object-cover"
          />
        ) : null}
        <p className="whitespace-pre-wrap text-[14px] text-ink">
          {body || <span className="text-ink-faint">(yalnızca görsel)</span>}
        </p>
      </div>
    </div>
  )
}

/** Son 24 saatlik saatlik gonderim cubuklari. Bos veri = 0 cubuklar. */
export function HourlyBars({
  counts,
  title = 'Son 24 saat',
}: {
  counts: number[]
  title?: string
}) {
  const max = Math.max(1, ...counts)
  const total = counts.reduce((sum, n) => sum + n, 0)

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-semibold text-ink-muted">{title}</p>
        <p className="tabular text-[12.5px] text-ink-faint">
          {total === 0 ? 'Henüz giden yok' : `${total} giden`}
        </p>
      </div>
      {total === 0 ? (
        <p className="rounded-md border border-dashed border-hairline px-3 py-4 text-center text-[13px] text-ink-faint">
          İlk mesaj gidince burada saatlik dağılım görünür. Başlamak için Hızlı gönderim kullanın.
        </p>
      ) : (
        <div className="flex h-10 items-end gap-px" role="img" aria-label={`${total} giden mesaj, son 24 saat`}>
          {counts.map((count, index) => (
            <div
              key={index}
              className="min-h-px flex-1 rounded-sm bg-accent/70"
              style={{ height: `${Math.max(count > 0 ? 8 : 2, Math.round((count / max) * 100))}%` }}
              title={`${count}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/** Plan / etiket rozeti. Accent yalnizca "aktif" anlaminda kullanilir. */
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'accent' | 'warn' | 'danger'
}) {
  const styles = {
    neutral: 'border-hairline-strong bg-surface-raised text-ink-muted',
    accent: 'border-accent/35 bg-accent/10 text-accent',
    warn: 'border-warn/35 bg-warn/10 text-warn',
    danger: 'border-danger/35 bg-danger/10 text-danger',
  }[tone]

  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[12.5px] font-semibold',
        styles,
      )}
    >
      {children}
    </span>
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
    <header className="wb-page-head">
      <div className="min-w-0">
        <h1 className="wb-page-title">{title}</h1>
        {description ? <p className="wb-page-desc">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </header>
  )
}
