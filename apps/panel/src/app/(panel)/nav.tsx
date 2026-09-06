'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

type NavItem = { href: string; label: string }

/** Pilot tarzı gruplu rail — Filo domain (Shopify yok). */
const GROUPS: { id: string; label: string; items: readonly NavItem[] }[] = [
  {
    id: 'ops',
    label: 'Operasyon',
    items: [
      { href: '/ozet', label: 'Özet' },
      { href: '/hesaplar', label: 'Hesaplar' },
      { href: '/hizli-gonderim', label: 'Hızlı gönderim' },
      { href: '/kisiler', label: 'Kişiler' },
      { href: '/kampanyalar', label: 'Kampanyalar' },
    ],
  },
  {
    id: 'inbox',
    label: 'Gelen / giden',
    items: [
      { href: '/gelenler', label: 'Gelenler' },
      { href: '/gidenler', label: 'Gidenler' },
      { href: '/kara-liste', label: 'Kara liste' },
    ],
  },
  {
    id: 'watch',
    label: 'İzleme',
    items: [
      { href: '/durum', label: 'Durum' },
      { href: '/raporlar', label: 'Raporlar' },
    ],
  },
  {
    id: 'system',
    label: 'Sistem',
    items: [
      { href: '/marka-kiti', label: 'Marka kiti' },
      { href: '/ayarlar', label: 'Ayarlar' },
      { href: '/yardim', label: 'Yardım' },
    ],
  },
]

/** Zorunlu onboarding sırasında yalnızca bu yollar. */
const ONBOARDING_GROUPS: { id: string; label: string; items: readonly NavItem[] }[] = [
  {
    id: 'setup',
    label: 'Kurulum',
    items: [
      { href: '/kurulum', label: 'Adımlar' },
      { href: '/marka-kiti', label: 'Marka' },
      { href: '/kisiler', label: 'Kişiler' },
      { href: '/hesaplar', label: 'Hesaplar' },
    ],
  },
  {
    id: 'system',
    label: 'Sistem',
    items: [
      { href: '/ayarlar', label: 'Ayarlar' },
      { href: '/yardim', label: 'Yardım' },
    ],
  },
]

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavLink({
  href,
  label,
  active,
  className,
}: {
  href: string
  label: string
  active: boolean
  className?: string
}) {
  return (
    <Link
      href={href}
      prefetch
      aria-current={active ? 'page' : undefined}
      className={className ?? `wb-rail-link${active ? ' is-active' : ''}`}
    >
      <span className="wb-rail-link-label">{label}</span>
    </Link>
  )
}

export function Nav({
  showSetup = false,
  onboardingLock = false,
  orientation = 'vertical',
}: {
  showSetup?: boolean
  /** true iken menü yalnız kurulum yollarını gösterir. */
  onboardingLock?: boolean
  orientation?: 'vertical' | 'horizontal'
}) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  const groups = onboardingLock ? ONBOARDING_GROUPS : GROUPS
  const setupItem =
    showSetup && !onboardingLock ? ({ href: '/kurulum', label: 'Kurulum' } as const) : null
  const flat = groups.flatMap((g) => g.items)
  const primaryH = flat.slice(0, onboardingLock ? 8 : 6)
  const moreH = onboardingLock ? [] : flat.slice(6)
  const moreActive = moreH.some((item) => isActive(pathname, item.href))

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
            active={isActive(pathname, setupItem.href)}
            className={`wb-rail-link whitespace-nowrap${
              isActive(pathname, setupItem.href) ? ' is-active' : ''
            }`}
          />
        ) : null}
        {primaryH.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            active={isActive(pathname, item.href)}
            className={`wb-rail-link whitespace-nowrap${
              isActive(pathname, item.href) ? ' is-active' : ''
            }`}
          />
        ))}
        {moreH.length > 0 ? (
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((v) => !v)}
              className={`wb-rail-link whitespace-nowrap${
                moreActive || moreOpen ? ' is-active' : ''
              }`}
              aria-current={moreActive ? 'page' : undefined}
            >
              <span className="wb-rail-link-label">Diğer</span>
            </button>
            {moreOpen ? (
              <div className="wb-rail-more absolute left-0 top-full z-30 mt-1 min-w-[168px] border border-hairline bg-surface p-1 shadow-[var(--shadow-md)]">
                {moreH.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch
                    onClick={() => setMoreOpen(false)}
                    aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                    className={`wb-rail-link block${
                      isActive(pathname, item.href) ? ' is-active' : ''
                    }`}
                  >
                    <span className="wb-rail-link-label">{item.label}</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </nav>
    )
  }

  return (
    <nav className="flex flex-col gap-px" aria-label="Ana menü">
      {onboardingLock ? (
        <p className="mb-2 px-2.5 text-[11.5px] leading-snug text-ink-faint">
          Dört adımı bitirmeden panele geçilemez.
        </p>
      ) : null}
      {setupItem ? (
        <>
          <p className="wb-rail-group">Kurulum</p>
          <NavLink
            href={setupItem.href}
            label={setupItem.label}
            active={isActive(pathname, setupItem.href)}
          />
        </>
      ) : null}
      {groups.map((group) => (
        <div key={group.id}>
          <p className="wb-rail-group">{group.label}</p>
          <div className="flex flex-col gap-px">
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={isActive(pathname, item.href)}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}
