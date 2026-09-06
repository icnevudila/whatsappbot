'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useT } from '@/lib/i18n/provider'

type NavItem = { href: string; label: string }

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavLink({
  href,
  label,
  active,
  className,
  onNavigate,
}: {
  href: string
  label: string
  active: boolean
  className?: string
  onNavigate?: () => void
}) {
  return (
    <Link
      href={href}
      prefetch
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
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
  const t = useT()
  const [moreOpen, setMoreOpen] = useState(false)

  const groups = useMemo(() => {
    if (onboardingLock) {
      return [
        {
          id: 'setup',
          label: t('nav.groupSetup'),
          items: [
            { href: '/kurulum', label: t('nav.steps') },
            { href: '/marka-kiti', label: t('nav.markaShort') },
            { href: '/kisiler', label: t('nav.kisiler') },
            { href: '/hesaplar', label: t('nav.hesaplar') },
          ] as NavItem[],
        },
        {
          id: 'system',
          label: t('nav.groupSystem'),
          items: [
            { href: '/ayarlar', label: t('nav.ayarlar') },
            { href: '/yardim', label: t('nav.yardim') },
          ] as NavItem[],
        },
      ]
    }
    return [
      {
        id: 'ops',
        label: t('nav.groupOps'),
        items: [
          { href: '/ozet', label: t('nav.ozet') },
          { href: '/hesaplar', label: t('nav.hesaplar') },
          { href: '/hizli-gonderim', label: t('nav.hizli') },
          { href: '/kisiler', label: t('nav.kisiler') },
          { href: '/kampanyalar', label: t('nav.kampanyalar') },
        ] as NavItem[],
      },
      {
        id: 'inbox',
        label: t('nav.groupInbox'),
        items: [
          { href: '/gelenler', label: t('nav.gelenler') },
          { href: '/gidenler', label: t('nav.gidenler') },
          { href: '/kara-liste', label: t('nav.karaListe') },
        ] as NavItem[],
      },
      {
        id: 'watch',
        label: t('nav.groupWatch'),
        items: [
          { href: '/durum', label: t('nav.durum') },
          { href: '/raporlar', label: t('nav.raporlar') },
        ] as NavItem[],
      },
      {
        id: 'system',
        label: t('nav.groupSystem'),
        items: [
          { href: '/marka-kiti', label: t('nav.marka') },
          { href: '/ayarlar', label: t('nav.ayarlar') },
          { href: '/yardim', label: t('nav.yardim') },
        ] as NavItem[],
      },
    ]
  }, [onboardingLock, t])

  const setupItem =
    showSetup && !onboardingLock
      ? ({ href: '/kurulum', label: t('nav.kurulum') } as const)
      : null
  const flat = groups.flatMap((g) => g.items)
  const primaryH = flat.slice(0, onboardingLock ? 8 : 6)
  const moreH = onboardingLock ? [] : flat.slice(6)
  const moreActive = moreH.some((item) => isActive(pathname, item.href))

  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!moreOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [moreOpen])

  if (orientation === 'horizontal') {
    return (
      <div className="flex w-full items-center gap-1">
        <div className="min-w-0 flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <nav
            className="flex w-max flex-row items-center gap-0.5"
            aria-label={t('nav.aria')}
          >
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
          </nav>
        </div>

        {moreH.length > 0 ? (
          <>
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-controls="mobile-nav-more"
              onClick={() => setMoreOpen((v) => !v)}
              className={`wb-rail-link shrink-0 whitespace-nowrap${
                moreActive || moreOpen ? ' is-active' : ''
              }`}
            >
              <span className="wb-rail-link-label">{t('nav.more')}</span>
            </button>

            {moreOpen ? (
              <div className="fixed inset-0 z-[60]" role="presentation">
                <button
                  type="button"
                  className="absolute inset-0 bg-ink/35"
                  aria-label={t('common.cancel')}
                  onClick={() => setMoreOpen(false)}
                />
                <div
                  id="mobile-nav-more"
                  role="dialog"
                  aria-modal="true"
                  aria-label={t('nav.more')}
                  className="wb-rail-more absolute inset-x-0 bottom-0 max-h-[75dvh] overflow-y-auto rounded-t-[16px] border border-hairline bg-surface px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[var(--shadow-md)]"
                >
                  <div className="mb-3 flex items-center justify-between gap-3 px-1">
                    <p className="text-[12px] font-semibold text-ink">{t('nav.more')}</p>
                    <button
                      type="button"
                      className="text-[12px] font-medium text-ink-muted"
                      onClick={() => setMoreOpen(false)}
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                  <ul className="grid gap-0.5 pb-2">
                    {moreH.map((item) => {
                      const active = isActive(pathname, item.href)
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            prefetch
                            aria-current={active ? 'page' : undefined}
                            onClick={() => setMoreOpen(false)}
                            className={`wb-rail-link block px-3 py-3 text-[14px]${
                              active ? ' is-active' : ''
                            }`}
                          >
                            <span className="wb-rail-link-label">{item.label}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    )
  }

  return (
    <nav className="flex flex-col gap-px" aria-label={t('nav.aria')}>
      {onboardingLock ? (
        <p className="mb-2 px-2.5 text-[11.5px] leading-snug text-ink-faint">{t('nav.setupHint')}</p>
      ) : null}
      {setupItem ? (
        <>
          <p className="wb-rail-group">{t('nav.groupSetup')}</p>
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
