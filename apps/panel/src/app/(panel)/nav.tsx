'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Sira kasitli: once hat bagla, sonra kisi yukle, sonra gonder, sonra izle.
 * Hizli gonderim ve marka kiti gunluk isin kisayollari, sona kondu.
 * Kurulum yalnizca henuz tamamlanmamis kullanicilarda ustte gosterilir;
 * aksi halde nav'i kalabaliklastirmamak icin gizlenir.
 */
const CORE = [
  { href: '/hesaplar', label: 'Hesaplar' },
  { href: '/kisiler', label: 'Kisiler' },
  { href: '/kampanyalar', label: 'Kampanyalar' },
  { href: '/durum', label: 'Genel durum' },
  { href: '/hizli-gonderim', label: 'Hizli gonderim' },
  { href: '/marka-kiti', label: 'Marka kiti' },
  { href: '/ayarlar', label: 'Ayarlar' },
] as const

export function Nav({
  showSetup = false,
  orientation = 'vertical',
}: {
  showSetup?: boolean
  orientation?: 'vertical' | 'horizontal'
}) {
  const pathname = usePathname()

  const items = showSetup
    ? ([{ href: '/kurulum', label: 'Kurulum' }, ...CORE] as const)
    : CORE

  return (
    <nav
      className={
        orientation === 'horizontal'
          ? 'flex w-max flex-row gap-0.5'
          : 'flex flex-col gap-0.5'
      }
      aria-label="Ana menu"
    >
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
              active
                ? 'bg-surface-raised font-medium text-ink'
                : 'text-ink-muted hover:bg-surface hover:text-ink'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
