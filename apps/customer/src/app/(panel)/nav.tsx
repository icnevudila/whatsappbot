'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Icon, iconForHref } from '@/components/icon'
import { prefetchSettingsRoutes } from './ayarlar/settings-prefetch'

const ITEMS = [
  { href: '/ozet', label: 'Ana sayfa' },
  { href: '/kampanyalar', label: 'Kampanyalar' },
  { href: '/icerik', label: 'İçerik kütüphanesi' },
  { href: '/kisiler', label: 'Kişiler' },
  { href: '/mesajlar', label: 'Mesajlar' },
  { href: '/ayarlar', label: 'Ayarlar' },
] as const

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const timer = window.setTimeout(() => prefetchSettingsRoutes(router), 350)
    return () => window.clearTimeout(timer)
  }, [router])

  return (
    <nav className="flex flex-col gap-px" aria-label="Müşteri menüsü">
      {ITEMS.map((item) => {
        const active = isActive(pathname, item.href)
        const warmSettings = item.href === '/ayarlar' ? () => prefetchSettingsRoutes(router) : undefined
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
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
