'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Icon, iconForHref, type IconName } from '@/components/icon'
import { useT } from '@/lib/i18n/provider'

type NavItem = { href: string; label: string; icon?: IconName }

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavLink({
  href,
  label,
  icon,
  active,
  className,
  onNavigate,
}: {
  href: string
  label: string
  icon?: IconName
  active: boolean
  className?: string
  onNavigate?: () => void
}) {
  const iconName = icon ?? iconForHref(href)
  return (
    <Link
      href={href}
      prefetch
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      className={className ?? `wb-rail-link${active ? ' is-active' : ''}`}
    >
      <Icon name={iconName} className="wb-rail-link-icon size-[16px]" />
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
            { href: '/kurulum', label: t('nav.steps'), icon: 'steps' as const },
            { href: '/marka-kiti', label: t('nav.markaShort'), icon: 'brand' as const },
            { href: '/kisiler', label: t('nav.kisiler'), icon: 'people' as const },
            { href: '/hesaplar', label: t('nav.hesaplar'), icon: 'phone' as const },
          ] as NavItem[],
        },
        {
          id: 'system',
          label: t('nav.groupSystem'),
          items: [
            { href: '/ayarlar', label: t('nav.ayarlar'), icon: 'settings' as const },
            { href: '/yardim', label: t('nav.yardim'), icon: 'help' as const },
          ] as NavItem[],
        },
      ]
    }
    return [
      {
        id: 'ops',
        label: t('nav.groupOps'),
        items: [
          { href: '/ozet', label: t('nav.ozet'), icon: 'overview' as const },
          { href: '/hesaplar', label: t('nav.hesaplar'), icon: 'phone' as const },
          { href: '/hizli-gonderim', label: t('nav.hizli'), icon: 'send' as const },
          { href: '/kisiler', label: t('nav.kisiler'), icon: 'people' as const },
          { href: '/kampanyalar', label: t('nav.kampanyalar'), icon: 'campaign' as const },
        ] as NavItem[],
      },
      {
        id: 'inbox',
        label: t('nav.groupInbox'),
        items: [
          { href: '/gelenler', label: t('nav.gelenler'), icon: 'inbox' as const },
          { href: '/gidenler', label: t('nav.gidenler'), icon: 'outbound' as const },
          { href: '/kara-liste', label: t('nav.karaListe'), icon: 'shield' as const },
        ] as NavItem[],
      },
      {
        id: 'watch',
        label: t('nav.groupWatch'),
        items: [
          { href: '/durum', label: t('nav.durum'), icon: 'activity' as const },
          { href: '/raporlar', label: t('nav.raporlar'), icon: 'chart' as const },
        ] as NavItem[],
      },
      {
        id: 'system',
        label: t('nav.groupSystem'),
        items: [
          { href: '/marka-kiti', label: t('nav.marka'), icon: 'brand' as const },
          { href: '/ayarlar', label: t('nav.ayarlar'), icon: 'settings' as const },
          { href: '/yardim', label: t('nav.yardim'), icon: 'help' as const },
        ] as NavItem[],
      },
    ]
  }, [onboardingLock, t])

  const setupItem =
    showSetup && !onboardingLock
      ? ({ href: '/kurulum', label: t('nav.kurulum'), icon: 'steps' as const } as const)
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
                icon={setupItem.icon}
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
                icon={item.icon}
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
              <Icon name="more" className="wb-rail-link-icon size-[16px]" />
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
                            className={`wb-rail-link px-3 py-3 text-[14px]${
                              active ? ' is-active' : ''
                            }`}
                          >
                            <Icon
                              name={item.icon ?? iconForHref(item.href)}
                              className="wb-rail-link-icon size-[16px]"
                            />
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
            icon={setupItem.icon}
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
                icon={item.icon}
                active={isActive(pathname, item.href)}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}
