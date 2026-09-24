'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BRAND_NAME, LogoMark } from '@/components/brand'

const routes = [
  ['Genel', '/canli-takip'],
  ['İşler', '/canli-takip/isler'],
  ['Mesajlar', '/canli-takip/mesajlar'],
  ['Botlar', '/canli-takip/botlar'],
  ['Hesaplar', '/canli-takip/hesaplar'],
  ['Worker’lar', '/canli-takip/workers'],
  ['Uyarılar', '/canli-takip/uyarilar'],
] as const

export function ControlPlaneShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname === '/canli-takip/legacy') return children

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-40 border-b border-[var(--color-hairline)] bg-surface/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-3 py-2.5 sm:px-5">
          <Link href="/canli-takip" className="flex min-w-0 items-center gap-2.5" aria-label="Operasyon merkezine git">
            <LogoMark className="h-8 w-8 shrink-0" />
            <div className="min-w-0">
              <div className="truncate text-sm font-black tracking-[-0.02em]">{BRAND_NAME} Operasyon</div>
              <div className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Unified control plane</div>
            </div>
          </Link>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="hidden rounded-full border border-[var(--color-hairline)] bg-canvas px-2.5 py-1 font-semibold text-ink-muted sm:inline">VNC yalnız bakım için</span>
            <Link href="/canli-takip/legacy" className="rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-surface px-2.5 py-1.5 font-bold hover:bg-surface-raised">Eski panel</Link>
          </div>
        </div>
        <nav className="mx-auto flex max-w-[1500px] gap-1 overflow-x-auto px-3 pb-2 sm:px-5" aria-label="Operasyon bölümleri">
          {routes.map(([label, href]) => {
            const active = href === '/canli-takip' ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`min-h-10 shrink-0 rounded-[var(--radius-sm)] px-3 py-2 text-xs font-bold transition ${active ? 'bg-accent text-white shadow-sm' : 'text-ink-muted hover:bg-surface-raised hover:text-ink'}`}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-5 sm:py-6">{children}</main>
    </div>
  )
}
