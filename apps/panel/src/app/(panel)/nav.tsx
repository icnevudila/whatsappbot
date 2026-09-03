'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  { href: '/durum', label: 'Genel durum' },
  { href: '/hizli-gonderim', label: 'Hizli gonderim' },
  { href: '/hesaplar', label: 'Hesaplar' },
  { href: '/kisiler', label: 'Kisiler' },
  { href: '/kampanyalar', label: 'Kampanyalar' },
  { href: '/marka-kiti', label: 'Marka kiti' },
  { href: '/ayarlar', label: 'Ayarlar' },
] as const

export function Nav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-0.5">
      {ITEMS.map((item) => {
        const active = pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
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
