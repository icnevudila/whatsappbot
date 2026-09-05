'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Wordmark } from '@/components/brand'

const NAV_SECTIONS = [
  { href: '#kapasite', label: 'Kapasite' },
  { href: '#nasil', label: 'Nasıl çalışır' },
  { href: '#guvenlik', label: 'Ban önleme' },
  { href: '#fiyatlar', label: 'Fiyatlar' },
  { href: '#sss', label: 'SSS' },
] as const

export function MarketingNav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5">
        <Link href="/" className="shrink-0" onClick={() => setOpen(false)}>
          <Wordmark />
        </Link>

        <nav className="hidden flex-1 items-center gap-5 md:flex" aria-label="Bölümler">
          {NAV_SECTIONS.map((section) => (
            <a
              key={section.href}
              href={section.href}
              className="text-[12.5px] text-ink-muted transition-colors hover:text-ink"
            >
              {section.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-md border border-hairline-strong px-2.5 text-[12px] text-ink-muted md:hidden"
            aria-expanded={open}
            aria-controls="marketing-mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Kapat' : 'Menü'}
          </button>
          <Link
            href="/giris"
            className="rounded-md px-2.5 py-1.5 text-[12.5px] text-ink-muted transition-colors hover:text-ink"
          >
            Giriş yap
          </Link>
          <Link
            href="/giris?mod=kayit"
            className="inline-flex h-8 items-center rounded-md bg-accent px-3 text-[12.5px] font-medium text-accent-ink transition-colors hover:bg-accent-dim"
          >
            Ücretsiz dene
          </Link>
        </div>
      </div>

      {open ? (
        <nav
          id="marketing-mobile-nav"
          className="border-t border-hairline bg-surface px-5 py-3 md:hidden"
          aria-label="Mobil bölümler"
        >
          <ul className="flex flex-col gap-1">
            {NAV_SECTIONS.map((section) => (
              <li key={section.href}>
                <a
                  href={section.href}
                  className="block rounded-md px-2 py-2 text-[13px] text-ink-muted hover:bg-surface-raised hover:text-ink"
                  onClick={() => setOpen(false)}
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  )
}
