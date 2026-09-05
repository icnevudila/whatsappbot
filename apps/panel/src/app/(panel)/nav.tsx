'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

/**
 * Çekirdek: günlük iş. Diğer: daha seyrek kullanılan sayfalar.
 * Mobilde "Diğer" gruplanır; masaüstünde hepsi görünür.
 */
const CORE = [
  { href: '/ozet', label: 'Özet' },
  { href: '/hesaplar', label: 'Hesaplar' },
  { href: '/hizli-gonderim', label: 'Hızlı gönderim' },
  { href: '/kisiler', label: 'Kişiler' },
  { href: '/kampanyalar', label: 'Kampanyalar' },
  { href: '/durum', label: 'Durum' },
  { href: '/ayarlar', label: 'Ayarlar' },
] as const

const MORE = [
  { href: '/gelenler', label: 'Gelenler' },
  { href: '/gidenler', label: 'Gidenler' },
  { href: '/raporlar', label: 'Raporlar' },
  { href: '/kara-liste', label: 'Kara liste' },
  { href: '/marka-kiti', label: 'Marka kiti' },
] as const

function NavLink({
  href,
  label,
  active,
}: {
  href: string
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
        active
          ? 'bg-accent-soft font-medium text-accent'
          : 'text-ink-muted hover:bg-surface-raised hover:text-ink'
      }`}
    >
      {label}
    </Link>
  )
}

export function Nav({
  showSetup = false,
  orientation = 'vertical',
}: {
  showSetup?: boolean
  orientation?: 'vertical' | 'horizontal'
}) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  const setupItem = showSetup
    ? ({ href: '/kurulum', label: 'Kurulum' } as const)
    : null

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  const moreActive = MORE.some((item) => isActive(item.href))

  useEffect(() => {
    if (!moreOpen) return
    const onPointer = (event: MouseEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [moreOpen])

  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  if (orientation === 'horizontal') {
    return (
      <nav className="flex w-max flex-row items-center gap-0.5" aria-label="Ana menü">
        {setupItem ? (
          <NavLink
            href={setupItem.href}
            label={setupItem.label}
            active={isActive(setupItem.href)}
          />
        ) : null}
        {CORE.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            active={isActive(item.href)}
          />
        ))}
        <div className="relative" ref={moreRef}>
          <button
            type="button"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((v) => !v)}
            className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
              moreActive || moreOpen
                ? 'bg-accent-soft font-medium text-accent'
                : 'text-ink-muted hover:bg-surface-raised hover:text-ink'
            }`}
          >
            Diğer
          </button>
          {moreOpen ? (
            <div className="absolute left-0 top-full z-30 mt-1 min-w-[160px] rounded-md border border-hairline bg-surface p-1 shadow-[var(--shadow-md)]">
              {MORE.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={`block rounded-md px-2.5 py-1.5 text-[13px] ${
                    isActive(item.href)
                      ? 'bg-accent-soft font-medium text-accent'
                      : 'text-ink-muted hover:bg-surface-raised hover:text-ink'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </nav>
    )
  }

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Ana menü">
      {setupItem ? (
        <NavLink
          href={setupItem.href}
          label={setupItem.label}
          active={isActive(setupItem.href)}
        />
      ) : null}
      {CORE.map((item) => (
        <NavLink
          key={item.href}
          href={item.href}
          label={item.label}
          active={isActive(item.href)}
        />
      ))}
      <p className="mb-0.5 mt-3 px-2.5 text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">
        Diğer
      </p>
      {MORE.map((item) => (
        <NavLink
          key={item.href}
          href={item.href}
          label={item.label}
          active={isActive(item.href)}
        />
      ))}
    </nav>
  )
}
