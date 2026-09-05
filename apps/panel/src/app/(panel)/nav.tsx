'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Sıra: hat → hızlı gönder → liste/kampanya → gelen/giden → izle.
 * Marka kiti ve ayarlar günlük işin dışında, sonda.
 */
const CORE = [
  { href: '/hesaplar', label: 'Hesaplar' },
  { href: '/hizli-gonderim', label: 'Hızlı gönderim' },
  { href: '/kisiler', label: 'Kişiler' },
  { href: '/kampanyalar', label: 'Kampanyalar' },
  { href: '/gelenler', label: 'Gelenler' },
  { href: '/gidenler', label: 'Gidenler' },
  { href: '/durum', label: 'Durum' },
  { href: '/kara-liste', label: 'Kara liste' },
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
      aria-label="Ana menü"
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
                ? 'bg-accent-soft font-medium text-accent'
                : 'text-ink-muted hover:bg-surface-raised hover:text-ink'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
