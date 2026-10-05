'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Icon, iconForHref } from '@/components/icon'
import { warmRoute } from './route-warmup'

const ITEMS = [
  { href: '/ozet', label: 'Ana sayfa' },
  { href: '/kampanyalar', label: 'Kampanyalar' },
  { href: '/mesajlar', label: 'Mesajlar' },
  { href: '/kisiler', label: 'Kişiler' },
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
  const linkClass = variant === 'tabbar' ? 'wb-tabbar-link' : 'wb-rail-link'
  const iconClass = variant === 'tabbar' ? 'wb-tabbar-icon size-5' : 'wb-rail-link-icon size-[16px]'
  const labelClass = variant === 'tabbar' ? 'wb-tabbar-label' : 'wb-rail-link-label'

  return (
    <nav
      className={variant === 'tabbar' ? 'wb-tabbar' : 'flex flex-col gap-px'}
      aria-label="Müşteri menüsü"
    >
      {ITEMS.map((item) => {
        const active = isActive(pathname, item.href)
        const warm = active ? undefined : () => warmRoute(router, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            aria-current={active ? 'page' : undefined}
            onClick={onNavigate}
            onMouseEnter={warm}
            onFocus={warm}
            onTouchStart={warm}
            className={`${linkClass}${active ? ' is-active' : ''}`}
          >
            <Icon name={iconForHref(item.href)} className={iconClass} />
            <span className={labelClass}>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
