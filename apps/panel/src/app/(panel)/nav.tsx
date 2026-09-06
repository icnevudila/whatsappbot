'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef } from 'react'
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
  linkRef,
}: {
  href: string
  label: string
  icon?: IconName
  active: boolean
  className?: string
  onNavigate?: () => void
  linkRef?: (el: HTMLAnchorElement | null) => void
}) {
  const iconName = icon ?? iconForHref(href)
  return (
    <Link
      ref={linkRef}
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
  isPlatformAdmin = false,
}: {
  showSetup?: boolean
  onboardingLock?: boolean
  orientation?: 'vertical' | 'horizontal'
  /** Süper admin: Durum / Raporlar / Admin. */
  isPlatformAdmin?: boolean
}) {
  const pathname = usePathname()
  const t = useT()
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLAnchorElement | null>(null)

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

    const main: NavItem[] = [
      { href: '/ozet', label: t('nav.ozet'), icon: 'overview' },
      { href: '/kampanyalar', label: t('nav.kampanyalar'), icon: 'campaign' },
      { href: '/kisiler', label: t('nav.kisiler'), icon: 'people' },
      { href: '/hesaplar', label: t('nav.hesaplar'), icon: 'phone' },
      { href: '/mesajlar', label: t('nav.mesajlar'), icon: 'inbox' },
      { href: '/marka-kiti', label: t('nav.markaShort'), icon: 'brand' },
    ]

    const more: NavItem[] = [
      { href: '/hizli-gonderim', label: t('nav.hizli'), icon: 'send' },
      { href: '/kara-liste', label: t('nav.karaListe'), icon: 'shield' },
      { href: '/ayarlar', label: t('nav.ayarlar'), icon: 'settings' },
      { href: '/yardim', label: t('nav.yardim'), icon: 'help' },
    ]

    if (isPlatformAdmin) {
      more.unshift(
        { href: '/admin', label: 'Admin', icon: 'settings' },
        { href: '/durum', label: t('nav.durum'), icon: 'activity' },
        { href: '/raporlar', label: t('nav.raporlar'), icon: 'chart' },
      )
    }

    return [
      { id: 'main', label: 'İşler', items: main },
      { id: 'more', label: t('nav.groupMore'), items: more },
    ]
  }, [onboardingLock, isPlatformAdmin, t])

  const setupItem =
    showSetup && !onboardingLock
      ? ({ href: '/kurulum', label: t('nav.kurulum'), icon: 'steps' as const } as const)
      : null

  /** Mobil: yalnız ana işler + ayarlar — 3dk yol. */
  const flat = useMemo(() => {
    if (orientation === 'horizontal' && !onboardingLock) {
      const main = groups.find((g) => g.id === 'main')?.items ?? []
      return [
        ...main,
        { href: '/ayarlar', label: t('nav.ayarlar'), icon: 'settings' as const },
      ] as NavItem[]
    }
    return groups.flatMap((g) => g.items)
  }, [groups, onboardingLock, orientation, t])

  useEffect(() => {
    if (orientation !== 'horizontal') return
    const el = activeRef.current
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [pathname, orientation])

  if (orientation === 'horizontal') {
    return (
      <div
        ref={scrollRef}
        className="min-w-0 w-full overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <nav
          className="flex w-max flex-row items-center gap-0.5 pr-1"
          aria-label={t('nav.aria')}
        >
          {setupItem ? (
            <NavLink
              href={setupItem.href}
              label={setupItem.label}
              icon={setupItem.icon}
              active={isActive(pathname, setupItem.href)}
              linkRef={(node) => {
                if (isActive(pathname, setupItem.href)) activeRef.current = node
              }}
              className={`wb-rail-link whitespace-nowrap${
                isActive(pathname, setupItem.href) ? ' is-active' : ''
              }`}
            />
          ) : null}
          {flat.map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={active}
                linkRef={(node) => {
                  if (active) activeRef.current = node
                }}
                className={`wb-rail-link whitespace-nowrap${active ? ' is-active' : ''}`}
              />
            )
          })}
        </nav>
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
