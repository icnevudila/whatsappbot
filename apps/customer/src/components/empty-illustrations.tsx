/**
 * EmptyState illüstrasyonları — LogoMark dilinde sade stroke SVG.
 * tone: ekran bağlamı (telefon, liste, kalkan…).
 */
import type { ReactNode } from 'react'

export type EmptyTone =
  | 'phone'
  | 'people'
  | 'campaign'
  | 'inbox'
  | 'outbound'
  | 'shield'
  | 'brand'
  | 'chart'
  | 'events'
  | 'generic'

const TONE_RING: Record<EmptyTone, string> = {
  phone: 'bg-ok-soft/80 text-ok-dim border-ok/25',
  people: 'bg-accent-soft text-accent-dim border-accent/25',
  campaign: 'bg-accent-soft text-accent border-accent/30',
  inbox: 'bg-ok-soft/60 text-ok-dim border-ok/30',
  outbound: 'bg-accent-soft/80 text-accent-dim border-accent/25',
  shield: 'bg-[#fff5f4] text-danger border-danger/25',
  brand: 'bg-accent-soft text-accent border-accent/25',
  chart: 'bg-surface-raised text-ink-muted border-hairline-strong',
  events: 'bg-warn/10 text-warn border-warn/30',
  generic: 'bg-surface-raised text-ink-muted border-hairline',
}

function SvgShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      className={className ?? 'size-10'}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

function Illu({ tone }: { tone: EmptyTone }) {
  switch (tone) {
    case 'phone':
      return (
        <SvgShell>
          <rect x="20" y="8" width="24" height="48" rx="4" />
          <path d="M28 14h8 M26 50h12" />
          <circle cx="32" cy="44" r="2" fill="currentColor" stroke="none" />
        </SvgShell>
      )
    case 'people':
      return (
        <SvgShell>
          <circle cx="26" cy="22" r="7" />
          <path d="M12 48c0-8 6-12 14-12s14 4 14 12" />
          <circle cx="44" cy="24" r="5" />
          <path d="M42 36c6 1 10 5 10 12" />
        </SvgShell>
      )
    case 'campaign':
      return (
        <SvgShell>
          <path d="M10 28 50 14v36L10 36v-8Z" />
          <path d="M18 38 22 52h8l-3-12" />
        </SvgShell>
      )
    case 'inbox':
      return (
        <SvgShell>
          <path d="M10 18h44v32H10V18Z" />
          <path d="M10 36h12l4 6h12l4-6h12" />
        </SvgShell>
      )
    case 'outbound':
      return (
        <SvgShell>
          <path d="M14 32h28 M32 18l14 14-14 14" />
          <path d="M14 18v28" opacity="0.45" />
        </SvgShell>
      )
    case 'shield':
      return (
        <SvgShell>
          <path d="M32 10 12 18v14c0 14 20 22 20 22s20-8 20-22V18L32 10Z" />
          <path d="M24 32l6 6 12-12" />
        </SvgShell>
      )
    case 'brand':
      return (
        <SvgShell>
          <path d="M32 12 52 24 32 36 12 24 32 12Z" />
          <path d="M12 32 32 44 52 32 M12 40 32 52 52 40" opacity="0.55" />
        </SvgShell>
      )
    case 'chart':
      return (
        <SvgShell>
          <path d="M12 48V16 M12 48h40" />
          <path d="M20 40v-10 M30 40V22 M40 40V28 M50 40V18" />
        </SvgShell>
      )
    case 'events':
      return (
        <SvgShell>
          <circle cx="32" cy="32" r="18" />
          <path d="M32 20v14l10 6" />
        </SvgShell>
      )
    default:
      return (
        <SvgShell>
          <rect x="14" y="18" width="36" height="28" rx="3" />
          <path d="M14 28h36" />
        </SvgShell>
      )
  }
}

export function EmptyIllustration({ tone = 'generic' }: { tone?: EmptyTone }) {
  return (
    <div
      className={`mb-1 flex size-[4.25rem] items-center justify-center rounded-2xl border ${TONE_RING[tone]}`}
    >
      <Illu tone={tone} />
    </div>
  )
}
