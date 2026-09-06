'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
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

  if (orientation === 'horizontal') {
    return (
      <div className="min-w-0 w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
              className={`wb-rail-link whitespace-nowrap${
                isActive(pathname, setupItem.href) ? ' is-active' : ''
              }`}
            />
          ) : null}
          {flat.map((item) => (
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
