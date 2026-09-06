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
  orientation = 'vertical',
  isPlatformAdmin = false,
}: {
  showSetup?: boolean
  orientation?: 'vertical' | 'horizontal'
  /** Süper admin: Durum / Raporlar / Admin. */
  isPlatformAdmin?: boolean
}) {
  const pathname = usePathname()
  const t = useT()
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLAnchorElement | null>(null)

  const groups = useMemo(() => {
    if (isPlatformAdmin) {
      return [
        {
          id: 'ops',
          label: 'Filo ops',
          items: [
            { href: '/admin', label: 'İşletmeler', icon: 'settings' as const },
            { href: '/durum', label: t('nav.durum'), icon: 'activity' as const },
            { href: '/raporlar', label: t('nav.raporlar'), icon: 'chart' as const },
          ] as NavItem[],
        },
        {
          id: 'tenant',
          label: 'Aktif işletme',
          items: [
            { href: '/ozet', label: t('nav.ozet'), icon: 'overview' as const },
            { href: '/kampanyalar', label: t('nav.kampanyalar'), icon: 'campaign' as const },
            { href: '/kisiler', label: t('nav.kisiler'), icon: 'people' as const },
            { href: '/hesaplar', label: t('nav.hesaplar'), icon: 'phone' as const },
            { href: '/mesajlar', label: t('nav.mesajlar'), icon: 'inbox' as const },
            { href: '/ayarlar', label: t('nav.ayarlar'), icon: 'settings' as const },
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

    return [
      { id: 'main', label: 'İşler', items: main },
      { id: 'more', label: t('nav.groupMore'), items: more },
    ]
  }, [isPlatformAdmin, t])

  const setupItem =
    showSetup && !isPlatformAdmin
      ? ({ href: '/kurulum', label: t('nav.kurulum'), icon: 'steps' as const } as const)
      : null

  /** Mobil: yalnız ana işler + ayarlar. */
  const flat = useMemo(() => {
    if (orientation === 'horizontal') {
      if (isPlatformAdmin) {
        return [
          { href: '/admin', label: 'Admin', icon: 'settings' as const },
          { href: '/ozet', label: t('nav.ozet'), icon: 'overview' as const },
          { href: '/kampanyalar', label: t('nav.kampanyalar'), icon: 'campaign' as const },
          { href: '/hesaplar', label: t('nav.hesaplar'), icon: 'phone' as const },
          { href: '/kisiler', label: t('nav.kisiler'), icon: 'people' as const },
        ] as NavItem[]
      }
      const main = groups.find((g) => g.id === 'main')?.items ?? []
      return [
        ...main,
        { href: '/ayarlar', label: t('nav.ayarlar'), icon: 'settings' as const },
      ] as NavItem[]
    }
    return groups.flatMap((g) => g.items)
  }, [groups, isPlatformAdmin, orientation, t])

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
