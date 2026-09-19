'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Icon, iconForHref } from '@/components/icon'
import { prefetchSettingsRoutes } from './ayarlar/settings-prefetch'

const ITEMS = [
  { href: '/ozet', label: 'Ana sayfa' },
  { href: '/kampanyalar', label: 'Kampanyalar' },
  { href: '/kisiler', label: 'Kişiler' },
  { href: '/mesajlar', label: 'Mesajlar' },
  { href: '/ayarlar', label: 'Ayarlar' },
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
              <Icon name={iconForHref(item.href)} className="wb-tabbar-icon size-5" />
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
            <Icon name={iconForHref(item.href)} className="wb-rail-link-icon size-[16px]" />
            <span className="wb-rail-link-label">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
