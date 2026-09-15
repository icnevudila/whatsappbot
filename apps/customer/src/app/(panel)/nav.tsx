'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Icon, iconForHref } from '@/components/icon'
import { prefetchSettingsRoutes } from './ayarlar/settings-prefetch'

const ITEMS = [
  { href: '/ozet', label: 'Ana sayfa', iconSrc: '/icons/filo_icon_overview.png' },
  { href: '/kampanyalar', label: 'Kampanyalar', iconSrc: '/icons/filo_icon_campaigns.png' },
  { href: '/kisiler', label: 'Kişiler', iconSrc: '/icons/filo_icon_contacts.png' },
  { href: '/mesajlar', label: 'Mesajlar', iconSrc: '/icons/filo_icon_inbox.png' },
  { href: '/ayarlar', label: 'Ayarlar', iconSrc: '/icons/filo_icon_settings.png' },
] as const

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Nav({
  onNavigate,
  variant = 'rail',
}: {
  onNavigate?: () => void
  variant?: 'rail' | 'tabbar'
}) {
  const pathname = usePathname()
  const router = useRouter()

  if (variant === 'tabbar') {
    return (
      <nav className="wb-tabbar" aria-label="Müşteri menüsü">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href)
          const warmSettings = item.href === '/ayarlar' ? () => prefetchSettingsRoutes(router) : undefined
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              aria-current={active ? 'page' : undefined}
              onClick={onNavigate}
              onMouseEnter={warmSettings}
              onFocus={warmSettings}
              className={`wb-tabbar-link${active ? ' is-active' : ''}`}
            >
              <img
                src={item.iconSrc}
                alt=""
                width={20}
                height={20}
                className="size-5 object-contain"
              />
              <span className="wb-tabbar-label">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <nav className="flex flex-col gap-px" aria-label="Müşteri menüsü">
      {ITEMS.map((item) => {
        const active = isActive(pathname, item.href)
        const warmSettings = item.href === '/ayarlar' ? () => prefetchSettingsRoutes(router) : undefined
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            aria-current={active ? 'page' : undefined}
            onClick={onNavigate}
            onMouseEnter={warmSettings}
            onFocus={warmSettings}
            className={`wb-rail-link${active ? ' is-active' : ''}`}
          >
            <img
              src={item.iconSrc}
              alt=""
              width={20}
              height={20}
              className="size-[19px] shrink-0 object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-transform group-hover:scale-105"
            />
            <span className="wb-rail-link-label">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
